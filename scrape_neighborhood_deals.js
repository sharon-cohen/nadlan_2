const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const Captcha = require("2captcha");

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
    console.log("🚀 Initializing browser with persistent profile...");

    // Create persistent profile directory
    const userDataDir = path.join(__dirname, 'puppeteer_profile');
    console.log(`📁 Using persistent profile: ${userDataDir}`);

    // Check current IP and add IP-related headers
    console.log("🌐 Checking IP status...");
    try {
      const ipInfo = await this.checkIPStatus();
      console.log(`📍 Current IP: ${ipInfo.ip}`);
      console.log(`🌍 Location: ${ipInfo.country}, ${ipInfo.city}`);
      console.log(`🔒 IP Status: ${ipInfo.status}`);
    } catch (error) {
      console.log("⚠️ Could not check IP status");
    }

    // 2Captcha Extension path
    const extensionPath = path.join(__dirname, "2captcha-solver");
    console.log(`🔌 Loading 2Captcha Extension from: ${extensionPath}`);

    const launchArgs = [
      `--user-data-dir=${userDataDir}`, // Persistent profile
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
      executablePath: executablePath(),
    });
    this.page = await this.browser.newPage();

    // Fix cookie issues
    console.log("🍪 Configuring aggressive cookie handling...");
    await this.page.evaluateOnNewDocument(() => {
      // Override cookie settings to be more permissive
      Object.defineProperty(document, 'cookie', {
        get: function() {
          return this._cookie || '';
        },
        set: function(value) {
          this._cookie = value;
          // Allow all cookies
          return true;
        }
      });
      
      // Override third-party cookie restrictions
      if (window.chrome && window.chrome.cookies) {
        window.chrome.cookies.set = function(details, callback) {
          // Force allow all cookies
          details.sameSite = 'no_restriction';
          details.secure = false;
          callback && callback();
        };
      }
      
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
            buttonPosition: "inner"
          }
        });
      }
    });

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

    // 2Captcha extension will handle reCAPTCHA automatically

    console.log(
      "✅ Browser initialized with advanced anti-detection and reCAPTCHA bypass"
    );
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async randomDelay(min = 10, max = 30) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  async checkIPStatus() {
    try {
      // Check IP using a simple service
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        ip: data.ip,
        country: data.country_name,
        city: data.city,
        status: 'Active', // You could add more sophisticated checking here
        isp: data.org,
        timezone: data.timezone
      };
    } catch (error) {
      return {
        ip: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        status: 'Error',
        isp: 'Unknown',
        timezone: 'Unknown'
      };
    }
  }

  async solveRecaptcha() {
    console.log("🔍 Checking for reCAPTCHA with 2Captcha Extension...");
    
    try {
      // Wait for extension to load and detect reCAPTCHA
      console.log("⏳ Waiting for 2Captcha Extension to detect reCAPTCHA...");
      await this.delay(5000);
      
      // Check if extension is working
      const extensionStatus = await this.page.evaluate(() => {
        // Look for 2Captcha extension elements
        const extensionElements = document.querySelectorAll(
          '.captcha-solver, [data-captcha-type], .captcha-solver_inner'
        );
        
        if (extensionElements.length > 0) {
          const status = extensionElements[0].getAttribute('data-state');
          const type = extensionElements[0].getAttribute('data-captcha-type');
          return {
            present: true,
            status: status,
            type: type,
            elementCount: extensionElements.length
          };
        }
        
        return { present: false };
      });
      
      console.log("🔌 Extension Status:", extensionStatus);
      
      if (extensionStatus.present) {
        console.log(`✅ 2Captcha Extension detected! Status: ${extensionStatus.status}, Type: ${extensionStatus.type}`);
        
        // Wait for solving process
        if (extensionStatus.status === 'solving') {
          console.log("⏳ Extension is solving reCAPTCHA...");
          await this.waitForExtensionSolve();
        } else if (extensionStatus.status === 'solved') {
          console.log("🎉 reCAPTCHA already solved by extension!");
          return true;
        } else if (extensionStatus.status === null || extensionStatus.status === 'idle') {
          console.log("🔧 Extension is idle, trying to trigger solving...");
          await this.triggerExtensionSolve();
          await this.waitForExtensionSolve();
        }
      } else {
        console.log("⚠️ 2Captcha Extension not detected, trying fallback strategies...");
        await this.fallbackRecaptchaSolve();
      }
      
      return true;
      
    } catch (error) {
      console.log(`⚠️ reCAPTCHA handling error: ${error.message}`);
      await this.fallbackRecaptchaSolve();
      return false;
    }
  }
  
  async waitForExtensionSolve() {
    console.log("⏳ Waiting for extension to solve reCAPTCHA...");
    
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await this.delay(10000); // Wait 10 seconds between checks
      attempts++;
      
      const status = await this.page.evaluate(() => {
        const extensionElements = document.querySelectorAll(
          '.captcha-solver, [data-captcha-type], .captcha-solver_inner'
        );
        
        if (extensionElements.length > 0) {
          return extensionElements[0].getAttribute('data-state');
        }
        
        return 'not_found';
      });
      
      console.log(`🔍 Extension status check ${attempts}/${maxAttempts}: ${status}`);
      
      if (status === 'solved') {
        console.log("🎉 reCAPTCHA solved by extension!");
        return;
      } else if (status === 'error') {
        console.log("❌ Extension failed to solve reCAPTCHA");
        break;
      } else if (status === 'not_found') {
        console.log("⚠️ Extension elements not found, checking if reCAPTCHA is gone...");
        
        // Check if reCAPTCHA is still present
        const recaptchaStillPresent = await this.page.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
            document.querySelector("[data-sitekey]")
        );
      });

        if (!recaptchaStillPresent) {
          console.log("✅ reCAPTCHA appears to be gone!");
          return;
        }
      }
    }
    
    console.log("⏰ Extension solving timeout, trying fallback...");
    await this.fallbackRecaptchaSolve();
  }
  
  async waitForExtensionToAppear() {
    console.log("🔌 Waiting for 2Captcha Extension to appear...");
    
    let attempts = 0;
    const maxAttempts = 20; // 2 minutes max
    
    while (attempts < maxAttempts) {
      await this.delay(6000); // Wait 6 seconds between checks
      attempts++;
      
      const extensionStatus = await this.page.evaluate(() => {
        // Look for 2Captcha extension elements
        const extensionElements = document.querySelectorAll(
          '.captcha-solver, [data-captcha-type], .captcha-solver_inner'
        );
        
        if (extensionElements.length > 0) {
          const status = extensionElements[0].getAttribute('data-state');
          const type = extensionElements[0].getAttribute('data-captcha-type');
          return {
            present: true,
            status: status,
            type: type,
            elementCount: extensionElements.length
          };
        }
        
        return { present: false };
      });
      
      console.log(`🔍 Extension check ${attempts}/${maxAttempts}: ${extensionStatus.present ? 'FOUND' : 'NOT FOUND'}`);
      
      if (extensionStatus.present) {
        console.log(`✅ 2Captcha Extension detected! Status: ${extensionStatus.status}, Type: ${extensionStatus.type}`);
        console.log(`🔌 Extension is ready and loaded!`);
        return true;
      }
      
      // Also check for any reCAPTCHA elements that might trigger the extension
      const recaptchaPresent = await this.page.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]")
        );
      });
      
      if (recaptchaPresent) {
        console.log("🔍 reCAPTCHA detected on main site, extension should activate...");
        // Wait a bit more for extension to detect and activate
        await this.delay(5000);
      }
    }
    
    console.log("⚠️ Extension did not appear after waiting, continuing anyway...");
    return false;
  }
  
  async triggerExtensionSolve() {
    console.log("🔧 Triggering 2Captcha Extension to solve reCAPTCHA...");
    
    try {
      // Try to click the extension button if it exists
      await this.page.evaluate(() => {
        // Look for 2Captcha extension buttons
        const extensionButtons = document.querySelectorAll(
          '.captcha-solver, [data-captcha-type], .captcha-solver_inner'
        );
        
        extensionButtons.forEach(button => {
          if (button.style.display !== 'none' && button.offsetParent !== null) {
            console.log('Clicking 2Captcha extension button...');
            button.click();
          }
        });
        
        // Also try to trigger reCAPTCHA manually to activate extension
        const recaptchaElements = document.querySelectorAll(
          'iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]'
        );
        
        recaptchaElements.forEach(el => {
          // Make elements visible and trigger events
          el.style.display = 'block';
          el.style.visibility = 'visible';
          el.style.position = 'relative';
          el.style.zIndex = '9999';
          
          // Trigger events to activate extension
          el.dispatchEvent(new Event('click', { bubbles: true }));
          el.dispatchEvent(new Event('mouseover', { bubbles: true }));
          el.dispatchEvent(new Event('focus', { bubbles: true }));
        });
      });
      
      await this.delay(3000);
      
      // Try to send a message to the extension to start solving
      await this.page.evaluate(() => {
        if (window.chrome && window.chrome.runtime) {
          // Send message to extension to start solving
          window.chrome.runtime.sendMessage('ifibfemgeogfhoebkmokieepdoobkbpo', {
            action: 'solveRecaptcha'
          });
        }
      });
      
      console.log("✅ Extension trigger attempts completed");
      
    } catch (error) {
      console.log(`⚠️ Error triggering extension: ${error.message}`);
    }
  }

  async fallbackRecaptchaSolve() {
    console.log("🔧 Using fallback reCAPTCHA strategies...");
    
    try {
      // Strategy 1: Wait for auto-solve (invisible reCAPTCHA)
      console.log("⏳ Strategy 1: Waiting for invisible reCAPTCHA auto-solve...");
      await this.delay(10000);
      
      // Check if reCAPTCHA is still present
      const recaptchaStillPresent = await this.page.evaluate(() => {
        return !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]")
        );
      });
      
      if (!recaptchaStillPresent) {
        console.log("✅ reCAPTCHA auto-solved successfully!");
        return;
      }
      
      console.log("⚠️ reCAPTCHA still present, trying manual strategies...");
      
      // Strategy 2: Manual trigger
      console.log("🔧 Strategy 2: Manual trigger...");
      await this.page.evaluate(() => {
        // Find reCAPTCHA elements
        const recaptchaElements = document.querySelectorAll(
          'iframe[src*="recaptcha"], .g-recaptcha, #recaptcha, [data-sitekey]'
        );
        
        recaptchaElements.forEach(el => {
          // Make elements visible
          el.style.display = 'block';
          el.style.visibility = 'visible';
          el.style.position = 'relative';
          el.style.zIndex = '9999';
          
          // Trigger events
          el.dispatchEvent(new Event('click', { bubbles: true }));
          el.dispatchEvent(new Event('mouseover', { bubbles: true }));
          el.dispatchEvent(new Event('focus', { bubbles: true }));
        });
      });
      
      await this.delay(5000);
      
      // Strategy 3: Page manipulation
      console.log("🔧 Strategy 3: Page manipulation...");
      await this.page.evaluate(() => {
        // Hide/remove reCAPTCHA elements
        const recaptchaElements = document.querySelectorAll(
          'iframe[src*="recaptcha"], .g-recaptcha, #recaptcha, [data-sitekey]'
        );
        
        recaptchaElements.forEach(el => {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        });
        
        // Fill hidden response fields
        const responseFields = document.querySelectorAll(
          'textarea[name*="recaptcha"], input[name*="recaptcha"]'
        );
        
        responseFields.forEach(field => {
          field.value = 'bypassed';
          field.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
      
      await this.delay(3000);
      
      // Strategy 4: Force proceed
      console.log("🔧 Strategy 4: Force proceed...");
      await this.page.evaluate(() => {
        // Try to submit forms or click buttons
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          form.dispatchEvent(new Event('submit', { bubbles: true }));
        });
        
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        buttons.forEach(button => {
          if (button.textContent.toLowerCase().includes('submit') ||
              button.textContent.toLowerCase().includes('continue') ||
              button.textContent.toLowerCase().includes('search')) {
            button.dispatchEvent(new Event('click', { bubbles: true }));
          }
        });
      });
      
      console.log("✅ Fallback reCAPTCHA strategies completed");
      
    } catch (error) {
      console.log(`⚠️ Fallback reCAPTCHA handling error: ${error.message}`);
    }
  }

  async navigateWithRecaptchaHandling(url) {
    console.log(`🌐 Navigating to: ${url}`);
    
    // With persistent profile, we can build trust over time
    console.log("🥷 Using persistent profile for trust building...");
    
    // First, establish a more natural browsing pattern with realistic delays
    console.log("🍪 Establishing natural browsing session with persistent profile...");
    try {
      // Go to main site first to build trust
      console.log("🌐 Visiting main site (building trust)...");
      await this.page.goto("https://www.nadlan.gov.il/", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      
      // Wait for 2Captcha Extension to load and appear
      console.log("🔌 Waiting for 2Captcha Extension to load...");
      await this.waitForExtensionToAppear();
      
      // Simulate human reading behavior - much longer delays
      console.log("👤 Simulating human reading behavior...");
      await this.delay(5000 + Math.random() * 3000); // 5-8 seconds
      await this.humanLikeBehavior();
      
      // Simulate scrolling and reading
      await this.page.evaluate(async () => {
        const scrollHeight = document.body.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollStep = viewportHeight / 4;
        
        for (let i = 0; i < scrollHeight; i += scrollStep) {
          window.scrollTo(0, i);
          await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200)); // 0.8-2 seconds per scroll
        }
        
        // Scroll back to top slowly
        window.scrollTo(0, 0);
      });
      
      await this.delay(3000 + Math.random() * 2000); // 3-5 seconds
      
      // Visit Google to establish reCAPTCHA trust
      console.log("🔄 Building reCAPTCHA trust with Google...");
      await this.page.goto("https://www.google.com/", {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
      
      // Spend time on Google like a real user
      console.log("👤 Spending time on Google (building reCAPTCHA trust)...");
      await this.delay(8000 + Math.random() * 4000); // 8-12 seconds
      
      // Simulate some Google interactions
      await this.page.evaluate(() => {
        // Simulate mouse movements and clicks
        const event = new MouseEvent('mousemove', {
          clientX: Math.random() * 800,
          clientY: Math.random() * 600,
          bubbles: true
        });
        document.dispatchEvent(event);
        
        // Simulate some typing (but don't actually type)
        const input = document.querySelector('input[name="q"]');
        if (input) {
          input.focus();
          setTimeout(() => input.blur(), 1000);
        }
      });
      
      await this.delay(2000 + Math.random() * 2000); // 2-4 seconds
      
      // Maybe visit a few other pages to look more natural
      console.log("🔄 Simulating natural browsing pattern...");
      await this.page.evaluate(() => {
        // Simulate some mouse movements
        const event = new MouseEvent('mousemove', {
          clientX: Math.random() * 800,
          clientY: Math.random() * 600,
          bubbles: true
        });
        document.dispatchEvent(event);
      });
      
      await this.delay(3000 + Math.random() * 2000); // 3-5 seconds
      console.log("✅ Natural session established with persistent profile");
    } catch (error) {
      console.log("⚠️ Could not establish natural session, continuing anyway...");
    }
    
    // Now navigate to the target page with stealth settings
    console.log("🥷 Stealth navigation to target page...");
    
    try {
      // Use a more natural navigation approach
      await this.page.goto(url, {
        waitUntil: "networkidle2", // Wait for network to be idle
        timeout: 30000,
      });
      
      // Simulate human reading behavior
      console.log("👤 Simulating human reading behavior...");
      await this.delay(3000);
      
      // Scroll slowly like a human would
      await this.page.evaluate(async () => {
        const scrollHeight = document.body.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollStep = viewportHeight / 3;
        
        for (let i = 0; i < scrollHeight; i += scrollStep) {
          window.scrollTo(0, i);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Scroll back to top
        window.scrollTo(0, 0);
      });
      
      await this.delay(2000);
      
      // Check if reCAPTCHA appeared despite our stealth approach
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
        console.log("🚨 reCAPTCHA still appeared despite stealth approach");
        console.log("🔄 Attempting bypass...");
        const solved = await this.solveRecaptcha();
        if (solved) {
          console.log("✅ reCAPTCHA bypassed");
        }
      } else {
        console.log("✅ No reCAPTCHA detected with stealth approach");
      }
      
      // Wait for content to load
      console.log("⏳ Waiting for content to load...");
      await this.delay(5000);
      
      // Try to find content
      try {
        await this.page.waitForSelector('table, tbody, .mainTable, #dealsTable', { timeout: 10000 });
        console.log("✅ Content loaded successfully");
      } catch (error) {
        console.log("⚠️ Content loading timeout, but continuing...");
      }
      
      return true; // Assume success
      
    } catch (error) {
      console.log(`❌ Navigation error: ${error.message}`);
      return false;
    }
  }

  async closePopups() {
        const extensionLoaded = await this.page.evaluate(() => {
          // Check for any 2Captcha extension elements
          const elements = {
            captchaSolver: document.querySelector('[class*="captcha-solver"]'),
            captchaId: document.querySelector('[id*="captcha"]'),
            twoCaptcha: document.querySelector('[class*="2captcha"]'),
            exactCaptchaSolver: document.querySelector(".captcha-solver"),
          };

          console.log("Extension elements found:", elements);

          // Also check all elements with captcha in class
          const allCaptchaElements = document.querySelectorAll("*");
          const captchaElements = [];
          allCaptchaElements.forEach((el) => {
            if (el.className && el.className.includes("captcha")) {
              captchaElements.push({
                tag: el.tagName,
                className: el.className,
                id: el.id,
                visible: el.offsetParent !== null,
              });
            }
          });

          console.log("All captcha elements:", captchaElements);

          return !!(
            elements.captchaSolver ||
            elements.captchaId ||
            elements.twoCaptcha ||
            elements.exactCaptchaSolver
          );
        });

        if (!extensionLoaded) {
          console.log("❌ 2Captcha extension not detected on page");
          console.log("🔍 Checking if extension is installed...");

          // Check if extension is in the browser
          const extensionInstalled = await this.page.evaluate(() => {
            return !!window.chrome && !!window.chrome.runtime;
          });

          if (extensionInstalled) {
            console.log(
              "✅ Chrome extension API detected, but 2Captcha extension not found"
            );
          } else {
            console.log("❌ No Chrome extension API detected");
          }

          return false;
        }

        console.log("✅ 2Captcha extension detected on page");

        // Try to make the extension button visible by scrolling and waiting
        console.log("🔄 Trying to make extension button visible...");
        await this.page.evaluate(() => {
          // Scroll to top and bottom to trigger extension
          window.scrollTo(0, 0);
          setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
          setTimeout(() => window.scrollTo(0, 0), 200);
        });

        // Wait a bit for the extension to respond
        await this.delay(2000);

        // Wait longer for the extension button to appear (60 seconds)
        await this.page.waitForSelector(".captcha-solver", { timeout: 60000 });
        console.log("🔍 Found 2Captcha extension button");

        // Check current state of the button
        const currentState = await this.page.evaluate(() => {
          const button = document.querySelector(".captcha-solver");
          return button ? button.getAttribute("data-state") : null;
        });

        console.log(`🔍 Extension button state: ${currentState}`);

        if (currentState === "solved") {
          console.log("✅ reCAPTCHA already solved by 2Captcha extension!");
          await this.delay(2000); // Wait for page to process
          return true;
        } else if (currentState === "ready") {
          // For invisible reCAPTCHA with auto-solve, just wait for it to solve automatically
          console.log(
            "🔄 Waiting for 2Captcha extension to solve reCAPTCHA automatically..."
          );

          // Wait for the captcha to be solved (up to 5 minutes for invisible reCAPTCHA)
          await this.page.waitForSelector(
            '.captcha-solver[data-state="solved"]',
            { timeout: 300000 }
          );
          console.log(
            "✅ reCAPTCHA solved successfully by 2Captcha extension!"
          );
        } else if (currentState === "solving") {
          console.log(
            "⏳ reCAPTCHA is already being solved by 2Captcha extension..."
          );
          console.log("🔄 Waiting for solving to complete...");

          // Wait for the captcha to be solved (up to 5 minutes for invisible reCAPTCHA)
          await this.page.waitForSelector(
            '.captcha-solver[data-state="solved"]',
            { timeout: 300000 }
          );
          console.log(
            "✅ reCAPTCHA solved successfully by 2Captcha extension!"
          );
        } else {
          console.log(
            `⚠️ Extension button in unexpected state: ${currentState}, waiting for solving...`
          );

          // Even if state is unexpected, wait for it to be solved
          await this.page.waitForSelector(
            '.captcha-solver[data-state="solved"]',
            { timeout: 300000 }
          );
          console.log(
            "✅ reCAPTCHA solved successfully by 2Captcha extension!"
          );
        }

        // Wait a bit for the page to process the solved captcha
        await this.delay(3000);

        // Additional wait to ensure page is fully loaded after reCAPTCHA solve
        console.log(
          "⏳ Additional wait for page to fully load after reCAPTCHA solve..."
        );
        await this.delay(5000);

        // Wait for page to be fully ready (check for content)
        console.log("⏳ Waiting for page content to be ready...");
        try {
          // Wait for any table or content to appear
          await this.page.waitForSelector(
            "table, tbody, .mainTable, #dealsTable",
            { timeout: 10000 }
          );
          console.log("✅ Page content detected");

          // Verify that we have actual data and not just a loading page
          const hasData = await this.page.evaluate(() => {
            const tables = document.querySelectorAll(
              "table, .mainTable, #dealsTable"
            );
            for (let table of tables) {
              const rows = table.querySelectorAll("tr");
              if (rows.length > 1) {
                // More than just header
                return true;
              }
            }
            return false;
          });

          if (hasData) {
            console.log("✅ Verified: Page has actual data content");
          } else {
            console.log("⚠️ Warning: Page loaded but no data detected");
          }
        } catch (error) {
          console.log("⚠️ No table content detected, continuing anyway...");
        }

        return true;
      } catch (error) {
        console.log(`❌ Error with 2Captcha extension: ${error.message}`);

        // Check if the extension button is in error state
        const errorState = await this.page.evaluate(() => {
          const button = document.querySelector(".captcha-solver");
          return button ? button.getAttribute("data-state") : null;
        });

        if (errorState === "error") {
          console.log("❌ 2Captcha extension reported an error");
        } else if (errorState === null) {
          console.log("❌ 2Captcha extension button not found");
        }

        // Try to manually trigger the extension if button not found
        console.log("🔄 Trying to manually trigger 2Captcha extension...");
        try {
          await this.page.evaluate(() => {
            // Try to trigger extension by dispatching events
          const recaptchaElements = document.querySelectorAll(
            '.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'
          );
            recaptchaElements.forEach((el) => {
              el.dispatchEvent(new Event("click"));
              el.dispatchEvent(new Event("mouseover"));
            });

            // Try to find and click any hidden extension button
            const hiddenButtons = document.querySelectorAll(
              '[class*="captcha-solver"]'
            );
            hiddenButtons.forEach((btn) => {
              if (
                btn.style.display === "none" ||
                btn.style.visibility === "hidden"
              ) {
                btn.style.display = "block";
                btn.style.visibility = "visible";
                btn.click();
              }
          });
        });

          // Wait a bit for the extension to respond
          await this.delay(3000);

          // Check if extension button is now visible
          const buttonNowVisible = await this.page.evaluate(() => {
            const button = document.querySelector(".captcha-solver");
            return button && button.offsetParent !== null;
          });

          if (buttonNowVisible) {
            console.log(
              "✅ Extension button is now visible, waiting for solving..."
            );
            await this.page.waitForSelector(
              '.captcha-solver[data-state="solved"]',
              { timeout: 300000 }
            );
            console.log("✅ reCAPTCHA solved successfully!");
            return true;
          }
        } catch (triggerError) {
          console.log(
            `⚠️ Could not trigger extension manually: ${triggerError.message}`
          );
        }

        // Fallback: Check if reCAPTCHA is actually solved by other means
        console.log("🔄 Checking if reCAPTCHA was solved by other means...");
        const recaptchaStillPresent = await this.page.evaluate(() => {
          return !!(
            document.querySelector('iframe[src*="recaptcha"]') ||
            document.querySelector(".g-recaptcha") ||
            document.querySelector("#recaptcha") ||
            document.querySelector("[data-sitekey]") ||
            document.querySelector('iframe[title*="reCAPTCHA"]')
          );
        });

        if (!recaptchaStillPresent) {
          console.log("✅ reCAPTCHA appears to be solved (no longer present)");
      return true;
        } else {
          console.log("❌ reCAPTCHA still present, extension failed");
          return false;
        }
      }
    } catch (error) {
      console.log(`❌ Error solving reCAPTCHA: ${error.message}`);
      return false;
    }
  }

  async closePopups() {
    try {
      // Common popup selectors
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
      ];

      let popupFound = false;

      for (const selector of popupSelectors) {
        try {
          const elements = await this.page.$$(selector);
          for (const element of elements) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              await element.click();
              console.log(`    ✅ Closed popup with selector: ${selector}`);
              popupFound = true;
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Also try pressing Escape key
      try {
        await this.page.keyboard.press("Escape");
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        // Ignore keyboard errors
      }

      return popupFound;
    } catch (error) {
      console.log(`    ⚠️ Error closing popups: ${error.message}`);
      return false;
    }
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
    await this.randomDelay(200, 500);
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
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
      const maxReloadAttempts = 10;
      let navigationSuccess = false;

      while (reloadAttempts < maxReloadAttempts && !navigationSuccess) {
        try {
          // Use the new reCAPTCHA-aware navigation method
          const recaptchaSolved = await this.navigateWithRecaptchaHandling(url);

          // Check for popups and close them
          const popupClosed = await this.closePopups();

          if (popupClosed) {
            console.log(
              `    🔄 Popup detected and closed, reloading page... (attempt ${
                reloadAttempts + 1
              })`
            );
            reloadAttempts++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
            throw error;
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Human-like behavior after page load
      await this.humanLikeBehavior();

      // Additional wait for content to load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(`    ⏳ Page loaded, waiting for content...`);

      // reCAPTCHA is already handled during navigation

      // Try to prevent popups by waiting longer and checking for deals directly
      console.log(
        `    🔍 Checking for deals directly without popup handling...`
      );

      // Wait a bit longer for the page to fully load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log(`    🔄 Page refreshed, checking for deals again...`);
      }

      // Get current URL to verify we're on the right page
      const currentUrl = await this.page.url();
      console.log(`    🔗 Current URL: ${currentUrl}`);

      // Simulate human behavior - scroll down and up
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.randomDelay(200, 400);
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.randomDelay(200, 400);

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
            await this.randomDelay(10, 30);

            // Minimal scroll simulation
            await this.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            await this.randomDelay(10, 20);
            await this.page.evaluate(() => {
              window.scrollTo(0, 0);
            });
            await this.randomDelay(10, 20);

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
        if (pageNumber > 100) {
          // Reduced from 100 to 50
          console.log(`    ⚠️  Reached maximum page limit (100), stopping`);
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
      const maxReloadAttempts = 10;
      let navigationSuccess = false;

      while (reloadAttempts < maxReloadAttempts && !navigationSuccess) {
        try {
          // Use the new reCAPTCHA-aware navigation method
          const recaptchaSolved = await this.navigateWithRecaptchaHandling(url);
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
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
            throw error;
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Human-like behavior after page load
      await this.humanLikeBehavior();

      // Additional wait for content to load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(`    ⏳ Page loaded, waiting for content...`);

      // reCAPTCHA is already handled during navigation

      // Try to prevent popups by waiting longer and checking for deals directly
      console.log(
        `    🔍 Checking for deals directly without popup handling...`
      );

      // Wait a bit longer for the page to fully load (reduced)
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log(`    🔄 Page refreshed, checking for deals again...`);
      }

      // Get current URL to verify we're on the right page
      const currentUrl = await this.page.url();
      console.log(`    🔗 Current URL: ${currentUrl}`);

      // Simulate human behavior - scroll down and up
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.randomDelay(200, 400);
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.randomDelay(200, 400);

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
            await this.randomDelay(10, 30);

            // Minimal scroll simulation
            await this.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            await this.randomDelay(10, 20);
            await this.page.evaluate(() => {
              window.scrollTo(0, 0);
            });
            await this.randomDelay(10, 20);

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
        if (pageNumber > 100) {
          // Reduced from 100 to 50
          console.log(`    ⚠️  Reached maximum page limit (100), stopping`);
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
      await this.init(false); // Set to false to see the browser

      const councilsPath = "councils-with-folders";
      const allCouncilFolders = fs.readdirSync(councilsPath);
      const councilFolders = allCouncilFolders.filter(
        (folder) =>
          folder === "אור יהודה" ||
          folder === "אילת" ||
          folder === "אשדוד" ||
          folder === "אשקלון" ||
          folder === "באר שבע" ||
          folder === "בית שאן" ||
          folder === "בית שמש" ||
          folder === "ביתר עילית" ||
          folder === "בני ברק" ||
          folder === "בת ים" ||
          folder === "דימונה" ||
          folder === "הוד השרון" ||
          folder === "הרצליה" ||
          folder === "חדרה" ||
          folder === "חולון" ||
          folder === "חיפה" ||
          folder === "טבריה" ||
          folder === "טייבה" ||
          folder === "טירת כרמל" ||
          folder === "יבנה" ||
          folder === "יהוד-מונוסון" ||
          folder === "יקנעם עילית" ||
          folder === "ירושלים" ||
          folder === "כפר סבא" ||
          folder === "כרמיאל" ||
          folder === "כפר קאסם" ||
          folder === "לוד"
      );

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
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
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
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

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

          // Add random delay between neighborhoods (5-10 seconds)
          const randomDelay = Math.floor(Math.random() * 5000) + 5000; // 5-10 seconds
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
        await this.randomDelay(100, 200);
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
