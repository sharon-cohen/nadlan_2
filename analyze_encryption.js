const fs = require("fs");

/**
 * Analyze the working encrypted string to understand its structure
 */

function analyzeEncryption() {
  console.log("🔍 Analyzing the working encrypted string...\n");

  // The working encrypted string from the example
  const workingEncryptedString =
    "oQ5uOZlDM8AFFEYP6lO_HuxJKbjhYr1P0thDxjBevJp.0nIslmL292Zu4WYsRWYu5yd3dnI6IibpFWbvRmIsUDNwYDNycTN3EjOiAHelJCLiITZllTNhFTN0YDOh1COhVWOtIjZ1QTLxQ2Yi1yN5QWM4EGOiJiOi4WZr9GdiwiIwgzMMdjUNJnaRlEbydWL1o1Zt82Z5knc1I0d5JUZhlGWnFGeNNkd6hkbO5CMY5EMBpmTwkkeOFzYU1kNJN0Y0YVbJNXSDJGc1kGZ2RWbMVnRHJ2aG1mY1N2MkNjSp9Ua0cVYoFjMitmS5VmL5oUaOFTS6VVSKl2TpN2RihmS5VmI6IyazJCLi42dvR2XlRXYExWYlRmI6IiclRmcv9VZwlHdiwSM6IiclJWb152XoNGdlZmIsICZJR2bvhmcvJGanlWZuJiOiUWbh52XlNXYiJCLiQjNyATMyUjNiojIkl2XlNXYiJye.9JiN1IzUIJiOicGbhJye";

  console.log("📊 Basic Analysis:");
  console.log(`   Length: ${workingEncryptedString.length} characters`);
  console.log(`   Contains dots: ${workingEncryptedString.includes(".")}`);
  console.log(
    `   Number of dots: ${(workingEncryptedString.match(/\./g) || []).length}`
  );

  // Split by dots
  const parts = workingEncryptedString.split(".");
  console.log(`   Number of parts: ${parts.length}`);

  parts.forEach((part, index) => {
    console.log(`   Part ${index + 1}: ${part.length} chars`);
  });

  console.log("\n🔍 Character Analysis:");
  const chars = {};
  for (let char of workingEncryptedString) {
    chars[char] = (chars[char] || 0) + 1;
  }

  const sortedChars = Object.entries(chars).sort((a, b) => b[1] - a[1]);
  console.log("   Most common characters:");
  sortedChars.slice(0, 10).forEach(([char, count]) => {
    console.log(`     '${char}': ${count} times`);
  });

  console.log("\n🔍 Base64 Analysis:");
  // Check if it looks like base64
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  console.log(
    `   Looks like base64: ${base64Regex.test(workingEncryptedString)}`
  );

  // Try to decode each part as base64
  parts.forEach((part, index) => {
    try {
      const decoded = Buffer.from(part, "base64").toString("utf-8");
      console.log(
        `   Part ${index + 1} decoded: ${decoded.substring(0, 100)}${
          decoded.length > 100 ? "..." : ""
        }`
      );
    } catch (error) {
      console.log(`   Part ${index + 1}: Not valid base64`);
    }
  });

  console.log("\n🔍 Pattern Analysis:");
  // Look for patterns that might indicate neighborhood ID
  const neighborhoodId = "65210264"; // From the working example
  console.log(`   Looking for neighborhood ID pattern: ${neighborhoodId}`);

  // Check if the neighborhood ID appears in the string
  if (workingEncryptedString.includes(neighborhoodId)) {
    console.log(`   ✅ Neighborhood ID found in encrypted string!`);
  } else {
    console.log(`   ❌ Neighborhood ID not found in encrypted string`);
  }

  // Try to find the neighborhood ID in different encodings
  const base64NeighborhoodId = Buffer.from(neighborhoodId).toString("base64");
  console.log(`   Neighborhood ID in base64: ${base64NeighborhoodId}`);

  if (workingEncryptedString.includes(base64NeighborhoodId)) {
    console.log(`   ✅ Base64 neighborhood ID found in encrypted string!`);
  } else {
    console.log(`   ❌ Base64 neighborhood ID not found in encrypted string`);
  }

  console.log("\n🔍 JWT Analysis:");
  // The JWT token from the example
  const jwtToken =
    "eyJhbGciOiJIUzI1NiJ9.eyJkb21haW4iOiJ3d3cubmFkbGFuLmdvdi5pbCIsImV4cCI6MTc1NzI0NjA0NX0.NnHzvCMxagXiaeBywB5ry9go-gZ5-grlIQjrMR7L380";
  console.log(`   JWT token: ${jwtToken}`);

  if (workingEncryptedString.includes(jwtToken)) {
    console.log(`   ✅ JWT token found in encrypted string!`);
  } else {
    console.log(`   ❌ JWT token not found in encrypted string`);
  }

  // Try to decode JWT payload
  try {
    const jwtParts = jwtToken.split(".");
    const payload = JSON.parse(
      Buffer.from(jwtParts[1], "base64").toString("utf-8")
    );
    console.log(`   JWT payload:`, payload);
  } catch (error) {
    console.log(`   ❌ Could not decode JWT payload: ${error.message}`);
  }
}

analyzeEncryption();


