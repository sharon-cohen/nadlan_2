#!/usr/bin/env python3
"""
Ultra Fast Deals Scraper
Uses direct API calls and parallel processing to extract ALL transactions extremely fast.
"""

import os
import csv
import time
import json
import requests
from pathlib import Path
from typing import List, Dict, Optional
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

class UltraFastDealsScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        self.max_workers = 10  # Parallel processing
    
    def get_settlement_deals_api(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Try to get deals directly from API endpoints
        """
        print(f"🔍 Getting deals for {settlement_name} (ID: {settlement_id}) via API")
        
        # Try multiple API endpoints
        api_endpoints = [
            f"https://www.nadlan.gov.il/api/deals?settlement_id={settlement_id}",
            f"https://www.nadlan.gov.il/api/transactions?settlement={settlement_id}",
            f"https://www.nadlan.gov.il/api/properties?settlement_id={settlement_id}",
            f"https://www.nadlan.gov.il/api/settlements/{settlement_id}/deals",
            f"https://www.nadlan.gov.il/api/settlements/{settlement_id}/transactions"
        ]
        
        for endpoint in api_endpoints:
            try:
                print(f"   🌐 Trying API: {endpoint}")
                response = self.session.get(endpoint, timeout=10)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        if isinstance(data, list) and len(data) > 0:
                            print(f"   ✅ API success! Found {len(data)} transactions")
                            return self.parse_api_transactions(data, settlement_id, settlement_name)
                        elif isinstance(data, dict) and 'data' in data:
                            if isinstance(data['data'], list) and len(data['data']) > 0:
                                print(f"   ✅ API success! Found {len(data['data'])} transactions")
                                return self.parse_api_transactions(data['data'], settlement_id, settlement_name)
                    except json.JSONDecodeError:
                        continue
                        
            except Exception as e:
                continue
        
        # If no API works, try to extract from HTML page
        print(f"   ⚠️  No API found, trying HTML extraction...")
        return self.get_settlement_deals_html(settlement_id, settlement_name)
    
    def get_settlement_deals_html(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract deals from HTML page (fallback method)
        """
        try:
            deals_url = f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing HTML: {deals_url}")
            
            response = self.session.get(deals_url, timeout=15)
            
            if response.status_code == 200:
                # Look for JSON data in the HTML
                transactions = self.extract_transactions_from_html(response.text, settlement_id, settlement_name)
                if transactions:
                    print(f"   ✅ HTML extraction success! Found {len(transactions)} transactions")
                    return transactions
                
                # Look for table data
                transactions = self.extract_table_from_html(response.text, settlement_id, settlement_name)
                if transactions:
                    print(f"   ✅ Table extraction success! Found {len(transactions)} transactions")
                    return transactions
            
        except Exception as e:
            print(f"   ❌ HTML extraction failed: {str(e)}")
        
        return []
    
    def extract_transactions_from_html(self, html_content: str, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from HTML content by looking for JSON data
        """
        transactions = []
        
        # Look for various data patterns
        data_patterns = [
            r'window\.transactions\s*=\s*(\[.*?\]);',
            r'var\s+transactions\s*=\s*(\[.*?\]);',
            r'"transactions"\s*:\s*(\[.*?\])',
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
            matches = re.findall(pattern, html_content, re.DOTALL | re.IGNORECASE)
            if matches:
                try:
                    json_str = matches[0].replace('\\"', '"').replace("\\'", "'")
                    data = json.loads(json_str)
                    if isinstance(data, list):
                        print(f"         📊 Found {len(data)} transactions in HTML")
                        for item in data:
                            if isinstance(item, dict):
                                transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                                if transaction:
                                    transactions.append(transaction)
                        break
                except json.JSONDecodeError:
                    continue
        
        return transactions
    
    def extract_table_from_html(self, html_content: str, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from HTML table
        """
        transactions = []
        
        # Look for table rows with transaction data
        table_pattern = r'<tr[^>]*>.*?<td[^>]*>(\d+)</td>.*?<td[^>]*>([^<]*)</td>.*?<td[^>]*>([^<]*)</td>.*?<td[^>]*>([^<]*)</td>.*?<td[^>]*>([^<]*)</td>.*?</tr>'
        
        matches = re.findall(table_pattern, html_content, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            try:
                transaction = {
                    'settlement_id': settlement_id,
                    'settlement_name': settlement_name,
                    'transaction_id': match[0].strip(),
                    'address': match[1].strip(),
                    'square_meters': match[2].strip(),
                    'date': match[3].strip(),
                    'price': match[4].strip(),
                    'rooms': '',
                    'property_type': '',
                    'gush_chelka': '',
                    'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
                }
                
                # Clean price
                price_match = re.search(r'([\d,]+)', transaction['price'])
                if price_match:
                    transaction['price'] = price_match.group(1)
                
                # Validate transaction
                if transaction['price'] and transaction['date']:
                    transactions.append(transaction)
                    
            except Exception as e:
                continue
        
        return transactions
    
    def parse_api_transactions(self, data: List[Dict], settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Parse transactions from API response
        """
        transactions = []
        
        for item in data:
            try:
                transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                if transaction:
                    transactions.append(transaction)
            except Exception as e:
                continue
        
        return transactions
    
    def parse_transaction_item(self, item: Dict, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a transaction item from API or JSON data
        """
        try:
            transaction = {
                'settlement_id': settlement_id,
                'settlement_name': settlement_name,
                'transaction_id': str(item.get('id', item.get('transaction_id', ''))),
                'date': item.get('date', item.get('transaction_date', '')),
                'price': item.get('price', item.get('transaction_price', '')),
                'rooms': item.get('rooms', item.get('num_rooms', '')),
                'square_meters': item.get('square_meters', item.get('area', item.get('sqm', ''))),
                'property_type': item.get('property_type', item.get('type', '')),
                'address': item.get('address', item.get('street', '')),
                'floor': item.get('floor', ''),
                'building_year': item.get('building_year', ''),
                'transaction_type': item.get('transaction_type', ''),
                'gush_chelka': item.get('gush_chelka', item.get('parcel', '')),
                'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
            }
            
            # Clean price if it's a string
            if isinstance(transaction['price'], str):
                price_match = re.search(r'([\d,]+)', transaction['price'])
                if price_match:
                    transaction['price'] = price_match.group(1)
            
            # Check if we have meaningful data
            meaningful_fields = ['transaction_id', 'price', 'date', 'address']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            return None
    
    def process_settlement(self, settlement: Dict) -> tuple:
        """
        Process a single settlement and return results
        """
        settlement_id = settlement['id']
        settlement_name = settlement['name_hebrew']
        
        try:
            transactions = self.get_settlement_deals_api(settlement_id, settlement_name)
            return (settlement_name, transactions, True)
        except Exception as e:
            return (settlement_name, [], False)
    
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
                # Add council info to settlements
                for settlement in settlements:
                    settlement['council_folder'] = council_folder
                
                all_settlements.extend(settlements)
                print(f"   📊 Added {len(settlements)} settlements from {council_folder.name}")
        
        print(f"\n🚀 Starting parallel processing of {len(all_settlements)} settlements...")
        
        total_transactions = 0
        successful_settlements = 0
        
        # Process settlements in parallel
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_settlement = {
                executor.submit(self.process_settlement, settlement): settlement 
                for settlement in all_settlements 
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
                    print(f"   ✅ {settlement_name}: {len(transactions)} transactions")
                else:
                    print(f"   ⚠️  {settlement_name}: No transactions found")
        
        print(f"\n🎉 Parallel scraping completed!")
        print(f"📊 Total settlements processed: {len(all_settlements)}")
        print(f"📊 Successful settlements: {successful_settlements}")
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
    print("🏙️  Ultra Fast Deals Scraper - Parallel Processing + API Calls")
    print("================================================================\n")
    
    scraper = UltraFastDealsScraper()
    
    # Start parallel scraping
    scraper.scrape_all_settlements_parallel()
    
    print("\n✨ All done! Check the council folders for complete transaction CSV files.")

if __name__ == "__main__":
    main()










