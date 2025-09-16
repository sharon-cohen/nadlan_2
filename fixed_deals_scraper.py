#!/usr/bin/env python3
"""
Fixed Deals Scraper
Fixed version that extracts ALL transactions and ALL data fields correctly.
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

class FixedDealsScraper:
    def __init__(self):
        self.driver = None
        self.wait_time = 20  # Increased wait time
        
        if not SELENIUM_AVAILABLE:
            print("❌ Selenium is required for this scraper to work!")
            return
        
        # Setup Chrome options for headless browsing
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in background
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
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
        Get ALL real deals/transactions for a specific settlement
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
            
            # Wait longer for the page to load completely
            print(f"   ⏳ Waiting for page to load completely...")
            time.sleep(8)
            
            # Wait for transaction data to appear and extract ALL transactions
            transactions = self.extract_all_transactions_from_table(settlement_id, settlement_name)
            
            if not transactions:
                print(f"   ⚠️  No transactions found in table, trying alternative methods...")
                transactions = self.try_alternative_extraction_methods(settlement_id, settlement_name)
            
            print(f"   🎉 Total real transactions found: {len(transactions)}")
            
        except Exception as e:
            print(f"   ❌ Error getting deals: {str(e)}")
        
        return transactions
    
    def extract_all_transactions_from_table(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract ALL transactions from the deals table with improved logic
        """
        transactions = []
        
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
                return transactions
            
            # Wait a bit more for the table to fully load
            time.sleep(3)
            
            # Find all transaction rows (skip header row)
            rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
            print(f"   📋 Found {len(rows)} transaction rows")
            
            # If no rows found, try alternative selectors
            if not rows:
                print(f"   🔍 No rows found with tbody tr, trying alternative...")
                rows = table.find_elements(By.CSS_SELECTOR, "tr")
                # Remove header row if it exists
                if rows and 'mainTable__row--header' in rows[0].get_attribute('class'):
                    rows = rows[1:]
                print(f"   📋 Found {len(rows)} rows with alternative method")
            
            for i, row in enumerate(rows):
                try:
                    transaction = self.parse_transaction_row_complete(row, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
                        print(f"      ✅ Parsed transaction {i+1}")
                    else:
                        print(f"      ⚠️  Row {i+1} had no meaningful data")
                except Exception as e:
                    print(f"      ❌ Error parsing row {i+1}: {str(e)}")
                    continue
            
            # Check if we need to look for pagination or more data
            if len(transactions) > 0:
                print(f"   🔍 Checking for more transactions...")
                more_transactions = self.check_for_more_transactions(settlement_id, settlement_name)
                if more_transactions:
                    transactions.extend(more_transactions)
                    print(f"   📊 Found {len(more_transactions)} additional transactions")
            
        except Exception as e:
            print(f"   ❌ Error extracting from table: {str(e)}")
        
        return transactions
    
    def parse_transaction_row_complete(self, row, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction row with COMPLETE data extraction
        """
        try:
            # Get all cells in the row
            cells = row.find_elements(By.CSS_SELECTOR, "td")
            
            if len(cells) < 5:  # Need at least 5 columns for basic data
                print(f"         ⚠️  Row has only {len(cells)} cells, need at least 5")
                return None
            
            # Create transaction object with all possible fields
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
                'floor': '',
                'building_year': '',
                'transaction_type': '',
                'gush_chelka': '',  # גוש/חלקה/תת-חלקה
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            # Extract data from each cell based on position
            try:
                # Column 0: מספר סידורי (Serial Number)
                if len(cells) > 0:
                    transaction['transaction_id'] = cells[0].text.strip()
                
                # Column 1: כתובת (Address)
                if len(cells) > 1:
                    address_text = cells[1].text.strip()
                    if address_text and address_text != '0' and address_text != 'לא ידוע':
                        transaction['address'] = address_text
                
                # Column 2: שטח במ"ר (Square Meters)
                if len(cells) > 2:
                    sqm_text = cells[2].text.strip()
                    if sqm_text and sqm_text != 'לא ידוע' and sqm_text != '':
                        transaction['square_meters'] = sqm_text
                
                # Column 3: תאריך העסקה (Transaction Date)
                if len(cells) > 3:
                    date_text = cells[3].text.strip()
                    if date_text and date_text != 'לא ידוע':
                        transaction['date'] = date_text
                
                # Column 4: מחיר העסקה (Transaction Price)
                if len(cells) > 4:
                    price_text = cells[4].text.strip()
                    if price_text:
                        # Extract just the number from "270,000 ₪"
                        price_match = re.search(r'([\d,]+)', price_text)
                        if price_match:
                            transaction['price'] = price_match.group(1)
                
                # Column 5: גוש/חלקה/תת-חלקה (Gush/Chelka/Sub-Chelka)
                if len(cells) > 5:
                    gush_text = cells[5].text.strip()
                    if gush_text and gush_text != 'לא ידוע':
                        transaction['gush_chelka'] = gush_text
                
                # Column 6: סוג נכס (Property Type)
                if len(cells) > 6:
                    property_text = cells[6].text.strip()
                    if property_text and property_text != 'לא ידוע':
                        transaction['property_type'] = property_text
                
                # Column 7: חדרים (Rooms)
                if len(cells) > 7:
                    rooms_text = cells[7].text.strip()
                    if rooms_text and rooms_text != 'לא ידוע':
                        transaction['rooms'] = rooms_text
                
                # Column 8: קומה (Floor)
                if len(cells) > 8:
                    floor_text = cells[8].text.strip()
                    if floor_text and floor_text != 'לא ידוע':
                        transaction['floor'] = floor_text
                
                # Column 9: מגמת שינוי (Change Trend) - if exists
                if len(cells) > 9:
                    trend_text = cells[9].text.strip()
                    if trend_text and trend_text != 'לא ידוע':
                        transaction['change_trend'] = trend_text
                
            except Exception as e:
                print(f"         ⚠️  Error extracting cell data: {str(e)}")
            
            # Check if we have meaningful data - be more lenient
            meaningful_fields = ['price', 'date', 'square_meters', 'property_type', 'address', 'gush_chelka']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
    def check_for_more_transactions(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Check if there are more transactions (pagination, hidden data, etc.)
        """
        additional_transactions = []
        
        try:
            # Look for pagination elements
            pagination_elements = self.driver.find_elements(By.CSS_SELECTOR, ".pagination, .pager, [class*='page']")
            
            if pagination_elements:
                print(f"         🔍 Found pagination elements, checking for more pages...")
                
                # Look for "next" or "הבא" buttons
                next_buttons = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'הבא') or contains(text(), 'next') or contains(text(), '>')]")
                
                for button in next_buttons:
                    try:
                        if button.is_enabled() and button.is_displayed():
                            print(f"            📄 Found next button, clicking...")
                            button.click()
                            time.sleep(3)
                            
                            # Extract transactions from this page
                            page_transactions = self.extract_transactions_from_current_page(settlement_id, settlement_name)
                            if page_transactions:
                                additional_transactions.extend(page_transactions)
                                print(f"            📊 Found {len(page_transactions)} additional transactions on next page")
                            
                            # Go back to first page
                            back_buttons = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'הקודם') or contains(text(), 'previous') or contains(text(), '<')]")
                            for back_button in back_buttons:
                                if back_button.is_enabled() and back_button.is_displayed():
                                    back_button.click()
                                    time.sleep(2)
                                    break
                            
                            break
                    except Exception as e:
                        print(f"            ⚠️  Error with pagination: {str(e)}")
                        continue
            
            # Look for "show more" or "הצג עוד" buttons
            show_more_buttons = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'הצג עוד') or contains(text(), 'show more') or contains(text(), 'load more')]")
            
            for button in show_more_buttons:
                try:
                    if button.is_enabled() and button.is_displayed():
                        print(f"            📄 Found show more button, clicking...")
                        button.click()
                        time.sleep(3)
                        
                        # Extract transactions from expanded view
                        expanded_transactions = self.extract_transactions_from_current_page(settlement_id, settlement_name)
                        if expanded_transactions:
                            additional_transactions.extend(expanded_transactions)
                            print(f"            📊 Found {len(expanded_transactions)} additional transactions after expansion")
                        
                        break
                except Exception as e:
                    print(f"            ⚠️  Error with show more: {str(e)}")
                    continue
            
        except Exception as e:
            print(f"         ⚠️  Error checking for more transactions: {str(e)}")
        
        return additional_transactions
    
    def extract_transactions_from_current_page(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from the current page view
        """
        transactions = []
        
        try:
            # Find the deals table again
            table = self.driver.find_element(By.CSS_SELECTOR, 'table#dealsTable')
            
            # Find all transaction rows
            rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
            if not rows:
                rows = table.find_elements(By.CSS_SELECTOR, "tr")
                # Remove header row if it exists
                if rows and 'mainTable__row--header' in rows[0].get_attribute('class'):
                    rows = rows[1:]
            
            for row in rows:
                try:
                    transaction = self.parse_transaction_row_complete(row, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"            ⚠️  Error extracting from current page: {str(e)}")
        
        return transactions
    
    def try_alternative_extraction_methods(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Try alternative methods to extract transaction data
        """
        transactions = []
        
        try:
            # Method 1: Look for JavaScript data in the page source
            page_source = self.driver.page_source
            transactions = self.extract_transactions_from_page_source(page_source, settlement_id, settlement_name)
            
            # Method 2: Look for any text that might contain transaction data
            if not transactions:
                transactions = self.extract_from_page_text(settlement_id, settlement_name)
            
            # Method 3: Look for any table-like structures
            if not transactions:
                transactions = self.extract_from_any_table_structure(settlement_id, settlement_name)
        
        except Exception as e:
            print(f"   ❌ Error in alternative methods: {str(e)}")
        
        return transactions
    
    def extract_from_any_table_structure(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Look for any table-like structure that might contain transaction data
        """
        transactions = []
        
        try:
            # Look for any table elements
            all_tables = self.driver.find_elements(By.TAG_NAME, "table")
            
            for table in all_tables:
                try:
                    # Check if this table looks like it contains transaction data
                    table_text = table.text.lower()
                    if any(term in table_text for term in ['מחיר', 'חדרים', 'מ"ר', 'כתובת', 'תאריך', 'price', 'rooms', 'sqm', 'address', 'date']):
                        print(f"         🔍 Found potential transaction table")
                        
                        rows = table.find_elements(By.TAG_NAME, "tr")
                        for row in rows:
                            try:
                                transaction = self.parse_transaction_row_complete(row, settlement_id, settlement_name)
                                if transaction:
                                    transactions.append(transaction)
                            except Exception as e:
                                continue
                        
                        if transactions:
                            break
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"         ⚠️  Error extracting from table structures: {str(e)}")
        
        return transactions
    
    def extract_transactions_from_page_source(self, page_source: str, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from page source (HTML + JavaScript)
        """
        transactions = []
        
        try:
            # Look for JSON data in the page source
            json_patterns = [
                r'window\.transactions\s*=\s*(\[.*?\]);',
                r'var\s+transactions\s*=\s*(\[.*?\]);',
                r'"transactions"\s*:\s*(\[.*?\])',
                r'data-transactions\s*=\s*"([^"]*)"',
                r'deals\s*:\s*(\[.*?\])',
                r'properties\s*:\s*(\[.*?\])'
            ]
            
            for pattern in json_patterns:
                matches = re.findall(pattern, page_source, re.DOTALL | re.IGNORECASE)
                if matches:
                    try:
                        json_str = matches[0].replace('\\"', '"').replace("\\'", "'")
                        data = json.loads(json_str)
                        if isinstance(data, list):
                            print(f"         📊 Found {len(data)} transactions in page source")
                            for item in data:
                                if isinstance(item, dict):
                                    transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                                    if transaction:
                                        transactions.append(transaction)
                            break
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            print(f"         ❌ Error extracting from page source: {str(e)}")
        
        return transactions
    
    def extract_from_page_text(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transaction data from visible page text
        """
        transactions = []
        
        try:
            # Get all visible text from the page
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            
            # Look for patterns that suggest transaction data
            lines = page_text.split('\n')
            
            for line in lines:
                if any(term in line for term in ['₪', 'שח', 'ILS', 'חדרים', 'מ"ר']):
                    transaction = self.parse_transaction_from_text(line, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
            
        except Exception as e:
            print(f"         ❌ Error extracting from page text: {str(e)}")
        
        return transactions
    
    def parse_transaction_from_text(self, text: str, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse transaction data from text content
        """
        try:
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
                'floor': '',
                'building_year': '',
                'transaction_type': '',
                'gush_chelka': '',
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            # Extract data using regex patterns
            price_match = re.search(r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:₪|שח|ILS|NIS)', text)
            if price_match:
                transaction['price'] = price_match.group(1)
            
            room_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:חדרים|rooms|room)', text, re.IGNORECASE)
            if room_match:
                transaction['rooms'] = room_match.group(1)
            
            sqm_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:מ"ר|sqm|m²)', text)
            if sqm_match:
                transaction['square_meters'] = sqm_match.group(1)
            
            date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})', text)
            if date_match:
                transaction['date'] = date_match.group(1)
            
            # Check if we have meaningful data
            meaningful_fields = ['price', 'rooms', 'square_meters', 'date']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
    def parse_transaction_item(self, item: Dict, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction item from JSON data
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
                'floor': item.get('floor', ''),
                'building_year': item.get('buildingYear', ''),
                'transaction_type': item.get('transactionType', ''),
                'gush_chelka': item.get('gushChelka', ''),
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            # Check if we have meaningful data
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
        Scrape ALL real deals for all settlements
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
                
                # Skip the "ללא_מועצה_אזורית" folder as requested
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
                    
                    # Skip settlements without ID or with empty ID
                    if not settlement_id or settlement_id.strip() == '' or settlement_id == '0':
                        continue
                    
                    # Get ALL real deals for this settlement
                    transactions = self.get_settlement_deals(settlement_id, settlement_name)
                    
                    if transactions:
                        # Save transactions to CSV in the council folder
                        self.save_transactions_csv(transactions, council_folder, settlement_name)
                        total_transactions += len(transactions)
                    
                    processed_settlements += 1
                    time.sleep(3)  # Be respectful to the server
            
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
    print("🏙️  Fixed Deals Scraper - Extracts ALL Transactions and ALL Data")
    print("==================================================================\n")
    
    if not SELENIUM_AVAILABLE:
        print("❌ Selenium is required for this scraper!")
        print("💡 Install with: pip install selenium")
        print("💡 Also make sure Chrome and ChromeDriver are installed")
        return
    
    scraper = FixedDealsScraper()
    
    if not scraper.driver:
        print("❌ Failed to initialize WebDriver!")
        return
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for complete transaction CSV files.")

if __name__ == "__main__":
    main()










