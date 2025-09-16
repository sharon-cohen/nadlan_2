const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

/**
 * Script to scrape deals data for neighborhoods that don't have CSV files
 * Goes through each city in councils-with-folders, reads the areas CSV,
 * and scrapes deals for neighborhoods without _deals.csv files
 */

class MissingNeighborhoodsScraper {
  constructor() {
    this.apiUrl =
      "https://x4006fhmy5.execute-api.il-central-1.amazonaws.com/api/deal";
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
    };

    // The working encrypted string from the example
    this.workingEncryptedString =
      "oQ5uOZlDM8AFFEYP6lO_HuxJKbjhYr1P0thDxjBevJp.0nIslmL292Zu4WYsRWYu5yd3dnI6IibpFWbvRmIsUDNwYDNycTN3EjOiAHelJCLiITZllTNhFTN0YDOh1COhVWOtIjZ1QTLxQ2Yi1yN5QWM4EGOiJiOi4WZr9GdiwiIwgzMMdjUNJnaRlEbydWL1o1Zt82Z5knc1I0d5JUZhlGWnFGeNNkd6hkbO5CMY5EMBpmTwkkeOFzYU1kNJN0Y0YVbJNXSDJGc1kGZ2RWbMVnRHJ2aG1mY1N2MkNjSp9Ua0cVYoFjMitmS5VmL5oUaOFTS6VVSKl2TpN2RihmS5VmI6IyazJCLi42dvR2XlRXYExWYlRmI6IiclRmcv9VZwlHdiwSM6IiclJWb152XoNGdlZmIsICZJR2bvhmcvJGanlWZuJiOiUWbh52XlNXYiJCLiQjNyATMyUjNiojIkl2XlNXYiJye.9JiN1IzUIJiOicGbhJye";

