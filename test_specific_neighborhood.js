const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testSpecificNeighborhood() {
  console.log("🧪 Testing specific neighborhood page...");

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
      "https://www.nadlan.gov.il/?view=neighborhood&id=65210279&page=deals";
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

    // Check for deals table and extract all deals
    const dealsTable = await page.$("table");
    if (dealsTable) {
      console.log("✅ Deals table found!");

      // Extract all deals
      const deals = await page.evaluate(() => {
        const rows = document.querySelectorAll("table tr");
        const deals = [];

        // Skip header row (first row)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll("td");

          if (cells.length >= 6) {
            const deal = {
              serialNumber: cells[0]?.textContent?.trim() || "",
              address: cells[1]?.textContent?.trim() || "",
              area: cells[2]?.textContent?.trim() || "",
              date: cells[3]?.textContent?.trim() || "",
              price: cells[4]?.textContent?.trim() || "",
              block: cells[5]?.textContent?.trim() || "",
              propertyType: cells[6]?.textContent?.trim() || "",
              rooms: cells[7]?.textContent?.trim() || "",
              floor: cells[8]?.textContent?.trim() || "",
              additional1: cells[9]?.textContent?.trim() || "",
              additional2: cells[10]?.textContent?.trim() || "",
            };
            deals.push(deal);
          }
        }

        return deals;
      });

      console.log(`📊 Found ${deals.length} deals:`);
      console.log("=" * 80);

      deals.forEach((deal, index) => {
        console.log(`\n🏠 Deal #${index + 1}:`);
        console.log(`   📋 Serial: ${deal.serialNumber}`);
        console.log(`   🏠 Address: ${deal.address}`);
        console.log(`   📐 Area: ${deal.area} sqm`);
        console.log(`   📅 Date: ${deal.date}`);
        console.log(`   💰 Price: ${deal.price}`);
        console.log(`   🏢 Block: ${deal.block}`);
        console.log(`   🏘️  Property Type: ${deal.propertyType}`);
        console.log(`   🚪 Rooms: ${deal.rooms}`);
        console.log(`   🏗️  Floor: ${deal.floor}`);
        if (deal.additional1)
          console.log(`   ℹ️  Additional 1: ${deal.additional1}`);
        if (deal.additional2)
          console.log(`   ℹ️  Additional 2: ${deal.additional2}`);
        console.log("   " + "-".repeat(50));
      });

      console.log(`\n✅ Total deals extracted: ${deals.length}`);
    } else {
      console.log("❌ No deals table found");
    }

    // Check for pagination
    const nextButton = await page.evaluate(() => {
      const links = document.querySelectorAll("a");
      for (let link of links) {
        if (
          link.textContent.includes("הבא") &&
          !link.classList.contains("disabled") &&
          !link.classList.contains("inactive")
        ) {
          return true;
        }
      }
      return false;
    });

    if (nextButton) {
      console.log("✅ Next button found!");
    } else {
      console.log("❌ No next button found");
    }

    // Check for any error messages
    const errorElements = await page.$$("*");
    let hasError = false;
    for (const element of errorElements) {
      const text = await page.evaluate((el) => el.textContent, element);
      if (
        text &&
        (text.includes("חסום") ||
          text.includes("blocked") ||
          text.includes("Access Denied"))
      ) {
        console.log(`⚠️  Possible error message: ${text}`);
        hasError = true;
      }
    }

    if (!hasError) {
      console.log("✅ No error messages detected");
    }

    // Take a screenshot for debugging
    await page.screenshot({
      path: "test_neighborhood_debug.png",
      fullPage: true,
    });
    console.log("📸 Screenshot saved as test_neighborhood_debug.png");
  } catch (error) {
    console.error("❌ Error testing neighborhood:", error.message);
  } finally {
    await browser.close();
  }
}

testSpecificNeighborhood();
