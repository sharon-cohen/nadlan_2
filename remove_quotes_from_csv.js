const fs = require("fs");
const path = require("path");

class QuoteRemover {
  constructor() {
    this.processedFiles = 0;
    this.totalFilesModified = 0;
  }

  // Parse CSV line properly handling quoted values
  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes) {
          // We're inside quotes, check if this is an escaped quote
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // Skip the next quote
          } else {
            // This is the closing quote
            inQuotes = false;
          }
        } else {
          // This is the opening quote
          inQuotes = true;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // Remove quotes from specific columns
  removeQuotesFromLine(line, priceIndex, areaIndex) {
    const values = this.parseCSVLine(line);

    // Remove quotes from price and area columns
    if (priceIndex !== -1 && values[priceIndex]) {
      values[priceIndex] = values[priceIndex].replace(/^"|"$/g, "");
    }
    if (areaIndex !== -1 && values[areaIndex]) {
      values[areaIndex] = values[areaIndex].replace(/^"|"$/g, "");
    }

    return values.join(",");
  }

  // Process a single CSV file
  processFile(filePath) {
    try {
      console.log(`🔍 Processing: ${filePath}`);

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      if (lines.length <= 1) {
        console.log(`  ⚠️  File is empty or has only header`);
        return { modified: false };
      }

      const header = lines[0];
      const dataLines = lines.slice(1).filter((line) => line.trim());

      // Find column indices
      const columns = this.parseCSVLine(header);
      const priceIndex = columns.findIndex(
        (col) =>
          col.includes("מחיר העסקה") ||
          col.includes("מחיר") ||
          col.includes("price")
      );

      const areaIndex = columns.findIndex(
        (col) =>
          col.includes("שטח במר") || col.includes("שטח") || col.includes("area")
      );

      if (priceIndex === -1 || areaIndex === -1) {
        console.log(
          `  ⚠️  Could not find price or area column in: ${filePath}`
        );
        return { modified: false };
      }

      let modifiedLines = [];
      let modificationsCount = 0;

      // Process header (no changes needed)
      modifiedLines.push(header);

      // Process data lines
      for (const line of dataLines) {
        const originalLine = line;
        const modifiedLine = this.removeQuotesFromLine(
          line,
          priceIndex,
          areaIndex
        );

        if (originalLine !== modifiedLine) {
          modificationsCount++;
        }

        modifiedLines.push(modifiedLine);
      }

      if (modificationsCount > 0) {
        // Create new file with _no_quotes suffix
        const noQuotesFilePath = filePath.replace(
          "_deals_clean_year.csv",
          "_deals_clean_year_no_quotes.csv"
        );
        const newContent = modifiedLines.join("\n");
        fs.writeFileSync(noQuotesFilePath, newContent, "utf8");

        console.log(
          `  ✅ Created no-quotes file: ${modificationsCount} modifications made`
        );
        console.log(`  📄 No-quotes file saved as: ${noQuotesFilePath}`);
        return { modified: true, modifications: modificationsCount };
      } else {
        console.log(`  ℹ️  No quotes found to remove`);
        return { modified: false };
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
      return { modified: false };
    }
  }

  // Find all _deals_clean_year.csv files recursively
  findYearFiles(dir) {
    const yearFiles = [];

    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith("_deals_clean_year.csv")) {
          yearFiles.push(fullPath);
        }
      }
    };

    scanDirectory(dir);
    return yearFiles;
  }

  // Main processing
  async removeQuotesFromAllFiles() {
    console.log("🗑️  Starting quote removal from price and area columns...\n");

    const yearFiles = this.findYearFiles("councils-with-folders");
    console.log(`📁 Found ${yearFiles.length} year files to process\n`);

    let totalModifications = 0;

    for (const filePath of yearFiles) {
      const result = this.processFile(filePath);

      this.processedFiles++;
      if (result.modified) {
        this.totalFilesModified++;
        totalModifications += result.modifications || 0;
      }

      console.log(""); // Empty line for readability
    }

    // Summary
    console.log("🎉 Quote removal completed!");
    console.log("📊 Summary:");
    console.log(`  📁 Files processed: ${this.processedFiles}`);
    console.log(`  📝 Files with modifications: ${this.totalFilesModified}`);
    console.log(`  🗑️  Total modifications made: ${totalModifications}`);
    console.log(
      `  ✅ Files unchanged: ${this.processedFiles - this.totalFilesModified}`
    );
  }
}

// Run the quote remover
const remover = new QuoteRemover();
remover.removeQuotesFromAllFiles().catch(console.error);
