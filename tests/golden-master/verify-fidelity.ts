/**
 * Verify Fidelity
 *
 * Compares a new capture against a Golden Master to detect regressions.
 * Usage: ts-node tests/golden-master/verify-fidelity.ts <golden-file> <new-file>
 */

import fs from "fs";
import path from "path";

// Simple deep comparison since jest-diff is not available
function deepCompare(obj1: any, obj2: any, path: string[] = []): string[] {
  const diffs: string[] = [];

  if (obj1 === obj2) return diffs;

  if (typeof obj1 !== typeof obj2) {
    diffs.push(
      `Type mismatch at ${path.join(".")}: ${typeof obj1} vs ${typeof obj2}`
    );
    return diffs;
  }

  if (typeof obj1 !== "object" || obj1 === null || obj2 === null) {
    diffs.push(`Value mismatch at ${path.join(".")}: ${obj1} vs ${obj2}`);
    return diffs;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    diffs.push(`Array mismatch at ${path.join(".")}`);
    return diffs;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    // Ignore volatile fields
    if (
      [
        "timestamp",
        "duration",
        "extractionTime",
        "uuid",
        "imageHash",
        "contentHash",
      ].includes(key)
    )
      continue;

    // Ignore specific metadata that changes every run
    if (path.includes("metadata") && ["timestamp", "url"].includes(key))
      continue;

    if (!keys1.includes(key)) {
      diffs.push(`Missing key at ${path.join(".")}: ${key}`);
      continue;
    }
    if (!keys2.includes(key)) {
      diffs.push(`Extra key at ${path.join(".")}: ${key}`);
      continue;
    }

    const newPath = [...path, key];
    diffs.push(...deepCompare(obj1[key], obj2[key], newPath));
  }

  return diffs;
}

function verifyFidelity(goldenPath: string, newPath: string) {
  console.log(
    `🔍 Verifying fidelity: ${path.basename(newPath)} vs ${path.basename(
      goldenPath
    )}`
  );

  const golden = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
  const current = JSON.parse(fs.readFileSync(newPath, "utf-8"));

  // 1. Structural Diff
  const diffs = deepCompare(golden, current);

  if (diffs.length === 0) {
    console.log(
      "✅ No regressions detected! Schemas are structurally identical."
    );
  } else {
    console.log(`⚠️ Found ${diffs.length} differences:`);
    // Show first 20 diffs
    diffs.slice(0, 20).forEach((d) => console.log(`   - ${d}`));
    if (diffs.length > 20) console.log(`   ... and ${diffs.length - 20} more.`);
  }

  // 2. Metric Comparison
  const goldenMetrics = extractMetrics(golden);
  const currentMetrics = extractMetrics(current);

  console.log("\n📊 Fidelity Metrics:");
  console.table({
    "Node Count": {
      Golden: goldenMetrics.nodeCount,
      Current: currentMetrics.nodeCount,
      Diff: currentMetrics.nodeCount - goldenMetrics.nodeCount,
    },
    Depth: {
      Golden: goldenMetrics.maxDepth,
      Current: currentMetrics.maxDepth,
      Diff: currentMetrics.maxDepth - goldenMetrics.maxDepth,
    },
    Images: {
      Golden: goldenMetrics.imageCount,
      Current: currentMetrics.imageCount,
      Diff: currentMetrics.imageCount - goldenMetrics.imageCount,
    },
    Interactive: {
      Golden: goldenMetrics.interactiveCount,
      Current: currentMetrics.interactiveCount,
      Diff: currentMetrics.interactiveCount - goldenMetrics.interactiveCount,
    },
  });

  // Fail if node count drops significantly (> 10%)
  if (currentMetrics.nodeCount < goldenMetrics.nodeCount * 0.9) {
    console.error("❌ CRITICAL: Significant node count drop detected!");
    process.exit(1);
  }
}

function extractMetrics(schema: any) {
  let nodeCount = 0;
  let maxDepth = 0;
  let imageCount = 0;
  let interactiveCount = 0;

  function traverse(node: any, depth: number) {
    nodeCount++;
    maxDepth = Math.max(maxDepth, depth);

    if (node.type === "IMAGE") imageCount++;
    if (node.onClick || node.events) interactiveCount++; // Adjust based on actual schema

    if (node.children) {
      node.children.forEach((c: any) => traverse(c, depth + 1));
    }
  }

  if (schema.tree) {
    traverse(schema.tree, 0);
  }

  return { nodeCount, maxDepth, imageCount, interactiveCount };
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: ts-node verify-fidelity.ts <golden-file> <new-file>");
  process.exit(1);
}

verifyFidelity(args[0], args[1]);
