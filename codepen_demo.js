// 🛡️ reCAPTCHA Bypass Demo for CodePen
// Copy this code to CodePen and run it

console.log("🚀 Starting reCAPTCHA Bypass Demo...");

// ===== ADVANCED reCAPTCHA BYPASS TECHNIQUES =====

// 1. Mock grecaptcha - Override the global grecaptcha object
Object.defineProperty(window, "grecaptcha", {
  get: () => ({
    ready: (callback) => {
      console.log("🔄 Mock grecaptcha.ready called");
      setTimeout(callback, 100);
      return Promise.resolve();
    },
    execute: () => {
      console.log("🔄 Mock grecaptcha.execute called");
      return Promise.resolve("fake-token-12345");
    },
    render: (container, options) => {
      console.log("🔄 Mock grecaptcha.render called with options:", options);
      return "fake-widget-id-12345";
    },
    reset: () => {
      console.log("🔄 Mock grecaptcha.reset called");
    },
    getResponse: () => {
      console.log("🔄 Mock grecaptcha.getResponse called");
      return "fake-response-12345";
    },
  }),
});

// Also set it directly
window.grecaptcha = {
  ready: (callback) => {
    console.log("🔄 Direct grecaptcha.ready called");
    setTimeout(callback, 100);
    return Promise.resolve();
  },
  execute: () => {
    console.log("🔄 Direct grecaptcha.execute called");
    return Promise.resolve("fake-token-12345");
  },
  render: (container, options) => {
    console.log("🔄 Direct grecaptcha.render called");
    return "fake-widget-id-12345";
  },
  reset: () => {
    console.log("🔄 Direct grecaptcha.reset called");
  },
  getResponse: () => {
    console.log("🔄 Direct grecaptcha.getResponse called");
    return "fake-response-12345";
  },
};

// 2. Block reCAPTCHA scripts from being added to DOM
const originalAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function (child) {
  if (
    child.tagName === "SCRIPT" &&
    child.src &&
    child.src.includes("recaptcha")
  ) {
    console.log("🚫 Blocked reCAPTCHA script:", child.src);
    return child;
  }
  if (child.className && child.className.includes("g-recaptcha")) {
    console.log("🚫 Blocked reCAPTCHA element:", child.className);
    return child;
  }
  return originalAppendChild.call(this, child);
};

// 3. Block reCAPTCHA elements from being inserted
const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function (newNode, referenceNode) {
  if (
    newNode.tagName === "SCRIPT" &&
    newNode.src &&
    newNode.src.includes("recaptcha")
  ) {
    console.log("🚫 Blocked reCAPTCHA script insert:", newNode.src);
    return newNode;
  }
  if (newNode.className && newNode.className.includes("g-recaptcha")) {
    console.log("🚫 Blocked reCAPTCHA element insert:", newNode.className);
    return newNode;
  }
  return originalInsertBefore.call(this, newNode, referenceNode);
};

// 4. Override document.createElement to block reCAPTCHA elements
const originalCreateElement = document.createElement;
document.createElement = function (tagName, options) {
  const element = originalCreateElement.call(this, tagName, options);

  // Block reCAPTCHA iframes
  if (tagName.toLowerCase() === "iframe") {
    const originalSrc = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "src"
    );
    Object.defineProperty(element, "src", {
      get: function () {
        return this.getAttribute("src") || "";
      },
      set: function (value) {
        if (value && value.includes("recaptcha")) {
          console.log("🚫 Blocked reCAPTCHA iframe:", value);
          return;
        }
        this.setAttribute("src", value);
      },
    });
  }

  // Block reCAPTCHA divs
  if (tagName.toLowerCase() === "div") {
    const originalSetAttribute = element.setAttribute;
    element.setAttribute = function (name, value) {
      if (name === "class" && value && value.includes("g-recaptcha")) {
        console.log("🚫 Blocked reCAPTCHA div class:", value);
        return;
      }
      return originalSetAttribute.call(this, name, value);
    };
  }

  return element;
};

// 5. Mock canvas fingerprinting to look more human
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function () {
  const context = this.getContext("2d");
  if (context) {
    // Add some noise to make it look more human
    const imageData = context.getImageData(0, 0, this.width, this.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] += Math.floor(Math.random() * 3) - 1;
      imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
      imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
    }
    context.putImageData(imageData, 0, 0);
  }
  return originalToDataURL.apply(this, arguments);
};

// 6. Mock WebGL fingerprinting
const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function (parameter) {
  if (parameter === 37445) {
    // UNMASKED_VENDOR_WEBGL
    return "Intel Inc.";
  }
  if (parameter === 37446) {
    // UNMASKED_RENDERER_WEBGL
    return "Intel Iris OpenGL Engine";
  }
  return originalGetParameter.call(this, parameter);
};

// 7. Mock additional navigator properties
Object.defineProperty(navigator, "webdriver", {
  get: () => undefined,
});

Object.defineProperty(navigator, "platform", {
  get: () => "MacIntel",
});

Object.defineProperty(navigator, "vendor", {
  get: () => "Google Inc.",
});

// 8. Block reCAPTCHA network requests
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === "string" && url.includes("recaptcha")) {
    console.log("🚫 Blocked reCAPTCHA fetch request:", url);
    return Promise.resolve(new Response("{}", { status: 200 }));
  }
  return originalFetch.call(this, url, options);
};

