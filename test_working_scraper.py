#!/usr/bin/env python3
"""
Test Working Nadlan Transaction Scraper
Tests the working scraper with just one settlement to verify it works.
"""

import os
import csv
import time
import requests
import json
from pathlib import Path
from typing import List, Dict, Optional
import re

class TestWorkingNadlanScraper:
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
        self.delay = 2
        
    def test_settlement_transactions(self, settlement_id: str, settlement_name: str):
        """
        Test getting transaction data for a specific settlement using GovMap API
        """
        print(f"🧪 Testing transactions for {settlement_name} (ID: {settlement_id})")
        
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
                    sample_path = f"test_govmap_response_{settlement_id}.json"
                    with open(sample_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    print(f"   💾 Saved GovMap response to {sample_path}")
                    
                    # Show a sample of the data structure
                    if isinstance(data, dict):
                        print(f"   📋 Data structure preview:")
                        for key, value in data.items():
                            if isinstance(value, list):
                                print(f"      {key}: List with {len(value)} items")
                                if value and len(value) > 0:
                                    print(f"         First item keys: {list(value[0].keys()) if isinstance(value[0], dict) else 'Not a dict'}")
                            elif isinstance(value, dict):
                                print(f"      {key}: Dict with keys: {list(value.keys())}")
                            else:
                                print(f"      {key}: {type(value).__name__} = {value}")
                    
                except json.JSONDecodeError:
                    print(f"   ❌ Response is not valid JSON")
                    # Save the text response for analysis
                    sample_path = f"test_govmap_response_{settlement_id}.txt"
                    with open(sample_path, 'w', encoding='utf-8') as f:
                        f.write(response.text[:10000])
                    print(f"   💾 Saved text response to {sample_path}")
            else:
                print(f"   ❌ GovMap API error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error getting transactions: {str(e)}")
    
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
                    self.test_settlement_transactions(settlement_id, settlement_name)
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
    print("🧪 Test Working Nadlan Transaction Scraper")
    print("==========================================\n")
    
    scraper = TestWorkingNadlanScraper()
    
    # Test with one settlement
    scraper.test_one_settlement()
    
    print("\n✨ Test completed! Check the response files for analysis.")

if __name__ == "__main__":
    main()


















