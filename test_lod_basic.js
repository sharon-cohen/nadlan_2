const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testLodBasic() {
  console.log("🚀 Testing Lod with basic stealth...");

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
    ],
  });

  const page = await browser.newPage();

  // Set realistic viewport
  await page.setViewport({
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
  });

  // Set realistic user agent
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // Set additional headers
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });

  try {
    // First, go to main page to establish session
    console.log("🌐 Going to main page first...");
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("✅ Main page loaded");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Now navigate to Lod deals page
    const lodUrl = "https://www.nadlan.gov.il/?view=settlement&id=7000&page=deals";
    console.log(`🌐 Navigating to: ${lodUrl}`);
    
    await page.goto(lodUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("✅ Lod page loaded");

    // Wait for content
    console.log("⏳ Waiting for content...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check what we have on the page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasTable: !!document.querySelector("table"),
        hasDealsTable: !!document.querySelector("table#dealsTable"),
        hasAnyTable: document.querySelectorAll("table").length,
        hasDealsContent: !!document.querySelector('[class*="deal"], [class*="transaction"]'),
        bodyLength: document.body.textContent.length,
        hasRecaptcha: !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]")
        )
      };
    });

    console.log("📄 Page info:", pageInfo);

    // Try to find any content related to deals
    const contentInfo = await page.evaluate(() => {
      const selectors = [
        "table",
        "table#dealsTable",
        ".deals",
        ".transactions", 
        ".properties",
        "[data-deals]",
        "[data-transactions]",
        "div[class*='deal']",
        "div[class*='transaction']"
      ];

      const results = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results[selector] = elements.length;
        }
      });

      return results;
    });

    console.log("🔍 Content found:", contentInfo);

    // Check if there are any buttons or links to load deals
    const buttonsInfo = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, [role="button"]');
      const dealsRelated = [];
      
      buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        const href = btn.href || '';
        const className = btn.className || '';
        
        if (text.includes('עסקאות') || text.includes('deals') || 
            href.includes('deals') || className.includes('deal')) {
          dealsRelated.push({
            text: btn.textContent.trim(),
            href: href,
            className: className
          });
        }
      });

      return dealsRelated;
    });

    console.log("🔘 Deals-related buttons/links:", buttonsInfo);

    // Keep browser open for observation
    console.log("🔍 Browser will stay open for 30 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
    console.log("🔒 Browser closed");
  }
}

// Run the test
testLodBasic().catch(console.error);




