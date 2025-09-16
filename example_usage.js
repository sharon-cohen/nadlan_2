#!/usr/bin/env node
/**
 * Example usage of the Nadlan Deals API Scraper
 *
 * This script demonstrates how to use the NadlanDealsAPIScraper class
 * with different parameter values.
 */

const NadlanDealsAPIScraper = require("./nadlan_deals_api_scraper.js");

async function exampleUsage() {
  console.log("📚 Nadlan Deals API Scraper - Usage Examples");
  console.log("============================================\n");

  const scraper = new NadlanDealsAPIScraper();

  try {
    // Example 1: Test with placeholder
    console.log("🔹 Example 1: Testing with placeholder parameter");
    console.log("─".repeat(50));
    const placeholderResult = await scraper.testWithPlaceholder();
    console.log("✅ Placeholder test completed\n");

    // Example 2: Test with a different parameter value
    console.log("🔹 Example 2: Testing with custom parameter");
    console.log("─".repeat(50));
    const customResult = await scraper.testWithCustomParameter("12345");
    console.log("✅ Custom parameter test completed\n");

    // Example 3: Show how to use the scraper programmatically
    console.log("🔹 Example 3: Programmatic usage");
    console.log("─".repeat(50));

    // You can call fetchDealsData directly with any parameter value
    const directResult = await scraper.fetchDealsData("67890");
    console.log("📊 Direct API call result:");
    console.log(`   Status: ${directResult.statusCode}`);
    if (directResult.data) {
      console.log(`   Total rows: ${directResult.data.total_rows}`);
      console.log(
        `   Items count: ${
          directResult.data.items ? directResult.data.items.length : 0
        }`
      );
    }

    console.log("\n✨ All examples completed successfully!");
    console.log("\n📝 Usage Notes:");
    console.log(
      '   • Replace "PLACE_HOLDER" with actual parameter values when you have them'
    );
    console.log(
      "   • The API returns gzip-compressed base64 data that gets automatically decoded"
    );
    console.log(
      "   • Response structure: { statusCode, data: { total_rows, total_fetch, total_page, items } }"
    );
    console.log("   • All responses are automatically saved to JSON files");
  } catch (error) {
    console.error("❌ Example failed:", error.message);
  }
}

// Run the examples
if (require.main === module) {
  exampleUsage();
}


