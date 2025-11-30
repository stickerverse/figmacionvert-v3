import { ElementNode, ImageAsset, SVGAsset } from "../types/schema";

export interface AssetContextData {
  hash: string;
  classification: AssetClassification;
  importance: AssetImportance;
  visualImpact: VisualImpact;
  usageContext: UsageContext;
  optimizationStrategy: OptimizationStrategy;
  preserveQuality: boolean;
  originalSize?: number;
  targetSize?: number;
}

export enum AssetClassification {
  HERO = "hero",
  ICON = "icon",
  DECORATIVE = "decorative",
  BACKGROUND = "background",
  CONTENT = "content",
  COMPONENT = "component",
  LOGO = "logo",
}

export enum AssetImportance {
  CRITICAL = "critical", // Must preserve quality
  HIGH = "high", // Moderate optimization only
  MEDIUM = "medium", // Balanced optimization
  LOW = "low", // Aggressive optimization
  MINIMAL = "minimal", // Ultra-aggressive, can remove
}

export interface VisualImpact {
  viewportCoverage: number; // 0-1: portion of viewport covered
  aboveFold: boolean; // Is asset visible without scrolling
  zIndex: number; // Stacking context priority
  opacity: number; // Final opacity after transforms
  isVisible: boolean; // Actually visible to user
  pixelDensity: number; // Pixels per viewport unit
}

export interface UsageContext {
  isRepeated: boolean; // Asset used multiple times
  repetitionCount: number; // How many times it appears
  isBackground: boolean; // Used as background image
  isInteractive: boolean; // Part of interactive element
  semanticRole: string; // img, icon, decoration, content
  contextualRelevance: number; // 0-1: relevance to page content
}

export enum OptimizationStrategy {
  PRESERVE = "preserve", // No optimization
  MINIMAL = "minimal", // Light compression only
  BALANCED = "balanced", // Standard compression
  AGGRESSIVE = "aggressive", // Strong compression
  ULTRA_AGGRESSIVE = "ultra", // Maximum compression
  CONVERT_SVG = "convert-svg", // Convert to SVG if beneficial
  REMOVE = "remove", // Remove entirely
}

export class AssetContextAnalyzer {
  private viewport: { width: number; height: number };
  private assetUsageMap = new Map<string, ElementNode[]>();

  constructor(viewport: { width: number; height: number }) {
    this.viewport = viewport;
  }

  /**
   * Analyze all assets in the DOM tree and classify them for optimal compression
   */
  public analyzeAssets(
    tree: ElementNode,
    assets: {
      images: Record<string, ImageAsset>;
      svgs: Record<string, SVGAsset>;
    }
  ): Map<string, AssetContextData> {
    // First pass: Build usage map
    this.buildAssetUsageMap(tree);

    const analysisResults = new Map<string, AssetContextData>();

    // Analyze image assets
    Object.entries(assets.images).forEach(([hash, asset]) => {
      const context = this.analyzeImageAsset(hash, asset);
      analysisResults.set(hash, context);
    });

    // Analyze SVG assets
    Object.entries(assets.svgs).forEach(([hash, asset]) => {
      const context = this.analyzeSVGAsset(hash, asset);
      analysisResults.set(hash, context);
    });

    console.log("📊 Asset analysis complete:", {
      totalAssets: analysisResults.size,
      critical: Array.from(analysisResults.values()).filter(
        (a) => a.importance === AssetImportance.CRITICAL
      ).length,
      high: Array.from(analysisResults.values()).filter(
        (a) => a.importance === AssetImportance.HIGH
      ).length,
      medium: Array.from(analysisResults.values()).filter(
        (a) => a.importance === AssetImportance.MEDIUM
      ).length,
      low: Array.from(analysisResults.values()).filter(
        (a) => a.importance === AssetImportance.LOW
      ).length,
      minimal: Array.from(analysisResults.values()).filter(
        (a) => a.importance === AssetImportance.MINIMAL
      ).length,
    });

    return analysisResults;
  }

  /**
   * Build a map of which elements use each asset
   */
  private buildAssetUsageMap(element: ElementNode): void {
    // Check for image hash
    if (element.imageHash) {
      if (!this.assetUsageMap.has(element.imageHash)) {
        this.assetUsageMap.set(element.imageHash, []);
      }
      this.assetUsageMap.get(element.imageHash)!.push(element);
    }

    // Check for SVG in vector data
    if (element.vectorData?.svgCode) {
      // For SVGs, we'll use a hash of the SVG code as the key
      const svgHash = this.calculateHash(element.vectorData.svgCode);
      if (!this.assetUsageMap.has(svgHash)) {
        this.assetUsageMap.set(svgHash, []);
      }
      this.assetUsageMap.get(svgHash)!.push(element);
    }

    // Check for background images in fills
    element.fills?.forEach((fill) => {
      if (fill.type === "IMAGE" && fill.imageHash) {
        if (!this.assetUsageMap.has(fill.imageHash)) {
          this.assetUsageMap.set(fill.imageHash, []);
        }
        this.assetUsageMap.get(fill.imageHash)!.push(element);
      }
    });

    // Recurse through children
    element.children?.forEach((child) => this.buildAssetUsageMap(child));
  }

