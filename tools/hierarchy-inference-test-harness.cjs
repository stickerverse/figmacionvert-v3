#!/usr/bin/env node

/**
 * Hierarchy Inference Test Harness
 *
 * Runs hierarchy inference on a captured JSON schema and outputs metrics.
 *
 * Usage:
 *   node tools/hierarchy-inference-test-harness.cjs <path-to-captured-json>
 *
 * Example:
 *   node tools/hierarchy-inference-test-harness.cjs capture-2025-12-13T08-40-20-587Z.json
 */

const fs = require("fs");
const path = require("path");

// Simple implementation of inference for Node.js environment
// (This is a simplified version - the full implementation is in TypeScript)

function extractRect(node) {
  if (node.absoluteLayout) {
    return {
      x: node.absoluteLayout.left ?? 0,
      y: node.absoluteLayout.top ?? 0,
      width: node.absoluteLayout.width ?? 0,
      height: node.absoluteLayout.height ?? 0,
    };
  }
  if (node.layout) {
    return {
      x: node.layout.x ?? 0,
      y: node.layout.y ?? 0,
      width: node.layout.width ?? 0,
      height: node.layout.height ?? 0,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

function extractComputedStyle(node) {
  const layoutContext = node.layoutContext || {};
  return {
    display: layoutContext.display || node.display || "block",
    position: layoutContext.position || node.position || "static",
    overflow: layoutContext.overflow || node.overflow,
    zIndex: layoutContext.zIndex
      ? parseFloat(String(layoutContext.zIndex))
      : node.zIndex,
    isText: node.type === "TEXT" || !!node.characters,
    isImageLike: node.type === "IMAGE" || !!node.imageHash,
    isFlexContainer:
      layoutContext.display === "flex" ||
      layoutContext.display === "inline-flex" ||
      !!node.autoLayout,
    flexDirection:
      layoutContext.flexDirection ||
      node.autoLayout?.layoutMode?.toLowerCase() ||
      "row",
    isGridContainer:
      layoutContext.display === "grid" ||
      layoutContext.display === "inline-grid",
  };
}

function preprocess(elementNode) {
  const renderNodes = [];
  const visited = new Set();

  function traverse(node, parent) {
    if (!node || !node.id || visited.has(node.id)) return;
    visited.add(node.id);

    const rect = extractRect(node);
    if (rect.width <= 0 || rect.height <= 0) {
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child, parent);
        }
      }
      return;
    }

    const style = extractComputedStyle(node);
    const renderNode = {
      id: node.id,
      rect,
      style,
      children: [],
      parent,
      originalData: node,
      name: node.name || node.htmlTag || node.type || "Node",
      type: node.type,
      isOverlay: style.position === "absolute" || style.position === "fixed",
    };

    renderNodes.push(renderNode);

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child, renderNode);
      }
    }

    if (parent) {
      parent.children.push(renderNode);
    }
  }

  traverse(elementNode);
  return renderNodes;
}

function countNodes(node) {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function calculateDepth(node) {
  if (!node.children || node.children.length === 0) {
    return { maxDepth: 1, avgDepth: 1 };
  }

  let maxChildDepth = 0;
  let totalDepth = 0;

  for (const child of node.children) {
    const childDepth = calculateDepth(child);
    maxChildDepth = Math.max(maxChildDepth, childDepth.maxDepth);
    totalDepth += childDepth.avgDepth;
  }

  return {
    maxDepth: maxChildDepth + 1,
    avgDepth: 1 + (totalDepth / node.children.length || 0),
  };
}

function generateSummary(
  originalCount,
  processedCount,
  wrapperEliminated,
  orphanRate,
  autoLayoutCoverage,
  maxDepth,
  avgDepth,
  overlayCount,
  syntheticFrames
) {
  const lines = [];
  lines.push("=== Hierarchy Inference Test Results ===");
  lines.push("");
  lines.push(`Node Count: ${originalCount} → ${processedCount}`);
  lines.push(`Wrapper Elimination: ${wrapperEliminated} nodes removed`);
  lines.push(`Orphan Rate: ${(orphanRate * 100).toFixed(1)}% (target: <35%)`);
  lines.push(
    `Auto-Layout Coverage: ${(autoLayoutCoverage * 100).toFixed(
      1
    )}% (target: >25%)`
  );
  lines.push(`Max Depth: ${maxDepth}`);
  lines.push(`Avg Depth: ${avgDepth.toFixed(2)}`);
  lines.push(`Overlay Count: ${overlayCount}`);
  lines.push(`Synthetic Frames: ${syntheticFrames}`);
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage: node tools/hierarchy-inference-test-harness.cjs <path-to-captured-json>"
    );
    process.exit(1);
  }

  const filePath = args[0];
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`📖 Reading captured schema from: ${filePath}`);

  let data;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    data = JSON.parse(content);
  } catch (error) {
    console.error(`Error reading/parsing file: ${error.message}`);
    process.exit(1);
  }

  // Extract tree from various possible formats
  let tree = data.tree || data.root || data;
  if (!tree) {
    console.error("Error: No tree found in schema");
    process.exit(1);
  }

  console.log(`🌳 Processing tree with ${countNodes(tree)} nodes...`);

  // Preprocess
  const renderNodes = preprocess(tree);
  console.log(`✅ Preprocessed ${renderNodes.length} render nodes`);

  // For this test harness, we'll just calculate basic metrics
  // Full inference would require the TypeScript engine
  const originalCount = countNodes(tree);
  const processedCount = renderNodes.length;
  const { maxDepth, avgDepth } = calculateDepth(tree);

  // Calculate basic metrics
  const childrenUnderRoot = tree.children ? tree.children.length : 0;
  const orphanRate = originalCount > 0 ? childrenUnderRoot / originalCount : 0;

  // Count overlays (simplified)
  let overlayCount = 0;
  function countOverlays(node) {
    const style = extractComputedStyle(node);
    if (style.position === "absolute" || style.position === "fixed") {
      overlayCount++;
    }
    if (node.children) {
      for (const child of node.children) {
        countOverlays(child);
      }
    }
  }
  countOverlays(tree);

  // Count auto-layout (simplified)
  let autoLayoutCount = 0;
  function countAutoLayout(node) {
    if (node.autoLayout) {
      autoLayoutCount++;
    }
    if (node.children) {
      for (const child of node.children) {
        countAutoLayout(child);
      }
    }
  }
  countAutoLayout(tree);
  const autoLayoutCoverage =
    originalCount > 0 ? autoLayoutCount / originalCount : 0;

  // Generate report
  const summary = generateSummary(
    originalCount,
    processedCount,
    0, // wrapperEliminated - would be calculated by full inference
    orphanRate,
    autoLayoutCoverage,
    maxDepth,
    avgDepth,
    overlayCount,
    0 // syntheticFrames - would be calculated by full inference
  );

  console.log("\n" + "=".repeat(60));
  console.log(summary);
  console.log("=".repeat(60));
  console.log("\n");

  console.log("ℹ️  Note: This is a simplified test harness.");
  console.log(
    "    For full inference with wrapper elimination, stack/grid detection,"
  );
  console.log(
    "    and sectionization, use the TypeScript implementation in the plugin.\n"
  );

  // Optionally output JSON
  if (args.includes("--json")) {
    const report = {
      originalNodeCount: originalCount,
      processedNodeCount: processedCount,
      orphanRate,
      autoLayoutCoverage,
      maxDepth,
      avgDepth,
      overlayCount,
    };
    console.log(JSON.stringify(report, null, 2));
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
