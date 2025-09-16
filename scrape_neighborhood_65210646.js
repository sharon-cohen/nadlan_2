#!/usr/bin/env node
/**
 * Scraper for neighborhood ID 65210646 (נווה מדבר in Eilat)
 * Uses the working encrypted string approach
 */

const https = require("https");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

class Neighborhood65210646Scraper {
  constructor() {
    this.apiUrl =
      "https://x4006fhmy5.execute-api.il-central-1.amazonaws.com/api/deal";

    // Headers matching the original API request structure
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

    // The working encrypted string from the example (Beitar neighborhood)
    this.workingEncryptedString =
      "oQ5uOZlDM8AFFEYP6lO_HuxJKbjhYr1P0thDxjBevJp.0nIslmL292Zu4WYsRWYu5yd3dnI6IibpFWbvRmIsUDNwYDNycTN3EjOiAHelJCLiITZllTNhFTN0YDOh1COhVWOtIjZ1QTLxQ2Yi1yN5QWM4EGOiJiOi4WZr9GdiwiIwgzMMdjUNJnaRlEbydWL1o1Zt82Z5knc1I0d5JUZhlGWnFGeNNkd6hkbO5CMY5EMBpmTwkkeOFzYU1kNJN0Y0YVbJNXSDJGc1kGZ2RWbMVnRHJ2aG1mY1N2MkNjSp9Ua0cVYoFjMitmS5VmL5oUaOFTS6VVSKl2TpN2RihmS5VmI6IyazJCLi42dvR2XlRXYExWYlRmI6IiclRmcv9VZwlHdiwSM6IiclJWb152XoNGdlZmIsICZJR2bvhmcvJGanlWZuJiOiUWbh52XlNXYiJCLiQjNyATMyUjNiojIkl2XlNXYiJye.9JiN1IzUIJiOicGbhJye";
  }

  /**
   * Decode gzip-compressed base64 data
   */
  async decodeGzipBase64(base64Data) {
    try {
      console.log("🔓 Decoding gzip-compressed base64 data...");

      // Decode base64 to buffer
      const compressedBuffer = Buffer.from(base64Data, "base64");
      console.log(
        `   📊 Compressed data size: ${compressedBuffer.length} bytes`
      );

      // Decompress gzip
      const decompressedBuffer = await new Promise((resolve, reject) => {
        zlib.gunzip(compressedBuffer, (err, result) => {
          if (err) {
            reject(new Error(`Gzip decompression failed: ${err.message}`));
          } else {
            resolve(result);
          }
        });
      });

      console.log(
        `   📊 Decompressed data size: ${decompressedBuffer.length} bytes`
      );

      // Convert to string
      const decodedString = decompressedBuffer.toString("utf-8");
      console.log(
        `   ✅ Successfully decoded ${decodedString.length} characters`
      );

      return decodedString;
    } catch (error) {
      console.error("❌ Error decoding gzip base64 data:", error.message);
      throw error;
    }
  }

