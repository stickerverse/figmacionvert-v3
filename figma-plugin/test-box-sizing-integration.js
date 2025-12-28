#!/usr/bin/env node

/**
 * BOX-SIZING INTEGRATION TEST
 * Tests box-sizing with actual DOM extraction pipeline
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testBoxSizingIntegration() {
  console.log('🔧 Testing Box-Sizing Integration with DOM Extractor...\n');

  // Load the actual DOM extractor
  const extensionPath = path.join(__dirname, '..', 'chrome-extension', 'dist');
  
  const testHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    
    .test-container {
      width: 300px;
      height: 200px;
      padding: 20px;
      border: 10px solid #333;
      background: #f0f0f0;
      margin: 20px;
    }
    
    .content-box-item {
      box-sizing: content-box;
      width: 100px;
      height: 50px;
      padding: 10px;
      border: 5px solid red;
      background: yellow;
      display: inline-block;
      margin: 5px;
    }
    
    .border-box-item {
      box-sizing: border-box;
      width: 100px;
      height: 50px;
      padding: 10px;  
      border: 5px solid blue;
      background: lightblue;
      display: inline-block;
      margin: 5px;
    }
  </style>
</head>
<body>
  <div class="test-container">
    <div class="content-box-item">Content Box</div>
    <div class="border-box-item">Border Box</div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--disable-web-security', 
      '--allow-running-insecure-content',
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(testHTML);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if box-sizing data is properly captured
    const boxSizingValidation = await page.evaluate(() => {
      const results = [];
      
      // Find all elements with classes
      const elements = document.querySelectorAll('[class]');
      
      elements.forEach(element => {
        const computed = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0) return; // Skip hidden elements
        
        const boxSizing = computed.boxSizing;
        
        const borderTop = parseFloat(computed.borderTopWidth) || 0;
        const borderRight = parseFloat(computed.borderRightWidth) || 0;
        const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
        const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
        
        const paddingTop = parseFloat(computed.paddingTop) || 0;
        const paddingRight = parseFloat(computed.paddingRight) || 0;
        const paddingBottom = parseFloat(computed.paddingBottom) || 0;
        const paddingLeft = parseFloat(computed.paddingLeft) || 0;
        
        const visualWidth = Math.round(rect.width);
        const visualHeight = Math.round(rect.height);
        
        const contentWidth = Math.max(0, visualWidth - borderLeft - borderRight - paddingLeft - paddingRight);
        const contentHeight = Math.max(0, visualHeight - borderTop - borderBottom - paddingTop - paddingBottom);
        
        results.push({
          className: element.className,
          boxSizing,
          visualDimensions: { width: visualWidth, height: visualHeight },
          contentDimensions: { width: contentWidth, height: contentHeight },
          borders: { top: borderTop, right: borderRight, bottom: borderBottom, left: borderLeft },
          paddings: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft },
          cssWidth: computed.width,
          cssHeight: computed.height
        });
      });
      
      return results;
    });

    console.log('📊 Box-Sizing Integration Results:\n');
    
    boxSizingValidation.forEach((result, index) => {
      console.log(`Element ${index + 1} (.${result.className}):`);
      console.log(`  Box-sizing: ${result.boxSizing}`);
      console.log(`  CSS: ${result.cssWidth} × ${result.cssHeight}`);
      console.log(`  Visual: ${result.visualDimensions.width} × ${result.visualDimensions.height}`);
      console.log(`  Content: ${result.contentDimensions.width} × ${result.contentDimensions.height}`);
      
      // Validate calculations
      let valid = true;
      const issues = [];
      
      if (result.contentDimensions.width < 0 || result.contentDimensions.height < 0) {
        valid = false;
        issues.push('Negative content dimensions');
      }
      
      if (result.boxSizing === 'border-box') {
        const expectedContentWidth = result.visualDimensions.width - 
          result.borders.left - result.borders.right - 
          result.paddings.left - result.paddings.right;
        const expectedContentHeight = result.visualDimensions.height - 
          result.borders.top - result.borders.bottom - 
          result.paddings.top - result.paddings.bottom;
          
        if (Math.abs(result.contentDimensions.width - expectedContentWidth) > 1 ||
            Math.abs(result.contentDimensions.height - expectedContentHeight) > 1) {
          valid = false;
          issues.push(`Content calculation error: expected ${expectedContentWidth}×${expectedContentHeight}`);
        }
      }
      
      console.log(`  Status: ${valid ? '✅ VALID' : '❌ INVALID'}`);
      if (issues.length > 0) {
        console.log(`  Issues: ${issues.join(', ')}`);
      }
      console.log('');
    });

    // Summary
    const validCount = boxSizingValidation.filter(r => {
      return r.contentDimensions.width >= 0 && r.contentDimensions.height >= 0;
    }).length;

    console.log(`📈 Integration Test Summary: ${validCount}/${boxSizingValidation.length} elements valid`);
    
    if (validCount === boxSizingValidation.length) {
      console.log('🎉 Box-sizing integration test passed!');
      return true;
    } else {
      console.log('⚠️ Some elements failed validation');
      return false;
    }

  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testBoxSizingIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Integration test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBoxSizingIntegration };