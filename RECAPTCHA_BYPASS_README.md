# 🛡️ reCAPTCHA v2 Bypass Guide

## 🚀 התקנה והגדרה

### 1. התקנת התוספים הנדרשים

```bash
npm install puppeteer-extra-plugin-recaptcha
```

### 2. הגדרת 2captcha API Key

עליך להחליף את `YOUR_2CAPTCHA_TOKEN` בקובץ `scrape_neighborhood_deals.js` עם המפתח שלך מ-2captcha:

```javascript
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

### 3. קבלת API Key מ-2captcha

1. הירשם לאתר [2captcha.com](https://2captcha.com)
2. הוסף כסף לחשבון (כ-$1-2 יספיקו)
3. העתק את ה-API Key מהדשבורד

## 🔧 טכניקות עקיפה מתקדמות

### 1. **Advanced Anti-Detection**

- Mocking של `navigator.webdriver`
- הסרת automation indicators
- Mocking של canvas fingerprinting
- Mocking של WebGL fingerprinting
- חסימת reCAPTCHA scripts ו-iframes

### 2. **Human-like Behavior**

- עיכובים אקראיים בין פעולות
- תנועות עכבר אקראיות
- גלילה אקראית
- User Agents מגוונים

### 3. **reCAPTCHA Detection & Solving**

- זיהוי אוטומטי של reCAPTCHA
- פתרון אוטומטי באמצעות 2captcha
- הגשת טפסים אוטומטית לאחר פתרון

## 🎯 שימוש

### הרצה רגילה

```bash
node scrape_neighborhood_deals.js
```

### עם debug mode

הסקריפט כבר מוגדר לרוץ עם דפדפן גלוי (`headless: false`) כדי שתוכל לראות את תהליך עקיפת reCAPTCHA.

## 📊 מה הסקריפט עושה

1. **אתחול מתקדם**: מגדיר anti-detection measures
2. **ניווט**: עובר לעמודים עם עיכובים אקראיים
3. **זיהוי reCAPTCHA**: בודק אם יש reCAPTCHA בעמוד
4. **פתרון אוטומטי**: פותר reCAPTCHA באמצעות 2captcha
5. **סקריפט**: אוסף נתונים לאחר עקיפת ההגנות

## ⚠️ הערות חשובות

### עלויות 2captcha

- reCAPTCHA v2: ~$0.001-0.003 לפתרון
- עם 1000 עמודים: ~$1-3

### הגבלות

- 2captcha מגביל את המהירות (1-2 פתרונות לדקה)
- יש להמתין בין בקשות
- הסקריפט כולל עיכובים אוטומטיים

### חלופות ל-2captcha

```javascript
// Anti-Captcha
provider: {
  id: 'anticaptcha',
  token: 'YOUR_ANTICAPTCHA_TOKEN'
}

// CapMonster
provider: {
  id: 'capmonster',
  token: 'YOUR_CAPMONSTER_TOKEN'
}
```

## 🔍 Debugging

### בדיקת זיהוי reCAPTCHA

הסקריפט יודפס הודעות כמו:

- `🔍 Checking for reCAPTCHA...`
- `✅ No reCAPTCHA detected`
- `🚨 reCAPTCHA detected! Attempting to solve...`
- `✅ Successfully solved 1 reCAPTCHA(s)`

### בעיות נפוצות

1. **API Key שגוי**: בדוק שהמפתח נכון
2. **אין כסף בחשבון**: הוסף כסף ל-2captcha
3. **עיכובים קצרים מדי**: הסקריפט כולל עיכובים אוטומטיים

## 🚀 שיפורים עתידיים

- תמיכה ב-reCAPTCHA v3
- שימוש בפרוקסים
- רוטציה של User Agents
- Session management מתקדם

---

**⚠️ שימוש באחריותך בלבד. ודא שהשימוש חוקי ותואם לתנאי השימוש של האתר.**




