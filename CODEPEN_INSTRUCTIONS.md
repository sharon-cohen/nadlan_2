# 🎨 CodePen Demo Instructions

## 🚀 איך להשתמש ב-CodePen Demo

### 1. **פתח CodePen**

- לך לאתר [codepen.io](https://codepen.io)
- לחץ על "Create" → "New Pen"

### 2. **העתק את הקוד**

#### **HTML Tab:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>reCAPTCHA Bypass Demo</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .container {
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #333;
        text-align: center;
      }
      .status {
        padding: 15px;
        margin: 15px 0;
        border-radius: 5px;
        font-weight: bold;
      }
      .success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      .warning {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
      }
      .error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
      .info {
        background: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
      }
      button {
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
      }
      button:hover {
        background: #0056b3;
      }
      .log {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 5px;
        padding: 15px;
        margin: 15px 0;
        max-height: 300px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 12px;
      }
      .log-entry {
        margin: 2px 0;
        padding: 2px 5px;
        border-radius: 3px;
      }
      .code {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 5px;
        padding: 15px;
        margin: 15px 0;
        font-family: monospace;
        font-size: 12px;
        overflow-x: auto;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🛡️ reCAPTCHA Bypass Demo</h1>

      <div id="status" class="status info">
        🔍 Ready to test reCAPTCHA bypass...
      </div>

      <div>
        <button onclick="runBypassTest()">🧪 Test Bypass</button>
        <button onclick="testGrecaptcha()">🎭 Test grecaptcha Mock</button>
        <button onclick="createTestElements()">🔧 Create Test Elements</button>
        <button onclick="clearLog()">🗑️ Clear Log</button>
      </div>

      <div id="log" class="log">
        <div class="log-entry info">[Ready] reCAPTCHA Bypass Demo loaded</div>
      </div>

      <h3>📋 Bypass Techniques Applied:</h3>
      <ul>
        <li>✅ Mock grecaptcha object</li>
        <li>✅ Block reCAPTCHA scripts</li>
        <li>✅ Block reCAPTCHA elements</li>
        <li>✅ Block reCAPTCHA network requests</li>
        <li>✅ Mock canvas fingerprinting</li>
        <li>✅ Mock WebGL fingerprinting</li>
        <li>✅ Remove existing reCAPTCHA elements</li>
        <li>✅ Watch for new reCAPTCHA elements</li>
      </ul>

      <h3>💻 Code Example:</h3>
      <div class="code">
        // Mock grecaptcha Object.defineProperty(window, 'grecaptcha', { get: ()
        => ({ ready: (callback) => callback(), execute: () =>
        Promise.resolve('fake-token'), render: () => 'fake-widget-id', reset: ()
        => {}, getResponse: () => 'fake-response' }) }); // Block reCAPTCHA
        scripts const originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function(child) { if (child.tagName ===
        'SCRIPT' && child.src && child.src.includes('recaptcha')) {
        console.log('🚫 Blocked reCAPTCHA script'); return child; } return
        originalAppendChild.call(this, child); }; // Block network requests
        const originalFetch = window.fetch; window.fetch = function(url,
        options) { if (typeof url === 'string' && url.includes('recaptcha')) {
        console.log('🚫 Blocked reCAPTCHA request'); return Promise.resolve(new
        Response('{}', { status: 200 })); } return originalFetch.call(this, url,
        options); };
      </div>
    </div>
  </body>
</html>
```

#### **JavaScript Tab:**

```javascript
// ===== LOGGING SYSTEM =====
let logEntries = [];

function addLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const entry = {
    message: `[${timestamp}] ${message}`,
    type: type,
  };
  logEntries.push(entry);
  updateLogDisplay();
}

function updateLogDisplay() {
  const logElement = document.getElementById("log");
  logElement.innerHTML = logEntries
    .map(
      (entry) => `<div class="log-entry ${entry.type}">${entry.message}</div>`
    )
    .join("");
  logElement.scrollTop = logElement.scrollHeight;
}

function clearLog() {
  logEntries = [];
  updateLogDisplay();
  addLog("🗑️ Log cleared", "info");
}

