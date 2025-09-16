const fs = require('fs');
const path = require('path');

function countLinesInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    return lines.length;
  } catch (error) {
    return 0;
  }
}

function findAndDelete500DealsFiles(dir) {
  let deletedCount = 0;
  let totalFiles = 0;
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('_deals.csv')) {
        totalFiles++;
        const lineCount = countLinesInFile(fullPath);
        
        if (lineCount === 500) {
          console.log(`🗑️  Deleting: ${fullPath} (${lineCount} lines)`);
          fs.unlinkSync(fullPath);
          deletedCount++;
        } else {
          console.log(`✅ Keeping: ${fullPath} (${lineCount} lines)`);
        }
      }
    }
  }
  
  console.log('🔍 Scanning for files with exactly 500 deals...\n');
  scanDirectory(dir);
  
  console.log(`\n📊 Summary:`);
  console.log(`   📁 Total _deals.csv files found: ${totalFiles}`);
  console.log(`   🗑️  Files deleted (500 deals): ${deletedCount}`);
  console.log(`   ✅ Files kept: ${totalFiles - deletedCount}`);
}

// Run the script
const councilsPath = 'councils-with-folders';
if (fs.existsSync(councilsPath)) {
  findAndDelete500DealsFiles(councilsPath);
} else {
  console.log('❌ councils-with-folders directory not found!');
}
