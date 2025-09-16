const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

puppeteer.use(StealthPlugin());

// Specific Tel Aviv neighborhoods to scrape
const targetNeighborhoods = [
  { name: "צוקי אביב", id: "65210003" },
  { name: "לב העיר", id: "65210004" },
  { name: "נאות אפקה א", id: "65210005" },
  { name: "בבלי", id: "65210006" },
  { name: "כרם התימנים", id: "65210007" },
  { name: "גבעת הרצל", id: "65210008" },
  { name: "נווה צדק", id: "65210041" },
  { name: "פלורנטין", id: "65210009" },
  { name: "שפירא", id: "65210010" },
  { name: "רמת אביב", id: "65210011" },
  { name: "דקר", id: "65210044" },
  { name: "מעוז אביב", id: "65210040" },
  { name: "עתידים", id: "65210138" },
  { name: "גאולה", id: "65210684" },
  { name: "רמת אביב החדשה", id: "65210125" },
  { name: "גלילות", id: "65210012" },
  { name: "רמת אביב ג", id: "65210013" }
];

class TelAvivScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionCount = 0;
    this.maxSessionsBeforeRestart = 2; // Restart more frequently
  }

  async init() {
    console.log("🚀 Initializing Tel Aviv Specific Scraper...");

    const launchArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=VizDisplayCompositor",
      "--disable-web-security",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-images",
      "--disable-javascript",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-default-browser-check",
      "--no-pings",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-domain-reliability",
      "--disable-component-extensions-with-background-pages",
      "--disable-background-networking",
      "--disable-sync-preferences",
      "--disable-default-apps",
      "--disable-extensions-file-access-check",
      "--disable-extensions-http-throttling",
      "--disable-extensions-except",
      "--disable-software-rasterizer",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-domain-reliability",
      "--disable-component-extensions-with-background-pages",
      "--disable-background-networking",
      "--disable-sync-preferences",
      "--disable-default-apps",
      "--disable-extensions-file-access-check",
      "--disable-extensions-http-throttling",
      "--disable-extensions-except",
      "--disable-software-rasterizer"
    ];

    this.browser = await puppeteer.launch({
      headless: true,
      args: launchArgs,
      ignoreDefaultArgs: ["--enable-automation"],
    });

    this.page = await this.browser.newPage();

    // Advanced anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['he-IL', 'he', 'en-US', 'en'],
      });
      
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' }),
        }),
      });
      
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
    });

    // Set realistic user agent
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
    ];
    
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(userAgent);
    console.log(`🌐 Using User Agent: ${userAgent}`);

    // Set viewport
    await this.page.setViewport({
      width: 1366 + Math.floor(Math.random() * 100),
      height: 768 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
    });

    // Set timezone to Israel
    await this.page.emulateTimezone('Asia/Jerusalem');

    // Set geolocation to Israel
    await this.page.setGeolocation({ latitude: 31.7683, longitude: 35.2137 });

    console.log("✅ Browser initialized with advanced anti-detection");
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async randomDelay(min = 2000, max = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async closePopups() {
    try {
      const popupSelectors = [
        'button[aria-label="סגור"]',
        'button[aria-label="Close"]',
        ".close-button",
        ".popup-close",
        ".modal-close",
        '[data-testid="close"]',
        'button:contains("סגור")',
        'button:contains("Close")',
        'button:contains("×")',
        ".popup button",
        ".modal button",
        '[role="button"]:contains("×")',
        'button[class*="close"]',
        'div[class*="close"]',
        'span[class*="close"]',
      ];

      let popupFound = false;

      for (const selector of popupSelectors) {
        try {
          const elements = await this.page.$$(selector);
          for (const element of elements) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              await element.click();
              console.log(`    ✅ Closed popup with selector: ${selector}`);
              popupFound = true;
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Also try pressing Escape key
      try {
        await this.page.keyboard.press("Escape");
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        // Ignore keyboard errors
      }

      return popupFound;
    } catch (error) {
      console.log(`    ⚠️ Error closing popups: ${error.message}`);
      return false;
    }
  }

  async humanLikeBehavior() {
    // Random mouse movements
    await this.page.mouse.move(
      Math.random() * 800 + 100,
      Math.random() * 600 + 100
    );

    // Random scroll
    await this.page.evaluate(() => {
      window.scrollTo(0, Math.random() * 500);
    });

    // Random delay
    await this.randomDelay(1000, 3000);
  }

  async scrapeNeighborhood(neighborhood) {
    try {
      const url = `https://www.nadlan.gov.il/?view=neighborhood&id=${neighborhood.id}&page=deals`;
      console.log(`  🔍 Scraping: ${neighborhood.name} (ID: ${neighborhood.id})`);
      console.log(`    🌐 Target URL: ${url}`);

      console.log(`    🌐 Navigating to: ${url}`);

      // Human-like behavior before navigation
      await this.humanLikeBehavior();

      let reloadAttempts = 0;
      const maxReloadAttempts = 10;
      let navigationSuccess = false;

      while (reloadAttempts < maxReloadAttempts && !navigationSuccess) {
        try {
          await this.page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000, // Increased timeout
          });

          // Check for popups and close them
          const popupClosed = await this.closePopups();
          
          if (popupClosed) {
            console.log(
              `    🔄 Popup detected and closed, reloading page... (attempt ${
                reloadAttempts + 1
              })`
            );
            reloadAttempts++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          navigationSuccess = true;
          
        } catch (error) {
          console.log(
            `    ❌ Navigation error (attempt ${reloadAttempts + 1}): ${
              error.message
            }`
          );
          reloadAttempts++;
          
          if (reloadAttempts >= maxReloadAttempts) {
            throw error;
          }
          
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Human-like behavior after page load
      await this.humanLikeBehavior();

      // Additional wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log(`    ⏳ Page loaded, waiting for content...`);

      // Try to find deals
      console.log(`    🔍 Checking for deals...`);
      
      const deals = await this.page.evaluate(() => {
        // Look for various deal selectors
        const selectors = [
          '.deal-item',
          '.transaction-item',
          '[class*="deal"]',
          '[class*="transaction"]',
          '.property-item',
          '[data-testid*="deal"]',
          '[data-testid*="transaction"]'
        ];
        
        let totalDeals = 0;
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          totalDeals += elements.length;
        }
        
        return totalDeals;
      });

      console.log(`    📊 Found ${deals} deals for ${neighborhood.name}`);

      if (deals > 0) {
        // Save to CSV
        const csvContent = `מספר סידורי,כתובת,שטח במר,תאריך העסקה,מחיר העסקה,גוש,סוג נכס,חדרים,קומה\n`;
        const csvFile = path.join(
          `councils-with-folders/תל אביב - יפו/${neighborhood.name}`,
          `${neighborhood.name}_deals.csv`
        );
        
        // Create directory if it doesn't exist
        const dir = path.dirname(csvFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(csvFile, csvContent);
        console.log(`    💾 Saved deals data to: ${csvFile}`);
      } else {
        console.log(`    ⚠️ No deals found for ${neighborhood.name}`);
      }

      return deals;
    } catch (error) {
      console.log(`    ❌ Error scraping ${neighborhood.name}: ${error.message}`);
      return 0;
    }
  }

  async run() {
    try {
      await this.init();
      
      console.log(`🎯 Starting to scrape ${targetNeighborhoods.length} specific Tel Aviv neighborhoods...`);
      
      let totalDeals = 0;
      
      for (let i = 0; i < targetNeighborhoods.length; i++) {
        const neighborhood = targetNeighborhoods[i];
        
        // Restart browser every 2 neighborhoods
        if (i > 0 && i % 2 === 0) {
          console.log(`🔄 Restarting browser after ${i} neighborhoods...`);
          await this.browser.close();
          await this.delay(2000);
          await this.init();
        }
        
        const deals = await this.scrapeNeighborhood(neighborhood);
        totalDeals += deals;
        
        // Wait between neighborhoods
        if (i < targetNeighborhoods.length - 1) {
          console.log(`    ⏳ Waiting before next neighborhood...`);
          await this.randomDelay(3000, 6000);
        }
      }
      
      console.log(`\n🎉 Finished scraping Tel Aviv neighborhoods!`);
      console.log(`📊 Total deals found: ${totalDeals}`);
      
    } catch (error) {
      console.error("❌ Error in main execution:", error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the scraper
const scraper = new TelAvivScraper();
scraper.run().catch(console.error);
