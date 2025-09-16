const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin with advanced options
puppeteer.use(StealthPlugin());

class UltimateAntiDetectionScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log("🚀 Initializing Ultimate Anti-Detection Scraper...");

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
      "--disable-extensions-file-access-check",
      "--disable-extensions-http-throttling",
      "--disable-extensions-except",
      "--disable-software-rasterizer",
      "--disable-features=VizDisplayCompositor",
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
      "--no-first-run",
      "--no-zygote",
      "--disable-accelerated-2d-canvas",
      "--disable-accelerated-jpeg-decoding",
      "--disable-accelerated-mjpeg-decode",
      "--disable-accelerated-video-decode",
      "--disable-accelerated-video-encode",
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
      headless: false, // Visible browser
      args: launchArgs,
      ignoreDefaultArgs: ["--enable-automation"],
      defaultViewport: null,
    });

    this.page = await this.browser.newPage();

    // Advanced anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          },
          {
            0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
            1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin},
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
          }
        ],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['he-IL', 'he', 'en-US', 'en'],
      });
      
      // Mock permissions
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' }),
        }),
      });
      
      // Mock chrome object
      window.chrome = {
        runtime: {
          onConnect: undefined,
          onMessage: undefined,
        },
        loadTimes: function() {
          return {
            requestTime: performance.now(),
            startLoadTime: performance.now(),
            commitLoadTime: performance.now(),
            finishDocumentLoadTime: performance.now(),
            finishLoadTime: performance.now(),
            firstPaintTime: performance.now(),
            firstPaintAfterLoadTime: 0,
            navigationType: 'navigate'
          };
        },
        csi: function() {
          return {
            pageT: performance.now(),
            startE: performance.now(),
            tran: 15
          };
        },
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
          }
        }
      };
      
      // Mock screen properties
      Object.defineProperty(screen, 'availHeight', {
        get: () => 1040,
      });
      Object.defineProperty(screen, 'availWidth', {
        get: () => 1920,
      });
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
      });
      Object.defineProperty(screen, 'height', {
        get: () => 1080,
      });
      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
      });
      Object.defineProperty(screen, 'width', {
        get: () => 1920,
      });
      
      // Mock Date
      const originalDate = Date;
      Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new originalDate(originalDate.now() + Math.random() * 1000);
          }
          return new originalDate(...args);
        }
      };
      Date.now = () => originalDate.now() + Math.random() * 1000;
      Date.parse = originalDate.parse;
      Date.UTC = originalDate.UTC;
      
      // Mock Math.random
      const originalRandom = Math.random;
      Math.random = () => originalRandom() + Math.random() * 0.0001;
      
      // Mock performance
      const originalNow = performance.now;
      performance.now = () => originalNow() + Math.random() * 0.1;
      
      // Mock getBoundingClientRect
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() {
        const rect = originalGetBoundingClientRect.call(this);
        return {
          ...rect,
          x: rect.x + Math.random() * 0.1,
          y: rect.y + Math.random() * 0.1,
          width: rect.width + Math.random() * 0.1,
          height: rect.height + Math.random() * 0.1,
        };
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

    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    });

    console.log("✅ Browser initialized with ultimate anti-detection");
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async randomDelay(min = 3000, max = 8000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async humanLikeBehavior() {
    // Random mouse movements
    const moves = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < moves; i++) {
      await this.page.mouse.move(
        Math.random() * 800 + 100,
        Math.random() * 600 + 100,
        { steps: Math.floor(Math.random() * 10) + 5 }
      );
      await this.delay(Math.random() * 200 + 100);
    }

    // Random scroll
    const scrolls = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < scrolls; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, Math.random() * 500);
      });
      await this.delay(Math.random() * 300 + 200);
    }

    // Random delay
    await this.randomDelay(2000, 5000);
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
              await this.delay(1000);
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Also try pressing Escape key
      try {
        await this.page.keyboard.press("Escape");
        await this.delay(1000);
      } catch (e) {
        // Ignore keyboard errors
      }

      return popupFound;
    } catch (error) {
      console.log(`    ⚠️ Error closing popups: ${error.message}`);
      return false;
    }
  }

  async scrapeNeighborhood(neighborhood) {
    try {
      const url = `https://www.nadlan.gov.il/?view=neighborhood&id=${neighborhood.id}&page=deals`;
      console.log(`  🔍 Scraping: ${neighborhood.name} (ID: ${neighborhood.id})`);
      console.log(`    🌐 Target URL: ${url}`);

      // First, visit the main site to establish session
      console.log(`    🏠 Visiting main site first...`);
      await this.page.goto('https://www.nadlan.gov.il/', { 
        waitUntil: "domcontentloaded", 
        timeout: 30000 
      });
      await this.humanLikeBehavior();

      console.log(`    🌐 Navigating to neighborhood page...`);

      let reloadAttempts = 0;
      const maxReloadAttempts = 15;
      let navigationSuccess = false;

      while (reloadAttempts < maxReloadAttempts && !navigationSuccess) {
        try {
          await this.page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
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
            await this.delay(3000);
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
          await this.delay(5000);
        }
      }

      // Human-like behavior after page load
      await this.humanLikeBehavior();

      // Additional wait for content to load
      await this.delay(5000);
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
      
      console.log(`🎯 Starting to scrape ${targetNeighborhoods.length} specific Tel Aviv neighborhoods...`);
      
      let totalDeals = 0;
      
      for (let i = 0; i < targetNeighborhoods.length; i++) {
        const neighborhood = targetNeighborhoods[i];
        
        const deals = await this.scrapeNeighborhood(neighborhood);
        totalDeals += deals;
        
        // Wait between neighborhoods
        if (i < targetNeighborhoods.length - 1) {
          console.log(`    ⏳ Waiting before next neighborhood...`);
          await this.randomDelay(5000, 10000);
        }
      }
      
      console.log(`\n🎉 Finished scraping Tel Aviv neighborhoods!`);
      console.log(`📊 Total deals found: ${totalDeals}`);
      
    } catch (error) {
      console.error("❌ Error in main execution:", error);
    } finally {
      console.log("🔍 Browser will remain open for debugging. Close manually when done.");
      console.log("⏳ Waiting 60 seconds before closing...");
      await this.delay(60000); // Wait 60 seconds
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the scraper
const scraper = new UltimateAntiDetectionScraper();
scraper.run().catch(console.error);
