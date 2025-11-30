const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureAndImport(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 1800000 // 30 minutes - DRASTICALLY INCREASED for extremely complex pages
  });
  
  const page = await browser.newPage();
  
  // Set a real User Agent to avoid bot detection
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 900 });
  
  try {
    console.log(`📸 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Forward console logs from the browser
    page.on('console', msg => {
      const text = msg.text();
      // Only log our debug messages or errors
      if (text.includes('Extracting YouTube Element') || text.includes('Extracting YouTube Card') || text.includes('Payload') || msg.type() === 'error') {
        console.log(`[Browser] ${text}`);
      }
    });
    
    // Load the injected script from chrome extension build
    const injectedScriptPath = path.join(__dirname, 'chrome-extension/dist/injected-script.js');
    if (!fs.existsSync(injectedScriptPath)) {
      throw new Error(`Injected script not found at ${injectedScriptPath}. Please run 'cd chrome-extension && npm run build' first.`);
    }
    
    const injectedScriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
    
    // Wait for YouTube content to load
    try {
      console.log('⏳ Waiting for content to load...');
      await page.waitForSelector('footer', { timeout: 10000 });
      console.log('✅ Content container found');
      
      // Scroll to trigger lazy loading
      console.log('📜 Scrolling to load more items...');
      await page.evaluate(async () => {
        window.scrollBy(0, 500);
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.scrollBy(0, 500);
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 1000));
      });
    } catch (e) {
      console.warn('⚠️ Could not find ytd-rich-grid-renderer, continuing anyway...');
    }

    console.log('📸 Taking debug screenshot...');
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

    console.log('💉 Injecting extraction script...');
    await page.evaluate(injectedScriptContent);
    
    console.log('🔧 Starting extraction...');
    // Set page timeout to allow for long extractions (must be less than protocolTimeout)
    page.setDefaultTimeout(1200000); // 20 minutes - DRASTICALLY INCREASED
    
    // Monitor extraction progress in the browser console
    const progressMonitor = setInterval(async () => {
      try {
        const progress = await page.evaluate(() => {
          return window.__extractionProgress || null;
        });
        if (progress) {
          console.log(`📊 Progress: ${progress.phase} - ${progress.message} (${progress.percent}%)`);
        }
      } catch (e) {
        // Ignore errors during monitoring
      }
    }, 5000);
    
    let result;
    try {
      result = await page.evaluate(async () => {
        // Wait for injected script to be available
        if (typeof window.extractPageToSchema !== 'function') {
          throw new Error('Injection failed - extractPageToSchema not found');
        }
        
        // Start extraction with progress tracking
        return await window.extractPageToSchema({
          includeAssets: true,
          includeDesignTokens: true,
          includeComponents: true,
          includeVariants: true,
          enhancedExtraction: true,
          captureStates: ['default', 'hover', 'focus', 'active', 'disabled']
        });
      });
    } finally {
      clearInterval(progressMonitor);
    }
    
    console.log('✅ Extraction completed successfully');
    
    // CAPTURE ACTUAL IMAGES using Puppeteer screenshots
    // This bypasses CORS restrictions that prevent blob fetching
    if (result && result.schema && result.schema.assets && result.schema.assets.images) {
      console.log(`📸 Capturing ${Object.keys(result.schema.assets.images).length} images via screenshots...`);
      
      let capturedCount = 0;
      for (const [hash, imageData] of Object.entries(result.schema.assets.images)) {
        // Skip if we already have data (non-empty base64)
        if (imageData.data && imageData.data.length > 100) {
          continue;
        }
        
        // Skip data URLs - they already contain the image
        if (imageData.url && imageData.url.startsWith('data:')) {
          continue;
        }
        
        try {
          // Find the image element by its source URL
          const imageUrl = imageData.url;
          if (!imageUrl) continue;
          
          // Use Puppeteer to screenshot the image element
          const element = await page.evaluateHandle((url) => {
            // Find img element with matching src or currentSrc
            const images = Array.from(document.querySelectorAll('img'));
            return images.find(img => {
              const src = img.currentSrc || img.src;
              return src === url || src.includes(url) || url.includes(src);
            });
          }, imageUrl);
          
          if (element && element.asElement()) {
            // Screenshot the element directly - bypasses CORS!
            const screenshot = await element.asElement().screenshot({ encoding: 'base64' });
            
            // Update the image data with actual screenshot
            result.schema.assets.images[hash].data = screenshot;
            capturedCount++;
            
            console.log(`📸 Captured ${capturedCount}/${Object.keys(result.schema.assets.images).length}: ${imageUrl.substring(0, 60)}...`);
          }
          
          await element.dispose();
        } catch (err) {
          console.warn(`⚠️ Failed to capture image ${hash}:`, err.message);
        }
      }
      
      console.log(`✅ Successfully captured ${capturedCount} images via screenshots`);
    }
    console.log(`📊 Schema version: ${result.version}`);
    console.log(`🎯 Elements extracted: ${countElements(result.tree)}`);
    console.log(`🎨 Assets: ${Object.keys(result.assets?.images || {}).length} images, ${Object.keys(result.assets?.svgs || {}).length} SVGs`);
    console.log(`🧩 Components: ${Object.keys(result.components?.definitions || {}).length} definitions`);
    console.log(`🔄 Variants: ${Object.keys(result.variants?.variants || {}).length} variant sets`);
    console.log(`🎨 Design tokens: ${Object.keys(result.designTokensRegistry?.variables || {}).length} tokens`);
    
    
    // Post to handoff server using Node.js fetch
    console.log('🚀 Posting to handoff server...');
    const payload = {
      url: url,
      schema: result,
      timestamp: new Date().toISOString(),
      source: 'puppeteer-enhanced-test'
    };
    
    let postResult;
    try {
      const response = await fetch('http://127.0.0.1:5511/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      postResult = { ok: response.ok, status: response.status, statusText: response.statusText };
    } catch (error) {
      postResult = { ok: false, error: error.message };
    }
    
    if (postResult.ok) {
      console.log('✅ Successfully queued for Figma import');
      
      // Save local copy for inspection
      const filename = `enhanced-test-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(result, null, 2));
      console.log(`💾 Saved local copy: ${filename}`);
    } else {
      console.error('❌ Failed to post to handoff server:', postResult.statusText || postResult.error);
    }
    
  } catch (error) {
    console.error('❌ Capture failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

function countElements(node) {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    count += node.children.reduce((sum, child) => sum + countElements(child), 0);
  }
  return count;
}

// Main execution
const targetUrl = process.argv[2] || 'https://stripe.com';

console.log('🚀 Enhanced HTML to Figma Capture Test');
console.log('=====================================');

captureAndImport(targetUrl)
  .then(() => {
    console.log('🎉 Capture completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Capture failed:', error);
    process.exit(1);
  });