  /**
   * Analyze an image asset and determine its optimization context
   */
  private analyzeImageAsset(hash: string, asset: ImageAsset): AssetContextData {
    const elements = this.assetUsageMap.get(hash) || [];
    const primaryElement = elements[0]; // Use first element for primary analysis

    const visualImpact = this.calculateVisualImpact(elements, asset);
    const usageContext = this.calculateUsageContext(elements, asset);
    const classification = this.classifyImageAsset(
      asset,
      visualImpact,
      usageContext
    );
    const importance = this.calculateImportance(
      classification,
      visualImpact,
      usageContext
    );
    const strategy = this.determineOptimizationStrategy(
      classification,
      importance,
      asset
    );

    return {
      hash,
      classification,
      importance,
      visualImpact,
      usageContext,
      optimizationStrategy: strategy,
      preserveQuality: importance === AssetImportance.CRITICAL,
      originalSize: asset.data ? (asset.data.length * 0.75) / 1024 : undefined,
    };
  }

  /**
   * Analyze an SVG asset and determine its optimization context
   */
  private analyzeSVGAsset(hash: string, asset: SVGAsset): AssetContextData {
    const elements = this.assetUsageMap.get(hash) || [];

    const visualImpact = this.calculateSVGVisualImpact(elements, asset);
    const usageContext = this.calculateSVGUsageContext(elements, asset);
    const classification = this.classifySVGAsset(
      asset,
      visualImpact,
      usageContext
    );
    const importance = this.calculateImportance(
      classification,
      visualImpact,
      usageContext
    );
    const strategy = this.determineSVGOptimizationStrategy(
      classification,
      importance,
      asset
    );

    return {
      hash,
      classification,
      importance,
      visualImpact,
      usageContext,
      optimizationStrategy: strategy,
      preserveQuality: importance === AssetImportance.CRITICAL,
      originalSize: asset.svgCode ? asset.svgCode.length / 1024 : undefined,
    };
  }

  /**
   * Calculate the visual impact of an asset based on its usage in elements
   */
  private calculateVisualImpact(
    elements: ElementNode[],
    asset: ImageAsset
  ): VisualImpact {
    if (elements.length === 0) {
      return {
        viewportCoverage: 0,
        aboveFold: false,
        zIndex: 0,
        opacity: 0,
        isVisible: false,
        pixelDensity: 0,
      };
    }

    const primaryElement = elements[0];
    const { width, height } = primaryElement.layout;
    const { x, y } = primaryElement.layout;

    // Calculate viewport coverage
    const viewportArea = this.viewport.width * this.viewport.height;
    const elementArea = width * height;
    const viewportCoverage = Math.min(elementArea / viewportArea, 1);

    // Check if above fold (visible without scrolling)
    const aboveFold = y < this.viewport.height;

    // Calculate pixel density (how many asset pixels per viewport pixel)
    const pixelDensity =
      asset.width && asset.height
        ? (asset.width * asset.height) / (width * height)
        : 1;

    return {
      viewportCoverage,
      aboveFold,
      zIndex: primaryElement.zIndex || 0,
      opacity: primaryElement.opacity || 1,
      isVisible: (primaryElement.opacity || 1) > 0 && width > 0 && height > 0,
      pixelDensity: Math.max(pixelDensity, 0.1), // Avoid division by zero
    };
  }

  /**
   * Calculate visual impact for SVG assets
   */
  private calculateSVGVisualImpact(
    elements: ElementNode[],
    asset: SVGAsset
  ): VisualImpact {
    if (elements.length === 0) {
      return {
        viewportCoverage: 0,
        aboveFold: false,
        zIndex: 0,
        opacity: 0,
        isVisible: false,
        pixelDensity: 1, // SVGs scale well
      };
    }

    const primaryElement = elements[0];
    const { width, height } = primaryElement.layout;
    const { x, y } = primaryElement.layout;

    const viewportArea = this.viewport.width * this.viewport.height;
    const elementArea = width * height;
    const viewportCoverage = Math.min(elementArea / viewportArea, 1);

    const aboveFold = y < this.viewport.height;

    return {
      viewportCoverage,
      aboveFold,
      zIndex: primaryElement.zIndex || 0,
      opacity: primaryElement.opacity || 1,
      isVisible: (primaryElement.opacity || 1) > 0 && width > 0 && height > 0,
      pixelDensity: 1, // SVGs are vector-based
    };
  }

