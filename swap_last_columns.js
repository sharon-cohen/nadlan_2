const fs = require("fs").promises;
const path = require("path");
const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");

const BASE_DIR = path.join(__dirname, "councils-with-folders");

async function swapLastColumnsInFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const records = await new Promise((resolve, reject) => {
      parse(
        fileContent,
        {
          columns: true,
          skip_empty_lines: true,
        },
        (err, output) => {
          if (err) reject(err);
          else resolve(output);
        }
      );
    });

    if (records.length === 0) {
      return { processed: false, reason: "No data" };
    }

    const originalHeader = Object.keys(records[0]);

    // Check if both "חדרים" and "מחיר למר" columns exist
    const roomsIndex = originalHeader.indexOf("חדרים");
    const pricePerSqmIndex = originalHeader.indexOf("מחיר למר");

    if (roomsIndex === -1 || pricePerSqmIndex === -1) {
      return { processed: false, reason: "Missing required columns" };
    }

    // Create new header by swapping the last two columns
    const newHeader = [...originalHeader];
    newHeader[roomsIndex] = "מחיר למר";
    newHeader[pricePerSqmIndex] = "חדרים";

    // Update records with swapped column values
    const updatedRecords = records.map((record) => {
      const newRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (key === "חדרים") {
          newRecord["מחיר למר"] = value;
        } else if (key === "מחיר למר") {
          newRecord["חדרים"] = value;
        } else {
          newRecord[key] = value;
        }
      }
      return newRecord;
    });

    // Write the updated data back to the file
    const csvString = await new Promise((resolve, reject) => {
      stringify(
        updatedRecords,
        { header: true, columns: newHeader },
        (err, output) => {
          if (err) reject(err);
          else resolve(output);
        }
      );
    });

    await fs.writeFile(filePath, csvString, "utf8");
    return { processed: true, recordCount: records.length };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { processed: false, reason: error.message };
  }
}

async function findAndProcessDealsFiles(dirPath) {
  let totalFiles = 0;
  let processedFiles = 0;
  let totalRecords = 0;
  const results = [];

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Recursively process subdirectories
        const subResults = await findAndProcessDealsFiles(itemPath);
        totalFiles += subResults.totalFiles;
        processedFiles += subResults.processedFiles;
        totalRecords += subResults.totalRecords;
        results.push(...subResults.results);
      } else if (
        item.isFile() &&
        (item.name.endsWith("_deals_clean_year_no_quotes.csv") ||
          item.name.endsWith("_city_deals_clean_year_no_quotes.csv"))
      ) {
        totalFiles++;
        console.log(`Processing: ${path.relative(process.cwd(), itemPath)}`);

        const result = await swapLastColumnsInFile(itemPath);

        if (result.processed) {
          processedFiles++;
          totalRecords += result.recordCount;
          console.log(
            `  ✓ Swapped last two columns (${result.recordCount} records)`
          );
        } else {
          console.log(`  ⚠ Skipped: ${result.reason}`);
        }

        results.push({
          file: path.relative(process.cwd(), itemPath),
          processed: result.processed,
          recordCount: result.recordCount || 0,
          reason: result.reason || null,
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }

  return {
    totalFiles,
    processedFiles,
    totalRecords,
    results,
  };
}

async function swapLastColumns() {
  console.log(
    "Swapping last two columns in all deals_clean_year_no_quotes.csv and city_deals_clean_year_no_quotes.csv files...\n"
  );
  console.log("Swapping: חדרים ↔ מחיר למר\n");

  if (
    !(await fs
      .access(BASE_DIR)
      .then(() => true)
      .catch(() => false))
  ) {
    console.error(`Directory not found: ${BASE_DIR}`);
    return;
  }

  const results = await findAndProcessDealsFiles(BASE_DIR);

  console.log("\n" + "=".repeat(80));
  console.log("COLUMN SWAP SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total deals files found: ${results.totalFiles}`);
  console.log(`Files with columns swapped: ${results.processedFiles}`);
  console.log(`Total records updated: ${results.totalRecords}`);
  console.log("=".repeat(80));

  if (results.processedFiles > 0) {
    console.log("\nColumns swapped:");
    console.log("- חדרים ↔ מחיר למר");
  }

  // Save detailed results to file
  const summaryData = {
    timestamp: new Date().toISOString(),
    totalFiles: results.totalFiles,
    processedFiles: results.processedFiles,
    totalRecords: results.totalRecords,
    columnSwap: "חדרים ↔ מחיר למר",
    results: results.results.filter((r) => r.processed),
  };

  await fs.writeFile(
    path.join(__dirname, "swap_last_columns_summary.json"),
    JSON.stringify(summaryData, null, 2),
    "utf8"
  );

  console.log(`\nDetailed results saved to: swap_last_columns_summary.json`);
}

swapLastColumns();
