const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class SingleNeighborhoodScraper {
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
      headless: false, // Show browser to see what's happening
      args: launchArgs,
    });
    this.page = await this.browser.newPage();

    // Set viewport and random user agent
    await this.page.setViewport({ width: 1366, height: 768 });

    // Random user agents
    const userAgents = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0",
    ];

    const randomUserAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUserAgent);
    console.log(`🌐 Using User Agent: ${randomUserAgent}`);

    // Set extra HTTP headers
    await this.page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
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
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  async scrapeNeighborhoodDeals(neighborhoodId, neighborhoodName, cityName) {
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

      const allDeals = [];
      let pageNumber = 1;
      let hasNextPage = true;
      const maxDeals = 1000;

      while (hasNextPage && allDeals.length < maxDeals) {
        console.log(`    📄 Processing page ${pageNumber}...`);

        const pageDeals = await this.page.evaluate((currentDealsCount) => {
          const deals = [];

          // Try multiple selectors to find the deals table
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
              console.log(
                `Found ${rows.length} rows with selector: ${selector}`
              );
              break;
            }
          }

          console.log(`Total rows found: ${rows.length}`);

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

            // Check if there's a message about no deals
            const noDealsMessage = document.querySelector(
              '[class*="no-deals"], [class*="empty"], [class*="no-data"]'
            );
            if (noDealsMessage) {
              console.log(
                "Found no deals message:",
                noDealsMessage.textContent
              );
            }

            // Check page content
            const bodyText = document.body.textContent;
            if (
              bodyText.includes("אין עסקאות") ||
              bodyText.includes("לא נמצאו עסקאות")
            ) {
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
                price: (cells[4]?.textContent?.trim() || "").replace(
                  /[₪$,\s]/g,
                  ""
                ),
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
        }, allDeals.length);

        allDeals.push(...pageDeals);
        console.log(
          `📊 Found ${pageDeals.length} deals on page ${pageNumber} (Total: ${allDeals.length})`
        );

        // Check if there's a next page
        hasNextPage = await this.page.evaluate(() => {
          // Look for next page button - more specific selectors
          const nextButtonSelectors = [
            'a[title="הבא"]:not(.disabled):not(.inactive)',
            'a[title="Next"]:not(.disabled):not(.inactive)',
            ".pagination .next:not(.disabled):not(.inactive)",
            ".pager .next:not(.disabled):not(.inactive)",
            '[class*="next"]:not(.disabled):not(.inactive)',
          ];

          for (let selector of nextButtonSelectors) {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null) {
              return true;
            }
          }

          // Check for text content in links
          const allLinks = document.querySelectorAll("a");
          for (let link of allLinks) {
            const text = link.textContent.trim();
            if (
              (text.includes("הבא") || text.includes("Next")) &&
              !link.classList.contains("disabled") &&
              !link.classList.contains("inactive") &&
              link.offsetParent !== null
            ) {
              return true;
            }
          }

          return false;
        });

        if (hasNextPage && allDeals.length < maxDeals) {
          console.log(`    ➡️  Next page available, clicking...`);

          const clicked = await this.page.evaluate(() => {
            const allLinks = document.querySelectorAll("a");
            for (let link of allLinks) {
              const text = link.textContent.trim();
              if (
                (text.includes("הבא") || text.includes("Next")) &&
                !link.classList.contains("disabled") &&
                !link.classList.contains("inactive") &&
                link.offsetParent !== null
              ) {
                link.click();
                return true;
              }
            }
            return false;
          });

          if (clicked) {
            await this.randomDelay(200, 400);
            await this.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            await this.randomDelay(100, 200);
            await this.page.evaluate(() => {
              window.scrollTo(0, 0);
            });
            await this.randomDelay(100, 200);
            pageNumber++;
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      }

      console.log(
        `✅ Scraping completed! Total deals found: ${allDeals.length}`
      );

      if (allDeals.length > 0) {
        // Create CSV content
        const csvHeader =
          "Serial Number,Address,Area,Date,Price,Gush,Property Type,Rooms,Floor\n";
        const csvRows = allDeals
          .map(
            (deal) =>
              `"${deal.serialNumber}","${deal.address}","${deal.area}","${deal.date}","${deal.price}","${deal.gush}","${deal.propertyType}","${deal.rooms}","${deal.floor}"`
          )
          .join("\n");
        const csvContent = csvHeader + csvRows;

        // Save to file
        const fileName = `test_${neighborhoodName}_deals.csv`;
        fs.writeFileSync(fileName, csvContent, "utf8");
        console.log(`💾 Saved ${allDeals.length} deals to ${fileName}`);

        // Show first few deals
        console.log("📋 First 3 deals:");
        allDeals.slice(0, 3).forEach((deal, index) => {
          console.log(
            `  ${index + 1}. ${deal.address} - ${deal.area} sqm - ${
              deal.price
            } ₪`
          );
        });
      } else {
        console.log("❌ No deals found");
      }

      return allDeals;
    } catch (error) {
      console.error("❌ Error scraping neighborhood:", error.message);
      return [];
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new SingleNeighborhoodScraper();
  await scraper.init();

  // Test the specific neighborhood
  await scraper.scrapeNeighborhoodDeals(65210646, "נווה_מדבר", "אילת");

  await scraper.close();
}

main();
