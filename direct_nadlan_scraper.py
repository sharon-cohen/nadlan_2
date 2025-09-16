#!/usr/bin/env python3
"""
Direct Nadlan Deals Scraper
Directly accesses each settlement's deals page and extracts transaction data.
"""

import os
import csv
import time
import requests
import json
from pathlib import Path
from typing import List, Dict, Optional
import re
from bs4 import BeautifulSoup

class DirectNadlanScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        self.base_url = "https://www.nadlan.gov.il"
        self.delay = 3  # Delay between requests in seconds
        
    def get_settlement_deals(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Get deals/transactions for a specific settlement by accessing its deals page
        """
        print(f"🔍 Getting deals for {settlement_name} (ID: {settlement_id})")
        
        transactions = []
        
        try:
            # Construct the settlement deals URL
            deals_url = f"{self.base_url}/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing: {deals_url}")
            
            response = self.session.get(deals_url, timeout=30)
            
            if response.status_code == 200:
                print(f"   ✅ Successfully accessed deals page")
                
                # Parse the HTML content
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Look for transaction data in the page
                transactions = self.extract_transactions_from_html(soup, settlement_id, settlement_name)
                
                # Save the HTML for analysis if no transactions found
                if not transactions:
                    html_path = f"deals_page_{settlement_id}.html"
                    with open(html_path, 'w', encoding='utf-8') as f:
                        f.write(response.text[:50000])  # First 50K characters
                    print(f"   💾 Saved HTML page to {html_path}")
                
            else:
                print(f"   ❌ Error accessing deals page: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error getting deals: {str(e)}")
        
        print(f"   🎉 Total transactions found: {len(transactions)}")
        return transactions
    
    def extract_transactions_from_html(self, soup: BeautifulSoup, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transaction data from the HTML content
        """
        transactions = []
        
        try:
            # Look for transaction tables or lists
            transaction_selectors = [
                'table[class*="transaction"]',
                'table[class*="deal"]',
                'div[class*="transaction"]',
                'div[class*="deal"]',
                'ul[class*="transaction"]',
                'ul[class*="deal"]',
                '.transactions',
                '.deals',
                '[data-transactions]',
                '[data-deals]'
            ]
            
            for selector in transaction_selectors:
                elements = soup.select(selector)
                if elements:
                    print(f"   📊 Found transaction elements with selector: {selector}")
                    for element in elements:
                        transactions.extend(self.parse_transaction_element(element, settlement_id, settlement_name))
                    if transactions:
                        break
            
            # If no transactions found with selectors, try to find any table or list
            if not transactions:
                print(f"   🔍 No specific transaction elements found, searching for any data...")
                
                # Look for any tables
                tables = soup.find_all('table')
                for table in tables:
                    if self.looks_like_transaction_table(table):
                        print(f"   📋 Found potential transaction table")
                        transactions.extend(self.parse_transaction_table(table, settlement_id, settlement_name))
                
                # Look for any lists
                lists = soup.find_all(['ul', 'ol'])
                for lst in lists:
                    if self.looks_like_transaction_list(lst):
                        print(f"   📋 Found potential transaction list")
                        transactions.extend(self.parse_transaction_list(lst, settlement_id, settlement_name))
            
            # Look for JavaScript data embedded in the page
            if not transactions:
                print(f"   🔍 Looking for embedded JavaScript data...")
                scripts = soup.find_all('script')
                for script in scripts:
                    if script.string:
                        script_data = self.extract_transactions_from_script(script.string, settlement_id, settlement_name)
                        if script_data:
                            transactions.extend(script_data)
                            break
            
        except Exception as e:
            print(f"   ❌ Error extracting transactions from HTML: {str(e)}")
        
        return transactions
    
    def looks_like_transaction_table(self, table) -> bool:
        """
        Check if a table looks like it contains transaction data
        """
        try:
            # Look for transaction-related text in headers or content
            text = table.get_text().lower()
            transaction_terms = ['מחיר', 'חדרים', 'מ"ר', 'כתובת', 'תאריך', 'price', 'rooms', 'sqm', 'address', 'date']
            return any(term in text for term in transaction_terms)
        except:
            return False
    
    def looks_like_transaction_list(self, lst) -> bool:
        """
        Check if a list looks like it contains transaction data
        """
        try:
            text = lst.get_text().lower()
            transaction_terms = ['מחיר', 'חדרים', 'מ"ר', 'כתובת', 'תאריך', 'price', 'rooms', 'sqm', 'address', 'date']
            return any(term in text for term in transaction_terms)
        except:
            return False
    
    def parse_transaction_element(self, element, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Parse transaction data from a specific element
        """
        transactions = []
        
        try:
            # Try to find rows or items
            rows = element.find_all(['tr', 'li', 'div'])
            
            for row in rows:
                transaction = self.parse_transaction_row(row, settlement_id, settlement_name)
                if transaction:
                    transactions.append(transaction)
            
        except Exception as e:
            print(f"      ❌ Error parsing transaction element: {str(e)}")
        
        return transactions
    
    def parse_transaction_table(self, table, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Parse transaction data from a table
        """
        transactions = []
        
        try:
            rows = table.find_all('tr')
            
            for row in rows:
                transaction = self.parse_transaction_row(row, settlement_id, settlement_name)
                if transaction:
                    transactions.append(transaction)
            
        except Exception as e:
            print(f"      ❌ Error parsing transaction table: {str(e)}")
        
        return transactions
    
    def parse_transaction_list(self, lst, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Parse transaction data from a list
        """
        transactions = []
        
        try:
            items = lst.find_all('li')
            
            for item in items:
                transaction = self.parse_transaction_row(item, settlement_id, settlement_name)
                if transaction:
                    transactions.append(transaction)
            
        except Exception as e:
            print(f"      ❌ Error parsing transaction list: {str(e)}")
        
        return transactions
    
    def parse_transaction_row(self, row, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a single transaction row/item
        """
        try:
            # Extract text content
            cells = row.find_all(['td', 'th', 'span', 'div'])
            if not cells:
                cells = [row]
            
            text_content = [cell.get_text(strip=True) for cell in cells if cell.get_text(strip=True)]
            
            if not text_content:
                return None
            
            # Look for transaction data in the text
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
            
            # Try to extract data from text content
            for text in text_content:
                # Look for price patterns
                price_match = re.search(r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:₪|שח|ILS|NIS)', text)
                if price_match:
                    transaction['price'] = price_match.group(1)
                
                # Look for room patterns
                room_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:חדרים|rooms|room)', text, re.IGNORECASE)
                if room_match:
                    transaction['rooms'] = room_match.group(1)
                
                # Look for square meter patterns
                sqm_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:מ"ר|sqm|m²)', text)
                if sqm_match:
                    transaction['square_meters'] = sqm_match.group(1)
                
                # Look for date patterns
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
    
    def extract_transactions_from_script(self, script_content: str, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transaction data from JavaScript content
        """
        transactions = []
        
        try:
            # Look for JSON data in scripts
            json_patterns = [
                r'window\.transactions\s*=\s*(\[.*?\]);',
                r'var\s+transactions\s*=\s*(\[.*?\]);',
                r'"transactions"\s*:\s*(\[.*?\])',
                r'data-transactions\s*=\s*"([^"]*)"'
            ]
            
            for pattern in json_patterns:
                matches = re.findall(pattern, script_content, re.DOTALL | re.IGNORECASE)
                if matches:
                    try:
                        json_str = matches[0].replace('\\"', '"').replace("\\'", "'")
                        data = json.loads(json_str)
                        if isinstance(data, list):
                            print(f"      📊 Found {len(data)} transactions in JavaScript")
                            for item in data:
                                if isinstance(item, dict):
                                    transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                                    if transaction:
                                        transactions.append(transaction)
                            break
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            print(f"      ❌ Error extracting from script: {str(e)}")
        
        return transactions
    
    def parse_transaction_item(self, item: Dict, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction item from JavaScript data
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
    
    def scrape_all_settlements(self, councils_folder: str = "councils-with-folders"):
        """
        Scrape deals for all settlements in all council folders
        """
        councils_path = Path(councils_folder)
        
        if not councils_path.exists():
            print(f"❌ Councils folder '{councils_folder}' not found!")
            return
        
        total_transactions = 0
        processed_settlements = 0
        
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
                
                # Get deals for this settlement
                transactions = self.get_settlement_deals(settlement_id, settlement_name)
                
                if transactions:
                    # Save transactions to CSV in the council folder
                    self.save_transactions_csv(transactions, council_folder, settlement_name)
                    total_transactions += len(transactions)
                
                processed_settlements += 1
                time.sleep(self.delay)  # Be respectful to the server
        
        print(f"\n🎉 Scraping completed!")
        print(f"📊 Total settlements processed: {processed_settlements}")
        print(f"📊 Total transactions collected: {total_transactions}")
    
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
            
            print(f"   💾 Saved {len(transactions)} transactions to {csv_filename}")
            
        except Exception as e:
            print(f"   ❌ Error saving CSV {csv_filename}: {str(e)}")

def main():
    print("🏙️  Direct Nadlan Deals Scraper")
    print("================================\n")
    
    scraper = DirectNadlanScraper()
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for transaction CSV files.")

if __name__ == "__main__":
    main()










