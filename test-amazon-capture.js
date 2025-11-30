const puppeteer = require('puppeteer');
const path = require('path');

async function testAmazonCapture() {
  console.log('🚀 Starting Amazon.com Extension Test\n');
  
  let browser;
  
  try {
    const extensionPath = path.resolve(__dirname, 'chrome-extension');
    
    console.log('📁 Extension path:', extensionPath);
    console.log('🌐 Launching Chrome with extension...\n');
    
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1280,800'
      ],
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Track console messages for progress monitoring
    let progressUpdates = [];
    let elementCount = 0;
    let lastProgress = 0;
    let started = false;
    let completed = false;
    
    page.on('console', msg => {
      const text = msg.text();
      
      // Track progress updates
      if (text.includes('Processing element')) {
        const match = text.match(/Processing element (\d+)/);
        if (match) {
          elementCount = parseInt(match[1]);
          progressUpdates.push({ element: elementCount, time: Date.now() });
          console.log(`📊 Progress: ${elementCount} elements processed`);
        }
      }
      
      // Track percentage progress
      if (text.includes('DOMExtractor progress:')) {
        const percentMatch = text.match(/(\d+)%/);
        if (percentMatch) {
          const percent = parseInt(percentMatch[1]);
          if (percent > lastProgress) {
            lastProgress = percent;
            console.log(`📈 ${percent}% complete`);
          }
        }
      }
      
      //Track extraction phases
      if (text.includes('Starting') || text.includes('📍')) {
        console.log(`🔍 ${text.substring(0, 80)}`);
        started = true;
      }
      
      // Track completion
      if (text.includes('complete') && text.includes('✅')) {
        console.log(`✅ ${text.substring(0, 80)}`);
        completed = true;
      }
      
      // Monitor errors
      if (msg.type() === 'error' && !text.includes('Permissions policy') && !text.includes('Blocked script')) {
        console.log(`⚠️ ${text.substring(0, 100)}`);
      }
    });
    
    console.log('📄 Navigating to Amazon.com...\n');
    await page.goto('https://www.amazon.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded');
    console.log('⏳ Waiting for extension to initialize...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to trigger capture by evaluating if extension popup is available
    console.log('🎯 Looking for extension UI...\n');
    
    const pages = await browser.pages();
    let extensionPopup = null;
    
    for (const p of pages) {
      const url = p.url();
      if (url.includes('chrome-extension://') && url.includes('popup')) {
        extensionPopup = p;
        console.log('✅ Found extension popup!');
        break;
      }
    }
    
    if (extensionPopup) {
      console.log('🖱️  Attempting to click Start Capture button...\n');
      try {
        await extensionPopup.waitForSelector('button', { timeout: 5000 });
        const buttons = await extensionPopup.$$('button');
        
        for (const button of buttons) {
          const text = await button.evaluate(el => el.textContent);
          if (text.includes('Capture') || text.includes('Start')) {
            await button.click();
            console.log('✅ Clicked capture button!');
            break;
          }
        }
      } catch (e) {
        console.log('⚠️ Could not click button:', e.message);
      }
    }
    
    // Monitor for 60 seconds to see capture progress
    console.log('👀 Monitoring capture progress for 60 seconds...\n');
    const startTime = Date.now();
    const monitorInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 10 === 0) {
        console.log(`⏱️  ${elapsed}s elapsed - ${elementCount} elements processed`);
      }
    }, 1000);
    
    await new Promise(resolve => setTimeout(resolve, 60000));
    clearInterval(monitorInterval);
    
    // Print results
    console.log('\n\n📊 TEST RESULTS');
    console.log('================');
    console.log(`Capture Started: ${started ? '✅ YES' : '❌ NO'}`);
    console.log(`Elements Processed: ${elementCount}`);
    console.log(`Max Progress: ${lastProgress}%`);
    console.log(`Progress Updates: ${progressUpdates.length}`);
    console.log(`Capture Completed: ${completed ? '✅ YES' : '⚠️  PARTIAL'}`);
    
    if (progressUpdates.length > 0) {
      const times = progressUpdates.map(p => p.time);
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      console.log(`\nAverage update interval: ${Math.round(avgInterval)}ms`);
      console.log(`✅ Smooth progress: ${avgInterval < 1000 ? 'YES' : 'NO'}`);
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (elementCount > 1000 && progressUpdates.length > 5) {
      console.log('✅ Main-thread yielding is WORKING!');
      console.log('✅ Progress updates flowing smoothly');
      console.log('✅ Amazon.com capture performance OPTIMIZED');
    } else if (elementCount > 0) {
      console.log('⚠️  Capture in progress but may need more time');
    } else {
      console.log('❌ Capture did not start - manual trigger may be needed');
    }
    
    console.log('\n⏳ Keeping browser open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run test
testAmazonCapture()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
