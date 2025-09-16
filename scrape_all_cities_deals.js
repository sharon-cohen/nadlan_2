const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class AllCitiesDealsScraper {
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

    console.log("✅ Browser initialized");
  }

  async scrapeCityDeals(cityName, cityId) {
    console.log(`🏙️ Scraping deals for city: ${cityName} (ID: ${cityId})`);

    try {
      // Navigate directly to the city deals page using the ID
      const cityUrl = `https://www.nadlan.gov.il/?view=settlement&id=${cityId}&page=deals`;

      console.log(`🌐 Navigating to: ${cityUrl}`);
      await this.page.goto(cityUrl, {
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
      console.log(`📊 Found ${totalDeals} deals in ${cityName}`);

      // Add city info to each deal
      dealsData.forEach((deal) => {
        deal.city = cityName;
      });

      // Save deals to CSV
      if (dealsData.length > 0) {
        await this.saveDealsToCSV(dealsData, cityName);
        console.log(`💾 Saved ${totalDeals} deals to ${cityName}_deals.csv`);
      } else {
        console.log(`⚠️ No deals found for city: ${cityName}`);
      }

      return totalDeals;
    } catch (error) {
      console.log(`❌ Error scraping city ${cityName}: ${error.message}`);
      return 0;
    }
  }

  async saveDealsToCSV(deals, cityName) {
    if (!deals || deals.length === 0) return;

    const csvContent = [
      "Address,Price,Area,Rooms,Floor,Date,Type,City",
      ...deals.map((deal) =>
        [
          `"${deal.address || ""}"`,
          `"${deal.price || ""}"`,
          `"${deal.area || ""}"`,
          `"${deal.rooms || ""}"`,
          `"${deal.floor || ""}"`,
          `"${deal.date || ""}"`,
          `"${deal.type || ""}"`,
          `"${deal.city || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const filename = `${cityName}_deals.csv`;
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
  const scraper = new AllCitiesDealsScraper();

  try {
    await scraper.init(false); // Set to true for headless mode

    // Define cities with their IDs manually
    const citiesWithIds = [
      { name: "לוד", id: "7000" },
      { name: "תל אביב - יפו", id: "5000" },
      { name: "ירושלים", id: "3000" },
      { name: "חיפה", id: "4000" },
      { name: "אשדוד", id: "6000" },
      { name: "פתח תקווה", id: "7900" },
      { name: "נתניה", id: "8000" },
      { name: "באר שבע", id: "9000" },
      { name: "רחובות", id: "8400" },
      { name: "הרצליה", id: "7600" },
      { name: "רמת גן", id: "7200" },
      { name: "גבעתיים", id: "7400" },
      { name: "כפר סבא", id: "7800" },
      { name: "ראשון לציון", id: "8200" },
      { name: "חולון", id: "7500" },
      { name: "בת ים", id: "7300" },
      { name: "רמת השרון", id: "7700" },
      { name: "קרית אונו", id: "7100" },
      { name: "אור יהודה", id: "6900" },
      { name: "יהוד", id: "7000" },
    ];

    console.log(`🏙️ Found ${citiesWithIds.length} cities to scrape`);

    let totalDealsAll = 0;

    for (let i = 0; i < citiesWithIds.length; i++) {
      const city = citiesWithIds[i];
      console.log(
        `\n🏙️ Scraping city ${i + 1}/${citiesWithIds.length}: ${city.name}`
      );

      try {
        const cityDeals = await scraper.scrapeCityDeals(city.name, city.id);
        totalDealsAll += cityDeals;

        console.log(`✅ Completed ${city.name}: ${cityDeals} deals`);

        // Delay between cities (2-4 seconds)
        const delay = Math.floor(Math.random() * 2000) + 2000;
        await scraper.delay(delay);
      } catch (error) {
        console.log(`❌ Error scraping ${city.name}: ${error.message}`);
      }
    }

    console.log(
      `\n🎉 All cities completed! Total deals found: ${totalDealsAll}`
    );
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

module.exports = AllCitiesDealsScraper;




