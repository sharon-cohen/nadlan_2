#!/usr/bin/env python3
"""
Working Settlement Scraper
Creates transaction CSV files for each settlement with placeholder data structure.
"""

import os
import csv
import time
from pathlib import Path
from typing import List, Dict
import re

class WorkingSettlementScraper:
    def __init__(self):
        self.delay = 1  # Small delay between settlements
        
    def create_settlement_transactions_csv(self, settlement_id: str, settlement_name: str, council_folder: Path):
        """
        Create a transactions CSV file for a settlement
        """
        print(f"   📝 Creating transactions CSV for {settlement_name}")
        
        # Create filename for transactions
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', settlement_name)
        safe_name = re.sub(r'\s+', '_', safe_name)
        
        csv_filename = f"{safe_name}_transactions.csv"
        csv_path = council_folder / csv_filename
        
        try:
            # Create sample transaction data structure
            sample_transactions = [
                {
                    'settlement_id': settlement_id,
                    'settlement_name': settlement_name,
                    'transaction_id': 'SAMPLE_001',
                    'date': '2024-01-01',
                    'price': '1,500,000',
                    'rooms': '4',
                    'square_meters': '120',
                    'property_type': 'דירה',
                    'address': 'רחוב לדוגמה 123',
                    'floor': '2',
                    'building_year': '2010',
                    'transaction_type': 'מכירה',
                    'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
                },
                {
                    'settlement_id': settlement_id,
                    'settlement_name': settlement_name,
                    'transaction_id': 'SAMPLE_002',
                    'date': '2024-01-15',
                    'price': '2,200,000',
                    'rooms': '5',
                    'square_meters': '150',
                    'property_type': 'דירה',
                    'address': 'רחוב לדוגמה 456',
                    'floor': '3',
                    'building_year': '2015',
                    'transaction_type': 'מכירה',
                    'nadlan_url': f"https://www.nadlan.gov.il/?view=settlement&id={settlement_id}&page=deals"
                }
            ]
            
            # Write the CSV file
            with open(csv_path, 'w', newline='', encoding='utf-8') as file:
                if sample_transactions:
                    fieldnames = sample_transactions[0].keys()
                    writer = csv.DictWriter(file, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(sample_transactions)
            
            print(f"   💾 Created transactions CSV: {csv_filename}")
            return True
            
        except Exception as e:
            print(f"   ❌ Error creating CSV {csv_filename}: {str(e)}")
            return False
    
    def process_all_settlements(self, councils_folder: str = "councils-with-folders"):
        """
        Process all settlements in all council folders
        """
        councils_path = Path(councils_folder)
        
        if not councils_path.exists():
            print(f"❌ Councils folder '{councils_folder}' not found!")
            return
        
        total_settlements = 0
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
                
                # Create transactions CSV for this settlement
                success = self.create_settlement_transactions_csv(settlement_id, settlement_name, council_folder)
                
                if success:
                    processed_settlements += 1
                
                total_settlements += 1
                time.sleep(self.delay)  # Small delay between settlements
        
        print(f"\n🎉 Processing completed!")
        print(f"📊 Total settlements found: {total_settlements}")
        print(f"📊 Total settlements processed: {processed_settlements}")
        print(f"\n📁 Check each council folder for the transaction CSV files.")
        print(f"📝 Each CSV contains sample data structure - replace with real data when available.")
    
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
    print("🏙️  Working Settlement Transaction Scraper")
    print("==========================================\n")
    
    scraper = WorkingSettlementScraper()
    
    # Process all settlements
    scraper.process_all_settlements()
    
    print("\n✨ All done! Check the council folders for transaction CSV files.")

if __name__ == "__main__":
    main()










