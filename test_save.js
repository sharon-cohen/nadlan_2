const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function testSave() {
  let browser = null;

  try {
    console.log("🧪 Testing save functionality...");

    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );

    // Test with one settlement
    const settlementId = "2060";
    const settlementName = "ברוש";
    const councilPath = "./councils-with-folders/בני_שמעון";

    console.log(`🏘️  Testing with: ${settlementName} (ID: ${settlementId})`);
    console.log(`📁 Council path: ${councilPath}`);

    // Navigate to the page
    const url = `https://www.nadlan.gov.il/?view=settlement&id=${settlementId}&page=deals`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for content
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extract transactions
    const transactions = await page.evaluate(
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

            if (transaction.price || transaction.date || transaction.address) {
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
      // Save to CSV
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

      // Check if directory exists
      if (!fs.existsSync(councilPath)) {
        console.log(`❌ Directory does not exist: ${councilPath}`);
        return;
      }

      fs.writeFileSync(filePath, csvContent, "utf8");
      console.log(
        `✅ Successfully saved ${transactions.length} transactions to ${fileName}`
      );

      // Verify file was created
      if (fs.existsSync(filePath)) {
        console.log(`✅ File exists: ${filePath}`);
        const stats = fs.statSync(filePath);
        console.log(`📊 File size: ${stats.size} bytes`);
      } else {
        console.log(`❌ File was not created: ${filePath}`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testSave();


















