const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class DebugScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log("🚀 Initializing browser...");

    const launchArgs = [
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
    ];

    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: launchArgs,
    });
    this.page = await this.browser.newPage();

    // Set viewport and user agent
    await this.page.setViewport({ width: 1366, height: 768 });
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set extra HTTP headers
    await this.page.setExtraHTTPHeaders({
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    });

    // Override navigator properties
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, "languages", {
        get: () => ["he-IL", "he", "en"],
      });

      Object.defineProperty(navigator, "permissions", {
        get: () => ({
          query: () => Promise.resolve({ state: "granted" }),
        }),
      });
    });

    console.log("✅ Browser initialized");
  }

  async randomDelay(min = 100, max = 300) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async scrapeNeighborhoodDeals(neighborhoodId, neighborhoodName) {
    try {
      const url = `https://www.nadlan.gov.il/?view=neighborhood&id=${neighborhoodId}&page=deals`;
      console.log(`🔍 Scraping: ${neighborhoodName} (ID: ${neighborhoodId})`);
      console.log(`🌐 Target URL: ${url}`);

      console.log(`🌐 Navigating to: ${url}`);
      await this.page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // Wait for page to load with random delay
      await this.randomDelay(100, 300);

      // Additional wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log(`⏳ Page loaded, waiting for content...`);

      // Get current URL to verify we're on the right page
      const currentUrl = await this.page.url();
      console.log(`🔗 Current URL: ${currentUrl}`);

      // Simulate human behavior - scroll down and up
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.randomDelay(500, 800);
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.randomDelay(500, 800);

      // Additional wait after scrolling
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(`📄 Content should be loaded now...`);

      // Now test the exact same logic as the main scraper
      const pageDeals = await this.page.evaluate(() => {
        const deals = [];

        // Try multiple selectors to find the deals table - EXACT SAME AS MAIN SCRAPER
        const selectors = [
          "table tbody tr",
          ".deals-table tbody tr",
          '[class*="deal"] tr',
          ".data-table tbody tr",
          "table tr",
          ".table tr",
          'table[class*="deals"] tr',
          'table[class*="transactions"] tr',
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

        console.log(`Total rows found: ${rows.length}`);

        // If no rows found, log what's available
        if (rows.length === 0) {
          console.log("No rows found. Available tables:", document.querySelectorAll("table").length);
          console.log("Available tbody elements:", document.querySelectorAll("tbody").length);
          console.log("Available tr elements:", document.querySelectorAll("tr").length);

          // Check if there's a message about no deals
          const noDealsMessage = document.querySelector('[class*="no-deals"], [class*="empty"], [class*="no-data"]');
          if (noDealsMessage) {
            console.log("Found no deals message:", noDealsMessage.textContent);
          }

          // Check page content
          const bodyText = document.body.textContent;
          if (bodyText.includes("אין עסקאות") || bodyText.includes("לא נמצאו עסקאות")) {
            console.log("Page indicates no deals available");
          }

          return [];
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll("td");

          if (cells.length >= 6) {
            const deal = {
              serialNumber: cells[0]?.textContent?.trim() || "",
              address: cells[1]?.textContent?.trim() || "",
              area: cells[2]?.textContent?.trim() || "",
              date: cells[3]?.textContent?.trim() || "",
              price: (cells[4]?.textContent?.trim() || "").replace(/[₪$,\s]/g, ""),
              gush: cells[5]?.textContent?.trim() || "",
              propertyType: cells[6]?.textContent?.trim() || "",
              rooms: cells[7]?.textContent?.trim() || "",
              floor: cells[8]?.textContent?.trim() || "",
            };
            deals.push(deal);
          }
        }

        console.log(`Extracted ${deals.length} deals from this page`);
        return deals;
      });

      console.log(`📊 Found ${pageDeals.length} deals using main scraper logic`);

      if (pageDeals.length > 0) {
        console.log("✅ SUCCESS! Deals found:");
        pageDeals.forEach((deal, index) => {
          console.log(`  Deal ${index + 1}: ${deal.address} - ${deal.price} ₪`);
        });
      } else {
        console.log("❌ FAILED! No deals found with main scraper logic");
        
        // Let's also try the simple approach that worked before
        const simpleDeals = await this.page.evaluate(() => {
          const rows = document.querySelectorAll("table tr");
          const deals = [];

          for (let i = 1; i < rows.length; i++) { // Skip header
            const row = rows[i];
            const cells = row.querySelectorAll("td");

            if (cells.length >= 6) {
              const deal = {
                serialNumber: cells[0]?.textContent?.trim() || "",
                address: cells[1]?.textContent?.trim() || "",
                area: cells[2]?.textContent?.trim() || "",
                date: cells[3]?.textContent?.trim() || "",
                price: cells[4]?.textContent?.trim() || "",
                gush: cells[5]?.textContent?.trim() || "",
              };
              deals.push(deal);
            }
          }

          return deals;
        });

        console.log(`📊 Found ${simpleDeals.length} deals using simple approach`);
        if (simpleDeals.length > 0) {
          console.log("✅ Simple approach worked! This means the main scraper selectors are wrong");
        }
      }

      // Take a screenshot for debugging
      await this.page.screenshot({
        path: "debug_neighborhood_65210264.png",
        fullPage: true,
      });
      console.log("📸 Screenshot saved as debug_neighborhood_65210264.png");

    } catch (error) {
      console.error("❌ Error scraping neighborhood:", error.message);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new DebugScraper();
  await scraper.init();
  await scraper.scrapeNeighborhoodDeals(65210264, "Test Neighborhood");
  await scraper.close();
}

main();