    this.results = [];
    this.errors = [];
    this.processedCities = 0;
    this.totalNeighborhoods = 0;
    this.missingNeighborhoods = 0;
  }

  /**
   * Check if a neighborhood folder has a _deals.csv file
   */
  hasDealsCsv(neighborhoodPath) {
    try {
      const files = fs.readdirSync(neighborhoodPath);
      return files.some((file) => file.endsWith("_deals.csv"));
    } catch (error) {
      return false;
    }
  }

  /**
   * Read areas CSV file and extract neighborhoods
   */
  readAreasCsv(cityPath, cityName) {
    try {
      const areasFile = path.join(cityPath, `${cityName}_areas.csv`);
      if (!fs.existsSync(areasFile)) {
        console.log(`  ⚠️ No areas file found: ${areasFile}`);
        return [];
      }

      const csvContent = fs.readFileSync(areasFile, "utf8");
      const lines = csvContent.split("\n").filter((line) => line.trim());
      const neighborhoods = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const parts = line.split('","');
          if (parts.length >= 3) {
            const name = parts[0].replace(/"/g, "");
            const id = parts[1].replace(/"/g, "");
            const type = parts[2].replace(/"/g, "");

            if (type === "Neighborhood") {
              neighborhoods.push({ name, id });
            }
          }
        }
      }

      return neighborhoods;
    } catch (error) {
      console.log(`  ❌ Error reading areas CSV: ${error.message}`);
      return [];
    }
  }

  /**
   * Make API request using the working method
   */
  async makeApiRequest(neighborhoodName, neighborhoodId, cityName) {
    return new Promise((resolve, reject) => {
      console.log(
        `    🌐 Making API request for: ${neighborhoodName} (ID: ${neighborhoodId})`
      );

      // For now, we'll use the working encrypted string
      // TODO: Generate encrypted strings for different neighborhood IDs
      const requestBody = JSON.stringify({
        fetch_number: 1,
        "##": this.workingEncryptedString,
      });

      const url = new URL(this.apiUrl);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            console.log(`      📡 Response status: ${res.statusCode}`);
            console.log(`      📊 Response length: ${data.length} characters`);

            if (res.statusCode === 200) {
              // Try to decode the response
              try {
                const buffer = Buffer.from(data, "base64");
                const decompressed = zlib.gunzipSync(buffer);
                const jsonString = decompressed.toString("utf8");
                const jsonData = JSON.parse(jsonString);

                console.log(`      ✅ Successfully decoded response`);
                console.log(
                  `      📊 Total properties: ${jsonData.data?.total_rows || 0}`
                );

                resolve({
                  city: cityName,
                  neighborhood: neighborhoodName,
                  neighborhoodId: neighborhoodId,
                  status: "success",
                  data: jsonData,
                  rawResponse: data,
                });
              } catch (decodeError) {
                console.log(
                  `      ⚠️ Response is not gzip-compressed, treating as regular JSON`
                );
                const jsonData = JSON.parse(data);
                resolve({
                  city: cityName,
                  neighborhood: neighborhoodName,
                  neighborhoodId: neighborhoodId,
                  status: "success",
                  data: jsonData,
                  rawResponse: data,
                });
              }
            } else {
              console.log(`      ❌ API returned status: ${res.statusCode}`);
              resolve({
                city: cityName,
                neighborhood: neighborhoodName,
                neighborhoodId: neighborhoodId,
                status: "error",
                error: `HTTP ${res.statusCode}`,
                response: data,
              });
            }
          } catch (error) {
            console.log(`      ❌ Error parsing response: ${error.message}`);
            resolve({
              city: cityName,
              neighborhood: neighborhoodName,
              neighborhoodId: neighborhoodId,
              status: "error",
              error: error.message,
              response: data,
            });
          }
        });
      });

      req.on("error", (error) => {
        console.log(`      ❌ Request error: ${error.message}`);
        resolve({
          city: cityName,
          neighborhood: neighborhoodName,
          neighborhoodId: neighborhoodId,
          status: "error",
          error: error.message,
        });
      });

      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Save results to JSON file
   */
  saveResults(cityName, neighborhoodName, result) {
    const outputDir = "api-scraps";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const filename = `${cityName.replace(
      /[^a-zA-Z0-9\u0590-\u05FF]/g,
      "_"
    )}_${neighborhoodName.replace(
      /[^a-zA-Z0-9\u0590-\u05FF]/g,
      "_"
    )}_deals.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`      💾 Saved to: ${filepath}`);
  }

  /**
   * Process a single city
   */
  async processCity(cityName) {
    console.log(`\n🏙️ Processing city: ${cityName}`);
    console.log("=".repeat(50));

    const cityPath = path.join("councils-with-folders", cityName);

    if (!fs.existsSync(cityPath)) {
      console.log(`  ❌ City folder not found: ${cityPath}`);
      return;
    }

    // Read neighborhoods from areas CSV
    const neighborhoods = this.readAreasCsv(cityPath, cityName);
    console.log(
      `  📊 Found ${neighborhoods.length} neighborhoods in areas CSV`
    );

    if (neighborhoods.length === 0) {
      console.log(`  ⚠️ No neighborhoods found for ${cityName}`);
      return;
    }

    let cityMissingCount = 0;
    let cityProcessedCount = 0;

    // Check each neighborhood
    for (const neighborhood of neighborhoods) {
      const neighborhoodPath = path.join(cityPath, neighborhood.name);

      if (!fs.existsSync(neighborhoodPath)) {
        console.log(
          `    ⚠️ Neighborhood folder not found: ${neighborhood.name}`
        );
        continue;
      }

      const hasDeals = this.hasDealsCsv(neighborhoodPath);

      if (!hasDeals) {
        console.log(
          `    📭 Missing deals CSV: ${neighborhood.name} (ID: ${neighborhood.id})`
        );
        cityMissingCount++;
        this.missingNeighborhoods++;

        // Scrape deals for this neighborhood
        try {
          const result = await this.makeApiRequest(
            neighborhood.name,
            neighborhood.id,
            cityName
          );

          if (result.status === "success") {
            this.results.push(result);
            this.saveResults(cityName, neighborhood.name, result);
            console.log(`    ✅ Successfully scraped ${neighborhood.name}`);
          } else {
            this.errors.push(result);
            console.log(
              `    ❌ Failed to scrape ${neighborhood.name}: ${result.error}`
            );
          }

          // Add delay between requests to be respectful
          await new Promise((resolve) => setTimeout(resolve, 2000));
          cityProcessedCount++;
        } catch (error) {
          const errorResult = {
            city: cityName,
            neighborhood: neighborhood.name,
            neighborhoodId: neighborhood.id,
            status: "error",
            error: error.message,
          };
          this.errors.push(errorResult);
          console.log(
            `    ❌ Exception scraping ${neighborhood.name}: ${error.message}`
          );
        }
      } else {
        console.log(`    ✅ Has deals CSV: ${neighborhood.name}`);
      }
    }

    console.log(
      `  📊 City summary: ${cityMissingCount} missing, ${cityProcessedCount} processed`
    );
    this.processedCities++;
    this.totalNeighborhoods += neighborhoods.length;
  }

  /**
   * Process all cities
   */
  async processAllCities() {
    console.log("🏠 Missing Neighborhoods Deals Scraper");
    console.log("======================================\n");

    const councilsPath = "councils-with-folders";
    const cities = fs.readdirSync(councilsPath).filter((item) => {
      const itemPath = path.join(councilsPath, item);
      return fs.statSync(itemPath).isDirectory() && item !== "README.md";
    });

    console.log(`📋 Found ${cities.length} cities to process`);

    // Filter cities that have areas CSV files
    const citiesWithAreas = cities.filter((city) => {
      const areasFile = path.join(councilsPath, city, `${city}_areas.csv`);
      return fs.existsSync(areasFile);
    });

    console.log(
      `📋 Found ${citiesWithAreas.length} cities with areas CSV files`
    );

    // For testing, let's start with just a few cities
    const testCities = citiesWithAreas.slice(0, 3);
    console.log(`🧪 Testing with first ${testCities.length} cities:`);
    testCities.forEach((city, index) => {
      console.log(`  ${index + 1}. ${city}`);
    });

    for (const city of testCities) {
      await this.processCity(city);
    }

    this.displaySummary();
  }

  /**
   * Display scraping summary
   */
  displaySummary() {
    console.log("\n📊 SCRAPING SUMMARY");
    console.log("===================");
    console.log(`🏙️ Cities processed: ${this.processedCities}`);
    console.log(`🏘️ Total neighborhoods: ${this.totalNeighborhoods}`);
    console.log(`📭 Missing neighborhoods: ${this.missingNeighborhoods}`);
    console.log(`✅ Successful: ${this.results.length}`);
    console.log(`❌ Failed: ${this.errors.length}`);

    if (this.results.length > 0) {
      console.log("\n✅ Successful neighborhoods:");
      this.results.forEach((result, index) => {
        const totalRows = result.data?.data?.total_rows || 0;
        console.log(
          `  ${index + 1}. ${result.city} - ${
            result.neighborhood
          } (${totalRows} properties)`
        );
      });
    }

    if (this.errors.length > 0) {
      console.log("\n❌ Failed neighborhoods:");
      this.errors.forEach((error, index) => {
        console.log(
          `  ${index + 1}. ${error.city} - ${error.neighborhood}: ${
            error.error
          }`
        );
      });
    }

    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      citiesProcessed: this.processedCities,
      totalNeighborhoods: this.totalNeighborhoods,
      missingNeighborhoods: this.missingNeighborhoods,
      successful: this.results.length,
      failed: this.errors.length,
      results: this.results,
      errors: this.errors,
    };

    fs.writeFileSync(
      "missing_neighborhoods_summary.json",
      JSON.stringify(summary, null, 2)
    );
    console.log("\n💾 Summary saved to: missing_neighborhoods_summary.json");
  }
}

// Run the script
if (require.main === module) {
  const scraper = new MissingNeighborhoodsScraper();
  scraper.processAllCities().catch(console.error);
}

module.exports = MissingNeighborhoodsScraper;
