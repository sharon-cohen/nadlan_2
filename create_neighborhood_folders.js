const fs = require("fs");
const path = require("path");

async function createNeighborhoodFolders() {
  try {
    const councilsPath = "councils-with-folders";

    // Get all city folders
    const cityFolders = fs
      .readdirSync(councilsPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    console.log(`Found ${cityFolders.length} city folders to process`);

    let processedCities = 0;
    let citiesWithNeighborhoods = 0;
    let totalNeighborhoodsCreated = 0;
    let citiesSkipped = 0;

    for (const cityFolder of cityFolders) {
      try {
        const cityPath = path.join(councilsPath, cityFolder);
        const areasFilePath = path.join(cityPath, `${cityFolder}_areas.csv`);

        // Check if areas file exists
        if (!fs.existsSync(areasFilePath)) {
          console.log(`  ⚠️  No areas file found for ${cityFolder}`);
          processedCities++;
          continue;
        }

        // Read the areas CSV file
        const csvContent = fs.readFileSync(areasFilePath, "utf8");
        const lines = csvContent.split("\n");

        // Parse CSV to find neighborhoods
        const neighborhoods = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const parts = line.split(",");
            if (parts.length >= 3) {
              const name = parts[0].replace(/"/g, "");
              const type = parts[2].replace(/"/g, "");
              if (type === "Neighborhood") {
                neighborhoods.push(name);
              }
            }
          }
        }

        if (neighborhoods.length === 0) {
          console.log(`  📍 ${cityFolder}: No neighborhoods found`);
          processedCities++;
          continue;
        }

        console.log(
          `\n🏙️  Processing ${cityFolder}: Found ${neighborhoods.length} neighborhoods`
        );

        // Check if neighborhood folders already exist
        const existingFolders = fs
          .readdirSync(cityPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        const neighborhoodsToCreate = neighborhoods.filter(
          (neighborhood) => !existingFolders.includes(neighborhood)
        );

        if (neighborhoodsToCreate.length === 0) {
          console.log(
            `  ✅ All neighborhood folders already exist for ${cityFolder}`
          );
          citiesSkipped++;
        } else {
          console.log(
            `  📁 Creating ${neighborhoodsToCreate.length} new neighborhood folders:`
          );

          let createdCount = 0;
          for (const neighborhood of neighborhoodsToCreate) {
            const neighborhoodPath = path.join(cityPath, neighborhood);
            try {
              fs.mkdirSync(neighborhoodPath, { recursive: true });
              console.log(`    ✅ Created: ${neighborhood}`);
              createdCount++;
              totalNeighborhoodsCreated++;
            } catch (error) {
              console.log(
                `    ❌ Failed to create ${neighborhood}: ${error.message}`
              );
            }
          }

          console.log(`  🎉 Created ${createdCount} folders for ${cityFolder}`);
          citiesWithNeighborhoods++;
        }

        processedCities++;
      } catch (error) {
        console.error(`  ❌ Error processing ${cityFolder}:`, error.message);
        processedCities++;
      }
    }

    console.log(`\n🎉 Finished processing all cities!`);
    console.log(`📊 Summary:`);
    console.log(`  🏙️  Total cities processed: ${processedCities}`);
    console.log(`  📁 Cities with neighborhoods: ${citiesWithNeighborhoods}`);
    console.log(`  ⏭️  Cities skipped (folders exist): ${citiesSkipped}`);
    console.log(
      `  🆕 Total neighborhood folders created: ${totalNeighborhoodsCreated}`
    );
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

// Run the script
createNeighborhoodFolders();






