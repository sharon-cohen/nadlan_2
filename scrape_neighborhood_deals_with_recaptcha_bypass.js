const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const fs = require("fs");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

// Add reCAPTCHA plugin (optional - for 2captcha integration)
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: "YOUR_2CAPTCHA_TOKEN", // Replace with your 2captcha API key
    },
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  })
);

class NadlanScraperWithRecaptchaBypass {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async init(headless = false) {
    console.log("🚀 Initializing browser with advanced reCAPTCHA bypass...");

    this.browser = await puppeteer.launch({
      headless: headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-field-trial-config",
        "--disable-back-forward-cache",
        "--disable-ipc-flooding-protection",
        "--disable-hang-monitor",
        "--disable-prompt-on-repost",
        "--disable-sync",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-pings",
        "--password-store=basic",
        "--use-mock-keychain",
        "--disable-component-extensions-with-background-pages",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--metrics-recording-only",
        "--no-first-run",
        "--safebrowsing-disable-auto-update",
        "--enable-automation",
        "--password-store=basic",
        "--use-mock-keychain",
      ],
    });

    this.page = await this.browser.newPage();

    // Set realistic viewport
    await this.page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
    });

    // Set realistic user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set geolocation to Israel
    await this.page.setGeolocation({ latitude: 31.7683, longitude: 35.2137 });

    // Apply advanced reCAPTCHA bypass techniques
    await this.bypassRecaptchaAdvanced();

    console.log(
      "✅ Browser initialized with advanced anti-detection and reCAPTCHA bypass"
    );
  }

  async bypassRecaptchaAdvanced() {
    console.log("🛡️ Applying advanced reCAPTCHA bypass techniques...");

    await this.page.evaluateOnNewDocument(() => {
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

      // Also set it directly for compatibility
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

    // Set additional headers to avoid detection
    await this.page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    });
  }

  async solveRecaptcha() {
    try {
      console.log("🔍 Checking for reCAPTCHA...");

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

      if (!recaptchaPresent) {
        console.log("✅ No reCAPTCHA detected");
        return true;
      }

      console.log("🚨 reCAPTCHA detected, attempting to solve...");

      // Try to solve reCAPTCHA using the plugin
      const { captchas, errors } = await this.page.solveRecaptchas();

      if (errors && errors.length > 0) {
        console.log(`❌ reCAPTCHA solving errors: ${errors.join(", ")}`);
        return false;
      }

      if (captchas && captchas.length > 0) {
        console.log(`✅ Successfully solved ${captchas.length} reCAPTCHA(s)`);

        // Wait for the page to process the solved captcha
        await this.delay(3000);

        // Check if we need to submit the form
        const submitButton = await this.page.$(
          'input[type="submit"], button[type="submit"], .g-recaptcha-response'
        );
        if (submitButton) {
          console.log("🔄 Submitting form after reCAPTCHA solve...");
          await submitButton.click();
          await this.delay(2000);
        }

        return true;
      }

      console.log("⚠️ No reCAPTCHA captchas found to solve");
      return true;
    } catch (error) {
      console.log(`❌ Error solving reCAPTCHA: ${error.message}`);
      return false;
    }
  }

  async scrapeCityDeals(cityName, cityId) {
    console.log(`🏙️ Scraping deals for city: ${cityName} (ID: ${cityId})`);

    try {
      // Navigate directly to the city deals page using the ID
      const cityUrl = `https://www.nadlan.gov.il/?view=settlement&id=${cityId}&page=deals`;

      console.log(`🌐 Navigating to: ${cityUrl}`);
      await this.page.goto(cityUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await this.delay(2000);

      // Check for reCAPTCHA
      await this.solveRecaptcha();

      // Wait for content to load
      await this.page.waitForSelector("body", { timeout: 10000 });

      // Human-like scrolling to load content
      await this.humanLikeScroll();

      // Extract deals directly from the city page
      console.log(`🔍 Extracting deals from ${cityName}...`);

      const dealsData = await this.page.evaluate(() => {
        const deals = [];

        // Try to find the deals table
        const table = document.querySelector("table#dealsTable");
        if (!table) {
          console.log("No deals table found");
          return deals;
        }

        const rows = table.querySelectorAll("tbody tr");
        console.log(`Found ${rows.length} rows in deals table`);

        rows.forEach((row, index) => {
          try {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 6) {
              const deal = {
                address: cells[0]?.textContent?.trim() || "",
                price: cells[1]?.textContent?.trim() || "",
                area: cells[2]?.textContent?.trim() || "",
                rooms: cells[3]?.textContent?.trim() || "",
                floor: cells[4]?.textContent?.trim() || "",
                date: cells[5]?.textContent?.trim() || "",
                type: cells[6]?.textContent?.trim() || "",
              };

              // Only add if we have meaningful data
              if (
                deal.address &&
                deal.price &&
                deal.address !== "" &&
                deal.price !== ""
              ) {
                deals.push(deal);
              }
            }
          } catch (error) {
            console.log(`Error extracting row ${index}:`, error);
          }
        });

        return deals;
      });

      const totalDeals = dealsData.length;
      console.log(`📊 Found ${totalDeals} deals in ${cityName}`);

      // Add city info to each deal
      dealsData.forEach((deal) => {
        deal.city = cityName;
      });

      // Save deals to CSV
      if (dealsData.length > 0) {
        await this.saveDealsToCSV(dealsData, cityName);
        console.log(`💾 Saved ${totalDeals} deals to ${cityName}_deals.csv`);
      } else {
        console.log(`⚠️ No deals found for city: ${cityName}`);
      }

      return totalDeals;
    } catch (error) {
      console.log(`❌ Error scraping city ${cityName}: ${error.message}`);
      return 0;
    }
  }

  async scrapeNeighborhoodDeals(neighborhoodUrl, neighborhoodName, cityName) {
    try {
      // Navigate to neighborhood deals page
      const fullUrl = neighborhoodUrl.includes("http")
        ? neighborhoodUrl
        : `https://www.nadlan.gov.il${neighborhoodUrl}`;

      const dealsUrl = fullUrl.replace(
        "view=neighborhood",
        "view=neighborhood&page=deals"
      );

      await this.page.goto(dealsUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await this.delay(2000);

      // Check for reCAPTCHA
      await this.solveRecaptcha();

      // Wait for content to load
      await this.page.waitForSelector("body", { timeout: 10000 });

      // Check if we're on the deals page
      const isDealsPage = await this.page.evaluate(() => {
        return (
          window.location.href.includes("page=deals") ||
          document.querySelector(".deals-container") ||
          document.querySelector("[data-page='deals']")
        );
      });

      if (!isDealsPage) {
        console.log(`⚠️ Not on deals page for ${neighborhoodName}`);
        return [];
      }

      // Human-like scrolling
      await this.humanLikeScroll();

      // Extract deals data
      const deals = await this.page.evaluate(() => {
        const dealsData = [];
        const dealElements = document.querySelectorAll(
          ".deal-item, .transaction-item, .property-item, [data-deal-id]"
        );

        dealElements.forEach((element) => {
          try {
            const deal = {
              address: "",
              price: "",
              area: "",
              rooms: "",
              floor: "",
              date: "",
              type: "",
            };

            // Extract address
            const addressEl = element.querySelector(
              ".address, .property-address, [data-address]"
            );
            if (addressEl) {
              deal.address = addressEl.textContent.trim();
            }

            // Extract price
            const priceEl = element.querySelector(
              ".price, .property-price, [data-price]"
            );
            if (priceEl) {
              deal.price = priceEl.textContent.trim();
            }

            // Extract area
            const areaEl = element.querySelector(
              ".area, .property-area, [data-area]"
            );
            if (areaEl) {
              deal.area = areaEl.textContent.trim();
            }

            // Extract rooms
            const roomsEl = element.querySelector(
              ".rooms, .property-rooms, [data-rooms]"
            );
            if (roomsEl) {
              deal.rooms = roomsEl.textContent.trim();
            }

            // Extract floor
            const floorEl = element.querySelector(
              ".floor, .property-floor, [data-floor]"
            );
            if (floorEl) {
              deal.floor = floorEl.textContent.trim();
            }

            // Extract date
            const dateEl = element.querySelector(
              ".date, .property-date, [data-date]"
            );
            if (dateEl) {
              deal.date = dateEl.textContent.trim();
            }

            // Extract type
            const typeEl = element.querySelector(
              ".type, .property-type, [data-type]"
            );
            if (typeEl) {
              deal.type = typeEl.textContent.trim();
            }

            // Only add if we have at least address and price
            if (deal.address && deal.price) {
              dealsData.push(deal);
            }
          } catch (error) {
            console.log("Error extracting deal data:", error);
          }
        });

        return dealsData;
      });

      console.log(
        `📊 Extracted ${deals.length} deals from ${neighborhoodName}`
      );

      // Add neighborhood and city info to each deal
      deals.forEach((deal) => {
        deal.neighborhood = neighborhoodName;
        deal.city = cityName;
      });

      return deals;
    } catch (error) {
      console.log(
        `❌ Error scraping neighborhood ${neighborhoodName}: ${error.message}`
      );
      return [];
    }
  }

  async humanLikeScroll() {
    // Random delay before scrolling (3-7 seconds)
    const initialDelay = Math.floor(Math.random() * 4000) + 3000;
    await this.delay(initialDelay);

    // Get page height
    const pageHeight = await this.page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
    });

    // Scroll in chunks with random delays
    let currentPosition = 0;
    const chunkSize = Math.floor(Math.random() * 300) + 200;

    while (currentPosition < pageHeight) {
      currentPosition += chunkSize;
      await this.page.evaluate((position) => {
        window.scrollTo(0, position);
      }, currentPosition);

      // Random delay between scrolls (100-500ms)
      const scrollDelay = Math.floor(Math.random() * 400) + 100;
      await this.delay(scrollDelay);
    }

    // Scroll back to top
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // Final delay
    await this.delay(1000);
  }

  async saveDealsToCSV(deals, cityName) {
    if (!deals || deals.length === 0) return;

    const csvContent = [
      "Address,Price,Area,Rooms,Floor,Date,Type,Neighborhood,City",
      ...deals.map((deal) =>
        [
          `"${deal.address || ""}"`,
          `"${deal.price || ""}"`,
          `"${deal.area || ""}"`,
          `"${deal.rooms || ""}"`,
          `"${deal.floor || ""}"`,
          `"${deal.date || ""}"`,
          `"${deal.type || ""}"`,
          `"${deal.neighborhood || ""}"`,
          `"${deal.city || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const filename = `${cityName}_deals.csv`;
    fs.writeFileSync(filename, csvContent, "utf8");
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }
}

// Main execution
async function main() {
  const scraper = new NadlanScraperWithRecaptchaBypass();

  try {
    await scraper.init(false); // Set to true for headless mode

    // Scrape all cities from councils-with-folders
    const fs = require("fs");
    const path = require("path");

    const councilsPath = path.join(__dirname, "councils-with-folders");

    if (!fs.existsSync(councilsPath)) {
      console.log("❌ councils-with-folders directory not found");
      return;
    }

    const cities = fs.readdirSync(councilsPath);
    console.log(`🏙️ Found ${cities.length} cities to scrape`);

    let totalDealsAll = 0;

    for (let i = 0; i < cities.length; i++) {
      const cityName = cities[i];
      console.log(`\n🏙️ Scraping city ${i + 1}/${cities.length}: ${cityName}`);

      try {
        // Try to find city ID from existing files
        const cityPath = path.join(councilsPath, cityName);
        const areasFile = path.join(cityPath, `${cityName}_areas.csv`);

        let cityId = null;
        if (fs.existsSync(areasFile)) {
          const areasContent = fs.readFileSync(areasFile, "utf8");
          const lines = areasContent.trim().split("\n");
          if (lines.length > 1) {
            // Try to extract city ID from first neighborhood
            const firstLine = lines[1];
            const parts = firstLine.split(",");
            if (parts.length >= 2) {
              // Look for city ID in the neighborhood data
              cityId = parts[0].trim();
            }
          }
        }

        if (!cityId) {
          console.log(`⚠️ No city ID found for ${cityName}, skipping...`);
          continue;
        }

        console.log(`🔍 Using city ID: ${cityId} for ${cityName}`);

        const cityDeals = await scraper.scrapeCityDeals(cityName, cityId);
        totalDealsAll += cityDeals;

        console.log(`✅ Completed ${cityName}: ${cityDeals} deals`);

        // Delay between cities (2-4 seconds)
        const delay = Math.floor(Math.random() * 2000) + 2000;
        await scraper.delay(delay);
      } catch (error) {
        console.log(`❌ Error scraping ${cityName}: ${error.message}`);
      }
    }

    console.log(
      `\n🎉 All cities completed! Total deals found: ${totalDealsAll}`
    );

    // Keep browser open for 30 seconds to observe
    console.log("🔍 Browser will stay open for 30 seconds for observation...");
    await scraper.delay(30000);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await scraper.close();
  }
}

// Run the scraper
if (require.main === module) {
  main().catch(console.error);
}

module.exports = NadlanScraperWithRecaptchaBypass;
