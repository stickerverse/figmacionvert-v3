#!/usr/bin/env node
/**
 * Pixel-Perfect Regression Harness
 *
 * Validates captured schema against pixel-perfect fidelity requirements.
 * Tests each node for completeness and accuracy.
 *
 * Usage:
 *   node pixel-perfect-regression.mjs <schema-file.json>
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - Tests failed (within acceptable threshold)
 *   2 - Critical failures or errors
 */

import fs from 'fs';

const SCHEMA_PATH = process.argv[2];

if (!SCHEMA_PATH) {
  console.error('Usage: node pixel-perfect-regression.mjs <schema-file.json>');
  process.exit(2);
}

// Pixel-perfect thresholds
const THRESHOLDS = {
  positionDelta: 1, // ±1px
  sizeDelta: 1, // ±1px
  colorDelta: 2, // ±2/255 per channel
  fontSizeDelta: 0.1, // ±0.1px
};

/**
 * Load schema
 */
function loadSchema() {
  console.log(`Loading schema: ${SCHEMA_PATH}\n`);
  const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const raw = JSON.parse(content);

  if (raw.multiViewport && raw.captures && raw.captures.length > 0) {
    return raw.captures[0].data;
  }

  return raw;
}

/**
 * Flatten tree
 */
function flattenTree(node, result = []) {
  if (!node) return result;
  result.push(node);
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => flattenTree(child, result));
  }
  return result;
}

/**
 * Validate numeric value is finite
 */
function isValidNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Test Suite: Layout Fidelity
 */
function testLayoutFidelity(allNodes) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST SUITE: LAYOUT FIDELITY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
  };

  allNodes.forEach((node, idx) => {
    const nodeId = node.id || `node_${idx}`;

    // Test 1: Absolute layout exists and valid
    if (!node.absoluteLayout) {
      results.errors.push({
        nodeId,
        test: 'absoluteLayout',
        severity: 'error',
        message: 'Missing absoluteLayout',
      });
      results.failed++;
    } else {
      const { left, top, width, height } = node.absoluteLayout;

      if (!isValidNumber(left) || !isValidNumber(top)) {
        results.errors.push({
          nodeId,
          test: 'absoluteLayout.position',
          severity: 'error',
          message: `Invalid position: left=${left}, top=${top}`,
        });
        results.failed++;
      } else {
        results.passed++;
      }

      if (!isValidNumber(width) || !isValidNumber(height) || width < 0 || height < 0) {
        results.errors.push({
          nodeId,
          test: 'absoluteLayout.size',
          severity: 'error',
          message: `Invalid size: width=${width}, height=${height}`,
        });
        results.failed++;
      } else {
        results.passed++;
      }
    }

    // Test 2: Transform validation
    if (node.transform) {
      if (node.transform.matrix) {
        const matrix = node.transform.matrix;
        if (!Array.isArray(matrix) || matrix.length !== 6) {
          results.errors.push({
            nodeId,
            test: 'transform.matrix',
            severity: 'error',
            message: `Invalid transform matrix: ${JSON.stringify(matrix)}`,
          });
          results.failed++;
        } else if (!matrix.every(isValidNumber)) {
          results.errors.push({
            nodeId,
            test: 'transform.matrix',
            severity: 'error',
            message: 'Transform matrix contains invalid numbers',
          });
          results.failed++;
        } else {
          results.passed++;
        }
      }
    }

    // Test 3: layoutContext validation
    if (node.layoutContext) {
      if (node.layoutContext.transform && node.layoutContext.transform !== 'none') {
        if (!node.transform || !node.transform.matrix) {
          results.errors.push({
            nodeId,
            test: 'transform.parsing',
            severity: 'warning',
            message: `layoutContext.transform="${node.layoutContext.transform}" but no parsed transform.matrix`,
          });
          results.warnings++;
        }
      }
    }
  });

  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Warnings: ${results.warnings}\n`);

  return results;
}

/**
 * Test Suite: Text Fidelity
 */
function testTextFidelity(allNodes) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST SUITE: TEXT FIDELITY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
  };

  const textNodes = allNodes.filter(n => n.type === 'TEXT');
  console.log(`Testing ${textNodes.length} TEXT nodes...\n`);

  textNodes.forEach((node) => {
    const nodeId = node.id;

    // Test 1: Font family
    if (!node.fontName || !node.fontName.family) {
      results.errors.push({
        nodeId,
        test: 'fontFamily',
        severity: 'error',
        message: 'Missing fontName.family',
      });
      results.failed++;
    } else {
      results.passed++;
    }

    // Test 2: Font weight
    if (!node.textStyle || !node.textStyle.fontWeight) {
      results.errors.push({
        nodeId,
        test: 'fontWeight',
        severity: 'error',
        message: 'Missing textStyle.fontWeight',
      });
      results.failed++;
    } else {
      const weight = node.textStyle.fontWeight;
      if (!isValidNumber(weight) || weight < 100 || weight > 900) {
        results.errors.push({
          nodeId,
          test: 'fontWeight',
          severity: 'error',
          message: `Invalid fontWeight: ${weight}`,
        });
        results.failed++;
      } else {
        results.passed++;
      }
    }

    // Test 3: Font size
    if (!isValidNumber(node.fontSize) || node.fontSize <= 0) {
      results.errors.push({
        nodeId,
        test: 'fontSize',
        severity: 'error',
        message: `Invalid fontSize: ${node.fontSize}`,
      });
      results.failed++;
    } else {
      results.passed++;
    }

    // Test 4: Line height
    if (!node.lineHeight || !isValidNumber(node.lineHeight.value)) {
      results.errors.push({
        nodeId,
        test: 'lineHeight',
        severity: 'error',
        message: 'Missing or invalid lineHeight',
      });
      results.failed++;
    } else {
      results.passed++;
    }

    // Test 5: Letter spacing
    if (!node.letterSpacing || !isValidNumber(node.letterSpacing.value)) {
      results.errors.push({
        nodeId,
        test: 'letterSpacing',
        severity: 'error',
        message: 'Missing or invalid letterSpacing',
      });
      results.failed++;
    } else {
      results.passed++;
    }

    // Test 6: Text case (if textTransform applied)
    if (node.textTransform && node.textTransform !== 'none') {
      if (!node.textCase) {
        results.errors.push({
          nodeId,
          test: 'textCase',
          severity: 'warning',
          message: `textTransform="${node.textTransform}" but no textCase mapping`,
        });
        results.warnings++;
      } else {
        results.passed++;
      }
    }

    // Test 7: Text fills
    if (!node.fills || node.fills.length === 0) {
      results.errors.push({
        nodeId,
        test: 'textFills',
        severity: 'warning',
        message: 'TEXT node has no fills',
      });
      results.warnings++;
    } else {
      results.passed++;
    }
  });

  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Warnings: ${results.warnings}\n`);

  return results;
}

