const fs = require("fs");
const path = require("path");

class EmptyNeighborhoodCleaner {
  constructor() {
    this.deletedFolders = [];
    this.skippedFolders = [];
  }

  async cleanupEmptyNeighborhoods() {
    console.log("🧹 Starting cleanup of empty neighborhood folders...");

    const councilsPath = path.join(__dirname, "councils-with-folders");

    if (!fs.existsSync(councilsPath)) {
      console.log("❌ councils-with-folders directory not found");
      return;
    }

    const councilFolders = fs.readdirSync(councilsPath);
    console.log(`📁 Found ${councilFolders.length} council folders`);

    for (const councilFolder of councilFolders) {
      const councilPath = path.join(councilsPath, councilFolder);

      // Skip non-directory items
      if (!fs.statSync(councilPath).isDirectory()) {
        continue;
      }

      console.log(`\n🏙️  Processing council: ${councilFolder}`);

      try {
        const neighborhoodFolders = fs.readdirSync(councilPath);

        for (const neighborhoodFolder of neighborhoodFolders) {
          const neighborhoodPath = path.join(councilPath, neighborhoodFolder);

          // Skip non-directory items
          if (!fs.statSync(neighborhoodPath).isDirectory()) {
            continue;
          }

          // Check if this folder contains a CSV file
          const csvFile = path.join(
            neighborhoodPath,
            `${neighborhoodFolder}_deals.csv`
          );

          if (!fs.existsSync(csvFile)) {
            // No CSV file found, this is an empty neighborhood folder
            console.log(`  🗑️  Deleting empty folder: ${neighborhoodFolder}`);

            try {
              // Remove the entire folder
              fs.rmSync(neighborhoodPath, { recursive: true, force: true });
              this.deletedFolders.push(
                `${councilFolder}/${neighborhoodFolder}`
              );
            } catch (error) {
              console.log(
                `  ❌ Failed to delete ${neighborhoodFolder}: ${error.message}`
              );
            }
          } else {
            // CSV file exists, keep the folder
            this.skippedFolders.push(`${councilFolder}/${neighborhoodFolder}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error processing ${councilFolder}: ${error.message}`);
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log("\n📊 Cleanup Summary:");
    console.log(`  🗑️  Deleted folders: ${this.deletedFolders.length}`);
    console.log(`  ✅ Kept folders: ${this.skippedFolders.length}`);

    if (this.deletedFolders.length > 0) {
      console.log("\n🗑️  Deleted folders:");
      this.deletedFolders.forEach((folder) => {
        console.log(`    - ${folder}`);
      });
    }

    console.log("\n✅ Cleanup completed!");
  }
}

// Run the cleanup
const cleaner = new EmptyNeighborhoodCleaner();
cleaner.cleanupEmptyNeighborhoods().catch(console.error);
