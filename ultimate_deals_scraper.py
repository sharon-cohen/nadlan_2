#!/usr/bin/env python3
"""
Ultimate Deals Scraper
Extracts ALL transactions by handling pagination, dynamic loading, and any data loading mechanism.
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
    from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException
    from selenium.webdriver.common.action_chains import ActionChains
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️  Selenium not available. Install with: pip install selenium")

class UltimateDealsScraper:
    def __init__(self):
        self.driver = None
        self.wait_time = 25  # Increased wait time
        self.max_pages = 50  # Maximum pages to check
        
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
            time.sleep(10)
            
            # Extract ALL transactions using ultimate method
            transactions = self.extract_all_transactions_ultimate(settlement_id, settlement_name)
            
            print(f"   🎉 Total real transactions found: {len(transactions)}")
            
        except Exception as e:
            print(f"   ❌ Error getting deals: {str(e)}")
        
        return transactions
    
    def extract_all_transactions_ultimate(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract ALL transactions using ultimate method - handles everything
        """
        all_transactions = []
        page_num = 1
        
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
            
            # Wait a bit more for the table to fully load
            time.sleep(5)
            
            # First, try to get all transactions from current view
            current_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
            if current_transactions:
                all_transactions.extend(current_transactions)
                print(f"   📋 Found {len(current_transactions)} transactions on current view")
            
            # Now check for pagination and get ALL pages
            print(f"   🔍 Checking for pagination and additional pages...")
            
            # Method 1: Look for pagination buttons
            pagination_transactions = self.handle_pagination(settlement_id, settlement_name)
            if pagination_transactions:
                all_transactions.extend(pagination_transactions)
                print(f"   📄 Found {len(pagination_transactions)} additional transactions from pagination")
            
            # Method 2: Look for "show more" or "הצג עוד" buttons
            show_more_transactions = self.handle_show_more_buttons(settlement_id, settlement_name)
            if show_more_transactions:
                all_transactions.extend(show_more_transactions)
                print(f"   📄 Found {len(show_more_transactions)} additional transactions from show more")
            
            # Method 3: Look for any hidden or collapsed data
            hidden_transactions = self.handle_hidden_data(settlement_id, settlement_name)
            if hidden_transactions:
                all_transactions.extend(hidden_transactions)
                print(f"   📄 Found {len(hidden_transactions)} additional transactions from hidden data")
            
            # Method 4: Try to scroll and load more data
            scroll_transactions = self.handle_scroll_loading(settlement_id, settlement_name)
            if scroll_transactions:
                all_transactions.extend(scroll_transactions)
                print(f"   📄 Found {len(scroll_transactions)} additional transactions from scrolling")
            
            # Method 5: Look for any JavaScript data or API calls
            js_transactions = self.extract_from_javascript_data(settlement_id, settlement_name)
            if js_transactions:
                all_transactions.extend(js_transactions)
                print(f"   📄 Found {len(js_transactions)} additional transactions from JavaScript data")
            
            # Remove duplicates based on transaction_id
            unique_transactions = self.remove_duplicate_transactions(all_transactions)
            print(f"   🧹 Removed duplicates: {len(all_transactions)} -> {len(unique_transactions)} unique transactions")
            
        except Exception as e:
            print(f"   ❌ Error in ultimate extraction: {str(e)}")
        
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
                    transaction = self.parse_transaction_row_complete(row, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
                        print(f"         ✅ Parsed transaction {i+1}")
                except Exception as e:
                    print(f"         ❌ Error parsing row {i+1}: {str(e)}")
                    continue
            
        except Exception as e:
            print(f"      ❌ Error extracting from current view: {str(e)}")
        
        return transactions
    
    def handle_pagination(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Handle pagination to get ALL pages
        """
        all_page_transactions = []
        page_num = 1
        
        try:
            while page_num <= self.max_pages:
                print(f"         🔍 Checking page {page_num}...")
                
                # Look for next button
                next_buttons = self.driver.find_elements(By.XPATH, 
                    "//*[contains(text(), 'הבא') or contains(text(), 'next') or contains(text(), '>') or contains(@class, 'next')]")
                
                if not next_buttons:
                    print(f"            ⚠️  No next button found on page {page_num}")
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
                    print(f"            ⚠️  No enabled next button found on page {page_num}")
                    break
                
                # Click next button
                try:
                    print(f"            📄 Clicking next button for page {page_num + 1}")
                    self.driver.execute_script("arguments[0].click();", next_button)
                    time.sleep(5)
                    
                    # Extract transactions from this page
                    page_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
                    if page_transactions:
                        all_page_transactions.extend(page_transactions)
                        print(f"            📊 Found {len(page_transactions)} transactions on page {page_num + 1}")
                    else:
                        print(f"            ⚠️  No transactions found on page {page_num + 1}")
                        break
                    
                    page_num += 1
                    
                except Exception as e:
                    print(f"            ❌ Error navigating to next page: {str(e)}")
                    break
            
            # Go back to first page
            print(f"         🔄 Returning to first page...")
            self.driver.get(f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals")
            time.sleep(5)
            
        except Exception as e:
            print(f"         ❌ Error handling pagination: {str(e)}")
        
        return all_page_transactions
    
    def handle_show_more_buttons(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Handle "show more" buttons to expand data
        """
        expanded_transactions = []
        
        try:
            # Look for various "show more" buttons
            show_more_selectors = [
                "//*[contains(text(), 'הצג עוד')]",
                "//*[contains(text(), 'show more')]",
                "//*[contains(text(), 'load more')]",
                "//*[contains(text(), 'הצגת עוד')]",
                "//*[contains(text(), 'עוד עסקאות')]",
                "//*[contains(text(), 'more deals')]",
                "//button[contains(@class, 'show-more')]",
                "//button[contains(@class, 'load-more')]",
                "//*[contains(@class, 'expand')]"
            ]
            
            for selector in show_more_selectors:
                try:
                    buttons = self.driver.find_elements(By.XPATH, selector)
                    for button in buttons:
                        if button.is_enabled() and button.is_displayed():
                            print(f"         📄 Found show more button: {button.text}")
                            
                            # Click the button
                            self.driver.execute_script("arguments[0].click();", button)
                            time.sleep(3)
                            
                            # Extract transactions from expanded view
                            expanded_page_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
                            if expanded_page_transactions:
                                expanded_transactions.extend(expanded_page_transactions)
                                print(f"            📊 Found {len(expanded_page_transactions)} additional transactions after expansion")
                            
                            # Try clicking again if there are more
                            time.sleep(2)
                            if button.is_enabled():
                                self.driver.execute_script("arguments[0].click();", button)
                                time.sleep(3)
                                
                                more_expanded_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
                                if more_expanded_transactions:
                                    expanded_transactions.extend(more_expanded_transactions)
                                    print(f"            📊 Found {len(more_expanded_transactions)} more transactions after second expansion")
                            
                            break
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"         ❌ Error handling show more buttons: {str(e)}")
        
        return expanded_transactions
    
    def handle_hidden_data(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Handle hidden or collapsed data
        """
        hidden_transactions = []
        
        try:
            # Look for collapsible rows or hidden data
            collapsible_selectors = [
                "//tr[contains(@class, 'collapsible')]",
                "//tr[contains(@class, 'expandable')]",
                "//tr[contains(@class, 'hidden')]",
                "//*[contains(@class, 'collapse')]",
                "//*[contains(@class, 'expand')]"
            ]
            
            for selector in collapsible_selectors:
                try:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        try:
                            # Try to expand/collapse
                            if element.is_displayed():
                                self.driver.execute_script("arguments[0].click();", element)
                                time.sleep(2)
                                
                                # Extract any new transactions
                                new_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
                                if new_transactions:
                                    hidden_transactions.extend(new_transactions)
                                    print(f"         📊 Found {len(new_transactions)} transactions from hidden data")
                        except:
                            continue
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"         ❌ Error handling hidden data: {str(e)}")
        
        return hidden_transactions
    
    def handle_scroll_loading(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Handle scroll-based loading of more data
        """
        scroll_transactions = []
        
        try:
            # Scroll to bottom to trigger lazy loading
            print(f"         📜 Scrolling to trigger lazy loading...")
            
            # Get initial transaction count
            initial_count = len(self.extract_transactions_from_current_view(settlement_id, settlement_name))
            
            # Scroll down multiple times
            for scroll_attempt in range(5):
                try:
                    self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(3)
                    
                    # Check if new transactions appeared
                    current_count = len(self.extract_transactions_from_current_view(settlement_id, settlement_name))
                    if current_count > initial_count:
                        print(f"            📊 New transactions appeared after scroll {scroll_attempt + 1}: {current_count - initial_count}")
                        initial_count = current_count
                        
                        # Extract the new transactions
                        new_transactions = self.extract_transactions_from_current_view(settlement_id, settlement_name)
                        if new_transactions:
                            scroll_transactions.extend(new_transactions)
                    else:
                        print(f"            ⚠️  No new transactions after scroll {scroll_attempt + 1}")
                        break
                        
                except Exception as e:
                    print(f"            ❌ Error during scroll {scroll_attempt + 1}: {str(e)}")
                    break
            
            # Scroll back to top
            self.driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(2)
            
        except Exception as e:
            print(f"         ❌ Error handling scroll loading: {str(e)}")
        
        return scroll_transactions
    
    def extract_from_javascript_data(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from JavaScript data in the page
        """
        js_transactions = []
        
        try:
            # Get page source
            page_source = self.driver.page_source
            
            # Look for various data patterns
            data_patterns = [
                r'window\.transactions\s*=\s*(\[.*?\]);',
                r'var\s+transactions\s*=\s*(\[.*?\]);',
                r'"transactions"\s*:\s*(\[.*?\])',
                r'data-transactions\s*=\s*"([^"]*)"',
                r'deals\s*:\s*(\[.*?\])',
                r'properties\s*:\s*(\[.*?\])',
                r'window\.deals\s*=\s*(\[.*?\]);',
                r'var\s+deals\s*=\s*(\[.*?\]);',
                r'"deals"\s*:\s*(\[.*?\])',
                r'window\.properties\s*=\s*(\[.*?\]);',
                r'var\s+properties\s*=\s*(\[.*?\]);',
                r'"properties"\s*:\s*(\[.*?\])'
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
                                    transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                                    if transaction:
                                        js_transactions.append(transaction)
                            break
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            print(f"         ❌ Error extracting from JavaScript data: {str(e)}")
        
        return js_transactions
    
    def remove_duplicate_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """
        Remove duplicate transactions based on transaction_id
        """
        unique_transactions = []
        seen_ids = set()
        
        for transaction in transactions:
            transaction_id = transaction.get('transaction_id', '')
            if transaction_id and transaction_id not in seen_ids:
                unique_transactions.append(transaction)
                seen_ids.add(transaction_id)
            elif not transaction_id:
                # If no transaction_id, use a combination of other fields
                unique_key = f"{transaction.get('date', '')}_{transaction.get('price', '')}_{transaction.get('gush_chelka', '')}"
                if unique_key not in seen_ids:
                    unique_transactions.append(transaction)
                    seen_ids.add(unique_key)
        
        return unique_transactions
    
    def parse_transaction_row_complete(self, row, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction row with COMPLETE data extraction
        """
        try:
            # Get all cells in the row
            cells = row.find_elements(By.CSS_SELECTOR, "td")
            
            if len(cells) < 5:  # Need at least 5 columns for basic data
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
                pass
            
            # Check if we have meaningful data - be more lenient
            meaningful_fields = ['price', 'date', 'square_meters', 'property_type', 'address', 'gush_chelka']
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
    print("🏙️  Ultimate Deals Scraper - Extracts ALL Transactions from ALL Sources")
    print("=======================================================================\n")
    
    if not SELENIUM_AVAILABLE:
        print("❌ Selenium is required for this scraper!")
        print("💡 Install with: pip install selenium")
        print("💡 Also make sure Chrome and ChromeDriver are installed")
        return
    
    scraper = UltimateDealsScraper()
    
    if not scraper.driver:
        print("❌ Failed to initialize WebDriver!")
        return
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for complete transaction CSV files.")

if __name__ == "__main__":
    main()










