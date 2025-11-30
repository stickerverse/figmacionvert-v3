const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function debugImageImport() {
  console.log('🚀 Starting Image Import Debug Test...\n');
  
  const extensionPath = path.resolve(__dirname, 'chrome-extension/dist');
  console.log('📁 Extension path:', extensionPath);
  
  const browser = await puppeteer.launch({
    headless: "new",
    dumpio: true, // Capture all browser output
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1280,800'
    ],
    defaultViewport: null,
    timeout: 60000 // Increase launch timeout
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable log monitoring
    page.on('console', msg => {
      const text = msg.text();
      console.log(`[BROWSER] ${msg.type()}: ${text}`);
    });

    const targetUrl = 'https://www.google.com'; 
    console.log(`\n📄 Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Page loaded');

    // Wait for extension to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n📸 Triggering capture...');
    
    // Check extension status first
    const extStatus = await page.evaluate(() => {
      console.log('Checking extension status...');
      return {
        hasChrome: typeof chrome !== 'undefined',
        hasRuntime: typeof chrome?.runtime !== 'undefined',
        hasSendMessage: typeof chrome?.runtime?.sendMessage === 'function'
      };
    });
    console.log('🔧 Extension Status:', extStatus);

    // Trigger capture via postMessage (standard way for extension)
    await page.evaluate(() => {
      console.log('Sending START_CAPTURE_TEST message...');
      window.postMessage({ 
        type: 'START_CAPTURE_TEST', 
        viewports: [{ width: 1280, height: 800 }]
      }, '*');
    });

    console.log('⏳ Waiting for capture logs (60s timeout)...');
    
    // Wait for enough time to see image processing logs
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log('\n✅ Test finished (check logs above)');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugImageImport();
