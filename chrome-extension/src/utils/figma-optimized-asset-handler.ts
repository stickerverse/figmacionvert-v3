/**
 * Figma-Optimized Asset Handler
 * 
 * Implements best practices from technical analysis for pixel-perfect Figma compatibility:
 * - Base64 encoding with proper format handling
 * - 4096px dimension limits for Figma API compliance  
 * - Canvas-based compression for oversized images
 * - Optimal image format selection (PNG/JPEG)
 * - CORS-free image processing
 */

import { ImageAsset, SVGAsset, AssetRegistry } from '../types/schema';

export interface FigmaOptimizedImage {
  base64Data: string;           // data:image/...;base64,... format
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  format: 'png' | 'jpeg' | 'gif';
  compressionRatio: number;
  hash: string;
  figmaCompatible: boolean;
  optimizationApplied: OptimizationType[];
}

export type OptimizationType = 'resize' | 'compress' | 'format-convert' | 'quality-reduce';

export interface FigmaAssetOptimizationConfig {
  maxDimension: number;          // 4096 for Figma compatibility
  maxFileSizeMB: number;         // 4MB limit
  jpegQuality: number;           // 0.95 for high quality
  pngCompression: boolean;       // Enable PNG compression
  preserveTransparency: boolean; // Preserve alpha channels
  enableFormatConversion: boolean; // Convert formats when beneficial
  aggressiveMode: boolean;       // For very large images
}

export interface FigmaAssetProcessingResult {
  processedAssets: Map<string, FigmaOptimizedImage>;
  originalTotalSize: number;
  optimizedTotalSize: number;
  compressionRatio: number;
  assetsProcessed: number;
  assetsSkipped: number;
  errors: Array<{ hash: string; error: string }>;
  metadata: {
    oversizedImages: number;
    formatConversions: number;
    qualityReductions: number;
    preservedAssets: number;
  };
}

export class FigmaOptimizedAssetHandler {
  private config: FigmaAssetOptimizationConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(config: Partial<FigmaAssetOptimizationConfig> = {}) {
    this.config = {
      maxDimension: 4096,           // Figma's hard limit
      maxFileSizeMB: 4,            // Reasonable file size limit
      jpegQuality: 0.95,           // High quality, good compression
      pngCompression: true,         // Use PNG compression
      preserveTransparency: true,   // Keep alpha channels
      enableFormatConversion: true, // Convert when beneficial
      aggressiveMode: false,        // Conservative by default
      ...config
    };

    // Create reusable canvas for image processing
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    console.log('🎯 Figma-optimized asset handler initialized:', this.config);
  }

