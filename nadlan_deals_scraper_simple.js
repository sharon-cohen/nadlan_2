const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

class NadlanDealsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log("🚀 Initializing Nadlan Deals Scraper...");
    this.browser = await puppeteer.launch({
      headless: "new", // Use new headless mode
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    // Wait for the page to be ready
    await this.page.waitForTimeout(2000);

    console.log("✅ Browser initialized successfully");
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }

  readCSVFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n").filter((line) => line.trim());
      const settlements = [];

      for (let i = 1; i < lines.length; i++) {
        // Skip header row
        const settlement = this.parseCSVLine(lines[i]);
        if (settlement) {
          settlements.push(settlement);
        }
      }

      return settlements;
    } catch (error) {
      console.error(`Error reading CSV file ${filePath}:`, error.message);
      return [];
    }
  }

  parseCSVLine(line) {
    try {
      const columns = line.split(",");
      if (columns.length >= 2) {
        return {
          id: columns[0].trim(),
          nameHebrew: columns[1].trim(),
          nameEnglish: columns[2] ? columns[2].trim() : "",
        };
      }
    } catch (error) {
      console.error("Error parsing CSV line:", error.message);
    }
    return null;
  }

  async getAllSettlements() {
    const settlements = [];
    const councilsPath = "./councils-with-folders";

    try {
      const councilFolders = fs.readdirSync(councilsPath);

      for (const folder of councilFolders) {
        if (folder === "ללא_מועצה_אזורית") {
          continue; // Skip this folder as requested
        }

        const folderPath = path.join(councilsPath, folder);
        const csvFiles = fs
          .readdirSync(folderPath)
          .filter((file) => file.endsWith(".csv"));

        for (const csvFile of csvFiles) {
          const csvPath = path.join(folderPath, csvFile);
          const folderSettlements = this.readCSVFile(csvPath);

          for (const settlement of folderSettlements) {
            settlement.councilFolder = folder;
            settlement.councilPath = folderPath;
            settlement.nadlanUrl = `https://www.nadlan.gov.il/?view=settlement&id=${settlement.id}&page=deals`;
            settlements.push(settlement);
          }
        }
      }

      console.log(`📊 Found ${settlements.length} settlements to scrape`);
      return settlements;
    } catch (error) {
      console.error("Error getting settlements:", error.message);
      return [];
    }
  }

  async scrapeSettlementDeals(settlement) {
    try {
      console.log(
        `🏘️  Scraping deals for ${settlement.nameHebrew} (ID: ${settlement.id})`
      );

      const dealsUrl = `https://www.nadlan.gov.il/?view=settlement&id=${settlement.id}&page=deals`;

      // Navigate with better error handling
      try {
        // First, make sure the page is ready
        await this.page.waitForTimeout(1000);

        await this.page.goto(dealsUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        // Wait for the page to be fully loaded
        await this.page.waitForTimeout(3000);
      } catch (navError) {
        console.log(
          `⚠️  Navigation error for ${settlement.nameHebrew}, retrying...`
        );
        await this.page.waitForTimeout(5000);

        try {
          await this.page.goto(dealsUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await this.page.waitForTimeout(3000);
        } catch (retryError) {
          console.log(`⚠️  Retry failed, trying with load event...`);
          await this.page.goto(dealsUrl, {
            waitUntil: "load",
            timeout: 30000,
          });
          await this.page.waitForTimeout(3000);
        }
      }

      // Wait for the page to load completely
      await this.page.waitForTimeout(3000);

      // Extract transactions
      const transactions = await this.extractTransactions(settlement);

      if (transactions.length > 0) {
        await this.saveTransactionsToCSV(transactions, settlement);
        console.log(
          `✅ Successfully scraped ${transactions.length} transactions for ${settlement.nameHebrew}`
        );
      } else {
        console.log(`⚠️  No transactions found for ${settlement.nameHebrew}`);
      }

      await this.page.waitForTimeout(1000); // Small delay between settlements
    } catch (error) {
      console.error(
        `❌ Error scraping ${settlement.nameHebrew}:`,
        error.message
      );
    }
  }

  async extractTransactions(settlement) {
    try {
      // Wait for the deals table to appear with retry logic
      let tableFound = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!tableFound && attempts < maxAttempts) {
        try {
          // Wait for the table to appear
          await this.page.waitForSelector("table#dealsTable", {
            timeout: 8000,
          });

          // Check if table has content
          const hasContent = await this.page.evaluate(() => {
            const table = document.querySelector("table#dealsTable");
            if (!table) return false;
            const rows = table.querySelectorAll("tbody tr");
            return rows.length > 0;
          });

          if (hasContent) {
            tableFound = true;
          } else {
            console.log(
              `      🔍 Table found but no content, attempt ${
                attempts + 1
              }/${maxAttempts}`
            );
            await this.page.waitForTimeout(3000);
          }
        } catch (e) {
          attempts++;
          console.log(
            `      🔍 Table not found, attempt ${attempts}/${maxAttempts}`
          );
          await this.page.waitForTimeout(3000);
        }
      }

      if (!tableFound) {
        console.log(`      ⚠️  Table not found after ${maxAttempts} attempts`);
        return [];
      }

      // Wait for data to load
      await this.page.waitForTimeout(2000);

      // Extract transactions from the table
      const transactions = await this.page.evaluate((settlementData) => {
        const results = [];
        const table = document.querySelector("table#dealsTable");

        if (!table) {
          console.log("Table not found in page evaluation");
          return results;
        }

        // Find all transaction rows
        const rows = table.querySelectorAll("tbody tr");
        console.log(`Found ${rows.length} rows in table`);

        rows.forEach((row, index) => {
          try {
            const cells = row.querySelectorAll("td");

            if (cells.length >= 5) {
              const transaction = {
                settlement_id: settlementData.id,
                settlement_name: settlementData.nameHebrew,
                transaction_id: cells[0] ? cells[0].textContent.trim() : "",
                address: cells[1] ? cells[1].textContent.trim() : "",
                square_meters: cells[2] ? cells[2].textContent.trim() : "",
                date: cells[3] ? cells[3].textContent.trim() : "",
                price: cells[4] ? cells[4].textContent.trim() : "",
                gush_chelka: cells[5] ? cells[5].textContent.trim() : "",
                property_type: cells[6] ? cells[6].textContent.trim() : "",
                rooms: cells[7] ? cells[7].textContent.trim() : "",
                floor: cells[8] ? cells[8].textContent.trim() : "",
                nadlan_url: `https://www.nadlan.gov.il/?view=settlement&id=${settlementData.id}&page=deals`,
              };

              // Clean price (remove currency symbols)
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
          } catch (error) {
            console.error("Error parsing row:", error);
          }
        });

        return results;
      }, settlement);

      console.log(`📊 Found ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error(
        `Error extracting transactions for ${settlement.nameHebrew}:`,
        error.message
      );
      return [];
    }
  }

  async saveTransactionsToCSV(transactions, settlement) {
    if (transactions.length === 0) {
      console.log(`📄 No transactions to save for ${settlement.nameHebrew}`);
      return;
    }

    try {
      const csvContent = this.generateCSV(transactions);
      const fileName = `${settlement.nameHebrew}_transactions.csv`;
      const filePath = `${settlement.councilPath}/${fileName}`;

      fs.writeFileSync(filePath, csvContent, "utf8");
      console.log(
        `💾 Saved ${transactions.length} transactions to ${fileName}`
      );
    } catch (error) {
      console.error(
        `Error saving CSV for ${settlement.nameHebrew}:`,
        error.message
      );
    }
  }

  generateCSV(transactions) {
    if (transactions.length === 0) return "";

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

    const csvRows = [headers.join(",")];

    transactions.forEach((transaction) => {
      const row = headers.map((header) => {
        const value = transaction[header] || "";
        // Escape commas and quotes in CSV
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }

  async run() {
    try {
      await this.init();
      const settlements = await this.getAllSettlements();

      if (settlements.length === 0) {
        console.log("❌ No settlements found to scrape");
        return;
      }

      console.log(`🚀 Starting to scrape ${settlements.length} settlements...`);

      for (let i = 0; i < settlements.length; i++) {
        const settlement = settlements[i];
        console.log(
          `\n📍 Progress: ${i + 1}/${settlements.length} - ${
            settlement.nameHebrew
          }`
        );
        await this.scrapeSettlementDeals(settlement);
      }

      console.log("\n🎉 Scraping completed successfully!");
    } catch (error) {
      console.error("❌ Error in main run:", error.message);
    } finally {
      await this.close();
    }
  }
}

// Export for use in other files
module.exports = NadlanDealsScraper;

// Run if this file is executed directly
if (require.main === module) {
  const scraper = new NadlanDealsScraper();
  scraper.run();
}
