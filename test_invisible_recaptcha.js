const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

const pathToExtension = require("path").join(__dirname, "2captcha-solver");

async function testInvisibleRecaptcha() {
  console.log("🧪 Testing Invisible reCAPTCHA Detection");

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=VizDisplayCompositor",
      "--disable-web-security",
      "--disable-plugins",
      "--window-size=1920,1080",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Set realistic User Agent
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  try {
    console.log("🌐 Navigating to your target site...");

    // Navigate to your actual scraping target
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("⏳ Waiting for page to load...");
    await page.waitForTimeout(5000);

    // Check for invisible reCAPTCHA specifically
    const invisibleRecaptchaPresent = await page.evaluate(() => {
      // Look for invisible reCAPTCHA indicators
      const invisibleSelectors = [
        ".rc-anchor-invisible",
        ".rc-anchor-invisible-hover",
        '[class*="rc-anchor-invisible"]',
        'div[class*="rc-anchor"][class*="invisible"]',
      ];

      for (let selector of invisibleSelectors) {
        if (document.querySelector(selector)) {
          return true;
        }
      }

      // Also check for the specific HTML you showed
      const recaptchaElements = document.querySelectorAll(
        '[class*="rc-anchor"]'
      );
      for (let element of recaptchaElements) {
        if (element.className.includes("invisible")) {
          return true;
        }
      }

      return false;
    });

    if (invisibleRecaptchaPresent) {
      console.log("✅ Invisible reCAPTCHA detected on the page!");

      // Check if 2Captcha extension is working
      const extensionWorking = await page.evaluate(() => {
        // Look for 2Captcha extension elements
        return !!(
          document.querySelector('[class*="captcha-solver"]') ||
          document.querySelector('[id*="captcha"]') ||
          document.querySelector('[class*="2captcha"]')
        );
      });

      if (extensionWorking) {
        console.log("✅ 2Captcha extension is loaded and working!");

        // Check extension button state
        const buttonState = await page.evaluate(() => {
          const button = document.querySelector(".captcha-solver");
          return button ? button.getAttribute("data-state") : "not-found";
        });

        console.log(`🔍 Extension button state: ${buttonState}`);

        if (buttonState === "solved") {
          console.log("🎉 Invisible reCAPTCHA already solved by extension!");
        } else if (buttonState === "ready") {
          console.log("🔄 Extension is ready to solve invisible reCAPTCHA");
        } else if (buttonState === "solving") {
          console.log(
            "⏳ Extension is currently solving the invisible reCAPTCHA"
          );
        } else {
          console.log(`⚠️ Extension button state: ${buttonState}`);
        }
      } else {
        console.log("❌ 2Captcha extension not detected");
      }
    } else {
      console.log("❌ No invisible reCAPTCHA detected on this page");

      // Check for any reCAPTCHA
      const anyRecaptcha = await page.evaluate(() => {
        return !!(
          document.querySelector('[class*="rc-anchor"]') ||
          document.querySelector('[class*="g-recaptcha"]') ||
          document.querySelector("[data-sitekey]")
        );
      });

      if (anyRecaptcha) {
        console.log("ℹ️ Other types of reCAPTCHA found (not invisible)");
      } else {
        console.log("ℹ️ No reCAPTCHA found on this page");
      }
    }
  } catch (error) {
    console.log(`❌ Error during test: ${error.message}`);
  }

  console.log(
    "⏳ Keeping browser open for 30 seconds for manual inspection..."
  );
  await page.waitForTimeout(30000);

  await browser.close();
  console.log("✅ Test completed");
}

// Run the test
testInvisibleRecaptcha().catch(console.error);











