const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

class NadlanScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log("🚀 Starting Nadlan Scraper...");

    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

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

      // Wait for content to load
      await this.delay(3000);

      // Check if table exists
      const tableExists = await this.page.$("table#dealsTable");
      if (!tableExists) {
        console.log("❌ Table not found");
        return [];
      }

      console.log("✅ Table found");

      // Extract transactions
      const transactions = await this.page.evaluate(
        (id, name) => {
          const results = [];
          const table = document.querySelector("table#dealsTable");

          if (!table) return results;

          const rows = table.querySelectorAll("tbody tr");
          console.log(`Found ${rows.length} rows`);

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

      console.log(`📊 Found ${transactions.length} transactions`);

      if (transactions.length > 0) {
        // Show first few transactions
        transactions.slice(0, 3).forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.address} - ${t.price} - ${t.date}`);
        });
      }

      return transactions;
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
          await this.delay(1000);
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
const scraper = new NadlanScraper();
scraper.run();
