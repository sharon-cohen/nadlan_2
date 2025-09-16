const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

const pathToExtension = require("path").join(__dirname, "2captcha-solver");

async function test2CaptchaExtension() {
  console.log("🧪 Testing 2Captcha Extension Implementation");

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
    console.log("🌐 Navigating to 2Captcha reCAPTCHA demo page...");

    // Navigate to 2Captcha demo page with reCAPTCHA
    await page.goto("https://2captcha.com/demo/recaptcha-v2", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("⏳ Waiting for page to load...");
    await page.waitForTimeout(3000);

    // Check if reCAPTCHA is present
    const recaptchaPresent = await page.evaluate(() => {
      return !!(
        document.querySelector('iframe[src*="recaptcha"]') ||
        document.querySelector(".g-recaptcha") ||
        document.querySelector("#recaptcha") ||
        document.querySelector("[data-sitekey]") ||
        document.querySelector('iframe[title*="reCAPTCHA"]')
      );
    });

    if (recaptchaPresent) {
      console.log("✅ reCAPTCHA detected on the page");

      // Check if 2Captcha extension button is available
      try {
        await page.waitForSelector(".captcha-solver", { timeout: 10000 });
        console.log("✅ 2Captcha extension button found!");

        // Get the current state of the button
        const buttonState = await page.evaluate(() => {
          const button = document.querySelector(".captcha-solver");
          return button ? button.getAttribute("data-state") : null;
        });

        console.log(`🔍 Extension button state: ${buttonState}`);

        if (buttonState === "ready") {
          console.log(
            "🔄 Clicking 2Captcha extension button to solve reCAPTCHA..."
          );
          await page.click(".captcha-solver");

          // Wait for the captcha to be solved (up to 3 minutes)
          try {
            await page.waitForSelector('.captcha-solver[data-state="solved"]', {
              timeout: 180000,
            });
            console.log(
              "🎉 reCAPTCHA solved successfully by 2Captcha extension!"
            );

            // Wait a bit more to see the result
            await page.waitForTimeout(2000);

            // Check if we can submit the form
            const submitButton = await page.$('button[type="submit"]');
            if (submitButton) {
              console.log("🔄 Submitting form to verify reCAPTCHA solution...");
              await submitButton.click();
              await page.waitForTimeout(3000);

              // Check for success message
              const successMessage = await page.evaluate(() => {
                const body = document.body.textContent.toLowerCase();
                return (
                  body.includes("captcha is passed") || body.includes("success")
                );
              });

              if (successMessage) {
                console.log(
                  "🎉 Form submitted successfully! reCAPTCHA was solved correctly!"
                );
              } else {
                console.log("⚠️ Form submitted but success message not found");
              }
            }
          } catch (error) {
            console.log(
              `❌ Timeout waiting for reCAPTCHA to be solved: ${error.message}`
            );

            // Check final state
            const finalState = await page.evaluate(() => {
              const button = document.querySelector(".captcha-solver");
              return button ? button.getAttribute("data-state") : null;
            });
            console.log(`🔍 Final extension button state: ${finalState}`);
          }
        } else {
          console.log(
            `⚠️ Extension button is not ready (state: ${buttonState})`
          );
        }
      } catch (error) {
        console.log(`❌ 2Captcha extension button not found: ${error.message}`);
        console.log("🔍 Checking if extension is loaded...");

        // Check if extension is loaded by looking for extension elements
        const extensionLoaded = await page.evaluate(() => {
          return (
            !!document.querySelector('[class*="captcha-solver"]') ||
            !!document.querySelector('[id*="captcha"]') ||
            !!document.querySelector('[class*="2captcha"]')
          );
        });

        if (extensionLoaded) {
          console.log("✅ Extension appears to be loaded but button not found");
        } else {
          console.log("❌ Extension does not appear to be loaded");
        }
      }
    } else {
      console.log("❌ No reCAPTCHA detected on the page");
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
test2CaptchaExtension().catch(console.error);



