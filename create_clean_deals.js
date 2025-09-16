const fs = require("fs");
const path = require("path");

class CleanDealsProcessor {
  constructor() {
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      totalRowsBefore: 0,
      totalRowsAfter: 0,
      removedRows: 0,
      filesWithChanges: 0,
    };
  }

  // Check if a deal row has complete essential data
  isCompleteDeal(row) {
    const columns = row.split(",");
    if (columns.length < 5) return false; // Ensure minimum columns for essential data

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

  // Process a single CSV file
  processFile(filePath) {
    try {
      console.log(`📄 Processing: ${path.basename(filePath)}`);

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n").filter((line) => line.trim());

      if (lines.length === 0) {
        console.log(`  ⚠️  Empty file, skipping`);
        return;
      }

      const header = lines[0];
      const dataRows = lines.slice(1);

      this.stats.totalFiles++;
      this.stats.totalRowsBefore += dataRows.length;

      // Filter out incomplete deals
      const completeDeals = dataRows.filter((row) => this.isCompleteDeal(row));
      const removedCount = dataRows.length - completeDeals.length;

      this.stats.totalRowsAfter += completeDeals.length;
      this.stats.removedRows += removedCount;

      if (removedCount > 0) {
        this.stats.filesWithChanges++;
        console.log(
          `  ✅ Removed ${removedCount} incomplete deals (${dataRows.length} → ${completeDeals.length})`
        );

        // Create new clean file
        const cleanContent = [header, ...completeDeals].join("\n");
        fs.writeFileSync(filePath, cleanContent, "utf8");
      } else {
        console.log(`  ✅ All deals complete (${dataRows.length} deals)`);
      }

      this.stats.processedFiles++;
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Find all _deals.csv files
  findDealsFiles(dir) {
    const files = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Recursively search subdirectories
          files.push(...this.findDealsFiles(fullPath));
        } else if (
          item.endsWith("_deals.csv") ||
          item.endsWith("_city_deals.csv")
        ) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }

    return files;
  }

  // Main processing function
  async processAllDeals() {
    console.log("🧹 Starting clean deals processing...\n");

    const councilsDir = path.join(__dirname, "councils-with-folders");

    if (!fs.existsSync(councilsDir)) {
      console.error("❌ councils-with-folders directory not found");
      return;
    }

    const dealsFiles = this.findDealsFiles(councilsDir);
    console.log(`📁 Found ${dealsFiles.length} deals files to process\n`);

    for (const filePath of dealsFiles) {
      this.processFile(filePath);
    }

    this.printSummary();
  }

  // Print processing summary
  printSummary() {
    console.log("\n📊 CLEAN DEALS PROCESSING SUMMARY");
    console.log("=====================================");
    console.log(
      `📁 Total files processed: ${this.stats.processedFiles}/${this.stats.totalFiles}`
    );
    console.log(`📄 Files with changes: ${this.stats.filesWithChanges}`);
    console.log(
      `📊 Total rows before: ${this.stats.totalRowsBefore.toLocaleString()}`
    );
    console.log(
      `📊 Total rows after: ${this.stats.totalRowsAfter.toLocaleString()}`
    );
    console.log(`🗑️  Rows removed: ${this.stats.removedRows.toLocaleString()}`);

    if (this.stats.totalRowsBefore > 0) {
      const percentageRemoved = (
        (this.stats.removedRows / this.stats.totalRowsBefore) *
        100
      ).toFixed(1);
      console.log(`📈 Percentage removed: ${percentageRemoved}%`);
    }

    console.log("\n✅ Clean deals processing completed!");
  }
}

// Run the processor
async function main() {
  const processor = new CleanDealsProcessor();
  await processor.processAllDeals();
}

main().catch(console.error);





