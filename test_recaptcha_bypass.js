const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testRecaptchaBypass() {
  console.log("🧪 Testing reCAPTCHA Bypass Strategies (No Third-Party APIs)");

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
    // Step 1: Establish session
    console.log("🍪 Step 1: Establishing session...");
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("✅ Session established");

    // Step 2: Navigate to target page
    console.log("\n🌐 Step 2: Navigating to target page...");
    await page.goto(
      "https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals",
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Check for reCAPTCHA
    console.log("\n🔍 Step 3: Checking for reCAPTCHA...");
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

    if (!recaptchaInfo.present) {
      console.log("✅ No reCAPTCHA detected - test complete");
      return;
    }

    // Step 4: Test bypass strategies
    console.log("\n🔄 Step 4: Testing reCAPTCHA bypass strategies...");

    // Strategy 1: Wait for auto-solve
    console.log(
      "\n📋 Strategy 1: Waiting for auto-solve (invisible reCAPTCHA)..."
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));

    let recaptchaStillPresent = await page.evaluate(() => {
      return !!(
        document.querySelector('iframe[src*="recaptcha"]') ||
        document.querySelector(".g-recaptcha") ||
        document.querySelector("#recaptcha") ||
        document.querySelector("[data-sitekey]") ||
        document.querySelector('iframe[title*="reCAPTCHA"]')
      );
    });

    if (!recaptchaStillPresent) {
      console.log("✅ reCAPTCHA auto-solved (invisible reCAPTCHA)!");
    } else {
      console.log("⚠️ reCAPTCHA still present after auto-solve attempt");

      // Strategy 2: Manual trigger
      console.log("\n📋 Strategy 2: Attempting to trigger reCAPTCHA...");
      await page.evaluate(() => {
        const recaptchaElements = document.querySelectorAll(
          'iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]'
        );
        recaptchaElements.forEach((el) => {
          try {
            el.style.display = "block";
            el.style.visibility = "visible";
            el.style.position = "relative";
            el.style.zIndex = "9999";

            el.dispatchEvent(new Event("click", { bubbles: true }));
            el.dispatchEvent(new Event("mouseover", { bubbles: true }));
            el.dispatchEvent(new Event("focus", { bubbles: true }));
          } catch (e) {
            console.log("Error triggering element:", e);
          }
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));

      recaptchaStillPresent = await page.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]") ||
          document.querySelector('iframe[title*="reCAPTCHA"]')
        );
      });

      if (!recaptchaStillPresent) {
        console.log("✅ reCAPTCHA solved after manual trigger!");
      } else {
        console.log("⚠️ reCAPTCHA still present after manual trigger");

        // Strategy 3: Page manipulation
        console.log("\n📋 Strategy 3: Attempting page manipulation bypass...");
        await page.evaluate(() => {
          const recaptchaElements = document.querySelectorAll(
            'iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]'
          );
          recaptchaElements.forEach((el) => {
            try {
              el.style.display = "none";
              el.style.visibility = "hidden";
              el.remove();
            } catch (e) {
              console.log("Error manipulating element:", e);
            }
          });

          const responseFields = document.querySelectorAll(
            'textarea[name*="recaptcha"], input[name*="recaptcha"]'
          );
          responseFields.forEach((field) => {
            try {
              field.value = "bypassed";
              field.style.display = "block";
              field.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (e) {
              console.log("Error filling field:", e);
            }
          });
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));

        recaptchaStillPresent = await page.evaluate(() => {
          return !!(
            document.querySelector('iframe[src*="recaptcha"]') ||
            document.querySelector(".g-recaptcha") ||
            document.querySelector("#recaptcha") ||
            document.querySelector("[data-sitekey]") ||
            document.querySelector('iframe[title*="reCAPTCHA"]')
          );
        });

        if (!recaptchaStillPresent) {
          console.log("✅ reCAPTCHA bypassed through page manipulation!");
        } else {
          console.log("⚠️ reCAPTCHA still present after page manipulation");
        }
      }
    }

    // Step 5: Check final page state
    console.log("\n📊 Step 5: Checking final page state...");
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

    console.log("📊 Final Page State:");
    console.log(`   URL: ${pageState.url}`);
    console.log(`   Title: ${pageState.title}`);
    console.log(`   Has Content: ${pageState.hasContent ? "YES" : "NO"}`);
    console.log(
      `   reCAPTCHA Present: ${pageState.recaptchaStillPresent ? "YES" : "NO"}`
    );

    if (pageState.hasContent) {
      console.log("🎉 SUCCESS: Page has content after bypass attempts!");
    } else {
      console.log(
        "⚠️ WARNING: No content detected - reCAPTCHA may still be blocking"
      );
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

testRecaptchaBypass().catch(console.error);
