import { ElementNode, ImageAsset, SVGAsset, AssetRegistry } from '../types/schema';
import { AssetContextAnalyzer, AssetContextData, AssetImportance, OptimizationStrategy } from './asset-context-analyzer';
import { SmartAssetOptimizer, OptimizationResult, OptimizationConfig } from './smart-asset-optimizer';

export interface ProgressiveOptimizationResult {
  originalPayloadSizeMB: number;
  optimizedPayloadSizeMB: number;
  totalCompressionRatio: number;
  assetsProcessed: number;
  assetsRemoved: number;
  optimizationRounds: number;
  assetResults: Map<string, OptimizationResult>;
  optimizedAssets: AssetRegistry;
  metadata: OptimizationMetadata;
}

export interface OptimizationMetadata {
  preservedAssets: string[];      // Hashes of assets preserved for quality
  aggressivelyOptimized: string[]; // Hashes of assets heavily compressed
  removedAssets: string[];        // Hashes of assets removed entirely
  convertedAssets: string[];      // Hashes of assets converted to different formats
  qualityDegradation: Map<string, number>; // Hash -> quality loss percentage
}

export interface ProgressiveOptimizationConfig extends OptimizationConfig {
  targetPayloadSizeMB: number;
  maxOptimizationRounds: number;
  enableProgressiveOptimization: boolean;
  preserveCriticalAssets: boolean;
  enableAssetConversion: boolean;
}

export class ProgressiveAssetOptimizer {
  private contextAnalyzer: AssetContextAnalyzer;
  private smartOptimizer: SmartAssetOptimizer;
  private config: ProgressiveOptimizationConfig;

  constructor(
    viewport: { width: number; height: number },
    config: Partial<ProgressiveOptimizationConfig> = {}
  ) {
    this.config = {
      targetPayloadSizeMB: 150,
      maxPayloadSizeMB: 200,
      maxOptimizationRounds: 4,
      enableProgressiveOptimization: true,
      preserveCriticalAssets: true,
      enableAssetConversion: false,
      progressiveThresholds: {
        mild: 50,
        moderate: 100,
        aggressive: 150,
        extreme: 180
      },
      qualityTargets: {
        critical: 0.9,
        high: 0.8,
        medium: 0.65,
        low: 0.45,
        minimal: 0.25
      },
      ...config
    };

    this.contextAnalyzer = new AssetContextAnalyzer(viewport);
    this.smartOptimizer = new SmartAssetOptimizer(this.config);
  }

  /**
   * Progressively optimize assets based on context and payload size constraints
   */
  public async optimizeAssets(
    tree: ElementNode,
    assets: AssetRegistry
  ): Promise<ProgressiveOptimizationResult> {
    console.log('🚀 Starting progressive asset optimization...');

    const startTime = Date.now();
    const originalPayloadSizeMB = this.calculatePayloadSize(assets);

    console.log(`📊 Initial payload: ${originalPayloadSizeMB.toFixed(2)}MB`);

    // Analyze asset context and importance
    const assetContexts = this.contextAnalyzer.analyzeAssets(tree, assets);

    // Initialize result tracking
    const result: ProgressiveOptimizationResult = {
      originalPayloadSizeMB,
      optimizedPayloadSizeMB: originalPayloadSizeMB,
      totalCompressionRatio: 0,
      assetsProcessed: 0,
      assetsRemoved: 0,
      optimizationRounds: 0,
      assetResults: new Map(),
      optimizedAssets: JSON.parse(JSON.stringify(assets)), // Deep clone
      metadata: {
        preservedAssets: [],
        aggressivelyOptimized: [],
        removedAssets: [],
        convertedAssets: [],
        qualityDegradation: new Map()
      }
    };

    // Skip optimization if we're already under target
    if (originalPayloadSizeMB <= this.config.targetPayloadSizeMB) {
      console.log('✅ Payload already under target size, no optimization needed');
      return result;
    }

    if (!this.config.enableProgressiveOptimization) {
      console.log('🚫 Progressive optimization disabled, applying single-pass optimization');
      return await this.applySinglePassOptimization(assetContexts, result);
    }

    // Progressive optimization rounds
    const optimizationPlan = this.createOptimizationPlan(assetContexts, originalPayloadSizeMB);

    for (const round of optimizationPlan) {
      result.optimizationRounds++;
      
      console.log(`🔄 Round ${result.optimizationRounds}: ${round.name} (${round.targets.length} assets)`);

      await this.executeOptimizationRound(round, result);

      // Check if we've reached our target
      const currentPayloadSize = this.calculatePayloadSize(result.optimizedAssets);
      result.optimizedPayloadSizeMB = currentPayloadSize;

      console.log(`📈 After round ${result.optimizationRounds}: ${currentPayloadSize.toFixed(2)}MB`);

      if (currentPayloadSize <= this.config.targetPayloadSizeMB) {
        console.log('🎯 Target payload size achieved!');
        break;
      }

      if (result.optimizationRounds >= this.config.maxOptimizationRounds) {
        console.log('⏱️ Maximum optimization rounds reached');
        break;
      }
    }

    // Calculate final results
    result.optimizedPayloadSizeMB = this.calculatePayloadSize(result.optimizedAssets);
    result.totalCompressionRatio = 
      (result.originalPayloadSizeMB - result.optimizedPayloadSizeMB) / result.originalPayloadSizeMB;

    const optimizationTime = Date.now() - startTime;

    console.log('🏁 Progressive optimization complete:', {
      originalSize: `${result.originalPayloadSizeMB.toFixed(2)}MB`,
      optimizedSize: `${result.optimizedPayloadSizeMB.toFixed(2)}MB`,
      compressionRatio: `${(result.totalCompressionRatio * 100).toFixed(1)}%`,
      rounds: result.optimizationRounds,
      processed: result.assetsProcessed,
      removed: result.assetsRemoved,
      timeMs: optimizationTime
    });

    return result;
  }

