const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function testLod() {
  console.log("🚀 Testing Lod with reCAPTCHA bypass...");

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();

  // Set realistic viewport
  await page.setViewport({
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
  });

  // Set realistic user agent
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // Apply advanced reCAPTCHA bypass
  await page.evaluateOnNewDocument(() => {
    // Mock grecaptcha - more comprehensive
    Object.defineProperty(window, "grecaptcha", {
      get: () => ({
        ready: (callback) => {
          console.log("🔄 Mock grecaptcha.ready called");
          setTimeout(callback, 100);
          return Promise.resolve();
        },
        execute: () => {
          console.log("🔄 Mock grecaptcha.execute called");
          return Promise.resolve("fake-token-12345");
        },
        render: (container, options) => {
          console.log("🔄 Mock reCAPTCHA render called");
          return "fake-widget-id-12345";
        },
        reset: () => {
          console.log("🔄 Mock grecaptcha.reset called");
        },
        getResponse: () => {
          console.log("🔄 Mock grecaptcha.getResponse called");
          return "fake-response-12345";
        },
      }),
    });

    // Also set it directly
    window.grecaptcha = {
      ready: (callback) => {
        setTimeout(callback, 100);
        return Promise.resolve();
      },
      execute: () => Promise.resolve("fake-token-12345"),
      render: () => "fake-widget-id-12345",
      reset: () => {},
      getResponse: () => "fake-response-12345",
    };

    // Block reCAPTCHA scripts
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (child) {
      if (
        child.tagName === "SCRIPT" &&
        child.src &&
        child.src.includes("recaptcha")
      ) {
        console.log("🚫 Blocked reCAPTCHA script:", child.src);
        return child;
      }
      if (child.className && child.className.includes("g-recaptcha")) {
        console.log("🚫 Blocked reCAPTCHA element:", child.className);
        return child;
      }
      return originalAppendChild.call(this, child);
    };

    // Block reCAPTCHA elements from being inserted
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, referenceNode) {
      if (
        newNode.tagName === "SCRIPT" &&
        newNode.src &&
        newNode.src.includes("recaptcha")
      ) {
        console.log("🚫 Blocked reCAPTCHA script insert:", newNode.src);
        return newNode;
      }
      if (newNode.className && newNode.className.includes("g-recaptcha")) {
        console.log("🚫 Blocked reCAPTCHA element insert:", newNode.className);
        return newNode;
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };

    // Block reCAPTCHA network requests
    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
      if (typeof url === "string" && url.includes("recaptcha")) {
        console.log("🚫 Blocked reCAPTCHA fetch request:", url);
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
      return originalFetch.call(this, url, options);
    };

    // Block reCAPTCHA XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
      if (typeof url === "string" && url.includes("recaptcha")) {
        console.log("🚫 Blocked reCAPTCHA XHR request:", url);
        return;
      }
      return originalXHROpen.call(this, method, url, async, user, password);
    };

    // Remove existing reCAPTCHA elements
    const removeRecaptchaElements = () => {
      const recaptchaElements = document.querySelectorAll(
        '.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'
      );
      recaptchaElements.forEach((element) => {
        console.log("🗑️ Removing reCAPTCHA element");
        element.remove();
      });
    };

    // Watch for new reCAPTCHA elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList && node.classList.contains("g-recaptcha")) {
              console.log("🗑️ Removing new reCAPTCHA element");
              node.remove();
            }
            if (
              node.tagName === "IFRAME" &&
              node.src &&
              node.src.includes("recaptcha")
            ) {
              console.log("🗑️ Removing new reCAPTCHA iframe");
              node.remove();
            }
          }
        });
      });
    });

    // Initialize
    removeRecaptchaElements();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("🛡️ Advanced reCAPTCHA bypass techniques loaded");
  });

  try {
    // Navigate to Lod deals page
    const lodUrl =
      "https://www.nadlan.gov.il/?view=settlement&id=7000&page=deals";
    console.log(`🌐 Navigating to: ${lodUrl}`);

    await page.goto(lodUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("✅ Page loaded");

    // Wait for content to load
    console.log("⏳ Waiting for content to load...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Try to click on deals tab or button if exists
    try {
      console.log("🔍 Looking for deals tab/button...");
      const dealsButton = await page.$('a[href*="page=deals"], button[data-page="deals"], .deals-tab, .deals-button');
      if (dealsButton) {
        console.log("🖱️ Clicking deals button...");
        await dealsButton.click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.log("⚠️ No deals button found or click failed");
    }

    // Try to wait for the deals table specifically
    try {
      console.log("🔍 Waiting for deals table...");
      await page.waitForSelector("table#dealsTable", { timeout: 20000 });
      console.log("✅ Deals table found!");
    } catch (error) {
      console.log("⚠️ Deals table not found, trying alternative selectors...");
    }

    // Scroll to load more content
    console.log("📜 Scrolling to load content...");
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Try to trigger any lazy loading
    console.log("🔄 Trying to trigger lazy loading...");
    await page.evaluate(() => {
      // Try to trigger scroll events
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
      
      // Try to find and click any "load more" buttons
      const loadMoreButtons = document.querySelectorAll('button[class*="load"], button[class*="more"], .load-more, .show-more');
      loadMoreButtons.forEach(button => {
        if (button.offsetParent !== null) { // Check if visible
          button.click();
        }
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for reCAPTCHA
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
      console.log("🚨 reCAPTCHA detected!");
    } else {
      console.log("✅ No reCAPTCHA detected - bypass successful!");
    }

    // Look for deals table with multiple selectors
    const dealsInfo = await page.evaluate(() => {
      // Try different selectors
      const selectors = [
        "table#dealsTable tbody tr",
        "table tbody tr",
        ".deal-item",
        ".transaction-item",
        ".property-item",
        "[data-deal-id]",
        "tr[data-id]"
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          return {
            count: elements.length,
            selector: selector,
            found: true
          };
        }
      }

      // Check if table exists but is empty
      const table = document.querySelector("table#dealsTable");
      if (table) {
        console.log("Table exists but no rows found");
        return {
          count: 0,
          selector: "table#dealsTable",
          found: true,
          empty: true
        };
      }

      return {
        count: 0,
        selector: "none",
        found: false
      };
    });

    if (dealsInfo.found) {
      if (dealsInfo.empty) {
        console.log("📊 Table found but no deals data loaded");
      } else {
        console.log(`📊 Found ${dealsInfo.count} deals in Lod using selector: ${dealsInfo.selector}`);
      }
    } else {
      console.log("❌ No deals table or data found");
    }

    // Check page content for debugging
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasTable: !!document.querySelector("table"),
        hasDealsTable: !!document.querySelector("table#dealsTable"),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });

    console.log("📄 Page info:", pageContent);

    // Keep browser open for observation
    console.log("🔍 Browser will stay open for 30 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await browser.close();
    console.log("🔒 Browser closed");
  }
}

// Run the test
testLod().catch(console.error);
