const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = 'councils-with-folders/ללא_מועצה_אזורית/ללא_מועצה_אזורית.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV content
const lines = csvContent.split('\n');
const cities = [];

// Skip header line and process each city
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line) {
    // Parse CSV line - remove quotes and split by comma
    const parts = line.split('","');
    if (parts.length >= 2) {
      const id = parts[0].replace(/"/g, '');
      const name = parts[1].replace(/"/g, '');
      cities.push({ id, name });
    }
  }
}

console.log(`Found ${cities.length} cities`);

// Create folder for each city
cities.forEach((city, index) => {
  const folderName = city.name.replace(/[\/\\:*?"<>|]/g, '_'); // Replace invalid characters
  const folderPath = path.join('councils-with-folders', folderName);
  
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`✅ Created folder: ${folderName} (ID: ${city.id})`);
    } else {
      console.log(`⚠️  Folder already exists: ${folderName}`);
    }
  } catch (error) {
    console.error(`❌ Error creating folder ${folderName}:`, error.message);
  }
});

console.log(`\n🎉 Finished creating folders for ${cities.length} cities!`);










