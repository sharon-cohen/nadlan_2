const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const Captcha = require("2captcha");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testPreemptiveRecaptcha() {
  console.log("🧪 Testing Pre-emptive reCAPTCHA Solving");

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

  // Add the navigation method
  page.navigateWithRecaptchaHandling = async function (url) {
    console.log(`🌐 Navigating to: ${url}`);

    // Set up reCAPTCHA detection before navigation
    let recaptchaDetected = false;
    let recaptchaSolved = false;

    // Listen for reCAPTCHA elements to appear
    const recaptchaHandler = async () => {
      if (recaptchaDetected || recaptchaSolved) return;

      const hasRecaptcha = await this.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]") ||
          document.querySelector('iframe[title*="reCAPTCHA"]')
        );
      });

      if (hasRecaptcha && !recaptchaDetected) {
        recaptchaDetected = true;
        console.log("🚨 reCAPTCHA detected during page load!");

        // Solve reCAPTCHA immediately
        const solved = await solveRecaptcha();
        if (solved) {
          recaptchaSolved = true;
          console.log("✅ reCAPTCHA solved during page load!");
        }
      }
    };

    // Set up periodic checking for reCAPTCHA
    const recaptchaChecker = setInterval(recaptchaHandler, 1000);

    try {
      // Navigate to the page
      await this.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait a bit for any dynamic content
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check for reCAPTCHA one more time
      await recaptchaHandler();

      // If reCAPTCHA was detected but not solved, try to solve it now
      if (recaptchaDetected && !recaptchaSolved) {
        console.log("🔄 Attempting to solve reCAPTCHA after page load...");
        const solved = await solveRecaptcha();
        if (solved) {
          recaptchaSolved = true;
        }
      }

      // Wait for page to fully load after reCAPTCHA solving
      if (recaptchaSolved) {
        console.log(
          "⏳ Waiting for page to fully load after reCAPTCHA solve..."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Wait for content to appear
        try {
          await this.waitForSelector("table, tbody, .mainTable, #dealsTable", {
            timeout: 10000,
          });
          console.log("✅ Content loaded after reCAPTCHA solve");
        } catch (error) {
          console.log("⚠️ Content loading timeout, but continuing...");
        }
      }

      return recaptchaSolved;
    } finally {
      // Clean up the interval
      clearInterval(recaptchaChecker);
    }
  };

  // Add the solveRecaptcha method
  const solveRecaptcha = async () => {
    try {
      console.log("🔍 Checking for reCAPTCHA...");

      // Check if reCAPTCHA is present
      const recaptchaInfo = await page.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="recaptcha"]');
        const siteKey = document.querySelector("[data-sitekey]");
        const gRecaptcha = document.querySelector(".g-recaptcha");

        return {
          present: !!(iframe || siteKey || gRecaptcha),
          siteKey: siteKey ? siteKey.getAttribute("data-sitekey") : null,
          iframeSrc: iframe ? iframe.src : null,
        };
      });

      if (!recaptchaInfo.present) {
        console.log("✅ No reCAPTCHA detected");
        return true;
      }

      console.log("🚨 reCAPTCHA detected! Using 2Captcha API to solve...");
      console.log(`📍 Site Key: ${recaptchaInfo.siteKey || "Not found"}`);
      console.log(`🔗 Iframe: ${recaptchaInfo.iframeSrc || "Not found"}`);

      // Initialize 2Captcha API
      const solver = new Captcha.Solver("096fefd6b3e24bad0c487f302498687d");

      // Get the current page URL
      const pageUrl = page.url();
      console.log(`🌐 Page URL: ${pageUrl}`);

      // Try to get site key from the page
      let siteKey = recaptchaInfo.siteKey;
      if (!siteKey) {
        // Try to extract from iframe src
        if (recaptchaInfo.iframeSrc) {
          const match = recaptchaInfo.iframeSrc.match(/[?&]k=([^&]+)/);
          if (match) {
            siteKey = match[1];
            console.log(`🔑 Extracted site key from iframe: ${siteKey}`);
          }
        }
      }

      if (!siteKey) {
        console.log("❌ Could not find reCAPTCHA site key");
        return false;
      }

      console.log(`🔑 Using site key: ${siteKey}`);

      // Solve the reCAPTCHA
      console.log("🔄 Submitting reCAPTCHA to 2Captcha API...");
      const result = await solver.recaptcha({
        sitekey: siteKey,
        pageurl: pageUrl,
        invisible: 1, // This is invisible reCAPTCHA
      });

      console.log(`✅ reCAPTCHA solved! Captcha ID: ${result.id}`);

      // Inject the solution into the page
      console.log("💉 Injecting solution into page...");
      await page.evaluate((token) => {
        // Find the reCAPTCHA response textarea
        const responseTextarea = document.querySelector(
          'textarea[name="g-recaptcha-response"]'
        );
        if (responseTextarea) {
          responseTextarea.value = token;
          responseTextarea.style.display = "block";

          // Trigger change event
          const event = new Event("change", { bubbles: true });
          responseTextarea.dispatchEvent(event);

          console.log("✅ reCAPTCHA token injected");
        } else {
          console.log("⚠️ reCAPTCHA response textarea not found");
        }
      }, result.data);

      // Wait for the page to process the solution
      console.log("⏳ Waiting for page to process reCAPTCHA solution...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if reCAPTCHA is still present
      const recaptchaStillPresent = await page.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]") ||
          document.querySelector('iframe[title*="reCAPTCHA"]')
        );
      });

      if (!recaptchaStillPresent) {
        console.log("✅ reCAPTCHA successfully solved!");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for page to fully load
        return true;
      } else {
        console.log("⚠️ reCAPTCHA still present, but solution was injected");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait anyway
        return true; // Assume it worked
      }
    } catch (error) {
      console.log(`❌ Error solving reCAPTCHA: ${error.message}`);
      return false;
    }
  };

  try {
    console.log("🌐 Testing pre-emptive reCAPTCHA solving...");

    // Use the new navigation method
    const recaptchaSolved = await page.navigateWithRecaptchaHandling(
      "https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals"
    );

    console.log(`\n📊 Results:`);
    console.log(`   reCAPTCHA Solved: ${recaptchaSolved ? "YES" : "NO"}`);

    // Check if content is loaded
    const hasContent = await page.evaluate(() => {
      const tables = document.querySelectorAll(
        "table, tbody, .mainTable, #dealsTable"
      );
      return tables.length > 0 && tables[0].textContent.trim().length > 100;
    });

    console.log(`   Content Loaded: ${hasContent ? "YES" : "NO"}`);

    if (hasContent) {
      console.log(
        "🎉 SUCCESS: Page loaded with content after reCAPTCHA solving!"
      );
    } else {
      console.log("⚠️ WARNING: Page loaded but no content detected");
    }

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

testPreemptiveRecaptcha().catch(console.error);











