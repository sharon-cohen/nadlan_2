const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

puppeteer.use(StealthPlugin());

// Specific neighborhoods to scrape
const targetNeighborhoods = [
  { name: "כפר שלם מזרח נווה א", id: "65210001" },
  { name: "כפר שלם מערב נווה ב", id: "65210002" },
  { name: "אזורי חן", id: "65210126" },
  { name: "אפקה", id: "65210136" },
];

async function scrapeNeighborhood(neighborhood) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();

  // Set user agent
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const url = `https://www.nadlan.gov.il/?view=neighborhood&id=${neighborhood.id}&page=deals`;
  console.log(`Scraping: ${neighborhood.name} (${neighborhood.id})`);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for deals
    const deals = await page.evaluate(() => {
      const dealElements = document.querySelectorAll(
        '.deal-item, .transaction-item, [class*="deal"], [class*="transaction"]'
      );
      return dealElements.length;
    });

    console.log(`Found ${deals} deals for ${neighborhood.name}`);
  } catch (error) {
    console.log(`Error scraping ${neighborhood.name}: ${error.message}`);
  }

  await browser.close();
}

async function main() {
  console.log("Starting specific neighborhood scraping...");

  for (const neighborhood of targetNeighborhoods) {
    await scrapeNeighborhood(neighborhood);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait between neighborhoods
  }

  console.log("Finished scraping specific neighborhoods");
}

main().catch(console.error);
