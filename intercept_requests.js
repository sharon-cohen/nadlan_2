const puppeteer = require('puppeteer');

async function interceptRequests() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const requests = [];
  
  // Intercept all requests
  await page.setRequestInterception(true);
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
    request.continue();
  });
  
  // Listen for responses
  page.on('response', response => {
    if (response.url().includes('json') || response.url().includes('api') || response.url().includes('4028')) {
      console.log('Response URL:', response.url());
      console.log('Status:', response.status());
    }
  });
  
  try {
    console.log('Navigating to settlement page...');
    await page.goto('https://www.nadlan.gov.il/?view=settlement&id=4028&page=deals', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('\nAll requests made:');
    requests.forEach((req, index) => {
      if (req.url.includes('json') || req.url.includes('api') || req.url.includes('4028')) {
        console.log(`${index + 1}. ${req.method} ${req.url}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

interceptRequests();


















