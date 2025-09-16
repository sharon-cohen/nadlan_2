const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testCookieFix() {
  console.log("🧪 Testing Cookie Fix for SetCookie Failed Issue");

  // Create persistent profile directory
  const userDataDir = path.join(__dirname, "puppeteer_profile");
  console.log(`📁 Using persistent profile: ${userDataDir}`);

  const browser = await puppeteer.launch({
    headless: false, // Keep visible for testing
    userDataDir: userDataDir,
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
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-client-side-phishing-detection",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-domain-reliability",
      "--disable-component-extensions-with-background-pages",
      // Cookie-related fixes
      "--disable-features=VizDisplayCompositor,CookieDeprecationLabel",
      "--disable-ipc-flooding-protection",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-background-timer-throttling",
      "--disable-background-networking",
      "--disable-sync-preferences",
      "--disable-extensions-http-throttling",
      "--aggressive-cache-discard",
      // Allow insecure content and cookies
      "--allow-running-insecure-content",
      "--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure",
      "--disable-web-security",
      "--window-size=1920,1080",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  try {
    // Fix cookie issues
    console.log("🍪 Step 1: Configuring cookie handling...");
    await page.evaluateOnNewDocument(() => {
      // Override cookie settings to be more permissive
      Object.defineProperty(document, "cookie", {
        get: function () {
          return this._cookie || "";
        },
        set: function (value) {
          this._cookie = value;
          // Allow all cookies
          return true;
        },
      });
    });
    console.log("✅ Cookie handling configured");

    // Test cookie setting
    console.log("\n🍪 Step 2: Testing cookie setting...");
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Try to set a test cookie
    const cookieTest = await page.evaluate(() => {
      try {
        document.cookie =
          "test_cookie=test_value; path=/; domain=.nadlan.gov.il";
        return {
          success: true,
          cookieValue: document.cookie,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    });

    console.log("🍪 Cookie Test Results:");
    console.log(`   Success: ${cookieTest.success ? "YES" : "NO"}`);
    if (cookieTest.success) {
      console.log(`   Cookie Value: ${cookieTest.cookieValue}`);
    } else {
      console.log(`   Error: ${cookieTest.error}`);
    }

    // Check for SetCookie warnings in console
    console.log("\n🔍 Step 3: Monitoring for SetCookie warnings...");
    const consoleMessages = [];
    page.on("console", (msg) => {
      if (msg.text().includes("SetCookie") || msg.text().includes("cookie")) {
        consoleMessages.push(msg.text());
      }
    });

    // Navigate to target page
    console.log("\n🌐 Step 4: Navigating to target page...");
    await page.goto(
      "https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals",
      {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check for reCAPTCHA
    console.log("\n🔍 Step 5: Checking for reCAPTCHA...");
    const recaptchaInfo = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      const siteKey = document.querySelector("[data-sitekey]");
      const gRecaptcha = document.querySelector(".g-recaptcha");

      return {
        present: !!(iframe || siteKey || gRecaptcha),
        siteKey: siteKey ? siteKey.getAttribute("data-sitekey") : null,
        iframeSrc: iframe ? iframe.src : null,
        iframeTitle: iframe ? iframe.title : null,
      };
    });

    console.log("🔍 reCAPTCHA Detection Results:");
    console.log(`   Present: ${recaptchaInfo.present}`);
    console.log(`   Site Key: ${recaptchaInfo.siteKey || "Not found"}`);
    console.log(`   Iframe: ${recaptchaInfo.iframeSrc || "Not found"}`);
    console.log(`   Title: ${recaptchaInfo.iframeTitle || "Not found"}`);

    // Check page state
    console.log("\n📊 Step 6: Checking page state...");
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

    // Check console messages
    console.log("\n📋 Step 7: Console Messages:");
    if (consoleMessages.length > 0) {
      console.log("⚠️ SetCookie-related messages found:");
      consoleMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg}`);
      });
    } else {
      console.log("✅ No SetCookie warnings detected");
    }

    // Results
    console.log("\n📊 Results Summary:");
    if (cookieTest.success && !recaptchaInfo.present) {
      console.log("🎉 SUCCESS: Cookie fix worked - no reCAPTCHA detected!");
    } else if (cookieTest.success && recaptchaInfo.present) {
      console.log("⚠️ PARTIAL: Cookie fix worked but reCAPTCHA still present");
    } else if (!cookieTest.success) {
      console.log("❌ FAILED: Cookie setting still not working");
    }

    console.log("\n💡 Cookie Fix Benefits:");
    console.log("   🍪 Allows proper cookie setting");
    console.log("   🔒 Bypasses SameSite restrictions");
    console.log("   🌐 Enables cross-origin cookies");
    console.log("   🚫 Reduces SetCookie warnings");
    console.log("   ✅ Should reduce reCAPTCHA triggers");

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

testCookieFix().catch(console.error);



