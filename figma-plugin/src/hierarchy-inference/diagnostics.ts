/**
 * Diagnostics and Reporting for Hierarchy Inference
 */

import { InferredNodeTree, InferenceMetrics } from "./types";

export interface TreeQualityReport {
  timestamp: string;
  metrics: InferenceMetrics;
  summary: string;
  recommendations: string[];
}

/**
 * Generate a comprehensive tree quality report
 */
export function generateTreeQualityReport(
  inferredTree: InferredNodeTree,
  originalNodeCount?: number
): TreeQualityReport {
  const metrics = inferredTree.metrics;
  const summary = generateSummary(metrics, originalNodeCount);
  const recommendations = generateRecommendations(metrics);

  return {
    timestamp: new Date().toISOString(),
    metrics,
    summary,
    recommendations,
  };
}

function generateSummary(
  metrics: InferenceMetrics,
  originalCount?: number
): string {
  const lines: string[] = [];

  lines.push("=== Tree Quality Report ===");
  lines.push("");

  if (originalCount !== undefined) {
    lines.push(
      `Node Count: ${originalCount} → ${metrics.nodeCountAfter} (${metrics.nodeCountBefore} processed)`
    );
  } else {
    lines.push(
      `Node Count: ${metrics.nodeCountBefore} → ${metrics.nodeCountAfter}`
    );
  }

  lines.push(
    `Wrapper Elimination: ${metrics.wrapperEliminationCount} nodes removed`
  );
  lines.push(
    `Orphan Rate: ${(metrics.orphanRate * 100).toFixed(1)}% (target: <35%)`
  );
  lines.push(
    `Auto-Layout Coverage: ${(metrics.autoLayoutCoverage * 100).toFixed(
      1
    )}% (target: >25%)`
  );
  lines.push(`Max Depth: ${metrics.maxDepth}`);
  lines.push(`Avg Depth: ${metrics.avgDepth.toFixed(2)}`);
  lines.push(`Overlay Count: ${metrics.overlayCount}`);
  lines.push(`Synthetic Frames: ${metrics.syntheticFrameCount}`);

  return lines.join("\n");
}

function generateRecommendations(metrics: InferenceMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.orphanRate > 0.35) {
    recommendations.push(
      `⚠️ Orphan rate (${(metrics.orphanRate * 100).toFixed(
        1
      )}%) exceeds target (35%). Consider improving containment scoring.`
    );
  }

  if (metrics.autoLayoutCoverage < 0.25) {
    recommendations.push(
      `⚠️ Auto-layout coverage (${(metrics.autoLayoutCoverage * 100).toFixed(
        1
      )}%) below target (25%). Consider improving stack/grid detection.`
    );
  }

  if (metrics.maxDepth > 15) {
    recommendations.push(
      `⚠️ Max depth (${metrics.maxDepth}) is very high. Consider more aggressive wrapper elimination.`
    );
  }

  if (metrics.wrapperEliminationCount === 0) {
    recommendations.push(
      `ℹ️ No wrappers were eliminated. This may indicate the page structure is already clean, or wrapper detection needs tuning.`
    );
  }

  if (metrics.syntheticFrameCount > 0) {
    recommendations.push(
      `✅ Created ${metrics.syntheticFrameCount} synthetic frames for better structure.`
    );
  }

  return recommendations;
}

/**
 * Print tree quality report to console
 */
export function printTreeQualityReport(report: TreeQualityReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("🌳 TREE QUALITY REPORT");
  console.log("=".repeat(60));
  console.log(report.summary);
  console.log("");

  if (report.recommendations.length > 0) {
    console.log("Recommendations:");
    report.recommendations.forEach((rec) => console.log(`  ${rec}`));
  }

  if (report.metrics.topWrapperCandidates.length > 0) {
    console.log("");
    console.log(
      `Top ${Math.min(
        10,
        report.metrics.topWrapperCandidates.length
      )} Wrapper Candidates:`
    );
    report.metrics.topWrapperCandidates.slice(0, 10).forEach((candidate, i) => {
      console.log(
        `  ${i + 1}. ${candidate.name} (${
          candidate.id
        }): score=${candidate.score.toFixed(3)} - ${candidate.reason}`
      );
    });
  }

  console.log("=".repeat(60) + "\n");
}

/**
 * Export debug artifact as JSON
 */
export function exportDebugArtifact(
  inferredTree: InferredNodeTree,
  report: TreeQualityReport
): string {
  return JSON.stringify(
    {
      tree: inferredTree.root,
      metrics: inferredTree.metrics,
      report,
    },
    null,
    2
  );
}
