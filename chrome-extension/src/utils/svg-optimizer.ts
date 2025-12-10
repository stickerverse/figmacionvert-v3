/**
 * SVG Optimizer - Uses SVGO to optimize SVG code for Figma import
 *
 * Features:
 * - Removes unnecessary metadata and comments
 * - Merges paths and shapes where possible
 * - Cleans up IDs and classes
 * - Converts styles to attributes
 * - Minifies output
 */

import { optimize, Config } from "svgo";

// SVGO configuration for Figma-optimized output
// Note: Using string-based plugin names for simpler configuration
const svgoConfig: Config = {
  multipass: true,
  plugins: [
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "cleanupAttrs",
    "mergeStyles",
    "inlineStyles",
    "minifyStyles",
    "cleanupIds",
    "removeUselessDefs",
    "cleanupNumericValues",
    "convertPathData",
    "convertTransform",
    "removeEmptyAttrs",
    "removeEmptyContainers",
    "mergePaths",
    "removeUnusedNS",
    "sortAttrs",
    "removeTitle",
    "removeDesc",
    // Keep viewBox and dimensions for Figma sizing
    "convertColors",
    "convertStyleToAttrs",
    "removeNonInheritableGroupAttrs",
    "collapseGroups",
    "removeUselessStrokeAndFill",
  ],
};

// Lighter config for inline SVGs that need to preserve structure
const lightConfig: Config = {
  multipass: true,
  plugins: [
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "cleanupAttrs",
    "cleanupNumericValues",
    "removeEmptyAttrs",
    "removeEmptyContainers",
    "sortAttrs",
  ],
};

export interface SVGOptimizationResult {
  original: string;
  optimized: string;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  savingsPercent: number;
  error?: string;
}

/**
 * Optimize an SVG string for Figma import
 */
export function optimizeSVG(
  svgCode: string,
  options?: { preserveStructure?: boolean }
): SVGOptimizationResult {
  const originalSize = svgCode.length;

  try {
    const config = options?.preserveStructure ? lightConfig : svgoConfig;
    const result = optimize(svgCode, config);

    const optimizedSize = result.data.length;
    const savings = originalSize - optimizedSize;
    const savingsPercent = (savings / originalSize) * 100;

    return {
      original: svgCode,
      optimized: result.data,
      originalSize,
      optimizedSize,
      savings,
      savingsPercent,
    };
  } catch (error) {
    return {
      original: svgCode,
      optimized: svgCode, // Return original on error
      originalSize,
      optimizedSize: originalSize,
      savings: 0,
      savingsPercent: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Batch optimize multiple SVGs
 */
export function optimizeSVGBatch(
  svgCodes: string[],
  options?: { preserveStructure?: boolean }
): SVGOptimizationResult[] {
  return svgCodes.map((svg) => optimizeSVG(svg, options));
}

/**
 * Get SVG optimization stats for a batch
 */
export function getSVGBatchStats(results: SVGOptimizationResult[]): {
  totalOriginalSize: number;
  totalOptimizedSize: number;
  totalSavings: number;
  avgSavingsPercent: number;
  successCount: number;
  errorCount: number;
} {
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    totalOriginalSize += result.originalSize;
    totalOptimizedSize += result.optimizedSize;
    if (result.error) {
      errorCount++;
    } else {
      successCount++;
    }
  }

  const totalSavings = totalOriginalSize - totalOptimizedSize;
  const avgSavingsPercent =
    totalOriginalSize > 0 ? (totalSavings / totalOriginalSize) * 100 : 0;

  return {
    totalOriginalSize,
    totalOptimizedSize,
    totalSavings,
    avgSavingsPercent,
    successCount,
    errorCount,
  };
}

/**
 * Clean SVG for inline usage (remove XML declaration, doctype, etc.)
 */
export function cleanSVGForInline(svgCode: string): string {
  return svgCode
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

/**
 * Extract viewBox dimensions from SVG
 */
export function extractSVGDimensions(
  svgCode: string
): { width: number; height: number } | null {
  // Try viewBox first
  const viewBoxMatch = svgCode.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/\s+/);
    if (parts.length >= 4) {
      return {
        width: parseFloat(parts[2]),
        height: parseFloat(parts[3]),
      };
    }
  }

  // Try width/height attributes
  const widthMatch = svgCode.match(/width=["']([^"']+)["']/i);
  const heightMatch = svgCode.match(/height=["']([^"']+)["']/i);

  if (widthMatch && heightMatch) {
    return {
      width: parseFloat(widthMatch[1]),
      height: parseFloat(heightMatch[1]),
    };
  }

  return null;
}

// Export singleton for convenience
export const svgOptimizer = {
  optimize: optimizeSVG,
  batch: optimizeSVGBatch,
  getStats: getSVGBatchStats,
  cleanForInline: cleanSVGForInline,
  extractDimensions: extractSVGDimensions,
};
