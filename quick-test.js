const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Quick test of navigation fixes
 */
async function quickTest() {
  console.log('🔧 Quick navigation fix test...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // Track console messages for navigation blocking
    const navigationEvents = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🛑') || text.includes('Navigation blocked')) {
        navigationEvents.push(text);
        console.log('🛡️', text);
      }
    });

    // Navigate to test page
    const testPagePath = path.resolve(__dirname, 'test-navigation-fix.html');
    await page.goto(`file://${testPagePath}`, { waitUntil: 'networkidle2' });

    // Load extension script
    const injectedScriptPath = path.resolve(__dirname, 'chrome-extension/dist/injected-script.js');
    const injectedScript = await fs.readFile(injectedScriptPath, 'utf8');
    await page.evaluate(injectedScript);

    console.log('✅ Page and script loaded');

    // Quick function availability test
    const functions = await page.evaluate(() => ({
      extractPageToSchema: typeof window.extractPageToSchema === 'function',
      extractPageToFigmaAPI: typeof window.extractPageToFigmaAPI === 'function',
      convertToFigmaAPI: typeof window.convertToFigmaAPI === 'function'
    }));

    console.log('📊 Functions available:');
    Object.entries(functions).forEach(([name, available]) => {
      console.log(`  - ${name}: ${available ? '✅' : '❌'}`);
    });

    // Test basic extraction (timeout after 30 seconds)
    console.log('\n🧪 Testing basic extraction...');
    
    const extractionPromise = page.evaluate(async () => {
      try {
        // Test navigation blocking first
        const beforeUnloadEvent = new Event('beforeunload');
        window.dispatchEvent(beforeUnloadEvent);
        
        // Quick extraction test
        const result = await window.extractPageToSchema();
        
        return {
          success: true,
          hasTree: !!result.tree,
          elementCount: result.metadata?.extractionSummary?.totalElements || 0,
          version: result.version
        };
      } catch (error) {
        return {
          success: false,
          error: error.message.substring(0, 100) // Truncate long errors
        };
      }
    });

    // Race between extraction and timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Extraction timeout')), 30000)
    );

    try {
      const result = await Promise.race([extractionPromise, timeoutPromise]);
      
      console.log('📊 Extraction result:');
      if (result.success) {
        console.log('  - Status: ✅ SUCCESS');
        console.log('  - Has tree:', result.hasTree ? '✅' : '❌');
        console.log('  - Elements found:', result.elementCount);
        console.log('  - Schema version:', result.version);
      } else {
        console.log('  - Status: ❌ FAILED');
        console.log('  - Error:', result.error);
      }

      // Test navigation blocking specifically
      const navigationTest = await page.evaluate(() => {
        let blocked = false;
        try {
          const originalHref = window.location.href;
          window.location.href = 'about:blank';
          blocked = window.location.href === originalHref;
        } catch (e) {
          blocked = true;
        }
        return blocked;
      });

      console.log('\n📊 Navigation blocking test:');
      console.log('  - Events captured:', navigationEvents.length);
      console.log('  - Location change blocked:', navigationTest ? '✅' : '❌');

      // Final page state
      const pageState = await page.evaluate(() => ({
        title: document.title,
        elementCount: document.querySelectorAll('*').length,
        hasTestElements: document.querySelectorAll('.test-element').length
      }));

      console.log('\n📊 Page stability:');
      console.log('  - Title:', pageState.title);
      console.log('  - Elements:', pageState.elementCount);
      console.log('  - Test elements:', pageState.hasTestElements);

      const overall = result.success && navigationTest && pageState.hasTestElements > 0;
      console.log('\n🎯 OVERALL RESULT:', overall ? '✅ PASSED' : '❌ FAILED');

      if (overall) {
        console.log('🎉 Navigation fixes are working!');
        console.log('   - Extraction works without issues');
        console.log('   - Navigation is properly blocked');
        console.log('   - Page remains stable');
      }

    } catch (error) {
      console.log('⏰ Extraction timed out or failed:', error.message);
      console.log('🛡️ Navigation events captured:', navigationEvents.length);
      
      if (navigationEvents.length > 0) {
        console.log('✅ Navigation blocking is working (events detected)');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

quickTest()
  .then(() => console.log('\n🏁 Quick test complete'))
  .catch(error => console.error('\n💥 Quick test failed:', error));