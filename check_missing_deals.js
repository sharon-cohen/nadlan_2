const fs = require("fs");
const path = require("path");

/**
 * Script to check which neighborhoods are missing deals CSV files
 */

function checkMissingDeals() {
  console.log("🔍 Checking for missing deals CSV files...\n");

  const councilsPath = "councils-with-folders";
  const cities = fs.readdirSync(councilsPath).filter((item) => {
    const itemPath = path.join(councilsPath, item);
    return fs.statSync(itemPath).isDirectory() && item !== "README.md";
  });

  let totalMissing = 0;
  let citiesWithMissing = 0;

  cities.forEach((city) => {
    const cityPath = path.join(councilsPath, city);
    const areasFile = path.join(cityPath, `${city}_areas.csv`);

    if (fs.existsSync(areasFile)) {
      const content = fs.readFileSync(areasFile, "utf8");
      const lines = content.split("\n").filter((line) => line.trim());
      const neighborhoods = [];

      // Parse neighborhoods from CSV
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

      if (neighborhoods.length > 0) {
        let cityMissing = 0;
        const missingNeighborhoods = [];

        neighborhoods.forEach((n) => {
          const neighborhoodPath = path.join(cityPath, n.name);
          const hasDeals =
            fs.existsSync(neighborhoodPath) &&
            fs
              .readdirSync(neighborhoodPath)
              .some((file) => file.endsWith("_deals.csv"));

          if (!hasDeals) {
            cityMissing++;
            missingNeighborhoods.push(n);
          }
        });

        if (cityMissing > 0) {
          console.log(`🏙️ ${city}: ${cityMissing} missing deals CSV`);
          missingNeighborhoods.forEach((n) => {
            console.log(`  📭 ${n.name} (ID: ${n.id})`);
          });
          console.log("");
          totalMissing += cityMissing;
          citiesWithMissing++;
        }
      }
    }
  });

  console.log("📊 SUMMARY:");
  console.log(`🏙️ Cities with missing deals: ${citiesWithMissing}`);
  console.log(`📭 Total missing deals CSV files: ${totalMissing}`);

  if (totalMissing === 0) {
    console.log("🎉 All neighborhoods already have deals CSV files!");
  }
}

checkMissingDeals();


