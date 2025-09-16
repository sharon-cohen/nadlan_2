# Nadlan Deals Scraper - JavaScript Version

סקריפט לחילוץ כל העסקאות מכל הישובים באתר נדל"ן הממשלתי.

## תכונות

- ✅ עובר על כל התיקיות של המועצות האזוריות
- ✅ קורא את קבצי ה-CSV עם שמות הישובים וה-IDs
- ✅ מדלג על התיקייה "ללא*מועצה*אזורית"
- ✅ חולץ את כל העסקאות מכל ישוב
- ✅ מטפל בעמודים מרובים (pagination)
- ✅ שומר את הנתונים ב-CSV בתיקיות המתאימות
- ✅ כולל את כל הפרטים: מחיר, תאריך, כתובת, שטח, חדרים, סוג נכס ועוד

## התקנה

### 1. התקנת Node.js

אם אין לך Node.js מותקן:

```bash
# macOS (with Homebrew)
brew install node

# או הורד מ: https://nodejs.org/
```

### 2. התקנת התלויות

```bash
# הרץ את סקריפט ההתקנה
./install_dependencies.sh

# או התקן ידנית
npm install
```

## שימוש

### בדיקה עם ישוב אחד

```bash
npm test
```

### הרצת הסקריפט המלא

```bash
npm start
```

### או ישירות

```bash
node nadlan_deals_scraper.js
```

## מבנה הקבצים

```
councils-with-folders/
├── בני_שמעון/
│   ├── בני_שמעון.csv
│   ├── ברוש_transactions.csv      # ← נוצר על ידי הסקריפט
│   ├── בית_קמה_transactions.csv   # ← נוצר על ידי הסקריפט
│   └── ...
├── אשכול/
│   ├── אשכול.csv
│   └── ...
└── ...
```

## פורמט קובץ ה-CSV של העסקאות

כל קובץ עסקאות יכלול את העמודות הבאות:

| עמודה           | תיאור                |
| --------------- | -------------------- |
| settlement_id   | מזהה הישוב           |
| settlement_name | שם הישוב בעברית      |
| transaction_id  | מספר סידורי של העסקה |
| address         | כתובת הנכס           |
| square_meters   | שטח במ"ר             |
| date            | תאריך העסקה          |
| price           | מחיר העסקה           |
| gush_chelka     | גוש/חלקה/תת-חלקה     |
| property_type   | סוג נכס              |
| rooms           | מספר חדרים           |
| floor           | קומה                 |
| nadlan_url      | קישור לדף נדל"ן      |

## דוגמה לשימוש

```javascript
const NadlanDealsScraper = require("./nadlan_deals_scraper.js");

const scraper = new NadlanDealsScraper();
await scraper.scrapeAllSettlements();
```

## הערות חשובות

- הסקריפט מכבד את השרת עם השהיות בין בקשות
- אם יש בעיה עם ישוב מסוים, הסקריפט ממשיך לישוב הבא
- הסקריפט שומר התקדמות ומציג סטטיסטיקות
- כל עסקה נשמרת עם כל הפרטים הזמינים

## פתרון בעיות

### שגיאת "Puppeteer not installed"

```bash
npm install puppeteer
```

### שגיאת "No settlements found"

וודא שהתיקייה `councils-with-folders` קיימת ובתוכה יש תיקיות עם קבצי CSV.

### שגיאת timeout

הסקריפט כולל timeout של 30 שניות לכל דף. אם יש בעיות רשת, הסקריפט ימשיך לישוב הבא.

## רישיון

MIT License










