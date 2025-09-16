const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class LodNeighborhoodsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async init(headless = false) {
    console.log("🚀 Initializing browser...");

    this.browser = await puppeteer.launch({
      headless: headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
      ],
    });

    this.page = await this.browser.newPage();

    // Set realistic viewport
    await this.page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
    });

    // Set realistic user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set additional headers
    await this.page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    });

    // Apply advanced reCAPTCHA bypass techniques
    // Basic anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    console.log("✅ Browser initialized with reCAPTCHA bypass");
  }

  async scrapeNeighborhoodDeals(neighborhoodName, neighborhoodId) {
    console.log(
      `🏘️ Scraping deals for neighborhood: ${neighborhoodName} (ID: ${neighborhoodId})`
    );

    try {
      // Navigate to the neighborhood deals page
      const neighborhoodUrl = `https://www.nadlan.gov.il/?view=neighborhood&id=${neighborhoodId}&page=deals`;

      console.log(`🌐 Navigating to: ${neighborhoodUrl}`);
      await this.page.goto(neighborhoodUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await this.delay(3000);

      // Wait for content to load
      await this.page.waitForSelector("body", { timeout: 10000 });

      // Try to wait for the deals table
      try {
        await this.page.waitForSelector("table#dealsTable", { timeout: 10000 });
        console.log("✅ Deals table found!");
      } catch (error) {
        console.log("⚠️ Deals table not found, trying to extract anyway...");
      }

      // Extract deals from the table
      const dealsData = await this.page.evaluate(() => {
        const deals = [];

        // Try to find the deals table
        const table = document.querySelector("table#dealsTable");
        if (!table) {
          console.log("No deals table found");
          return deals;
        }

        const rows = table.querySelectorAll("tbody tr");
        console.log(`Found ${rows.length} rows in deals table`);

        rows.forEach((row, index) => {
          try {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 6) {
              const deal = {
                address: cells[0]?.textContent?.trim() || "",
                price: cells[1]?.textContent?.trim() || "",
                area: cells[2]?.textContent?.trim() || "",
                rooms: cells[3]?.textContent?.trim() || "",
                floor: cells[4]?.textContent?.trim() || "",
                date: cells[5]?.textContent?.trim() || "",
                type: cells[6]?.textContent?.trim() || "",
              };

              // Only add if we have meaningful data
              if (
                deal.address &&
                deal.price &&
                deal.address !== "" &&
                deal.price !== ""
              ) {
                deals.push(deal);
              }
            }
          } catch (error) {
            console.log(`Error extracting row ${index}:`, error);
          }
        });

        return deals;
      });

      const totalDeals = dealsData.length;
      console.log(`📊 Found ${totalDeals} deals in ${neighborhoodName}`);

      // Add neighborhood info to each deal
      dealsData.forEach((deal) => {
        deal.neighborhood = neighborhoodName;
        deal.city = "לוד";
      });

      // Save deals to CSV
      if (dealsData.length > 0) {
        await this.saveDealsToCSV(dealsData, neighborhoodName);
        console.log(
          `💾 Saved ${totalDeals} deals to ${neighborhoodName}_deals.csv`
        );
      } else {
        console.log(`⚠️ No deals found for neighborhood: ${neighborhoodName}`);
      }

      return totalDeals;
    } catch (error) {
      console.log(
        `❌ Error scraping neighborhood ${neighborhoodName}: ${error.message}`
      );
      return 0;
    }
  }

  async saveDealsToCSV(deals, neighborhoodName) {
    if (!deals || deals.length === 0) return;

    const csvContent = [
      "Address,Price,Area,Rooms,Floor,Date,Type,Neighborhood,City",
      ...deals.map((deal) =>
        [
          `"${deal.address || ""}"`,
          `"${deal.price || ""}"`,
          `"${deal.area || ""}"`,
          `"${deal.rooms || ""}"`,
          `"${deal.floor || ""}"`,
          `"${deal.date || ""}"`,
          `"${deal.type || ""}"`,
          `"${deal.neighborhood || ""}"`,
          `"${deal.city || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const filename = `${neighborhoodName}_deals.csv`;
    fs.writeFileSync(filename, csvContent, "utf8");
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }
}

// Main execution
async function main() {
  const scraper = new LodNeighborhoodsScraper();

  try {
    await scraper.init(false); // Set to true for headless mode

    // Read Lod areas file
    const areasFile = path.join(
      __dirname,
      "councils-with-folders",
      "לוד",
      "לוד_areas.csv"
    );

    if (!fs.existsSync(areasFile)) {
      console.log("❌ לוד_areas.csv file not found");
      return;
    }

    const areasContent = fs.readFileSync(areasFile, "utf8");
    const lines = areasContent.trim().split("\n");

    // Skip header line
    const neighborhoods = lines.slice(1).map((line) => {
      const [name, id, type] = line.split(",");
      return {
        name: name.replace(/"/g, "").trim(),
        id: id.replace(/"/g, "").trim(),
        type: type.replace(/"/g, "").trim(),
      };
    });

    console.log(`🏘️ Found ${neighborhoods.length} neighborhoods in Lod`);

    let totalDealsAll = 0;

    // Scrape all neighborhoods
    const testNeighborhoods = neighborhoods;

    for (let i = 0; i < testNeighborhoods.length; i++) {
      const neighborhood = testNeighborhoods[i];
      console.log(
        `\n🏘️ Scraping neighborhood ${i + 1}/${testNeighborhoods.length}: ${
          neighborhood.name
        }`
      );

      try {
        const neighborhoodDeals = await scraper.scrapeNeighborhoodDeals(
          neighborhood.name,
          neighborhood.id
        );
        totalDealsAll += neighborhoodDeals;

        console.log(
          `✅ Completed ${neighborhood.name}: ${neighborhoodDeals} deals`
        );

        // Delay between neighborhoods (2-4 seconds)
        const delay = Math.floor(Math.random() * 2000) + 2000;
        await scraper.delay(delay);
      } catch (error) {
        console.log(`❌ Error scraping ${neighborhood.name}: ${error.message}`);
      }
    }

    console.log(`\n🎉 Test completed! Total deals found: ${totalDealsAll}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await scraper.close();
  }
}

// Run the scraper
if (require.main === module) {
  main().catch(console.error);
}

module.exports = LodNeighborhoodsScraper;
