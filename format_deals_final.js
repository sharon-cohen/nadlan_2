const fs = require("fs");
const path = require("path");

class FinalDealsFormatter {
  constructor() {
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      totalRowsProcessed: 0,
      errors: 0,
    };
  }

  // Parse CSV line properly handling quotes
  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  // Detect if a row has correct structure
  isCorrectStructure(row) {
    const columns = this.parseCSVLine(row);

    if (columns.length < 5) return false;

    // Check if column 4 (date) looks like a date (DD/MM/YYYY)
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    const dateColumn = columns[3].replace(/"/g, "");

    return datePattern.test(dateColumn);
  }

  // Fix a single CSV row - handle both correct and incorrect structures
  formatRow(row) {
    const columns = this.parseCSVLine(row);

    if (columns.length < 5) {
      return row; // Skip rows with insufficient columns
    }

    // Check if structure is correct
    if (this.isCorrectStructure(row)) {
      // Structure is correct - format normally
      return this.formatCorrectStructure(columns);
    } else {
      // Structure is incorrect - try to fix it
      return this.formatIncorrectStructure(columns);
    }
  }

  // Format row with correct structure
  formatCorrectStructure(columns) {
    // Format price (column 4) - remove ₪ and commas
    if (columns[4]) {
      const originalPrice = columns[4];
      // Remove quotes, ₪ symbol, commas, and spaces
      const cleanPrice = originalPrice.replace(/["₪$,\s]/g, "");
      columns[4] = `"${cleanPrice}"`;
    }

    // Format date (column 3) - keep only year
    if (columns[3]) {
      const originalDate = columns[3];
      // Remove quotes first
      const dateWithoutQuotes = originalDate.replace(/"/g, "");

      // Extract year from date format DD/MM/YYYY
      const yearMatch = dateWithoutQuotes.match(/\d{4}$/);
      if (yearMatch) {
        columns[3] = `"${yearMatch[0]}"`;
      }
    }

    return columns.join(",");
  }

  // Format row with incorrect structure
  formatIncorrectStructure(columns) {
    // Try to identify the correct columns
    let priceColumn = -1;
    let dateColumn = -1;
    let addressColumn = -1;
    let areaColumn = -1;

    // Find price column (contains ₪)
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].includes("₪")) {
        priceColumn = i;
        break;
      }
    }

    // Find date column (DD/MM/YYYY format)
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i].replace(/"/g, "");
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(col)) {
        dateColumn = i;
        break;
      }
    }

    // If we found both price and date, format them
    if (priceColumn !== -1 && dateColumn !== -1) {
      // Format price
      const originalPrice = columns[priceColumn];
      const cleanPrice = originalPrice.replace(/["₪$,\s]/g, "");
      columns[priceColumn] = `"${cleanPrice}"`;

      // Format date
      const originalDate = columns[dateColumn];
      const dateWithoutQuotes = originalDate.replace(/"/g, "");
      const yearMatch = dateWithoutQuotes.match(/\d{4}$/);
      if (yearMatch) {
        columns[dateColumn] = `"${yearMatch[0]}"`;
      }
    }

    return columns.join(",");
  }

  // Process a single CSV file
  processFile(filePath) {
    try {
      console.log(`📄 Processing: ${path.basename(filePath)}`);

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length === 0) {
        console.log(`  ⚠️  Empty file, skipping`);
        return;
      }

      const header = lines[0];
      const dataRows = lines.slice(1);

      this.stats.totalFiles++;
      this.stats.totalRowsProcessed += dataRows.length;

      console.log(`  📊 Found ${dataRows.length} data rows`);

      // Format all data rows
      const formattedRows = [];
      let changesCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const originalRow = dataRows[i];
        const formattedRow = this.formatRow(originalRow);

        if (originalRow !== formattedRow) {
          changesCount++;
        }

        formattedRows.push(formattedRow);

        // Show progress every 100 rows
        if ((i + 1) % 100 === 0) {
          console.log(`  ⏳ Processed ${i + 1}/${dataRows.length} rows...`);
        }
      }

      // Create new formatted content
      const formattedContent = [header, ...formattedRows].join("\n");

      // Create new filename with _formatted suffix
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath, ".csv");
      const newFilePath = path.join(dir, `${basename}_formatted.csv`);

      // Write to new file
      fs.writeFileSync(newFilePath, formattedContent, "utf8");

      console.log(
        `  ✅ Created ${basename}_formatted.csv with ${changesCount} changes out of ${dataRows.length} total rows`
      );
      this.stats.processedFiles++;
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
      this.stats.errors++;
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
        } else if (item.endsWith("_deals.csv")) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }

    return files;
  }

  // Test on a single file first
  testSingleFile() {
    console.log("🧪 Testing on single file first...\n");

    const testFile =
      "councils-with-folders/אור עקיבא/אזור תעשיה הדרומי/אזור תעשיה הדרומי_deals.csv";

    if (fs.existsSync(testFile)) {
      console.log(`📄 Testing file: ${testFile}`);

      // Read first few lines to show before/after
      const content = fs.readFileSync(testFile, "utf8");
      const lines = content.split(/\r?\n/).filter((line) => line.trim());

      console.log("\n📋 BEFORE (first 3 data rows):");
      for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
        console.log(`  Row ${i}: ${lines[i]}`);
      }

      // Process the file
      this.processFile(testFile);

      // Read the new formatted file to show changes
      const formattedFile = testFile.replace(
        "_deals.csv",
        "_deals_formatted.csv"
      );
      if (fs.existsSync(formattedFile)) {
        const newContent = fs.readFileSync(formattedFile, "utf8");
        const newLines = newContent
          .split(/\r?\n/)
          .filter((line) => line.trim());

        console.log("\n📋 AFTER (first 3 data rows in formatted file):");
        for (let i = 1; i <= Math.min(3, newLines.length - 1); i++) {
          console.log(`  Row ${i}: ${newLines[i]}`);
        }
      }

      return true;
    } else {
      console.log(`❌ Test file not found: ${testFile}`);
      return false;
    }
  }

  // Main processing function
  async processAllDeals() {
    console.log("🔧 Starting final deals formatting (prices + dates)...\n");

    const councilsDir = path.join(__dirname, "councils-with-folders");

    if (!fs.existsSync(councilsDir)) {
      console.error("❌ councils-with-folders directory not found");
      return;
    }

    // Test on single file first
    const testSuccess = this.testSingleFile();

    if (!testSuccess) {
      console.log("❌ Test failed, stopping execution");
      return;
    }

    console.log("\n" + "=".repeat(50));
    console.log("🚀 Test successful! Proceeding with all files...\n");

    const dealsFiles = this.findDealsFiles(councilsDir);
    console.log(`📁 Found ${dealsFiles.length} deals files to format\n`);

    for (const filePath of dealsFiles) {
      this.processFile(filePath);
    }

    this.printSummary();
  }

  // Print processing summary
  printSummary() {
    console.log("\n📊 FINAL DEALS FORMATTING SUMMARY");
    console.log("==================================");
    console.log(
      `📁 Total files processed: ${this.stats.processedFiles}/${this.stats.totalFiles}`
    );
    console.log(
      `📊 Total rows processed: ${this.stats.totalRowsProcessed.toLocaleString()}`
    );
    console.log(`❌ Errors encountered: ${this.stats.errors}`);

    console.log("\n✅ Final deals formatting completed!");
    console.log("📝 Changes made:");
    console.log("   • Removed ₪ symbol from prices");
    console.log("   • Removed commas from prices");
    console.log("   • Kept only year from dates (DD/MM/YYYY → YYYY)");
    console.log("   • Handled both correct and incorrect CSV structures");
    console.log("   • Created new files with _formatted suffix");
  }
}

// Run the formatter
async function main() {
  const formatter = new FinalDealsFormatter();
  await formatter.processAllDeals();
}

main().catch(console.error);













