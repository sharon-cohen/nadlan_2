#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

async function createCouncilFolders() {
  try {
    // Read the simple CSV file
    const csvPath = "settlements-simple-2025-09-03T11-56-13-750Z.csv";
    
    if (!fs.existsSync(csvPath)) {
      console.error("❌ CSV file not found. Please make sure the file exists.");
      return;
    }

    console.log(`📖 Reading data from: ${csvPath}`);
    
    const csvContent = fs.readFileSync(csvPath, "utf8");
    const lines = csvContent.split("\n").filter((line) => line.trim());
    
    // Parse CSV (skip header)
    const settlements = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV parsing (assuming no commas in the data itself)
      const columns = line.split('","').map((col) => col.replace(/"/g, ""));
      
      if (columns.length >= 5) {
        settlements.push({
          id: columns[0],
          nameHebrew: columns[1],
          nameEnglish: columns[2],
          regionalCouncil: columns[3],
          nadlanUrl: columns[4],
        });
      }
    }

    console.log(`📊 Total settlements: ${settlements.length}`);

    // Group settlements by regional council
    const councilsMap = new Map();
    
    settlements.forEach((settlement) => {
      const council = settlement.regionalCouncil;
      if (!councilsMap.has(council)) {
        councilsMap.set(council, []);
      }
      councilsMap.get(council).push(settlement);
    });

    // Create main output directory
    const outputDir = "./councils-with-folders";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    console.log(`\n🏛️  Creating folders and CSV files for ${councilsMap.size} councils...`);

    // Create folder and CSV file for each council
    for (const [councilName, councilSettlements] of councilsMap) {
      // Clean council name for folder name
      const cleanCouncilName = councilName
        .replace(/[<>:"/\\|?*]/g, "_") // Remove invalid filename characters
        .replace(/\s+/g, "_"); // Replace spaces with underscores
      
      // Create folder for this council
      const councilFolderPath = path.join(outputDir, cleanCouncilName);
      if (!fs.existsSync(councilFolderPath)) {
        fs.mkdirSync(councilFolderPath);
      }
      
      // Create CSV file inside the folder
      const csvFilename = `${cleanCouncilName}.csv`;
      const csvFilePath = path.join(councilFolderPath, csvFilename);
      
      // Create CSV content
      const headers = ["ID", "Name (Hebrew)", "Name (English)", "Nadlan URL"];
      const rows = councilSettlements.map((s) => [
        s.id,
        s.nameHebrew,
        s.nameEnglish,
        s.nadlanUrl,
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      fs.writeFileSync(csvFilePath, csvContent, "utf8");
      
      console.log(`✅ ${councilName}: ${councilSettlements.length} settlements → ${cleanCouncilName}/${csvFilename}`);
    }

    // Create summary file in the main directory
    const summaryPath = path.join(outputDir, "summary.txt");
    const summary = `Regional Councils Summary
==========================
Total Councils: ${councilsMap.size}
Total Settlements: ${settlements.length}

Councils by Settlement Count:
${Array.from(councilsMap.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .map(
    ([council, settlements]) => `${council}: ${settlements.length} settlements`
  )
  .join("\n")}

Generated: ${new Date().toISOString()}
`;

    fs.writeFileSync(summaryPath, summary, "utf8");
    console.log(`\n📋 Summary created: ${summaryPath}`);

    // Create a README file explaining the structure
    const readmePath = path.join(outputDir, "README.md");
    const readme = `# Regional Councils Data Structure

This directory contains settlement data organized by regional councils.

## Structure

Each regional council has its own folder containing:
- \`{council_name}.csv\` - CSV file with settlement data for that council

## CSV Format

Each CSV file contains:
- **ID** - Settlement identifier
- **Name (Hebrew)** - Settlement name in Hebrew
- **Name (English)** - Settlement name in English
- **Nadlan URL** - Link to Nadlan real estate deals page

## Total Councils: ${councilsMap.size}
## Total Settlements: ${settlements.length}

Generated: ${new Date().toISOString()}
`;

    fs.writeFileSync(readmePath, readme, "utf8");
    console.log(`📖 README created: ${readmePath}`);

    console.log(`\n🎉 Successfully created ${councilsMap.size} council folders with CSV files in the 'councils-with-folders' directory!`);

  } catch (error) {
    console.error("❌ Error creating council folders:", error);
  }
}

createCouncilFolders();










