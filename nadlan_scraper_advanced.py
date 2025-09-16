#!/usr/bin/env python3
"""
Advanced Nadlan Transaction Scraper
Scrapes transaction data for each settlement using the actual Nadlan website structure.
"""

import os
import csv
import time
import requests
import json
from pathlib import Path
from typing import List, Dict, Optional
import re
from urllib.parse import urljoin, urlparse, parse_qs

class AdvancedNadlanScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        })
        self.base_url = "https://www.nadlan.gov.il"
        self.delay = 2  # Delay between requests in seconds
        
    def get_settlement_transactions(self, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Scrape transaction data for a specific settlement from Nadlan
        """
        print(f"🔍 Scraping transactions for {settlement_name} (ID: {settlement_id})")
        
        transactions = []
        
        try:
            # First, get the settlement page to understand the structure
            settlement_url = f"{self.base_url}/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing settlement page: {settlement_url}")
            
            response = self.session.get(settlement_url, timeout=30)
            
            if response.status_code != 200:
                print(f"   ❌ Error accessing settlement page: {response.status_code}")
                return transactions
            
            # Look for transaction data in the page
            page_content = response.text
            
            # Try to find transaction data in JavaScript variables or JSON
            transactions_data = self.extract_transactions_from_page(page_content, settlement_id)
            
            if transactions_data:
                transactions = self.parse_transactions_data(transactions_data, settlement_id, settlement_name)
                print(f"   ✅ Found {len(transactions)} transactions in page content")
            else:
                print(f"   ⚠️  No transaction data found in page content")
                
                # Try alternative method - look for transaction links
                transaction_links = self.extract_transaction_links(page_content)
                if transaction_links:
                    print(f"   🔗 Found {len(transaction_links)} transaction links, attempting to scrape...")
                    transactions = self.scrape_transactions_from_links(transaction_links, settlement_id, settlement_name)
                
        except Exception as e:
            print(f"   ❌ Error scraping {settlement_name}: {str(e)}")
        
        print(f"   🎉 Total transactions found: {len(transactions)}")
        return transactions
    
    def extract_transactions_from_page(self, page_content: str, settlement_id: str) -> Optional[List]:
        """
        Extract transaction data from the page content
        """
        # Look for common patterns where transaction data might be stored
        patterns = [
            r'window\.transactions\s*=\s*(\[.*?\]);',
            r'var\s+transactions\s*=\s*(\[.*?\]);',
            r'"transactions"\s*:\s*(\[.*?\])',
            r'data-transactions\s*=\s*"([^"]*)"',
            r'<script[^>]*>.*?transactions.*?(\[.*?\])',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, page_content, re.DOTALL | re.IGNORECASE)
            if matches:
                try:
                    # Clean up the JSON string
                    json_str = matches[0].replace('\\"', '"').replace("\\'", "'")
                    data = json.loads(json_str)
                    if isinstance(data, list) and len(data) > 0:
                        return data
                except (json.JSONDecodeError, ValueError):
                    continue
        
        return None
    
    def extract_transaction_links(self, page_content: str) -> List[str]:
        """
        Extract transaction detail page links from the page
        """
        # Look for links to transaction detail pages
        pattern = r'href=["\']([^"\']*transaction[^"\']*)["\']'
        links = re.findall(pattern, page_content, re.IGNORECASE)
        
        # Convert relative URLs to absolute URLs
        absolute_links = []
        for link in links:
            if link.startswith('/'):
                absolute_links.append(urljoin(self.base_url, link))
            elif link.startswith('http'):
                absolute_links.append(link)
        
        return list(set(absolute_links))  # Remove duplicates
    
    def scrape_transactions_from_links(self, transaction_links: List[str], settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Scrape transaction details from individual transaction pages
        """
        transactions = []
        
        for i, link in enumerate(transaction_links[:10]):  # Limit to first 10 for testing
            try:
                print(f"      📄 Scraping transaction {i+1}/{len(transaction_links)}: {link}")
                
                response = self.session.get(link, timeout=30)
                if response.status_code == 200:
                    transaction_data = self.parse_transaction_page(response.text, settlement_id, settlement_name, link)
                    if transaction_data:
                        transactions.append(transaction_data)
                
                time.sleep(1)  # Small delay between requests
                
            except Exception as e:
                print(f"      ❌ Error scraping transaction {i+1}: {str(e)}")
                continue
        
        return transactions
    
    def parse_transaction_page(self, page_content: str, settlement_id: str, settlement_name: str, url: str) -> Optional[Dict]:
        """
        Parse transaction details from a transaction page
        """
        try:
            # Extract transaction details using various patterns
            transaction_data = {
                'settlement_id': settlement_id,
                'settlement_name': settlement_name,
                'transaction_id': self.extract_text(page_content, r'תעודת זהות[^>]*>([^<]*)'),
                'date': self.extract_text(page_content, r'תאריך[^>]*>([^<]*)'),
                'price': self.extract_text(page_content, r'מחיר[^>]*>([^<]*)'),
                'rooms': self.extract_text(page_content, r'חדרים[^>]*>([^<]*)'),
                'square_meters': self.extract_text(page_content, r'מ"ר[^>]*>([^<]*)'),
                'property_type': self.extract_text(page_content, r'סוג נכס[^>]*>([^<]*)'),
                'address': self.extract_text(page_content, r'כתובת[^>]*>([^<]*)'),
                'floor': self.extract_text(page_content, r'קומה[^>]*>([^<]*)'),
                'building_year': self.extract_text(page_content, r'שנת בנייה[^>]*>([^<]*)'),
                'transaction_type': self.extract_text(page_content, r'סוג עסקה[^>]*>([^<]*)'),
                'nadlan_url': url
            }
            
            # Clean up the data
            for key, value in transaction_data.items():
                if isinstance(value, str):
                    transaction_data[key] = value.strip()
            
            return transaction_data
            
        except Exception as e:
            print(f"      ❌ Error parsing transaction page: {str(e)}")
            return None
    
    def extract_text(self, content: str, pattern: str) -> str:
        """
        Extract text using regex pattern
        """
        match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else ""
    
    def parse_transactions_data(self, transactions_data: List, settlement_id: str, settlement_name: str) -> List[Dict]:
        """
        Parse transaction data from extracted JSON
        """
        parsed_transactions = []
        
        for transaction in transactions_data:
            if isinstance(transaction, dict):
                parsed_transaction = {
                    'settlement_id': settlement_id,
                    'settlement_name': settlement_name,
                    'transaction_id': str(transaction.get('id', '')),
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
                parsed_transactions.append(parsed_transaction)
        
        return parsed_transactions
    
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
                
                # Scrape transactions for this settlement
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
    print("🏙️  Advanced Nadlan Transaction Scraper")
    print("========================================\n")
    
    scraper = AdvancedNadlanScraper()
    
    # Start scraping all settlements
    scraper.scrape_all_settlements()
    
    print("\n✨ All done! Check the council folders for transaction CSV files.")

if __name__ == "__main__":
    main()










