const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testPersistentProfile() {
  console.log("🧪 Testing Persistent Profile Approach for reCAPTCHA");

  // Create persistent profile directory
  const userDataDir = path.join(__dirname, "puppeteer_profile");
  console.log(`📁 Using persistent profile: ${userDataDir}`);

  const browser = await puppeteer.launch({
    headless: false, // Keep visible for testing
    userDataDir: userDataDir, // Persistent profile
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=VizDisplayCompositor",
      "--disable-web-security",
      "--disable-plugins",
      "--disable-images",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--no-default-browser-check",
      "--window-size=1920,1080",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  try {
    // Step 1: Build trust with Google first
    console.log("🍪 Step 1: Building trust with Google...");
    await page.goto("https://www.google.com/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("✅ Google trust session established");

    // Step 2: Visit main site to build context
    console.log("\n🌐 Step 2: Building context with main site...");
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("✅ Main site context established");

    // Step 3: Navigate to target page
    console.log("\n🎯 Step 3: Navigating to target page...");
    await page.goto(
      "https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals",
      {
        waitUntil: "networkidle2", // Wait for network to be idle
        timeout: 30000,
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 4: Check for reCAPTCHA
    console.log("\n🔍 Step 4: Checking for reCAPTCHA...");
    const recaptchaInfo = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      const siteKey = document.querySelector("[data-sitekey]");
      const gRecaptcha = document.querySelector(".g-recaptcha");
      const responseTextarea = document.querySelector(
        'textarea[name="g-recaptcha-response"]'
      );

      return {
        present: !!(iframe || siteKey || gRecaptcha),
        siteKey: siteKey ? siteKey.getAttribute("data-sitekey") : null,
        iframeSrc: iframe ? iframe.src : null,
        iframeTitle: iframe ? iframe.title : null,
        hasResponseTextarea: !!responseTextarea,
        grecaptchaAvailable: !!window.grecaptcha,
      };
    });

    console.log("🔍 reCAPTCHA Detection Results:");
    console.log(`   Present: ${recaptchaInfo.present}`);
    console.log(`   Site Key: ${recaptchaInfo.siteKey || "Not found"}`);
    console.log(`   Iframe: ${recaptchaInfo.iframeSrc || "Not found"}`);
    console.log(`   Title: ${recaptchaInfo.iframeTitle || "Not found"}`);
    console.log(
      `   Response Textarea: ${
        recaptchaInfo.hasResponseTextarea ? "YES" : "NO"
      }`
    );
    console.log(
      `   grecaptcha API: ${recaptchaInfo.grecaptchaAvailable ? "YES" : "NO"}`
    );

    // Step 5: Check page state
    console.log("\n📊 Step 5: Checking page state...");
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasContent:
          document.querySelectorAll("table, tbody, .mainTable, #dealsTable")
            .length > 0,
        recaptchaStillPresent: !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]")
        ),
      };
    });

    console.log("📊 Page State:");
    console.log(`   URL: ${pageState.url}`);
    console.log(`   Title: ${pageState.title}`);
    console.log(`   Has Content: ${pageState.hasContent ? "YES" : "NO"}`);
    console.log(
      `   reCAPTCHA Present: ${pageState.recaptchaStillPresent ? "YES" : "NO"}`
    );

    if (pageState.hasContent) {
      console.log("🎉 SUCCESS: Page has content with persistent profile!");
    } else if (!recaptchaInfo.present) {
      console.log("✅ SUCCESS: No reCAPTCHA detected with persistent profile!");
    } else {
      console.log(
        "⚠️ WARNING: reCAPTCHA still present, but profile may help over time"
      );
    }

    // Step 6: Show profile benefits
    console.log("\n💡 Persistent Profile Benefits:");
    console.log("   🍪 Cookies persist across runs");
    console.log("   🔄 Session continuity maintained");
    console.log("   📊 Trust builds over time");
    console.log("   🚫 Less likely to be flagged as bot");
    console.log("   ⏰ reCAPTCHA may auto-solve on future runs");

    console.log(
      "\n⏳ Keeping browser open for 30 seconds for manual inspection..."
    );
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testPersistentProfile().catch(console.error);



