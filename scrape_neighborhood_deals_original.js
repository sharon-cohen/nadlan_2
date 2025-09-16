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
    console.log("🚀 Initializing browser...");

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
      // "--disable-javascript", // Enable JS for better stealth
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
      "--disable-ipc-flooding-protection",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-features=TranslateUI,BlinkGenPropertyTrees",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-client-side-phishing-detection",
      "--disable-default-apps",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
      "--enable-automation",
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

    // Basic anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      // Mock webdriver
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      // Mock plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["he-IL", "he", "en"],
      });
    });

    console.log("✅ Browser initialized with advanced anti-detection");
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async randomDelay(min = 100, max = 300) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async closePopups() {
    try {
      // Wait a bit for popups to appear
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Common popup selectors - more comprehensive list
      const popupSelectors = [
        'button[aria-label="סגור"]',
        'button[aria-label="Close"]',
        ".close-button",
        ".popup-close",
        ".modal-close",
        '[data-testid="close"]',
        'button:contains("סגור")',
        'button:contains("Close")',
        'button:contains("×")',
        ".popup button",
        ".modal button",
        '[role="button"]:contains("×")',
        'button[class*="close"]',
        'div[class*="close"]',
        'span[class*="close"]',
        ".modal .btn-close",
        ".popup .btn-close",
        '[class*="modal"] [class*="close"]',
        '[class*="popup"] [class*="close"]',
        ".overlay .close",
        ".dialog .close",
        'button[title*="סגור"]',
        'button[title*="Close"]',
        'button[title*="close"]',
        ".fa-times",
        ".fa-close",
        ".fa-x",
        ".icon-close",
        ".icon-times",
      ];

      let popupFound = false;
      let attempts = 0;
      const maxAttempts = 3;

      // Try multiple times to close popups
      while (attempts < maxAttempts && !popupFound) {
        attempts++;
        console.log(
          `    🔍 Attempting to close popups (attempt ${attempts}/${maxAttempts})`
        );

        for (const selector of popupSelectors) {
          try {
            const elements = await this.page.$$(selector);
            for (const element of elements) {
              try {
                const isVisible = await element.isIntersectingViewport();
                if (isVisible) {
                  await element.click();
                  console.log(`    ✅ Closed popup with selector: ${selector}`);
                  popupFound = true;
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  break;
                }
              } catch (e) {
                // Try clicking anyway if visibility check fails
                try {
                  await element.click();
                  console.log(
                    `    ✅ Closed popup with selector (force click): ${selector}`
                  );
                  popupFound = true;
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  break;
                } catch (e2) {
                  // Continue to next element
                }
              }
            }
            if (popupFound) break;
          } catch (e) {
            // Continue to next selector
          }
        }

        // Also try pressing Escape key multiple times
        try {
          await this.page.keyboard.press("Escape");
          await new Promise((resolve) => setTimeout(resolve, 1));
          await this.page.keyboard.press("Escape");
          await new Promise((resolve) => setTimeout(resolve, 1));
        } catch (e) {
          // Ignore keyboard errors
        }

        // Wait before next attempt
        if (!popupFound && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      return popupFound;
    } catch (error) {
      console.log(`    ⚠️ Error closing popups: ${error.message}`);
      return false;
    }
  }

  async humanLikeBehavior() {
    // Multiple random mouse movements
    for (let i = 0; i < Math.floor(Math.random() * 3) + 2; i++) {
      await this.page.mouse.move(
        Math.random() * 800 + 100,
        Math.random() * 600 + 100,
        { steps: Math.floor(Math.random() * 15) + 8 }
      );
      await this.randomDelay(200, 400);
    }

    // Random scroll up and down
    const scrollAmount1 = Math.floor(Math.random() * 200) + 50;
    await this.page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount1);
    await this.randomDelay(300, 500);

    const scrollAmount2 = Math.floor(Math.random() * 200) + 50;
    await this.page.evaluate((amount) => {
      window.scrollBy(0, -amount);
    }, scrollAmount2);
    await this.randomDelay(300, 500);

    // Random scroll to middle
    await this.page.evaluate(() => {
      window.scrollTo(0, window.innerHeight / 2);
    });
    await this.randomDelay(200, 300);

    // Random scroll to top
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // Random delay (0.1-0.3 seconds)
    await this.randomDelay(100, 300);
  }

  async handleErrorMessages() {
    try {
      // Check for common error messages and popups
      const errorHandled = await this.page.evaluate(() => {
        // Common error message selectors
        const errorSelectors = [
          '[class*="error"]',
          '[class*="Error"]',
          '[id*="error"]',
          '[id*="Error"]',
          ".alert",
          ".alert-danger",
          ".alert-warning",
          ".modal",
          ".popup",
          ".popup-overlay",
          '[class*="modal"]',
          '[class*="popup"]',
          '[class*="overlay"]',
          ".notification",
          ".toast",
          ".message",
        ];

        // Common close button selectors
        const closeSelectors = [
          'button[aria-label*="close"]',
          'button[aria-label*="Close"]',
          'button[title*="close"]',
          'button[title*="Close"]',
          ".close",
          ".close-btn",
          ".close-button",
          ".btn-close",
          '[class*="close"]',
          ".fa-times",
          ".fa-close",
          ".fa-x",
        ];

        let foundError = false;
        let closedPopup = false;

        // Check for error messages
        for (const selector of errorSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(
              `Found potential error/popup with selector: ${selector}`
            );
            foundError = true;

            // Try to find and click close button within the error element
            for (const element of elements) {
              for (const closeSelector of closeSelectors) {
                const closeBtn = element.querySelector(closeSelector);
                if (closeBtn) {
                  console.log(
                    `Found close button with selector: ${closeSelector}`
                  );
                  closeBtn.click();
                  closedPopup = true;
                  break;
                }
              }

              // Also check for buttons with specific text content
              if (!closedPopup) {
                const buttons = element.querySelectorAll("button");
                for (const button of buttons) {
                  const text = button.textContent.trim();
                  if (
                    text === "×" ||
                    text === "✕" ||
                    text === "X" ||
                    text.toLowerCase().includes("close") ||
                    text.toLowerCase().includes("סגור")
                  ) {
                    console.log(`Found close button with text: ${text}`);
                    button.click();
                    closedPopup = true;
                    break;
                  }
                }
              }

              // If no close button found, try clicking anywhere on the error element
              if (!closedPopup) {
                element.click();
                closedPopup = true;
              }
            }
            break;
          }
        }

        // Also check for any visible modals or overlays
        const allElements = document.querySelectorAll("*");
        for (const element of allElements) {
          const style = window.getComputedStyle(element);
          if (style.position === "fixed" || style.position === "absolute") {
            const rect = element.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
              // Check if it looks like a popup/modal
              const text = element.textContent.toLowerCase();
              if (
                text.includes("error") ||
                text.includes("שגיאה") ||
                text.includes("בעיה") ||
                text.includes("נכשל") ||
                text.includes("נסה שוב") ||
                text.includes("try again")
              ) {
                console.log("Found potential error popup by content");
                foundError = true;

                // Try to find close button
                for (const closeSelector of closeSelectors) {
                  const closeBtn = element.querySelector(closeSelector);
                  if (closeBtn) {
                    closeBtn.click();
                    closedPopup = true;
                    break;
                  }
                }

                // Also check for buttons with specific text content
                if (!closedPopup) {
                  const buttons = element.querySelectorAll("button");
                  for (const button of buttons) {
                    const buttonText = button.textContent.trim();
                    if (
                      buttonText === "×" ||
                      buttonText === "✕" ||
                      buttonText === "X" ||
                      buttonText.toLowerCase().includes("close") ||
                      buttonText.toLowerCase().includes("סגור")
                    ) {
                      console.log(
                        `Found close button with text: ${buttonText}`
                      );
                      button.click();
                      closedPopup = true;
                      break;
                    }
                  }
                }

                if (!closedPopup) {
                  element.click();
                  closedPopup = true;
                }
                break;
              }
            }
          }
        }

        // Global search for any close buttons on the page
        if (!foundError) {
          const allButtons = document.querySelectorAll("button");
          for (const button of allButtons) {
            const text = button.textContent.trim();
            if (text === "×" || text === "✕" || text === "X") {
              const style = window.getComputedStyle(button);
              if (style.position === "fixed" || style.position === "absolute") {
                console.log(`Found global close button with text: ${text}`);
                button.click();
                foundError = true;
                closedPopup = true;
                break;
              }
            }
          }
        }

        return { foundError, closedPopup };
      });

      if (errorHandled.foundError) {
        console.log(`    ⚠️  Found error message/popup`);
        if (errorHandled.closedPopup) {
          console.log(`    ✅ Closed popup/error message`);
          // Wait a bit after closing popup
          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          console.log(`    ⚠️  Could not close popup/error message`);
        }
      }

      return errorHandled;
    } catch (error) {
      console.log(`    ⚠️  Error handling error messages: ${error.message}`);
      return { foundError: false, closedPopup: false };
    }
  }

  async scrapeCityDeals(cityId, cityName) {
    try {
      const url = `https://www.nadlan.gov.il/?view=settlement&id=${cityId}&page=deals`;
      console.log(`  🔍 Scraping city deals: ${cityName} (ID: ${cityId})`);
      console.log(`    🌐 Target URL: ${url}`);

      console.log(`    🌐 Navigating to: ${url}`);

      // Human-like behavior before navigation
      await this.humanLikeBehavior();

      let reloadAttempts = 0;
      const maxReloadAttempts = 10; // 10 attempts with very fast reloads
      let navigationSuccess = false;

      while (reloadAttempts < maxReloadAttempts && !navigationSuccess) {
        try {
          await this.page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000, // Increased to 60 seconds
          });

          // Check for popups and close them
          const popupClosed = await this.closePopups();

          if (popupClosed) {
            console.log(
              `    🔄 Popup detected and closed, reloading page... (attempt ${
                reloadAttempts + 1
              })`
            );
            reloadAttempts++;
            await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased wait time for better popup handling
            continue;
          }

          navigationSuccess = true;
        } catch (error) {
          console.log(
            `    ❌ Navigation error (attempt ${reloadAttempts + 1}): ${
              error.message
            }`
          );
          reloadAttempts++;

          if (reloadAttempts >= maxReloadAttempts) {
            console.log(
              `    ⚠️  Maximum popup handling attempts reached, continuing anyway...`
            );
            break; // Break out of the loop instead of throwing error
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      // Human-like behavior after page load
      await this.humanLikeBehavior();

      // Additional wait for content to load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(`    ⏳ Page loaded, waiting for content...`);

      // Try to prevent popups by waiting longer and checking for deals directly
      console.log(
        `    🔍 Checking for deals directly without popup handling...`
      );

      // Wait a bit longer for the page to fully load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if there are deals without handling popups
      const initialDeals = await this.page.evaluate(() => {
        const deals = [];
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
            rows.forEach((row) => {
              const cells = row.querySelectorAll("td");
              if (cells.length > 0) {
                const dealData = Array.from(cells).map((cell) =>
                  cell.textContent.trim()
                );
                if (dealData.some((data) => data.length > 0)) {
                  deals.push(dealData);
                }
              }
            });
            break;
          }
        }
        return deals;
      });

      if (initialDeals.length > 0) {
        console.log(
          `    ✅ Found ${initialDeals.length} deals directly, continuing without popup handling...`
        );
      } else {
        console.log(
          `    ⚠️  No deals found directly, trying alternative approach...`
        );

        // If no deals found, try a simple page refresh without popup handling
        await this.page.reload({ waitUntil: "networkidle2" });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`    🔄 Page refreshed, checking for deals again...`);
      }

      // Get current URL to verify we're on the right page
      const currentUrl = await this.page.url();
      console.log(`    🔗 Current URL: ${currentUrl}`);

      // Simulate human behavior - multiple scrolls
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.randomDelay(300, 600);

      // Additional wait after scrolling (reduced to 500)
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(`    📄 Content should be loaded now...`);

      const allDeals = [];
      let pageNumber = 1;
      let hasNextPage = true;
      const maxDeals = 1000;

      while (hasNextPage && allDeals.length < maxDeals) {
        console.log(`    📄 Processing page ${pageNumber}...`);

        // Extract deals from current page
        const pageDeals = await this.page.evaluate((currentDealsCount) => {
          const deals = [];

          // Try multiple selectors to find the deals table
          const selectors = [
            "#dealsTable tbody tr",
            ".mainTable tbody tr",
            "table tbody tr",
            ".deals-table tbody tr",
            '[class*="deal"] tr',
            ".data-table tbody tr",
            "table tr",
            ".table tr",
            '[class*="table"] tr',
            "tbody tr",
            'tr[class*="row"]',
            'tr[class*="deal"]',
            "#dealsTable tr",
            ".mainTable tr",
          ];

          let rows = [];
          for (let selector of selectors) {
            rows = document.querySelectorAll(selector);
            if (rows.length > 0) {
              console.log(
                `Found ${rows.length} rows with selector: ${selector}`
              );
              break;
            }
          }

          console.log(`Total rows found: ${rows.length}`);

          // If no rows found, log what's available
          if (rows.length === 0) {
            console.log(
              "    🔍 DEBUG: No rows found. Available tables:",
              document.querySelectorAll("table").length
            );
            console.log(
              "    🔍 DEBUG: Available tbody elements:",
              document.querySelectorAll("tbody").length
            );
            console.log(
              "    🔍 DEBUG: Available tr elements:",
              document.querySelectorAll("tr").length
            );

            // Log page title and some content for debugging
            console.log("    🔍 DEBUG: Page title:", document.title);
            console.log(
              "    🔍 DEBUG: Body text length:",
              document.body.textContent.length
            );
            console.log(
              "    🔍 DEBUG: Body text sample:",
              document.body.textContent.substring(0, 200)
            );

            // Check if there's a message about no deals
            const noDealsMessage = document.querySelector(
              '[class*="no-deals"], [class*="empty"], [class*="no-data"]'
            );
            if (noDealsMessage) {
              console.log(
                "Found no deals message:",
                noDealsMessage.textContent
              );
            }

            // Check page content
            const bodyText = document.body.textContent;
            if (
              bodyText.includes("אין עסקאות") ||
              bodyText.includes("לא נמצאו עסקאות")
            ) {
              console.log("Page indicates no deals available");
            }

            return [];
          }

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll("td");

            // Skip header row (no cells) and ensure we have enough cells for a deal
            if (cells.length >= 6) {
              const deal = {
                serialNumber: cells[0]?.textContent?.trim() || "",
                address: cells[1]?.textContent?.trim() || "",
                area: cells[2]?.textContent?.trim() || "",
                date: cells[3]?.textContent?.trim() || "",
                price: (cells[4]?.textContent?.trim() || "").replace(
                  /[₪$,\s]/g,
                  ""
                ), // Remove currency symbols and commas
                gush: cells[5]?.textContent?.trim() || "",
                propertyType: cells[6]?.textContent?.trim() || "",
                rooms: cells[7]?.textContent?.trim() || "",
                floor: cells[8]?.textContent?.trim() || "",
              };
              deals.push(deal);
            }
          }

          console.log(`Extracted ${deals.length} deals from this page`);
          return deals;
        }, allDeals.length);

        allDeals.push(...pageDeals);
        console.log(
          `    📊 Found ${pageDeals.length} deals on page ${pageNumber} (Total: ${allDeals.length})`
        );

        // Check if there's a next page
        hasNextPage = await this.page.evaluate(() => {
          // Look for next page button - more specific selectors
          const nextButtonSelectors = [
            'a[title="הבא"]:not(.disabled):not(.inactive)',
            'a[title="Next"]:not(.disabled):not(.inactive)',
            ".pagination .next:not(.disabled):not(.inactive)",
            ".pager .next:not(.disabled):not(.inactive)",
            '[class*="next"]:not(.disabled):not(.inactive)',
          ];

          for (let selector of nextButtonSelectors) {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null) {
              // Check if visible
              return true;
            }
          }

          // Check for text content in links (since :contains is not supported)
          const allLinks = document.querySelectorAll("a");
          for (let link of allLinks) {
            const text = link.textContent.trim();
            if (
              (text.includes("הבא") || text.includes("Next")) &&
              !link.classList.contains("disabled") &&
              !link.classList.contains("inactive") &&
              link.offsetParent !== null
            ) {
              return true;
            }
          }

          // Look for page numbers that contain "הבא" or "Next"
          const pageNumbers = document.querySelectorAll(
            '.pagination a, .pager a, [class*="page"] a'
          );
          for (let page of pageNumbers) {
            const text = page.textContent.trim();
            if (
              (text.includes("הבא") ||
                text.includes("Next") ||
                text.includes(">")) &&
              !page.classList.contains("disabled") &&
              !page.classList.contains("inactive") &&
              page.offsetParent !== null
            ) {
              return true;
            }
          }

          // Check if we're on the last page by looking for "סוף" or "Last"
          const lastPageIndicators = document.querySelectorAll(
            '.pagination a, .pager a, [class*="page"] a'
          );
          for (let indicator of lastPageIndicators) {
            const text = indicator.textContent.trim();
            if (
              text.includes("סוף") ||
              text.includes("Last") ||
              text.includes("End")
            ) {
              return false;
            }
          }

          return false;
        });

        if (hasNextPage && allDeals.length < maxDeals) {
          // Try to click next page
          const clicked = await this.page.evaluate(() => {
            // Try different selectors for next button
            const selectors = [
              'a[title="הבא"]:not(.disabled):not(.inactive)',
              'a[title="Next"]:not(.disabled):not(.inactive)',
              ".pagination .next:not(.disabled):not(.inactive)",
              ".pager .next:not(.disabled):not(.inactive)",
              '[class*="next"]:not(.disabled):not(.inactive)',
            ];

            for (let selector of selectors) {
              try {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                  // Check if visible
                  button.click();
                  return true;
                }
              } catch (e) {
                continue;
              }
            }

            // Check for text content in links (since :contains is not supported)
            const allLinks = document.querySelectorAll("a");
            for (let link of allLinks) {
              const text = link.textContent.trim();
              if (
                (text.includes("הבא") || text.includes("Next")) &&
                !link.classList.contains("disabled") &&
                !link.classList.contains("inactive") &&
                link.offsetParent !== null
              ) {
                link.click();
                return true;
              }
            }

            // Try clicking on page numbers
            const pageNumbers = document.querySelectorAll(
              '.pagination a, .pager a, [class*="page"] a'
            );
            for (let page of pageNumbers) {
              const text = page.textContent.trim();
              if (
                (text.includes("הבא") ||
                  text.includes("Next") ||
                  text.includes(">")) &&
                !page.classList.contains("disabled") &&
                !page.classList.contains("inactive") &&
                page.offsetParent !== null
              ) {
                page.click();
                return true;
              }
            }

            return false;
          });

          if (clicked) {
            // Much faster delays between pages
            await this.randomDelay(1, 5);

            // Simulate human behavior - multiple scrolls
            await this.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight / 4);
            });
            // Minimal delay after clicking next button
            await this.randomDelay(1, 3);

            pageNumber++;
          } else {
            console.log(
              `    ⚠️  Could not find or click next button, stopping pagination`
            );
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }

        // Safety check to prevent infinite loop
        if (pageNumber > 200) {
          // Increased to 200 pages for 1000 deals
          console.log(`    ⚠️  Reached maximum page limit (200), stopping`);
          break;
        }
      }

      console.log(`  📊 Total deals found: ${allDeals.length}`);
      return allDeals.slice(0, maxDeals); // Ensure we don't exceed maxDeals
    } catch (error) {
      console.log(
        `  ❌ Error scraping city deals for ${cityName}: ${error.message}`
      );
      return [];
    }
  }

  async scrapeNeighborhoodDeals(neighborhoodId, neighborhoodName, cityName) {
    try {
      const url = `https://www.nadlan.gov.il/?view=neighborhood&id=${neighborhoodId}&page=deals`;
      console.log(`  🔍 Scraping: ${neighborhoodName} (ID: ${neighborhoodId})`);
      console.log(`    🌐 Target URL: ${url}`);

      console.log(`    🌐 Navigating to: ${url}`);

      // Human-like behavior before navigation
      await this.humanLikeBehavior();

      let reloadAttempts = 0;
      const maxReloadAttempts = 10; // 10 attempts with very fast reloads
      let navigationSuccess = false;

      while (reloadAttempts < maxReloadAttempts && !navigationSuccess) {
        try {
          await this.page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000, // Increased to 60 seconds
          });
          await this.humanLikeBehavior();

          // Check for popups and close them
          const popupClosed = await this.closePopups();

          if (popupClosed) {
            console.log(
              `    🔄 Popup detected and closed, reloading page... (attempt ${
                reloadAttempts + 1
              })`
            );
            reloadAttempts++;
            await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased wait time for better popup handling
            continue;
          }
          await this.humanLikeBehavior();

          navigationSuccess = true;
        } catch (error) {
          console.log(
            `    ❌ Navigation error (attempt ${reloadAttempts + 1}): ${
              error.message
            }`
          );
          reloadAttempts++;

          if (reloadAttempts >= maxReloadAttempts) {
            console.log(
              `    ⚠️  Maximum popup handling attempts reached, continuing anyway...`
            );
            break; // Break out of the loop instead of throwing error
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      // Human-like behavior after page load
      await this.humanLikeBehavior();

      // Additional wait for content to load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(`    ⏳ Page loaded, waiting for content...`);

      // Try to prevent popups by waiting longer and checking for deals directly
      console.log(
        `    🔍 Checking for deals directly without popup handling...`
      );

      // Wait a bit longer for the page to fully load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if there are deals without handling popups
      const initialDeals = await this.page.evaluate(() => {
        const deals = [];
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
            rows.forEach((row) => {
              const cells = row.querySelectorAll("td");
              if (cells.length > 0) {
                const dealData = Array.from(cells).map((cell) =>
                  cell.textContent.trim()
                );
                if (dealData.some((data) => data.length > 0)) {
                  deals.push(dealData);
                }
              }
            });
            break;
          }
        }
        return deals;
      });

      if (initialDeals.length > 0) {
        console.log(
          `    ✅ Found ${initialDeals.length} deals directly, continuing without popup handling...`
        );
      } else {
        console.log(
          `    ⚠️  No deals found directly, trying alternative approach...`
        );

        // If no deals found, try a simple page refresh without popup handling
        await this.page.reload({ waitUntil: "networkidle2" });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`    🔄 Page refreshed, checking for deals again...`);
      }

      // Get current URL to verify we're on the right page
      const currentUrl = await this.page.url();
      console.log(`    🔗 Current URL: ${currentUrl}`);

      // Simulate human behavior - multiple scrolls
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await this.randomDelay(300, 500);
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.randomDelay(300, 600);

      // Additional wait after scrolling (reduced to 500)
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(`    📄 Content should be loaded now...`);

      const allDeals = [];
      let pageNumber = 1;
      let hasNextPage = true;
      const maxDeals = 1000;

      while (hasNextPage && allDeals.length < maxDeals) {
        console.log(`    📄 Processing page ${pageNumber}...`);

        // Extract deals from current page
        const pageDeals = await this.page.evaluate((currentDealsCount) => {
          const deals = [];

          // Try multiple selectors to find the deals table
          const selectors = [
            "#dealsTable tbody tr",
            ".mainTable tbody tr",
            "table tbody tr",
            ".deals-table tbody tr",
            '[class*="deal"] tr',
            ".data-table tbody tr",
            "table tr",
            ".table tr",
            '[class*="table"] tr',
            "tbody tr",
            'tr[class*="row"]',
            'tr[class*="deal"]',
            "#dealsTable tr",
            ".mainTable tr",
          ];

          let rows = [];
          for (let selector of selectors) {
            rows = document.querySelectorAll(selector);
            if (rows.length > 0) {
              console.log(
                `Found ${rows.length} rows with selector: ${selector}`
              );
              break;
            }
          }

          console.log(`Total rows found: ${rows.length}`);

          // If no rows found, log what's available
          if (rows.length === 0) {
            console.log(
              "    🔍 DEBUG: No rows found. Available tables:",
              document.querySelectorAll("table").length
            );
            console.log(
              "    🔍 DEBUG: Available tbody elements:",
              document.querySelectorAll("tbody").length
            );
            console.log(
              "    🔍 DEBUG: Available tr elements:",
              document.querySelectorAll("tr").length
            );

            // Log page title and some content for debugging
            console.log("    🔍 DEBUG: Page title:", document.title);
            console.log(
              "    🔍 DEBUG: Body text length:",
              document.body.textContent.length
            );
            console.log(
              "    🔍 DEBUG: Body text sample:",
              document.body.textContent.substring(0, 200)
            );

            // Check if there's a message about no deals
            const noDealsMessage = document.querySelector(
              '[class*="no-deals"], [class*="empty"], [class*="no-data"]'
            );
            if (noDealsMessage) {
              console.log(
                "Found no deals message:",
                noDealsMessage.textContent
              );
            }

            // Check page content
            const bodyText = document.body.textContent;
            if (
              bodyText.includes("אין עסקאות") ||
              bodyText.includes("לא נמצאו עסקאות")
            ) {
              console.log("Page indicates no deals available");
            }

            return [];
          }

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll("td");

            // Skip header row (no cells) and ensure we have enough cells for a deal
            if (cells.length >= 6) {
              const deal = {
                serialNumber: cells[0]?.textContent?.trim() || "",
                address: cells[1]?.textContent?.trim() || "",
                area: cells[2]?.textContent?.trim() || "",
                date: cells[3]?.textContent?.trim() || "",
                price: (cells[4]?.textContent?.trim() || "").replace(
                  /[₪$,\s]/g,
                  ""
                ), // Remove currency symbols and commas
                gush: cells[5]?.textContent?.trim() || "",
                propertyType: cells[6]?.textContent?.trim() || "",
                rooms: cells[7]?.textContent?.trim() || "",
                floor: cells[8]?.textContent?.trim() || "",
              };
              deals.push(deal);
            }
          }

          console.log(`Extracted ${deals.length} deals from this page`);
          return deals;
        }, allDeals.length);

        allDeals.push(...pageDeals);
        console.log(
          `    📊 Found ${pageDeals.length} deals on page ${pageNumber} (Total: ${allDeals.length})`
        );

        // Check if there's a next page
        hasNextPage = await this.page.evaluate(() => {
          // Look for next page button - more specific selectors
          const nextButtonSelectors = [
            'a[title="הבא"]:not(.disabled):not(.inactive)',
            'a[title="Next"]:not(.disabled):not(.inactive)',
            ".pagination .next:not(.disabled):not(.inactive)",
            ".pager .next:not(.disabled):not(.inactive)",
            '[class*="next"]:not(.disabled):not(.inactive)',
          ];

          for (let selector of nextButtonSelectors) {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null) {
              // Check if visible
              return true;
            }
          }

          // Check for text content in links (since :contains is not supported)
          const allLinks = document.querySelectorAll("a");
          for (let link of allLinks) {
            const text = link.textContent.trim();
            if (
              (text.includes("הבא") || text.includes("Next")) &&
              !link.classList.contains("disabled") &&
              !link.classList.contains("inactive") &&
              link.offsetParent !== null
            ) {
              return true;
            }
          }

          // Look for page numbers that contain "הבא" or "Next"
          const pageNumbers = document.querySelectorAll(
            '.pagination a, .pager a, [class*="page"] a'
          );
          for (let page of pageNumbers) {
            const text = page.textContent.trim();
            if (
              (text.includes("הבא") ||
                text.includes("Next") ||
                text.includes(">")) &&
              !page.classList.contains("disabled") &&
              !page.classList.contains("inactive") &&
              page.offsetParent !== null
            ) {
              return true;
            }
          }

          // Check if we're on the last page by looking for "סוף" or "Last"
          const lastPageIndicators = document.querySelectorAll(
            '.pagination a, .pager a, [class*="page"] a'
          );
          for (let indicator of lastPageIndicators) {
            const text = indicator.textContent.trim();
            if (
              text.includes("סוף") ||
              text.includes("Last") ||
              text.includes("End")
            ) {
              return false;
            }
          }

          return false;
        });

        if (hasNextPage && allDeals.length < maxDeals) {
          // Try to click next page
          const clicked = await this.page.evaluate(() => {
            // Try different selectors for next button
            const selectors = [
              'a[title="הבא"]:not(.disabled):not(.inactive)',
              'a[title="Next"]:not(.disabled):not(.inactive)',
              ".pagination .next:not(.disabled):not(.inactive)",
              ".pager .next:not(.disabled):not(.inactive)",
              '[class*="next"]:not(.disabled):not(.inactive)',
            ];

            for (let selector of selectors) {
              try {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                  // Check if visible
                  button.click();
                  return true;
                }
              } catch (e) {
                continue;
              }
            }

            // Check for text content in links (since :contains is not supported)
            const allLinks = document.querySelectorAll("a");
            for (let link of allLinks) {
              const text = link.textContent.trim();
              if (
                (text.includes("הבא") || text.includes("Next")) &&
                !link.classList.contains("disabled") &&
                !link.classList.contains("inactive") &&
                link.offsetParent !== null
              ) {
                link.click();
                return true;
              }
            }

            // Try clicking on page numbers
            const pageNumbers = document.querySelectorAll(
              '.pagination a, .pager a, [class*="page"] a'
            );
            for (let page of pageNumbers) {
              const text = page.textContent.trim();
              if (
                (text.includes("הבא") ||
                  text.includes("Next") ||
                  text.includes(">")) &&
                !page.classList.contains("disabled") &&
                !page.classList.contains("inactive") &&
                page.offsetParent !== null
              ) {
                page.click();
                return true;
              }
            }

            return false;
          });

          if (clicked) {
            // Much faster delays between pages
            await this.randomDelay(1, 5);

            // Simulate human behavior - multiple scrolls
            await this.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight / 4);
            });
            // Minimal delay after clicking next button
            await this.randomDelay(1, 3);

            pageNumber++;
          } else {
            console.log(
              `    ⚠️  Could not find or click next button, stopping pagination`
            );
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }

        // Safety check to prevent infinite loop
        if (pageNumber > 200) {
          // Increased to 200 pages for 1000 deals
          console.log(`    ⚠️  Reached maximum page limit (200), stopping`);
          break;
        }
      }

      console.log(`  📊 Total deals found: ${allDeals.length}`);
      return allDeals.slice(0, maxDeals); // Ensure we don't exceed maxDeals
    } catch (error) {
      console.log(`  ❌ Error scraping ${neighborhoodName}: ${error.message}`);
      return [];
    }
  }

  async saveDealsToCSV(deals, neighborhoodName, cityPath) {
    if (deals.length === 0) {
      console.log(`  ⚠️  No deals to save for ${neighborhoodName}`);
      return;
    }

    try {
      // Create CSV content
      const csvHeader =
        "מספר סידורי,כתובת,שטח במר,תאריך העסקה,מחיר העסקה,גוש,סוג נכס,חדרים,קומה\n";
      const csvRows = deals
        .map(
          (deal) =>
            `"${deal.serialNumber}","${deal.address}","${deal.area}","${deal.date}","${deal.price}","${deal.gush}","${deal.propertyType}","${deal.rooms}","${deal.floor}"`
        )
        .join("\n");

      const csvContent = csvHeader + csvRows;

      // Create safe folder name
      const safeNeighborhoodName = neighborhoodName.replace(
        /[\/\\:*?"<>|]/g,
        "_"
      );
      const neighborhoodPath = path.join(cityPath, safeNeighborhoodName);

      // Ensure neighborhood folder exists
      if (!fs.existsSync(neighborhoodPath)) {
        fs.mkdirSync(neighborhoodPath, { recursive: true });
      }

      // Save CSV file
      const csvFilePath = path.join(
        neighborhoodPath,
        `${safeNeighborhoodName}_deals.csv`
      );
      fs.writeFileSync(csvFilePath, csvContent, "utf8");

      console.log(`  💾 Saved ${deals.length} deals to: ${csvFilePath}`);
    } catch (error) {
      console.log(
        `  ❌ Error saving CSV for ${neighborhoodName}: ${error.message}`
      );
    }
  }

  async saveCityDealsToCSV(deals, cityName, cityPath) {
    if (deals.length === 0) {
      console.log(`  ⚠️  No deals to save for city ${cityName}`);
      return;
    }

    try {
      // Create CSV content
      const csvHeader =
        "מספר סידורי,כתובת,שטח במר,תאריך העסקה,מחיר העסקה,גוש,סוג נכס,חדרים,קומה\n";
      const csvRows = deals
        .map(
          (deal) =>
            `"${deal.serialNumber}","${deal.address}","${deal.area}","${deal.date}","${deal.price}","${deal.gush}","${deal.propertyType}","${deal.rooms}","${deal.floor}"`
        )
        .join("\n");

      const csvContent = csvHeader + csvRows;

      // Create safe city name
      const safeCityName = cityName.replace(/[\/\\:*?"<>|]/g, "_");

      // Save CSV file directly in city folder
      const csvFilePath = path.join(cityPath, `${safeCityName}_city_deals.csv`);
      fs.writeFileSync(csvFilePath, csvContent, "utf8");

      console.log(`  💾 Saved ${deals.length} city deals to: ${csvFilePath}`);
    } catch (error) {
      console.log(
        `  ❌ Error saving city CSV for ${cityName}: ${error.message}`
      );
    }
  }

  async processAllNeighborhoods() {
    try {
      await this.init(false); // Set to false to see the browser for manual reCAPTCHA solving

      const councilsPath = "councils-with-folders";
      const allCouncilFolders = fs.readdirSync(councilsPath);
      // Process only Haifa
      // Process all cities
      const councilFolders = allCouncilFolders;

      console.log(`📁 Found ${councilFolders.length} council folders`);

      let totalCities = 0;
      let totalNeighborhoods = 0;
      let totalDeals = 0;

      // Start from the beginning
      const foldersToProcess = councilFolders;

      console.log(`🎯 Starting from: beginning`);
      console.log(
        `📁 Only processing neighborhoods that have existing folders`
      );

      for (const folder of foldersToProcess) {
        // Skip non-directory items
        if (folder === "summary.txt" || folder === "README.md") continue;

        const folderPath = path.join(councilsPath, folder);

        // Check if the path exists before trying to stat it
        if (!fs.existsSync(folderPath)) {
          console.log(`⚠️  Skipping non-existent path: ${folder}`);
          continue;
        }

        const stats = fs.statSync(folderPath);

        if (!stats.isDirectory()) {
          console.log(`⚠️  Skipping non-directory: ${folder}`);
          continue;
        }

        console.log(`\n🏙️  Processing city: ${folder}`);

        // Look for the areas CSV file
        const files = fs.readdirSync(folderPath);
        const areasFile = files.find((file) => file.endsWith("_areas.csv"));

        if (!areasFile) {
          console.log(`  ⚠️  No areas file found for ${folder}`);
          continue;
        }

        const areasFilePath = path.join(folderPath, areasFile);
        const csvContent = fs.readFileSync(areasFilePath, "utf8");
        const lines = csvContent.split("\n").filter((line) => line.trim());

        // Extract neighborhoods with their IDs
        const neighborhoods = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const parts = line.split('","');
            if (parts.length >= 3) {
              const name = parts[0].replace(/"/g, "");
              const id = parts[1].replace(/"/g, "");
              const type = parts[2].replace(/"/g, "");

              if (type === "Neighborhood") {
                neighborhoods.push({ name, id });
              }
            }
          }
        }

        console.log(`  📊 Found ${neighborhoods.length} neighborhoods`);

        if (neighborhoods.length === 0) {
          console.log(
            `  ⚠️  No neighborhoods found for ${folder}, checking if we should scrape city deals directly...`
          );

          // Check if this city has a corresponding entry in all_city.csv
          const allCityData = fs.readFileSync("all_city.csv", "utf8");
          const cityLines = allCityData
            .split("\n")
            .filter((line) => line.trim());

          let cityId = null;
          for (let i = 1; i < cityLines.length; i++) {
            const line = cityLines[i].trim();
            if (line) {
              const parts = line.split(",");
              if (parts.length >= 3) {
                const id = parts[0].replace(/"/g, "");
                const name = parts[1].replace(/"/g, "");
                if (name === folder) {
                  cityId = id;
                  break;
                }
              }
            }
          }

          if (cityId) {
            console.log(
              `  🏙️  Found city ID ${cityId} for ${folder}, scraping city deals directly...`
            );

            // Check if city deals CSV already exists
            const cityDealsFile = path.join(
              folderPath,
              `${folder}_city_deals.csv`
            );
            if (fs.existsSync(cityDealsFile)) {
              console.log(
                `  ⏭️  Skipping city deals for ${folder} - CSV already exists`
              );
            } else {
              // Scrape city deals directly
              const cityDeals = await this.scrapeCityDeals(cityId, folder);
              await this.saveCityDealsToCSV(cityDeals, folder, folderPath);

              totalDeals += cityDeals.length;
              console.log(
                `  📊 Total city deals for ${folder}: ${cityDeals.length}`
              );
            }
          } else {
            console.log(`  ⚠️  No city ID found in all_city.csv for ${folder}`);
          }

          totalCities++;
          continue;
        }

        // Process each neighborhood
        let cityDeals = 0;
        let neighborhoodCount = 0;
        let skippedNeighborhoods = 0;

        for (const neighborhood of neighborhoods) {
          // Check if neighborhood folder exists first
          const neighborhoodFolder = path.join(folderPath, neighborhood.name);

          if (!fs.existsSync(neighborhoodFolder)) {
            console.log(
              `  ⏭️  Skipping ${neighborhood.name} - folder doesn't exist`
            );
            skippedNeighborhoods++;
            continue;
          }

          // Check if CSV file already exists
          const csvFile = path.join(
            neighborhoodFolder,
            `${neighborhood.name}_deals.csv`
          );

          if (fs.existsSync(csvFile)) {
            console.log(
              `  ⏭️  Skipping ${neighborhood.name} - CSV already exists`
            );
            neighborhoodCount++;
            // Skip browser restart for existing CSVs - just continue to next neighborhood
            continue;
          }

          // Only process neighborhoods that don't have CSV files
          console.log(
            `🎯 Processing ${neighborhood.name} - No CSV found, scraping...`
          );

          // Open new browser for each neighborhood
          console.log(`  🔄 Opening new browser for ${neighborhood.name}...`);
          if (this.browser) {
            await this.browser.close();
          }
          await new Promise((resolve) => setTimeout(resolve, 1)); // Wait 2 seconds
          await this.init(false); // Open visible browser

          // Clear cookies and session data
          await this.page.deleteCookie();
          try {
            await this.page.evaluate(() => {
              if (typeof localStorage !== "undefined") {
                localStorage.clear();
              }
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.clear();
              }
            });
            console.log(`  🧹 Cleared cookies and session data`);
          } catch (error) {
            console.log(`  ⚠️  Could not clear session data: ${error.message}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 1)); // Wait 2 seconds

          // If we need to scrape, continue with headless browser
          console.log(
            `  🔍 Scraping: ${neighborhood.name} (ID: ${neighborhood.id})`
          );

          const deals = await this.scrapeNeighborhoodDeals(
            neighborhood.id,
            neighborhood.name,
            folder
          );

          await this.saveDealsToCSV(deals, neighborhood.name, folderPath);

          cityDeals += deals.length;
          totalDeals += deals.length;
          neighborhoodCount++;

          // Add random delay between neighborhoods (much faster)
          const randomDelay = Math.floor(Math.random() * 200) + 100; // 0.1-0.3 seconds
          console.log(
            `  ⏳ Waiting ${randomDelay}ms before next neighborhood...`
          );
          await new Promise((resolve) => setTimeout(resolve, randomDelay));
        }

        console.log(`  📊 Total deals for ${folder}: ${cityDeals}`);
        if (skippedNeighborhoods > 0) {
          console.log(
            `  ⏭️  Skipped ${skippedNeighborhoods} neighborhoods (no folders)`
          );
        }

        totalCities++;
        totalNeighborhoods += neighborhoods.length;

        // Add random delay between cities (reduced)
        await this.randomDelay(2000, 4000);
      }

      console.log(`\n🎉 Finished scraping neighborhood deals!`);
      console.log(`📊 Summary:`);
      console.log(`  🏙️  Cities processed: ${totalCities}`);
      console.log(`  🏘️  Total neighborhoods: ${totalNeighborhoods}`);
      console.log(`  💰 Total deals: ${totalDeals}`);
    } catch (error) {
      console.error("❌ Fatal error:", error);
    } finally {
      // Keep browser open for debugging
      console.log(
        "🔍 Browser will remain open for debugging. Close manually when done."
      );
      console.log("⏳ Waiting 30 seconds before closing...");
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Start the scraper
const scraper = new NeighborhoodDealsScraper();
scraper.processAllNeighborhoods();
