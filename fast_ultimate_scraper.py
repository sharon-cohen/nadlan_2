#!/usr/bin/env python3
"""
Fast Ultimate Deals Scraper
Fast version that extracts ALL transactions efficiently.
"""

import os
import csv
import time
import json
from pathlib import Path
from typing import List, Dict, Optional
import re

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

class FastUltimateDealsScraper:
    def __init__(self):
        self.driver = None
        self.wait_time = 15  # Reduced wait time
        self.max_pages = 20  # Reduced max pages
        
        if not SELENIUM_AVAILABLE:
            print("❌ Selenium is required for this scraper to work!")
            return
        
        # Setup Chrome options for fast browsing
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-images")  # Don't load images
        chrome_options.add_argument("--disable-javascript")  # Disable JS for faster loading
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            print("✅ Chrome WebDriver initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Chrome WebDriver: {str(e)}")
            print("💡 Make sure Chrome and ChromeDriver are installed")
    
    def get_settlement_deals(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Get ALL real deals/transactions for a specific settlement - FAST
        """
        if not self.driver:
            print(f"   ❌ WebDriver not available for {settlement_name}")
            return []
        
        print(f"🔍 Getting ALL deals for {settlement_name} (ID: {settlement_id})")
        
        transactions = []
        
        try:
            # Construct the settlement deals URL
            deals_url = f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing: {deals_url}")
            
            # Navigate to the page
            self.driver.get(deals_url)
            
            # Wait for page to load (reduced time)
            print(f"   ⏳ Waiting for page to load...")
            time.sleep(5)
            
            # Extract ALL transactions using fast method
            transactions = self.extract_all_transactions_fast(settlement_id, settlement_name)
            
            print(f"   🎉 Total real transactions found: {len(transactions)}")
            
        except Exception as e:
            print(f"   ❌ Error getting deals: {str(e)}")
        
        return transactions
    
    def extract_all_transactions_fast(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract ALL transactions using fast method - focuses on what works
        """
        all_transactions = []
        
        try:
            print(f"   🔍 Looking for deals table...")
            
            # Wait for the deals table to appear
            table_selector = 'table#dealsTable'
            try:
                table = WebDriverWait(self.driver, self.wait_time).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, table_selector))
                )
                print(f"   📊 Found deals table")
            except TimeoutException:
                print(f"   ⏰ Timeout waiting for deals table")
                return all_transactions
            
            # Wait a bit for the table to load
            time.sleep(2)
            
            # Method 1: Get transactions from current view
            current_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
            if current_transactions:
                all_transactions.extend(current_transactions)
                print(f"   📋 Found {len(current_transactions)} transactions on current view")
            
            # Method 2: Quick pagination check (most effective)
            pagination_transactions = self.handle_pagination_fast(settlement_id, settlement_name)
            if pagination_transactions:
                all_transactions.extend(pagination_transactions)
                print(f"   📄 Found {len(pagination_transactions)} additional transactions from pagination")
            
            # Method 3: Quick JavaScript data check
            js_transactions = self.extract_from_javascript_data_fast(settlement_id, settlement_name)
            if js_transactions:
                all_transactions.extend(js_transactions)
                print(f"   📄 Found {len(js_transactions)} additional transactions from JavaScript data")
            
            # Remove duplicates efficiently
            unique_transactions = self.remove_duplicate_transactions_fast(all_transactions)
            print(f"   🧹 Removed duplicates: {len(all_transactions)} -> {len(unique_transactions)} unique transactions")
            
        except Exception as e:
            print(f"   ❌ Error in fast extraction: {str(e)}")
        
        return unique_transactions
    
    def extract_transactions_from_current_view(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from the current view
        """
        transactions = []
        
        try:
            # Find the deals table
            table = self.driver.find_element(By.CSS_SELECTOR, 'table#dealsTable')
            
            # Find all transaction rows
            rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
            if not rows:
                rows = table.find_elements(By.CSS_SELECTOR, "tr")
                # Remove header row if it exists
                if rows and 'mainTable__row--header' in rows[0].get_attribute('class'):
                    rows = rows[1:]
            
            print(f"      📋 Found {len(rows)} transaction rows in current view")
            
            for i, row in enumerate(rows):
                try:
                    transaction = self.parse_transaction_row_fast(row, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"      ❌ Error extracting from current view: {str(e)}")
        
        return transactions
    
    def handle_pagination_fast(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Handle pagination quickly - focus on what works
        """
        all_page_transactions = []
        page_num = 1
        
        try:
            while page_num <= self.max_pages:
                # Look for next button
                next_buttons = self.driver.find_elements(By.XPATH, 
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
                
                # Click next button
                try:
                    self.driver.execute_script("arguments[0].click();", next_button)
                    time.sleep(2)  # Reduced wait time
                    
                    # Extract transactions from this page
                    page_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
                    if page_transactions:
                        all_page_transactions.extend(page_transactions)
                        print(f"         📊 Found {len(page_transactions)} transactions on page {page_num + 1}")
                    else:
                        break
                    
                    page_num += 1
                    
                except Exception as e:
                    break
            
            # Go back to first page quickly
            self.driver.get(f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals")
            time.sleep(2)
            
        except Exception as e:
            pass
        
        return all_page_transactions
    
    def extract_from_javascript_data_fast(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from JavaScript data quickly
        """
        js_transactions = []
        
        try:
            # Get page source
            page_source = self.driver.page_source
            
            # Look for key data patterns only
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
                            print(f"         📊 Found {len(data)} transactions in JavaScript data")
                            for item in data:
                                if isinstance(item, dict):
                                    transaction = self.parse_transaction_item_fast(item, settlement_id, settlement_name)
                                    if transaction:
                                        js_transactions.append(transaction)
                            break
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            pass
        
        return js_transactions
    
    def remove_duplicate_transactions_fast(self, transactions: List[Dict]) -> List[Dict]:
        """
        Remove duplicate transactions efficiently
        """
        unique_transactions = []
        seen_ids = set()
        
        for transaction in transactions:
            transaction_id = transaction.get('transaction_id', '')
            if transaction_id and transaction_id not in seen_ids:
                unique_transactions.append(transaction)
                seen_ids.add(transaction_id)
            elif not transaction_id:
                # Use a simple key for transactions without ID
                unique_key = f"{transaction.get('date', '')}_{transaction.get('price', '')}"
                if unique_key not in seen_ids:
                    unique_transactions.append(transaction)
                    seen_ids.add(unique_key)
        
        return unique_transactions
    
    def parse_transaction_row_fast(self, row, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction row quickly
        """
        try:
            # Get all cells in the row
            cells = row.find_elements(By.CSS_SELECTOR, "td")
            
            if len(cells) < 5:
                return None
            
            # Create transaction object with essential fields only
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
            
            # Extract data quickly
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
            
            # Quick validation
            meaningful_fields = ['price', 'date', 'square_meters', 'property_type', 'address', 'gush_chelka']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
    def parse_transaction_item_fast(self, item: Dict, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction item from JSON data quickly
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
            
            # Quick validation
            meaningful_fields = ['transaction_id', 'price', 'date', 'address']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
    def scrape_all_settlements(self, councils_folder: str = "councils-with-folders"):
        """
        Scrape ALL real deals for all settlements - FAST
        """
        if not self.driver:
            print("❌ WebDriver not available!")
            return
        
        councils_path = Path(councils_folder)
        
        if not councils_path.exists():
            print(f"❌ Councils folder '{councils_folder}' not found!")
            return
        
        total_transactions = 0
        processed_settlements = 0
        
        try:
            # Go through each council folder
            for council_folder in councils_path.iterdir():
                if not council_folder.is_dir() or council_folder.name in ['README.md', 'summary.txt']:
                    continue
                    
                print(f"\n🏛️  Processing council: {council_folder.name}")
                
                # Skip the "ללא_מועצה_אזורית" folder
                if council_folder.name == "ללא_מועצה_אזורית":
                    print(f"   ⏭️  Skipping 'ללא_מועצה_אזורית' as requested")
                    continue
                
                # Find the CSV file in the council folder
                csv_files = list(council_folder.glob("*.csv"))
                if not csv_files:
                    print(f"   ⚠️  No CSV file found in {council_folder.name}")
                    continue
                
                csv_file = csv_files[0]
                
                # Read settlements from CSV
                settlements = self.read_settlements_csv(csv_file)
                
                if not settlements:
                    print(f"   ⚠️  No settlements found in {csv_file.name}")
                    continue
                
                print(f"   📊 Found {len(settlements)} settlements")
                
                # Process each settlement
                for settlement in settlements:
                    settlement_id = settlement['id']
                    settlement_name = settlement['name_hebrew']
                    
                    # Skip settlements without ID
                    if not settlement_id or settlement_id.strip() == '' or settlement_id == '0':
                        continue
                    
                    # Get ALL real deals for this settlement
                    transactions = self.get_settlement_deals(settlement_id, settlement_name)
                    
                    if transactions:
                        # Save transactions to CSV in the council folder
                        self.save_transactions_csv(transactions, council_folder, settlement_name)
                        total_transactions += len(transactions)
                    
                    processed_settlements += 1
                    time.sleep(1)  # Reduced delay between settlements
            
            print(f"\n🎉 Scraping completed!")
            print(f"📊 Total settlements processed: {processed_settlements}")
            print(f"📊 Total transactions collected: {total_transactions}")
            
        finally:
            # Always close the driver
            if self.driver:
                self.driver.quit()
                print("🔒 WebDriver closed")
    
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
    
    def save_transactions_csv(self, transactions: List[Dict], council_folder: Path, settlement_name: str):
        """
        Save transactions to CSV file in the council folder
        """
        if not transactions:
            return
        
        # Create filename for transactions
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
            
            print(f"   💾 Saved {len(transactions)} real transactions to {csv_filename}")
            
        except Exception as e:
            print(f"   ❌ Error saving CSV {csv_filename}: {str(e)}")

def main():
    print("🏙️  Fast Ultimate Deals Scraper - Extracts ALL Transactions FAST")
    print("================================================================\n")
    
    if not SELENIUM_AVAILABLE:
        print("❌ Selenium is required for this scraper!")
        print("💡 Install with: pip install selenium")
        print("💡 Also make sure Chrome and ChromeDriver are installed")
        return
    
    scraper = FastUltimateDealsScraper()
    
    if not scraper.driver:
        print("❌ Failed to initialize WebDriver!")
        return
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for complete transaction CSV files.")

if __name__ == "__main__":
    main()


















