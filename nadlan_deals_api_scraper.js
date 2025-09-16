#!/usr/bin/env node
/**
 * Nadlan Deals API Scraper with JWT Authentication
 *
 * This script collects deals data from the Nadlan API endpoint:
 * https://x4006fhmy5.execute-api.il-central-1.amazonaws.com/api/deal
 *
 * The API expects a POST request with a JWT token parameter and returns
 * gzip-compressed base64-encoded data that needs to be decoded.
 *
 * JWT Token Generation:
 * - Uses the same secret key and algorithm as the original Nadlan website
 * - Generates tokens with domain and expiration claims
 * - Replaces the previous "PLACE_HOLDER" approach with proper authentication
 */

const https = require("https");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

class NadlanDealsAPIScraper {
  constructor() {
    this.apiUrl =
      "https://x4006fhmy5.execute-api.il-central-1.amazonaws.com/api/deal";
    this.parameterName = "fetch_number";
    this.placeholderValue = "PLACE_HOLDER";

    // JWT configuration based on the analyzed code
    this.jwtSecret = "90c3e620192348f1bd46fcd9138c3c68";
    this.jwtDomain = "www.nadlan.gov.il";
    this.jwtAlgorithm = "HS256";

    // Headers matching the original API request structure
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json", // Changed back to JSON since we're sending JSON payload
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
    };
  }

  /**
   * Generate JWT token for payload (matching mixin_generateTokenForPayload)
   * @param {Object} payload - The payload to generate token for
   * @returns {Object} - The payload with JWT token added
   */
  generateJWTTokenForPayload(payload) {
    try {
      console.log("🔐 Generating JWT token for payload...");
      console.log(`   📋 Original payload:`, JSON.stringify(payload, null, 2));

      // Create JWT token with domain and expiration
      const currentTime = Math.floor(Date.now() / 1000);
      const gf = 120; // Time offset from the original code
      const expirationTime = currentTime + gf;

      const jwtPayload = {
        domain: this.jwtDomain,
        exp: expirationTime,
      };

      const token = jwt.sign(jwtPayload, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
      });

      // Add the JWT token to the payload
      const payloadWithToken = {
        ...payload,
        token: token,
      };

      console.log(`   ✅ JWT token generated and added to payload`);
      console.log(`   📊 Token length: ${token.length} characters`);
      console.log(
        `   📋 Final payload:`,
        JSON.stringify(payloadWithToken, null, 2)
      );

      return payloadWithToken;
    } catch (error) {
      console.error(
        "❌ Error generating JWT token for payload:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Generate JWT token based on the analyzed Nadlan website code
   * @returns {string} - The generated JWT token
   */
  generateJWTToken() {
    try {
      console.log("🔐 Generating JWT token...");

      // Create payload exactly like the original mixin_generateToken function
      const currentTime = Math.floor(Date.now() / 1000);
      const gf = 120; // Time offset from the original code
      const expirationTime = currentTime + gf; // Current time + 120 seconds

      const payload = {
        domain: this.jwtDomain,
        exp: expirationTime,
      };

      // Generate JWT token using the same secret and algorithm
      const token = jwt.sign(payload, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
      });

      console.log(`   ✅ JWT token generated successfully`);
      console.log(`   📊 Token length: ${token.length} characters`);
      console.log(`   📋 Payload:`, JSON.stringify(payload, null, 2));
      console.log(
        `   ⏰ Expires at: ${new Date(expirationTime * 1000).toISOString()}`
      );

      return token;
    } catch (error) {
      console.error("❌ Error generating JWT token:", error.message);
      throw error;
    }
  }

  /**
   * Generate alternative JWT token with different parameters
   * @returns {string} - The generated JWT token
   */
  generateAlternativeJWTToken() {
    try {
      console.log("🔐 Generating alternative JWT token...");

      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + 86400; // 24 hours from now

      // Try a simpler payload structure
      const payload = {
        domain: this.jwtDomain,
        exp: expirationTime,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
      });

      console.log(`   ✅ Alternative JWT token generated successfully`);
      console.log(`   📊 Token length: ${token.length} characters`);
      console.log(`   📋 Payload:`, JSON.stringify(payload, null, 2));

      return token;
    } catch (error) {
      console.error(
        "❌ Error generating alternative JWT token:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Decode gzip-compressed base64 data
   * @param {string} base64Data - The base64 encoded gzip data
   * @returns {Promise<string>} - The decoded string
   */
  async decodeGzipBase64(base64Data) {
    try {
      console.log("🔓 Decoding gzip-compressed base64 data...");

      // Decode base64 to buffer
      const compressedBuffer = Buffer.from(base64Data, "base64");
      console.log(
        `   📊 Compressed data size: ${compressedBuffer.length} bytes`
      );

      // Decompress gzip
      const decompressedBuffer = await new Promise((resolve, reject) => {
        zlib.gunzip(compressedBuffer, (err, result) => {
          if (err) {
            reject(new Error(`Gzip decompression failed: ${err.message}`));
          } else {
            resolve(result);
          }
        });
      });

      console.log(
        `   📊 Decompressed data size: ${decompressedBuffer.length} bytes`
      );

      // Convert to string
      const decodedString = decompressedBuffer.toString("utf-8");
      console.log(
        `   ✅ Successfully decoded ${decodedString.length} characters`
      );

      return decodedString;
    } catch (error) {
      console.error("❌ Error decoding gzip base64 data:", error.message);
      throw error;
    }
  }

  /**
   * Make POST request with the exact encrypted string from the example
   * @returns {Promise<Object>} - The parsed response data
   */
  async fetchDealsDataWithExactEncryptedString() {
    return new Promise((resolve, reject) => {
      console.log(`🌐 Making POST request to: ${this.apiUrl}`);
      console.log(`   📝 Using exact encrypted string from example`);

      // Use the exact encrypted string from the provided example
      const exactEncryptedString =
        "oQ5uOZlDM8AFFEYP6lO_HuxJKbjhYr1P0thDxjBevJp.0nIslmL292Zu4WYsRWYu5yd3dnI6IibpFWbvRmIsUDNwYDNycTN3EjOiAHelJCLiITZllTNhFTN0YDOh1COhVWOtIjZ1QTLxQ2Yi1yN5QWM4EGOiJiOi4WZr9GdiwiIwgzMMdjUNJnaRlEbydWL1o1Zt82Z5knc1I0d5JUZhlGWnFGeNNkd6hkbO5CMY5EMBpmTwkkeOFzYU1kNJN0Y0YVbJNXSDJGc1kGZ2RWbMVnRHJ2aG1mY1N2MkNjSp9Ua0cVYoFjMitmS5VmL5oUaOFTS6VVSKl2TpN2RihmS5VmI6IyazJCLi42dvR2XlRXYExWYlRmI6IiclRmcv9VZwlHdiwSM6IiclJWb152XoNGdlZmIsICZJR2bvhmcvJGanlWZuJiOiUWbh52XlNXYiJCLiQjNyATMyUjNiojIkl2XlNXYiJye.9JiN1IzUIJiOicGbhJye";

      const requestBody = JSON.stringify({
        fetch_number: 1,
        "##": exactEncryptedString,
      });

      console.log(`   📦 Request body: ${requestBody}`);

      // Parse the URL
      const url = new URL(this.apiUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        console.log(`   📡 Response status: ${res.statusCode}`);
        console.log(`   📡 Response headers:`, res.headers);

        let responseData = "";

        // Handle different content encodings
        let stream = res;
        if (res.headers["content-encoding"] === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers["content-encoding"] === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (res.headers["content-encoding"] === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        stream.on("data", (chunk) => {
          responseData += chunk;
        });

        stream.on("end", async () => {
          try {
            console.log(
              `   📊 Raw response length: ${responseData.length} characters`
            );
            console.log(
              `   📄 Response preview: ${responseData.substring(0, 200)}...`
            );

            if (res.statusCode !== 200) {
              throw new Error(`HTTP ${res.statusCode}: ${responseData}`);
            }

            // Try to parse as JSON first
            let parsedData;
            try {
              parsedData = JSON.parse(responseData);
              console.log("   ✅ Response is valid JSON");
            } catch (jsonError) {
              console.log(
                "   📄 Response is not JSON, treating as base64 data"
              );

              // Clean the response data
              let cleanData = responseData.trim();

              // Remove any quotes or extra characters
              cleanData = cleanData.replace(/^["']|["']$/g, "");

              // Try to decode as gzip base64
              const decodedData = await this.decodeGzipBase64(cleanData);

              // Try to parse the decoded data as JSON
              try {
                parsedData = JSON.parse(decodedData);
                console.log("   ✅ Decoded data is valid JSON");
              } catch (parseError) {
                console.log(
                  "   📄 Decoded data is not JSON, returning as string"
                );
                parsedData = {
                  raw_decoded_data: decodedData,
                  original_base64: cleanData,
                };
              }
            }

            resolve(parsedData);
          } catch (error) {
            console.error("❌ Error processing response:", error.message);
            reject(error);
          }
        });

        stream.on("error", (error) => {
          console.error("❌ Stream error:", error.message);
          reject(error);
        });
      });

      req.on("error", (error) => {
        console.error("❌ Request error:", error.message);
        reject(error);
      });

      // Write the request body
      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Make POST request with encrypted payload structure (matching the provided example)
   * @param {Object} payload - The payload to send
   * @returns {Promise<Object>} - The parsed response data
   */
  async fetchDealsDataWithEncryptedPayload(payload) {
    return new Promise((resolve, reject) => {
      console.log(`🌐 Making POST request to: ${this.apiUrl}`);
      console.log(`   📝 Using encrypted payload structure`);

      // Create the request body structure - use the encrypted payload as fetch_number value
      // Based on the original example, the "##" parameter contains the encrypted payload
      const encryptedPayload = JSON.stringify(payload);
      const requestBody = JSON.stringify({
        fetch_number: payload.fetch_number || 1,
        "##": encryptedPayload,
      });

      console.log(`   📦 Request body: ${requestBody}`);

      // Parse the URL
      const url = new URL(this.apiUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        console.log(`   📡 Response status: ${res.statusCode}`);
        console.log(`   📡 Response headers:`, res.headers);

        let responseData = "";

        // Handle different content encodings
        let stream = res;
        if (res.headers["content-encoding"] === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers["content-encoding"] === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (res.headers["content-encoding"] === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        stream.on("data", (chunk) => {
          responseData += chunk;
        });

        stream.on("end", async () => {
          try {
            console.log(
              `   📊 Raw response length: ${responseData.length} characters`
            );
            console.log(
              `   📄 Response preview: ${responseData.substring(0, 200)}...`
            );

            if (res.statusCode !== 200) {
              throw new Error(`HTTP ${res.statusCode}: ${responseData}`);
            }

            // Try to parse as JSON first
            let parsedData;
            try {
              parsedData = JSON.parse(responseData);
              console.log("   ✅ Response is valid JSON");
            } catch (jsonError) {
              console.log(
                "   📄 Response is not JSON, treating as base64 data"
              );

              // Clean the response data
              let cleanData = responseData.trim();

              // Remove any quotes or extra characters
              cleanData = cleanData.replace(/^["']|["']$/g, "");

              // Try to decode as gzip base64
              const decodedData = await this.decodeGzipBase64(cleanData);

              // Try to parse the decoded data as JSON
              try {
                parsedData = JSON.parse(decodedData);
                console.log("   ✅ Decoded data is valid JSON");
              } catch (parseError) {
                console.log(
                  "   📄 Decoded data is not JSON, returning as string"
                );
                parsedData = {
                  raw_decoded_data: decodedData,
                  original_base64: cleanData,
                };
              }
            }

            resolve(parsedData);
          } catch (error) {
            console.error("❌ Error processing response:", error.message);
            reject(error);
          }
        });

        stream.on("error", (error) => {
          console.error("❌ Stream error:", error.message);
          reject(error);
        });
      });

      req.on("error", (error) => {
        console.error("❌ Request error:", error.message);
        reject(error);
      });

      // Write the request body
      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Make POST request to the API endpoint (matching original _makeApiRequest structure)
   * @param {Object} payload - The payload to send (defaults to basic payload)
   * @returns {Promise<Object>} - The parsed response data
   */
  async fetchDealsData(payload = null) {
    // Create default payload if none provided
    if (!payload) {
      payload = {
        // Add default payload structure here
        // This might need to be adjusted based on what the API expects
      };
    }

    // Generate JWT token for the payload
    const payloadWithToken = this.generateJWTTokenForPayload(payload);

    return new Promise((resolve, reject) => {
      console.log(`🌐 Making POST request to: ${this.apiUrl}`);
      console.log(`   📝 Using payload with JWT token`);

      // Prepare the request body - send the payload as JSON
      const requestBody = JSON.stringify(payloadWithToken);

      console.log(`   📦 Request body: ${requestBody}`);

      // Parse the URL
      const url = new URL(this.apiUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        console.log(`   📡 Response status: ${res.statusCode}`);
        console.log(`   📡 Response headers:`, res.headers);

        let responseData = "";

        // Handle different content encodings
        let stream = res;
        if (res.headers["content-encoding"] === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers["content-encoding"] === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (res.headers["content-encoding"] === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        stream.on("data", (chunk) => {
          responseData += chunk;
        });

        stream.on("end", async () => {
          try {
            console.log(
              `   📊 Raw response length: ${responseData.length} characters`
            );
            console.log(
              `   📄 Response preview: ${responseData.substring(0, 200)}...`
            );

            if (res.statusCode !== 200) {
              throw new Error(`HTTP ${res.statusCode}: ${responseData}`);
            }

            // Try to parse as JSON first
            let parsedData;
            try {
              parsedData = JSON.parse(responseData);
              console.log("   ✅ Response is valid JSON");
            } catch (jsonError) {
              console.log(
                "   📄 Response is not JSON, treating as base64 data"
              );

              // Clean the response data
              let cleanData = responseData.trim();

              // Remove any quotes or extra characters
              cleanData = cleanData.replace(/^["']|["']$/g, "");

              // Try to decode as gzip base64
              const decodedData = await this.decodeGzipBase64(cleanData);

              // Try to parse the decoded data as JSON
              try {
                parsedData = JSON.parse(decodedData);
                console.log("   ✅ Decoded data is valid JSON");
              } catch (parseError) {
                console.log(
                  "   📄 Decoded data is not JSON, returning as string"
                );
                parsedData = {
                  raw_decoded_data: decodedData,
                  original_base64: cleanData,
                };
              }
            }

            resolve(parsedData);
          } catch (error) {
            console.error("❌ Error processing response:", error.message);
            reject(error);
          }
        });

        stream.on("error", (error) => {
          console.error("❌ Stream error:", error.message);
          reject(error);
        });
      });

      req.on("error", (error) => {
        console.error("❌ Request error:", error.message);
        reject(error);
      });

      // Write the request body
      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Save the response data to a file
   * @param {Object} data - The response data
   * @param {string} filename - The filename to save to
   */
  saveResponse(data, filename = "nadlan_deals_response.json") {
    try {
      const filepath = path.join(__dirname, filename);
      const jsonString = JSON.stringify(data, null, 2);

      fs.writeFileSync(filepath, jsonString, "utf-8");
      console.log(`💾 Response saved to: ${filepath}`);
      console.log(`   📊 File size: ${fs.statSync(filepath).size} bytes`);
    } catch (error) {
      console.error("❌ Error saving response:", error.message);
    }
  }

  /**
   * Test the API with the correct structure (matching the provided example)
   */
  async testWithCorrectAPIStructure() {
    try {
      console.log(
        "🧪 Testing API with correct structure (matching provided example)...\n"
      );

      // Test 1: Using the exact encrypted string from the example
      console.log("🔹 Test 1: Exact encrypted string from example");
      const responseData1 = await this.fetchDealsDataWithExactEncryptedString();
      console.log(`   📊 Response 1: ${JSON.stringify(responseData1)}\n`);

      // Save the successful response
      this.saveResponse(responseData1, "nadlan_deals_successful_response.json");

      // Test 2: Try with our generated JWT token for neighborhood 65210646
      console.log(
        "🔹 Test 2: With our generated JWT token for neighborhood 65210646 (נווה מדבר)"
      );
      const ourJwtToken = this.generateJWTToken();
      const payloadWithOurToken = {
        base_id: "65210646",
        base_name: "neighborhoodId",
        fetch_number: 1,
        type_order: "dealDate_down",
        sk: ourJwtToken,
        token: "b8a81d97-bcd1-45f2-9ea8-a86451a59ee2",
      };
      const responseData2 = await this.fetchDealsDataWithEncryptedPayload(
        payloadWithOurToken
      );
      console.log(`   📊 Response 2: ${JSON.stringify(responseData2)}\n`);

      // Test 3: Try with different neighborhood ID (keeping original test)
      console.log("🔹 Test 3: Different neighborhood ID (original test)");
      const differentNeighborhoodPayload = {
        base_id: "1000",
        base_name: "neighborhoodId",
        fetch_number: 1,
        type_order: "dealDate_down",
        sk: ourJwtToken,
        token: "b8a81d97-bcd1-45f2-9ea8-a86451a59ee2",
      };
      const responseData3 = await this.fetchDealsDataWithEncryptedPayload(
        differentNeighborhoodPayload
      );
      console.log(`   📊 Response 3: ${JSON.stringify(responseData3)}\n`);

      return { responseData1, responseData2, responseData3 };
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test the API with different JWT token approaches
   */
  async testWithDifferentJWTTokens() {
    try {
      console.log("🧪 Testing API with different JWT token approaches...\n");

      // Test 1: Original JWT token
      console.log("🔹 Test 1: Original JWT token");
      const responseData1 = await this.fetchDealsData();
      console.log(`   📊 Response 1: ${JSON.stringify(responseData1)}\n`);

      // Test 2: Alternative JWT token
      console.log("🔹 Test 2: Alternative JWT token");
      const altToken = this.generateAlternativeJWTToken();
      const responseData2 = await this.fetchDealsData(altToken);
      console.log(`   📊 Response 2: ${JSON.stringify(responseData2)}\n`);

      // Test 3: Try with placeholder to see if it's a JWT issue
      console.log("🔹 Test 3: Original placeholder");
      const responseData3 = await this.fetchDealsData(this.placeholderValue);
      console.log(`   📊 Response 3: ${JSON.stringify(responseData3)}\n`);

      return { responseData1, responseData2, responseData3 };
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test the API with JWT token authentication
   */
  async testWithJWTToken() {
    try {
      console.log("🧪 Testing API with JWT token authentication...\n");

      const responseData = await this.fetchDealsData();

      console.log("\n📊 Response Data Structure:");
      if (typeof responseData === "object" && responseData !== null) {
        console.log(`   🔑 Keys: ${Object.keys(responseData).join(", ")}`);

        // Show sample data
        for (const [key, value] of Object.entries(responseData)) {
          if (typeof value === "string") {
            console.log(
              `   📝 ${key}: "${value.substring(0, 100)}${
                value.length > 100 ? "..." : ""
              }"`
            );
          } else if (Array.isArray(value)) {
            console.log(`   📋 ${key}: Array with ${value.length} items`);
          } else if (typeof value === "object") {
            console.log(
              `   📦 ${key}: Object with keys: ${Object.keys(value).join(", ")}`
            );
          } else {
            console.log(`   🔢 ${key}: ${value}`);
          }
        }
      } else {
        console.log(`   📄 Response type: ${typeof responseData}`);
        console.log(
          `   📄 Response: ${String(responseData).substring(0, 200)}...`
        );
      }

      // Save the response
      this.saveResponse(responseData, "nadlan_deals_jwt_response.json");

      return responseData;
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test the API with the placeholder parameter (legacy method)
   */
  async testWithPlaceholder() {
    try {
      console.log("🧪 Testing API with placeholder parameter...\n");

      const responseData = await this.fetchDealsData(this.placeholderValue);

      console.log("\n📊 Response Data Structure:");
      if (typeof responseData === "object" && responseData !== null) {
        console.log(`   🔑 Keys: ${Object.keys(responseData).join(", ")}`);

        // Show sample data
        for (const [key, value] of Object.entries(responseData)) {
          if (typeof value === "string") {
            console.log(
              `   📝 ${key}: "${value.substring(0, 100)}${
                value.length > 100 ? "..." : ""
              }"`
            );
          } else if (Array.isArray(value)) {
            console.log(`   📋 ${key}: Array with ${value.length} items`);
          } else if (typeof value === "object") {
            console.log(
              `   📦 ${key}: Object with keys: ${Object.keys(value).join(", ")}`
            );
          } else {
            console.log(`   🔢 ${key}: ${value}`);
          }
        }
      } else {
        console.log(`   📄 Response type: ${typeof responseData}`);
        console.log(
          `   📄 Response: ${String(responseData).substring(0, 200)}...`
        );
      }

      // Save the response
      this.saveResponse(responseData, "nadlan_deals_placeholder_response.json");

      return responseData;
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test the API with a custom parameter value
   * @param {string} parameterValue - The custom parameter value
   */
  async testWithCustomParameter(parameterValue) {
    try {
      console.log(
        `🧪 Testing API with custom parameter: "${parameterValue}"\n`
      );

      const responseData = await this.fetchDealsData(parameterValue);

      console.log("\n📊 Response Data Structure:");
      if (typeof responseData === "object" && responseData !== null) {
        console.log(`   🔑 Keys: ${Object.keys(responseData).join(", ")}`);
      } else {
        console.log(`   📄 Response type: ${typeof responseData}`);
      }

      // Save the response with a custom filename
      const filename = `nadlan_deals_${parameterValue.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_response.json`;
      this.saveResponse(responseData, filename);

      return responseData;
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🏠 Nadlan Deals API Scraper");
  console.log("============================\n");

  const scraper = new NadlanDealsAPIScraper();

  try {
    // Test with correct API structure (matching original code)
    await scraper.testWithCorrectAPIStructure();

    console.log("\n✨ API test completed successfully!");
    console.log("📁 Check the generated JSON files for the response data.");
  } catch (error) {
    console.error("\n💥 Fatal error:", error.message);
    process.exit(1);
  }
}

// Export the class for use in other modules
module.exports = NadlanDealsAPIScraper;

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}
