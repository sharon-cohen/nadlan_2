const puppeteer = require("puppeteer");

async function testScraper() {
  let browser = null;

  try {
    console.log("🚀 Starting simple test...");

    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );

    console.log("✅ Browser launched");

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Navigate to the page
    const url = "https://www.nadlan.gov.il/?view=settlement&id=2060&page=deals";
    console.log(`🌐 Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("✅ Page loaded");

    // Wait for content
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if table exists
    const tableExists = await page.$("table#dealsTable");
    if (tableExists) {
      console.log("✅ Table found");

      // Get row count
      const rowCount = await page.evaluate(() => {
        const table = document.querySelector("table#dealsTable");
        if (!table) return 0;
        const rows = table.querySelectorAll("tbody tr");
        return rows.length;
      });

      console.log(`📊 Found ${rowCount} rows`);

      if (rowCount > 0) {
        // Extract first few transactions
        const transactions = await page.evaluate(() => {
          const results = [];
          const table = document.querySelector("table#dealsTable");
          if (!table) return results;

          const rows = table.querySelectorAll("tbody tr");

          rows.forEach((row, index) => {
            if (index >= 3) return; // Only get first 3

            const cells = row.querySelectorAll("td");
            if (cells.length >= 5) {
              const transaction = {
                transaction_id: cells[0] ? cells[0].textContent.trim() : "",
                address: cells[1] ? cells[1].textContent.trim() : "",
                square_meters: cells[2] ? cells[2].textContent.trim() : "",
                date: cells[3] ? cells[3].textContent.trim() : "",
                price: cells[4] ? cells[4].textContent.trim() : "",
              };

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
        });

        console.log(
          `🎉 Successfully extracted ${transactions.length} transactions:`
        );
        transactions.forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.address} - ${t.price} - ${t.date}`);
        });
      }
    } else {
      console.log("❌ Table not found");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser closed");
    }
  }
}

testScraper();
