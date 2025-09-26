#!/usr/bin/env python3
"""
Working Nadlan Transaction Scraper
Uses the actual GovMap API endpoints to get transaction data for settlements.
"""

import os
import csv
import time
import requests
import json
from pathlib import Path
from typing import List, Dict, Optional
import re

class WorkingNadlanScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.nadlan.gov.il/',
            'Origin': 'https://www.nadlan.gov.il'
        })
        self.govmap_base = "https://es.govmap.gov.il"
        self.delay = 2  # Delay between requests in seconds
        
    def get_settlement_transactions(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Get transaction data for a specific settlement using GovMap API
        """
        print(f"🔍 Getting transactions for {settlement_name} (ID: {settlement_id})")
        
        transactions = []
        
        try:
            # Use the GovMap API endpoint we discovered
            api_url = f"{self.govmap_base}/TldSearch/api/DetailsByQuery"
            params = {
                'query': settlement_id,
                'gid': 'nadlan'
            }
            
            print(f"   🌐 Using GovMap API: {api_url}")
            print(f"   📊 Query params: {params}")
            
            response = self.session.get(api_url, params=params, timeout=30)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   ✅ Successfully got data from GovMap API")
                    print(f"   📊 Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                    
                    # Save the raw response for analysis
                    sample_path = f"govmap_response_{settlement_id}.json"
                    with open(sample_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    print(f"   💾 Saved GovMap response to {sample_path}")
                    
                    # Try to extract transaction data
                    transactions = self.parse_govmap_data(data, settlement_id, settlement_name)
                    
                except json.JSONDecodeError:
                    print(f"   ❌ Response is not valid JSON")
                    # Save the text response for analysis
                    sample_path = f"govmap_response_{settlement_id}.txt"
                    with open(sample_path, 'w', encoding='utf-8') as f:
                        f.write(response.text[:10000])
                    print(f"   💾 Saved text response to {sample_path}")
            else:
                print(f"   ❌ GovMap API error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error getting transactions: {str(e)}")
        
        print(f"   🎉 Total transactions found: {len(transactions)}")
        return transactions
    
    def parse_govmap_data(self, data: Dict, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Parse transaction data from GovMap API response
        """
        transactions = []
        
        try:
            # Look for transaction data in the response
            if isinstance(data, dict):
                # Check for different possible data structures
                possible_keys = ['transactions', 'deals', 'data', 'results', 'items']
                
                for key in possible_keys:
                    if key in data and data[key]:
                        print(f"   📊 Found data in '{key}' key")
                        transactions = self.extract_transactions_from_key(data[key], settlement_id, settlement_name)
                        if transactions:
                            break
                
                # If no transactions found in expected keys, try to explore the structure
                if not transactions:
                    print(f"   🔍 Exploring data structure for transactions...")
                    transactions = self.explore_data_structure(data, settlement_id, settlement_name)
            
        except Exception as e:
            print(f"   ❌ Error parsing GovMap data: {str(e)}")
        
        return transactions
    
    def extract_transactions_from_key(self, data: any, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Extract transactions from a specific data key
        """
        transactions = []
        
        try:
            if isinstance(data, list):
                print(f"      📋 Found {len(data)} items in list")
                for item in data:
                    if isinstance(item, dict):
                        transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                        if transaction:
                            transactions.append(transaction)
            elif isinstance(data, dict):
                print(f"      📋 Found dict with keys: {list(data.keys())}")
                # Check if this dict contains transaction arrays
                for key, value in data.items():
                    if isinstance(value, list) and len(value) > 0:
                        print(f"         Found list in '{key}' with {len(value)} items")
                        for item in value:
                            if isinstance(item, dict):
                                transaction = self.parse_transaction_item(item, settlement_id, settlement_name)
                                if transaction:
                                    transactions.append(transaction)
        
        except Exception as e:
            print(f"      ❌ Error extracting transactions: {str(e)}")
        
        return transactions
    
    def explore_data_structure(self, data: Dict, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Explore the data structure to find transaction information
        """
        transactions = []
        
        try:
            # Recursively search for transaction-like data
            def search_recursive(obj, depth=0, max_depth=3):
                if depth > max_depth:
                    return
                
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        # Look for transaction-related keys
                        if any(term in key.lower() for term in ['transaction', 'deal', 'price', 'property', 'real_estate']):
                            print(f"         Found potential transaction key: '{key}' at depth {depth}")
                            if isinstance(value, dict):
                                transaction = self.parse_transaction_item(value, settlement_id, settlement_name)
                                if transaction:
                                    transactions.append(transaction)
                        
                        # Recursively search nested objects
                        if isinstance(value, (dict, list)):
                            search_recursive(value, depth + 1, max_depth)
                
                elif isinstance(obj, list):
                    for item in obj:
                        if isinstance(item, (dict, list)):
                            search_recursive(item, depth + 1, max_depth)
            
            search_recursive(data)
            
        except Exception as e:
            print(f"      ❌ Error exploring data structure: {str(e)}")
        
        return transactions
    
    def parse_transaction_item(self, item: Dict, settlement_id: str, settlement_name: str) -> Optional[Dict]:
        """
        Parse a single transaction item
        """
        try:
            # Look for common transaction fields
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
            
            # Map common field names
            field_mappings = {
                'id': 'transaction_id',
                'transaction_id': 'transaction_id',
                'deal_id': 'transaction_id',
                'date': 'date',
                'transaction_date': 'date',
                'deal_date': 'date',
                'price': 'price',
                'deal_price': 'price',
                'transaction_price': 'price',
                'rooms': 'rooms',
                'num_rooms': 'rooms',
                'room_count': 'rooms',
                'square_meters': 'square_meters',
                'sqm': 'square_meters',
                'area': 'square_meters',
                'property_type': 'property_type',
                'type': 'property_type',
                'address': 'address',
                'street': 'address',
                'floor': 'floor',
                'building_year': 'building_year',
                'year': 'building_year',
                'transaction_type': 'transaction_type',
                'deal_type': 'transaction_type'
            }
            
            # Extract data using field mappings
            for source_key, target_key in field_mappings.items():
                if source_key in item:
                    value = item[source_key]
                    if value is not None and value != '':
                        transaction[target_key] = str(value)
            
            # Check if we have at least some meaningful data
            meaningful_fields = ['transaction_id', 'price', 'date', 'address']
            has_meaningful_data = any(transaction[field] for field in meaningful_fields)
            
            if has_meaningful_data:
                return transaction
            else:
                return None
                
        except Exception as e:
            print(f"         ❌ Error parsing transaction item: {str(e)}")
            return None
    
    def scrape_all_settlements(self, councils_folder: str = "councils-with-folders"):
        """
        Scrape transactions for all settlements in all council folders
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
                
                # Get transactions for this settlement
                transactions = self.get_settlement_transactions(settlement_id, settlement_name)
                
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
    print("🏙️  Working Nadlan Transaction Scraper")
    print("=======================================\n")
    
    scraper = WorkingNadlanScraper()
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for transaction CSV files.")

if __name__ == "__main__":
    main()


