// 9. Block reCAPTCHA XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
  if (typeof url === "string" && url.includes("recaptcha")) {
    console.log("🚫 Blocked reCAPTCHA XHR request:", url);
    return;
  }
  return originalXHROpen.call(this, method, url, async, user, password);
};

// 10. Remove existing reCAPTCHA elements
const removeRecaptchaElements = () => {
  const recaptchaElements = document.querySelectorAll(
    '.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'
  );
  recaptchaElements.forEach((element) => {
    console.log("🗑️ Removing reCAPTCHA element:", element);
    element.remove();
  });
};

// Run removal immediately
removeRecaptchaElements();

// 11. Watch for new reCAPTCHA elements and remove them
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        // Element node
        if (node.classList && node.classList.contains("g-recaptcha")) {
          console.log("🗑️ Removing new reCAPTCHA element:", node);
          node.remove();
        }
        if (
          node.tagName === "IFRAME" &&
          node.src &&
          node.src.includes("recaptcha")
        ) {
          console.log("🗑️ Removing new reCAPTCHA iframe:", node);
          node.remove();
        }
      }
    });
  });
});

// Start observing
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
} else {
  // Wait for body to be ready
  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

// ===== TESTING FUNCTIONS =====

// Function to test reCAPTCHA detection
function testRecaptchaDetection() {
  console.log("🧪 Testing reCAPTCHA detection...");

  const recaptchaPresent = !!(
    document.querySelector('iframe[src*="recaptcha"]') ||
    document.querySelector(".g-recaptcha") ||
    document.querySelector("#recaptcha") ||
    document.querySelector("[data-sitekey]") ||
    document.querySelector('iframe[title*="reCAPTCHA"]')
  );

  if (recaptchaPresent) {
    console.log("🚨 reCAPTCHA detected on page!");
    return false;
  } else {
    console.log("✅ No reCAPTCHA detected - bypass successful!");
    return true;
  }
}

// Function to test grecaptcha mock
function testGrecaptchaMock() {
  console.log("🧪 Testing grecaptcha mock...");

  try {
    if (window.grecaptcha) {
      console.log("✅ grecaptcha object exists");

      // Test ready
      window.grecaptcha.ready(() => {
        console.log("✅ grecaptcha.ready works");
      });

      // Test render
      const widgetId = window.grecaptcha.render("test-container", {});
      console.log("✅ grecaptcha.render works, widget ID:", widgetId);

      // Test getResponse
      const response = window.grecaptcha.getResponse();
      console.log("✅ grecaptcha.getResponse works, response:", response);

      // Test execute
      window.grecaptcha.execute().then((token) => {
        console.log("✅ grecaptcha.execute works, token:", token);
      });

      return true;
    } else {
      console.log("❌ grecaptcha object not found");
      return false;
    }
  } catch (error) {
    console.log("❌ Error testing grecaptcha mock:", error.message);
    return false;
  }
}

// Function to create a test reCAPTCHA element (to test blocking)
function createTestRecaptcha() {
  console.log("🧪 Creating test reCAPTCHA element...");

  // Try to create a reCAPTCHA div
  const recaptchaDiv = document.createElement("div");
  recaptchaDiv.className = "g-recaptcha";
  recaptchaDiv.setAttribute("data-sitekey", "test-sitekey");
  document.body.appendChild(recaptchaDiv);

  // Try to create a reCAPTCHA iframe
  const recaptchaIframe = document.createElement("iframe");
  recaptchaIframe.src = "https://www.google.com/recaptcha/api2/anchor";
  document.body.appendChild(recaptchaIframe);

  // Try to create a reCAPTCHA script
  const recaptchaScript = document.createElement("script");
  recaptchaScript.src = "https://www.google.com/recaptcha/api.js";
  document.head.appendChild(recaptchaScript);

  console.log("✅ Test reCAPTCHA elements created");
}

// ===== DEMO EXECUTION =====

console.log("🛡️ Advanced reCAPTCHA bypass techniques loaded");

// Wait a bit then run tests
setTimeout(() => {
  console.log("🚀 Running tests...");

  // Test 1: Detection
  const detectionResult = testRecaptchaDetection();

  // Test 2: Mock functionality
  const mockResult = testGrecaptchaMock();

  // Test 3: Create test elements
  createTestRecaptcha();

  // Test 4: Check if elements were blocked
  setTimeout(() => {
    const finalDetection = testRecaptchaDetection();

    console.log("📊 Test Results:");
    console.log("  Detection bypass:", detectionResult ? "✅ PASS" : "❌ FAIL");
    console.log("  Mock functionality:", mockResult ? "✅ PASS" : "❌ FAIL");
    console.log("  Element blocking:", finalDetection ? "✅ PASS" : "❌ FAIL");

    if (detectionResult && mockResult && finalDetection) {
      console.log("🎉 All tests passed! reCAPTCHA bypass is working!");
    } else {
      console.log("⚠️ Some tests failed. Check the logs above.");
    }
  }, 1000);
}, 1000);

// Export functions for manual testing
window.testRecaptchaDetection = testRecaptchaDetection;
window.testGrecaptchaMock = testGrecaptchaMock;
window.createTestRecaptcha = createTestRecaptcha;




