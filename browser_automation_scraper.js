const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

/**
 * Browser automation scraper for Nadlan deals
 * This approach uses Puppeteer to automate the browser and intercept network requests
 */

class BrowserAutomationScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.errors = [];
  }

  async init() {
    console.log("🚀 Initializing browser...");
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      defaultViewport: null,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    this.page = await this.browser.newPage();

    // Set user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Enable request interception
    await this.page.setRequestInterception(true);

    // Intercept network requests to capture API calls
    this.page.on("request", (request) => {
      if (
        request
          .url()
          .includes("execute-api.il-central-1.amazonaws.com/api/deal")
      ) {
        console.log("🌐 Intercepted API request:", request.url());
        console.log("📦 Request method:", request.method());
        console.log("📋 Request headers:", request.headers());

        // Continue the request
        request.continue();
      } else {
        request.continue();
      }
    });

    // Intercept responses to capture API responses
    this.page.on("response", async (response) => {
      if (
        response
          .url()
          .includes("execute-api.il-central-1.amazonaws.com/api/deal")
      ) {
        console.log("📨 Intercepted API response:", response.url());
        console.log("📊 Response status:", response.status());

        try {
          const responseData = await response.text();
          console.log("📦 Response data length:", responseData.length);

          // Try to parse the response
          try {
            const jsonData = JSON.parse(responseData);
            console.log("✅ Parsed JSON response");
            console.log("📊 Total rows:", jsonData.data?.total_rows || 0);

            // Save the response
            this.saveApiResponse(response.url(), jsonData, responseData);
          } catch (parseError) {
            console.log("⚠️ Could not parse as JSON, trying gzip decode...");

            try {
              const zlib = require("zlib");
              const buffer = Buffer.from(responseData, "base64");
              const decompressed = zlib.gunzipSync(buffer);
              const jsonData = JSON.parse(decompressed.toString("utf-8"));

              console.log("✅ Successfully decoded gzip response");
              console.log("📊 Total rows:", jsonData.data?.total_rows || 0);

              this.saveApiResponse(response.url(), jsonData, responseData);
            } catch (decodeError) {
              console.log("❌ Could not decode response:", decodeError.message);
            }
          }
        } catch (error) {
          console.log("❌ Error reading response:", error.message);
        }
      }
    });
  }

  saveApiResponse(url, jsonData, rawData) {
    const outputDir = "api-scraps";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `browser_automation_response_${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    const responseData = {
      url: url,
      timestamp: new Date().toISOString(),
      data: jsonData,
      rawResponse: rawData,
    };

    fs.writeFileSync(filepath, JSON.stringify(responseData, null, 2));
    console.log(`💾 Saved response to: ${filepath}`);
  }

  async navigateToNeighborhood(neighborhoodId, neighborhoodName) {
    console.log(
      `🏠 Navigating to neighborhood: ${neighborhoodName} (ID: ${neighborhoodId})`
    );

    // Construct the URL for the neighborhood
    const url = `https://www.nadlan.gov.il/realestate/deals?neighborhoodId=${neighborhoodId}`;

    try {
      await this.page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      console.log(`✅ Successfully navigated to: ${url}`);

      // Wait for the page to load and make API calls
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Try to trigger any lazy loading or additional API calls
      await this.page.evaluate(() => {
        // Scroll to trigger any lazy loading
        window.scrollTo(0, document.body.scrollHeight);
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      return true;
    } catch (error) {
      console.log(
        `❌ Error navigating to ${neighborhoodName}: ${error.message}`
      );
      return false;
    }
  }

  async scrapeKiryatYamNeighborhoods() {
    console.log(
      "🏙️ Starting browser automation for Kiryat Yam neighborhoods...\n"
    );

    // Kiryat Yam neighborhoods
    const neighborhoods = [
      { name: "קריית ים ד", id: "65210847" },
      { name: "סביוני ים", id: "65210848" },
      { name: "אלמוגים", id: "65210849" },
      { name: "בנה ביתך", id: "65210850" },
      { name: "פסגות ים", id: "65210851" },
      { name: "א", id: "65210877" },
      { name: "קריית ים ב", id: "65210878" },
      { name: "קריית ים ג", id: "65210879" },
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const neighborhood of neighborhoods) {
      try {
        console.log(
          `\n📍 Processing: ${neighborhood.name} (ID: ${neighborhood.id})`
        );

        const success = await this.navigateToNeighborhood(
          neighborhood.id,
          neighborhood.name
        );

        if (success) {
          successCount++;
          console.log(`✅ Successfully processed: ${neighborhood.name}`);
        } else {
          errorCount++;
          console.log(`❌ Failed to process: ${neighborhood.name}`);
        }

        // Add delay between requests
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        errorCount++;
        console.log(
          `❌ Exception processing ${neighborhood.name}: ${error.message}`
        );
      }
    }

    console.log("\n📊 FINAL SUMMARY:");
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }
}

// Main function
async function main() {
  const scraper = new BrowserAutomationScraper();

  try {
    await scraper.init();
    await scraper.scrapeKiryatYamNeighborhoods();
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await scraper.close();
  }
}

// Run the scraper
main().catch(console.error);
