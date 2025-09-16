const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class FastStealthScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionCount = 0;
    this.maxSessionsBeforeRestart = 3; // Restart browser every 3 sessions
  }

  async init() {
    console.log("🚀 Initializing Fast Stealth Scraper...");

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
      "--disable-javascript", // Disable JS for faster loading
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-client-side-phishing-detection",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-domain-reliability",
      "--disable-component-extensions-with-background-pages",
      "--disable-background-networking",
      "--disable-sync-preferences",
      "--disable-extensions-http-throttling",
      "--disable-ipc-flooding-protection",
      "--aggressive-cache-discard",
      "--force-color-profile=srgb",
      "--metrics-recording-only",
      "--use-mock-keychain",
      "--window-size=1920,1080",
      "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ];

    this.browser = await puppeteer.launch({
      headless: true,
      args: launchArgs,
      ignoreDefaultArgs: ["--enable-automation"],
    });

    this.page = await this.browser.newPage();

    // Set realistic viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Advanced anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["he-IL", "he", "en-US", "en"],
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // Mock chrome object
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };

      // Mock screen properties
      Object.defineProperty(screen, "availHeight", {
        get: () => window.screen.height - 40,
      });
      Object.defineProperty(screen, "availWidth", {
        get: () => window.screen.width,
      });

      // Mock timezone
      Object.defineProperty(Intl.DateTimeFormat.prototype, "resolvedOptions", {
        value: function () {
          return {
            timeZone: "Asia/Jerusalem",
            locale: "he-IL",
          };
        },
      });
    });

    // Set realistic headers
    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
      DNT: "1",
      Connection: "keep-alive",
    });

    // Set realistic timezone and geolocation
    await this.page.emulateTimezone("Asia/Jerusalem");
    await this.page.setGeolocation({ latitude: 31.7683, longitude: 35.2137 });

    console.log("✅ Browser initialized with advanced stealth");
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async randomDelay(min = 500, max = 1500) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async scrapeSettlement(settlementId, settlementName) {
    try {
      console.log(`\n🏘️  Scraping: ${settlementName} (ID: ${settlementId})`);

      const url = `https://www.nadlan.gov.il/?view=settlement&id=${settlementId}&page=deals`;
      console.log(`🌐 URL: ${url}`);

      // Navigate to the page with faster settings
      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      console.log("✅ Page loaded");

      // Wait for content to load (reduced time)
      await this.delay(2000);

      // Check if table exists and has data
      let tableFound = false;
      let attempts = 0;
      const maxAttempts = 5; // Reduced attempts

      while (!tableFound && attempts < maxAttempts) {
        const tableExists = await this.page.$("table#dealsTable");
        if (tableExists) {
          // Check if table has content
          const hasContent = await this.page.evaluate(() => {
            const table = document.querySelector("table#dealsTable");
            if (!table) return false;
            const rows = table.querySelectorAll("tbody tr");
            return rows.length > 0;
          });

          if (hasContent) {
            tableFound = true;
            console.log("✅ Table found with content");
          } else {
            console.log(
              `🔍 Table found but no content, attempt ${
                attempts + 1
              }/${maxAttempts}`
            );
            await this.delay(1000);
          }
        } else {
          console.log(
            `🔍 Table not found, attempt ${attempts + 1}/${maxAttempts}`
          );
          await this.delay(1000);
        }
        attempts++;
      }

      if (!tableFound) {
        // Check if there's a "no transactions" message
        const pageInfo = await this.page.evaluate(() => {
          const summaryText = document.querySelector(".tableSummary p");
          return {
            summaryText: summaryText ? summaryText.textContent : "",
          };
        });

        if (
          pageInfo.summaryText.includes("נמצאו 0 עסקאות") ||
          pageInfo.summaryText.includes("לא נמצאו עסקאות")
        ) {
          console.log("ℹ️  No transactions found for this settlement");
        } else {
          console.log("❌ Table not found or no content after all attempts");
        }
        return [];
      }

      // Extract all transactions from all pages
      const allTransactions = [];
      let pageNum = 1;
      const maxPages = 50; // Reduced max pages for speed

      while (pageNum <= maxPages) {
        console.log(`📄 Extracting page ${pageNum}...`);

        // Extract transactions from current page
        const pageTransactions = await this.page.evaluate(
          ({ settlementId, settlementName }) => {
            const table = document.querySelector("table#dealsTable");
            if (!table) return [];

            const rows = table.querySelectorAll("tbody tr");
            const transactions = [];

            rows.forEach((row) => {
              const cells = row.querySelectorAll("td");
              if (cells.length >= 4) {
                const transaction = {
                  settlementId: settlementId,
                  settlementName: settlementName,
                  serialNumber: cells[0]?.textContent?.trim() || "",
                  street: cells[1]?.textContent?.trim() || "",
                  squareMeters: cells[2]?.textContent?.trim() || "",
                  date: cells[3]?.textContent?.trim() || "",
                  price: (cells[4]?.textContent?.trim() || "")
                    .replace(/[₪,]/g, "")
                    .trim(),
                  plot: cells[5]?.textContent?.trim() || "",
                  propertyType: cells[6]?.textContent?.trim() || "",
                  rooms: cells[7]?.textContent?.trim() || "",
                  floor: cells[8]?.textContent?.trim() || "",
                };
                transactions.push(transaction);
              }
            });

            return transactions;
          },
          { settlementId, settlementName }
        );

        if (pageTransactions && pageTransactions.length > 0) {
          allTransactions.push(...pageTransactions);
          console.log(
            `📊 Found ${pageTransactions.length} transactions on page ${pageNum}`
          );
        }

        // Try to find and click next button
        const nextButtonClicked = await this.page.evaluate(() => {
          // Look for pagination controls
          const pagination = document.querySelector(
            ".pagination, .pager, .page-controls"
          );
          if (pagination) {
            const nextButtons = pagination.querySelectorAll(
              "a, button, span, div"
            );
            for (const btn of nextButtons) {
              const text = (btn.textContent || btn.innerText || "").trim();
              if (text === "הבא" || text === "Next" || text.includes("הבא")) {
                if (
                  !btn.disabled &&
                  !btn.classList.contains("disabled") &&
                  !btn.classList.contains("inactive") &&
                  btn.offsetParent !== null
                ) {
                  btn.click();
                  return true;
                }
              }
            }
          }

          // Also check for any next button in the page
          const allNextButtons = document.querySelectorAll(
            "a, button, span, div"
          );
          for (const btn of allNextButtons) {
            const text = (btn.textContent || btn.innerText || "").trim();
            if (text === "הבא" || text === "Next") {
              if (
                !btn.disabled &&
                !btn.classList.contains("disabled") &&
                !btn.classList.contains("inactive") &&
                btn.offsetParent !== null
              ) {
                btn.click();
                return true;
              }
            }
          }
          return false;
        });

        if (!nextButtonClicked) {
          console.log(`📄 No more pages found after page ${pageNum}`);
          break;
        }

        console.log(`📄 Clicked next button, loading page ${pageNum + 1}...`);

        // Wait for new page to load (reduced time)
        await this.delay(1500);

        pageNum++;
      }

      console.log(`📊 Total transactions found: ${allTransactions.length}`);

      if (allTransactions.length > 0) {
        // Show first few transactions
        console.log("📋 Sample transactions:");
        allTransactions.slice(0, 3).forEach((transaction, index) => {
          console.log(
            `  ${index + 1}. ${transaction.serialNumber} - ${
              transaction.street
            } - ${transaction.squareMeters}m² - ${transaction.date} - ${
              transaction.price
            } - ${transaction.plot} - ${transaction.propertyType} - ${
              transaction.rooms
            } rooms - ${transaction.floor}`
          );
        });
      }

      return allTransactions;
    } catch (error) {
      console.error(`❌ Error scraping ${settlementName}:`, error.message);
      return [];
    }
  }

  async saveToCSV(transactions, settlementName, councilPath) {
    console.log(
      `💾 Attempting to save ${transactions.length} transactions for ${settlementName}`
    );

    if (transactions.length === 0) {
      console.log("📄 No transactions to save");
      return;
    }

    try {
      // Create CSV content
      const csvHeader =
        "Settlement ID,Settlement Name,Serial Number,Street,Square Meters,Date,Price,Plot,Property Type,Rooms,Floor\n";
      const csvRows = transactions
        .map(
          (transaction) =>
            `"${transaction.settlementId}","${transaction.settlementName}","${transaction.serialNumber}","${transaction.street}","${transaction.squareMeters}","${transaction.date}","${transaction.price}","${transaction.plot}","${transaction.propertyType}","${transaction.rooms}","${transaction.floor}"`
        )
        .join("\n");

      const csvContent = csvHeader + csvRows;

      // Create file name and path
      const fileName = `${settlementName}_deals.csv`;
      const filePath = path.join(councilPath, fileName);

      console.log(`📝 Writing to: ${filePath}`);

      // Write to file
      fs.writeFileSync(filePath, csvContent, "utf8");
      console.log(
        `✅ Saved ${transactions.length} transactions to ${fileName}`
      );
    } catch (error) {
      console.error(
        `❌ Error saving CSV for ${settlementName}:`,
        error.message
      );
    }
  }

  async getAllSettlements() {
    const councilsPath = "councils-with-folders";
    const settlements = [];

    try {
      const councilFolders = fs.readdirSync(councilsPath);
      console.log(`📁 Found ${councilFolders.length} council folders`);

      for (const folder of councilFolders) {
        if (folder === "ללא_מועצה_אזורית") continue;

        const folderPath = path.join(councilsPath, folder);

        // Check if it's actually a directory
        const stats = fs.statSync(folderPath);
        if (!stats.isDirectory()) {
          console.log(`⚠️  Skipping non-directory: ${folder}`);
          continue;
        }

        console.log(`📂 Processing council: ${folder}`);

        const csvFiles = fs
          .readdirSync(folderPath)
          .filter((file) => file.endsWith(".csv"));

        for (const csvFile of csvFiles) {
          const csvPath = path.join(folderPath, csvFile);
          const content = fs.readFileSync(csvPath, "utf8");
          const lines = content.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            const columns = line.split(",");
            if (columns.length >= 2) {
              const id = columns[0].trim().replace(/"/g, "");
              const name = columns[1].trim().replace(/"/g, "");

              // Only process settlements with numeric IDs
              if (id && !isNaN(id) && parseInt(id) > 0) {
                const settlement = {
                  id: id,
                  name: name,
                  councilPath: folderPath,
                };

                // Check for duplicates
                const settlementKey = `${settlement.id}-${settlement.name}`;
                if (
                  !settlements.find(
                    (s) => `${s.id}-${s.name}` === settlementKey
                  )
                ) {
                  settlements.push(settlement);
                }
              }
            }
          }
        }
      }

      console.log(`📊 Total unique settlements found: ${settlements.length}`);
      return settlements;
    } catch (error) {
      console.error("❌ Error reading settlements:", error.message);
      return [];
    }
  }

  async run() {
    try {
      await this.init();

      console.log("🚀 Starting fast scraping process...");

      // Run on all settlements
      const settlements = await this.getAllSettlements();

      // Start from settlement 1000 (larger settlements)
      const startIndex = Math.max(
        0,
        settlements.findIndex((s) => parseInt(s.id) >= 1000)
      );
      console.log(`🚀 Starting from settlement index: ${startIndex}`);

      for (let i = startIndex; i < settlements.length; i++) {
        const settlement = settlements[i];
        console.log(`\n📍 Progress: ${i + 1}/${settlements.length}`);

        // Restart browser every 3 settlements to avoid detection
        if (
          this.sessionCount > 0 &&
          this.sessionCount % this.maxSessionsBeforeRestart === 0
        ) {
          console.log("🔄 Restarting browser to avoid detection...");
          await this.close();
          await this.delay(5000); // Wait 5 seconds
          await this.init();

          // After browser restart, visit homepage first to establish session
          console.log("🔗 Establishing new session...");
          await this.page.goto("https://www.nadlan.gov.il/", {
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          await this.delay(2000);
        }

        // Check if CSV already exists
        const csvFile = path.join(
          settlement.councilPath,
          `${settlement.name}_deals.csv`
        );

        if (fs.existsSync(csvFile)) {
          console.log(`⏭️  Skipping ${settlement.name} - CSV already exists`);
          continue;
        }

        const transactions = await this.scrapeSettlement(
          settlement.id,
          settlement.name
        );
        await this.saveToCSV(
          transactions,
          settlement.name,
          settlement.councilPath
        );

        this.sessionCount++;

        // Small delay between settlements (reduced)
        await this.randomDelay(1000, 2000);
      }

      console.log("\n🎉 All settlements scraped!");
    } catch (error) {
      console.error("❌ Scraper error:", error.message);
    } finally {
      await this.close();
    }
  }
}

// Run the scraper
const scraper = new FastStealthScraper();
scraper.run();
