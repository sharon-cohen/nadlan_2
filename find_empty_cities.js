const fs = require("fs");
const path = require("path");

/**
 * Script to find all cities in councils-with-folders that have no CSV files
 * and scrape deals data for them using the Nadlan API
 */

class EmptyCitiesFinder {
  constructor() {
    this.councilsPath = "./councils-with-folders";
    this.emptyCities = [];
    this.citiesWithData = [];
  }

  /**
   * Check if a directory has any CSV files
   */
  hasCsvFiles(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      return items.some((item) => {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Check subdirectories recursively
          return this.hasCsvFiles(itemPath);
        } else {
          // Check if it's a CSV file
          return item.endsWith(".csv");
        }
      });
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error.message);
      return false;
    }
  }

  /**
   * Scan all cities and categorize them
   */
  scanCities() {
    console.log("🔍 Scanning cities in councils-with-folders...");

    try {
      const cities = fs.readdirSync(this.councilsPath);

      for (const city of cities) {
        if (city === "README.md") continue;

        const cityPath = path.join(this.councilsPath, city);
        const stat = fs.statSync(cityPath);

        if (stat.isDirectory()) {
          const hasCsv = this.hasCsvFiles(cityPath);

          if (hasCsv) {
            this.citiesWithData.push(city);
          } else {
            this.emptyCities.push(city);
          }
        }
      }

      console.log(
        `✅ Found ${this.citiesWithData.length} cities with CSV data`
      );
      console.log(
        `📭 Found ${this.emptyCities.length} cities without CSV data`
      );
    } catch (error) {
      console.error("❌ Error scanning cities:", error.message);
    }
  }

  /**
   * Display results
   */
  displayResults() {
    console.log("\n📊 RESULTS:");
    console.log("=".repeat(50));

    console.log("\n🏙️ Cities WITH CSV data:");
    this.citiesWithData.forEach((city, index) => {
      console.log(`  ${index + 1}. ${city}`);
    });

    console.log("\n📭 Cities WITHOUT CSV data (need scraping):");
    this.emptyCities.forEach((city, index) => {
      console.log(`  ${index + 1}. ${city}`);
    });

    console.log("\n📈 Summary:");
    console.log(
      `  Total cities: ${this.citiesWithData.length + this.emptyCities.length}`
    );
    console.log(`  Cities with data: ${this.citiesWithData.length}`);
    console.log(`  Cities without data: ${this.emptyCities.length}`);
  }

  /**
   * Save results to JSON file
   */
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      totalCities: this.citiesWithData.length + this.emptyCities.length,
      citiesWithData: this.citiesWithData,
      citiesWithoutData: this.emptyCities,
      summary: {
        withData: this.citiesWithData.length,
        withoutData: this.emptyCities.length,
      },
    };

    fs.writeFileSync(
      "empty_cities_analysis.json",
      JSON.stringify(results, null, 2)
    );
    console.log("\n💾 Results saved to: empty_cities_analysis.json");
  }

  /**
   * Main execution
   */
  run() {
    console.log("🏠 Empty Cities Finder");
    console.log("=====================\n");

    this.scanCities();
    this.displayResults();
    this.saveResults();

    return {
      emptyCities: this.emptyCities,
      citiesWithData: this.citiesWithData,
    };
  }
}

// Run the script
if (require.main === module) {
  const finder = new EmptyCitiesFinder();
  const results = finder.run();

  console.log("\n🎯 Next steps:");
  console.log("1. Use the empty cities list to scrape deals data");
  console.log("2. Get neighborhood IDs for each empty city");
  console.log("3. Use the working API method to get deals data");
  console.log("4. Save JSON files for each city");
}

module.exports = EmptyCitiesFinder;


