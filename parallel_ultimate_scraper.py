#!/usr/bin/env python3
"""
Parallel Ultimate Deals Scraper
Uses multiple Chrome instances to scrape settlements in parallel - MUCH FASTER!
"""

import os
import csv
import time
import json
from pathlib import Path
from typing import List, Dict, Optional
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️  Selenium not available. Install with: pip install selenium")

class ParallelUltimateDealsScraper:
    def __init__(self, max_workers=5):
        self.max_workers = max_workers
        self.lock = threading.Lock()
        
        if not SELENIUM_AVAILABLE:
            print("❌ Selenium is required for this scraper to work!")
            return
    
    def create_driver(self, worker_id: int):
        """
        Create a Chrome WebDriver for a specific worker
        """
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--disable-extensions")
            chrome_options.add_argument("--disable-plugins")
            chrome_options.add_argument("--disable-images")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            
            # Use different ports for different workers
            chrome_options.add_argument(f"--remote-debugging-port={9222 + worker_id}")
            
            driver = webdriver.Chrome(options=chrome_options)
            print(f"✅ Worker {worker_id}: Chrome WebDriver initialized successfully")
            return driver
            
        except Exception as e:
            print(f"❌ Worker {worker_id}: Failed to initialize Chrome WebDriver: {str(e)}")
            return None
    
    def get_settlement_deals(self, settlement: Dict, worker_id: int) -> tuple:
        """
        Get ALL real deals for a specific settlement using a dedicated driver
        """
        driver = None
        try:
            driver = self.create_driver(worker_id)
            if not driver:
                return (settlement['name_hebrew'], [], False)
            
            settlement_id = settlement['id']
            settlement_name = settlement['name_hebrew']
            
            print(f"🔍 Worker {worker_id}: Getting ALL deals for {settlement_name} (ID: {settlement_id})")
            
            # Construct the settlement deals URL
            deals_url = f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            
            # Navigate to the page
            driver.get(deals_url)
            
            # Wait for page to load
            time.sleep(8)
            
            # Extract ALL transactions
            transactions = self.extract_all_transactions_parallel(driver, settlement_id, settlement_name, worker_id)
            
            print(f"   🎉 Worker {worker_id}: Found {len(transactions)} transactions for {settlement_name}")
            
            return (settlement_name, transactions, True)
            
        except Exception as e:
            print(f"   ❌ Worker {worker_id}: Error getting deals for {settlement.get('name_hebrew', 'Unknown')}: {str(e)}")
            return (settlement.get('name_hebrew', 'Unknown'), [], False)
        finally:
            if driver:
                driver.quit()
                print(f"   🔒 Worker {worker_id}: WebDriver closed")
    
    def extract_all_transactions_parallel(self, driver, settlement_id: str, settlement_name: str, worker_id: int) -> List[Dict]:
        """
        Extract ALL transactions using parallel-optimized method
        """
        all_transactions = []
        
        try:
            # Wait for the deals table to appear
            table_selector = 'table#dealsTable'
            try:
                table = WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, table_selector))
                )
            except TimeoutException:
                print(f"         ⏰ Worker {worker_id}: Timeout waiting for deals table")
                return all_transactions
            
            # Wait for table to load
            time.sleep(3)
            
            # Method 1: Get transactions from current view
            current_transactions = self.extract_transactions_from_current_view_parallel(driver, settlement_id, settlement_name, worker_id)
            if current_transactions:
                all_transactions.extend(current_transactions)
            
            # Method 2: Quick pagination check
            pagination_transactions = self.handle_pagination_parallel(driver, settlement_id, settlement_name, worker_id)
            if pagination_transactions:
                all_transactions.extend(pagination_transactions)
            
            # Method 3: Quick JavaScript data check
            js_transactions = self.extract_from_javascript_data_parallel(driver, settlement_id, settlement_name, worker_id)
            if js_transactions:
                all_transactions.extend(js_transactions)
            
            # Remove duplicates
            unique_transactions = self.remove_duplicate_transactions_parallel(all_transactions)
            
            with self.lock:
                print(f"         🧹 Worker {worker_id}: Removed duplicates: {len(all_transactions)} -> {len(unique_transactions)} unique transactions")
            
        except Exception as e:
            print(f"         ❌ Worker {worker_id}: Error in parallel extraction: {str(e)}")
        
        return unique_transactions
    
    def extract_transactions_from_current_view_parallel(self, driver, settlement_id: str, settlement_name: str, worker_id: int) -> List[Dict]:
        """
        Extract transactions from current view (parallel version)
        """
        transactions = []
        
        try:
            table = driver.find_element(By.CSS_SELECTOR, 'table#dealsTable')
            
            rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
            if not rows:
                rows = table.find_elements(By.CSS_SELECTOR, "tr")
                if rows and 'mainTable__row--header' in rows[0].get_attribute('class'):
                    rows = rows[1:]
            
            for row in rows:
                try:
                    transaction = self.parse_transaction_row_parallel(row, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
                except Exception as e:
                    continue
            
        except Exception as e:
            pass
        
        return transactions
    
    def handle_pagination_parallel(self, driver, settlement_id: str, settlement_name: str, worker_id: int) -> List[Dict]:
        """
        Handle pagination quickly (parallel version)
        """
        all_page_transactions = []
        page_num = 1
        max_pages = 10  # Reduced for speed
        
        try:
            while page_num <= max_pages:
                next_buttons = driver.find_elements(By.XPATH, 
                    "//*[contains(text(), 'הבא') or contains(text(), 'next') or contains(text(), '>')]")
                
                if not next_buttons:
                    break
                
                next_button = None
                for button in next_buttons:
                    try:
                        if button.is_enabled() and button.is_displayed():
                            next_button = button
                            break
                    except:
                        continue
                
                if not next_button:
                    break
                
                try:
                    driver.execute_script("arguments[0].click();", next_button)
                    time.sleep(3)
                    
                    page_transactions = self.extract_transactions_from_current_view_parallel(driver, settlement_id, settlement_name, worker_id)
                    if page_transactions:
                        all_page_transactions.extend(page_transactions)
                    else:
                        break
                    
                    page_num += 1
                    
                except Exception as e:
                    break
            
            # Go back to first page
            driver.get(f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals")
            time.sleep(3)
            
        except Exception as e:
            pass
        
        return all_page_transactions
    
    def extract_from_javascript_data_parallel(self, driver, settlement_id: str, settlement_name: str, worker_id: int) -> List[Dict]:
        """
        Extract from JavaScript data (parallel version)
        """
        js_transactions = []
        
        try:
            page_source = driver.page_source
            
            data_patterns = [
                r'window\.transactions\s*=\s*(\[.*?\]);',
                r'var\s+transactions\s*=\s*(\[.*?\]);',
                r'"transactions"\s*:\s*(\[.*?\])',
                r'deals\s*:\s*(\[.*?\])',
                r'properties\s*:\s*(\[.*?\])'
            ]
            
            for pattern in data_patterns:
                matches = re.findall(pattern, page_source, re.DOTALL | re.IGNORECASE)
                if matches:
                    try:
                        json_str = matches[0].replace('\\"', '"').replace("\\'", "'")
                        data = json.loads(json_str)
                        if isinstance(data, list):
                            for item in data:
                                if isinstance(item, dict):
                                    transaction = self.parse_transaction_item_parallel(item, settlement_id, settlement_name)
                                    if transaction:
                                        js_transactions.append(transaction)
                            break
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            pass
        
        return js_transactions
    
    def remove_duplicate_transactions_parallel(self, transactions: List[Dict]) -> List[Dict]:
        """
        Remove duplicates efficiently (parallel version)
        """
        unique_transactions = []
        seen_ids = set()
        
        for transaction in transactions:
            transaction_id = transaction.get('transaction_id', '')
            if transaction_id and transaction_id not in seen_ids:
                unique_transactions.append(transaction)
                seen_ids.add(transaction_id)
            elif not transaction_id:
                unique_key = f"{transaction.get('date', '')}_{transaction.get('price', '')}"
                if unique_key not in seen_ids:
                    unique_transactions.append(transaction)
                    seen_ids.add(unique_key)
        
        return unique_transactions
    
    def parse_transaction_row_parallel(self, row, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse transaction row (parallel version)
        """
        try:
            cells = row.find_elements(By.CSS_SELECTOR, "td")
            
            if len(cells) < 5:
                return None
            
            transaction = {
                'settlement_id': settlement_id,
                'settlement_name': settlement_name,
                'transaction_id': '',
                'date': '',
                'price': '',
                'rooms': '',
                'square_meters': '',
                'property_type': '',
                'address': '',
                'gush_chelka': '',
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            try:
                if len(cells) > 0:
                    transaction['transaction_id'] = cells[0].text.strip()
                if len(cells) > 1:
                    address_text = cells[1].text.strip()
                    if address_text and address_text != '0' and address_text != 'לא ידוע':
                        transaction['address'] = address_text
                if len(cells) > 2:
                    sqm_text = cells[2].text.strip()
                    if sqm_text and sqm_text != 'לא ידוע' and sqm_text != '':
                        transaction['square_meters'] = sqm_text
                if len(cells) > 3:
                    date_text = cells[3].text.strip()
                    if date_text and date_text != 'לא ידוע':
                        transaction['date'] = date_text
                if len(cells) > 4:
                    price_text = cells[4].text.strip()
                    if price_text:
                        price_match = re.search(r'([\d,]+)', price_text)
                        if price_match:
                            transaction['price'] = price_match.group(1)
                if len(cells) > 5:
                    gush_text = cells[5].text.strip()
                    if gush_text and gush_text != 'לא ידוע':
                        transaction['gush_chelka'] = gush_text
                if len(cells) > 6:
                    property_text = cells[6].text.strip()
                    if property_text and property_text != 'לא ידוע':
                        transaction['property_type'] = property_text
                if len(cells) > 7:
                    rooms_text = cells[7].text.strip()
                    if rooms_text and rooms_text != 'לא ידוע':
                        transaction['rooms'] = rooms_text
                
            except Exception as e:
                pass
            
            meaningful_fields = ['price', 'date', 'square_meters', 'property_type', 'address', 'gush_chelka']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
    def parse_transaction_item_parallel(self, item: Dict, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse transaction item (parallel version)
        """
        try:
            transaction = {
                'settlement_id': settlement_id,
                'settlement_name': settlement_name,
                'transaction_id': str(item.get('id', '')),
                'date': item.get('date', ''),
                'price': item.get('price', ''),
                'rooms': item.get('rooms', ''),
                'square_meters': item.get('squareMeters', ''),
                'property_type': item.get('propertyType', ''),
                'address': item.get('address', ''),
                'gush_chelka': item.get('gushChelka', ''),
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            meaningful_fields = ['transaction_id', 'price', 'date', 'address']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
    def save_transactions_csv(self, transactions: List[Dict], council_folder: Path, settlement_name: str):
        """
        Save transactions to CSV file
        """
        if not transactions:
            return
        
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', settlement_name)
        safe_name = re.sub(r'\s+', '_', safe_name)
        
        csv_filename = f"{safe_name}_transactions.csv"
        csv_path = council_folder / csv_filename
        
        try:
            with open(csv_path, 'w', newline='', encoding='utf-8') as file:
                if transactions:
                    fieldnames = transactions[0].keys()
                    writer = csv.DictWriter(file, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(transactions)
            
            with self.lock:
                print(f"   💾 Saved {len(transactions)} transactions to {csv_filename}")
            
        except Exception as e:
            with self.lock:
                print(f"   ❌ Error saving CSV {csv_filename}: {str(e)}")
    
    def read_settlements_csv(self, csv_file: Path) -> List[Dict]:
        """
        Read settlements from CSV file
        """
        settlements = []
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    settlements.append({
                        'id': row.get('ID', ''),
                        'name_hebrew': row.get('Name (Hebrew)', ''),
                        'name_english': row.get('Name (English)', ''),
                        'nadlan_url': row.get('Nadlan URL', '')
                    })
        except Exception as e:
            print(f"   ❌ Error reading CSV {csv_file}: {str(e)}")
        
        return settlements
    
    def scrape_all_settlements_parallel(self, councils_folder: str = "councils-with-folders"):
        """
        Scrape ALL settlements using parallel processing
        """
        councils_path = Path(councils_folder)
        
        if not councils_path.exists():
            print(f"❌ Councils folder '{councils_folder}' not found!")
            return
        
        all_settlements = []
        
        # Collect all settlements first
        print("📋 Collecting all settlements...")
        for council_folder in councils_path.iterdir():
            if not council_folder.is_dir() or council_folder.name in ['README.md', 'summary.txt']:
                continue
                
            if council_folder.name == "ללא_מועצה_אזורית":
                continue
            
            csv_files = list(council_folder.glob("*.csv"))
            if not csv_files:
                continue
            
            csv_file = csv_files[0]
            settlements = self.read_settlements_csv(csv_file)
            
            if settlements:
                for settlement in settlements:
                    settlement['council_folder'] = council_folder
                
                all_settlements.extend(settlements)
                print(f"   📊 Added {len(settlements)} settlements from {council_folder.name}")
        
        print(f"\n🚀 Starting parallel processing of {len(all_settlements)} settlements with {self.max_workers} workers...")
        
        total_transactions = 0
        successful_settlements = 0
        
        # Process settlements in parallel
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_settlement = {
                executor.submit(self.get_settlement_deals, settlement, i % self.max_workers): settlement 
                for i, settlement in enumerate(all_settlements) 
                if settlement['id'] and settlement['id'].strip() != '' and settlement['id'] != '0'
            }
            
            # Process completed tasks
            for future in as_completed(future_to_settlement):
                settlement = future_to_settlement[future]
                settlement_name, transactions, success = future.result()
                
                if success and transactions:
                    # Save transactions to CSV
                    council_folder = settlement['council_folder']
                    self.save_transactions_csv(transactions, council_folder, settlement_name)
                    total_transactions += len(transactions)
                    successful_settlements += 1
                    
                    with self.lock:
                        print(f"   ✅ {settlement_name}: {len(transactions)} transactions")
                else:
                    with self.lock:
                        print(f"   ⚠️  {settlement_name}: No transactions found")
        
        print(f"\n🎉 Parallel scraping completed!")
        print(f"📊 Total settlements processed: {len(all_settlements)}")
        print(f"📊 Successful settlements: {successful_settlements}")
        print(f"📊 Total transactions collected: {total_transactions}")

def main():
    print("🏙️  Parallel Ultimate Deals Scraper - Multiple Chrome Instances")
    print("================================================================\n")
    
    if not SELENIUM_AVAILABLE:
        print("❌ Selenium is required for this scraper!")
        print("💡 Install with: pip install selenium")
        print("💡 Also make sure Chrome and ChromeDriver are installed")
        return
    
    # Create scraper with 5 parallel workers
    scraper = ParallelUltimateDealsScraper(max_workers=5)
    
    # Start parallel scraping
    scraper.scrape_all_settlements_parallel()
    
    print("\n✨ All done! Check the council folders for complete transaction CSV files.")

if __name__ == "__main__":
    main()










