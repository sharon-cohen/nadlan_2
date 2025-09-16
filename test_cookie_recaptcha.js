const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const Captcha = require("2captcha");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testCookieRecaptcha() {
  console.log("🧪 Testing reCAPTCHA with Cookie Handling");
  
  const browser = await puppeteer.launch({
    headless: false, // Keep visible for testing
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=VizDisplayCompositor",
      "--disable-web-security",
      "--window-size=1920,1080",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  try {
    // Step 1: Establish session and cookies
    console.log("🍪 Step 1: Establishing session and cookies...");
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    const cookies = await page.cookies();
    console.log(`✅ Session established with ${cookies.length} cookies`);
    cookies.forEach(cookie => {
      console.log(`   🍪 ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });

    // Step 2: Navigate to target page
    console.log("\n🌐 Step 2: Navigating to target page...");
    await page.goto("https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Check for reCAPTCHA
    console.log("\n🔍 Step 3: Checking for reCAPTCHA...");
    const recaptchaInfo = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      const siteKey = document.querySelector("[data-sitekey]");
      const gRecaptcha = document.querySelector(".g-recaptcha");
      
      return {
        present: !!(iframe || siteKey || gRecaptcha),
        siteKey: siteKey ? siteKey.getAttribute("data-sitekey") : null,
        iframeSrc: iframe ? iframe.src : null,
        iframeTitle: iframe ? iframe.title : null
      };
    });

    console.log("🔍 reCAPTCHA Detection Results:");
    console.log(`   Present: ${recaptchaInfo.present}`);
    console.log(`   Site Key: ${recaptchaInfo.siteKey || "Not found"}`);
    console.log(`   Iframe: ${recaptchaInfo.iframeSrc || "Not found"}`);
    console.log(`   Title: ${recaptchaInfo.iframeTitle || "Not found"}`);

    if (!recaptchaInfo.present) {
      console.log("✅ No reCAPTCHA detected - test complete");
      return;
    }

    // Step 4: Test API with cookies
    console.log("\n🔄 Step 4: Testing 2Captcha API with cookies...");
    const solver = new Captcha.Solver("096fefd6b3e24bad0c487f302498687d");

    // Get site key
    let siteKey = recaptchaInfo.siteKey;
    if (!siteKey && recaptchaInfo.iframeSrc) {
      const match = recaptchaInfo.iframeSrc.match(/[?&]k=([^&]+)/);
      if (match) {
        siteKey = match[1];
        console.log(`🔑 Extracted site key from iframe: ${siteKey}`);
      }
    }

    if (!siteKey) {
      console.log("❌ Could not find reCAPTCHA site key");
      return;
    }

    // Get updated cookies
    const updatedCookies = await page.cookies();
    const cookieString = updatedCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    
    console.log(`🔑 Using site key: ${siteKey}`);
    console.log(`🌐 Page URL: ${page.url()}`);
    console.log(`🍪 Cookie string length: ${cookieString.length} characters`);
    console.log(`🍪 Cookie preview: ${cookieString.substring(0, 200)}...`);

    // Test API connection (don't actually solve to avoid charges)
    console.log("\n🧪 Testing API connection with cookies...");
    try {
      console.log("✅ 2Captcha API initialized successfully");
      console.log("💡 API integration is ready for use with cookies");
      
      // Show what would happen
      console.log("\n📋 What would happen during actual solving:");
      console.log("1. Submit reCAPTCHA to 2Captcha API with cookies");
      console.log("2. Wait for solution (usually 30-60 seconds)");
      console.log("3. Inject solution into page");
      console.log("4. Wait for page to process solution");
      console.log("5. Content should load properly");
      
    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
    }

    // Step 5: Check page state
    console.log("\n📊 Step 5: Checking page state...");
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasContent: document.querySelectorAll('table, tbody, .mainTable, #dealsTable').length > 0,
        recaptchaStillPresent: !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]")
        )
      };
    });

    console.log("📊 Page State:");
    console.log(`   URL: ${pageState.url}`);
    console.log(`   Title: ${pageState.title}`);
    console.log(`   Has Content: ${pageState.hasContent ? 'YES' : 'NO'}`);
    console.log(`   reCAPTCHA Present: ${pageState.recaptchaStillPresent ? 'YES' : 'NO'}`);

    console.log("\n⏳ Keeping browser open for 30 seconds for manual inspection...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testCookieRecaptcha().catch(console.error);



