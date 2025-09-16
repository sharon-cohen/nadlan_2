const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testExtensionApproach() {
  console.log("🚀 Testing 2Captcha Extension Approach for Invisible reCAPTCHA");

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

      // Initialize 2Captcha Extension configuration
      if (window.chrome && window.chrome.storage) {
        // Set extension configuration to enable auto-solving
        window.chrome.storage.local.set({
          config: {
            isPluginEnabled: true,
            apiKey: "096fefd6b3e24bad0c487f302498687d",
            autoSolveInvisibleRecaptchaV2: true,
            autoSolveRecaptchaV2: true,
            enabledForInvisibleRecaptchaV2: true,
            enabledForRecaptchaV2: true,
            buttonPosition: "inner",
          },
        });
      }
    });
    console.log("✅ Cookie handling and extension configuration completed");

    // Navigate directly to target page with reCAPTCHA
    console.log("\n🌐 Step 2: Navigating directly to target page...");
    await page.goto(
      "https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals",
      {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      }
    );
    console.log("✅ Target page loaded");

    // Wait for extension to load and appear
    console.log(
      "\n🔌 Step 3: Waiting for 2Captcha Extension to load and appear..."
    );
    await waitForExtensionToAppear();

    async function waitForExtensionToAppear() {
      console.log("🔌 Waiting for 2Captcha Extension to appear...");

      let attempts = 0;
      const maxAttempts = 20; // 2 minutes max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 6000)); // Wait 6 seconds between checks
        attempts++;

        const extensionStatus = await page.evaluate(() => {
          // Look for 2Captcha extension elements
          const extensionElements = document.querySelectorAll(
            ".captcha-solver, [data-captcha-type], .captcha-solver_inner"
          );

          if (extensionElements.length > 0) {
            const status = extensionElements[0].getAttribute("data-state");
            const type = extensionElements[0].getAttribute("data-captcha-type");
            return {
              present: true,
              status: status,
              type: type,
              elementCount: extensionElements.length,
            };
          }

          return { present: false };
        });

        console.log(
          `🔍 Extension check ${attempts}/${maxAttempts}: ${
            extensionStatus.present ? "FOUND" : "NOT FOUND"
          }`
        );

        if (extensionStatus.present) {
          console.log(
            `✅ 2Captcha Extension detected! Status: ${extensionStatus.status}, Type: ${extensionStatus.type}`
          );
          console.log(`🔌 Extension is ready and loaded!`);
          return true;
        }

        // Also check for any reCAPTCHA elements that might trigger the extension
        const recaptchaPresent = await page.evaluate(() => {
          return !!(
            document.querySelector('iframe[src*="recaptcha"]') ||
            document.querySelector(".g-recaptcha") ||
            document.querySelector("#recaptcha") ||
            document.querySelector("[data-sitekey]")
          );
        });

        if (recaptchaPresent) {
          console.log(
            "🔍 reCAPTCHA detected on main site, extension should activate..."
          );
          // Wait a bit more for extension to detect and activate
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      console.log(
        "⚠️ Extension did not appear after waiting, continuing anyway..."
      );
      return false;
    }

    async function triggerExtensionSolve() {
      console.log("🔧 Triggering 2Captcha Extension to solve reCAPTCHA...");

      try {
        // Try to click the extension button if it exists
        await page.evaluate(() => {
          // Look for 2Captcha extension buttons
          const extensionButtons = document.querySelectorAll(
            ".captcha-solver, [data-captcha-type], .captcha-solver_inner"
          );

          extensionButtons.forEach((button) => {
            if (
              button.style.display !== "none" &&
              button.offsetParent !== null
            ) {
              console.log("Clicking 2Captcha extension button...");
              button.click();
            }
          });

          // Also try to trigger reCAPTCHA manually to activate extension
          const recaptchaElements = document.querySelectorAll(
            'iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]'
          );

          recaptchaElements.forEach((el) => {
            // Make elements visible and trigger events
            el.style.display = "block";
            el.style.visibility = "visible";
            el.style.position = "relative";
            el.style.zIndex = "9999";

            // Trigger events to activate extension
            el.dispatchEvent(new Event("click", { bubbles: true }));
            el.dispatchEvent(new Event("mouseover", { bubbles: true }));
            el.dispatchEvent(new Event("focus", { bubbles: true }));
          });
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Try to send a message to the extension to start solving
        await page.evaluate(() => {
          if (window.chrome && window.chrome.runtime) {
            // Send message to extension to start solving
            window.chrome.runtime.sendMessage(
              "ifibfemgeogfhoebkmokieepdoobkbpo",
              {
                action: "solveRecaptcha",
              }
            );
          }
        });

        console.log("✅ Extension trigger attempts completed");
      } catch (error) {
        console.log(`⚠️ Error triggering extension: ${error.message}`);
      }
    }

    // Check for reCAPTCHA
    console.log("\n🔍 Step 4: Checking for reCAPTCHA...");
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

    // Check extension status
    console.log("\n🔌 Step 5: Checking 2Captcha Extension status...");
    const extensionStatus = await page.evaluate(() => {
      // Look for 2Captcha extension elements
      const extensionElements = document.querySelectorAll(
        ".captcha-solver, [data-captcha-type], .captcha-solver_inner"
      );

      if (extensionElements.length > 0) {
        const status = extensionElements[0].getAttribute("data-state");
        const type = extensionElements[0].getAttribute("data-captcha-type");
        return {
          present: true,
          status: status,
          type: type,
          elementCount: extensionElements.length,
        };
      }

      return { present: false };
    });

    console.log("🔌 Extension Status:");
    console.log(`   Present: ${extensionStatus.present}`);
    if (extensionStatus.present) {
      console.log(`   Status: ${extensionStatus.status}`);
      console.log(`   Type: ${extensionStatus.type}`);
      console.log(`   Element Count: ${extensionStatus.elementCount}`);
    }

    // Wait for extension to solve (if solving) or trigger it
    if (extensionStatus.present && extensionStatus.status === "solving") {
      console.log("\n⏳ Step 6: Waiting for extension to solve reCAPTCHA...");
    } else if (
      extensionStatus.present &&
      (extensionStatus.status === null || extensionStatus.status === "idle")
    ) {
      console.log("\n🔧 Step 6: Extension is idle, triggering solving...");
      await triggerExtensionSolve();
    }

    if (
      extensionStatus.present &&
      (extensionStatus.status === "solving" ||
        extensionStatus.status === null ||
        extensionStatus.status === "idle")
    ) {
      console.log("\n⏳ Step 7: Waiting for extension to solve reCAPTCHA...");

      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;

        const status = await page.evaluate(() => {
          const extensionElements = document.querySelectorAll(
            ".captcha-solver, [data-captcha-type], .captcha-solver_inner"
          );

          if (extensionElements.length > 0) {
            return extensionElements[0].getAttribute("data-state");
          }

          return "not_found";
        });

        console.log(
          `🔍 Extension status check ${attempts}/${maxAttempts}: ${status}`
        );

        if (status === "solved") {
          console.log("🎉 reCAPTCHA solved by extension!");
          break;
        } else if (status === "error") {
          console.log("❌ Extension failed to solve reCAPTCHA");
          break;
        } else if (status === "not_found") {
          console.log(
            "⚠️ Extension elements not found, checking if reCAPTCHA is gone..."
          );

          // Check if reCAPTCHA is still present
          const recaptchaStillPresent = await page.evaluate(() => {
            return !!(
              document.querySelector('iframe[src*="recaptcha"]') ||
              document.querySelector(".g-recaptcha") ||
              document.querySelector("#recaptcha") ||
              document.querySelector("[data-sitekey]")
            );
          });

          if (!recaptchaStillPresent) {
            console.log("✅ reCAPTCHA appears to be gone!");
            break;
          }
        }
      }
    }

    // Final status check
    console.log("\n📊 Step 8: Final status check...");
    const finalStatus = await page.evaluate(() => {
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
        extensionStatus: (() => {
          const extensionElements = document.querySelectorAll(
            ".captcha-solver, [data-captcha-type], .captcha-solver_inner"
          );

          if (extensionElements.length > 0) {
            return extensionElements[0].getAttribute("data-state");
          }

          return "not_found";
        })(),
      };
    });

    console.log("📊 Final Status:");
    console.log(`   URL: ${finalStatus.url}`);
    console.log(`   Title: ${finalStatus.title}`);
    console.log(`   Has Content: ${finalStatus.hasContent ? "YES" : "NO"}`);
    console.log(
      `   reCAPTCHA Present: ${
        finalStatus.recaptchaStillPresent ? "YES" : "NO"
      }`
    );
    console.log(`   Extension Status: ${finalStatus.extensionStatus}`);

    // Results
    console.log("\n🎯 Results Summary:");
    if (extensionStatus.present && !finalStatus.recaptchaStillPresent) {
      console.log("🎉 SUCCESS: 2Captcha Extension solved reCAPTCHA!");
    } else if (extensionStatus.present && finalStatus.recaptchaStillPresent) {
      console.log("⚠️ PARTIAL: Extension detected but reCAPTCHA still present");
    } else if (!extensionStatus.present) {
      console.log("❌ FAILED: 2Captcha Extension not detected");
    }

    console.log("\n💡 Extension Approach Benefits:");
    console.log("   🔌 Works with invisible reCAPTCHA v2");
    console.log("   🤖 Automatic detection and solving");
    console.log("   🎯 No API calls needed");
    console.log("   🔄 Handles both visible and invisible");
    console.log("   ⚡ Fast and reliable");

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

testExtensionApproach().catch(console.error);