  /**
   * Create an optimization plan with progressive rounds
   */
  private createOptimizationPlan(
    assetContexts: Map<string, AssetContextData>,
    currentPayloadSizeMB: number
  ): OptimizationRound[] {
    const rounds: OptimizationRound[] = [];

    // Sort assets by priority (least important first)
    const sortedAssets = Array.from(assetContexts.entries()).sort(([, a], [, b]) => {
      // Sort by importance (minimal first), then by size (largest first within same importance)
      const importanceOrder = {
        [AssetImportance.MINIMAL]: 0,
        [AssetImportance.LOW]: 1,
        [AssetImportance.MEDIUM]: 2,
        [AssetImportance.HIGH]: 3,
        [AssetImportance.CRITICAL]: 4
      };

      const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (importanceDiff !== 0) return importanceDiff;

      // Within same importance, prioritize larger assets for optimization
      return (b.originalSize || 0) - (a.originalSize || 0);
    });

    // Round 1: Remove minimal importance assets and convert icons
    rounds.push({
      name: 'Cleanup & Conversion',
      targets: sortedAssets
        .filter(([, context]) => 
          context.importance === AssetImportance.MINIMAL ||
          (context.optimizationStrategy === OptimizationStrategy.CONVERT_SVG && this.config.enableAssetConversion)
        )
        .map(([hash]) => hash),
      intensity: 0.8
    });

    // Round 2: Aggressive optimization of low importance assets
    rounds.push({
      name: 'Low Priority Optimization',
      targets: sortedAssets
        .filter(([, context]) => context.importance === AssetImportance.LOW)
        .map(([hash]) => hash),
      intensity: 0.7
    });

    // Round 3: Moderate optimization of medium importance assets
    rounds.push({
      name: 'Medium Priority Optimization',
      targets: sortedAssets
        .filter(([, context]) => context.importance === AssetImportance.MEDIUM)
        .map(([hash]) => hash),
      intensity: 0.5
    });

    // Round 4: Conservative optimization of high importance assets (if desperate)
    if (currentPayloadSizeMB > this.config.progressiveThresholds.extreme) {
      rounds.push({
        name: 'High Priority Conservative Optimization',
        targets: sortedAssets
          .filter(([, context]) => 
            context.importance === AssetImportance.HIGH && !this.config.preserveCriticalAssets
          )
          .map(([hash]) => hash),
        intensity: 0.3
      });
    }

    return rounds;
  }

  /**
   * Execute a single optimization round
   */
  private async executeOptimizationRound(
    round: OptimizationRound,
    result: ProgressiveOptimizationResult
  ): Promise<void> {
    const currentPayloadSize = this.calculatePayloadSize(result.optimizedAssets);

    for (const assetHash of round.targets) {
      // Find asset in either images or SVGs
      const imageAsset = result.optimizedAssets.images[assetHash];
      const svgAsset = result.optimizedAssets.svgs[assetHash];
      const asset = imageAsset || svgAsset;

      if (!asset) {
        console.warn(`Asset ${assetHash} not found in registry`);
        continue;
      }

      try {
        // Get asset context (we need to re-analyze or cache this)
        const context = this.getAssetContext(assetHash, asset);
        
        // Optimize the asset
        const optimizationResult = await this.smartOptimizer.optimizeAsset(
          asset,
          context,
          currentPayloadSize
        );

        // Apply the optimization result
        this.applyOptimizationResult(assetHash, optimizationResult, result);

        result.assetsProcessed++;

        // Track quality degradation
        if (optimizationResult.compressionRatio > 0) {
          result.metadata.qualityDegradation.set(
            assetHash,
            optimizationResult.compressionRatio * 100
          );
        }

      } catch (error) {
        console.error(`Failed to optimize asset ${assetHash}:`, error);
      }
    }
  }

