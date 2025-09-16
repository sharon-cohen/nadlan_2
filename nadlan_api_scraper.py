#!/usr/bin/env python3
"""
Nadlan API Scraper
Attempts to find and use the actual Nadlan API endpoints to get transaction data.
"""

import os
import csv
import time
import requests
import json
from pathlib import Path
from typing import List, Dict, Optional
import re

class NadlanAPIScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.nadlan.gov.il/',
            'Origin': 'https://www.nadlan.gov.il',
            'X-Requested-With': 'XMLHttpRequest'
        })
        self.base_url = "https://www.nadlan.gov.il"
        self.delay = 2  # Delay between requests in seconds
        
    def find_api_endpoints(self, settlement_id: str, settlement_name: str):
        """
        Try to find the actual API endpoints used by Nadlan
        """
        print(f"🔍 Finding API endpoints for {settlement_name} (ID: {settlement_id})")
        
        # Common API endpoint patterns to try
        api_patterns = [
            f"/api/transactions?settlementId={settlement_id}",
            f"/api/deals?settlementId={settlement_id}",
            f"/api/settlements/{settlement_id}/transactions",
            f"/api/settlements/{settlement_id}/deals",
            f"/api/search?settlement={settlement_id}",
            f"/api/data?type=transactions&settlement={settlement_id}",
            f"/api/query?settlement={settlement_id}&type=transactions",
            f"/api/v1/transactions?settlement={settlement_id}",
            f"/api/v1/deals?settlement={settlement_id}",
            f"/api/v2/transactions?settlement={settlement_id}",
            f"/api/v2/deals?settlement={settlement_id}",
        ]
        
        # Also try with different parameter names
        param_patterns = [
            f"/api/transactions?settlement={settlement_id}",
            f"/api/deals?settlement={settlement_id}",
            f"/api/transactions?city={settlement_id}",
            f"/api/deals?city={settlement_id}",
            f"/api/transactions?location={settlement_id}",
            f"/api/deals?location={settlement_id}",
        ]
        
        all_patterns = api_patterns + param_patterns
        
        for pattern in all_patterns:
            try:
                url = f"{self.base_url}{pattern}"
                print(f"   🌐 Trying: {url}")
                
                response = self.session.get(url, timeout=30)
                
                if response.status_code == 200:
                    print(f"   ✅ Success! Status: {response.status_code}")
                    
                    # Try to parse as JSON
                    try:
                        data = response.json()
                        print(f"   📊 Response type: {type(data)}")
                        print(f"   📊 Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                        
                        # Save the response for analysis
                        sample_path = f"api_response_{settlement_id}_{pattern.replace('/', '_')}.json"
                        with open(sample_path, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=2, ensure_ascii=False)
                        print(f"   💾 Saved API response to {sample_path}")
                        
                        return data
                        
                    except json.JSONDecodeError:
                        print(f"   📄 Response is not JSON, length: {len(response.text)}")
                        
                        # Save the text response for analysis
                        sample_path = f"api_response_{settlement_id}_{pattern.replace('/', '_')}.txt"
                        with open(sample_path, 'w', encoding='utf-8') as f:
                            f.write(response.text[:5000])  # First 5K characters
                        print(f"   💾 Saved text response to {sample_path}")
                        
                elif response.status_code == 404:
                    print(f"   ❌ Not found (404)")
                elif response.status_code == 403:
                    print(f"   🚫 Forbidden (403)")
                elif response.status_code == 401:
                    print(f"   🔐 Unauthorized (401)")
                else:
                    print(f"   ⚠️  Status: {response.status_code}")
                
                time.sleep(1)  # Small delay between attempts
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
                continue
        
        print(f"   ❌ No working API endpoints found")
        return None
    
    def try_search_api(self, settlement_id: str, settlement_name: str):
        """
        Try the search API that might be used by the frontend
        """
        print(f"🔍 Trying search API for {settlement_name} (ID: {settlement_id})")
        
        # Try different search API patterns
        search_patterns = [
            f"/api/search",
            f"/api/query",
            f"/api/find",
            f"/api/lookup"
        ]
        
        for pattern in search_patterns:
            try:
                url = f"{self.base_url}{pattern}"
                
                # Try different request methods and data formats
                payloads = [
                    {"settlementId": settlement_id},
                    {"settlement": settlement_id},
                    {"city": settlement_id},
                    {"location": settlement_id},
                    {"id": settlement_id},
                    {"query": settlement_id},
                    {"search": settlement_id}
                ]
                
                for payload in payloads:
                    try:
                        print(f"   🌐 Trying POST {url} with payload: {payload}")
                        
                        response = self.session.post(url, json=payload, timeout=30)
                        
                        if response.status_code == 200:
                            print(f"   ✅ Success with payload: {payload}")
                            
                            try:
                                data = response.json()
                                print(f"   📊 Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                                
                                # Save the response
                                sample_path = f"search_response_{settlement_id}_{pattern.replace('/', '_')}.json"
                                with open(sample_path, 'w', encoding='utf-8') as f:
                                    json.dump(data, f, indent=2, ensure_ascii=False)
                                print(f"   💾 Saved search response to {sample_path}")
                                
                                return data
                                
                            except json.JSONDecodeError:
                                print(f"   📄 Response is not JSON")
                        
                        elif response.status_code == 404:
                            print(f"   ❌ Not found (404)")
                        elif response.status_code == 403:
                            print(f"   🚫 Forbidden (403)")
                        else:
                            print(f"   ⚠️  Status: {response.status_code}")
                        
                        time.sleep(1)
                        
                    except Exception as e:
                        print(f"   ❌ Error with payload {payload}: {str(e)}")
                        continue
                        
            except Exception as e:
                print(f"   ❌ Error with pattern {pattern}: {str(e)}")
                continue
        
        print(f"   ❌ No working search API found")
        return None
    
    def test_settlement_apis(self, settlement_id: str, settlement_name: str):
        """
        Test various API approaches for a settlement
        """
        print(f"\n🔍 Testing APIs for {settlement_name} (ID: {settlement_id})")
        
        # Try direct API endpoints
        api_data = self.find_api_endpoints(settlement_id, settlement_name)
        
        if not api_data:
            # Try search API
            search_data = self.try_search_api(settlement_id, settlement_name)
            
            if not search_data:
                print(f"   ❌ No API data found for {settlement_name}")
                return None
        
        return api_data or search_data
    
    def test_few_settlements(self, councils_folder: str = "councils-with-folders"):
        """
        Test API scraping with just a few settlements
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
                    self.test_settlement_apis(settlement_id, settlement_name)
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
    print("🔍 Nadlan API Endpoint Finder")
    print("==============================\n")
    
    scraper = NadlanAPIScraper()
    
    # Test with a few settlements to find working APIs
    scraper.test_few_settlements()
    
    print("\n✨ API testing completed! Check the response files for analysis.")

if __name__ == "__main__":
    main()










