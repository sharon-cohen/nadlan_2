const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

class NeighborhoodDealsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init(headless = true) {
    console.log("🚀 Initializing browser with advanced reCAPTCHA bypass...");

    const launchArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=VizDisplayCompositor",
      "--disable-web-security",
      "--disable-extensions",
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
      "--disable-background-networking",
      "--disable-sync-preferences",
      "--disable-extensions-http-throttling",
      "--disable-ipc-flooding-protection",
      "--aggressive-cache-discard",
      "--force-color-profile=srgb",
      "--metrics-recording-only",
      "--use-mock-keychain",
      "--window-size=1920,1080",
      "--disable-features=TranslateUI",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
      "--password-store=basic",
      "--use-mock-keychain",
    ];

    this.browser = await puppeteer.launch({
      headless: headless,
      args: launchArgs,
      ignoreDefaultArgs: ["--enable-automation"],
    });
    this.page = await this.browser.newPage();

    // Set realistic viewport
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 },
    ];
    const randomViewport =
      viewports[Math.floor(Math.random() * viewports.length)];
    await this.page.setViewport(randomViewport);

    // More realistic User Agents
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36",
    ];

    const randomUserAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUserAgent);
    console.log(`🌐 Using User Agent: ${randomUserAgent}`);

    // Advanced anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      // Remove automation indicators
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

      // Override the plugins property to use a custom getter
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override the languages property to use a custom getter
      Object.defineProperty(navigator, "languages", {
        get: () => ["he-IL", "he", "en-US", "en"],
      });

      // Override the permissions property
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // Mock chrome runtime
      window.chrome = {
        runtime: {},
        loadTimes: function () {
          return {
            requestTime: Date.now() / 1000,
            startLoadTime: Date.now() / 1000,
            commitLoadTime: Date.now() / 1000,
            finishDocumentLoadTime: Date.now() / 1000,
            finishLoadTime: Date.now() / 1000,
            firstPaintTime: Date.now() / 1000,
            firstPaintAfterLoadTime: 0,
            navigationType: "navigate",
          };
        },
        csi: function () {
          return {
            pageT: Date.now(),
            startE: Date.now(),
            tran: 15,
          };
        },
        app: {},
      };

      // Mock screen properties
      Object.defineProperty(screen, "availHeight", {
        get: () => window.screen.height - 40,
      });
      Object.defineProperty(screen, "availWidth", {
        get: () => window.screen.width,
      });

      // Mock timezone
      Object.defineProperty(Intl.DateTimeFormat.prototype, "resolvedOptions", {
        value: function () {
          return {
            timeZone: "Asia/Jerusalem",
            locale: "he-IL",
          };
        },
      });

      // Mock more realistic navigator properties
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => 4,
      });

      Object.defineProperty(navigator, "deviceMemory", {
        get: () => 8,
      });

      // Mock realistic connection
      Object.defineProperty(navigator, "connection", {
        get: () => ({
          effectiveType: "4g",
          rtt: 50,
          downlink: 10,
        }),
      });

      // ===== ADVANCED reCAPTCHA BYPASS TECHNIQUES =====

      // Override reCAPTCHA detection - more comprehensive
      Object.defineProperty(window, "grecaptcha", {
        get: () => ({
          ready: (callback) => {
            setTimeout(callback, 100);
            return Promise.resolve();
          },
          execute: () => Promise.resolve("fake-token-12345"),
          render: (container, options) => {
            console.log("🔄 Mock reCAPTCHA render called");
            return "fake-widget-id-12345";
          },
          reset: () => {
            console.log("🔄 Mock reCAPTCHA reset called");
          },
          getResponse: () => {
            console.log("🔄 Mock reCAPTCHA getResponse called");
            return "fake-response-12345";
          },
        }),
      });

      // Override window.grecaptcha directly
      window.grecaptcha = {
        ready: (callback) => {
          setTimeout(callback, 100);
          return Promise.resolve();
        },
        execute: () => Promise.resolve("fake-token-12345"),
        render: (container, options) => {
          console.log("🔄 Mock reCAPTCHA render called");
          return "fake-widget-id-12345";
        },
        reset: () => {
          console.log("🔄 Mock reCAPTCHA reset called");
        },
        getResponse: () => {
          console.log("🔄 Mock reCAPTCHA getResponse called");
          return "fake-response-12345";
        },
      };

      // Block reCAPTCHA scripts and elements
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

      // Block reCAPTCHA elements from being added
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
          console.log(
            "🚫 Blocked reCAPTCHA element insert:",
            newNode.className
          );
          return newNode;
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
      };

      // Override document.createElement to block reCAPTCHA elements
      const originalCreateElement = document.createElement;
      document.createElement = function (tagName, options) {
        const element = originalCreateElement.call(this, tagName, options);

        // Block reCAPTCHA iframes
        if (tagName.toLowerCase() === "iframe") {
          const originalSrc = Object.getOwnPropertyDescriptor(
            HTMLIFrameElement.prototype,
            "src"
          );
          Object.defineProperty(element, "src", {
            get: function () {
              return this.getAttribute("src") || "";
            },
            set: function (value) {
              if (value && value.includes("recaptcha")) {
                console.log("🚫 Blocked reCAPTCHA iframe:", value);
                return;
              }
              this.setAttribute("src", value);
            },
          });
        }

        // Block reCAPTCHA divs
        if (tagName.toLowerCase() === "div") {
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function (name, value) {
            if (name === "class" && value && value.includes("g-recaptcha")) {
              console.log("🚫 Blocked reCAPTCHA div class:", value);
              return;
            }
            return originalSetAttribute.call(this, name, value);
          };
        }

        return element;
      };

      // Mock canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function () {
        const context = this.getContext("2d");
        if (context) {
          // Add some noise to make it look more human
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 3) - 1;
            imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
            imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
          }
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
      };

      // Mock WebGL fingerprinting
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) {
          // UNMASKED_VENDOR_WEBGL
          return "Intel Inc.";
        }
        if (parameter === 37446) {
          // UNMASKED_RENDERER_WEBGL
          return "Intel Iris OpenGL Engine";
        }
        return originalGetParameter.call(this, parameter);
      };

      // Mock additional properties that reCAPTCHA might check
      Object.defineProperty(navigator, "platform", {
        get: () => "MacIntel",
      });

      Object.defineProperty(navigator, "vendor", {
        get: () => "Google Inc.",
      });

      // Mock Date.getTimezoneOffset to be consistent
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function () {
        return -120; // Israel timezone
      };

      // Additional reCAPTCHA blocking techniques

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
      XMLHttpRequest.prototype.open = function (
        method,
        url,
        async,
        user,
        password
      ) {
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
          console.log("🗑️ Removing reCAPTCHA element:", element);
          element.remove();
        });
      };

      // Run removal immediately and on DOM changes
      removeRecaptchaElements();

      // Watch for new reCAPTCHA elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Element node
              if (node.classList && node.classList.contains("g-recaptcha")) {
                console.log("🗑️ Removing new reCAPTCHA element:", node);
                node.remove();
              }
              if (
                node.tagName === "IFRAME" &&
                node.src &&
                node.src.includes("recaptcha")
              ) {
                console.log("🗑️ Removing new reCAPTCHA iframe:", node);
                node.remove();
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      console.log("🛡️ Advanced reCAPTCHA bypass techniques loaded");
    });

    // Set realistic headers
    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
      DNT: "1",
      Connection: "keep-alive",
    });

    // Set realistic timezone
    await this.page.emulateTimezone("Asia/Jerusalem");

    // Set realistic geolocation
    await this.page.setGeolocation({ latitude: 31.7683, longitude: 35.2137 }); // Jerusalem coordinates

    console.log("✅ Browser initialized with advanced reCAPTCHA bypass");
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async humanLikeBehavior() {
    // Random mouse movements
    await this.page.mouse.move(
      Math.random() * 800 + 100,
      Math.random() * 600 + 100,
      { steps: Math.floor(Math.random() * 10) + 5 }
    );

    // Random scroll
    const scrollAmount = Math.floor(Math.random() * 300) + 100;
    await this.page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);

    // Random delay (3-7 seconds)
    await this.randomDelay(3000, 7000);
  }

  async testRecaptchaBypass() {
    try {
      console.log("🧪 Testing reCAPTCHA bypass on Nadlan website...");

      await this.init(false); // Open visible browser

      // Navigate to Nadlan
      console.log("🌐 Navigating to Nadlan...");
      await this.page.goto("https://www.nadlan.gov.il", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for page to load
      await this.delay(5000);

      // Check if reCAPTCHA is present
      const recaptchaPresent = await this.page.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]") ||
          document.querySelector('iframe[title*="reCAPTCHA"]')
        );
      });

      if (recaptchaPresent) {
        console.log("🚨 reCAPTCHA detected on page!");
      } else {
        console.log("✅ No reCAPTCHA detected - bypass successful!");
      }

      // Try to navigate to a deals page
      console.log("🔍 Testing navigation to deals page...");
      await this.page.goto(
        "https://www.nadlan.gov.il/?view=neighborhood&id=65210264&page=deals",
        {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        }
      );

      await this.delay(5000);

      // Check for reCAPTCHA again
      const recaptchaPresent2 = await this.page.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]") ||
          document.querySelector('iframe[title*="reCAPTCHA"]')
        );
      });

      if (recaptchaPresent2) {
        console.log("🚨 reCAPTCHA detected on deals page!");
      } else {
        console.log(
          "✅ No reCAPTCHA detected on deals page - bypass successful!"
        );
      }

      // Check if we can see deals
      const dealsFound = await this.page.evaluate(() => {
        const selectors = [
          "#dealsTable tbody tr",
          ".mainTable tbody tr",
          "table tbody tr",
          ".deals-table tbody tr",
          '[class*="deal"] tr',
          ".mainTable__row",
          "#dealsTable .mainTable__row",
          ".data-table tbody tr",
        ];

        for (let selector of selectors) {
          const rows = document.querySelectorAll(selector);
          if (rows.length > 0) {
            return rows.length;
          }
        }
        return 0;
      });

      if (dealsFound > 0) {
        console.log(
          `✅ Successfully found ${dealsFound} deals - scraping works!`
        );
      } else {
        console.log(
          "⚠️ No deals found - might be blocked or no data available"
        );
      }

      console.log(
        "🎉 Test completed! Browser will stay open for 30 seconds..."
      );
      await this.delay(30000);
    } catch (error) {
      console.log(`❌ Error during test: ${error.message}`);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Test the reCAPTCHA bypass
const scraper = new NeighborhoodDealsScraper();
scraper.testRecaptchaBypass();