  /**
   * Calculate usage context for assets
   */
  private calculateUsageContext(
    elements: ElementNode[],
    asset: ImageAsset
  ): UsageContext {
    const repetitionCount = elements.length;
    const isRepeated = repetitionCount > 1;

    // Check if used as background
    const isBackground = elements.some((el) =>
      el.fills?.some(
        (fill) => fill.type === "IMAGE" && fill.imageHash === asset.hash
      )
    );

    // Check if part of interactive element
    const isInteractive = elements.some(
      (el) => el.interactions && el.interactions.length > 0
    );

    // Determine semantic role based on element properties
    const semanticRole = this.determinSemanticRole(elements[0]);

    // Calculate contextual relevance based on position and size
    const contextualRelevance = this.calculateContextualRelevance(
      elements,
      asset
    );

    return {
      isRepeated,
      repetitionCount,
      isBackground,
      isInteractive,
      semanticRole,
      contextualRelevance,
    };
  }

  /**
   * Calculate usage context for SVG assets
   */
  private calculateSVGUsageContext(
    elements: ElementNode[],
    asset: SVGAsset
  ): UsageContext {
    const repetitionCount = elements.length;
    const isRepeated = repetitionCount > 1;

    // SVGs are rarely backgrounds
    const isBackground = false;

    // Check for interactive usage
    const isInteractive = elements.some(
      (el) => el.interactions && el.interactions.length > 0
    );

    const semanticRole = this.determinSemanticRole(elements[0]);
    const contextualRelevance = this.calculateSVGContextualRelevance(
      elements,
      asset
    );

    return {
      isRepeated,
      repetitionCount,
      isBackground,
      isInteractive,
      semanticRole,
      contextualRelevance,
    };
  }

  /**
   * Classify an image asset based on its characteristics
   */
  private classifyImageAsset(
    asset: ImageAsset,
    visual: VisualImpact,
    usage: UsageContext
  ): AssetClassification {
    // Hero image: Large, above fold, high viewport coverage
    if (
      visual.viewportCoverage > 0.2 &&
      visual.aboveFold &&
      asset.width > 600
    ) {
      return AssetClassification.HERO;
    }

    // Icon: Small, often repeated
    if (asset.width <= 64 && asset.height <= 64 && usage.isRepeated) {
      return AssetClassification.ICON;
    }

    // Logo: Specific aspect ratio, often in header/footer area
    if (this.isLikelyLogo(asset, visual)) {
      return AssetClassification.LOGO;
    }

    // Background: Used as fill
    if (usage.isBackground) {
      return AssetClassification.BACKGROUND;
    }

    // Component: Part of repeated UI element
    if (usage.isRepeated && usage.contextualRelevance > 0.7) {
      return AssetClassification.COMPONENT;
    }

    // Content: Standard content image
    if (visual.viewportCoverage > 0.05) {
      return AssetClassification.CONTENT;
    }

    // Default to decorative
    return AssetClassification.DECORATIVE;
  }

  /**
   * Classify an SVG asset
   */
  private classifySVGAsset(
    asset: SVGAsset,
    visual: VisualImpact,
    usage: UsageContext
  ): AssetClassification {
    // Icons are the most common SVG use case
    if (asset.width <= 100 && asset.height <= 100) {
      return AssetClassification.ICON;
    }

    // Large SVGs that are repeated might be logos
    if (usage.isRepeated && this.isLikelySVGLogo(asset, visual)) {
      return AssetClassification.LOGO;
    }

    // Interactive SVGs
    if (usage.isInteractive) {
      return AssetClassification.COMPONENT;
    }

    return AssetClassification.DECORATIVE;
  }

  /**
   * Calculate importance based on classification and context
   */
  private calculateImportance(
    classification: AssetClassification,
    visual: VisualImpact,
    usage: UsageContext
  ): AssetImportance {
    // Critical assets that must preserve quality
    if (
      classification === AssetClassification.HERO ||
      classification === AssetClassification.LOGO
    ) {
      return AssetImportance.CRITICAL;
    }

    // High importance for visible, above-fold content
    if (visual.aboveFold && visual.viewportCoverage > 0.1) {
      return AssetImportance.HIGH;
    }

    // Interactive elements are important
    if (usage.isInteractive) {
      return AssetImportance.HIGH;
    }

    // Icons and components get medium priority
    if (
      classification === AssetClassification.ICON ||
      classification === AssetClassification.COMPONENT
    ) {
      return AssetImportance.MEDIUM;
    }

    // Content images get medium priority if reasonably sized
    if (
      classification === AssetClassification.CONTENT &&
      visual.viewportCoverage > 0.05
    ) {
      return AssetImportance.MEDIUM;
    }

    // Background elements can be optimized more aggressively
    if (classification === AssetClassification.BACKGROUND) {
      return AssetImportance.LOW;
    }

    // Small, invisible, or decorative elements can be heavily optimized
    if (!visual.isVisible || visual.viewportCoverage < 0.01) {
      return AssetImportance.MINIMAL;
    }

    return AssetImportance.LOW;
  }

