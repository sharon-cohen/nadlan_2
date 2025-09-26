#!/usr/bin/env python3
"""
Nadlan Transaction Scraper
Scrapes transaction data for each settlement and saves it in CSV format under each settlement's folder.
"""

import os
import csv
import time
import requests
import json
from pathlib import Path
from typing import List, Dict, Optional
import re

class NadlanTransactionScraper:
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
        self.base_url = "https://www.nadlan.gov.il"
        self.delay = 1  # Delay between requests in seconds
        
    def get_settlement_transactions(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Scrape transaction data for a specific settlement from Nadlan
        """
        print(f"🔍 Scraping transactions for {settlement_name} (ID: {settlement_id})")
        
        transactions = []
        page = 1
        
        try:
            while True:
                # Construct the API URL for transactions
                api_url = f"{self.base_url}/api/transactions"
                params = {
                    'settlementId': settlement_id,
                    'page': page,
                    'limit': 100,  # Maximum results per page
                    'sortBy': 'date',
                    'sortOrder': 'desc'
                }
                
                print(f"   📄 Fetching page {page}...")
                
                response = self.session.get(api_url, params=params, timeout=30)
                
                if response.status_code != 200:
                    print(f"   ❌ Error fetching page {page}: {response.status_code}")
                    break
                
                try:
                    data = response.json()
                except json.JSONDecodeError:
                    print(f"   ❌ Invalid JSON response on page {page}")
                    break
                
                # Check if we have transactions
                if not data.get('transactions') or len(data['transactions']) == 0:
                    print(f"   ✅ No more transactions found. Total pages: {page-1}")
                    break
                
                # Process transactions
                for transaction in data['transactions']:
                    transaction_data = {
                        'settlement_id': settlement_id,
                        'settlement_name': settlement_name,
                        'transaction_id': transaction.get('id', ''),
                        'date': transaction.get('date', ''),
                        'price': transaction.get('price', ''),
                        'rooms': transaction.get('rooms', ''),
                        'square_meters': transaction.get('squareMeters', ''),
                        'property_type': transaction.get('propertyType', ''),
                        'address': transaction.get('address', ''),
                        'floor': transaction.get('floor', ''),
                        'building_year': transaction.get('buildingYear', ''),
                        'transaction_type': transaction.get('transactionType', ''),
                        'nadlan_url': f"{self.base_url}/transaction/{transaction.get('id', '')}"
                    }
                    transactions.append(transaction_data)
                
                print(f"   ✅ Found {len(data['transactions'])} transactions on page {page}")
                
                # Check if this is the last page
                if len(data['transactions']) < 100:
                    break
                
                page += 1
                time.sleep(self.delay)  # Be respectful to the server
                
        except Exception as e:
            print(f"   ❌ Error scraping {settlement_name}: {str(e)}")
        
        print(f"   🎉 Total transactions found: {len(transactions)}")
        return transactions
    
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
                
                # Scrape transactions for this settlement
                transactions = self.get_settlement_transactions(settlement_id, settlement_name)
                
                if transactions:
                    # Save transactions to CSV in the settlement's folder
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
    print("🏙️  Nadlan Transaction Scraper")
    print("===============================\n")
    
    scraper = NadlanTransactionScraper()
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for transaction CSV files.")

if __name__ == "__main__":
    main()


















