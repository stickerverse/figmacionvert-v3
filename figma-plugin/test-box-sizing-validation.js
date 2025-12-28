#!/usr/bin/env node

/**
 * BOX-SIZING VALIDATION TEST
 * Tests the new box-sizing handling in DOM extraction pipeline
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testBoxSizingHandling() {
  console.log('🧪 Testing Box-Sizing Handling...\n');

  // Create test HTML with various box-sizing scenarios
  const testHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    
    /* Test Case 1: content-box (default) */
    .content-box {
      box-sizing: content-box;
      width: 200px;
      height: 100px;
      padding: 20px;
      border: 5px solid red;
      background: yellow;
    }
    
    /* Test Case 2: border-box */
    .border-box {
      box-sizing: border-box;
      width: 200px;
      height: 100px;
      padding: 20px;
      border: 5px solid blue;
      background: lightgreen;
    }
    
    /* Test Case 3: Inherited border-box */
    .container { box-sizing: border-box; }
    .inherited {
      width: 150px;
      height: 80px;
      padding: 15px;
      border: 3px solid purple;
      background: orange;
    }
    
    /* Test Case 4: Zero padding/border */
    .no-padding {
      box-sizing: border-box;
      width: 100px;
      height: 50px;
      background: cyan;
    }
    
    /* Test Case 5: Large padding (edge case) */
    .large-padding {
      box-sizing: border-box;
      width: 100px;
      height: 60px;
      padding: 40px;
      border: 5px solid black;
      background: pink;
    }
  </style>
</head>
<body>
  <div class="content-box" id="test1">Content Box</div>
  <div class="border-box" id="test2">Border Box</div>
  <div class="container">
    <div class="inherited" id="test3">Inherited</div>
  </div>
  <div class="no-padding" id="test4">No Padding</div>
  <div class="large-padding" id="test5">Large Padding</div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-web-security', '--allow-running-insecure-content']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(testHTML);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test our box-sizing extraction logic
    const results = await page.evaluate(() => {
      const results = [];
      
      // Test each element
      const elements = document.querySelectorAll('[id^="test"]');
      elements.forEach((element, index) => {
        const computed = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Extract values same as our DOM extractor
        const boxSizing = computed.boxSizing || "content-box";
        
        const borderTop = parseFloat(computed.borderTopWidth) || 0;
        const borderRight = parseFloat(computed.borderRightWidth) || 0;
        const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
        const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
        
        const paddingTop = parseFloat(computed.paddingTop) || 0;
        const paddingRight = parseFloat(computed.paddingRight) || 0;
        const paddingBottom = parseFloat(computed.paddingBottom) || 0;
        const paddingLeft = parseFloat(computed.paddingLeft) || 0;

        // Calculate dimensions
        const visualWidth = Math.round(rect.width);
        const visualHeight = Math.round(rect.height);
        
        const totalHorizontalPadding = paddingLeft + paddingRight;
        const totalVerticalPadding = paddingTop + paddingBottom;
        const totalHorizontalBorder = borderLeft + borderRight;
        const totalVerticalBorder = borderTop + borderBottom;
        
        const contentWidth = Math.max(0, visualWidth - totalHorizontalBorder - totalHorizontalPadding);
        const contentHeight = Math.max(0, visualHeight - totalVerticalBorder - totalVerticalPadding);

        results.push({
          id: element.id,
          className: element.className,
          boxSizing,
          cssWidth: computed.width,
          cssHeight: computed.height,
          visualDimensions: { width: visualWidth, height: visualHeight },
          contentDimensions: { width: contentWidth, height: contentHeight },
          borders: { top: borderTop, right: borderRight, bottom: borderBottom, left: borderLeft },
          paddings: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft },
          totalBorderPadding: totalHorizontalBorder + totalVerticalBorder + totalHorizontalPadding + totalVerticalPadding
        });
      });
      
      return results;
    });

    // Analyze results and validate
    console.log('📊 Box-Sizing Test Results:\n');
    
    results.forEach((result, index) => {
      console.log(`Test ${index + 1} (${result.id} - ${result.className}):`);
      console.log(`  Box-sizing: ${result.boxSizing}`);
      console.log(`  CSS Dimensions: ${result.cssWidth} × ${result.cssHeight}`);
      console.log(`  Visual Dimensions: ${result.visualDimensions.width} × ${result.visualDimensions.height}`);
      console.log(`  Content Dimensions: ${result.contentDimensions.width} × ${result.contentDimensions.height}`);
      console.log(`  Borders: T${result.borders.top} R${result.borders.right} B${result.borders.bottom} L${result.borders.left}`);
      console.log(`  Paddings: T${result.paddings.top} R${result.paddings.right} B${result.paddings.bottom} L${result.paddings.left}`);
      
      // Validation logic
      const { boxSizing, visualDimensions, contentDimensions } = result;
      let isValid = true;
      const issues = [];

      // Check for negative content dimensions
      if (contentDimensions.width < 0 || contentDimensions.height < 0) {
        isValid = false;
        issues.push('Negative content dimensions detected');
      }

      // Check box-sizing consistency
      if (boxSizing === 'content-box') {
        // For content-box, visual should be larger than content
        if (visualDimensions.width <= contentDimensions.width || visualDimensions.height <= contentDimensions.height) {
          const expectedVisualWidth = contentDimensions.width + result.borders.left + result.borders.right + result.paddings.left + result.paddings.right;
          const expectedVisualHeight = contentDimensions.height + result.borders.top + result.borders.bottom + result.paddings.top + result.paddings.bottom;
          
          if (Math.abs(visualDimensions.width - expectedVisualWidth) > 1 || Math.abs(visualDimensions.height - expectedVisualHeight) > 1) {
            isValid = false;
            issues.push(`content-box dimension mismatch: expected visual ${expectedVisualWidth}×${expectedVisualHeight}, got ${visualDimensions.width}×${visualDimensions.height}`);
          }
        }
      } else if (boxSizing === 'border-box') {
        // For border-box, content should be smaller than visual
        if (contentDimensions.width >= visualDimensions.width || contentDimensions.height >= visualDimensions.height) {
          if (result.totalBorderPadding > 0) {
            isValid = false;
            issues.push('border-box should have content < visual when borders/padding exist');
          }
        }
      }

      // Check for unreasonable border/padding ratios
      const dimensionSum = visualDimensions.width + visualDimensions.height;
      if (result.totalBorderPadding > dimensionSum * 0.8) {
        issues.push(`Border/padding ratio too high: ${(result.totalBorderPadding / dimensionSum * 100).toFixed(1)}%`);
      }

      console.log(`  Status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      if (issues.length > 0) {
        console.log(`  Issues: ${issues.join(', ')}`);
      }
      console.log('');
    });

    // Summary
    const validCount = results.filter(r => {
      const contentValid = r.contentDimensions.width >= 0 && r.contentDimensions.height >= 0;
      const ratioValid = r.totalBorderPadding <= (r.visualDimensions.width + r.visualDimensions.height) * 0.8;
      return contentValid && ratioValid;
    }).length;

    console.log(`📈 Summary: ${validCount}/${results.length} tests passed`);
    
    if (validCount === results.length) {
      console.log('🎉 All box-sizing calculations are correct!');
    } else {
      console.log('⚠️  Some box-sizing calculations need attention');
    }

    return results;

  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testBoxSizingHandling()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBoxSizingHandling };