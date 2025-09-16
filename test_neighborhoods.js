const puppeteer = require('puppeteer');

async function testNeighborhoods() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the settlement page
    await page.goto('https://www.nadlan.gov.il/?view=settlement&id=4028&page=deals', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for the page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find the neighborhoods data in the page
    const neighborhoodsData = await page.evaluate(() => {
      // Look for any global variables or data that might contain neighborhoods
      if (window.__INITIAL_STATE__) {
        return window.__INITIAL_STATE__;
      }
      
      // Look for otherNeighborhoods in any global objects
      if (window.otherNeighborhoods) {
        return window.otherNeighborhoods;
      }
      
      // Look for any data in script tags
      const scripts = document.querySelectorAll('script');
      for (let script of scripts) {
        if (script.textContent && script.textContent.includes('otherNeighborhoods')) {
          return script.textContent;
        }
      }
      
      return 'No neighborhoods data found';
    });
    
    console.log('Neighborhoods data:', JSON.stringify(neighborhoodsData, null, 2));
    
    // Also try to intercept network requests
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('json') || request.url().includes('api')) {
        console.log('Request URL:', request.url());
      }
      request.continue();
    });
    
    // Try to reload and see network requests
    await page.reload({ waitUntil: 'networkidle0' });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testNeighborhoods();
