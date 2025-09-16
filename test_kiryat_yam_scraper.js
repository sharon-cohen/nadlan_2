const https = require("https");
const fs = require("fs");
const path = require("path");

/**
 * Test scraper for Kiryat Yam neighborhoods
 * Try to use the working encrypted string for different neighborhood IDs
 */

class KiryatYamScraper {
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

    // The working encrypted string from Beitar (ID: 65210264)
    this.workingEncryptedString =
      "oQ5uOZlDM8AFFEYP6lO_HuxJKbjhYr1P0thDxjBevJp.0nIslmL292Zu4WYsRWYu5yd3dnI6IibpFWbvRmIsUDNwYDNycTN3EjOiAHelJCLiITZllTNhFTN0YDOh1COhVWOtIjZ1QTLxQ2Yi1yN5QWM4EGOiJiOi4WZr9GdiwiIwgzMMdjUNJnaRlEbydWL1o1Zt82Z5knc1I0d5JUZhlGWnFGeNNkd6hkbO5CMY5EMBpmTwkkeOFzYU1kNJN0Y0YVbJNXSDJGc1kGZ2RWbMVnRHJ2aG1mY1N2MkNjSp9Ua0cVYoFjMitmS5VmL5oUaOFTS6VVSKl2TpN2RihmS5VmI6IyazJCLi42dvR2XlRXYExWYlRmI6IiclRmcv9VZwlHdiwSM6IiclJWb152XoNGdlZmIsICZJR2bvhmcvJGanlWZuJiOiUWbh52XlNXYiJCLiQjNyATMyUjNiojIkl2XlNXYiJye.9JiN1IzUIJiOicGbhJye";

    // Kiryat Yam neighborhoods from the areas CSV
    this.kiryatYamNeighborhoods = [
      { name: "קריית ים ד", id: "65210847" },
      { name: "סביוני ים", id: "65210848" },
      { name: "אלמוגים", id: "65210849" },
      { name: "בנה ביתך", id: "65210850" },
      { name: "פסגות ים", id: "65210851" },
      { name: "א", id: "65210877" },
      { name: "קריית ים ב", id: "65210878" },
      { name: "קריית ים ג", id: "65210879" },
    ];

    this.results = [];
    this.errors = [];
  }

  async makeApiRequest(neighborhoodName, neighborhoodId) {
    return new Promise((resolve, reject) => {
      console.log(
        `🌐 Testing API for: ${neighborhoodName} (ID: ${neighborhoodId})`
      );

      // Try using the working encrypted string as-is
      const requestBody = JSON.stringify({
        fetch_number: 1,
        "##": this.workingEncryptedString,
      });

      const options = {
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(this.apiUrl, options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            console.log(`   📊 Response status: ${res.statusCode}`);
            console.log(`   📦 Response length: ${data.length} characters`);

            if (res.statusCode === 200) {
              // Try to parse as JSON first
              let jsonData;
              try {
                jsonData = JSON.parse(data);
                console.log(`   ✅ Successfully parsed JSON response`);
                console.log(
                  `   📊 Total properties: ${jsonData.data?.total_rows || 0}`
                );

                resolve({
                  neighborhood: neighborhoodName,
                  neighborhoodId: neighborhoodId,
                  status: "success",
                  data: jsonData,
                  rawResponse: data,
                });
              } catch (parseError) {
                // If not JSON, might be gzip-compressed base64
                console.log(
                  `   🔄 Not JSON, trying to decode as gzip-compressed base64...`
                );

                try {
                  const zlib = require("zlib");
                  const buffer = Buffer.from(data, "base64");
                  const decompressed = zlib.gunzipSync(buffer);
                  const jsonData = JSON.parse(decompressed.toString("utf-8"));

                  console.log(`   ✅ Successfully decoded gzip response`);
                  console.log(
                    `   📊 Total properties: ${jsonData.data?.total_rows || 0}`
                  );

                  resolve({
                    neighborhood: neighborhoodName,
                    neighborhoodId: neighborhoodId,
                    status: "success",
                    data: jsonData,
                    rawResponse: data,
                  });
                } catch (decodeError) {
                  console.log(
                    `   ⚠️ Could not decode response: ${decodeError.message}`
                  );
                  resolve({
                    neighborhood: neighborhoodName,
                    neighborhoodId: neighborhoodId,
                    status: "success",
                    data: { raw: data },
                    rawResponse: data,
                  });
                }
              }
            } else {
              console.log(`   ❌ HTTP Error ${res.statusCode}`);
              console.log(`   📝 Response: ${data.substring(0, 200)}...`);

              resolve({
                neighborhood: neighborhoodName,
                neighborhoodId: neighborhoodId,
                status: "error",
                error: `HTTP ${res.statusCode}`,
                response: data,
              });
            }
          } catch (error) {
            console.log(`   ❌ Error processing response: ${error.message}`);
            resolve({
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
        console.log(`   ❌ Request error: ${error.message}`);
        reject({
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

  saveResults(neighborhoodName, result) {
    const outputDir = "api-scraps";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const filename = `קרית_ים_${neighborhoodName.replace(
      /[^a-zA-Z0-9\u0590-\u05FF]/g,
      "_"
    )}_deals.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`   💾 Saved result to: ${filepath}`);
  }

  async testAllNeighborhoods() {
    console.log("🏙️ Testing Kiryat Yam neighborhoods...\n");

    let successCount = 0;
    let errorCount = 0;

    for (const neighborhood of this.kiryatYamNeighborhoods) {
      try {
        const result = await this.makeApiRequest(
          neighborhood.name,
          neighborhood.id
        );

        if (result.status === "success") {
          this.results.push(result);
          this.saveResults(neighborhood.name, result);
          successCount++;
          console.log(`   ✅ Success: ${neighborhood.name}`);
        } else {
          this.errors.push(result);
          errorCount++;
          console.log(`   ❌ Error: ${neighborhood.name} - ${result.error}`);
        }

        // Add delay between requests
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        const errorResult = {
          neighborhood: neighborhood.name,
          neighborhoodId: neighborhood.id,
          status: "error",
          error: error.message,
        };
        this.errors.push(errorResult);
        errorCount++;
        console.log(`   ❌ Exception: ${neighborhood.name} - ${error.message}`);
      }

      console.log(""); // Empty line for readability
    }

    console.log("📊 FINAL SUMMARY:");
    console.log(`✅ Successful requests: ${successCount}`);
    console.log(`❌ Failed requests: ${errorCount}`);

    if (this.results.length > 0) {
      console.log("\n✅ Successful neighborhoods:");
      this.results.forEach((result, index) => {
        const totalRows = result.data?.data?.total_rows || 0;
        console.log(
          `  ${index + 1}. ${result.neighborhood} (${totalRows} properties)`
        );
      });
    }

    if (this.errors.length > 0) {
      console.log("\n❌ Failed neighborhoods:");
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.neighborhood}: ${error.error}`);
      });
    }

    // Save summary
    const summary = {
      city: "קרית ים",
      totalNeighborhoods: this.kiryatYamNeighborhoods.length,
      successful: this.results.length,
      failed: this.errors.length,
      results: this.results,
      errors: this.errors,
    };

    fs.writeFileSync(
      "kiryat_yam_scraping_summary.json",
      JSON.stringify(summary, null, 2)
    );
    console.log("\n💾 Summary saved to: kiryat_yam_scraping_summary.json");
  }
}

// Run the scraper
async function main() {
  const scraper = new KiryatYamScraper();
  await scraper.testAllNeighborhoods();
}

main().catch(console.error);


