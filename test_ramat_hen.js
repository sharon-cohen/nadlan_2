const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testRamatHen() {
  console.log("🧪 Testing רמת חן (ID: 65210855)...");

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=VizDisplayCompositor",
      "--disable-web-security",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
    ],
  });

  const page = await browser.newPage();

  // Set viewport and user agent
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // Set extra HTTP headers
  await page.setExtraHTTPHeaders({
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
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

  // Override navigator properties
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, "languages", {
      get: () => ["he-IL", "he", "en"],
    });

    Object.defineProperty(navigator, "permissions", {
      get: () => ({
        query: () => Promise.resolve({ state: "granted" }),
      }),
    });
  });

  try {
    const testUrl =
      "https://www.nadlan.gov.il/?view=neighborhood&id=65210855&page=deals";
    console.log(`🔍 Testing URL: ${testUrl}`);

    // Navigate to the page
    await page.goto(testUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("✅ Page loaded successfully!");

    // Wait a bit for content to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check page title and content
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Test the exact same selectors as the main scraper
    const deals = await page.evaluate(() => {
      const selectors = [
        "table tr",
        'table[class*="deals"] tr',
        'table[class*="transactions"] tr',
        '[class*="table"] tr',
        "tbody tr",
        'tr[class*="row"]',
        'tr[class*="deal"]',
      ];

      let rows = [];
      for (let selector of selectors) {
        rows = document.querySelectorAll(selector);
        if (rows.length > 0) {
          console.log(`Found ${rows.length} rows with selector: ${selector}`);
          break;
        }
      }

      // If no rows found, log what's available
      if (rows.length === 0) {
        console.log(
          "No rows found. Available tables:",
          document.querySelectorAll("table").length
        );
        console.log(
          "Available tbody elements:",
          document.querySelectorAll("tbody").length
        );
        console.log(
          "Available tr elements:",
          document.querySelectorAll("tr").length
        );

        // Check if there's a message about no deals
        const noDealsMessage = document.querySelector(
          '[class*="no-deals"], [class*="empty"], [class*="no-data"]'
        );
        if (noDealsMessage) {
          console.log("Found no deals message:", noDealsMessage.textContent);
        }

        // Check page content
        const bodyText = document.body.textContent;
        if (
          bodyText.includes("אין עסקאות") ||
          bodyText.includes("לא נמצאו עסקאות")
        ) {
          console.log("Page indicates no deals available");
        }

        return [];
      }

      const deals = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll("td");

        if (cells.length >= 6) {
          const deal = {
            serialNumber: cells[0]?.textContent?.trim() || "",
            address: cells[1]?.textContent?.trim() || "",
            area: cells[2]?.textContent?.trim() || "",
            date: cells[3]?.textContent?.trim() || "",
            price: (cells[4]?.textContent?.trim() || "").replace(
              /[₪$,\s]/g,
              ""
            ),
            gush: cells[5]?.textContent?.trim() || "",
            propertyType: cells[6]?.textContent?.trim() || "",
            rooms: cells[7]?.textContent?.trim() || "",
            floor: cells[8]?.textContent?.trim() || "",
          };
          deals.push(deal);
        }
      }

      return deals;
    });

    console.log(`📊 Found ${deals.length} deals using main scraper logic`);

    if (deals.length > 0) {
      console.log("✅ Deals found! First deal:");
      console.log(JSON.stringify(deals[0], null, 2));
    } else {
      console.log("❌ No deals found with main scraper logic");

      // Let's also try the simple approach
      const simpleDeals = await page.evaluate(() => {
        const rows = document.querySelectorAll("table tr");
        const deals = [];

        for (let i = 1; i < rows.length; i++) {
          // Skip header
          const row = rows[i];
          const cells = row.querySelectorAll("td");

          if (cells.length >= 6) {
            const deal = {
              serialNumber: cells[0]?.textContent?.trim() || "",
              address: cells[1]?.textContent?.trim() || "",
              area: cells[2]?.textContent?.trim() || "",
              date: cells[3]?.textContent?.trim() || "",
              price: cells[4]?.textContent?.trim() || "",
              gush: cells[5]?.textContent?.trim() || "",
            };
            deals.push(deal);
          }
        }

        return deals;
      });

      console.log(`📊 Found ${simpleDeals.length} deals using simple approach`);
      if (simpleDeals.length > 0) {
        console.log("✅ Simple approach worked! First deal:");
        console.log(JSON.stringify(simpleDeals[0], null, 2));
      }
    }

    // Take a screenshot for debugging
    await page.screenshot({
      path: "test_ramat_hen_debug.png",
      fullPage: true,
    });
    console.log("📸 Screenshot saved as test_ramat_hen_debug.png");
  } catch (error) {
    console.error("❌ Error testing רמת חן:", error.message);
  } finally {
    await browser.close();
  }
}

testRamatHen();














