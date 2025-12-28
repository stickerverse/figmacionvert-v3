#!/usr/bin/env node
/**
 * Fidelity Audit Tool
 *
 * Analyzes captured schema for pixel-perfect fidelity coverage.
 * Outputs PASS/FAIL for each fidelity dimension with evidence.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SCHEMA_PATH = process.argv[2] || './page-capture-1766834949060.json';

/**
 * Calculate SHA256 hash of buffer
 */
function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Load and parse schema with verification
 */
function loadSchema() {
  const inputArg = SCHEMA_PATH;
  const resolved = path.resolve(process.cwd(), inputArg);

  console.log(`Loading schema: ${inputArg}`);
  console.log(`Resolved path: ${resolved}`);

  const rawBytes = fs.readFileSync(resolved);
  console.log(`File size: ${rawBytes.length} bytes`);
  console.log(`SHA256: ${sha256(rawBytes)}\n`);

  const raw = JSON.parse(rawBytes.toString('utf8'));

  // Handle multi-viewport schema format
  if (raw.multiViewport && raw.captures && raw.captures.length > 0) {
    console.log(`Multi-viewport schema detected (${raw.captures.length} viewports)\n`);
    return raw.captures[0].data;
  }

  return raw;
}

/**
 * Flatten tree into array of all nodes
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
 * Step 1: Extract schema metadata
 */
function analyzeMetadata(schema) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 1: SCHEMA METADATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  const metadata = {
    version: schema.version || 'MISSING',
    captureMode: schema.metadata?.captureMode || 'UNKNOWN',
    timestamp: schema.metadata?.timestamp || 'MISSING',
    url: schema.metadata?.url || 'MISSING',
    viewport: schema.metadata?.viewport || {},
    hasRoot: !!schema.root,
    stylesCount: schema.styles ? Object.keys(schema.styles).length : 0,
    assetsCount: schema.assets ? Object.keys(schema.assets).length : 0,
    hoverStatesCount: schema.hoverStates ? Object.keys(schema.hoverStates).length : 0,
  };

  console.log(`Schema Version: ${metadata.version}`);
  console.log(`Capture Mode: ${metadata.captureMode}`);
  console.log(`Timestamp: ${metadata.timestamp}`);
  console.log(`Source URL: ${metadata.url}`);
  console.log(`Viewport: ${JSON.stringify(metadata.viewport)}`);
  console.log(`Has Root: ${metadata.hasRoot}`);
  console.log(`Styles: ${metadata.stylesCount}`);
  console.log(`Assets: ${metadata.assetsCount}`);
  console.log(`Hover States: ${metadata.hoverStatesCount}\n`);

  return metadata;
}

/**
 * Step 2: Node type distribution
 */
function analyzeNodeTypes(schema, allNodes) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('NODE TYPE DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const typeCounts = {};
  const tagCounts = {};
  let invalidNodes = 0;
  let nanValues = 0;
  let infinityValues = 0;

  console.log(`Total Nodes: ${allNodes.length}\n`);

  allNodes.forEach((node, idx) => {
    // Count by type
    const type = node.type || 'MISSING_TYPE';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Count by tag
    if (node.htmlTag) {
      tagCounts[node.htmlTag] = (tagCounts[node.htmlTag] || 0) + 1;
    }

    // Check for invalid values
    if (!node.layout && !node.absoluteLayout) {
      invalidNodes++;
    }

    // Check for NaN/Infinity
    const checkNumeric = (obj, path = '') => {
      if (typeof obj === 'number') {
        if (isNaN(obj)) nanValues++;
        if (!isFinite(obj)) infinityValues++;
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, val]) => {
          checkNumeric(val, path ? `${path}.${key}` : key);
        });
      }
    };
    checkNumeric(node);
  });

  console.log('By Node Type:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)} ${count.toString().padStart(6)}`);
    });

  console.log('\nBy HTML Tag (top 20):');
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([tag, count]) => {
      console.log(`  ${tag.padEnd(20)} ${count.toString().padStart(6)}`);
    });

  console.log('\nData Quality:');
  console.log(`  Invalid nodes: ${invalidNodes}`);
  console.log(`  NaN values: ${nanValues}`);
  console.log(`  Infinity values: ${infinityValues}\n`);

  return { typeCounts, tagCounts, invalidNodes, nanValues, infinityValues };
}

