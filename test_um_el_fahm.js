const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function testUmElFahm() {
  console.log("🔍 Testing אום אל-פחם with updated selectors...");

  const browser = await puppeteer.launch({
    headless: false,
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

  try {
    const page = await browser.newPage();

    // Set random viewport
    await page.setViewport({
      width: 1366 + Math.floor(Math.random() * 100),
      height: 768 + Math.floor(Math.random() * 100),
    });

    // Set random user agent
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];
    await page.setUserAgent(
      userAgents[Math.floor(Math.random() * userAgents.length)]
    );

    const url = "https://www.nadlan.gov.il/?view=settlement&id=2710&page=deals";
    console.log(`🌐 Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    console.log("⏳ Page loaded, waiting for content...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Test the updated selectors
    const selectors = [
      "#dealsTable tbody tr",
      ".mainTable tbody tr",
      "table tbody tr",
      ".deals-table tbody tr",
      '[class*="deal"] tr',
      ".mainTable__row",
      "#dealsTable .mainTable__row",
    ];

    let dealsFound = false;
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      console.log(`🔍 Selector "${selector}": ${elements.length} elements`);

      if (elements.length > 0 && !dealsFound) {
        dealsFound = true;
        console.log(`✅ Found deals with selector: ${selector}`);

        // Test extracting deals
        const deals = await page.evaluate((sel) => {
          const rows = document.querySelectorAll(sel);
          const deals = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll("td");

            // Skip header row (no cells) and ensure we have enough cells for a deal
            if (cells.length >= 6) {
              const deal = {
                serialNumber: cells[0]?.textContent?.trim() || "",
                address: cells[1]?.textContent?.trim() || "",
                area: cells[2]?.textContent?.trim() || "",
                date: cells[3]?.textContent?.trim() || "",
                price: (cells[4]?.textContent?.trim() || "").replace(
                  /[₪$,\s]/g,
                  ""
                ), // Remove currency symbols and commas
                gush: cells[5]?.textContent?.trim() || "",
                propertyType: cells[6]?.textContent?.trim() || "",
                rooms: cells[7]?.textContent?.trim() || "",
                floor: cells[8]?.textContent?.trim() || "",
              };
              deals.push(deal);
            }
          }

          return deals;
        }, selector);

        console.log(`📊 Extracted ${deals.length} deals`);
        if (deals.length > 0) {
          console.log("📊 Sample deal:", deals[0]);
        }
      }
    }

    if (!dealsFound) {
      console.log("❌ No deals found with any selector");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await browser.close();
  }
}

testUmElFahm();





