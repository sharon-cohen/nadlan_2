const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class NadlanPuppeteerStealthScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log("🚀 Starting Nadlan Scraper with Puppeteer Stealth...");

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
        "--ignore-certificate-errors-spki-list",
        "--allow-running-insecure-content",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-images",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });

    this.page = await this.browser.newPage();

    // Set user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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

    console.log("✅ Browser ready");
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

  randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async scrapeSettlement(settlementId, settlementName) {
    try {
      console.log(`\n🏘️  Scraping: ${settlementName} (ID: ${settlementId})`);

      const url = `https://www.nadlan.gov.il/?view=settlement&id=${settlementId}&page=deals`;
      console.log(`🌐 URL: ${url}`);

      // First visit homepage to establish session (only if not already visited)
      const currentUrl = this.page.url();
      if (!currentUrl.includes("nadlan.gov.il")) {
        console.log("🔗 Establishing session...");
        await this.page.goto("https://www.nadlan.gov.il/", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await this.randomDelay(2000, 3000);
      }

      // Navigate to the page
      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      console.log("✅ Page loaded");

      // Wait for content to load
      await this.randomDelay(3000, 5000);

      // Check if table exists and has data
      let tableFound = false;
      let attempts = 0;
      const maxAttempts = 10;

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
            await this.randomDelay(1000, 2000);
          }
        } else {
          console.log(
            `🔍 Table not found, attempt ${attempts + 1}/${maxAttempts}`
          );
          await this.randomDelay(1000, 2000);
        }
        attempts++;
      }

      if (!tableFound) {
        // Check if there's an error message or "no transactions" message
        const pageInfo = await this.page.evaluate(() => {
          const errorMsg = document.querySelector(".error, .alert, .warning");
          const noDataMsg = document.querySelector(
            ".no-data, .empty, .tableSummary"
          );
          const summaryText = document.querySelector(".tableSummary p");

          return {
            hasError: !!errorMsg,
            hasNoData: !!noDataMsg,
            summaryText: summaryText ? summaryText.textContent : "",
            pageText: document.body.textContent,
          };
        });

        console.log("📄 Page info:", pageInfo.summaryText);

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
      const maxPages = 100; // Safety limit

      while (pageNum <= maxPages) {
        console.log(`📄 Extracting page ${pageNum}...`);

        // Extract transactions from current page
        const pageTransactions = await this.page.evaluate(
          ({ settlementId, settlementName }) => {
            const table = document.querySelector("table#dealsTable");
            if (!table) return [];

            const rows = table.querySelectorAll("tbody tr");
            const transactions = [];

            rows.forEach((row, index) => {
              const cells = row.querySelectorAll("td");
              if (cells.length >= 4) {
                // Log column count for first row to debug
                if (index === 0) {
                  console.log(`🔍 Row has ${cells.length} columns`);
                  console.log(
                    `🔍 Column contents:`,
                    Array.from(cells).map((cell) => cell.textContent?.trim())
                  );
                }

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
                  // Add all other columns if they exist
                  column9: cells[9]?.textContent?.trim() || "",
                  column10: cells[10]?.textContent?.trim() || "",
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
          // Look for pagination controls first
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
                // Check if button is enabled (not disabled)
                if (
                  !btn.disabled &&
                  !btn.classList.contains("disabled") &&
                  !btn.classList.contains("inactive") &&
                  btn.offsetParent !== null &&
                  btn.style.display !== "none" &&
                  btn.style.visibility !== "hidden"
                ) {
                  console.log("Found active next button:", text);
                  btn.click();
                  return true;
                } else {
                  console.log("Found disabled next button:", text);
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
              // Check if button is enabled and visible
              if (
                !btn.disabled &&
                !btn.classList.contains("disabled") &&
                !btn.classList.contains("inactive") &&
                btn.offsetParent !== null &&
                btn.style.display !== "none" &&
                btn.style.visibility !== "hidden"
              ) {
                console.log("Found active next button:", text);
                btn.click();
                return true;
              } else {
                console.log("Found disabled next button:", text);
              }
            }
          }
          console.log("No active next button found");
          return false;
        });

        if (!nextButtonClicked) {
          console.log(`📄 No more pages found after page ${pageNum}`);
          break;
        }

        console.log(`📄 Clicked next button, loading page ${pageNum + 1}...`);

        // Wait for new page to load
        await this.randomDelay(2000, 4000);

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
    console.log(`📁 Council path: ${councilPath}`);

    if (transactions.length === 0) {
      console.log("📄 No transactions to save");
      return;
    }

    try {
      // Create CSV content
      const csvHeader =
        "Settlement ID,Settlement Name,Serial Number,Street,Square Meters,Date,Price,Plot,Property Type,Rooms,Floor,Column9,Column10\n";
      const csvRows = transactions
        .map(
          (transaction) =>
            `"${transaction.settlementId}","${transaction.settlementName}","${transaction.serialNumber}","${transaction.street}","${transaction.squareMeters}","${transaction.date}","${transaction.price}","${transaction.plot}","${transaction.propertyType}","${transaction.rooms}","${transaction.floor}","${transaction.column9}","${transaction.column10}"`
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

      // Skip test and start directly from settlement 1000
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
          await this.delay(10000); // Wait 10 seconds
          await this.init();

          // After browser restart, visit homepage first to establish session
          console.log("🔗 Establishing new session...");
          await this.page.goto("https://www.nadlan.gov.il/", {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await this.randomDelay(3000, 5000);
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
const scraper = new NadlanPuppeteerStealthScraper();
scraper.run();
