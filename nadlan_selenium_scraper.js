const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const path = require("path");

class NadlanSeleniumScraper {
  constructor() {
    this.driver = null;
  }

  async init() {
    console.log("🚀 Starting Nadlan Scraper with Selenium...");

    const options = new chrome.Options();
    options.addArguments("--headless");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-setuid-sandbox");
    options.addArguments("--disable-web-security");
    options.addArguments("--disable-features=VizDisplayCompositor");
    options.addArguments("--disable-blink-features=AutomationControlled");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--no-first-run");
    options.addArguments("--disable-background-timer-throttling");
    options.addArguments("--disable-backgrounding-occluded-windows");
    options.addArguments("--disable-renderer-backgrounding");
    options.addArguments("--ignore-certificate-errors");
    options.addArguments("--ignore-ssl-errors");
    options.addArguments("--ignore-certificate-errors-spki-list");
    options.addArguments("--allow-running-insecure-content");
    options.addArguments("--disable-extensions");
    options.addArguments("--disable-plugins");
    options.addArguments("--disable-images");
    options.addArguments("--disable-gpu");

    // Remove automation indicators
    options.addArguments("--disable-blink-features=AutomationControlled");
    options.excludeSwitches("enable-automation");
    options.addArguments("--disable-extensions");

    this.driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // Set window size for headless mode
    await this.driver.manage().window().setSize(1920, 1080);

    // Set additional headers
    await this.driver.executeScript(`
      // Override fetch to add headers
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        if (args[1]) {
          args[1].headers = {
            ...args[1].headers,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          };
        }
        return originalFetch.apply(this, args);
      };
    `);

    // Set user agent and hide automation
    await this.driver.executeScript(`
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Remove automation indicators
      delete window.navigator.__proto__.webdriver;
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['he-IL', 'he', 'en-US', 'en'],
      });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    `);

    console.log("✅ Browser ready");
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      console.log("🔒 Browser closed");
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async randomUserAgent() {
    const userAgents = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    ];

    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.driver.executeScript(`
      Object.defineProperty(navigator, 'userAgent', {
        get: () => '${randomUA}',
      });
    `);
  }

