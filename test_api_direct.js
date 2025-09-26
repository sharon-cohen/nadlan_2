const https = require("https");
const fs = require("fs");

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
          const zlib = require("zlib");
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers["content-encoding"] === "deflate") {
          const zlib = require("zlib");
          stream = res.pipe(zlib.createInflate());
        } else if (res.headers["content-encoding"] === "br") {
          const zlib = require("zlib");
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        stream.on("data", (chunk) => {
          data += chunk;
        });
        stream.on("end", () => {
          try {
            // Clean the data
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

            console.log(`Response preview: ${cleanData.substring(0, 200)}...`);

            const jsonData = JSON.parse(cleanData);
            resolve(jsonData);
          } catch (error) {
            console.log(`Raw response: ${data.substring(0, 500)}`);
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      })
      .on("error", (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });
  });
}

async function testAPIDirect() {
  try {
    // Test different API endpoints
    const endpoints = [
      "https://d30nq1hiio0r3z.cloudfront.net/api/pages/neighborhood/deals/65211094.json",
      "https://www.nadlan.gov.il/api/neighborhood/65211094/deals",
      "https://d30nq1hiio0r3z.cloudfront.net/api/neighborhood/65211094/deals.json",
      "https://www.nadlan.gov.il/api/pages/neighborhood/deals/65211094.json",
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing endpoint: ${endpoint}`);
        const data = await fetchJSON(endpoint);
        console.log("✅ Success! Data structure:", Object.keys(data));

        // Save successful response
        fs.writeFileSync(
          `api_response_65211094.json`,
          JSON.stringify(data, null, 2)
        );
        console.log("💾 Saved response to api_response_65211094.json");
        break;
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

testAPIDirect();

