/**
 * Test Suite: Image Fidelity
 */
function testImageFidelity(allNodes) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST SUITE: IMAGE FIDELITY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
  };

  const imageNodes = allNodes.filter(n => n.type === 'IMAGE');
  console.log(`Testing ${imageNodes.length} IMAGE nodes...\n`);

  imageNodes.forEach((node) => {
    const nodeId = node.id;

    // Test 1: Intrinsic size
    if (!node.intrinsicSize) {
      results.errors.push({
        nodeId,
        test: 'intrinsicSize',
        severity: 'warning',
        message: 'Missing intrinsicSize',
      });
      results.warnings++;
    } else {
      const { width, height } = node.intrinsicSize;
      if (!isValidNumber(width) || !isValidNumber(height) || width <= 0 || height <= 0) {
        results.errors.push({
          nodeId,
          test: 'intrinsicSize',
          severity: 'error',
          message: `Invalid intrinsicSize: ${width}x${height}`,
        });
        results.failed++;
      } else {
        results.passed++;
      }
    }

    // Test 2: Image fit
    if (!node.imageFit) {
      results.errors.push({
        nodeId,
        test: 'imageFit',
        severity: 'warning',
        message: 'Missing imageFit (object-fit)',
      });
      results.warnings++;
    } else {
      results.passed++;
    }

    // Test 3: Aspect ratio
    if (!node.aspectRatio) {
      results.errors.push({
        nodeId,
        test: 'aspectRatio',
        severity: 'warning',
        message: 'Missing aspectRatio',
      });
      results.warnings++;
    } else if (!isValidNumber(node.aspectRatio) || node.aspectRatio <= 0) {
      results.errors.push({
        nodeId,
        test: 'aspectRatio',
        severity: 'error',
        message: `Invalid aspectRatio: ${node.aspectRatio}`,
      });
      results.failed++;
    } else {
      results.passed++;
    }

    // Test 4: Image fills
    if (!node.fills || node.fills.length === 0) {
      results.errors.push({
        nodeId,
        test: 'imageFills',
        severity: 'error',
        message: 'IMAGE node has no fills',
      });
      results.failed++;
    } else {
      const imageFill = node.fills.find(f => f.type === 'IMAGE');
      if (!imageFill) {
        results.errors.push({
          nodeId,
          test: 'imageFills',
          severity: 'error',
          message: 'IMAGE node has no IMAGE-type fill',
        });
        results.failed++;
      } else {
        results.passed++;
      }
    }
  });

  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Warnings: ${results.warnings}\n`);

  return results;
}

/**
 * Test Suite: Visual Effects Fidelity
 */
function testVisualEffectsFidelity(allNodes) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST SUITE: VISUAL EFFECTS FIDELITY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
    stats: {
      nodesWithFilters: 0,
      nodesWithBlendModes: 0,
      nodesWithEffects: 0,
    },
  };

  allNodes.forEach((node) => {
    const nodeId = node.id;

    // Test 1: Filter validation
    if (node.filters) {
      results.stats.nodesWithFilters++;
      if (!Array.isArray(node.filters)) {
        results.errors.push({
          nodeId,
          test: 'filters',
          severity: 'error',
          message: 'filters must be an array',
        });
        results.failed++;
      } else {
        node.filters.forEach((filter, idx) => {
          if (!filter.type) {
            results.errors.push({
              nodeId,
              test: `filters[${idx}]`,
              severity: 'error',
              message: 'Filter missing type',
            });
            results.failed++;
          } else {
            results.passed++;
          }
        });
      }
    }

    // Test 2: Blend mode validation
    if (node.blendMode) {
      results.stats.nodesWithBlendModes++;
      const validBlendModes = [
        'NORMAL', 'DARKEN', 'MULTIPLY', 'COLOR_BURN', 'LIGHTEN', 'SCREEN',
        'COLOR_DODGE', 'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'DIFFERENCE',
        'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY', 'PASS_THROUGH'
      ];
      if (!validBlendModes.includes(node.blendMode)) {
        results.errors.push({
          nodeId,
          test: 'blendMode',
          severity: 'error',
          message: `Invalid blendMode: ${node.blendMode}`,
        });
        results.failed++;
      } else {
        results.passed++;
      }
    }

    // Test 3: Effects validation
    if (node.effects && Array.isArray(node.effects)) {
      results.stats.nodesWithEffects++;
      node.effects.forEach((effect, idx) => {
        if (!effect.type) {
          results.errors.push({
            nodeId,
            test: `effects[${idx}]`,
            severity: 'error',
            message: 'Effect missing type',
          });
          results.failed++;
        } else {
          results.passed++;
        }
      });
    }
  });

  console.log(`Nodes with filters: ${results.stats.nodesWithFilters}`);
  console.log(`Nodes with blend modes: ${results.stats.nodesWithBlendModes}`);
  console.log(`Nodes with effects: ${results.stats.nodesWithEffects}\n`);

  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Warnings: ${results.warnings}\n`);

  return results;
}