  async scrapeSettlement(settlementId, settlementName) {
    try {
      console.log(`\n🏘️  Scraping: ${settlementName} (ID: ${settlementId})`);

      // Change user agent for this request
      await this.randomUserAgent();

      const url = `https://www.nadlan.gov.il/?view=settlement&id=${settlementId}&page=deals`;
      console.log(`🌐 URL: ${url}`);

      // First visit the main page to establish session
      console.log("🔗 Establishing session...");
      await this.driver.get("https://www.nadlan.gov.il/");
      await this.randomDelay(500, 1500);

      // Now navigate to the deals page
      console.log("📄 Navigating to deals page...");
      await this.driver.get(url);
      console.log("✅ Page loaded");

      // Wait a bit for initial page load
      await this.randomDelay(500, 1500);

      // Wait for content to load - React app needs more time
      console.log("⏳ Waiting for React app to load...");
      await this.randomDelay(1000, 3000);

      // Check if table exists and has data
      let tableFound = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!tableFound && attempts < maxAttempts) {
        try {
          const table = await this.driver.findElement(By.id("dealsTable"));
          if (table) {
            // Check if table has content
            const rows = await this.driver.findElements(
              By.css("table#dealsTable tbody tr")
            );
            if (rows.length > 0) {
              tableFound = true;
              console.log("✅ Table found with content");
            } else {
              console.log(
                `🔍 Table found but no content, attempt ${
                  attempts + 1
                }/${maxAttempts}`
              );
              await this.randomDelay(500, 1000);
            }
          }
        } catch (error) {
          console.log(
            `🔍 Table not found, attempt ${attempts + 1}/${maxAttempts}`
          );
          await this.randomDelay(1000, 2000);
        }
        attempts++;
      }

      if (!tableFound) {
        // Check if there's an error message or "no transactions" message
        try {
          const summaryElement = await this.driver.findElement(
            By.css(".tableSummary p")
          );
          const summaryText = await summaryElement.getText();
          console.log("📄 Page info:", summaryText);

          if (
            summaryText.includes("נמצאו 0 עסקאות") ||
            summaryText.includes("לא נמצאו עסקאות")
          ) {
            console.log("ℹ️  No transactions found for this settlement");
          } else {
            console.log("❌ Table not found or no content after all attempts");
            // Save page for debugging
            const pageSource = await this.driver.getPageSource();
            const debugFileName = `debug_selenium_${settlementName}_${settlementId}.html`;
            fs.writeFileSync(debugFileName, pageSource, "utf8");
            console.log(`🔍 Saved debug page: ${debugFileName}`);
          }
        } catch (error) {
          console.log("❌ Could not find summary text");
        }
        return [];
      }

      // Extract all transactions from all pages
      const allTransactions = [];
      let pageNum = 1;
      const maxPages = 100; // Safety limit

      while (pageNum <= maxPages) {
        console.log(`📄 Extracting page ${pageNum}...`);

        // Extract transactions from current page
        const pageTransactions = await this.driver.executeScript(
          `
          const table = document.querySelector("table#dealsTable");
          if (!table) return [];
          
          const rows = table.querySelectorAll("tbody tr");
          const transactions = [];
          
          rows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 4) {
              const transaction = {
                settlementId: arguments[0],
                settlementName: arguments[1],
                price: cells[0]?.textContent?.trim() || "",
                rooms: cells[1]?.textContent?.trim() || "",
                squareMeters: cells[2]?.textContent?.trim() || "",
                propertyType: cells[3]?.textContent?.trim() || "",
              };
              transactions.push(transaction);
            }
          });
          
          return transactions;
        `,
          settlementId,
          settlementName
        );

        if (pageTransactions && pageTransactions.length > 0) {
          allTransactions.push(...pageTransactions);
          console.log(
            `📊 Found ${pageTransactions.length} transactions on page ${pageNum}`
          );
        }

        // Try to find and click next button
        const nextButtonClicked = await this.driver.executeScript(`
          // Look for pagination controls first
          const pagination = document.querySelector('.pagination, .pager, .page-controls');
          if (pagination) {
            const nextButtons = pagination.querySelectorAll('a, button, span, div');
            for (const btn of nextButtons) {
              const text = (btn.textContent || btn.innerText || "").trim();
              if (text === "הבא" || text === "Next" || text.includes("הבא")) {
                // Check if button is enabled (not disabled) and clickable
                if (!btn.disabled && 
                    !btn.classList.contains('disabled') && 
                    !btn.classList.contains('inactive') &&
                    btn.offsetParent !== null &&
                    btn.style.display !== 'none' &&
                    btn.style.visibility !== 'hidden') {
                  console.log('Found active next button:', text);
                  btn.click();
                  return true;
                } else {
                  console.log('Found disabled next button:', text);
                }
              }
            }
          }
          
          // Also check for any next button in the page
          const allNextButtons = document.querySelectorAll('a, button, span, div');
          for (const btn of allNextButtons) {
            const text = (btn.textContent || btn.innerText || "").trim();
            if (text === "הבא" || text === "Next") {
              // Check if button is enabled and visible
              if (!btn.disabled && 
                  !btn.classList.contains('disabled') && 
                  !btn.classList.contains('inactive') &&
                  btn.offsetParent !== null &&
                  btn.style.display !== 'none' &&
                  btn.style.visibility !== 'hidden') {
                console.log('Found active next button:', text);
                btn.click();
                return true;
              } else {
                console.log('Found disabled next button:', text);
              }
            }
          }
          console.log('No active next button found');
          return false;
        `);

        if (!nextButtonClicked) {
          console.log(`📄 No more pages found after page ${pageNum}`);
          break;
        }

        console.log(`📄 Clicked next button, loading page ${pageNum + 1}...`);

        // Wait for new page to load
        await this.randomDelay(1000, 2000);

        pageNum++;
      }

      console.log(`📊 Total transactions found: ${allTransactions.length}`);

      if (allTransactions.length > 0) {
        // Show first few transactions
        console.log("📋 Sample transactions:");
        allTransactions.slice(0, 3).forEach((transaction, index) => {
          console.log(
            `  ${index + 1}. ${transaction.price} - ${
              transaction.rooms
            } rooms - ${transaction.squareMeters}m² - ${
              transaction.propertyType
            }`
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
    console.log(`📁 Council path: ${councilPath}`);

    if (transactions.length === 0) {
      console.log("📄 No transactions to save");
      return;
    }

    try {
      // Create CSV content
      const csvHeader =
        "Settlement ID,Settlement Name,Price,Rooms,Square Meters,Property Type\n";
      const csvRows = transactions
        .map(
          (transaction) =>
            `"${transaction.settlementId}","${transaction.settlementName}","${transaction.price}","${transaction.rooms}","${transaction.squareMeters}","${transaction.propertyType}"`
        )
        .join("\n");

      const csvContent = csvHeader + csvRows;

      // Create file name and path
      const fileName = `${settlementName}_transactions.csv`;
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
              const settlement = {
                id: columns[0].trim().replace(/"/g, ""),
                name: columns[1].trim().replace(/"/g, ""),
                councilPath: folderPath,
              };

              // Check for duplicates
              const settlementKey = `${settlement.id}-${settlement.name}`;
              if (
                !settlements.find((s) => `${s.id}-${s.name}` === settlementKey)
              ) {
                settlements.push(settlement);
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

      // Skip test and start directly from settlement 90
      console.log("🚀 Starting full scraping process...");

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

        // Restart browser every 5 settlements to avoid detection
        if (i - startIndex > 0 && (i - startIndex) % 5 === 0) {
          console.log("🔄 Restarting browser to avoid detection...");
          await this.close();
          await this.delay(5000); // Wait 5 seconds
          await this.init();
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

        // Small delay between settlements
        await this.randomDelay(3000, 5000);
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
const scraper = new NadlanSeleniumScraper();
scraper.run();
