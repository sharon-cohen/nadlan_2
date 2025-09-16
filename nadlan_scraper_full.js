const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

class NadlanScraperFull {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log("🚀 Starting Nadlan Scraper (Full Version)...");

    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });

    this.page = await this.browser.newPage();

    // Set realistic user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // Set additional headers to look more human
    await this.page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    });

    // Remove webdriver property
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    console.log("✅ Browser ready");
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }

  async scrapeSettlement(settlementId, settlementName) {
    try {
      console.log(`\n🏘️  Scraping: ${settlementName} (ID: ${settlementId})`);

      const url = `https://www.nadlan.gov.il/?view=settlement&id=${settlementId}&page=deals`;
      console.log(`🌐 URL: ${url}`);

      // Navigate to the page
      await this.page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      console.log("✅ Page loaded");

      // Wait for content to load - React app needs more time
      await this.randomDelay(5000, 10000);

      // Check if table exists and has data
      let tableFound = false;
      let attempts = 0;
      const maxAttempts = 5;

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
            await this.randomDelay(1500, 3000);
          }
        } else {
          console.log(
            `🔍 Table not found, attempt ${attempts + 1}/${maxAttempts}`
          );
          await this.randomDelay(1500, 3000);
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
          // Save page for debugging
          const pageContent = await this.page.content();
          const debugFileName = `debug_${settlementName}_${settlementId}.html`;
          fs.writeFileSync(debugFileName, pageContent, "utf8");
          console.log(`🔍 Saved debug page: ${debugFileName}`);
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
          (id, name) => {
            const results = [];
            const table = document.querySelector("table#dealsTable");

            if (!table) return results;

            const rows = table.querySelectorAll("tbody tr");
            console.log(`Found ${rows.length} rows on current page`);

            rows.forEach((row, index) => {
              const cells = row.querySelectorAll("td");

              if (cells.length >= 5) {
                const transaction = {
                  settlement_id: id,
                  settlement_name: name,
                  transaction_id: cells[0]?.textContent?.trim() || "",
                  address: cells[1]?.textContent?.trim() || "",
                  square_meters: cells[2]?.textContent?.trim() || "",
                  date: cells[3]?.textContent?.trim() || "",
                  price: cells[4]?.textContent?.trim() || "",
                  gush_chelka: cells[5]?.textContent?.trim() || "",
                  property_type: cells[6]?.textContent?.trim() || "",
                  rooms: cells[7]?.textContent?.trim() || "",
                  floor: cells[8]?.textContent?.trim() || "",
                  nadlan_url: `https://www.nadlan.gov.il/?view=settlement&id=${id}&page=deals`,
                };

                // Clean price
                if (transaction.price) {
                  const priceMatch = transaction.price.match(/[\d,]+/);
                  if (priceMatch) {
                    transaction.price = priceMatch[0];
                  }
                }

                // Only add if we have meaningful data
                if (
                  transaction.price ||
                  transaction.date ||
                  transaction.address
                ) {
                  results.push(transaction);
                }
              }
            });

            return results;
          },
          settlementId,
          settlementName
        );

        if (pageTransactions.length > 0) {
          allTransactions.push(...pageTransactions);
          console.log(
            `📊 Found ${pageTransactions.length} transactions on page ${pageNum}`
          );
        }

        // Try to find and click next button
        const hasNextPage = await this.page.evaluate(() => {
          // Look for next button
          const nextButtons = document.querySelectorAll("a, button, span, div");
          for (const btn of nextButtons) {
            const text = (btn.textContent || btn.innerText || "").trim();
            if (text === "הבא" || text === "Next" || text === ">") {
              if (btn.offsetParent !== null && !btn.disabled) {
                return true;
              }
            }
          }
          return false;
        });

        if (!hasNextPage) {
          console.log(`📄 No more pages found after page ${pageNum}`);
          break;
        }

        // Try to click next button
        const clicked = await this.page.evaluate(() => {
          const nextButtons = document.querySelectorAll("a, button, span, div");
          for (const btn of nextButtons) {
            const text = (btn.textContent || btn.innerText || "").trim();
            if (text === "הבא" || text === "Next" || text === ">") {
              if (btn.offsetParent !== null && !btn.disabled) {
                btn.click();
                return true;
              }
            }
          }
          return false;
        });

        if (!clicked) {
          console.log(`📄 Could not click next button on page ${pageNum}`);
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
        allTransactions.slice(0, 3).forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.address} - ${t.price} - ${t.date}`);
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
      const headers = [
        "settlement_id",
        "settlement_name",
        "transaction_id",
        "address",
        "square_meters",
        "date",
        "price",
        "gush_chelka",
        "property_type",
        "rooms",
        "floor",
        "nadlan_url",
      ];

      const csvContent = [
        headers.join(","),
        ...transactions.map((t) =>
          headers
            .map((h) => `"${(t[h] || "").toString().replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

      const fileName = `${settlementName}_transactions.csv`;
      const filePath = path.join(councilPath, fileName);

      console.log(`📝 Writing to: ${filePath}`);

      fs.writeFileSync(filePath, csvContent, "utf8");
      console.log(
        `✅ Successfully saved ${transactions.length} transactions to ${fileName}`
      );
    } catch (error) {
      console.error("❌ Error saving CSV:", error.message);
      console.error("❌ Error details:", error);
    }
  }

  async getAllSettlements() {
    const settlements = [];
    const seenSettlements = new Set(); // To avoid duplicates
    const councilsPath = "./councils-with-folders";

    try {
      const councilFolders = fs.readdirSync(councilsPath);

      for (const folder of councilFolders) {
        if (folder === "ללא_מועצה_אזורית") continue;

        const folderPath = path.join(councilsPath, folder);

        // Check if it's actually a directory
        const stats = fs.statSync(folderPath);
        if (!stats.isDirectory()) {
          console.log(`⚠️  Skipping ${folder} (not a directory)`);
          continue;
        }

        const csvFiles = fs
          .readdirSync(folderPath)
          .filter((f) => f.endsWith(".csv"));

        for (const csvFile of csvFiles) {
          const csvPath = path.join(folderPath, csvFile);
          console.log(`📄 Reading CSV: ${csvPath}`);
          const content = fs.readFileSync(csvPath, "utf8");
          const lines = content.split("\n").filter((l) => l.trim());

          // Skip header
          for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(",");
            if (columns.length >= 2) {
              const settlement = {
                id: columns[0].trim().replace(/"/g, ""), // Remove quotes
                name: columns[1].trim().replace(/"/g, ""), // Remove quotes
                councilPath: folderPath,
              };

              // Check for duplicates
              const settlementKey = `${settlement.id}-${settlement.name}`;
              if (!seenSettlements.has(settlementKey)) {
                seenSettlements.add(settlementKey);
                settlements.push(settlement);
                console.log(
                  `  ➕ Added settlement: ${settlement.name} (ID: ${settlement.id})`
                );
              } else {
                console.log(
                  `  ⚠️  Skipping duplicate: ${settlement.name} (ID: ${settlement.id})`
                );
              }
            }
          }
        }
      }

      console.log(`📊 Found ${settlements.length} settlements`);
      return settlements;
    } catch (error) {
      console.error("❌ Error reading settlements:", error.message);
      return [];
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async run() {
    try {
      await this.init();

      // Test with one settlement first
      console.log("🧪 Testing with one settlement...");
      const testTransactions = await this.scrapeSettlement("2060", "ברוש");

      if (testTransactions.length > 0) {
        console.log("✅ Test successful!");

        // Test completed, now run on all settlements
        console.log("\n🎯 Test completed. The scraper is working!");
        console.log("🚀 Now running on all settlements...");

        // Run on all settlements
        const settlements = await this.getAllSettlements();

        for (let i = 0; i < settlements.length; i++) {
          const settlement = settlements[i];
          console.log(`\n📍 Progress: ${i + 1}/${settlements.length}`);

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
          await this.randomDelay(2000, 5000);
        }

        console.log("\n🎉 All settlements scraped!");
      } else {
        console.log("❌ Test failed - no transactions found");
      }
    } catch (error) {
      console.error("❌ Scraper error:", error.message);
    } finally {
      await this.close();
    }
  }
}

// Run the scraper
const scraper = new NadlanScraperFull();
scraper.run();
