const fs = require("fs");
const path = require("path");

class DealCleaner {
  constructor() {
    this.processedFiles = 0;
    this.totalRowsRemoved = 0;
    this.filesWithChanges = 0;
  }

  // Check if a deal row has complete information
  isCompleteDeal(row) {
    const columns = row.split(",");

    // Expected columns: serialNumber, address, area, date, price, gush, propertyType, rooms, floor
    if (columns.length < 5) return false;

    const address = columns[1]?.trim().replace(/"/g, "");
    const area = columns[2]?.trim().replace(/"/g, "");
    const date = columns[3]?.trim().replace(/"/g, "");
    const price = columns[4]?.trim().replace(/"/g, "");

    // Check if essential fields are missing, empty, or contain "לא ידוע"
    if (!area || area === "" || area === "N/A" || area === "לא ידוע")
      return false;
    if (!date || date === "" || date === "N/A" || date === "לא ידוע")
      return false;
    if (!price || price === "" || price === "N/A" || price === "לא ידוע")
      return false;

    // Check if area is a valid number
    const cleanArea = area.replace(/[,\s]/g, "");
    if (isNaN(parseFloat(cleanArea)) || parseFloat(cleanArea) <= 0)
      return false;

    // Check if price is a valid number (after removing currency symbols)
    const cleanPrice = price.replace(/[₪$,\s]/g, "");
    if (!cleanPrice || isNaN(parseInt(cleanPrice)) || parseInt(cleanPrice) <= 0)
      return false;

    return true;
  }

  // Clean a single deals CSV file
  cleanDealsFile(filePath) {
    try {
      console.log(`🔍 Processing: ${filePath}`);

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      if (lines.length <= 1) {
        console.log(`  ⚠️  File is empty or has only header`);
        return { removed: 0, kept: 0 };
      }

      const header = lines[0];
      const dataLines = lines.slice(1).filter((line) => line.trim());

      let keptLines = [];
      let removedCount = 0;

      for (const line of dataLines) {
        if (this.isCompleteDeal(line)) {
          keptLines.push(line);
        } else {
          removedCount++;
          console.log(
            `  🗑️  Removing incomplete deal: ${line.substring(0, 100)}...`
          );
        }
      }

      // Write cleaned content back to file
      const cleanedContent = [header, ...keptLines].join("\n");
      fs.writeFileSync(filePath, cleanedContent, "utf8");

      console.log(
        `  ✅ Cleaned: ${removedCount} removed, ${keptLines.length} kept`
      );

      return { removed: removedCount, kept: keptLines.length };
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
      return { removed: 0, kept: 0 };
    }
  }

  // Find all _deals.csv files recursively
  findDealsFiles(dir) {
    const dealsFiles = [];

    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith("_deals.csv")) {
          dealsFiles.push(fullPath);
        }
      }
    };

    scanDirectory(dir);
    return dealsFiles;
  }

  // Main cleaning process
  async cleanAllDeals() {
    console.log("🧹 Starting deal cleaning process...\n");

    const dealsFiles = this.findDealsFiles("councils-with-folders");
    console.log(`📁 Found ${dealsFiles.length} deals files to process\n`);

    for (const filePath of dealsFiles) {
      const result = this.cleanDealsFile(filePath);

      this.processedFiles++;
      this.totalRowsRemoved += result.removed;

      if (result.removed > 0) {
        this.filesWithChanges++;
      }

      console.log(""); // Empty line for readability
    }

    // Summary
    console.log("🎉 Deal cleaning completed!");
    console.log("📊 Summary:");
    console.log(`  📁 Files processed: ${this.processedFiles}`);
    console.log(`  🗑️  Total rows removed: ${this.totalRowsRemoved}`);
    console.log(`  📝 Files with changes: ${this.filesWithChanges}`);
    console.log(
      `  ✅ Files unchanged: ${this.processedFiles - this.filesWithChanges}`
    );
  }
}

// Run the cleaner
const cleaner = new DealCleaner();
cleaner.cleanAllDeals().catch(console.error);