  /**
   * Determine optimization strategy based on classification and importance
   */
  private determineOptimizationStrategy(
    classification: AssetClassification,
    importance: AssetImportance,
    asset: ImageAsset
  ): OptimizationStrategy {
    // Critical assets get minimal optimization
    if (importance === AssetImportance.CRITICAL) {
      return OptimizationStrategy.MINIMAL;
    }

    // High importance assets get balanced optimization
    if (importance === AssetImportance.HIGH) {
      return OptimizationStrategy.BALANCED;
    }

    // Icons might benefit from SVG conversion if they're small enough
    if (
      classification === AssetClassification.ICON &&
      asset.width <= 32 &&
      asset.height <= 32
    ) {
      return OptimizationStrategy.CONVERT_SVG;
    }

    // Medium importance gets standard optimization
    if (importance === AssetImportance.MEDIUM) {
      return OptimizationStrategy.BALANCED;
    }

    // Low importance gets aggressive optimization
    if (importance === AssetImportance.LOW) {
      return OptimizationStrategy.AGGRESSIVE;
    }

    // Minimal importance can be ultra-aggressively optimized or removed
    return OptimizationStrategy.ULTRA_AGGRESSIVE;
  }

  /**
   * Determine SVG optimization strategy
   */
  private determineSVGOptimizationStrategy(
    classification: AssetClassification,
    importance: AssetImportance,
    asset: SVGAsset
  ): OptimizationStrategy {
    if (importance === AssetImportance.CRITICAL) {
      return OptimizationStrategy.PRESERVE;
    }

    if (importance === AssetImportance.HIGH) {
      return OptimizationStrategy.MINIMAL;
    }

    // SVGs can generally handle more optimization
    if (importance === AssetImportance.MEDIUM) {
      return OptimizationStrategy.BALANCED;
    }

    if (importance === AssetImportance.LOW) {
      return OptimizationStrategy.AGGRESSIVE;
    }

    return OptimizationStrategy.ULTRA_AGGRESSIVE;
  }

  // Helper methods

  private determinSemanticRole(element: ElementNode): string {
    if (element.type === "IMAGE") return "img";
    if (element.type === "VECTOR") return "icon";
    if (element.htmlTag === "img") return "img";
    if (element.htmlTag === "svg") return "icon";
    if (element.cssClasses.some((cls) => cls.includes("icon"))) return "icon";
    if (element.cssClasses.some((cls) => cls.includes("logo"))) return "logo";
    return "decoration";
  }

  private calculateContextualRelevance(
    elements: ElementNode[],
    asset: ImageAsset
  ): number {
    // Simple heuristic based on size and position
    const element = elements[0];
    if (!element) return 0;

    const { width, height, x, y } = element.layout;

    // Larger elements are more relevant
    const sizeScore = Math.min(1, (width * height) / (200 * 200));

    // Above-fold elements are more relevant
    const positionScore = y < this.viewport.height ? 1 : 0.3;

    // Interactive elements are more relevant
    const interactionScore = element.interactions ? 0.3 : 0;

    return Math.min(1, sizeScore + positionScore + interactionScore);
  }

  private calculateSVGContextualRelevance(
    elements: ElementNode[],
    asset: SVGAsset
  ): number {
    const element = elements[0];
    if (!element) return 0;

    // SVGs are often functional, so base relevance is higher
    const baseScore = 0.6;

    const interactionScore = element.interactions ? 0.4 : 0;

    return Math.min(1, baseScore + interactionScore);
  }

  private isLikelyLogo(asset: ImageAsset, visual: VisualImpact): boolean {
    // Logo heuristics: reasonable aspect ratio, positioned in header/footer area
    const aspectRatio = asset.width / asset.height;
    const isReasonableAspectRatio = aspectRatio >= 0.5 && aspectRatio <= 4;
    const isHeaderFooterArea = visual.viewportCoverage < 0.1; // Not too large

    return isReasonableAspectRatio && isHeaderFooterArea;
  }

  private isLikelySVGLogo(asset: SVGAsset, visual: VisualImpact): boolean {
    // Similar heuristics for SVG logos
    const aspectRatio = asset.width / asset.height;
    const isReasonableAspectRatio = aspectRatio >= 0.5 && aspectRatio <= 4;

    return isReasonableAspectRatio && visual.viewportCoverage < 0.1;
  }

  private calculateHash(content: string): string {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}
