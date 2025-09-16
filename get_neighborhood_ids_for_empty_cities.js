const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

/**
 * Script to get neighborhood IDs for cities without CSV files
 * Uses the same API method as extract_neighborhoods.js
 */

class NeighborhoodIdExtractor {
  constructor() {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Referer: "https://www.nadlan.gov.il/",
      Origin: "https://www.nadlan.gov.il",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
    };

    this.results = [];
    this.errors = [];
  }

  /**
   * Load empty cities from analysis
   */
  loadEmptyCities() {
    try {
      const data = fs.readFileSync("empty_cities_analysis.json", "utf8");
      const analysis = JSON.parse(data);
      return analysis.citiesWithoutData;
    } catch (error) {
      console.error("❌ Error loading empty cities:", error.message);
      return [];
    }
  }

  /**
   * Load city IDs from all_city.csv
   */
  loadCityIds() {
    try {
      const csvContent = fs.readFileSync("all_city.csv", "utf8");
      const lines = csvContent.split("\n");
      const cityIds = {};

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          // Parse CSV line - format: "ID","Name (Hebrew)","Name (English)","Nadlan URL"
          const parts = line.split('","');
          if (parts.length >= 2) {
            const id = parts[0].replace(/"/g, "");
            const name = parts[1].replace(/"/g, "");
            cityIds[name] = id;
          }
        }
      }

      console.log(
        `📋 Loaded ${Object.keys(cityIds).length} city IDs from all_city.csv`
      );
      return cityIds;
    } catch (error) {
      console.error("❌ Error loading city IDs:", error.message);
      return {};
    }
  }

  /**
   * Make HTTPS request to get neighborhood data
   */
  async fetchNeighborhoodData(cityId) {
    return new Promise((resolve, reject) => {
      const url = `https://d30nq1hiio0r3z.cloudfront.net/api/pages/settlement/buy/${cityId}.json`;

      https
        .get(url, this.headers, (res) => {
          let data = "";

          // Handle gzip compression
          let stream = res;
          if (res.headers["content-encoding"] === "gzip") {
            stream = res.pipe(zlib.createGunzip());
          } else if (res.headers["content-encoding"] === "deflate") {
            stream = res.pipe(zlib.createInflate());
          } else if (res.headers["content-encoding"] === "br") {
            stream = res.pipe(zlib.createBrotliDecompress());
          }

          stream.on("data", (chunk) => {
            data += chunk;
          });

          stream.on("end", () => {
            try {
              // Clean the data
              let cleanData = data.trim();
              if (cleanData.charCodeAt(0) === 0xfeff) {
                cleanData = cleanData.slice(1);
              }

              // Check if response is HTML (error page)
              if (
                cleanData.startsWith("<!DOCTYPE") ||
                cleanData.startsWith("<html")
              ) {
                reject(
                  new Error(`Server returned HTML instead of JSON for ${url}`)
                );
                return;
              }

              const jsonData = JSON.parse(cleanData);
              resolve(jsonData);
            } catch (error) {
              reject(new Error(`Failed to parse JSON: ${error.message}`));
            }
          });
        })
        .on("error", (error) => {
          reject(new Error(`Network error: ${error.message}`));
        });
    });
  }

  /**
   * Process a single city
   */
  async processCity(cityName, cityId) {
    console.log(`\n🏙️ Processing: ${cityName} (ID: ${cityId})`);

    try {
      const data = await this.fetchNeighborhoodData(cityId);

      // Extract neighborhoods and streets
      const neighborhoods = data.otherNeighborhoods || [];
      const streets = data.otherSettlmentStreets || [];

      console.log(
        `  📊 Found ${neighborhoods.length} neighborhoods and ${streets.length} streets`
      );

      if (neighborhoods.length > 0) {
        // Create areas CSV content
        const csvHeader = "Area Name,Area ID,Type\n";
        const csvRows = [
          ...neighborhoods.map((n) => `"${n.title}","${n.id}","Neighborhood"`),
          ...streets.map((s) => `"${s.title}","${s.id}","Street"`),
        ].join("\n");

        const csvContent = csvHeader + csvRows;

        // Create folder and save CSV
        const folderPath = path.join("councils-with-folders", cityName);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const csvFilePath = path.join(folderPath, `${cityName}_areas.csv`);
        fs.writeFileSync(csvFilePath, csvContent, "utf8");

        console.log(`  💾 Saved to: ${csvFilePath}`);

        this.results.push({
          city: cityName,
          cityId: cityId,
          neighborhoods: neighborhoods.length,
          streets: streets.length,
          status: "success",
        });
      } else {
        console.log(`  ⚠️ No neighborhoods found for ${cityName}`);
        this.errors.push({
          city: cityName,
          cityId: cityId,
          error: "No neighborhoods found",
          status: "error",
        });
      }

      // Add delay to be respectful
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`  ❌ Error processing ${cityName}: ${error.message}`);
      this.errors.push({
        city: cityName,
        cityId: cityId,
        error: error.message,
        status: "error",
      });
    }
  }

  /**
   * Process all empty cities
   */
  async processAllCities() {
    console.log("🏠 Neighborhood ID Extractor for Empty Cities");
    console.log("==============================================\n");

    const emptyCities = this.loadEmptyCities();
    const cityIds = this.loadCityIds();

    if (emptyCities.length === 0) {
      console.log("❌ No empty cities found. Run find_empty_cities.js first.");
      return;
    }

    console.log(`📋 Found ${emptyCities.length} empty cities to process`);

    // Filter cities that have IDs in all_city.csv
    const citiesWithIds = emptyCities.filter((city) => cityIds[city]);
    const citiesWithoutIds = emptyCities.filter((city) => !cityIds[city]);

    console.log(
      `✅ Found ${citiesWithIds.length} cities with IDs in all_city.csv`
    );
    console.log(`❌ Found ${citiesWithoutIds.length} cities without IDs`);

    if (citiesWithoutIds.length > 0) {
      console.log("\n⚠️ Cities without IDs:");
      citiesWithoutIds.forEach((city, index) => {
        console.log(`  ${index + 1}. ${city}`);
      });
    }

    // Process cities with IDs
    for (const city of citiesWithIds) {
      const cityId = cityIds[city];
      await this.processCity(city, cityId);
    }

    this.displaySummary();
  }

  /**
   * Display processing summary
   */
  displaySummary() {
    console.log("\n📊 PROCESSING SUMMARY");
    console.log("=====================");
    console.log(`✅ Successful: ${this.results.length}`);
    console.log(`❌ Failed: ${this.errors.length}`);

    if (this.results.length > 0) {
      console.log("\n✅ Successful cities:");
      this.results.forEach((result, index) => {
        console.log(
          `  ${index + 1}. ${result.city} (${
            result.neighborhoods
          } neighborhoods)`
        );
      });
    }

    if (this.errors.length > 0) {
      console.log("\n❌ Failed cities:");
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.city}: ${error.error}`);
      });
    }

    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalCities: this.results.length + this.errors.length,
      successful: this.results.length,
      failed: this.errors.length,
      results: this.results,
      errors: this.errors,
    };

    fs.writeFileSync(
      "neighborhood_extraction_summary.json",
      JSON.stringify(summary, null, 2)
    );
    console.log("\n💾 Summary saved to: neighborhood_extraction_summary.json");
  }
}

// Run the script
if (require.main === module) {
  const extractor = new NeighborhoodIdExtractor();
  extractor.processAllCities().catch(console.error);
}

module.exports = NeighborhoodIdExtractor;


