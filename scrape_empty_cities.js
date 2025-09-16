const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

/**
 * Script to scrape deals data for cities without CSV files
 * Uses the working API method with the exact encrypted string
 */

class EmptyCitiesScraper {
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
  }

  /**
   * Load the empty cities list
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
   * Make API request using the working method
   */
  async makeApiRequest(cityName, neighborhoodId = null) {
    return new Promise((resolve, reject) => {
      console.log(`🌐 Making API request for: ${cityName}`);

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
            console.log(`   📡 Response status: ${res.statusCode}`);
            console.log(`   📊 Response length: ${data.length} characters`);

            if (res.statusCode === 200) {
              // Try to decode the response
              try {
                const buffer = Buffer.from(data, "base64");
                const decompressed = zlib.gunzipSync(buffer);
                const jsonString = decompressed.toString("utf8");
                const jsonData = JSON.parse(jsonString);

                console.log(`   ✅ Successfully decoded response`);
                console.log(
                  `   📊 Total properties: ${jsonData.data?.total_rows || 0}`
                );

                resolve({
                  city: cityName,
                  neighborhoodId: neighborhoodId,
                  status: "success",
                  data: jsonData,
                  rawResponse: data,
                });
              } catch (decodeError) {
                console.log(
                  `   ⚠️ Response is not gzip-compressed, treating as regular JSON`
                );
                const jsonData = JSON.parse(data);
                resolve({
                  city: cityName,
                  neighborhoodId: neighborhoodId,
                  status: "success",
                  data: jsonData,
                  rawResponse: data,
                });
              }
            } else {
              console.log(`   ❌ API returned status: ${res.statusCode}`);
              resolve({
                city: cityName,
                neighborhoodId: neighborhoodId,
                status: "error",
                error: `HTTP ${res.statusCode}`,
                response: data,
              });
            }
          } catch (error) {
            console.log(`   ❌ Error parsing response: ${error.message}`);
            resolve({
              city: cityName,
              neighborhoodId: neighborhoodId,
              status: "error",
              error: error.message,
              response: data,
            });
          }
        });
      });

      req.on("error", (error) => {
        console.log(`   ❌ Request error: ${error.message}`);
        resolve({
          city: cityName,
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
  saveResults(cityName, result) {
    const outputDir = "api-scraps";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const filename = `${cityName.replace(
      /[^a-zA-Z0-9\u0590-\u05FF]/g,
      "_"
    )}_deals.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`   💾 Saved to: ${filepath}`);
  }

  /**
   * Scrape deals for a single city
   */
  async scrapeCity(cityName) {
    console.log(`\n🏙️ Scraping deals for: ${cityName}`);
    console.log("=".repeat(50));

    try {
      // For now, we'll use the working neighborhood ID (65210264 - בית"ר)
      // TODO: Find the correct neighborhood ID for each city
      const result = await this.makeApiRequest(cityName, 65210264);

      if (result.status === "success") {
        this.results.push(result);
        this.saveResults(cityName, result);
        console.log(`   ✅ Successfully scraped ${cityName}`);
      } else {
        this.errors.push(result);
        console.log(`   ❌ Failed to scrape ${cityName}: ${result.error}`);
      }

      // Add delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      const errorResult = {
        city: cityName,
        status: "error",
        error: error.message,
      };
      this.errors.push(errorResult);
      console.log(`   ❌ Exception scraping ${cityName}: ${error.message}`);
    }
  }

  /**
   * Scrape deals for all empty cities
   */
  async scrapeAllCities() {
    console.log("🏠 Empty Cities Deals Scraper");
    console.log("==============================\n");

    const emptyCities = this.loadEmptyCities();

    if (emptyCities.length === 0) {
      console.log("❌ No empty cities found. Run find_empty_cities.js first.");
      return;
    }

    console.log(`📋 Found ${emptyCities.length} cities to scrape`);
    console.log(
      '⚠️  Note: Currently using the working encrypted string for בית"ר neighborhood'
    );
    console.log("⚠️  TODO: Need to find neighborhood IDs for each city\n");

    // For testing, let's start with just a few cities
    const testCities = emptyCities.slice(0, 5);
    console.log(`🧪 Testing with first ${testCities.length} cities:`);
    testCities.forEach((city, index) => {
      console.log(`  ${index + 1}. ${city}`);
    });

    for (const city of testCities) {
      await this.scrapeCity(city);
    }

    this.displaySummary();
  }

  /**
   * Display scraping summary
   */
  displaySummary() {
    console.log("\n📊 SCRAPING SUMMARY");
    console.log("==================");
    console.log(`✅ Successful: ${this.results.length}`);
    console.log(`❌ Failed: ${this.errors.length}`);

    if (this.results.length > 0) {
      console.log("\n✅ Successful cities:");
      this.results.forEach((result, index) => {
        const totalRows = result.data?.data?.total_rows || 0;
        console.log(`  ${index + 1}. ${result.city} (${totalRows} properties)`);
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

    fs.writeFileSync("scraping_summary.json", JSON.stringify(summary, null, 2));
    console.log("\n💾 Summary saved to: scraping_summary.json");
  }
}

// Run the script
if (require.main === module) {
  const scraper = new EmptyCitiesScraper();
  scraper.scrapeAllCities().catch(console.error);
}

module.exports = EmptyCitiesScraper;


