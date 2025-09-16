const fs = require("fs");
const crypto = require("crypto");

/**
 * Try to reverse engineer the encryption method
 * by analyzing patterns and trying different approaches
 */

function reverseEngineerEncryption() {
  console.log("🔍 Reverse Engineering Encryption Method...\n");

  // The working encrypted string from Beitar (ID: 65210264)
  const workingEncryptedString =
    "oQ5uOZlDM8AFFEYP6lO_HuxJKbjhYr1P0thDxjBevJp.0nIslmL292Zu4WYsRWYu5yd3dnI6IibpFWbvRmIsUDNwYDNycTN3EjOiAHelJCLiITZllTNhFTN0YDOh1COhVWOtIjZ1QTLxQ2Yi1yN5QWM4EGOiJiOi4WZr9GdiwiIwgzMMdjUNJnaRlEbydWL1o1Zt82Z5knc1I0d5JUZhlGWnFGeNNkd6hkbO5CMY5EMBpmTwkkeOFzYU1kNJN0Y0YVbJNXSDJGc1kGZ2RWbMVnRHJ2aG1mY1N2MkNjSp9Ua0cVYoFjMitmS5VmL5oUaOFTS6VVSKl2TpN2RihmS5VmI6IyazJCLi42dvR2XlRXYExWYlRmI6IiclRmcv9VZwlHdiwSM6IiclJWb152XoNGdlZmIsICZJR2bvhmcvJGanlWZuJiOiUWbh52XlNXYiJCLiQjNyATMyUjNiojIkl2XlNXYiJye.9JiN1IzUIJiOicGbhJye";

  // The neighborhood ID from the working example
  const workingNeighborhoodId = "65210264";

  // Test neighborhood IDs from Kiryat Yam
  const testNeighborhoodIds = [
    "65210847", // קריית ים ד
    "65210848", // סביוני ים
    "65210849", // אלמוגים
  ];

  console.log("📊 Analyzing the working encrypted string...");
  console.log(`   Working neighborhood ID: ${workingNeighborhoodId}`);
  console.log(`   Encrypted string length: ${workingEncryptedString.length}`);

  // Split the encrypted string into parts
  const parts = workingEncryptedString.split(".");
  console.log(`   Number of parts: ${parts.length}`);

  // Try different encryption approaches
  console.log("\n🔐 Testing different encryption approaches...");

  // Approach 1: Try to find if the neighborhood ID is embedded in different ways
  console.log("\n1️⃣ Testing neighborhood ID embedding...");

  // Try different encodings of the neighborhood ID
  const neighborhoodIdEncodings = {
    raw: workingNeighborhoodId,
    base64: Buffer.from(workingNeighborhoodId).toString("base64"),
    hex: Buffer.from(workingNeighborhoodId).toString("hex"),
    url_encoded: encodeURIComponent(workingNeighborhoodId),
    json_string: JSON.stringify(workingNeighborhoodId),
    padded_8: workingNeighborhoodId.padStart(8, "0"),
    padded_10: workingNeighborhoodId.padStart(10, "0"),
  };

  for (const [encoding, value] of Object.entries(neighborhoodIdEncodings)) {
    if (workingEncryptedString.includes(value)) {
      console.log(`   ✅ Found ${encoding} encoding: ${value}`);
    } else {
      console.log(`   ❌ ${encoding} encoding not found: ${value}`);
    }
  }

  // Approach 2: Try to reverse engineer the payload structure
  console.log("\n2️⃣ Testing payload structure...");

  // The original payload structure from the example
  const originalPayload = {
    e: {
      base_id: "65210264",
      base_name: "neighborhoodId",
      fetch_number: 1,
      type_order: "dealDate_down",
      sk: "eyJhbGciOiJIUzI1NiJ9.eyJkb21haW4iOiJ3d3cubmFkbGFuLmdvdi5pbCIsImV4cCI6MTc1NzI0NjA0NX0.NnHzvCMxagXiaeBywB5ry9go-gZ5-grlIQjrMR7L380",
      token: "b8a81d97-bcd1-45f2-9ea8-a86451a59ee2",
    },
    t: {},
    s: {
      "##": workingEncryptedString,
    },
  };

  console.log("   Original payload structure:");
  console.log(JSON.stringify(originalPayload, null, 2));

  // Approach 3: Try to find patterns in the encrypted string
  console.log("\n3️⃣ Analyzing string patterns...");

  // Look for repeated patterns
  const patternAnalysis = {};
  for (let i = 0; i < workingEncryptedString.length - 2; i++) {
    const pattern = workingEncryptedString.substring(i, i + 3);
    patternAnalysis[pattern] = (patternAnalysis[pattern] || 0) + 1;
  }

  const repeatedPatterns = Object.entries(patternAnalysis)
    .filter(([pattern, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log("   Most repeated 3-character patterns:");
  repeatedPatterns.forEach(([pattern, count]) => {
    console.log(`     "${pattern}": ${count} times`);
  });

  // Approach 4: Try to decode each part separately
  console.log("\n4️⃣ Testing individual part decoding...");

  parts.forEach((part, index) => {
    console.log(
      `   Part ${index + 1} (${part.length} chars): ${part.substring(0, 20)}...`
    );

    // Try different decoding methods
    try {
      // Base64 decode
      const base64Decoded = Buffer.from(part, "base64").toString("utf-8");
      console.log(`     Base64 decoded: ${base64Decoded.substring(0, 50)}...`);
    } catch (e) {
      console.log(`     Base64 decode failed`);
    }

    try {
      // Hex decode
      const hexDecoded = Buffer.from(part, "hex").toString("utf-8");
      console.log(`     Hex decoded: ${hexDecoded.substring(0, 50)}...`);
    } catch (e) {
      console.log(`     Hex decode failed`);
    }
  });

  // Approach 5: Try to generate encrypted strings for test neighborhood IDs
  console.log("\n5️⃣ Testing encryption generation...");

  // Try simple substitution
  console.log("   Testing simple neighborhood ID substitution...");
  for (const testId of testNeighborhoodIds) {
    // Try replacing the neighborhood ID in the original payload
    const testPayload = JSON.stringify({
      ...originalPayload,
      e: {
        ...originalPayload.e,
        base_id: testId,
      },
    });

    console.log(`   Test payload for ID ${testId}:`);
    console.log(`     Length: ${testPayload.length}`);
    console.log(`     Preview: ${testPayload.substring(0, 100)}...`);
  }

  // Approach 6: Look for encryption keys or algorithms
  console.log("\n6️⃣ Testing common encryption methods...");

  // Try to see if it's a simple cipher
  const commonKeys = [
    "nadlan",
    "www.nadlan.gov.il",
    "secret",
    "key",
    "password",
    "123456",
    "nadlan123",
    "gov.il",
    "realestate",
    "deals",
  ];

  for (const key of commonKeys) {
    try {
      // Try AES decryption with different modes
      const keyBuffer = crypto.createHash("md5").update(key).digest();

      // Try to decrypt the first part
      const cipher = crypto.createDecipher("aes-128-cbc", key);
      let decrypted = cipher.update(parts[0], "base64", "utf8");
      decrypted += cipher.final("utf8");

      if (decrypted.includes(workingNeighborhoodId)) {
        console.log(`   ✅ Found potential key: "${key}"`);
        console.log(`     Decrypted: ${decrypted.substring(0, 100)}...`);
      }
    } catch (e) {
      // Ignore decryption errors
    }
  }

  console.log("\n🔍 Analysis complete!");
  console.log("💡 Next steps:");
  console.log("   1. Look for more patterns in the JavaScript bundle");
  console.log("   2. Try to find the encryption function in the source code");
  console.log(
    "   3. Consider alternative approaches (browser automation, etc.)"
  );
}

reverseEngineerEncryption();


