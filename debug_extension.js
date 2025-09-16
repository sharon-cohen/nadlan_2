const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

const pathToExtension = require("path").join(__dirname, "2captcha-solver");

async function debugExtension() {
  console.log("🔍 Debugging 2Captcha Extension Loading");
  console.log(`📁 Extension path: ${pathToExtension}`);

  // Check if extension folder exists
  const fs = require("fs");
  if (!fs.existsSync(pathToExtension)) {
    console.log("❌ Extension folder not found!");
    return;
  }

  console.log("✅ Extension folder exists");

  // Check if manifest.json exists
  const manifestPath = path.join(pathToExtension, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.log("❌ manifest.json not found!");
    return;
  }

  console.log("✅ manifest.json exists");

  // Check if config.js exists
  const configPath = path.join(pathToExtension, "common", "config.js");
  if (!fs.existsSync(configPath)) {
    console.log("❌ config.js not found!");
    return;
  }

  console.log("✅ config.js exists");

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
    await page.goto(
      "https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals",
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      }
    );

    console.log("⏳ Waiting for page to load...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if extension is loaded
    console.log("🔍 Checking if extension is loaded...");

    const extensionInfo = await page.evaluate(() => {
      const info = {
        chromeRuntime: !!window.chrome && !!window.chrome.runtime,
        extensionElements: [],
        recaptchaElements: [],
        allElements: [],
      };

      // Check for extension elements
      const extensionSelectors = [
        '[class*="captcha-solver"]',
        '[id*="captcha"]',
        '[class*="2captcha"]',
        ".captcha-solver",
      ];

      extensionSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          info.extensionElements.push({
            selector: selector,
            count: elements.length,
            classes: Array.from(elements).map((el) => el.className),
          });
        }
      });

      // Check for reCAPTCHA elements
      const recaptchaSelectors = [
        'iframe[src*="recaptcha"]',
        ".g-recaptcha",
        "#recaptcha",
        "[data-sitekey]",
        'iframe[title*="reCAPTCHA"]',
        ".rc-anchor",
        ".rc-anchor-invisible",
      ];

      recaptchaSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          info.recaptchaElements.push({
            selector: selector,
            count: elements.length,
            classes: Array.from(elements).map((el) => el.className),
          });
        }
      });

      // Get all elements with "captcha" in class or id
      const allElements = document.querySelectorAll("*");
      allElements.forEach((el) => {
        if (el.className && el.className.includes("captcha")) {
          info.allElements.push({
            tag: el.tagName,
            className: el.className,
            id: el.id,
          });
        }
      });

      return info;
    });

    console.log("📊 Extension Info:", JSON.stringify(extensionInfo, null, 2));

    if (extensionInfo.chromeRuntime) {
      console.log("✅ Chrome extension API is available");
    } else {
      console.log("❌ Chrome extension API not available");
    }

    if (extensionInfo.extensionElements.length > 0) {
      console.log("✅ 2Captcha extension elements found:");
      extensionInfo.extensionElements.forEach((el) => {
        console.log(`  - ${el.selector}: ${el.count} elements`);
      });
    } else {
      console.log("❌ No 2Captcha extension elements found");
    }

    if (extensionInfo.recaptchaElements.length > 0) {
      console.log("✅ reCAPTCHA elements found:");
      extensionInfo.recaptchaElements.forEach((el) => {
        console.log(`  - ${el.selector}: ${el.count} elements`);
      });
    } else {
      console.log("❌ No reCAPTCHA elements found");
    }

    if (extensionInfo.allElements.length > 0) {
      console.log("🔍 All elements with 'captcha' in class/id:");
      extensionInfo.allElements.forEach((el) => {
        console.log(`  - ${el.tag}: class="${el.className}" id="${el.id}"`);
      });
    }
  } catch (error) {
    console.log(`❌ Error during debug: ${error.message}`);
  }

  console.log(
    "⏳ Keeping browser open for 60 seconds for manual inspection..."
  );
  await new Promise((resolve) => setTimeout(resolve, 60000));

  await browser.close();
  console.log("✅ Debug completed");
}

// Run the debug
debugExtension().catch(console.error);
