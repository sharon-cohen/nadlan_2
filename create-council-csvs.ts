#!/usr/bin/env node

import * as fs from "fs-extra";
import * as path from "path";

interface Settlement {
  id: string;
  nameHebrew: string;
  nameEnglish: string;
  regionalCouncil: string;
  nadlanUrl: string;
}

async function createCouncilCSVs() {
  try {
    // Read the simple CSV file
    const csvPath = "settlements-simple-2025-09-03T11-56-13-750Z.csv";

    if (!(await fs.pathExists(csvPath))) {
      console.error("❌ CSV file not found. Please make sure the file exists.");
      return;
    }

    console.log(`📖 Reading data from: ${csvPath}`);

    const csvContent = await fs.readFile(csvPath, "utf8");
    const lines = csvContent.split("\n").filter((line) => line.trim());

    // Parse CSV (skip header)
    const settlements: Settlement[] = [];
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
    const councilsMap = new Map<string, Settlement[]>();

    settlements.forEach((settlement) => {
      const council = settlement.regionalCouncil;
      if (!councilsMap.has(council)) {
        councilsMap.set(council, []);
      }
      councilsMap.get(council)!.push(settlement);
    });

    // Create output directory
    const outputDir = "./councils";
    await fs.ensureDir(outputDir);

    console.log(`\n🏛️  Creating CSV files for ${councilsMap.size} councils...`);

    // Create CSV file for each council
    for (const [councilName, councilSettlements] of councilsMap) {
      // Clean council name for filename
      const cleanCouncilName = councilName
        .replace(/[<>:"/\\|?*]/g, "_") // Remove invalid filename characters
        .replace(/\s+/g, "_"); // Replace spaces with underscores

      const filename = `${cleanCouncilName}.csv`;
      const filePath = path.join(outputDir, filename);

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

      await fs.writeFile(filePath, csvContent, "utf8");

      console.log(
        `✅ ${councilName}: ${councilSettlements.length} settlements → ${filename}`
      );
    }

    // Create summary file
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

    await fs.writeFile(summaryPath, summary, "utf8");
    console.log(`\n📋 Summary created: ${summaryPath}`);

    console.log(
      `\n🎉 Successfully created ${councilsMap.size} council CSV files in the 'councils' directory!`
    );
  } catch (error) {
    console.error("❌ Error creating council CSVs:", error);
  }
}

createCouncilCSVs();


