  /**
   * Process all images in asset registry for optimal Figma compatibility
   */
  async processAssetRegistry(assetRegistry: AssetRegistry): Promise<FigmaAssetProcessingResult> {
    const result: FigmaAssetProcessingResult = {
      processedAssets: new Map(),
      originalTotalSize: 0,
      optimizedTotalSize: 0,
      compressionRatio: 0,
      assetsProcessed: 0,
      assetsSkipped: 0,
      errors: [],
      metadata: {
        oversizedImages: 0,
        formatConversions: 0,
        qualityReductions: 0,
        preservedAssets: 0
      }
    };

    const imageHashes = Object.keys(assetRegistry.images || {});
    console.log(`🔄 Processing ${imageHashes.length} images for Figma compatibility...`);

    for (const hash of imageHashes) {
      const imageAsset = assetRegistry.images[hash];
      if (!imageAsset) continue;

      try {
        const originalSize = this.estimateAssetSize(imageAsset);
        result.originalTotalSize += originalSize;

        const optimizedImage = await this.processImageAsset(imageAsset, hash);
        
        if (optimizedImage.figmaCompatible) {
          result.processedAssets.set(hash, optimizedImage);
          
          const optimizedSize = this.estimateOptimizedSize(optimizedImage);
          result.optimizedTotalSize += optimizedSize;
          result.assetsProcessed++;

          // Update metadata based on optimizations applied
          this.updateResultMetadata(result.metadata, optimizedImage);
        } else {
          result.assetsSkipped++;
          console.warn(`⚠️ Image ${hash} could not be made Figma-compatible`);
        }

      } catch (error) {
        result.errors.push({
          hash,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.assetsSkipped++;
      }
    }

    result.compressionRatio = result.originalTotalSize > 0 ? 
      result.optimizedTotalSize / result.originalTotalSize : 1;

    console.log('✅ Figma asset processing complete:', {
      processed: result.assetsProcessed,
      skipped: result.assetsSkipped,
      errors: result.errors.length,
      compressionRatio: (result.compressionRatio * 100).toFixed(1) + '%',
      sizeMB: (result.optimizedTotalSize / (1024 * 1024)).toFixed(2)
    });

    return result;
  }

  /**
   * Process a single image asset for Figma compatibility
   */
  private async processImageAsset(imageAsset: ImageAsset, hash: string): Promise<FigmaOptimizedImage> {
    const optimizationsApplied: OptimizationType[] = [];
    
    // Load image into canvas for processing
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${hash}`));
      
      // Handle both base64 and URL sources
      if (imageAsset.base64) {
        img.src = `data:image/png;base64,${imageAsset.base64}`;
      } else if (imageAsset.url) {
        img.src = imageAsset.url;
      } else {
        reject(new Error(`No valid image source for ${hash}`));
      }
    });

    let targetWidth = img.naturalWidth;
    let targetHeight = img.naturalHeight;
    let format: 'png' | 'jpeg' | 'gif' = this.detectImageFormat(imageAsset);

    // Step 1: Check if image exceeds Figma's dimension limits
    if (targetWidth > this.config.maxDimension || targetHeight > this.config.maxDimension) {
      const scale = Math.min(
        this.config.maxDimension / targetWidth,
        this.config.maxDimension / targetHeight
      );
      
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
      optimizationsApplied.push('resize');
      
      console.log(`📐 Resizing image ${hash}: ${img.naturalWidth}×${img.naturalHeight} → ${targetWidth}×${targetHeight}`);
    }

    // Step 2: Set up canvas with target dimensions
    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;

    // Step 3: Draw image with high-quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Step 4: Determine optimal format
    const hasTransparency = this.hasTransparency(this.ctx, targetWidth, targetHeight);
    
    if (!hasTransparency && format === 'png' && this.config.enableFormatConversion) {
      format = 'jpeg';
      optimizationsApplied.push('format-convert');
      console.log(`🔄 Converting ${hash} from PNG to JPEG (no transparency)`);
    }

    // Step 5: Export with optimal quality settings
    let base64Data: string;
    let quality = format === 'jpeg' ? this.config.jpegQuality : undefined;

    // Try initial export
    base64Data = this.canvas.toDataURL(`image/${format}`, quality);

    // Step 6: Check file size and reduce quality if needed
    let currentSize = this.estimateBase64Size(base64Data);
    const maxSizeBytes = this.config.maxFileSizeMB * 1024 * 1024;

    if (currentSize > maxSizeBytes && format === 'jpeg') {
      // Progressively reduce JPEG quality until size is acceptable
      const originalQuality = quality || 0.95;
      let attempts = 0;
      
      while (currentSize > maxSizeBytes && quality! > 0.3 && attempts < 10) {
        quality = (quality! - 0.1);
        base64Data = this.canvas.toDataURL('image/jpeg', quality);
        currentSize = this.estimateBase64Size(base64Data);
        attempts++;
      }
      
      if (quality !== originalQuality) {
        optimizationsApplied.push('quality-reduce');
        console.log(`📉 Reduced JPEG quality for ${hash}: ${originalQuality.toFixed(2)} → ${quality!.toFixed(2)}`);
      }
    }

    // Step 7: Final size check
    if (currentSize > maxSizeBytes) {
      console.warn(`⚠️ Image ${hash} still exceeds size limit after optimization: ${(currentSize / (1024 * 1024)).toFixed(2)}MB`);
    }

    const result: FigmaOptimizedImage = {
      base64Data,
      width: targetWidth,
      height: targetHeight,
      originalWidth: img.naturalWidth,
      originalHeight: img.naturalHeight,
      format,
      compressionRatio: this.estimateBase64Size(base64Data) / this.estimateAssetSize(imageAsset),
      hash,
      figmaCompatible: targetWidth <= this.config.maxDimension && 
                      targetHeight <= this.config.maxDimension &&
                      currentSize <= maxSizeBytes,
      optimizationApplied: optimizationsApplied
    };

    return result;
  }

  /**
   * Detect image format from asset data
   */
  private detectImageFormat(imageAsset: ImageAsset): 'png' | 'jpeg' | 'gif' {
    if (imageAsset.url) {
      const url = imageAsset.url.toLowerCase();
      if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpeg';
      if (url.includes('.gif')) return 'gif';
    }
    
    if (imageAsset.base64) {
      const header = imageAsset.base64.substring(0, 20);
      if (header.includes('/9j/')) return 'jpeg'; // JPEG magic bytes in base64
      if (header.includes('R0lGOD')) return 'gif'; // GIF89a in base64
    }
    
    return 'png'; // Default to PNG
  }

  /**
   * Check if image has transparency using canvas pixel data
   */
  private hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
    try {
      // Sample pixels to check for transparency
      const samplePoints = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1], // corners
        [Math.floor(width / 2), Math.floor(height / 2)] // center
      ];

      for (const [x, y] of samplePoints) {
        const imageData = ctx.getImageData(x, y, 1, 1);
        const alpha = imageData.data[3]; // Alpha channel
        if (alpha < 255) {
          return true; // Has transparency
        }
      }
      
      return false; // No transparency found in samples
    } catch (error) {
      // If we can't check, assume it has transparency to be safe
      return true;
    }
  }

  /**
   * Estimate size of base64 encoded data
   */
  private estimateBase64Size(base64Data: string): number {
    // Remove data URL prefix and calculate actual data size
    const dataOnly = base64Data.split(',')[1] || base64Data;
    return (dataOnly.length * 3) / 4; // Base64 to bytes conversion
  }

  /**
   * Estimate size of original asset
   */
  private estimateAssetSize(imageAsset: ImageAsset): number {
    if (imageAsset.base64) {
      return this.estimateBase64Size(imageAsset.base64);
    }
    
    // Rough estimate based on dimensions (assumes 4 bytes per pixel)
    return imageAsset.width * imageAsset.height * 4;
  }

  /**
   * Estimate size of optimized image
   */
  private estimateOptimizedSize(optimizedImage: FigmaOptimizedImage): number {
    return this.estimateBase64Size(optimizedImage.base64Data);
  }

  /**
   * Update result metadata based on optimizations applied
   */
  private updateResultMetadata(metadata: FigmaAssetProcessingResult['metadata'], optimizedImage: FigmaOptimizedImage): void {
    const optimizations = optimizedImage.optimizationApplied;
    
    if (optimizations.includes('resize')) {
      metadata.oversizedImages++;
    }
    
    if (optimizations.includes('format-convert')) {
      metadata.formatConversions++;
    }
    
    if (optimizations.includes('quality-reduce')) {
      metadata.qualityReductions++;
    }
    
    if (optimizations.length === 0) {
      metadata.preservedAssets++;
    }
  }

  /**
   * Create optimized asset registry for Figma export
   */
  createOptimizedAssetRegistry(
    originalRegistry: AssetRegistry,
    processedImages: Map<string, FigmaOptimizedImage>
  ): AssetRegistry {
    const optimizedRegistry: AssetRegistry = {
      images: {},
      svgs: originalRegistry.svgs || {}, // SVGs don't need processing
      gradients: originalRegistry.gradients || {}
    };

    // Update images with Figma-optimized versions
    for (const [hash, optimizedImage] of processedImages) {
      optimizedRegistry.images[hash] = {
        url: '', // Not needed for base64
        base64: optimizedImage.base64Data.split(',')[1], // Remove data URL prefix
        width: optimizedImage.width,
        height: optimizedImage.height,
        hash,
        mimeType: `image/${optimizedImage.format}`,
        figmaOptimized: true,
        originalDimensions: {
          width: optimizedImage.originalWidth,
          height: optimizedImage.originalHeight
        },
        optimizations: optimizedImage.optimizationApplied,
        compressionRatio: optimizedImage.compressionRatio
      } as ImageAsset;
    }

    return optimizedRegistry;
  }

  /**
   * Clean up canvas resources
   */
  dispose(): void {
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.ctx.clearRect(0, 0, 1, 1);
  }
}