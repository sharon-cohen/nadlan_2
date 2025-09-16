#!/usr/bin/env python3
"""
Fixed Nadlan JavaScript Bundle Scraper
Attempts to find the actual data endpoints by examining the JavaScript bundle.
"""

import os
import csv
import time
import requests
import json
import re
from pathlib import Path
from typing import List, Dict, Optional

class FixedNadlanJSScraper:
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
        self.delay = 2
        
    def find_js_bundle(self, settlement_id: str, settlement_name: str):
        """
        Find and analyze the JavaScript bundle to locate data endpoints
        """
        print(f"🔍 Finding JavaScript bundle for {settlement_name} (ID: {settlement_id})")
        
        try:
            # Get the settlement page
            settlement_url = f"{self.base_url}/?view=settlement&id={settlement_id}&page=deals"
            print(f"   🌐 Accessing: {settlement_url}")
            
            response = self.session.get(settlement_url, timeout=30)
            
            if response.status_code != 200:
                print(f"   ❌ Error: {response.status_code}")
                return None
            
            page_content = response.text
            print(f"   ✅ Page loaded, size: {len(page_content)} characters")
            
            # Look for JavaScript bundle references
            js_patterns = [
                r'src="([^"]*\.js)"',
                r'src=\'([^\']*\.js)\'',
                r'<script[^>]*src="([^"]*\.js)"',
                r'<script[^>]*src=\'([^\']*\.js)\''
            ]
            
            js_files = []
            for pattern in js_patterns:
                matches = re.findall(pattern, page_content, re.IGNORECASE)
                js_files.extend(matches)
            
            # Remove duplicates and filter out external scripts
            js_files = list(set([f for f in js_files if not f.startswith('http')]))
            
            print(f"   📜 Found {len(js_files)} JavaScript files:")
            for js_file in js_files:
                print(f"      {js_file}")
            
            # Try to access the main JavaScript bundle
            main_js = None
            for js_file in js_files:
                if 'index' in js_file or 'main' in js_file or 'bundle' in js_file:
                    main_js = js_file
                    break
            
            if main_js:
                print(f"   🎯 Main JS bundle: {main_js}")
                js_url = f"{self.base_url}{main_js}"
                
                try:
                    js_response = self.session.get(js_url, timeout=30)
                    if js_response.status_code == 200:
                        js_content = js_response.text
                        print(f"   ✅ JS bundle loaded, size: {len(js_content)} characters")
                        
                        # Look for API endpoints in the JavaScript
                        self.analyze_js_bundle(js_content, settlement_id, settlement_name)
                        
                        # Save the JS bundle for analysis
                        js_path = f"js_bundle_{settlement_id}.js"
                        with open(js_path, 'w', encoding='utf-8') as f:
                            f.write(js_content[:50000])  # First 50K characters
                        print(f"   💾 Saved JS bundle to {js_path}")
                        
                    else:
                        print(f"   ❌ Failed to load JS bundle: {js_response.status_code}")
                        
                except Exception as e:
                    print(f"   ❌ Error loading JS bundle: {str(e)}")
            else:
                print(f"   ⚠️  No main JavaScript bundle found")
            
            # Also look for inline JavaScript
            inline_js = re.findall(r'<script[^>]*>(.*?)</script>', page_content, re.DOTALL | re.IGNORECASE)
            if inline_js:
                print(f"   📝 Found {len(inline_js)} inline script blocks")
                for i, script in enumerate(inline_js[:3]):  # Analyze first 3
                    if len(script.strip()) > 50:  # Only meaningful scripts
                        print(f"      Script {i+1}: {len(script)} characters")
                        self.analyze_inline_js(script, settlement_id, settlement_name)
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        return None
    
    def analyze_js_bundle(self, js_content: str, settlement_id: str, settlement_name: str):
        """
        Analyze JavaScript bundle for API endpoints and data patterns
        """
        print(f"   🔍 Analyzing JavaScript bundle...")
        
        # Look for API endpoint patterns
        api_patterns = [
            r'["\']([^"\']*api[^"\']*transactions[^"\']*)["\']',
            r'["\']([^"\']*api[^"\']*deals[^"\']*)["\']',
            r'["\']([^"\']*api[^"\']*settlements[^"\']*)["\']',
            r'["\']([^"\']*api[^"\']*search[^"\']*)["\']',
            r'["\']([^"\']*api[^"\']*data[^"\']*)["\']',
            r'["\']([^"\']*api[^"\']*query[^"\']*)["\']',
            r'url["\']?\s*[:=]\s*["\']([^"\']*api[^"\']*)["\']',
            r'endpoint["\']?\s*[:=]\s*["\']([^"\']*api[^"\']*)["\']',
            r'baseURL["\']?\s*[:=]\s*["\']([^"\']*api[^"\']*)["\']',
        ]
        
        found_endpoints = []
        for pattern in api_patterns:
            matches = re.findall(pattern, js_content, re.IGNORECASE)
            found_endpoints.extend(matches)
        
        if found_endpoints:
            print(f"   🔗 Found {len(found_endpoints)} potential API endpoints:")
            # Convert to list and show first 10 unique
            unique_endpoints = list(set(found_endpoints))
            for endpoint in unique_endpoints[:10]:
                print(f"      {endpoint}")
        
        # Look for data fetching patterns
        fetch_patterns = [
            r'fetch\s*\(\s*["\']([^"\']*)["\']',
            r'axios\s*\.\s*get\s*\(\s*["\']([^"\']*)["\']',
            r'axios\s*\.\s*post\s*\(\s*["\']([^"\']*)["\']',
            r'\.get\s*\(\s*["\']([^"\']*)["\']',
            r'\.post\s*\(\s*["\']([^"\']*)["\']',
        ]
        
        found_fetches = []
        for pattern in fetch_patterns:
            matches = re.findall(pattern, js_content, re.IGNORECASE)
            found_fetches.extend(matches)
        
        if found_fetches:
            print(f"   📡 Found {len(found_fetches)} potential fetch calls:")
            # Convert to list and show first 10 unique
            unique_fetches = list(set(found_fetches))
            for fetch in unique_fetches[:10]:
                if 'api' in fetch or 'data' in fetch or 'search' in fetch:
                    print(f"      {fetch}")
        
        # Look for settlement-specific patterns
        settlement_patterns = [
            r'["\']settlementId["\']\s*[:=]\s*["\']?(\d+)["\']?',
            r'["\']settlement["\']\s*[:=]\s*["\']?(\d+)["\']?',
            r'["\']city["\']\s*[:=]\s*["\']?(\d+)["\']?',
            r'["\']location["\"]\s*[:=]\s*["\']?(\d+)["\']?',
        ]
        
        for pattern in settlement_patterns:
            matches = re.findall(pattern, js_content, re.IGNORECASE)
            if matches:
                print(f"   🏘️  Found settlement ID patterns: {matches[:5]}")
        
        # Look for specific Nadlan API patterns
        nadlan_patterns = [
            r'["\']([^"\']*nadlan[^"\']*)["\']',
            r'["\']([^"\']*gov[^"\']*)["\']',
            r'["\']([^"\']*il[^"\']*)["\']',
        ]
        
        nadlan_endpoints = []
        for pattern in nadlan_patterns:
            matches = re.findall(pattern, js_content, re.IGNORECASE)
            nadlan_endpoints.extend(matches)
        
        if nadlan_endpoints:
            print(f"   🇮🇱 Found {len(nadlan_endpoints)} potential Nadlan-specific endpoints:")
            unique_nadlan = list(set(nadlan_endpoints))
            for endpoint in unique_nadlan[:10]:
                if 'api' in endpoint or 'data' in endpoint:
                    print(f"      {endpoint}")
    
    def analyze_inline_js(self, script_content: str, settlement_id: str, settlement_name: str):
        """
        Analyze inline JavaScript for API endpoints
        """
        # Look for API calls in inline scripts
        api_calls = re.findall(r'["\']([^"\']*api[^"\']*)["\']', script_content, re.IGNORECASE)
        if api_calls:
            print(f"         Found API calls: {api_calls[:3]}")
    
    def test_settlement_js(self, settlement_id: str, settlement_name: str):
        """
        Test JavaScript analysis for a settlement
        """
        print(f"\n🔍 Testing JavaScript for {settlement_name} (ID: {settlement_id})")
        
        return self.find_js_bundle(settlement_id, settlement_name)
    
    def test_few_settlements(self, councils_folder: str = "councils-with-folders"):
        """
        Test JavaScript scraping with just a few settlements
        """
        councils_path = Path(councils_folder)
        
        if not councils_path.exists():
            print(f"❌ Councils folder '{councils_folder}' not found!")
            return
        
        # Test with just 1 settlement to avoid too many requests
        test_count = 0
        max_tests = 1
        
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
                    self.test_settlement_js(settlement_id, settlement_name)
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
    print("📜 Fixed Nadlan JavaScript Bundle Analyzer")
    print("==========================================\n")
    
    scraper = FixedNadlanJSScraper()
    
    # Test with one settlement to analyze JavaScript
    scraper.test_few_settlements()
    
    print("\n✨ JavaScript analysis completed! Check the JS bundle files for analysis.")

if __name__ == "__main__":
    main()










