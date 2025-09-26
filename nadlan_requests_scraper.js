const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

class NadlanRequestsScraper {
  constructor() {
    this.session = axios.create({
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
      },
    });
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

      // First, get the main page to establish session
      console.log("🔗 Establishing session...");
      await this.session.get("https://www.nadlan.gov.il/");
      await this.randomDelay(2000, 4000);

      // Now get the deals page
      console.log("📄 Fetching deals page...");
      const response = await this.session.get(url);

      if (response.status !== 200) {
        console.log(`❌ HTTP Error: ${response.status}`);
        return [];
      }

      console.log("✅ Page fetched successfully");

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Check if there's a table
      const table = $("#dealsTable");
      if (table.length === 0) {
        console.log("❌ Table not found");

        // Check for error messages
        const summaryText = $(".tableSummary p").text();
        console.log("📄 Page info:", summaryText);

        if (
          summaryText.includes("נמצאו 0 עסקאות") ||
          summaryText.includes("לא נמצאו עסקאות")
        ) {
          console.log("ℹ️  No transactions found for this settlement");
        } else {
          // Save page for debugging
          const debugFileName = `debug_requests_${settlementName}_${settlementId}.html`;
          fs.writeFileSync(debugFileName, response.data, "utf8");
          console.log(`🔍 Saved debug page: ${debugFileName}`);
        }
        return [];
      }

      console.log("✅ Table found");

      // Extract transactions from table
      const transactions = [];
      const rows = table.find("tbody tr");

      rows.each((index, row) => {
        const cells = $(row).find("td");
        if (cells.length >= 4) {
          const transaction = {
            settlementId: settlementId,
            settlementName: settlementName,
            price: $(cells[0]).text().trim(),
            rooms: $(cells[1]).text().trim(),
            squareMeters: $(cells[2]).text().trim(),
            propertyType: $(cells[3]).text().trim(),
          };
          transactions.push(transaction);
        }
      });

      console.log(`📊 Found ${transactions.length} transactions`);

      if (transactions.length > 0) {
        // Show first few transactions
        console.log("📋 Sample transactions:");
        transactions.slice(0, 3).forEach((transaction, index) => {
          console.log(
            `  ${index + 1}. ${transaction.price} - ${
              transaction.rooms
            } rooms - ${transaction.squareMeters}m² - ${
              transaction.propertyType
            }`
          );
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
      console.log("🚀 Starting Nadlan Scraper with Requests...");

      // Test with one settlement first
      console.log("🧪 Testing with one settlement...");
      const testTransactions = await this.scrapeSettlement("2060", "ברוש");

      if (testTransactions.length > 0) {
        console.log("✅ Test successful!");

        // Test completed, now run on all settlements
        console.log("\n🎯 Test completed. The scraper is working!");
        console.log("🚀 Starting full scraping process...");

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
    }
  }
}

// Run the scraper
const scraper = new NadlanRequestsScraper();
scraper.run();


















