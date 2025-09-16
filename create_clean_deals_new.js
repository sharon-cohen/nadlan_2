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
      cleanFilesCreated: 0,
    };
  }

  // Check if a deal row has valid essential data
  isValidDeal(row) {
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

      // Filter out invalid deals
      const validDeals = dataRows.filter((row) => this.isValidDeal(row));
      const removedCount = dataRows.length - validDeals.length;

      this.stats.totalRowsAfter += validDeals.length;
      this.stats.removedRows += removedCount;

      if (removedCount > 0) {
        this.stats.filesWithChanges++;
        console.log(
          `  ✅ Removed ${removedCount} invalid deals (${dataRows.length} → ${validDeals.length})`
        );

        // Create new clean file with "_clean" suffix
        const cleanFileName = filePath.replace(
          "_deals.csv",
          "_deals_clean.csv"
        );
        const cleanContent = [header, ...validDeals].join("\n");
        fs.writeFileSync(cleanFileName, cleanContent, "utf8");
        this.stats.cleanFilesCreated++;
        console.log(`  💾 Created clean file: ${path.basename(cleanFileName)}`);
      } else {
        console.log(`  ✅ All deals valid (${dataRows.length} deals)`);

        // Still create a clean file even if no changes needed
        const cleanFileName = filePath.replace(
          "_deals.csv",
          "_deals_clean.csv"
        );
        const cleanContent = [header, ...validDeals].join("\n");
        fs.writeFileSync(cleanFileName, cleanContent, "utf8");
        this.stats.cleanFilesCreated++;
        console.log(`  💾 Created clean file: ${path.basename(cleanFileName)}`);
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
          // Skip already created clean files
          if (!item.includes("_clean")) {
            files.push(fullPath);
          }
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
    console.log(`💾 Clean files created: ${this.stats.cleanFilesCreated}`);
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
    console.log(
      "📝 Note: Original files preserved, clean files created with '_clean' suffix"
    );
  }
}

// Run the processor
async function main() {
  const processor = new CleanDealsProcessor();
  await processor.processAllDeals();
}

main().catch(console.error);