  /**
   * Make API request for neighborhood 65210646
   */
  async scrapeNeighborhood65210646() {
    return new Promise((resolve, reject) => {
      console.log("🏠 Scraping neighborhood 65210646 (נווה מדבר in Eilat)");
      console.log("=".repeat(60));

      // Use the working encrypted string approach
      const requestBody = JSON.stringify({
        fetch_number: 1,
        "##": this.workingEncryptedString,
      });

      console.log(`🌐 Making POST request to: ${this.apiUrl}`);
      console.log(`   📝 Using working encrypted string approach`);
      console.log(`   📦 Request body: ${requestBody}`);

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
        console.log(`   📡 Response status: ${res.statusCode}`);
        console.log(`   📡 Response headers:`, res.headers);

        let responseData = "";

        // Handle different content encodings
        let stream = res;
        if (res.headers["content-encoding"] === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers["content-encoding"] === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (res.headers["content-encoding"] === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        stream.on("data", (chunk) => {
          responseData += chunk;
        });

        stream.on("end", async () => {
          try {
            console.log(
              `   📊 Raw response length: ${responseData.length} characters`
            );
            console.log(
              `   📄 Response preview: ${responseData.substring(0, 200)}...`
            );

            if (res.statusCode !== 200) {
              throw new Error(`HTTP ${res.statusCode}: ${responseData}`);
            }

            // Try to parse as JSON first
            let parsedData;
            try {
              parsedData = JSON.parse(responseData);
              console.log("   ✅ Response is valid JSON");
            } catch (jsonError) {
              console.log(
                "   📄 Response is not JSON, treating as base64 data"
              );

              // Clean the response data
              let cleanData = responseData.trim();
              cleanData = cleanData.replace(/^["']|["']$/g, "");

              // Try to decode as gzip base64
              const decodedData = await this.decodeGzipBase64(cleanData);

              // Try to parse the decoded data as JSON
              try {
                parsedData = JSON.parse(decodedData);
                console.log("   ✅ Decoded data is valid JSON");
              } catch (parseError) {
                console.log(
                  "   📄 Decoded data is not JSON, returning as string"
                );
                parsedData = {
                  raw_decoded_data: decodedData,
                  original_base64: cleanData,
                };
              }
            }

            resolve(parsedData);
          } catch (error) {
            console.error("❌ Error processing response:", error.message);
            reject(error);
          }
        });

        stream.on("error", (error) => {
          console.error("❌ Stream error:", error.message);
          reject(error);
        });
      });

      req.on("error", (error) => {
        console.error("❌ Request error:", error.message);
        reject(error);
      });

      // Write the request body
      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Save the response data to a file
   */
  saveResponse(data, filename = "neighborhood_65210646_deals.json") {
    try {
      const filepath = path.join(__dirname, filename);
      const jsonString = JSON.stringify(data, null, 2);

      fs.writeFileSync(filepath, jsonString, "utf-8");
      console.log(`💾 Response saved to: ${filepath}`);
      console.log(`   📊 File size: ${fs.statSync(filepath).size} bytes`);
    } catch (error) {
      console.error("❌ Error saving response:", error.message);
    }
  }

  /**
   * Convert deals data to CSV format
   */
  convertToCSV(dealsData) {
    try {
      if (
        !dealsData ||
        !dealsData.data ||
        !dealsData.data.items ||
        !Array.isArray(dealsData.data.items)
      ) {
        console.log("❌ No deals data found to convert to CSV");
        return null;
      }

      const deals = dealsData.data.items;
      if (deals.length === 0) {
        console.log("❌ No deals found in the data");
        return null;
      }

      // Create CSV header based on the first deal's properties
      const firstDeal = deals[0];
      const headers = Object.keys(firstDeal);
      const csvHeader = headers.join(",");

      // Create CSV rows
      const csvRows = deals.map((deal) => {
        return headers
          .map((header) => {
            const value = deal[header] || "";
            // Escape quotes and wrap in quotes if contains comma
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",");
      });

      const csvContent = [csvHeader, ...csvRows].join("\n");

      console.log(`📊 Converted ${deals.length} deals to CSV format`);
      return csvContent;
    } catch (error) {
      console.error("❌ Error converting to CSV:", error.message);
      return null;
    }
  }

  /**
   * Save CSV data to file
   */
  saveCSV(csvContent, filename = "neighborhood_65210646_deals.csv") {
    try {
      const filepath = path.join(__dirname, filename);
      fs.writeFileSync(filepath, csvContent, "utf-8");
      console.log(`💾 CSV saved to: ${filepath}`);
      console.log(`   📊 File size: ${fs.statSync(filepath).size} bytes`);
    } catch (error) {
      console.error("❌ Error saving CSV:", error.message);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🏠 Neighborhood 65210646 (נווה מדבר) Deals Scraper");
  console.log("=".repeat(60));

  const scraper = new Neighborhood65210646Scraper();

  try {
    // Scrape the neighborhood data
    const responseData = await scraper.scrapeNeighborhood65210646();

    console.log("\n📊 Response Data Structure:");
    if (typeof responseData === "object" && responseData !== null) {
      console.log(`   🔑 Keys: ${Object.keys(responseData).join(", ")}`);

      // Show sample data
      for (const [key, value] of Object.entries(responseData)) {
        if (typeof value === "string") {
          console.log(
            `   📝 ${key}: "${value.substring(0, 100)}${
              value.length > 100 ? "..." : ""
            }"`
          );
        } else if (Array.isArray(value)) {
          console.log(`   📋 ${key}: Array with ${value.length} items`);
        } else if (typeof value === "object") {
          console.log(
            `   📦 ${key}: Object with keys: ${Object.keys(value).join(", ")}`
          );
        } else {
          console.log(`   🔢 ${key}: ${value}`);
        }
      }

      // Check if we have deals data
      if (
        responseData.data &&
        responseData.data.items &&
        Array.isArray(responseData.data.items)
      ) {
        const dealsCount = responseData.data.items.length;
        console.log(`\n🏠 Found ${dealsCount} deals for neighborhood 65210646`);

        if (dealsCount > 0) {
          // Show first few deals
          console.log("\n📋 First 3 deals:");
          responseData.data.items.slice(0, 3).forEach((deal, index) => {
            console.log(`  ${index + 1}. ${JSON.stringify(deal, null, 2)}`);
          });

          // Convert to CSV and save
          const csvContent = scraper.convertToCSV(responseData);
          if (csvContent) {
            scraper.saveCSV(csvContent);
          }
        }
      }
    } else {
      console.log(`   📄 Response type: ${typeof responseData}`);
      console.log(
        `   📄 Response: ${String(responseData).substring(0, 200)}...`
      );
    }

    // Save the raw response
    scraper.saveResponse(responseData);

    console.log("\n✨ Scraping completed successfully!");
    console.log(
      "📁 Check the generated JSON and CSV files for the response data."
    );
  } catch (error) {
    console.error("\n💥 Fatal error:", error.message);
    process.exit(1);
  }
}

// Export the class for use in other modules
module.exports = Neighborhood65210646Scraper;

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}


