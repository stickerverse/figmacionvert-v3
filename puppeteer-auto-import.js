const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureAndImport(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log(`📸 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Load the injected script from chrome extension build
    const injectedScriptPath = path.join(__dirname, 'chrome-extension/dist/injected-script.js');
    if (!fs.existsSync(injectedScriptPath)) {
      throw new Error(`Injected script not found at ${injectedScriptPath}. Please run 'cd chrome-extension && npm run build' first.`);
    }
    
    const injectedScriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
    
    console.log('💉 Injecting extraction script...');
    await page.evaluate(injectedScriptContent);
    
    console.log('🔧 Starting extraction...');
    // Set page timeout to allow for long extractions
    page.setDefaultTimeout(95000);
    
    const result = await page.evaluate(async () => {
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
    
    console.log('✅ Extraction completed successfully');
    console.log(`📊 Schema version: ${result.version}`);
    console.log(`🎯 Elements extracted: ${countElements(result.tree)}`);
    console.log(`🎨 Assets: ${Object.keys(result.assets?.images || {}).length} images, ${Object.keys(result.assets?.svgs || {}).length} SVGs`);
    console.log(`🧩 Components: ${Object.keys(result.components?.definitions || {}).length} definitions`);
    console.log(`🔄 Variants: ${Object.keys(result.variants?.variants || {}).length} variant sets`);
    console.log(`🎨 Design tokens: ${Object.keys(result.designTokens?.tokens || {}).length} tokens`);
    
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
      const response = await fetch('http://127.0.0.1:4411/jobs', {
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
const url = process.argv[2] || 'https://example.com';

console.log('🚀 Enhanced HTML to Figma Capture Test');
console.log('=====================================');

captureAndImport(url)
  .then(() => {
    console.log('🎉 Capture completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Capture failed:', error);
    process.exit(1);
  });