/**
 * Step 3: Fidelity Coverage Audit
 */
function auditFidelity(schema, allNodes) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 2: FIDELITY COVERAGE AUDIT');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {};

  // Helper: check if field exists in any node
  const fieldExists = (fieldPath, nodeFilter = null) => {
    const nodes = nodeFilter ? allNodes.filter(nodeFilter) : allNodes;

    return nodes.some(node => {
      const parts = fieldPath.split('.');
      let val = node;
      for (const part of parts) {
        if (val == null) return false;
        val = val[part];
      }
      return val !== undefined && val !== null;
    });
  };

  // Helper: get sample value
  const getSample = (fieldPath, nodeFilter = null) => {
    const nodes = nodeFilter ? allNodes.filter(nodeFilter) : allNodes;

    for (const node of nodes) {
      const parts = fieldPath.split('.');
      let val = node;
      for (const part of parts) {
        if (val == null) break;
        val = val[part];
      }
      if (val !== undefined && val !== null) {
        return JSON.stringify(val).slice(0, 100);
      }
    }
    return 'MISSING';
  };

  // Helper: count nodes matching condition
  const countNodes = (predicate) => {
    return allNodes.filter(predicate).length;
  };

  // LAYOUT AUDIT
  results.layout = {
    absolute_positioning: {
      // Check both x/y and left/top variants
      pass: (fieldExists('absoluteLayout.left') && fieldExists('absoluteLayout.top')) ||
            (fieldExists('absoluteLayout.x') && fieldExists('absoluteLayout.y')),
      evidence: `absoluteLayout: ${getSample('absoluteLayout')} / x: ${getSample('absoluteLayout.x')} / left: ${getSample('absoluteLayout.left')}`,
    },
    dpr_scaling: {
      pass: schema.metadata?.viewport?.devicePixelRatio !== undefined,
      evidence: `DPR: ${schema.metadata?.viewport?.devicePixelRatio || 'MISSING'}`,
    },
    scroll_offsets: {
      pass: fieldExists('scrollOffset') || fieldExists('layout.scrollX'),
      evidence: `scrollOffset: ${getSample('scrollOffset')}`,
    },
    transform_matrix: {
      // Fixed: Add parentheses for correct precedence
      pass: fieldExists('transform.matrix') ||
            (fieldExists('layoutContext.transform') &&
             countNodes(n => n.layoutContext?.transform && n.layoutContext.transform !== 'none') > 0),
      evidence: `transform.matrix: ${getSample('transform.matrix')} / layoutContext.transform nodes: ${countNodes(n => n.layoutContext?.transform && n.layoutContext.transform !== 'none')}`,
    },
    transform_individual: {
      pass: fieldExists('transform.rotate') || fieldExists('transform.scale'),
      evidence: `transform.rotate: ${getSample('transform.rotate')} / transform.scale: ${getSample('transform.scale')}`,
    },
    position_fixed: {
      pass: countNodes(n => n.layoutContext?.position === 'fixed') > 0,
      evidence: `Fixed nodes: ${countNodes(n => n.layoutContext?.position === 'fixed')}`,
    },
    position_sticky: {
      pass: countNodes(n => n.layoutContext?.position === 'sticky') > 0,
      evidence: `Sticky nodes: ${countNodes(n => n.layoutContext?.position === 'sticky')}`,
    },
  };

  // STACKING AUDIT
  results.stacking = {
    z_index: {
      pass: fieldExists('zIndex') || fieldExists('layoutContext.zIndex'),
      evidence: `zIndex sample: ${getSample('zIndex')} / layoutContext.zIndex: ${getSample('layoutContext.zIndex')}`,
    },
    stacking_contexts: {
      pass: fieldExists('stackingContext') || fieldExists('layoutContext._stackingContext'),
      evidence: `stackingContext: ${getSample('stackingContext')} / layoutContext._stackingContext: ${getSample('layoutContext._stackingContext')}`,
    },
    opacity_groups: {
      pass: fieldExists('opacity') || fieldExists('effects'),
      evidence: `opacity sample: ${getSample('opacity')}`,
    },
    clip_overflow: {
      pass: fieldExists('clipsContent') || fieldExists('layoutContext.overflow'),
      evidence: `clipsContent: ${getSample('clipsContent')} / layoutContext.overflow: ${getSample('layoutContext.overflow')}`,
    },
    masks: {
      pass: fieldExists('mask') || fieldExists('clipPath'),
      evidence: `mask sample: ${getSample('mask')}`,
    },
  };

  // VISUAL AUDIT
  results.visuals = {
    fills: {
      pass: fieldExists('fills') || fieldExists('backgrounds'),
      evidence: `fills: ${getSample('fills')} / backgrounds: ${getSample('backgrounds')}`,
    },
    borders: {
      pass: fieldExists('strokes') || fieldExists('layout.border'),
      evidence: `strokes: ${getSample('strokes')}`,
    },
    border_radius_per_corner: {
      pass: fieldExists('cornerRadius') || fieldExists('layout.borderRadius'),
      evidence: `cornerRadius: ${getSample('cornerRadius')} / borderRadius: ${getSample('layout.borderRadius')}`,
    },
    shadows: {
      pass: fieldExists('effects'),
      evidence: `effects: ${getSample('effects')}`,
    },
    gradients: {
      pass: countNodes(n => n.fills?.some(f => f.type?.includes('GRADIENT')) || n.backgrounds?.some(f => f.type?.includes('GRADIENT'))) > 0,
      evidence: `Gradient fills: ${countNodes(n => n.fills?.some(f => f.type?.includes('GRADIENT')) || n.backgrounds?.some(f => f.type?.includes('GRADIENT')))}`,
    },
    filters: {
      pass: fieldExists('filters') || fieldExists('layout.filter'),
      evidence: `filters: ${getSample('filters')} / layout.filter: ${getSample('layout.filter')}`,
    },
    blend_modes: {
      pass: fieldExists('blendMode') || fieldExists('layout.mixBlendMode'),
      evidence: `blendMode: ${getSample('blendMode')} / mixBlendMode: ${getSample('layout.mixBlendMode')}`,
    },
  };

  // TEXT AUDIT
  const textNodes = allNodes.filter(n => n.type === 'TEXT');
  results.text = {
    font_family: {
      pass: fieldExists('fontName.family', n => n.type === 'TEXT') || fieldExists('textStyle.fontFamily', n => n.type === 'TEXT'),
      evidence: `fontName.family: ${getSample('fontName.family', n => n.type === 'TEXT')} / textStyle.fontFamily: ${getSample('textStyle.fontFamily', n => n.type === 'TEXT')}`,
    },
    font_weight: {
      pass: fieldExists('textStyle.fontWeight', n => n.type === 'TEXT'),
      evidence: `textStyle.fontWeight: ${getSample('textStyle.fontWeight', n => n.type === 'TEXT')}`,
    },
    font_style: {
      pass: fieldExists('fontName.style', n => n.type === 'TEXT') || fieldExists('textStyle.fontStyle', n => n.type === 'TEXT'),
      evidence: `fontName.style: ${getSample('fontName.style', n => n.type === 'TEXT')} / textStyle.fontStyle: ${getSample('textStyle.fontStyle', n => n.type === 'TEXT')}`,
    },
    line_height: {
      pass: fieldExists('lineHeight', n => n.type === 'TEXT') || fieldExists('layout.lineHeight', n => n.type === 'TEXT'),
      evidence: `lineHeight: ${getSample('lineHeight', n => n.type === 'TEXT')} / layout.lineHeight: ${getSample('layout.lineHeight', n => n.type === 'TEXT')}`,
    },
    letter_spacing: {
      pass: fieldExists('letterSpacing', n => n.type === 'TEXT') || fieldExists('layout.letterSpacing', n => n.type === 'TEXT'),
      evidence: `letterSpacing: ${getSample('letterSpacing', n => n.type === 'TEXT')} / layout.letterSpacing: ${getSample('layout.letterSpacing', n => n.type === 'TEXT')}`,
    },
    text_transform: {
      // Fixed: Check actual schema fields (textTransform, textStyle.textTransform, textCase)
      pass: fieldExists('textTransform', n => n.type === 'TEXT') ||
            fieldExists('textStyle.textTransform', n => n.type === 'TEXT') ||
            fieldExists('textCase', n => n.type === 'TEXT'),
      evidence: `textTransform: ${getSample('textTransform', n => n.type === 'TEXT')} / textStyle.textTransform: ${getSample('textStyle.textTransform', n => n.type === 'TEXT')} / textCase: ${getSample('textCase', n => n.type === 'TEXT')}`,
    },
    text_decoration: {
      pass: fieldExists('textDecoration', n => n.type === 'TEXT') || fieldExists('layout.textDecoration', n => n.type === 'TEXT'),
      evidence: `textDecoration: ${getSample('textDecoration', n => n.type === 'TEXT')} / layout.textDecoration: ${getSample('layout.textDecoration', n => n.type === 'TEXT')}`,
    },
    text_wrapping: {
      pass: fieldExists('textAutoResize', n => n.type === 'TEXT') || fieldExists('layout.whiteSpace', n => n.type === 'TEXT'),
      evidence: `textAutoResize: ${getSample('textAutoResize', n => n.type === 'TEXT')} / whiteSpace: ${getSample('layout.whiteSpace', n => n.type === 'TEXT')}`,
    },
    text_bounds: {
      pass: fieldExists('absoluteLayout', n => n.type === 'TEXT'),
      evidence: `text nodes with bounds: ${countNodes(n => n.type === 'TEXT' && n.absoluteLayout)}`,
    },
    baseline_alignment: {
      pass: fieldExists('baselineOffset', n => n.type === 'TEXT') || fieldExists('layout.verticalAlign', n => n.type === 'TEXT'),
      evidence: `baselineOffset: ${getSample('baselineOffset', n => n.type === 'TEXT')} / verticalAlign: ${getSample('layout.verticalAlign', n => n.type === 'TEXT')}`,
    },
  };

  // IMAGE AUDIT
  results.images = {
    intrinsic_size: {
      pass: fieldExists('intrinsicSize', n => n.type === 'IMAGE') || fieldExists('naturalWidth', n => n.type === 'IMAGE'),
      evidence: `intrinsicSize: ${getSample('intrinsicSize', n => n.type === 'IMAGE')}`,
    },
    object_fit: {
      pass: fieldExists('imageFit', n => n.type === 'IMAGE') || fieldExists('layout.objectFit', n => n.type === 'IMAGE'),
      evidence: `imageFit: ${getSample('imageFit', n => n.type === 'IMAGE')} / objectFit: ${getSample('layout.objectFit', n => n.type === 'IMAGE')}`,
    },
    aspect_ratio: {
      pass: fieldExists('aspectRatio', n => n.type === 'IMAGE') || fieldExists('layout.aspectRatio', n => n.type === 'IMAGE'),
      evidence: `aspectRatio: ${getSample('aspectRatio', n => n.type === 'IMAGE')}`,
    },
    exif_orientation: {
      pass: fieldExists('exifOrientation', n => n.type === 'IMAGE') || fieldExists('orientation', n => n.type === 'IMAGE'),
      evidence: `exifOrientation: ${getSample('exifOrientation', n => n.type === 'IMAGE')}`,
    },
    cors_handling: {
      pass: fieldExists('crossOrigin', n => n.type === 'IMAGE') || fieldExists('corsMode', n => n.type === 'IMAGE'),
      evidence: `CORS: ${getSample('crossOrigin', n => n.type === 'IMAGE')}`,
    },
    format_support: {
      pass: countNodes(n => n.type === 'IMAGE') > 0,
      evidence: `Image nodes: ${countNodes(n => n.type === 'IMAGE')}`,
    },
    alpha_channel: {
      pass: fieldExists('hasAlpha', n => n.type === 'IMAGE') || fieldExists('opacity', n => n.type === 'IMAGE'),
      evidence: `hasAlpha: ${getSample('hasAlpha', n => n.type === 'IMAGE')}`,
    },
  };

  // SPECIAL ELEMENTS AUDIT
  results.special = {
    svg_handling: {
      pass: countNodes(n => n.type === 'SVG' || n.htmlTag === 'svg') > 0,
      evidence: `SVG nodes: ${countNodes(n => n.type === 'SVG' || n.htmlTag === 'svg')}`,
    },
    canvas_fallback: {
      pass: countNodes(n => n.htmlTag === 'canvas') > 0 && fieldExists('canvasData'),
      evidence: `Canvas nodes: ${countNodes(n => n.htmlTag === 'canvas')}`,
    },
    video_fallback: {
      pass: countNodes(n => n.htmlTag === 'video') > 0,
      evidence: `Video nodes: ${countNodes(n => n.htmlTag === 'video')}`,
    },
    pseudo_elements: {
      pass: fieldExists('pseudoElements') || fieldExists('beforeContent') || fieldExists('afterContent'),
      evidence: `Nodes with pseudo: ${countNodes(n => n.pseudoElements || n.beforeContent || n.afterContent)}`,
    },
  };

  // Print results
  Object.entries(results).forEach(([category, checks]) => {
    console.log(`\n${category.toUpperCase()}:`);
    Object.entries(checks).forEach(([check, result]) => {
      const status = result.pass ? '✓ PASS' : '✗ FAIL';
      const color = result.pass ? '\x1b[32m' : '\x1b[31m';
      console.log(`  ${color}${status}\x1b[0m ${check.padEnd(25)} ${result.evidence}`);
    });
  });

  console.log('\n');
  return results;
}

/**
 * Step 4: Generate fidelity report
 */
function generateReport(schema, metadata, nodeStats, fidelityResults) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('FIDELITY BLOCKERS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const blockers = [];

  Object.entries(fidelityResults).forEach(([category, checks]) => {
    Object.entries(checks).forEach(([check, result]) => {
      if (!result.pass) {
        blockers.push({
          category,
          check,
          evidence: result.evidence,
        });
      }
    });
  });

  console.log(`Total Blockers: ${blockers.length}\n`);

  if (blockers.length > 0) {
    blockers.forEach((blocker, idx) => {
      console.log(`${idx + 1}. ${blocker.category.toUpperCase()} / ${blocker.check}`);
      console.log(`   Evidence: ${blocker.evidence}`);
      console.log(`   Status: MISSING FROM SCHEMA\n`);
    });
  } else {
    console.log('✓ All fidelity checks PASSED!\n');
  }

  // Calculate pass rate
  const totalChecks = Object.values(fidelityResults).reduce(
    (sum, category) => sum + Object.keys(category).length,
    0
  );
  const passedChecks = Object.values(fidelityResults).reduce(
    (sum, category) => sum + Object.values(category).filter(c => c.pass).length,
    0
  );
  const passRate = ((passedChecks / totalChecks) * 100).toFixed(1);

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`FIDELITY SCORE: ${passRate}% (${passedChecks}/${totalChecks} checks passed)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  return blockers;
}

/**
 * Main execution
 */
function main() {
  try {
    const schema = loadSchema();
    const metadata = analyzeMetadata(schema);

    // Flatten tree into array for analysis
    const allNodes = flattenTree(schema.root);
    console.log(`Flattened tree: ${allNodes.length} total nodes\n`);

    const nodeStats = analyzeNodeTypes(schema, allNodes);
    const fidelityResults = auditFidelity(schema, allNodes);
    const blockers = generateReport(schema, metadata, nodeStats, fidelityResults);

    // Write blockers to file for further analysis
    fs.writeFileSync(
      './fidelity-blockers.json',
      JSON.stringify({ metadata, nodeStats, fidelityResults, blockers }, null, 2)
    );

    console.log('Full report saved to: fidelity-blockers.json\n');

    process.exit(blockers.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    process.exit(2);
  }
}

main();
