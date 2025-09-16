const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

// Function to make HTTPS request with proper headers
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.nadlan.gov.il/",
        Origin: "https://www.nadlan.gov.il",
        Connection: "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";

        // Handle gzip compression
        let stream = res;
        if (res.headers["content-encoding"] === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers["content-encoding"] === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (res.headers["content-encoding"] === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        stream.on("data", (chunk) => {
          data += chunk;
        });
        stream.on("end", () => {
          try {
            // Clean the data - remove any BOM or extra characters
            let cleanData = data.trim();

            // Remove BOM if present
            if (cleanData.charCodeAt(0) === 0xfeff) {
              cleanData = cleanData.slice(1);
            }

            // Remove any leading/trailing whitespace and control characters
            cleanData = cleanData.replace(
              /^[\s\uFEFF\x00-\x1F\x7F-\x9F]+|[\s\uFEFF\x00-\x1F\x7F-\x9F]+$/g,
              ""
            );

            // Check if response is HTML (error page)
            if (
              cleanData.startsWith("<!DOCTYPE") ||
              cleanData.startsWith("<html")
            ) {
              reject(
                new Error(`Server returned HTML instead of JSON for ${url}`)
              );
              return;
            }

            // Debug: log first 200 characters of response
            console.log(
              `  🔍 Response preview: ${cleanData.substring(0, 200)}...`
            );

            const jsonData = JSON.parse(cleanData);
            resolve(jsonData);
          } catch (error) {
            console.log(`  🔍 Raw response: ${data.substring(0, 500)}`);
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      })
      .on("error", (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });
  });
}

// Function to delay execution
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractNeighborhoods() {
  try {
    // Read the cities CSV file
    const csvPath = "all_city.csv";
    const csvContent = fs.readFileSync(csvPath, "utf8");

    // Parse CSV content
    const lines = csvContent.split("\n");
    const cities = [];

    // Skip header line and process each city
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Parse CSV line - split by comma and handle quoted fields
        const parts = line.split(",");
        if (parts.length >= 2) {
          const id = parts[0].replace(/"/g, "");
          const name = parts[1].replace(/"/g, "");
          cities.push({ id, name });
        }
      }
    }

    console.log(`Found ${cities.length} cities to process`);

    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process each city
    for (const city of cities) {
      try {
        console.log(
          `\n📍 Processing ${city.name} (ID: ${city.id}) - ${processed + 1}/${
            cities.length
          }`
        );

        // Create folder name (replace invalid characters)
        const folderName = city.name.replace(/[\/\\:*?"<>|]/g, "_");
        const folderPath = path.join("councils-with-folders", folderName);
        const csvFilePath = path.join(folderPath, `${city.name}_areas.csv`);

        // Check if file already exists
        if (fs.existsSync(csvFilePath)) {
          console.log(`  ⏭️  Skipping ${city.name} - file already exists`);
          processed++;
          successCount++;
          continue;
        }

        // Fetch the JSON data for this city
        const url = `https://d30nq1hiio0r3z.cloudfront.net/api/pages/settlement/buy/${city.id}.json`;
        const data = await fetchJSON(url);

        // Extract neighborhoods and streets
        const neighborhoods = data.otherNeighborhoods || [];
        const streets = data.otherSettlmentStreets || [];

        // Combine neighborhoods and streets
        const allAreas = [
          ...neighborhoods.map((n) => ({
            title: n.title,
            id: n.id,
            type: "Neighborhood",
          })),
          ...streets.map((s) => ({ title: s.title, id: s.id, type: "Street" })),
        ];

        if (allAreas.length > 0) {
          console.log(
            `  ✅ Found ${neighborhoods.length} neighborhoods and ${streets.length} streets`
          );

          // Create CSV content
          const csvHeader = "Area Name,Area ID,Type\n";
          const csvRows = allAreas
            .map((area) => `"${area.title}","${area.id}","${area.type}"`)
            .join("\n");

          const csvContent = csvHeader + csvRows;

          // Ensure folder exists
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
          }

          fs.writeFileSync(csvFilePath, csvContent, "utf8");

          console.log(`  💾 Saved to: ${csvFilePath}`);
          successCount++;
        } else {
          console.log(`  ⚠️  No neighborhoods or streets found`);
        }

        processed++;

        // Add delay to avoid overwhelming the server
        await delay(5000);
      } catch (error) {
        console.error(`  ❌ Error processing ${city.name}:`, error.message);
        errorCount++;
        processed++;

        // Add delay even on error
        await delay(5000);
      }
    }

    console.log(`\n🎉 Finished processing all cities!`);
    console.log(`📊 Summary:`);
    console.log(`  ✅ Successfully processed: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📁 Total cities: ${cities.length}`);
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

// Run the extraction
extractNeighborhoods();
