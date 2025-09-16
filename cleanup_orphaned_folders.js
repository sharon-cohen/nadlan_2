const fs = require("fs");
const path = require("path");

async function cleanupOrphanedFolders() {
  try {
    // Read the cities CSV file
    const csvPath = "all_city.csv";
    const csvContent = fs.readFileSync(csvPath, "utf8");

    // Parse CSV content to get valid city names
    const lines = csvContent.split("\n");
    const validCities = new Set();

    // Skip header line and process each city
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Parse CSV line - split by comma and handle quoted fields
        const parts = line.split(",");
        if (parts.length >= 2) {
          const name = parts[1].replace(/"/g, "");
          validCities.add(name);
        }
      }
    }

    console.log(`Found ${validCities.size} valid cities in all_city.csv`);

    // Get all folders in councils-with-folders
    const councilsPath = "councils-with-folders";
    const folders = fs.readdirSync(councilsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${folders.length} folders in councils-with-folders`);

    // Find orphaned folders (not in valid cities list)
    const orphanedFolders = folders.filter(folder => !validCities.has(folder));

    console.log(`\nFound ${orphanedFolders.length} orphaned folders:`);
    orphanedFolders.forEach(folder => {
      console.log(`  - ${folder}`);
    });

    if (orphanedFolders.length === 0) {
      console.log("\n✅ No orphaned folders found. All folders are valid!");
      return;
    }

    // Ask for confirmation before deletion
    console.log(`\n⚠️  About to delete ${orphanedFolders.length} orphaned folders.`);
    console.log("This action cannot be undone!");
    
    // For safety, let's just show what would be deleted first
    console.log("\n📋 Folders that would be deleted:");
    orphanedFolders.forEach(folder => {
      const folderPath = path.join(councilsPath, folder);
      const files = fs.readdirSync(folderPath);
      console.log(`  - ${folder} (${files.length} files)`);
    });

    // Delete the orphaned folders
    console.log("\n🗑️  Deleting orphaned folders...");
    let deletedCount = 0;
    
    for (const folder of orphanedFolders) {
      const folderPath = path.join(councilsPath, folder);
      try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`  ✅ Deleted: ${folder}`);
        deletedCount++;
      } catch (error) {
        console.log(`  ❌ Failed to delete ${folder}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Cleanup completed! Deleted ${deletedCount} folders.`);

  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Run the cleanup
cleanupOrphanedFolders();
