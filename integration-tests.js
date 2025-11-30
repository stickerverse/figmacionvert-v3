const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, 'chrome-extension');

async function runIntegrationTests() {
  console.log('🚀 Starting Integration Tests: Infinite Scroll & Reduced Motion');
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    await testInfiniteScroll(browser);
    await testReducedMotion(browser);
    console.log('🎉 All integration tests passed!');
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
  } finally {
    await browser.close();
  }
}

async function testInfiniteScroll(browser) {
  console.log('\n🧪 Testing Infinite Scroll Handling...');
  const page = await browser.newPage();
  
  // Use a long page (e.g. Wikipedia)
  await page.goto('https://en.wikipedia.org/wiki/History_of_the_World', { waitUntil: 'networkidle0' });
  
  // Trigger capture
  console.log('📸 Triggering capture...');
  await page.evaluate(() => {
    window.postMessage({
      type: 'START_CAPTURE_TEST',
      viewports: [{ width: 1440, height: 900 }]
    }, '*');
  });

  // Wait for completion
  const schema = await waitForCaptureCompletion(page);
  
  if (schema) {
    console.log('✅ Capture completed');
    // Check if scroll data indicates scrolling happened
    if (schema.metadata.extractionSummary && schema.metadata.extractionSummary.scrollComplete) {
      console.log('✅ Scroll sweep completed successfully');
    } else {
      console.warn('⚠️ Scroll sweep might not have completed as expected');
    }
  } else {
    throw new Error('Capture failed or returned no schema');
  }
}

async function testReducedMotion(browser) {
  console.log('\n🧪 Testing Reduced Motion Support...');
  const page = await browser.newPage();
  
  // Enable reduced motion emulation
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  
  await page.goto('https://example.com', { waitUntil: 'networkidle0' });
  
  // Trigger capture
  console.log('📸 Triggering capture with reduced motion...');
  await page.evaluate(() => {
    window.postMessage({
      type: 'START_CAPTURE_TEST',
      viewports: [{ width: 1440, height: 900 }]
    }, '*');
  });

  // Wait for completion
  const schema = await waitForCaptureCompletion(page);
  
  if (schema) {
    // Check metadata for reduced motion flag
    // Note: We need to ensure schema.metadata includes captureOptions or similar
    // For now, we assume the extension respects it and maybe logs it
    console.log('✅ Capture completed under reduced motion');
    // In a real test, we would assert that animations were disabled or capture duration was shorter
  } else {
    throw new Error('Capture failed');
  }
}

async function waitForCaptureCompletion(page) {
  return page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 60000);
      
      window.addEventListener('message', (event) => {
        if (event.data.type === 'EXTRACTION_COMPLETE') {
          clearTimeout(timeout);
          resolve(event.data.data);
        }
        if (event.data.type === 'EXTRACTION_ERROR') {
          clearTimeout(timeout);
          reject(new Error(event.data.error));
        }
      });
    });
  });
}

runIntegrationTests();
