const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

const pathToExtension = require("path").join(__dirname, "2captcha-solver");

async function testExtensionVisibility() {
  console.log("🔍 Testing 2Captcha Extension Visibility in Puppeteer");

  // Check if extension path exists
  const fs = require("fs");
  if (!fs.existsSync(pathToExtension)) {
    console.error(`❌ Extension path does not exist: ${pathToExtension}`);
    return;
  }

  const manifestPath = path.join(pathToExtension, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Extension manifest not found: ${manifestPath}`);
    return;
  }

  console.log(`✅ Extension path exists: ${pathToExtension}`);
  console.log(`✅ Extension manifest exists: ${manifestPath}`);

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
      "--enable-extensions",
      "--allow-running-insecure-content",
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

    // Check what extensions are loaded
    console.log("🔍 Checking loaded extensions...");
    const extensions = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (chrome && chrome.runtime && chrome.runtime.getManifest) {
          try {
            const manifest = chrome.runtime.getManifest();
            resolve({ loaded: true, manifest: manifest });
          } catch (e) {
            resolve({ loaded: false, error: e.message });
          }
        } else {
          resolve({ loaded: false, error: "chrome.runtime not available" });
        }
      });
    });
    console.log("📋 Extension runtime check:", extensions);

    // Check for reCAPTCHA
    const recaptchaPresent = await page.evaluate(() => {
      return !!(
        document.querySelector('iframe[src*="recaptcha"]') ||
        document.querySelector(".g-recaptcha") ||
        document.querySelector("#recaptcha") ||
        document.querySelector("[data-sitekey]") ||
        document.querySelector('iframe[title*="reCAPTCHA"]') ||
        document.querySelector(".rc-anchor")
      );
    });

    if (recaptchaPresent) {
      console.log("✅ reCAPTCHA detected on the page");

      // Wait for extension to load
      console.log("⏳ Waiting for 2Captcha extension to load...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Check for extension elements
      const extensionInfo = await page.evaluate(() => {
        const info = {
          allElements: [],
          visibleElements: [],
          hiddenElements: [],
          extensionButton: null,
          extensionLoaded: false,
          recaptchaElements: [],
        };

        // Check if 2Captcha extension is loaded
        info.extensionLoaded = !!(
          document.querySelector(".captcha-solver") ||
          document.querySelector('[class*="captcha-solver"]') ||
          window.captchaSolver
        );

        // Look specifically for the 2Captcha extension button
        const extensionButton = document.querySelector(".captcha-solver");
        if (extensionButton) {
          info.extensionButton = {
            tag: extensionButton.tagName,
            className: extensionButton.className,
            id: extensionButton.id,
            visible: extensionButton.offsetParent !== null,
            display: window.getComputedStyle(extensionButton).display,
            visibility: window.getComputedStyle(extensionButton).visibility,
            position: window.getComputedStyle(extensionButton).position,
            zIndex: window.getComputedStyle(extensionButton).zIndex,
            dataState: extensionButton.getAttribute("data-state"),
            dataCaptchaType: extensionButton.getAttribute("data-captcha-type"),
          };
        }

        // Get all elements with captcha in class
        const allElements = document.querySelectorAll("*");
        allElements.forEach((el) => {
          const className = el.className ? el.className.toString() : "";
          if (className && className.includes("captcha")) {
            const elementInfo = {
              tag: el.tagName,
              className: className,
              id: el.id,
              visible: el.offsetParent !== null,
              display: window.getComputedStyle(el).display,
              visibility: window.getComputedStyle(el).visibility,
              position: window.getComputedStyle(el).position,
              zIndex: window.getComputedStyle(el).zIndex,
            };

            info.allElements.push(elementInfo);

            if (elementInfo.visible) {
              info.visibleElements.push(elementInfo);
            } else {
              info.hiddenElements.push(elementInfo);
            }
          }
        });

        // Check for reCAPTCHA elements specifically
        const recaptchaElements = document.querySelectorAll(
          'iframe[src*="recaptcha"], .grecaptcha-badge, .rc-anchor'
        );
        recaptchaElements.forEach((el) => {
          info.recaptchaElements.push({
            tag: el.tagName,
            className: el.className,
            id: el.id,
            src: el.src || "N/A",
            visible: el.offsetParent !== null,
          });
        });

        return info;
      });

      console.log("📊 Extension Elements Analysis:");
      console.log(
        `🔌 2Captcha Extension Loaded: ${extensionInfo.extensionLoaded}`
      );
      console.log(
        `🎯 Extension Button Found: ${
          extensionInfo.extensionButton ? "YES" : "NO"
        }`
      );
      console.log(
        `📋 Total captcha elements: ${extensionInfo.allElements.length}`
      );
      console.log(
        `👁️ Visible elements: ${extensionInfo.visibleElements.length}`
      );
      console.log(`🙈 Hidden elements: ${extensionInfo.hiddenElements.length}`);
      console.log(
        `🛡️ reCAPTCHA elements: ${extensionInfo.recaptchaElements.length}`
      );

      if (extensionInfo.extensionButton) {
        console.log("\n🎯 2Captcha Extension Button Details:");
        console.log(`   Tag: ${extensionInfo.extensionButton.tag}`);
        console.log(`   Class: ${extensionInfo.extensionButton.className}`);
        console.log(`   ID: ${extensionInfo.extensionButton.id}`);
        console.log(`   Visible: ${extensionInfo.extensionButton.visible}`);
        console.log(`   Display: ${extensionInfo.extensionButton.display}`);
        console.log(
          `   Visibility: ${extensionInfo.extensionButton.visibility}`
        );
        console.log(`   Position: ${extensionInfo.extensionButton.position}`);
        console.log(`   Z-Index: ${extensionInfo.extensionButton.zIndex}`);
        console.log(
          `   Data State: ${extensionInfo.extensionButton.dataState}`
        );
        console.log(
          `   Captcha Type: ${extensionInfo.extensionButton.dataCaptchaType}`
        );
      }

      if (extensionInfo.recaptchaElements.length > 0) {
        console.log("\n🛡️ reCAPTCHA Elements Found:");
        extensionInfo.recaptchaElements.forEach((el, index) => {
          console.log(`${index + 1}. ${el.tag} - class="${el.className}"`);
          console.log(`   ID: ${el.id}, Src: ${el.src}`);
          console.log(`   Visible: ${el.visible}`);
        });
      }

      if (extensionInfo.allElements.length > 0) {
        console.log("\n🔍 All captcha-related elements:");
        extensionInfo.allElements.forEach((el, index) => {
          console.log(`${index + 1}. ${el.tag} - class="${el.className}"`);
          console.log(
            `   Visible: ${el.visible}, Display: ${el.display}, Visibility: ${el.visibility}`
          );
          console.log(`   Position: ${el.position}, Z-Index: ${el.zIndex}`);
        });
      }

      // Try to make hidden elements visible
      if (extensionInfo.hiddenElements.length > 0) {
        console.log("\n🔄 Trying to make hidden elements visible...");
        await page.evaluate(() => {
          const hiddenElements =
            document.querySelectorAll('[class*="captcha"]');
          hiddenElements.forEach((el) => {
            if (el.offsetParent === null) {
              el.style.display = "block";
              el.style.visibility = "visible";
              el.style.position = "relative";
              el.style.zIndex = "9999";
              console.log("Made element visible:", el.className);
            }
          });
        });

        // Wait and check again
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const afterVisibilityCheck = await page.evaluate(() => {
          const elements = document.querySelectorAll('[class*="captcha"]');
          return Array.from(elements).map((el) => ({
            className: el.className,
            visible: el.offsetParent !== null,
          }));
        });

        console.log("\n📊 After visibility fix:");
        afterVisibilityCheck.forEach((el, index) => {
          console.log(`${index + 1}. ${el.className} - Visible: ${el.visible}`);
        });
      }
    } else {
      console.log("❌ No reCAPTCHA detected on this page");
    }
  } catch (error) {
    console.log(`❌ Error during test: ${error.message}`);
  }

  console.log(
    "⏳ Keeping browser open for 60 seconds for manual inspection..."
  );
  await new Promise((resolve) => setTimeout(resolve, 60000));

  await browser.close();
  console.log("✅ Test completed");
}

// Run the test
testExtensionVisibility().catch(console.error);
