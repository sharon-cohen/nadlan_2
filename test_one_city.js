const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class OneCityTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log("🚀 Initializing browser for one city test...");
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--disable-web-security",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    });
    this.page = await this.browser.newPage();

    // Set viewport and user agent
    await this.page.setViewport({ width: 1366, height: 768 });
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Remove webdriver property
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    });

    console.log("✅ Browser initialized");
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async testCity(cityName) {
    try {
      console.log(`🏙️ Testing city: ${cityName}`);

      const cityPath = path.join("councils-with-folders", cityName);
      const areasFile = path.join(cityPath, `${cityName}_areas.csv`);

      if (!fs.existsSync(areasFile)) {
        console.log(`  ⚠️ No areas file found for ${cityName}`);
        return;
      }

      // Read neighborhoods
      const areasContent = fs.readFileSync(areasFile, "utf8");
      const lines = areasContent.trim().split("\n");
      const neighborhoods = lines.slice(1).map((line) => {
        const [id, name] = line.split(",");
        return { id: id.trim(), name: name.trim() };
      });

      console.log(`  📊 Found ${neighborhoods.length} neighborhoods`);

      if (neighborhoods.length === 0) {
        console.log(`  ⚠️ No neighborhoods found for ${cityName}`);
        return;
      }

      // Test first neighborhood only
      const neighborhood = neighborhoods[0];
      console.log(
        `  🔍 Testing: ${neighborhood.name} (ID: ${neighborhood.id})`
      );

      const url = `https://www.nadlan.gov.il/?view=neighborhood&id=${neighborhood.id}&page=deals`;

      await this.page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      await this.randomDelay(2000, 4000);

      // Extract deals from current page
      const pageDeals = await this.page.evaluate(() => {
        const deals = [];

        // Try multiple selectors to find the deals table
        const selectors = [
          "table tbody tr",
          ".deals-table tbody tr",
          '[class*="deal"] tr',
          ".data-table tbody tr",
          "table tr",
          ".table tr",
          '[class*="table"] tr',
          "tbody tr",
          'tr[class*="row"]',
          'tr[class*="deal"]',
        ];

        let rows = [];
        for (let selector of selectors) {
          rows = document.querySelectorAll(selector);
          if (rows.length > 0) {
            console.log(`Found ${rows.length} rows with selector: ${selector}`);
            break;
          }
        }

        // If no rows found, log what's available
        if (rows.length === 0) {
          console.log(
            "No rows found. Available tables:",
            document.querySelectorAll("table").length
          );
          console.log(
            "Available tbody elements:",
            document.querySelectorAll("tbody").length
          );
          console.log(
            "Available tr elements:",
            document.querySelectorAll("tr").length
          );
          return deals;
        }

        // Process each row
        rows.forEach((row, index) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 6) {
            const deal = {
              serial: index + 1,
              address: cells[0]?.textContent?.trim() || "",
              area: cells[1]?.textContent?.trim() || "",
              date: cells[2]?.textContent?.trim() || "",
              price:
                cells[3]?.textContent?.trim()?.replace(/[₪$,\s]/g, "") || "",
              block: cells[4]?.textContent?.trim() || "",
              type: cells[5]?.textContent?.trim() || "",
              rooms: cells[6]?.textContent?.trim() || "",
              floor: cells[7]?.textContent?.trim() || "",
            };
            deals.push(deal);
          }
        });

        return deals;
      });

      console.log(`  📊 Found ${pageDeals.length} deals on page 1`);

      if (pageDeals.length > 0) {
        console.log("  ✅ SUCCESS! Found deals:");
        pageDeals.slice(0, 3).forEach((deal) => {
          console.log(
            `    - ${deal.address}: ${deal.price} ₪ (${deal.rooms} rooms)`
          );
        });
      } else {
        console.log("  ❌ No deals found - possible blocking");
      }

      return pageDeals.length;
    } catch (error) {
      console.error(`  ❌ Error testing ${cityName}:`, error.message);
      return 0;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function testOneCity() {
  const tester = new OneCityTester();

  try {
    await tester.init();

    // Test a few cities
    const testCities = ["אופקים", "אשדוד", "תל אביב - יפו"];

    for (const city of testCities) {
      const dealsCount = await tester.testCity(city);
      console.log(`\n📊 Results for ${city}: ${dealsCount} deals found\n`);
      await tester.randomDelay(2000, 4000);
    }
  } finally {
    await tester.close();
  }
}

testOneCity();
