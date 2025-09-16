#!/usr/bin/env python3
"""
Test Real Deals Scraper
Tests the Selenium-based scraper with one settlement to verify it works.
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

class TestRealDealsScraper:
    def __init__(self):
        self.driver = None
        self.wait_time = 15  # Longer wait time for testing
        
        if not SELENIUM_AVAILABLE:
            print("❌ Selenium is required for this scraper to work!")
            return
        
        # Setup Chrome options for headless browsing
        chrome_options = Options()
        # chrome_options.add_argument("--headless")  # Comment out for testing to see what's happening
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
    
    def test_settlement_deals(self, settlement_id: str, settlement_name: str):
        """
        Test getting real deals for a specific settlement
        """
        if not self.driver:
            print(f"   ❌ WebDriver not available for {settlement_name}")
            return
        
        print(f"🧪 Testing real deals for {settlement_name} (ID: {settlement_id})")
        
        try:
            # Construct the settlement deals URL
            deals_url = f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing: {deals_url}")
            
            # Navigate to the page
            self.driver.get(deals_url)
            
            # Wait for the page to load
            print(f"   ⏳ Waiting for page to load...")
            time.sleep(5)
            
            # Get page info
            page_title = self.driver.title
            page_url = self.driver.current_url
            print(f"   📄 Page title: {page_title}")
            print(f"   🌐 Current URL: {page_url}")
            
            # Wait for transaction data to appear
            transactions = self.wait_and_extract_transactions(settlement_id, settlement_name)
            
            if not transactions:
                print(f"   ⚠️  No transactions found, trying alternative methods...")
                transactions = self.try_alternative_extraction_methods(settlement_id, settlement_name)
            
            print(f"   🎉 Total real transactions found: {len(transactions)}")
            
            if transactions:
                print(f"   📊 Sample transaction data:")
                for i, transaction in enumerate(transactions[:3]):  # Show first 3
                    print(f"      Transaction {i+1}:")
                    for key, value in transaction.items():
                        if value:  # Only show non-empty values
                            print(f"         {key}: {value}")
            
            # Save the page source for analysis
            page_source = self.driver.page_source
            html_path = f"test_real_deals_page_{settlement_id}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(page_source[:100000])  # First 100K characters
            print(f"   💾 Saved page source to {html_path}")
            
        except Exception as e:
            print(f"   ❌ Error getting deals: {str(e)}")
    
    def wait_and_extract_transactions(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Wait for transactions to load and extract them
        """
        transactions = []
        
        try:
            print(f"   🔍 Looking for transaction elements...")
            
            # Wait for common transaction elements to appear
            selectors_to_try = [
                'table[class*="transaction"]',
                'table[class*="deal"]',
                '.transactions',
                '.deals',
                '[data-transactions]',
                '[data-deals]',
                'table',  # Any table
                '.property-list',
                '.deal-list',
                '.property-item',
                '.deal-item'
            ]
            
            for selector in selectors_to_try:
                try:
                    print(f"      🔍 Trying selector: {selector}")
                    # Wait for element to be present
                    element = WebDriverWait(self.driver, self.wait_time).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    
                    print(f"   📊 Found element with selector: {selector}")
                    
                    # Extract transactions from this element
                    transactions = self.extract_transactions_from_element(element, settlement_id, settlement_name)
                    
                    if transactions:
                        break
                        
                except TimeoutException:
                    print(f"      ⏰ Timeout waiting for selector: {selector}")
                    continue
                except Exception as e:
                    print(f"      ⚠️  Error with selector {selector}: {str(e)}")
                    continue
            
            # If still no transactions, try to find any data on the page
            if not transactions:
                print(f"   🔍 No specific elements found, searching entire page...")
                transactions = self.search_entire_page_for_transactions(settlement_id, settlement_name)
        
        except Exception as e:
            print(f"   ❌ Error in wait_and_extract: {str(e)}")
        
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
        
        except Exception as e:
            print(f"   ❌ Error in alternative methods: {str(e)}")
        
        return transactions
    
    def extract_transactions_from_element(self, element, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from a specific DOM element
        """
        transactions = []
        
        try:
            # Try to find rows or items
            rows = element.find_elements(By.TAG_NAME, "tr")
            if not rows:
                rows = element.find_elements(By.TAG_NAME, "li")
            if not rows:
                rows = element.find_elements(By.TAG_NAME, "div")
            
            print(f"      📋 Found {len(rows)} potential transaction rows")
            
            for i, row in enumerate(rows[:10]):  # Limit to first 10 for testing
                try:
                    transaction = self.parse_transaction_row_selenium(row, settlement_id, settlement_name)
                    if transaction:
                        transactions.append(transaction)
                        print(f"         ✅ Parsed transaction {i+1}")
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"      ❌ Error extracting from element: {str(e)}")
        
        return transactions
    
    def parse_transaction_row_selenium(self, row, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction row using Selenium
        """
        try:
            # Get text content
            text_content = row.text.strip()
            
            if not text_content or len(text_content) < 10:
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
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            # Extract data using regex patterns
            price_match = re.search(r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:₪|שח|ILS|NIS)', text_content)
            if price_match:
                transaction['price'] = price_match.group(1)
            
            room_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:חדרים|rooms|room)', text_content, re.IGNORECASE)
            if room_match:
                transaction['rooms'] = room_match.group(1)
            
            sqm_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:מ"ר|sqm|m²)', text_content)
            if sqm_match:
                transaction['square_meters'] = sqm_match.group(1)
            
            date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})', text_content)
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
    
    def search_entire_page_for_transactions(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Search the entire page for any transaction-related data
        """
        transactions = []
        
        try:
            # Look for any elements that might contain transaction data
            all_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), '₪') or contains(text(), 'שח') or contains(text(), 'ILS')]")
            
            print(f"   🔍 Found {len(all_elements)} elements with price indicators")
            
            for element in all_elements[:20]:  # Limit to first 20 to avoid too many
                try:
                    text = element.text.strip()
                    if len(text) > 10 and len(text) < 500:  # Reasonable text length
                        transaction = self.parse_transaction_from_text(text, settlement_id, settlement_name)
                        if transaction:
                            transactions.append(transaction)
                except:
                    continue
            
        except Exception as e:
            print(f"   ❌ Error searching entire page: {str(e)}")
        
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
    
    def test_one_settlement(self, councils_folder: str = "councils-with-folders"):
        """
        Test with just one settlement
        """
        if not self.driver:
            print("❌ WebDriver not available!")
            return
        
        councils_path = Path(councils_folder)
        
        if not councils_path.exists():
            print(f"❌ Councils folder '{councils_folder}' not found!")
            return
        
        # Test with just 1 settlement
        for council_folder in councils_path.iterdir():
            if not council_folder.is_dir() or council_folder.name in ['README.md', 'summary.txt']:
                continue
            
            # Skip the "ללא_מועצה_אזורית" folder
            if council_folder.name == "ללא_מועצה_אזורית":
                continue
                
            print(f"\n🏛️  Testing council: {council_folder.name}")
            
            # Find the CSV file in the council folder
            csv_files = list(council_folder.glob("*.csv"))
            if not csv_files:
                continue
            
            csv_file = csv_files[0]
            
            # Read settlements from CSV
            settlements = self.read_settlements_csv(csv_file)
            
            if not settlements:
                continue
            
            # Test with first settlement in this council
            if settlements:
                settlement = settlements[0]
                settlement_id = settlement['id']
                settlement_name = settlement['name_hebrew']
                
                if settlement_id and settlement_id.strip() != '' and settlement_id != '0':
                    self.test_settlement_deals(settlement_id, settlement_name)
                    break  # Only test one settlement
    
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
    
    def cleanup(self):
        """
        Clean up resources
        """
        if self.driver:
            self.driver.quit()
            print("🔒 WebDriver closed")

def main():
    print("🧪 Test Real Deals Scraper (Selenium-based)")
    print("============================================\n")
    
    if not SELENIUM_AVAILABLE:
        print("❌ Selenium is required for this scraper!")
        print("💡 Install with: pip install selenium")
        print("💡 Also make sure Chrome and ChromeDriver are installed")
        return
    
    scraper = TestRealDealsScraper()
    
    if not scraper.driver:
        print("❌ Failed to initialize WebDriver!")
        return
    
    try:
        # Test with one settlement
        scraper.test_one_settlement()
    finally:
        # Always cleanup
        scraper.cleanup()
    
    print("\n✨ Test completed! Check the HTML files for analysis.")

if __name__ == "__main__":
    main()










