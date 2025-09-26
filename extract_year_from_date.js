const fs = require("fs");
const path = require("path");

class DateYearExtractor {
  constructor() {
    this.processedFiles = 0;
    this.totalFilesModified = 0;
  }

  // Extract year from date string
  extractYear(dateString) {
    if (!dateString || dateString.trim() === "") return "";

    const cleanDate = dateString.trim().replace(/"/g, "");

    // Handle different date formats
    // Format: "2024" or "2023" etc.
    if (/^\d{4}$/.test(cleanDate)) {
      return cleanDate;
    }

    // Format: "15/03/2009" or "01/02/2008"
    const dateMatch = cleanDate.match(/(\d{4})/);
    if (dateMatch) {
      return dateMatch[1];
    }

    // Format: "2024-01-15" or "2023-12-31"
    const isoMatch = cleanDate.match(/(\d{4})-\d{2}-\d{2}/);
    if (isoMatch) {
      return isoMatch[1];
    }

    // If no year found, return original
    return cleanDate;
  }

  // Process a single clean deals CSV file
  processCleanFile(filePath) {
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

      // Find date column index
      const columns = header.split(",");
      const dateIndex = columns.findIndex(
        (col) =>
          col.includes("תאריך העסקה") ||
          col.includes("תאריך") ||
          col.includes("date")
      );

      if (dateIndex === -1) {
        console.log(`  ⚠️  Could not find date column in: ${filePath}`);
        return { modified: false };
      }

      let modifiedLines = [];
      let changesCount = 0;

      for (const line of dataLines) {
        const values = line.split(",");

        if (values[dateIndex]) {
          const originalDate = values[dateIndex];
          const yearOnly = this.extractYear(originalDate);

          if (originalDate !== yearOnly) {
            values[dateIndex] = yearOnly;
            changesCount++;
          }
        }

        modifiedLines.push(values.join(","));
      }

      if (changesCount > 0) {
        // Create new file with _year suffix
        const yearFilePath = filePath.replace(
          "_deals_clean.csv",
          "_deals_clean_year.csv"
        );
        const newContent = [header, ...modifiedLines].join("\n");
        fs.writeFileSync(yearFilePath, newContent, "utf8");

        console.log(`  ✅ Created year file: ${changesCount} dates modified`);
        console.log(`  📄 Year file saved as: ${yearFilePath}`);
        return { modified: true, changes: changesCount };
      } else {
        console.log(`  ℹ️  No date changes needed`);
        return { modified: false };
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
      return { modified: false };
    }
  }

  // Find all _deals_clean.csv files recursively
  findCleanFiles(dir) {
    const cleanFiles = [];

    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith("_deals_clean.csv")) {
          cleanFiles.push(fullPath);
        }
      }
    };

    scanDirectory(dir);
    return cleanFiles;
  }

  // Main processing
  async extractYearsFromAllFiles() {
    console.log("📅 Starting year extraction from clean files...\n");

    const cleanFiles = this.findCleanFiles("councils-with-folders");
    console.log(`📁 Found ${cleanFiles.length} clean files to process\n`);

    let totalChanges = 0;

    for (const filePath of cleanFiles) {
      const result = this.processCleanFile(filePath);

      this.processedFiles++;
      if (result.modified) {
        this.totalFilesModified++;
        totalChanges += result.changes || 0;
      }

      console.log(""); // Empty line for readability
    }

    // Summary
    console.log("🎉 Year extraction completed!");
    console.log("📊 Summary:");
    console.log(`  📁 Files processed: ${this.processedFiles}`);
    console.log(`  📝 Files with changes: ${this.totalFilesModified}`);
    console.log(`  📅 Total date changes: ${totalChanges}`);
    console.log(
      `  ✅ Files unchanged: ${this.processedFiles - this.totalFilesModified}`
    );
  }
}

// Run the extractor
const extractor = new DateYearExtractor();
extractor.extractYearsFromAllFiles().catch(console.error);







