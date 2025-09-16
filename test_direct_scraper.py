#!/usr/bin/env python3
"""
Test Direct Nadlan Deals Scraper
Tests the direct scraper with just one settlement to verify it works.
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

class TestDirectNadlanScraper:
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
        self.delay = 3
        
    def test_settlement_deals(self, settlement_id: str, settlement_name: str):
        """
        Test getting deals/transactions for a specific settlement
        """
        print(f"🧪 Testing deals for {settlement_name} (ID: {settlement_id})")
        
        try:
            # Construct the settlement deals URL
            deals_url = f"{self.base_url}/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing: {deals_url}")
            
            response = self.session.get(deals_url, timeout=30)
            
            if response.status_code == 200:
                print(f"   ✅ Successfully accessed deals page")
                print(f"   📄 Page size: {len(response.text)} characters")
                
                # Parse the HTML content
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Look for transaction data in the page
                transactions = self.extract_transactions_from_html(soup, settlement_id, settlement_name)
                
                # Save the HTML for analysis
                html_path = f"test_deals_page_{settlement_id}.html"
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(response.text[:50000])  # First 50K characters
                print(f"   💾 Saved HTML page to {html_path}")
                
                print(f"   🎉 Total transactions found: {len(transactions)}")
                
                if transactions:
                    print(f"   📊 Sample transaction data:")
                    for i, transaction in enumerate(transactions[:3]):  # Show first 3
                        print(f"      Transaction {i+1}:")
                        for key, value in transaction.items():
                            if value:  # Only show non-empty values
                                print(f"         {key}: {value}")
                
            else:
                print(f"   ❌ Error accessing deals page: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error getting deals: {str(e)}")
    
    def extract_transactions_from_html(self, soup: BeautifulSoup, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transaction data from the HTML content
        """
        transactions = []
        
        try:
            print(f"   🔍 Analyzing HTML content...")
            
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
                print(f"   📋 Found {len(tables)} tables")
                for i, table in enumerate(tables):
                    if self.looks_like_transaction_table(table):
                        print(f"   📋 Table {i+1} looks like it contains transaction data")
                        transactions.extend(self.parse_transaction_table(table, settlement_id, settlement_name))
                
                # Look for any lists
                lists = soup.find_all(['ul', 'ol'])
                print(f"   📋 Found {len(lists)} lists")
                for i, lst in enumerate(lists):
                    if self.looks_like_transaction_list(lst):
                        print(f"   📋 List {i+1} looks like it contains transaction data")
                        transactions.extend(self.parse_transaction_list(lst, settlement_id, settlement_name))
            
            # Look for JavaScript data embedded in the page
            if not transactions:
                print(f"   🔍 Looking for embedded JavaScript data...")
                scripts = soup.find_all('script')
                print(f"   📜 Found {len(scripts)} script tags")
                for i, script in enumerate(scripts):
                    if script.string:
                        print(f"   📜 Analyzing script {i+1} ({len(script.string)} characters)")
                        script_data = self.extract_transactions_from_script(script.string, settlement_id, settlement_name)
                        if script_data:
                            transactions.extend(script_data)
                            print(f"   📊 Found {len(script_data)} transactions in script {i+1}")
                            break
            
        except Exception as e:
            print(f"   ❌ Error extracting transactions from HTML: {str(e)}")
        
        return transactions
    
    def looks_like_transaction_table(self, table) -> bool:
        """
        Check if a table looks like it contains transaction data
        """
        try:
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
            cells = row.find_all(['td', 'th', 'span', 'div'])
            if not cells:
                cells = [row]
            
            text_content = [cell.get_text(strip=True) for cell in cells if cell.get_text(strip=True)]
            
            if not text_content:
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
                'floor': '',
                'building_year': '',
                'transaction_type': '',
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            # Try to extract data from text content
            for text in text_content:
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
                            print(f"         📊 Found {len(data)} transactions in JavaScript")
                            for item in data:
                                if isinstance(item, dict):
                                    transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                                    if transaction:
                                        transactions.append(transaction)
                            break
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            print(f"         ❌ Error extracting from script: {str(e)}")
        
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

def main():
    print("🧪 Test Direct Nadlan Deals Scraper")
    print("===================================\n")
    
    scraper = TestDirectNadlanScraper()
    
    # Test with one settlement
    scraper.test_one_settlement()
    
    print("\n✨ Test completed! Check the HTML files for analysis.")

if __name__ == "__main__":
    main()










