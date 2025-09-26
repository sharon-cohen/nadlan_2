const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function testRegularPage() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser
    slowMo: 100,
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
    // Test main page first
    console.log("🔍 Testing main page...");
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const mainPageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasContent: document.body.textContent.length > 1000,
      };
    });

    console.log("📊 Main page info:", mainPageInfo);

    // Try to navigate to a settlement page
    console.log("🔍 Testing settlement page...");
    await page.goto(
      "https://www.nadlan.gov.il/?view=settlement&id=5000&page=deals",
      {
        waitUntil: "networkidle0",
        timeout: 30000,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const settlementPageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        tables: document.querySelectorAll("table").length,
        tbody: document.querySelectorAll("tbody").length,
        tr: document.querySelectorAll("tr").length,
        td: document.querySelectorAll("td").length,
        hasContent: document.body.textContent.length > 1000,
      };
    });

    console.log("📊 Settlement page info:", settlementPageInfo);

    // Try neighborhood page
    console.log("🔍 Testing neighborhood page...");
    await page.goto(
      "https://www.nadlan.gov.il/?view=neighborhood&id=65211094&page=deals",
      {
        waitUntil: "networkidle0",
        timeout: 30000,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const neighborhoodPageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        tables: document.querySelectorAll("table").length,
        tbody: document.querySelectorAll("tbody").length,
        tr: document.querySelectorAll("tr").length,
        td: document.querySelectorAll("td").length,
        hasContent: document.body.textContent.length > 1000,
        bodyText: document.body.textContent.substring(0, 200),
      };
    });

    console.log("📊 Neighborhood page info:", neighborhoodPageInfo);

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

testRegularPage();

