function updateStatus(message, type) {
  const statusElement = document.getElementById("status");
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

// ===== reCAPTCHA BYPASS TECHNIQUES =====

// 1. Mock grecaptcha
Object.defineProperty(window, "grecaptcha", {
  get: () => ({
    ready: (callback) => {
      addLog("🔄 grecaptcha.ready called", "info");
      setTimeout(callback, 100);
      return Promise.resolve();
    },
    execute: () => {
      addLog("🔄 grecaptcha.execute called", "info");
      return Promise.resolve("fake-token-12345");
    },
    render: (container, options) => {
      addLog("🔄 grecaptcha.render called", "info");
      return "fake-widget-id-12345";
    },
    reset: () => {
      addLog("🔄 grecaptcha.reset called", "info");
    },
    getResponse: () => {
      addLog("🔄 grecaptcha.getResponse called", "info");
      return "fake-response-12345";
    },
  }),
});

// 2. Block reCAPTCHA scripts
const originalAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function (child) {
  if (
    child.tagName === "SCRIPT" &&
    child.src &&
    child.src.includes("recaptcha")
  ) {
    addLog("🚫 Blocked reCAPTCHA script: " + child.src, "warning");
    return child;
  }
  if (child.className && child.className.includes("g-recaptcha")) {
    addLog("🚫 Blocked reCAPTCHA element: " + child.className, "warning");
    return child;
  }
  return originalAppendChild.call(this, child);
};

// 3. Block reCAPTCHA network requests
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === "string" && url.includes("recaptcha")) {
    addLog("🚫 Blocked reCAPTCHA fetch request: " + url, "warning");
    return Promise.resolve(new Response("{}", { status: 200 }));
  }
  return originalFetch.call(this, url, options);
};

// 4. Remove existing reCAPTCHA elements
const removeRecaptchaElements = () => {
  const recaptchaElements = document.querySelectorAll(
    '.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'
  );
  recaptchaElements.forEach((element) => {
    addLog("🗑️ Removing reCAPTCHA element", "warning");
    element.remove();
  });
};

// 5. Watch for new reCAPTCHA elements
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        if (node.classList && node.classList.contains("g-recaptcha")) {
          addLog("🗑️ Removing new reCAPTCHA element", "warning");
          node.remove();
        }
        if (
          node.tagName === "IFRAME" &&
          node.src &&
          node.src.includes("recaptcha")
        ) {
          addLog("🗑️ Removing new reCAPTCHA iframe", "warning");
          node.remove();
        }
      }
    });
  });
});

// Initialize
removeRecaptchaElements();
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

addLog("🛡️ reCAPTCHA bypass techniques loaded", "success");

// ===== TESTING FUNCTIONS =====

function runBypassTest() {
  addLog("🧪 Running bypass test...", "info");
  updateStatus("🔍 Testing...", "warning");

  const recaptchaPresent = !!(
    document.querySelector('iframe[src*="recaptcha"]') ||
    document.querySelector(".g-recaptcha") ||
    document.querySelector("#recaptcha") ||
    document.querySelector("[data-sitekey]") ||
    document.querySelector('iframe[title*="reCAPTCHA"]')
  );

  if (recaptchaPresent) {
    addLog("🚨 reCAPTCHA detected on page!", "error");
    updateStatus("❌ Bypass failed - reCAPTCHA detected", "error");
  } else {
    addLog("✅ No reCAPTCHA detected - bypass successful!", "success");
    updateStatus("✅ Bypass successful!", "success");
  }
}

function testGrecaptcha() {
  addLog("🎭 Testing grecaptcha mock...", "info");

  try {
    if (window.grecaptcha) {
      addLog("✅ grecaptcha object exists", "success");

      // Test ready
      window.grecaptcha.ready(() => {
        addLog("✅ grecaptcha.ready works", "success");
      });

      // Test render
      const widgetId = window.grecaptcha.render("test-container", {});
      addLog("✅ grecaptcha.render works, widget ID: " + widgetId, "success");

      // Test getResponse
      const response = window.grecaptcha.getResponse();
      addLog(
        "✅ grecaptcha.getResponse works, response: " + response,
        "success"
      );

      // Test execute
      window.grecaptcha.execute().then((token) => {
        addLog("✅ grecaptcha.execute works, token: " + token, "success");
      });
    } else {
      addLog("❌ grecaptcha object not found", "error");
    }
  } catch (error) {
    addLog("❌ Error testing grecaptcha: " + error.message, "error");
  }
}

