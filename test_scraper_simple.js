const NadlanDealsScraper = require("./nadlan_deals_scraper_simple");

class TestScraper extends NadlanDealsScraper {
  async testSingleSettlement() {
    try {
      await this.init();

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

      await this.scrapeSettlementDeals(testSettlement);

      console.log("\n✅ Test completed successfully!");
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    } finally {
      await this.close();
    }
  }
}

// Run the test
const testScraper = new TestScraper();
testScraper.testSingleSettlement();


















