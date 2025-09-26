const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");
const path = require("path");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function checkIPStatus() {
  try {
    console.log("🌐 Checking IP status...");
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();

    return {
      ip: data.ip,
      country: data.country_name,
      city: data.city,
      status: "Active",
      isp: data.org,
      timezone: data.timezone,
      region: data.region,
    };
  } catch (error) {
    return {
      ip: "Unknown",
      country: "Unknown",
      city: "Unknown",
      status: "Error",
      isp: "Unknown",
      timezone: "Unknown",
      region: "Unknown",
    };
  }
}

async function testIPStatus() {
  console.log("🧪 Testing IP Status and reCAPTCHA Blocking");

  // Check IP status
  console.log("\n🌐 Step 1: Checking IP status...");
  const ipInfo = await checkIPStatus();

  console.log("📍 IP Information:");
  console.log(`   IP Address: ${ipInfo.ip}`);
  console.log(`   Country: ${ipInfo.country}`);
  console.log(`   Region: ${ipInfo.region}`);
  console.log(`   City: ${ipInfo.city}`);
  console.log(`   ISP: ${ipInfo.isp}`);
  console.log(`   Timezone: ${ipInfo.timezone}`);
  console.log(`   Status: ${ipInfo.status}`);

  // Check if IP might be blocked
  console.log("\n🔍 Step 2: Analyzing IP for potential blocking...");

  const suspiciousFactors = [];

  // Check for common blocking indicators
  if (
    ipInfo.isp &&
    (ipInfo.isp.toLowerCase().includes("vpn") ||
      ipInfo.isp.toLowerCase().includes("proxy") ||
      ipInfo.isp.toLowerCase().includes("hosting") ||
      ipInfo.isp.toLowerCase().includes("datacenter"))
  ) {
    suspiciousFactors.push("ISP appears to be hosting/VPN/datacenter");
  }

  if (ipInfo.country && ipInfo.country !== "Israel") {
    suspiciousFactors.push("IP is not from Israel (target site location)");
  }

  if (suspiciousFactors.length > 0) {
    console.log("⚠️ Potential IP blocking factors:");
    suspiciousFactors.forEach((factor) => {
      console.log(`   - ${factor}`);
    });
  } else {
    console.log("✅ IP appears to be residential/legitimate");
  }

  // Test direct access to the site
  console.log("\n🌐 Step 3: Testing direct site access...");

  const userDataDir = path.join(__dirname, "puppeteer_profile");

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: userDataDir,
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
    // Test access to the main site
    console.log("🔍 Testing access to main site...");
    await page.goto("https://www.nadlan.gov.il/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const mainSiteStatus = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent.length > 100,
        hasErrors:
          document.body.textContent.toLowerCase().includes("blocked") ||
          document.body.textContent.toLowerCase().includes("forbidden") ||
          document.body.textContent.toLowerCase().includes("access denied"),
      };
    });

    console.log("📊 Main Site Status:");
    console.log(`   Title: ${mainSiteStatus.title}`);
    console.log(`   Has Content: ${mainSiteStatus.hasContent ? "YES" : "NO"}`);
    console.log(`   Has Errors: ${mainSiteStatus.hasErrors ? "YES" : "NO"}`);

    if (mainSiteStatus.hasErrors) {
      console.log("🚨 IP appears to be blocked on main site!");
    } else {
      console.log("✅ Main site accessible");
    }

    // Test access to target page
    console.log("\n🔍 Testing access to target page...");
    await page.goto(
      "https://www.nadlan.gov.il/?view=settlement&id=2640&page=deals",
      {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const targetPageStatus = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent:
          document.querySelectorAll("table, tbody, .mainTable, #dealsTable")
            .length > 0,
        hasRecaptcha: !!(
          document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector(".g-recaptcha") ||
          document.querySelector("#recaptcha") ||
          document.querySelector("[data-sitekey]")
        ),
        hasErrors:
          document.body.textContent.toLowerCase().includes("blocked") ||
          document.body.textContent.toLowerCase().includes("forbidden") ||
          document.body.textContent.toLowerCase().includes("access denied"),
      };
    });

    console.log("📊 Target Page Status:");
    console.log(`   Title: ${targetPageStatus.title}`);
    console.log(
      `   Has Content: ${targetPageStatus.hasContent ? "YES" : "NO"}`
    );
    console.log(
      `   Has reCAPTCHA: ${targetPageStatus.hasRecaptcha ? "YES" : "NO"}`
    );
    console.log(`   Has Errors: ${targetPageStatus.hasErrors ? "YES" : "NO"}`);

    if (targetPageStatus.hasErrors) {
      console.log("🚨 IP appears to be blocked on target page!");
    } else if (targetPageStatus.hasRecaptcha) {
      console.log("⚠️ reCAPTCHA present - may be IP-related");
    } else {
      console.log("✅ Target page accessible without issues");
    }

    // Provide recommendations
    console.log("\n💡 Recommendations:");

    if (
      suspiciousFactors.length > 0 ||
      mainSiteStatus.hasErrors ||
      targetPageStatus.hasErrors
    ) {
      console.log("🔧 IP Blocking Solutions:");
      console.log("   1. Use a VPN with residential IP");
      console.log("   2. Use a proxy service");
      console.log("   3. Change your internet connection");
      console.log("   4. Use a mobile hotspot");
      console.log("   5. Wait 24-48 hours for IP to be unblocked");
      console.log("   6. Use a different ISP/network");
    } else if (targetPageStatus.hasRecaptcha) {
      console.log("🔧 reCAPTCHA Solutions:");
      console.log("   1. Use persistent browser profile (already implemented)");
      console.log("   2. Add more realistic delays between requests");
      console.log("   3. Simulate more human-like behavior");
      console.log("   4. Use residential proxy/VPN");
      console.log("   5. Build trust over multiple sessions");
    } else {
      console.log("✅ No IP blocking detected - issue may be elsewhere");
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

testIPStatus().catch(console.error);











