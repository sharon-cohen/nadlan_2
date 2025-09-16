const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testNeighborhood65210264() {
  console.log("🧪 Testing neighborhood 65210264...");

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
      "https://www.nadlan.gov.il/?view=neighborhood&id=65210264&page=deals";
    console.log(`🔍 Testing URL: ${testUrl}`);

    // Navigate to the page
    await page.goto(testUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("✅ Page loaded successfully!");

    // Wait a bit for content to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check page title and content
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check for deals table
    const dealsTable = await page.$("table");
    if (dealsTable) {
      console.log("✅ Deals table found!");

      // Count table rows
      const rows = await page.$$("table tr");
      console.log(`📊 Found ${rows.length} table rows`);

      // Check for specific deal data
      const firstRow = await page.$("table tr:not(:first-child)");
      if (firstRow) {
        const cells = await firstRow.$$("td");
        console.log(`📋 First deal row has ${cells.length} cells`);

        // Get text from first few cells
        for (let i = 0; i < Math.min(cells.length, 6); i++) {
          const cellText = await page.evaluate(
            (el) => el.textContent?.trim(),
            cells[i]
          );
          console.log(`  Cell ${i + 1}: ${cellText}`);
        }
      }
    } else {
      console.log("❌ No deals table found");

      // Check what content is actually on the page
      const bodyText = await page.evaluate(() => document.body.textContent);
      console.log("📄 Page content preview:");
      console.log(bodyText.substring(0, 500) + "...");

      // Check for any error messages
      const errorElements = await page.$$("*");
      let hasError = false;
      for (const element of errorElements) {
        const text = await page.evaluate((el) => el.textContent, element);
        if (
          text &&
          (text.includes("חסום") ||
            text.includes("blocked") ||
            text.includes("Access Denied") ||
            text.includes("לא נמצאו עסקאות") ||
            text.includes("אין עסקאות"))
        ) {
          console.log(`⚠️  Possible error/no data message: ${text}`);
          hasError = true;
        }
      }

      if (!hasError) {
        console.log("✅ No error messages detected");
      }
    }

    // Take a screenshot for debugging
    await page.screenshot({
      path: "test_neighborhood_65210264_debug.png",
      fullPage: true,
    });
    console.log("📸 Screenshot saved as test_neighborhood_65210264_debug.png");
  } catch (error) {
    console.error("❌ Error testing neighborhood:", error.message);
  } finally {
    await browser.close();
  }
}

testNeighborhood65210264();






