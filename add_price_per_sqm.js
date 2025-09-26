const fs = require("fs");
const path = require("path");

class PricePerSqmCalculator {
  constructor() {
    this.processedFiles = 0;
    this.totalFilesModified = 0;
  }

  // Calculate price per square meter
  calculatePricePerSqm(price, area) {
    if (!price || !area) return "";

    // Clean price - remove quotes, currency symbols and commas
    const cleanPrice = price.toString().replace(/["₪$,\s]/g, "");
    const priceNum = parseFloat(cleanPrice);

    // Clean area - remove commas and spaces
    const cleanArea = area.toString().replace(/[,\s]/g, "");
    const areaNum = parseFloat(cleanArea);

    // Check if both are valid numbers and greater than 0
    if (isNaN(priceNum) || isNaN(areaNum) || priceNum <= 0 || areaNum <= 0) {
      return "";
    }

    // Calculate price per square meter
    const pricePerSqm = Math.round(priceNum / areaNum);
    return pricePerSqm.toString();
  }

  // Process a single year deals CSV file
  processYearFile(filePath) {
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
      const columns = header.split(",");
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

      // Add new column to header
      const newHeader = header + ",מחיר למטר מרובע";

      let modifiedLines = [];
      let calculationsCount = 0;

      for (const line of dataLines) {
        const values = line.split(",");

        const price = values[priceIndex];
        const area = values[areaIndex];

        const pricePerSqm = this.calculatePricePerSqm(price, area);

        if (pricePerSqm) {
          calculationsCount++;
        }

        // Add the new column value
        values.push(pricePerSqm);
        modifiedLines.push(values.join(","));
      }

      if (calculationsCount > 0) {
        // Create new file with _price_per_sqm suffix
        const pricePerSqmFilePath = filePath.replace(
          "_deals_clean_year.csv",
          "_deals_clean_year_price_per_sqm.csv"
        );
        const newContent = [newHeader, ...modifiedLines].join("\n");
        fs.writeFileSync(pricePerSqmFilePath, newContent, "utf8");

        console.log(
          `  ✅ Created price per sqm file: ${calculationsCount} calculations made`
        );
        console.log(`  📄 Price per sqm file saved as: ${pricePerSqmFilePath}`);
        return { modified: true, calculations: calculationsCount };
      } else {
        console.log(`  ℹ️  No valid price/area data found for calculations`);
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
  async addPricePerSqmToAllFiles() {
    console.log("💰 Starting price per square meter calculation...\n");

    const yearFiles = this.findYearFiles("councils-with-folders");
    console.log(`📁 Found ${yearFiles.length} year files to process\n`);

    let totalCalculations = 0;

    for (const filePath of yearFiles) {
      const result = this.processYearFile(filePath);

      this.processedFiles++;
      if (result.modified) {
        this.totalFilesModified++;
        totalCalculations += result.calculations || 0;
      }

      console.log(""); // Empty line for readability
    }

    // Summary
    console.log("🎉 Price per square meter calculation completed!");
    console.log("📊 Summary:");
    console.log(`  📁 Files processed: ${this.processedFiles}`);
    console.log(`  📝 Files with calculations: ${this.totalFilesModified}`);
    console.log(`  💰 Total calculations made: ${totalCalculations}`);
    console.log(
      `  ✅ Files unchanged: ${this.processedFiles - this.totalFilesModified}`
    );
  }
}

// Run the calculator
const calculator = new PricePerSqmCalculator();
calculator.addPricePerSqmToAllFiles().catch(console.error);
