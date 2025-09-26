#!/usr/bin/env python3
"""
Improved Deals Scraper
Enhanced version that extracts all transaction data including square meters, property type, and rooms.
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

class ImprovedDealsScraper:
    def __init__(self):
        self.driver = None
        self.wait_time = 15
        
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
        Get real deals/transactions for a specific settlement using Selenium
        """
        if not self.driver:
            print(f"   ❌ WebDriver not available for {settlement_name}")
            return []
        
        print(f"🔍 Getting real deals for {settlement_name} (ID: {settlement_id})")
        
        transactions = []
        
        try:
            # Construct the settlement deals URL
            deals_url = f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing: {deals_url}")
            
            # Navigate to the page
            self.driver.get(deals_url)
            
            # Wait for the page to load
            time.sleep(5)
            
            # Wait for transaction data to appear
            transactions = self.extract_transactions_from_table(settlement_id, settlement_name)
            
            if not transactions:
                print(f"   ⚠️  No transactions found in table, trying alternative methods...")
                transactions = self.try_alternative_extraction_methods(settlement_id, settlement_name)
            
            print(f"   🎉 Total real transactions found: {len(transactions)}")
            
        except Exception as e:
            print(f"   ❌ Error getting deals: {str(e)}")
        
        return transactions
    
    def extract_transactions_from_table(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from the main deals table
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
            
            # Find all transaction rows (skip header row)
            rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
            print(f"   📋 Found {len(rows)} transaction rows")
            
            for i, row in enumerate(rows):
                try:
                    transaction = self.parse_transaction_row_improved(row, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
                        print(f"      ✅ Parsed transaction {i+1}")
                except Exception as e:
                    print(f"      ❌ Error parsing row {i+1}: {str(e)}")
                    continue
            
        except Exception as e:
            print(f"   ❌ Error extracting from table: {str(e)}")
        
        return transactions
    
    def parse_transaction_row_improved(self, row, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction row with improved data extraction
        """
        try:
            # Get all cells in the row
            cells = row.find_elements(By.CSS_SELECTOR, "td")
            
            if len(cells) < 8:  # Need at least 8 columns for full data
                return None
            
            # Create transaction object
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
                    if address_text and address_text != '0':
                        transaction['address'] = address_text
                
                # Column 2: שטח במ"ר (Square Meters)
                if len(cells) > 2:
                    sqm_text = cells[2].text.strip()
                    if sqm_text and sqm_text != 'לא ידוע':
                        transaction['square_meters'] = sqm_text
                
                # Column 3: תאריך העסקה (Transaction Date)
                if len(cells) > 3:
                    date_text = cells[3].text.strip()
                    if date_text:
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
                    if gush_text:
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
                
            except Exception as e:
                print(f"         ⚠️  Error extracting cell data: {str(e)}")
            
            # Check if we have meaningful data
            meaningful_fields = ['price', 'date', 'square_meters', 'property_type', 'address']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
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
        
        except Exception as e:
            print(f"   ❌ Error in alternative methods: {str(e)}")
        
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
                            print(f"      📊 Found {len(data)} transactions in page source")
                            for item in data:
                                if isinstance(item, dict):
                                    transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                                    if transaction:
                                        transactions.append(transaction)
                            break
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            print(f"      ❌ Error extracting from page source: {str(e)}")
        
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
            print(f"      ❌ Error extracting from page text: {str(e)}")
        
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
        Scrape real deals for all settlements
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
                    
                    # Get real deals for this settlement
                    transactions = self.get_settlement_deals(settlement_id, settlement_name)
                    
                    if transactions:
                        # Save transactions to CSV in the council folder
                        self.save_transactions_csv(transactions, council_folder, settlement_name)
                        total_transactions += len(transactions)
                    
                    processed_settlements += 1
                    time.sleep(2)  # Be respectful to the server
            
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
    print("🏙️  Improved Real Deals Scraper (Selenium-based)")
    print("=================================================\n")
    
    if not SELENIUM_AVAILABLE:
        print("❌ Selenium is required for this scraper!")
        print("💡 Install with: pip install selenium")
        print("💡 Also make sure Chrome and ChromeDriver are installed")
        return
    
    scraper = ImprovedDealsScraper()
    
    if not scraper.driver:
        print("❌ Failed to initialize WebDriver!")
        return
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for real transaction CSV files.")

if __name__ == "__main__":
    main()


