function createTestElements() {
  addLog("🔧 Creating test reCAPTCHA elements...", "info");

  // Try to create a reCAPTCHA div
  const recaptchaDiv = document.createElement("div");
  recaptchaDiv.className = "g-recaptcha";
  recaptchaDiv.setAttribute("data-sitekey", "test-sitekey");
  recaptchaDiv.textContent = "Test reCAPTCHA div";
  document.body.appendChild(recaptchaDiv);

  // Try to create a reCAPTCHA iframe
  const recaptchaIframe = document.createElement("iframe");
  recaptchaIframe.src = "https://www.google.com/recaptcha/api2/anchor";
  recaptchaIframe.width = "300";
  recaptchaIframe.height = "100";
  document.body.appendChild(recaptchaIframe);

  // Try to create a reCAPTCHA script
  const recaptchaScript = document.createElement("script");
  recaptchaScript.src = "https://www.google.com/recaptcha/api.js";
  document.head.appendChild(recaptchaScript);

  addLog("✅ Test elements created (should be blocked/removed)", "info");

  // Check if elements were blocked
  setTimeout(() => {
    const finalCheck = !!(
      document.querySelector(".g-recaptcha") ||
      document.querySelector('iframe[src*="recaptcha"]')
    );

    if (finalCheck) {
      addLog("⚠️ Some test elements still present", "warning");
    } else {
      addLog("✅ All test elements successfully blocked/removed", "success");
    }
  }, 1000);
}

// Initialize
addLog("🚀 Demo ready! Click buttons to test bypass techniques", "info");
```

### 3. **הרץ את הדמו**

- לחץ על "Run" או "Update" ב-CodePen
- תראה את הממשק עם הכפתורים
- לחץ על הכפתורים השונים לבדיקת הטכניקות

## 🧪 איך לבדוק

### **כפתור "Test Bypass"**

- בודק אם יש reCAPTCHA בעמוד
- אמור להציג "✅ Bypass successful!"

### **כפתור "Test grecaptcha Mock"**

- בודק את הפונקציות המזויפות של grecaptcha
- אמור להציג הודעות הצלחה לכל הפונקציות

### **כפתור "Create Test Elements"**

- יוצר אלמנטי reCAPTCHA לבדיקה
- אמור לחסום/להסיר אותם אוטומטית

### **כפתור "Clear Log"**

- מנקה את הלוג

## 📊 מה תראה

### **הודעות הצלחה:**

- ✅ Bypass successful!
- ✅ grecaptcha object exists
- ✅ All test elements successfully blocked/removed

### **הודעות אזהרה:**

- 🚫 Blocked reCAPTCHA script
- 🗑️ Removing reCAPTCHA element

### **הודעות שגיאה:**

- ❌ Bypass failed - reCAPTCHA detected

## 🔧 התאמה אישית

### **הוספת טכניקות נוספות:**

```javascript
// הוסף לקובץ JavaScript
// Mock canvas fingerprinting
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function () {
  const context = this.getContext("2d");
  if (context) {
    // Add noise to canvas
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
```

## 🚀 שיתוף

### **שמור ב-CodePen:**

- לחץ על "Save"
- תן שם לדמו
- שתף את הקישור

### **דוגמה לקישור:**

```
https://codepen.io/your-username/pen/your-pen-id
```

## ⚠️ הערות חשובות

1. **זה רק דמו** - לא עובד על אתרים אמיתיים
2. **למטרות לימוד** - להבין איך עקיפה עובדת
3. **לא לשימוש לא חוקי** - רק למחקר ולימוד
4. **בדוק את החוקים** - ודא שהשימוש חוקי

---

**🎉 עכשיו יש לך דמו מלא של עקיפת reCAPTCHA ב-CodePen!**




