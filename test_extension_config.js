const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testExtensionConfig() {
  console.log("🔧 Testing 2Captcha Extension Configuration");

  // Create persistent profile directory
  const userDataDir = path.join(__dirname, "puppeteer_profile");
  console.log(`📁 Using persistent profile: ${userDataDir}`);

  // 2Captcha Extension path
  const extensionPath = path.join(__dirname, "2captcha-solver");
  console.log(`🔌 Loading 2Captcha Extension from: ${extensionPath}`);

  const browser = await puppeteer.launch({
    headless: false, // Keep visible for testing
    userDataDir: userDataDir,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--enable-extensions",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--allow-running-insecure-content",
      // Essential cookie fixes only
      "--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure",
      "--disable-features=ThirdPartyCookiePhaseout",
      "--window-size=1920,1080",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Step 1: Opening extension popup...");

    // Navigate to extension popup
    await page.goto(
      `chrome-extension://ifibfemgeogfhoebkmokieepdoobkbpo/popup/popup.html`,
      {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      }
    );

    console.log("✅ Extension popup opened");

    // Wait for popup to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if we can see the extension interface
    const popupContent = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent.length > 0,
        hasApiKeyField: !!document.querySelector(
          'input[type="text"], input[placeholder*="key"], input[name*="key"]'
        ),
        hasSubmitButton: !!document.querySelector(
          'button, input[type="submit"]'
        ),
        bodyText: document.body.textContent.substring(0, 200),
      };
    });

    console.log("📊 Extension Popup Status:");
    console.log(`   Title: ${popupContent.title}`);
    console.log(`   Has Content: ${popupContent.hasContent ? "YES" : "NO"}`);
    console.log(
      `   Has API Key Field: ${popupContent.hasApiKeyField ? "YES" : "NO"}`
    );
    console.log(
      `   Has Submit Button: ${popupContent.hasSubmitButton ? "YES" : "NO"}`
    );
    console.log(`   Content Preview: ${popupContent.bodyText}`);

    if (popupContent.hasApiKeyField) {
      console.log("🔑 Found API key field, attempting to configure...");

      // Try to set API key
      await page.evaluate(() => {
        const apiKeyField = document.querySelector(
          'input[type="text"], input[placeholder*="key"], input[name*="key"]'
        );
        if (apiKeyField) {
          apiKeyField.value = "096fefd6b3e24bad0c487f302498687d";
          apiKeyField.dispatchEvent(new Event("input", { bubbles: true }));
          apiKeyField.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      // Try to submit/save
      await page.evaluate(() => {
        const submitButton = document.querySelector(
          'button, input[type="submit"]'
        );
        if (submitButton) {
          submitButton.click();
        }
      });

      console.log("✅ API key configuration attempted");
    }

    console.log(
      "\n⏳ Keeping browser open for 30 seconds for manual inspection..."
    );
    console.log(
      "🔍 Please check the extension popup manually and configure if needed"
    );
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testExtensionConfig().catch(console.error);



