#!/usr/bin/env node
/**
 * Test script for Nadlan Deals Scraper
 * בודק את הסקריפט על ישוב אחד בלבד
 */

const NadlanDealsScraper = require("./nadlan_deals_scraper.js");

class TestScraper extends NadlanDealsScraper {
  async testSingleSettlement() {
    try {
      console.log(
        "🧪 Testing Nadlan Deals Scraper with single settlement...\n"
      );

      await this.init();

      // Test with a specific settlement (נחזור לברוש)
      const testSettlement = {
        id: "2060",
        nameHebrew: "ברוש",
        nameEnglish: "BEROSH",
        nadlanUrl:
          "https://www.nadlan.gov.il/?view=settlement&id=2060&page=deals",
        councilFolder: "בני_שמעון",
        councilPath: "./councils-with-folders/בני_שמעון",
      };

      console.log(
        `🔍 Testing with settlement: ${testSettlement.nameHebrew} (ID: ${testSettlement.id})`
      );

      // Navigate to the page first
      const dealsUrl = `https://www.nadlan.gov.il/?view=settlement&id=${testSettlement.id}&page=deals`;

      // Listen for console messages and network errors
      this.page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.log("🔴 Console Error:", msg.text());
        }
      });

      this.page.on("response", (response) => {
        if (!response.ok()) {
          console.log("🔴 Network Error:", response.url(), response.status());
        }
      });

      console.log(`🌐 Navigating to: ${dealsUrl}`);

      await this.page.goto(dealsUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Check the current URL after navigation
      const currentUrl = await this.page.url();
      console.log(`📍 Current URL: ${currentUrl}`);

      // Check if we got redirected or if there's an error
      if (currentUrl !== dealsUrl) {
        console.log(`⚠️  URL changed from ${dealsUrl} to ${currentUrl}`);
      }

      await this.page.waitForTimeout(2000); // Reduced wait time

      // Save page source for debugging
      const pageContent = await this.page.content();
      require("fs").writeFileSync("debug_page.html", pageContent, "utf8");
      console.log("💾 Saved page source to debug_page.html");

      // Check what pagination elements exist
      const paginationInfo = await this.page.evaluate(() => {
        const info = {
          paginationElements: [],
          allButtons: [],
          pageNumbers: [],
        };

        // Find all pagination-related elements
        const paginationSelectors = [
          ".pagination",
          ".pager",
          '[class*="page"]',
          '[class*="pagination"]',
          "nav",
          ".nav",
          '[role="navigation"]',
        ];

        paginationSelectors.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            info.paginationElements.push({
              selector: selector,
              text: el.textContent.trim(),
              html: el.outerHTML.substring(0, 200),
            });
          });
        });

        // Find all buttons and links
        const allClickable = document.querySelectorAll("a, button, span, div");
        allClickable.forEach((el) => {
          const text = el.textContent.trim();
          if (
            text.includes("הבא") ||
            text.includes("Next") ||
            text.includes(">") ||
            text.match(/^\d+$/) ||
            text.includes("עמוד")
          ) {
            info.allButtons.push({
              tag: el.tagName,
              text: text,
              classes: el.className,
              onclick: el.onclick ? "has onclick" : "no onclick",
              href: el.href || "no href",
            });
          }
        });

        return info;
      });

      console.log(
        "🔍 Pagination info:",
        JSON.stringify(paginationInfo, null, 2)
      );

      await this.scrapeSettlementDeals(testSettlement);

      console.log("\n✅ Test completed successfully!");
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log("🔒 Browser closed");
      }
    }
  }
}

// Run test
async function runTest() {
  const testScraper = new TestScraper();
  await testScraper.testSingleSettlement();
}

if (require.main === module) {
  runTest().catch(console.error);
}