  /**
   * Apply single-pass optimization for simple cases
   */
  private async applySinglePassOptimization(
    assetContexts: Map<string, AssetContextData>,
    result: ProgressiveOptimizationResult
  ): Promise<ProgressiveOptimizationResult> {
    const currentPayloadSize = this.calculatePayloadSize(result.optimizedAssets);

    for (const [assetHash, context] of assetContexts) {
      const imageAsset = result.optimizedAssets.images[assetHash];
      const svgAsset = result.optimizedAssets.svgs[assetHash];
      const asset = imageAsset || svgAsset;

      if (!asset) continue;

      try {
        const optimizationResult = await this.smartOptimizer.optimizeAsset(
          asset,
          context,
          currentPayloadSize
        );

        this.applyOptimizationResult(assetHash, optimizationResult, result);
        result.assetsProcessed++;

      } catch (error) {
        console.error(`Failed to optimize asset ${assetHash}:`, error);
      }
    }

    result.optimizationRounds = 1;
    result.optimizedPayloadSizeMB = this.calculatePayloadSize(result.optimizedAssets);
    result.totalCompressionRatio = 
      (result.originalPayloadSizeMB - result.optimizedPayloadSizeMB) / result.originalPayloadSizeMB;

    return result;
  }

  /**
   * Apply optimization result to the asset registry
   */
  private applyOptimizationResult(
    assetHash: string,
    optimizationResult: OptimizationResult,
    result: ProgressiveOptimizationResult
  ): void {
    result.assetResults.set(assetHash, optimizationResult);

    if (optimizationResult.optimizedAsset === null) {
      // Asset was removed
      delete result.optimizedAssets.images[assetHash];
      delete result.optimizedAssets.svgs[assetHash];
      result.metadata.removedAssets.push(assetHash);
      result.assetsRemoved++;
      return;
    }

    // Asset was optimized
    if (optimizationResult.optimizedAsset && 'base64' in optimizationResult.optimizedAsset) {
      // It's an image asset
      result.optimizedAssets.images[assetHash] = optimizationResult.optimizedAsset as ImageAsset;
      
      if (optimizationResult.strategy === OptimizationStrategy.PRESERVE) {
        result.metadata.preservedAssets.push(assetHash);
      } else if (optimizationResult.strategy === OptimizationStrategy.ULTRA_AGGRESSIVE || 
                 optimizationResult.strategy === OptimizationStrategy.AGGRESSIVE) {
        result.metadata.aggressivelyOptimized.push(assetHash);
      }
    } else if (optimizationResult.optimizedAsset && 'svgCode' in optimizationResult.optimizedAsset) {
      // It's an SVG asset
      result.optimizedAssets.svgs[assetHash] = optimizationResult.optimizedAsset as SVGAsset;
      
      if (optimizationResult.strategy === OptimizationStrategy.CONVERT_SVG) {
        result.metadata.convertedAssets.push(assetHash);
      }
    }
  }

  /**
   * Get asset context data for optimization
   */
  private getAssetContext(assetHash: string, asset: ImageAsset | SVGAsset): AssetContextData {
    // This should ideally be cached from the initial analysis
    // For now, provide a basic context
    return {
      hash: assetHash,
      classification: this.inferAssetClassification(asset),
      importance: this.inferAssetImportance(asset),
      visualImpact: {
        viewportCoverage: 0.1,
        aboveFold: true,
        zIndex: 0,
        opacity: 1,
        isVisible: true,
        pixelDensity: 1
      },
      usageContext: {
        isRepeated: false,
        repetitionCount: 1,
        isBackground: false,
        isInteractive: false,
        semanticRole: 'content',
        contextualRelevance: 0.5
      },
      optimizationStrategy: OptimizationStrategy.BALANCED,
      preserveQuality: false,
      originalSize: this.isImageAsset(asset) ? 
        (asset.base64 ? (asset.base64.length * 0.75) / 1024 : 0) :
        (asset.svgCode ? asset.svgCode.length / 1024 : 0)
    };
  }

  /**
   * Calculate total payload size in MB
   */
  private calculatePayloadSize(assets: AssetRegistry): number {
    let totalBytes = 0;

    // Calculate image sizes
    Object.values(assets.images).forEach(asset => {
      if (asset.base64) {
        totalBytes += asset.base64.length * 0.75; // Account for base64 overhead
      }
    });

    // Calculate SVG sizes
    Object.values(assets.svgs).forEach(asset => {
      totalBytes += asset.svgCode.length;
    });

    return totalBytes / (1024 * 1024); // Convert to MB
  }

  // Helper methods

  private inferAssetClassification(asset: ImageAsset | SVGAsset): any {
    if (this.isImageAsset(asset)) {
      if (asset.width <= 64 && asset.height <= 64) return 'icon';
      if (asset.width > 800 || asset.height > 600) return 'hero';
      return 'content';
    } else {
      return 'icon'; // Most SVGs are icons
    }
  }

  private inferAssetImportance(asset: ImageAsset | SVGAsset): AssetImportance {
    if (this.isImageAsset(asset)) {
      if (asset.width > 800 || asset.height > 600) return AssetImportance.HIGH;
      if (asset.width <= 32 && asset.height <= 32) return AssetImportance.LOW;
      return AssetImportance.MEDIUM;
    } else {
      return AssetImportance.MEDIUM;
    }
  }

  private isImageAsset(asset: ImageAsset | SVGAsset): asset is ImageAsset {
    return 'base64' in asset;
  }
}

interface OptimizationRound {
  name: string;
  targets: string[]; // Asset hashes to optimize in this round
  intensity: number; // Optimization intensity (0-1)
}

export default ProgressiveAssetOptimizer;