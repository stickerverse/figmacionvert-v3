import { ImageAsset, SVGAsset } from "../types/schema";
import {
  AssetContextData,
  AssetClassification,
  AssetImportance,
  OptimizationStrategy,
} from "./asset-context-analyzer";

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  strategy: OptimizationStrategy;
  success: boolean;
  error?: string;
  optimizedAsset?: ImageAsset | SVGAsset | null; // null means removed
}

export interface OptimizationConfig {
  maxPayloadSizeMB: number;
  progressiveThresholds: {
    mild: number; // MB - start mild optimization
    moderate: number; // MB - start moderate optimization
    aggressive: number; // MB - start aggressive optimization
    extreme: number; // MB - start extreme optimization
  };
  qualityTargets: {
    critical: number; // 0.9 - preserve 90% quality
    high: number; // 0.8 - preserve 80% quality
    medium: number; // 0.65 - preserve 65% quality
    low: number; // 0.45 - preserve 45% quality
    minimal: number; // 0.25 - preserve 25% quality
  };
}

export class SmartAssetOptimizer {
  private config: OptimizationConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      maxPayloadSizeMB: 200,
      progressiveThresholds: {
        mild: 50,
        moderate: 100,
        aggressive: 150,
        extreme: 180,
      },
      qualityTargets: {
        critical: 0.95,
        high: 0.9,
        medium: 0.8,
        low: 0.65,
        minimal: 0.45,
      },
      ...config,
    };

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    if (!this.ctx) {
      throw new Error("Could not create canvas context for asset optimization");
    }
  }

  /**
   * Optimize an asset based on its context and current payload pressure
   */
  public async optimizeAsset(
    asset: ImageAsset | SVGAsset,
    context: AssetContextData,
    currentPayloadSizeMB: number
  ): Promise<OptimizationResult> {
    const originalSize = this.getAssetSize(asset);

    try {
      // Determine optimization intensity based on payload pressure
      const optimizationIntensity = this.calculateOptimizationIntensity(
        currentPayloadSizeMB,
        context.importance
      );

      let result: OptimizationResult;

      if (this.isImageAsset(asset)) {
        result = await this.optimizeImageAsset(
          asset,
          context,
          optimizationIntensity
        );
      } else {
        result = await this.optimizeSVGAsset(
          asset,
          context,
          optimizationIntensity
        );
      }

      console.log(`🎯 ${context.classification} asset optimized:`, {
        hash: context.hash.substring(0, 8),
        strategy: result.strategy,
        originalKB: (originalSize / 1024).toFixed(1),
        optimizedKB: (result.optimizedSize / 1024).toFixed(1),
        compressionRatio: (result.compressionRatio * 100).toFixed(1) + "%",
      });

      return result;
    } catch (error) {
      console.error("Asset optimization failed:", error);
      return {
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        strategy: OptimizationStrategy.PRESERVE,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        optimizedAsset: asset,
      };
    }
  }

  /**
   * Optimize an image asset
   */
  private async optimizeImageAsset(
    asset: ImageAsset,
    context: AssetContextData,
    intensity: number
  ): Promise<OptimizationResult> {
    const originalSize = this.getAssetSize(asset);

    // Handle removal strategy
    if (context.optimizationStrategy === OptimizationStrategy.REMOVE) {
      return {
        originalSize,
        optimizedSize: 0,
        compressionRatio: 1,
        strategy: OptimizationStrategy.REMOVE,
        success: true,
        optimizedAsset: null,
      };
    }

    // Handle preservation strategy
    if (context.optimizationStrategy === OptimizationStrategy.PRESERVE) {
      return {
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        strategy: OptimizationStrategy.PRESERVE,
        success: true,
        optimizedAsset: asset,
      };
    }

    // Handle SVG conversion strategy
    if (context.optimizationStrategy === OptimizationStrategy.CONVERT_SVG) {
      return await this.convertImageToSVG(asset, context);
    }

    // Apply compression based on strategy and intensity
    const targetQuality = this.calculateTargetQuality(context, intensity);
    const targetSize = this.calculateTargetSize(asset, context, intensity);

    const optimizedAsset = await this.compressImage(
      asset,
      targetQuality,
      targetSize
    );
    const optimizedSize = this.getAssetSize(optimizedAsset);

    return {
      originalSize,
      optimizedSize,
      compressionRatio: (originalSize - optimizedSize) / originalSize,
      strategy: context.optimizationStrategy,
      success: true,
      optimizedAsset,
    };
  }

  /**
   * Optimize an SVG asset
   */
  private async optimizeSVGAsset(
    asset: SVGAsset,
    context: AssetContextData,
    intensity: number
  ): Promise<OptimizationResult> {
    const originalSize = this.getAssetSize(asset);

    // Handle removal strategy
    if (context.optimizationStrategy === OptimizationStrategy.REMOVE) {
      return {
        originalSize,
        optimizedSize: 0,
        compressionRatio: 1,
        strategy: OptimizationStrategy.REMOVE,
        success: true,
        optimizedAsset: null,
      };
    }

    // Handle preservation strategy
    if (context.optimizationStrategy === OptimizationStrategy.PRESERVE) {
      return {
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        strategy: OptimizationStrategy.PRESERVE,
        success: true,
        optimizedAsset: asset,
      };
    }

    // Optimize SVG content
    const optimizedAsset = this.optimizeSVGContent(asset, context, intensity);
    const optimizedSize = this.getAssetSize(optimizedAsset);

    return {
      originalSize,
      optimizedSize,
      compressionRatio: (originalSize - optimizedSize) / originalSize,
      strategy: context.optimizationStrategy,
      success: true,
      optimizedAsset,
    };
  }

  /**
   * Calculate optimization intensity based on payload pressure and asset importance
   */
  private calculateOptimizationIntensity(
    currentPayloadSizeMB: number,
    importance: AssetImportance
  ): number {
    // Base intensity from payload pressure (0-1)
    let intensityFromPayload = 0;

    if (currentPayloadSizeMB >= this.config.progressiveThresholds.extreme) {
      intensityFromPayload = 1.0; // Maximum intensity
    } else if (
      currentPayloadSizeMB >= this.config.progressiveThresholds.aggressive
    ) {
      intensityFromPayload = 0.8;
    } else if (
      currentPayloadSizeMB >= this.config.progressiveThresholds.moderate
    ) {
      intensityFromPayload = 0.6;
    } else if (currentPayloadSizeMB >= this.config.progressiveThresholds.mild) {
      intensityFromPayload = 0.4;
    } else {
      intensityFromPayload = 0.2;
    }

    // Modulate by asset importance
    const importanceModifier = {
      [AssetImportance.CRITICAL]: 0.3,
      [AssetImportance.HIGH]: 0.5,
      [AssetImportance.MEDIUM]: 0.7,
      [AssetImportance.LOW]: 0.9,
      [AssetImportance.MINIMAL]: 1.0,
    }[importance];

    return Math.min(1, intensityFromPayload * importanceModifier);
  }

  /**
   * Calculate target quality based on asset context and optimization intensity
   */
  private calculateTargetQuality(
    context: AssetContextData,
    intensity: number
  ): number {
    const baseQuality = {
      [AssetImportance.CRITICAL]: this.config.qualityTargets.critical,
      [AssetImportance.HIGH]: this.config.qualityTargets.high,
      [AssetImportance.MEDIUM]: this.config.qualityTargets.medium,
      [AssetImportance.LOW]: this.config.qualityTargets.low,
      [AssetImportance.MINIMAL]: this.config.qualityTargets.minimal,
    }[context.importance];

    // Apply intensity modifier - higher intensity reduces quality further
    const intensityModifier = 1 - intensity * 0.15; // Max 15% quality reduction

    return Math.max(0.1, baseQuality * intensityModifier);
  }

  /**
   * Calculate target file size based on asset context and optimization intensity
   */
  private calculateTargetSize(
    asset: ImageAsset,
    context: AssetContextData,
    intensity: number
  ): number {
    const originalSize = this.getAssetSize(asset);

    // Base size targets based on classification
    const baseSizeTarget =
      {
        [AssetClassification.HERO]: originalSize * 0.7, // Preserve hero images
        [AssetClassification.LOGO]: originalSize * 0.6, // Logos need clarity
        [AssetClassification.CONTENT]: originalSize * 0.5, // Content images balanced
        [AssetClassification.COMPONENT]: originalSize * 0.4, // Components can be smaller
        [AssetClassification.ICON]: 20 * 1024, // Icons: 20KB max
        [AssetClassification.BACKGROUND]: originalSize * 0.3, // Backgrounds can be very compressed
        [AssetClassification.DECORATIVE]: originalSize * 0.2, // Decorative: minimal size
      }[context.classification] || originalSize * 0.4;

    // Apply intensity modifier
    const intensityModifier = 1 - intensity * 0.25; // Up to 25% further reduction

    return Math.max(1024, baseSizeTarget * intensityModifier); // Min 1KB
  }

  /**
   * Compress an image using adaptive quality and format selection
   */
  private async compressImage(
    asset: ImageAsset,
    targetQuality: number,
    targetSize: number
  ): Promise<ImageAsset> {
    if (!asset.data) {
      return asset; // Can't compress without data
    }

    // Create image from base64
    const img = await this.createImageFromBase64(
      asset.data,
      asset.mimeType || "image/png"
    );

    // Try different compression strategies
    const strategies = [
      { format: "image/webp", quality: targetQuality },
      { format: "image/jpeg", quality: targetQuality },
      { format: "image/jpeg", quality: Math.max(0.1, targetQuality * 0.8) },
      { format: "image/webp", quality: Math.max(0.1, targetQuality * 0.6) },
    ];

    let bestResult = asset;
    let bestSize = this.getAssetSize(asset);

    for (const strategy of strategies) {
      try {
        const compressed = await this.compressImageWithStrategy(
          img,
          asset,
          strategy
        );
        const compressedSize = this.getAssetSize(compressed);

        if (compressedSize < bestSize && compressedSize >= targetSize * 0.5) {
          bestResult = compressed;
          bestSize = compressedSize;
        }

        // If we've hit our target, stop trying
        if (compressedSize <= targetSize) {
          break;
        }
      } catch (error) {
        console.warn("Compression strategy failed:", strategy, error);
      }
    }

    return bestResult;
  }

  /**
   * Compress image with specific strategy
   */
  private async compressImageWithStrategy(
    img: HTMLImageElement,
    originalAsset: ImageAsset,
    strategy: { format: string; quality: number }
  ): Promise<ImageAsset> {
    // Set canvas size to match image, but apply smart downscaling if needed
    const maxDimension = this.calculateMaxDimension(originalAsset);
    const scale = Math.min(
      1,
      Math.min(maxDimension / img.width, maxDimension / img.height)
    );

    this.canvas.width = Math.floor(img.width * scale);
    this.canvas.height = Math.floor(img.height * scale);

    // Clear canvas and draw scaled image
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

    // Convert to compressed format
    const dataUrl = this.canvas.toDataURL(strategy.format, strategy.quality);
    const base64 = dataUrl.split(",")[1];

    return {
      ...originalAsset,
      data: base64,
      width: this.canvas.width,
      height: this.canvas.height,
      mimeType: strategy.format,
    };
  }

  /**
   * Calculate maximum allowed dimension based on asset classification
   */
  private calculateMaxDimension(asset: ImageAsset): number {
    // Conservative max dimensions to control file size
    const maxDimensions = {
      hero: 1200,
      logo: 400,
      content: 800,
      component: 600,
      icon: 128,
      background: 1000,
      decorative: 400,
    };

    // Default to content if we can't determine classification
    return maxDimensions.content;
  }

  /**
   * Optimize SVG content by removing unnecessary elements and attributes
   */
  private optimizeSVGContent(
    asset: SVGAsset,
    context: AssetContextData,
    intensity: number
  ): SVGAsset {
    let svgCode = asset.svgCode;

    // Progressive SVG optimization based on intensity
    if (intensity > 0.3) {
      svgCode = this.removeSVGComments(svgCode);
      svgCode = this.minimizeSVGWhitespace(svgCode);
    }

    if (intensity > 0.6) {
      svgCode = this.removeSVGMetadata(svgCode);
      svgCode = this.removeUnusedSVGElements(svgCode);
    }

    if (intensity > 0.8) {
      svgCode = this.simplifyPaths(svgCode);
      svgCode = this.removeRedundantAttributes(svgCode);
    }

    return {
      ...asset,
      svgCode,
    };
  }

  /**
   * Attempt to convert small images to SVG for better compression
   */
  private async convertImageToSVG(
    asset: ImageAsset,
    context: AssetContextData
  ): Promise<OptimizationResult> {
    // This is a simplified conversion - in practice, you'd want a more sophisticated
    // image tracing algorithm or external service
    const originalSize = this.getAssetSize(asset);

    try {
      // For now, we'll create a placeholder SVG that represents the image
      const svgCode = `<svg width="${asset.width}" height="${asset.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="12">IMG</text>
      </svg>`;

      const svgAsset: SVGAsset = {
        id: asset.id || asset.hash || "unknown",
        hash: asset.hash || asset.id || "unknown",
        svgCode,
        width: asset.width,
        height: asset.height,
        url: asset.url,
        contentType: "image/svg+xml",
      };

      const optimizedSize = svgCode.length;

      return {
        originalSize,
        optimizedSize,
        compressionRatio: (originalSize - optimizedSize) / originalSize,
        strategy: OptimizationStrategy.CONVERT_SVG,
        success: true,
        optimizedAsset: svgAsset,
      };
    } catch (error) {
      // If conversion fails, fall back to aggressive compression
      return await this.optimizeImageAsset(
        asset,
        {
          ...context,
          optimizationStrategy: OptimizationStrategy.AGGRESSIVE,
        },
        0.8
      );
    }
  }

  // Helper methods

  private getAssetSize(asset: ImageAsset | SVGAsset): number {
    if (this.isImageAsset(asset)) {
      return asset.data ? asset.data.length * 0.75 : 0; // base64 overhead
    } else {
      return asset.svgCode ? asset.svgCode.length : 0;
    }
  }

  private isImageAsset(asset: ImageAsset | SVGAsset): asset is ImageAsset {
    return "data" in asset;
  }

  private createImageFromBase64(
    base64: string,
    mimeType: string
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // Safety check: if base64 is suspiciously large (> 25MB), skip it to avoid OOM/hangs
      if (base64.length > 25 * 1024 * 1024) {
        reject(new Error("Image too large to process safely"));
        return;
      }

      const img = new Image();

      // Add timeout
      const timeoutId = setTimeout(() => {
        img.src = ""; // Cancel loading
        reject(new Error("Image load timed out"));
      }, 5000);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error("Image load failed"));
      };

      img.src = `data:${mimeType};base64,${base64}`;
    });
  }

  // SVG optimization methods

  private removeSVGComments(svgCode: string): string {
    return svgCode.replace(/<!--[\s\S]*?-->/g, "");
  }

  private minimizeSVGWhitespace(svgCode: string): string {
    return svgCode.replace(/>\s+</g, "><").trim();
  }

  private removeSVGMetadata(svgCode: string): string {
    // Remove metadata, title, desc elements
    return svgCode
      .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
      .replace(/<title[\s\S]*?<\/title>/gi, "")
      .replace(/<desc[\s\S]*?<\/desc>/gi, "");
  }

  private removeUnusedSVGElements(svgCode: string): string {
    // Remove defs that aren't referenced (simplified)
    return svgCode.replace(/<defs[^>]*>\s*<\/defs>/g, "");
  }

  private simplifyPaths(svgCode: string): string {
    // Simplified path optimization - round numbers to reduce precision
    return svgCode.replace(/(\d+\.\d{3,})/g, (match) => {
      return parseFloat(match).toFixed(2);
    });
  }

  private removeRedundantAttributes(svgCode: string): string {
    // Remove default values and redundant attributes
    return svgCode
      .replace(/\s+fill="none"/g, "")
      .replace(/\s+stroke="none"/g, "")
      .replace(/\s+stroke-width="1"/g, "");
  }
}

export default SmartAssetOptimizer;
