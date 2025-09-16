const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function debugNeighborhood() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    slowMo: 100, // Slow down actions
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
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

  // Remove webdriver property
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });

  // Set extra headers
  await page.setExtraHTTPHeaders({
    "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
  });

  try {
    // Test with a specific neighborhood
    const url =
      "https://www.nadlan.gov.il/?view=neighborhood&id=65211094&page=deals";
    console.log("🔍 Navigating to:", url);

    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check what's on the page
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        tables: document.querySelectorAll("table").length,
        tbody: document.querySelectorAll("tbody").length,
        tr: document.querySelectorAll("tr").length,
        td: document.querySelectorAll("td").length,
        bodyText: document.body.textContent.substring(0, 500),
      };
    });

    console.log("📊 Page info:", pageContent);

    // Check for specific elements
    const elements = await page.evaluate(() => {
      const selectors = [
        "table tbody tr",
        ".deals-table tbody tr",
        '[class*="deal"] tr',
        ".data-table tbody tr",
        "table tr",
        ".table tr",
        '[class*="table"] tr',
        "tbody tr",
        'tr[class*="row"]',
        'tr[class*="deal"]',
      ];

      const results = {};
      selectors.forEach((selector) => {
        results[selector] = document.querySelectorAll(selector).length;
      });

      return results;
    });

    console.log("🔍 Element counts:", elements);

    // Check for error messages
    const errorMessages = await page.evaluate(() => {
      const errorSelectors = [
        '[class*="error"]',
        '[class*="no-deals"]',
        '[class*="empty"]',
        '[class*="no-data"]',
        ".alert",
        ".warning",
      ];

      const messages = [];
      errorSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el.textContent.trim()) {
            messages.push(el.textContent.trim());
          }
        });
      });

      return messages;
    });

    console.log("⚠️ Error messages:", errorMessages);

    // Keep browser open for manual inspection
    console.log(
      "🔍 Browser is open for manual inspection. Press Ctrl+C to close."
    );
    await new Promise(() => {}); // Keep running
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    // await browser.close();
  }
}

debugNeighborhood();
