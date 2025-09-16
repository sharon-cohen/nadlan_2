#!/usr/bin/env node
/**
 * Nadlan Deals Scraper
 * חולץ את כל העסקאות מכל הישובים באתר נדל"ן
 */

const fs = require("fs");
const path = require("path");
const { createWriteStream } = require("fs");
const { pipeline } = require("stream");
const { promisify } = require("util");
const pipelineAsync = promisify(pipeline);

// Import puppeteer for web scraping
let puppeteer;
try {
  puppeteer = require("puppeteer");
} catch (error) {
  console.log("⚠️  Puppeteer not installed. Installing...");
  const { execSync } = require("child_process");
  try {
    execSync("npm install puppeteer", { stdio: "inherit" });
    puppeteer = require("puppeteer");
    console.log("✅ Puppeteer installed successfully");
  } catch (installError) {
    console.error("❌ Failed to install puppeteer:", installError.message);
    process.exit(1);
  }
}

class NadlanDealsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.councilsPath = "./councils-with-folders";
    this.totalSettlements = 0;
    this.processedSettlements = 0;
    this.totalTransactions = 0;
  }

  async init() {
    console.log("🚀 Starting Nadlan Deals Scraper...");

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    this.page = await this.browser.newPage();

    // Set user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    console.log("✅ Browser initialized successfully");
  }

  async readCSVFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const settlements = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          // Parse CSV line (handle quoted fields)
          const fields = this.parseCSVLine(line);
          if (fields.length >= 4) {
            settlements.push({
              id: fields[0].replace(/"/g, ""),
              nameHebrew: fields[1].replace(/"/g, ""),
              nameEnglish: fields[2].replace(/"/g, ""),
              nadlanUrl: fields[3].replace(/"/g, ""),
            });
          }
        }
      }

      return settlements;
    } catch (error) {
      console.error(`❌ Error reading CSV file ${filePath}:`, error.message);
      return [];
    }
  }

  parseCSVLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    fields.push(current);
    return fields;
  }

  async getAllSettlements() {
    console.log("📋 Reading all settlements from CSV files...");

    const allSettlements = [];
    const councilsDir = fs.readdirSync(this.councilsPath);

    for (const councilFolder of councilsDir) {
      const councilPath = path.join(this.councilsPath, councilFolder);
      const stat = fs.statSync(councilPath);

      // Skip if not a directory or if it's the "ללא_מועצה_אזורית" folder
      if (!stat.isDirectory() || councilFolder === "ללא_מועצה_אזורית") {
        continue;
      }

      // Look for CSV file in the council folder
      const files = fs.readdirSync(councilPath);
      const csvFile = files.find((file) => file.endsWith(".csv"));

      if (csvFile) {
        const csvPath = path.join(councilPath, csvFile);
        const settlements = await this.readCSVFile(csvPath);

        // Add council info to each settlement
        settlements.forEach((settlement) => {
          settlement.councilFolder = councilFolder;
          settlement.councilPath = councilPath;
        });

        allSettlements.push(...settlements);
        console.log(
          `   📊 Added ${settlements.length} settlements from ${councilFolder}`
        );
      }
    }

    this.totalSettlements = allSettlements.length;
    console.log(`✅ Total settlements found: ${this.totalSettlements}`);

    return allSettlements;
  }

  async scrapeSettlementDeals(settlement) {
    try {
      console.log(
        `🔍 Scraping deals for ${settlement.nameHebrew} (ID: ${settlement.id})`
      );

      // Navigate to the settlement deals page
      const dealsUrl = `https://www.nadlan.gov.il/?view=settlement&id=${settlement.id}&page=deals`;
      await this.page.goto(dealsUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for the page to load completely
      await this.page.waitForTimeout(2000);

      // Extract transactions
      const transactions = await this.extractTransactions(settlement);

      if (transactions.length > 0) {
        // Save transactions to CSV
        await this.saveTransactionsToCSV(transactions, settlement);
        this.totalTransactions += transactions.length;
        console.log(
          `   ✅ Found ${transactions.length} transactions for ${settlement.nameHebrew}`
        );
      } else {
        console.log(
          `   ⚠️  No transactions found for ${settlement.nameHebrew}`
        );
      }

      this.processedSettlements++;

      // Be respectful to the server
      await this.page.waitForTimeout(2000);
    } catch (error) {
      console.error(
        `   ❌ Error scraping ${settlement.nameHebrew}:`,
        error.message
      );
    }
  }

  async extractTransactions(settlement) {
    try {
      // Wait for the deals table to appear
      await this.page.waitForSelector("table#dealsTable", { timeout: 10000 });

      // Simple wait for data to load
      await this.page.waitForTimeout(2000);

      // Extract transactions from the table
      const transactions = await this.page.evaluate((settlementData) => {
        const results = [];
        const table = document.querySelector("table#dealsTable");

        if (!table) return results;

        // Find all transaction rows
        const rows = table.querySelectorAll("tbody tr");

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

      console.log(`      📊 Found ${transactions.length} transactions`);
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
    const allTransactions = [];
    let attempts = 0;
    const maxAttempts = 10;

    try {
      while (attempts < maxAttempts) {
        // Look for "Load More" or "Show More" buttons
        const loadMoreClicked = await this.page.evaluate(() => {
          const selectors = [
            '[data-testid*="load-more"]',
            '[class*="load-more"]',
            '[class*="show-more"]',
            'button[onclick*="load"]',
            'button[onclick*="more"]',
          ];

          for (const selector of selectors) {
            try {
              const element = document.querySelector(selector);
              if (
                element &&
                element.offsetParent !== null &&
                !element.disabled
              ) {
                element.click();
                return true;
              }
            } catch (e) {
              // Continue to next selector
            }
          }

          // Look for any button that might load more content
          const allButtons = document.querySelectorAll("button, a");
          for (const btn of allButtons) {
            const text = btn.textContent || btn.innerText || "";
            if (
              text.includes("הצג") ||
              text.includes("עוד") ||
              text.includes("Load") ||
              text.includes("More")
            ) {
              if (btn.offsetParent !== null && !btn.disabled) {
                btn.click();
                return true;
              }
            }
          }

          return false;
        });

        if (!loadMoreClicked) {
          break;
        }

        await this.page.waitForTimeout(3000);

        // Extract new transactions that appeared
        const newTransactions = await this.page.evaluate((settlementData) => {
          const results = [];
          const table = document.querySelector("table#dealsTable");

          if (!table) return results;

          const rows = table.querySelectorAll("tbody tr");

          rows.forEach((row) => {
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

                if (transaction.price) {
                  const priceMatch = transaction.price.match(/[\d,]+/);
                  if (priceMatch) {
                    transaction.price = priceMatch[0];
                  }
                }

                if (
                  transaction.price ||
                  transaction.date ||
                  transaction.address
                ) {
                  results.push(transaction);
                }
              }
            } catch (error) {
              console.error("Error parsing load more row:", error);
            }
          });

          return results;
        }, settlement);

        if (newTransactions.length > 0) {
          allTransactions.push(...newTransactions);
          console.log(
            `      📄 Loaded ${newTransactions.length} more transactions`
          );
        } else {
          break;
        }

        attempts++;
      }
    } catch (error) {
      console.error(
        `Error handling load more buttons for ${settlement.nameHebrew}:`,
        error.message
      );
    }

    return allTransactions;
  }

  async handleScrollLoading(settlement) {
    const allTransactions = [];

    try {
      // Scroll to bottom of page to trigger lazy loading
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await this.page.waitForTimeout(3000);

      // Try scrolling a few more times
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => {
          window.scrollBy(0, 1000);
        });
        await this.page.waitForTimeout(2000);
      }

      // Extract any new transactions that appeared
      const newTransactions = await this.page.evaluate((settlementData) => {
        const results = [];
        const table = document.querySelector("table#dealsTable");

        if (!table) return results;

        const rows = table.querySelectorAll("tbody tr");

        rows.forEach((row) => {
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

              if (transaction.price) {
                const priceMatch = transaction.price.match(/[\d,]+/);
                if (priceMatch) {
                  transaction.price = priceMatch[0];
                }
              }

              if (
                transaction.price ||
                transaction.date ||
                transaction.address
              ) {
                results.push(transaction);
              }
            }
          } catch (error) {
            console.error("Error parsing scroll row:", error);
          }
        });

        return results;
      }, settlement);

      if (newTransactions.length > 0) {
        allTransactions.push(...newTransactions);
        console.log(
          `      📄 Found ${newTransactions.length} transactions after scrolling`
        );
      }
    } catch (error) {
      console.error(
        `Error handling scroll loading for ${settlement.nameHebrew}:`,
        error.message
      );
    }

    return allTransactions;
  }

  removeDuplicateTransactions(transactions) {
    const seen = new Set();
    const unique = [];

    for (const transaction of transactions) {
      // Create a unique key based on transaction_id or combination of fields
      const key =
        transaction.transaction_id ||
        `${transaction.date}_${transaction.price}_${transaction.address}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(transaction);
      }
    }

    return unique;
  }

  async saveTransactionsToCSV(transactions, settlement) {
    try {
      // Create safe filename
      const safeName = settlement.nameHebrew
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, "_");
      const csvFilename = `${safeName}_transactions.csv`;
      const csvPath = path.join(settlement.councilPath, csvFilename);

      // Create CSV content
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

      let csvContent = headers.join(",") + "\n";

      transactions.forEach((transaction) => {
        const row = headers.map((header) => {
          const value = transaction[header] || "";
          // Escape commas and quotes in CSV
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvContent += row.join(",") + "\n";
      });

      // Write to file
      fs.writeFileSync(csvPath, csvContent, "utf8");
      console.log(
        `   💾 Saved ${transactions.length} transactions to ${csvFilename}`
      );
    } catch (error) {
      console.error(
        `Error saving CSV for ${settlement.nameHebrew}:`,
        error.message
      );
    }
  }

  async scrapeAllSettlements() {
    try {
      await this.init();

      const settlements = await this.getAllSettlements();

      if (settlements.length === 0) {
        console.log("❌ No settlements found!");
        return;
      }

      console.log(
        `\n🚀 Starting to scrape ${settlements.length} settlements...\n`
      );

      // Process settlements one by one
      for (let i = 0; i < settlements.length; i++) {
        const settlement = settlements[i];
        console.log(
          `\n[${i + 1}/${settlements.length}] Processing: ${
            settlement.nameHebrew
          }`
        );

        await this.scrapeSettlementDeals(settlement);

        // Progress update every 10 settlements
        if ((i + 1) % 10 === 0) {
          console.log(
            `\n📊 Progress: ${i + 1}/${
              settlements.length
            } settlements processed`
          );
          console.log(
            `📊 Total transactions collected so far: ${this.totalTransactions}`
          );
        }
      }

      console.log("\n🎉 Scraping completed!");
      console.log(
        `📊 Total settlements processed: ${this.processedSettlements}`
      );
      console.log(`📊 Total transactions collected: ${this.totalTransactions}`);
    } catch (error) {
      console.error("❌ Error during scraping:", error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log("🔒 Browser closed");
      }
    }
  }
}

// Main execution
async function main() {
  console.log("🏙️  Nadlan Deals Scraper - JavaScript Version");
  console.log("===============================================\n");

  const scraper = new NadlanDealsScraper();
  await scraper.scrapeAllSettlements();

  console.log(
    "\n✨ All done! Check the council folders for transaction CSV files."
  );
}

// Run the scraper
if (require.main === module) {
  main().catch(console.error);
}

module.exports = NadlanDealsScraper;
