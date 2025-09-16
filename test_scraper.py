#!/usr/bin/env python3
"""
Test Nadlan Transaction Scraper
Tests the scraper with a few settlements to verify it works correctly.
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

class TestNadlanScraper:
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
        
    def test_settlement_page(self, settlement_id: str, settlement_name: str):
        """
        Test accessing a settlement page to see what data is available
        """
        print(f"🔍 Testing settlement page for {settlement_name} (ID: {settlement_id})")
        
        try:
            # Access the settlement page
            settlement_url = f"{self.base_url}/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing: {settlement_url}")
            
            response = self.session.get(settlement_url, timeout=30)
            
            if response.status_code != 200:
                print(f"   ❌ Error: {response.status_code}")
                return
            
            print(f"   ✅ Successfully accessed page")
            print(f"   📄 Page size: {len(response.text)} characters")
            
            # Look for transaction-related content
            page_content = response.text
            
            # Check for common patterns
            patterns_to_check = [
                'transaction',
                'עסקה',
                'מחיר',
                'חדרים',
                'מ"ר',
                'כתובת',
                'תאריך'
            ]
            
            print(f"   🔍 Checking for transaction-related content:")
            for pattern in patterns_to_check:
                count = page_content.count(pattern)
                if count > 0:
                    print(f"      '{pattern}': found {count} times")
            
            # Look for JavaScript data
            js_patterns = [
                r'window\.\w+\s*=\s*(\[.*?\]);',
                r'var\s+\w+\s*=\s*(\[.*?\]);',
                r'"data"\s*:\s*(\[.*?\])',
                r'"transactions"\s*:\s*(\[.*?\])',
            ]
            
            print(f"   🔍 Checking for JavaScript data:")
            for pattern in js_patterns:
                matches = re.findall(pattern, page_content, re.DOTALL | re.IGNORECASE)
                if matches:
                    print(f"      Found potential data: {len(matches)} matches")
                    for i, match in enumerate(matches[:2]):  # Show first 2 matches
                        print(f"         Match {i+1}: {match[:100]}...")
            
            # Look for transaction links
            transaction_links = re.findall(r'href=["\']([^"\']*transaction[^"\']*)["\']', page_content, re.IGNORECASE)
            if transaction_links:
                print(f"   🔗 Found {len(transaction_links)} transaction links")
                for link in transaction_links[:3]:  # Show first 3 links
                    print(f"      {link}")
            
            # Save a sample of the page content for analysis
            sample_path = f"sample_page_{settlement_id}.html"
            with open(sample_path, 'w', encoding='utf-8') as f:
                f.write(page_content[:10000])  # First 10K characters
            print(f"   💾 Saved page sample to {sample_path}")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    def test_few_settlements(self, councils_folder: str = "councils-with-folders"):
        """
        Test scraping with just a few settlements
        """
        councils_path = Path(councils_folder)
        
        if not councils_path.exists():
            print(f"❌ Councils folder '{councils_folder}' not found!")
            return
        
        # Test with just 2-3 settlements from different councils
        test_count = 0
        max_tests = 3
        
        for council_folder in councils_path.iterdir():
            if test_count >= max_tests:
                break
                
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
                    self.test_settlement_page(settlement_id, settlement_name)
                    test_count += 1
                    time.sleep(self.delay)
                    
                    if test_count >= max_tests:
                        break
    
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
    print("🧪 Test Nadlan Transaction Scraper")
    print("==================================\n")
    
    scraper = TestNadlanScraper()
    
    # Test with a few settlements
    scraper.test_few_settlements()
    
    print("\n✨ Test completed! Check the sample HTML files for analysis.")

if __name__ == "__main__":
    main()