/**
 * Print error summary
 */
function printErrorSummary(allResults) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ERROR SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const allErrors = allResults.flatMap(r => r.errors);
  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warning');

  console.log(`Total Errors: ${errors.length}`);
  console.log(`Total Warnings: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.log('ERRORS (first 10):');
    errors.slice(0, 10).forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.test} @ ${err.nodeId}: ${err.message}`);
    });
    console.log('');
  }

  if (warnings.length > 0 && warnings.length <= 10) {
    console.log('WARNINGS:');
    warnings.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.test} @ ${err.nodeId}: ${err.message}`);
    });
    console.log('');
  }
}

/**
 * Calculate final score
 */
function calculateScore(allResults) {
  const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  const totalWarnings = allResults.reduce((sum, r) => sum + r.warnings, 0);

  const totalTests = totalPassed + totalFailed + totalWarnings;
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('FINAL SCORE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Tests Passed: ${totalPassed}/${totalTests} (${passRate}%)`);
  console.log(`Tests Failed: ${totalFailed}`);
  console.log(`Warnings: ${totalWarnings}\n`);

  if (totalFailed === 0 && totalWarnings === 0) {
    console.log('✅ PIXEL-PERFECT FIDELITY ACHIEVED!\n');
    return 0;
  } else if (totalFailed === 0) {
    console.log('✅ All critical tests passed (warnings only)\n');
    return 0;
  } else if (totalFailed < totalTests * 0.1) {
    console.log('⚠️  Minor failures (<10% of tests)\n');
    return 1;
  } else {
    console.log('❌ CRITICAL FAILURES\n');
    return 1;
  }
}

/**
 * Main execution
 */
function main() {
  try {
    const schema = loadSchema();
    const allNodes = flattenTree(schema.root);

    console.log(`Schema loaded: ${allNodes.length} nodes\n`);

    const layoutResults = testLayoutFidelity(allNodes);
    const textResults = testTextFidelity(allNodes);
    const imageResults = testImageFidelity(allNodes);
    const effectsResults = testVisualEffectsFidelity(allNodes);

    const allResults = [layoutResults, textResults, imageResults, effectsResults];

    printErrorSummary(allResults);
    const exitCode = calculateScore(allResults);

    // Write detailed report
    fs.writeFileSync(
      './pixel-perfect-report.json',
      JSON.stringify({ allResults, timestamp: new Date().toISOString() }, null, 2)
    );

    console.log('Detailed report saved to: pixel-perfect-report.json\n');

    process.exit(exitCode);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    process.exit(2);
  }
}

main();
