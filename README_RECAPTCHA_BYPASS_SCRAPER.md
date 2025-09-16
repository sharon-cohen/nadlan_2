# 🛡️ Nadlan Scraper with Advanced reCAPTCHA Bypass

## 📋 תיאור

סקריפט מתקדם לגריפת נתוני נדלן מהאתר nadlan.gov.il עם טכניקות עקיפת reCAPTCHA מתקדמות.

## 🚀 התקנה

### 1. התקנת התלויות

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth puppeteer-extra-plugin-recaptcha
```

### 2. הגדרת 2captcha (אופציונלי)

אם אתה רוצה להשתמש בשירות 2captcha לפתרון reCAPTCHA:

```javascript
// בקובץ scrape_neighborhood_deals_with_recaptcha_bypass.js
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: "YOUR_ACTUAL_2CAPTCHA_API_KEY", // החלף כאן
    },
    visualFeedback: true,
  })
);
```

## 🛡️ טכניקות עקיפת reCAPTCHA

### 1. **Mock grecaptcha Object**
- מחליף את אובייקט grecaptcha הגלובלי
- מחזיר ערכים מזויפים לכל הפונקציות
- מונע זיהוי של reCAPTCHA

### 2. **חסימת Scripts ו-Elements**
- חוסם טעינת סקריפטים של reCAPTCHA
- מונע הוספת אלמנטי reCAPTCHA ל-DOM
- חוסם יצירת iframe של reCAPTCHA

### 3. **חסימת בקשות רשת**
- חוסם fetch requests ל-reCAPTCHA
- חוסם XMLHttpRequest ל-reCAPTCHA
- מחזיר תגובות מזויפות

### 4. **Canvas & WebGL Fingerprinting**
- מוסיף רעש ל-Canvas כדי להיראות אנושי יותר
- מזייף WebGL properties
- מונע זיהוי על בסיס fingerprinting

### 5. **הסרת אלמנטים דינמית**
- מסיר אלמנטי reCAPTCHA קיימים
- עוקב אחר שינויים ב-DOM
- מסיר אלמנטים חדשים שמתווספים

### 6. **Mocking Properties**
- מזייף navigator properties
- מזייף timezone offset
- מונע זיהוי automation

## 🎯 שימוש

### הרצה בסיסית

```bash
node scrape_neighborhood_deals_with_recaptcha_bypass.js
```

### הרצה עם עיר ספציפית

```javascript
const scraper = new NadlanScraperWithRecaptchaBypass();
await scraper.init(false); // false = browser גלוי
const deals = await scraper.scrapeCityDeals("תל אביב - יפו");
await scraper.close();
```

### הרצה עם מספר ערים

```javascript
const cities = ["תל אביב - יפו", "ירושלים", "חיפה"];
const scraper = new NadlanScraperWithRecaptchaBypass();

await scraper.init(false);

for (const city of cities) {
  console.log(`🏙️ Scraping ${city}...`);
  const deals = await scraper.scrapeCityDeals(city);
  console.log(`✅ Found ${deals} deals in ${city}`);
  
  // עיכוב בין ערים
  await scraper.delay(5000);
}

await scraper.close();
```

## ⚙️ הגדרות

### Headless Mode

```javascript
await scraper.init(true); // true = headless, false = browser גלוי
```

### עיכובים מותאמים אישית

```javascript
// עיכוב בין שכונות (במילישניות)
const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 שניות

// עיכוב בין ערים (במילישניות)
const cityDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 שניות
```

### User Agent מותאם

```javascript
await this.page.setUserAgent(
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
);
```

## 📊 פלט

### קבצי CSV

הסקריפט יוצר קבצי CSV עם הנתונים הבאים:

```csv
Address,Price,Area,Rooms,Floor,Date,Type,Neighborhood,City
"רחוב הרצל 1","1,500,000","80","3","2","2024-01-15","דירה","מרכז העיר","תל אביב - יפו"
```

### לוגים

```
🚀 Initializing browser with advanced reCAPTCHA bypass...
🛡️ Applying advanced reCAPTCHA bypass techniques...
✅ Browser initialized with advanced anti-detection and reCAPTCHA bypass
🏙️ Scraping deals for city: תל אביב - יפו
📍 Found 25 neighborhoods in תל אביב - יפו
🏘️ Scraping neighborhood 1/25: מרכז העיר
✅ No reCAPTCHA detected
📊 Extracted 15 deals from מרכז העיר
✅ Found 15 deals in מרכז העיר
💾 Saved 150 deals to תל אביב - יפו_deals.csv
🎉 Scraping completed! Total deals found: 150
```

## 🔧 התאמה אישית

### הוספת טכניקות עקיפה נוספות

```javascript
// הוסף ל-bypassRecaptchaAdvanced()
await this.page.evaluateOnNewDocument(() => {
  // טכניקה נוספת
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8
  });
  
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8
  });
});
```

### שינוי סלקטורים

```javascript
// שנה את הסלקטורים לפי האתר
const dealElements = document.querySelectorAll(
  ".deal-item, .transaction-item, .property-item, [data-deal-id]"
);
```

### הוספת שדות נוספים

```javascript
const deal = {
  address: "",
  price: "",
  area: "",
  rooms: "",
  floor: "",
  date: "",
  type: "",
  // שדות נוספים
  parking: "",
  balcony: "",
  elevator: "",
  condition: ""
};
```

## 🚨 פתרון בעיות

### reCAPTCHA עדיין מזוהה

1. **בדוק את הלוגים** - חפש הודעות "🚫 Blocked"
2. **הגדל עיכובים** - הוסף עיכובים ארוכים יותר
3. **שנה User Agent** - נסה User Agent אחר
4. **השתמש ב-2captcha** - הוסף API key

### שגיאות טעינה

1. **בדוק חיבור אינטרנט**
2. **הגדל timeout** - שנה את 30000 ל-60000
3. **נסה שוב** - לפעמים זה בעיה זמנית

### אין נתונים

1. **בדוק סלקטורים** - אולי האתר השתנה
2. **הפעל browser גלוי** - `init(false)`
3. **בדוק אם יש reCAPTCHA** - חפש הודעות שגיאה

## 📈 ביצועים

### מהירות

- **עיר אחת**: ~5-10 דקות
- **10 ערים**: ~1-2 שעות
- **כל הארץ**: ~4-6 שעות

### זיכרון

- **RAM**: ~200-500MB
- **CPU**: בינוני
- **דיסק**: ~1MB לכל 1000 עסקאות

## ⚠️ הערות חשובות

1. **שימוש באחריותך** - ודא שהשימוש חוקי
2. **כבוד לאתר** - אל תגרום לעומס על השרת
3. **עדכון קבוע** - האתר יכול להשתנות
4. **גיבוי נתונים** - שמור את הנתונים במקום בטוח

## 🔄 עדכונים

### גרסה 1.0
- עקיפת reCAPTCHA בסיסית
- גריפת נתוני נדלן
- שמירה ל-CSV

### גרסה 1.1
- טכניקות עקיפה מתקדמות
- Canvas fingerprinting
- WebGL mocking

### גרסה 1.2
- חסימת בקשות רשת
- הסרת אלמנטים דינמית
- שיפור ביצועים

---

**🎉 עכשיו יש לך סקריפט מתקדם עם עקיפת reCAPTCHA מלאה!**




