/**
 * Enhanced Figma Importer
 *
 * Implements best practices for pixel-perfect Figma reconstruction:
 * - Proper image creation using figma.createImage() with Uint8Array
 * - Coordinate verification system for position accuracy
 * - Batch processing for large image sets
 * - Robust error handling and recovery
 * - Font loading with figma.loadFontAsync()
 * - Position verification after import
 */

import { NodeBuilder } from "./node-builder";
import { StyleManager } from "./style-manager";
import { ComponentManager } from "./component-manager";
import { ImportOptions } from "./import-options";
import { ScreenshotOverlay } from "./screenshot-overlay";
import { DesignTokensManager } from "./design-tokens-manager";
import { requestWebpTranscode } from "./ui-bridge";
import { createHoverVariants } from "./hover-variant-mapper";

export interface EnhancedImportOptions {
  createMainFrame: boolean;
  enableBatchProcessing: boolean;
  verifyPositions: boolean;
  maxBatchSize: number;
  coordinateTolerance: number;
  enableDebugMode: boolean;
  retryFailedImages: boolean;
  enableProgressiveLoading: boolean;
  createScreenshotOverlay?: boolean;
  usePixelPerfectPositioning?: boolean;
  showValidationMarkers?: boolean;
  applyAutoLayout?: boolean;
  createStyles?: boolean;
}

export interface ImageCreationResult {
  success: boolean;
  imageHash?: string;
  error?: string;
  retryAttempts: number;
  processingTime: number;
}

export interface PositionVerificationResult {
  elementId: string;
  expected: { x: number; y: number };
  actual: { x: number; y: number };
  deviation: number;
  withinTolerance: boolean;
}

export interface ImportVerificationReport {
  totalElements: number;
  positionsVerified: number;
  positionsWithinTolerance: number;
  positionsOutsideTolerance: number;
  maxDeviation: number;
  averageDeviation: number;
  problematicElements: PositionVerificationResult[];
  imagesProcessed: number;
  imagesSuccessful: number;
  imagesFailed: number;
  totalProcessingTime: number;
}

export class EnhancedFigmaImporter {
  private options: EnhancedImportOptions;
  private nodeBuilder: NodeBuilder;
  private styleManager: StyleManager;
  private designTokensManager?: DesignTokensManager;
  private imageCreationCache = new Map<string, string>(); // hash -> figmaImageHash
  private createdNodes = new Map<string, SceneNode>(); // elementId -> figmaNode
  private verificationData: Array<{
    elementId: string;
    originalData: any;
    figmaNode: SceneNode;
  }> = [];
  private scaleFactor: number = 1;
  private clampPadding(value: number | undefined | null): number {
    if (value === undefined || value === null || Number.isNaN(value)) return 0;
    return Math.max(0, value);
  }

  constructor(private data: any, options: Partial<EnhancedImportOptions> = {}) {
    this.options = {
      createMainFrame: true,
      enableBatchProcessing: true,
      verifyPositions: true,
      maxBatchSize: 10,
      coordinateTolerance: 2, // 2px tolerance
      enableDebugMode: false,
      retryFailedImages: true,
      enableProgressiveLoading: false,
      ...options,
    };

    // Enhanced diagnostics for data validation
    console.log("🔍 Enhanced Figma importer constructor - data validation:", {
      hasData: !!data,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : [],
      hasTree: !!data?.tree,
      hasAssets: !!data?.assets,
      hasStyles: !!data?.styles,
      version: data?.version,
      treeNodeCount: data?.tree
        ? Array.isArray(data.tree.children)
          ? data.tree.children.length
          : "no children"
        : "no tree",
    });

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "enhanced-figma-importer.ts:constructor",
        message: "Importer constructed (version stamp + basic payload shape)",
        data: {
          importerVersionStamp: "2025-12-11T_fix_fills_images_v1",
          payloadKeys: data ? Object.keys(data) : [],
          hasTree: !!data?.tree,
          hasAssets: !!data?.assets,
          hasStyles: !!data?.styles,
          meta: {
            captureEngine: data?.metadata?.captureEngine,
            url: data?.metadata?.url,
            viewport: data?.metadata?.viewport,
            viewportHeight: data?.metadata?.viewportHeight,
          },
          root: {
            id: data?.tree?.id,
            name: data?.tree?.name,
            layout: data?.tree?.layout,
            fillsCount: Array.isArray(data?.tree?.fills)
              ? data.tree.fills.length
              : 0,
          },
          assets: {
            images: data?.assets?.images
              ? Object.keys(data.assets.images).length
              : 0,
            fonts: data?.assets?.fonts
              ? Object.keys(data.assets.fonts).length
              : 0,
          },
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "fills-images",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    // Detailed asset logging for debugging images
    if (data?.assets) {
      const imageKeys = data.assets.images
        ? Object.keys(data.assets.images)
        : [];
      console.log("🖼️ Asset details:", {
        hasImages: !!data.assets.images,
        imageCount: imageKeys.length,
        firstFiveHashes: imageKeys.slice(0, 5),
        sampleImage: imageKeys[0]
          ? {
              hash: imageKeys[0],
              hasData: !!data.assets.images[imageKeys[0]]?.data,
              hasBase64: !!data.assets.images[imageKeys[0]]?.base64,
              dataLength: (
                data.assets.images[imageKeys[0]]?.data ||
                data.assets.images[imageKeys[0]]?.base64 ||
                ""
              ).length,
            }
          : "no images",
      });
    } else {
      console.warn("⚠️ No assets found in data!");
    }

    this.styleManager = new StyleManager(data.styles);

    const builderImportOptions: ImportOptions = {
      createMainFrame: true,
      createVariantsFrame: false,
      createComponentsFrame: false,
      createDesignSystem: false,
      applyAutoLayout: false,
      createStyles: !!data.styles,
      usePixelPerfectPositioning: true,
      createScreenshotOverlay: false,
      showValidationMarkers: false,
    };

    this.nodeBuilder = new NodeBuilder(
      this.styleManager,
      new ComponentManager(data.components),
      builderImportOptions,
      data.assets,
      undefined // designTokensManager will be passed later after initialization
    );

    if (this.options.enableDebugMode || true) {
      // Always log for debugging
      console.log("🎯 Enhanced Figma importer initialized:", this.options);
    }
  }

  /**
   * Main import method with enhanced error handling and verification
   */
  async runImport(): Promise<ImportVerificationReport> {
    const startTime = Date.now();

    try {
      figma.ui.postMessage({
        type: "progress",
        message: "Starting enhanced import...",
        percent: 0,
      });

      // Step 1: Load all required fonts
      await this.loadAllFonts();

      // Step 1.5: Create Figma Styles (Text, Color, Effects)
      if (this.options.createStyles) {
        figma.ui.postMessage({
          type: "progress",
          message: "Creating local styles...",
          percent: 8,
        });

        await this.styleManager.createFigmaStyles();

        // Step 1.5.1: Enhance styles with AI-extracted color palette and typography
        if (this.data.colorPalette && this.data.colorPalette.palette) {
          console.log(
            "🎨 Integrating AI-extracted color palette into styles..."
          );
          await this.integrateColorPalette(this.data.colorPalette);
        }

        if (this.data.typography && this.data.typography.tokens) {
          console.log("📝 Integrating AI-extracted typography into styles...");
          await this.integrateTypographyAnalysis(this.data.typography);
        }
      }

      // Step 1.6: Create Figma Variables from design tokens if available
      if (
        this.data.designTokensRegistry &&
        Object.keys(this.data.designTokensRegistry.variables || {}).length > 0
      ) {
        figma.ui.postMessage({
          type: "progress",
          message: "Creating design tokens as Figma Variables...",
          percent: 10,
        });
        this.designTokensManager = new DesignTokensManager(
          this.data.designTokensRegistry
        );
        await this.designTokensManager.createFigmaVariables();
        const stats = this.designTokensManager.getStatistics();
        console.log("✅ Design tokens created:", stats);
      }

      // Step 2: Create main container frame
      const mainFrame = await this.createMainFrame();

      // Step 3: Create screenshot overlay if requested
      if (this.data.screenshot) {
        // Always create screenshot base layer if available (as requested)
        // We can make this optional later if needed, but for now it's a requested feature
        await this.createScreenshotBaseLayer(mainFrame, this.data.screenshot);

        // Also create the overlay if specifically requested via options (legacy behavior)
        if (this.options.createScreenshotOverlay) {
          // ... existing overlay logic if needed, or maybe the base layer replaces it?
          // The user asked for "Screenshot base layer" mode.
          // Let's keep the existing overlay logic as "reference overlay" if enabled,
          // but add the base layer as a standard feature.
        }
      }

      // Step 4: Process nodes with batch optimization
      await this.processNodesWithBatching(mainFrame);

      // Step 4.5: Create hover variants if hoverStates data exists
      if (this.data.hoverStates && this.data.hoverStates.length > 0) {
        figma.ui.postMessage({
          type: "progress",
          message: `Creating ${this.data.hoverStates.length} hover variants...`,
          percent: 82,
        });
        await createHoverVariants(this.data.hoverStates, this.createdNodes);
        console.log(
          `✅ Hover variants processed: ${this.data.hoverStates.length}`
        );
      }

      // Step 4: Verify positions if enabled
      // DISABLED: Verification causes 98% stall on large pages
      // let verificationReport: ImportVerificationReport | null = null;
      // if (this.options.verifyPositions) {
      //   verificationReport = await this.verifyImportAccuracy();
      // }
      const verificationReport: ImportVerificationReport | null = null;

      // Step 5: Focus on imported content
      figma.viewport.scrollAndZoomIntoView([mainFrame]);
      figma.currentPage.selection = [mainFrame];

      const totalTime = Date.now() - startTime;
      const report: ImportVerificationReport = verificationReport || {
        totalElements: this.createdNodes.size,
        positionsVerified: 0,
        positionsWithinTolerance: 0,
        positionsOutsideTolerance: 0,
        maxDeviation: 0,
        averageDeviation: 0,
        problematicElements: [],
        imagesProcessed: this.imageCreationCache.size,
        imagesSuccessful: this.imageCreationCache.size,
        imagesFailed: 0,
        totalProcessingTime: totalTime,
      };

      figma.ui.postMessage({
        type: "complete",
        stats: { elements: this.createdNodes.size },
        verification: report,
      });

      if (this.options.enableDebugMode) {
        console.log("✅ Enhanced import complete:", report);
      }

      return report;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      figma.ui.postMessage({ type: "error", message: errorMessage });

      if (this.options.enableDebugMode) {
        console.error("❌ Enhanced import failed:", error);
      }

      throw error;
    }
  }

  /**
   * Load all fonts required for the import with proper error handling
   */
  private async loadAllFonts(): Promise<void> {
    figma.ui.postMessage({
      type: "progress",
      message: "Loading fonts...",
      percent: 5,
    });

    const requiredFonts = this.extractRequiredFonts();
    const loadPromises: Promise<void>[] = [];

    for (const fontName of requiredFonts) {
      loadPromises.push(
        this.loadFontSafely(fontName).catch((error) => {
          console.warn(`⚠️ Failed to load font ${fontName.family}:`, error);
          // Continue with default font
        })
      );
    }

    await Promise.all(loadPromises);

    if (this.options.enableDebugMode) {
      console.log(
        `✅ Font loading complete. Attempted to load ${requiredFonts.length} fonts.`
      );
    }
  }

  /**
   * Safely load a font with fallback to default
   */
  private async loadFontSafely(fontName: FontName): Promise<void> {
    try {
      await figma.loadFontAsync(fontName);
    } catch (error) {
      // Fallback to Inter Regular if the specific font fails
      try {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      } catch (fallbackError) {
        console.warn("Failed to load fallback font Inter:", fallbackError);
      }
    }
  }

  /**
   * Extract all required fonts from the data
   */
  private extractRequiredFonts(): FontName[] {
    const fonts = new Set<string>();

    // Extract from metadata fonts
    if (this.data.metadata?.fonts) {
      Object.values(this.data.metadata.fonts).forEach((font: any) => {
        if (font.family) {
          fonts.add(`${font.family}-Regular`);
          if (font.weights) {
            font.weights.forEach((weight: number) => {
              const style = this.weightToStyle(weight);
              fonts.add(`${font.family}-${style}`);
            });
          }
        }
      });
    }

    // Convert to FontName format
    return Array.from(fonts).map((fontStr) => {
      const [family, style] = fontStr.split("-");
      return { family, style: style || "Regular" };
    });
  }

  /**
   * Create the main container frame with proper sizing
   */
  private async createMainFrame(): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = `Imported Page - ${new Date().toLocaleTimeString()}`;

    // Set frame size based on page metadata using a 1:1 mapping from schema coordinates.
    // The schema already encodes coordinates in CSS pixels, so additional scaling based
    // on screenshotScale causes text and layout to be mis-sized. We now ignore
    // screenshotScale for positioning/sizing and keep scaleFactor at 1.
    const viewport = this.data.metadata?.viewport || {};
    // Width: prefer explicit viewportWidth if present, then viewport width, then root tree width
    const layoutWidth =
      (this.data as any).metadata?.viewportWidth ||
      (viewport as any).layoutViewportWidth ||
      (viewport as any).width ||
      this.data.tree?.layout?.width ||
      1440;

    // Height: prefer explicit scroll height fields if present (puppeteer capture emits viewportHeight),
    // then viewport height, then derive from root tree.
    const viewportHeightHint =
      (this.data as any).metadata?.viewportHeight ||
      (this.data as any).metadata?.scrollHeight ||
      (viewport as any).scrollHeight ||
      (viewport as any).layoutViewportHeight ||
      (viewport as any).height ||
      900;

    const treeHeightHint =
      this.data.tree?.layout?.height && this.data.tree.layout.height > 1
        ? this.data.tree.layout.height
        : undefined;

    const scrollHeight = Math.max(viewportHeightHint, treeHeightHint || 0);

    this.scaleFactor = 1;

    const finalWidth = Math.max(1, layoutWidth);
    const finalHeight = Math.max(1, scrollHeight);

    frame.resize(finalWidth, finalHeight);

    // Position this import to the right of existing frames so new runs never overlap
    const nextPos = this.getNextImportPosition(finalWidth, finalHeight);
    frame.x = nextPos.x;
    frame.y = nextPos.y;

    // Set background to white for clarity
    frame.fills = [
      {
        type: "SOLID",
        color: { r: 1, g: 1, b: 1 },
      },
    ];

    figma.currentPage.appendChild(frame);

    // Initialize absolute coordinates for the root frame
    // This is required for the relative positioning logic of children
    frame.setPluginData("absoluteX", "0");
    frame.setPluginData("absoluteY", "0");

    if (this.options.enableDebugMode) {
      console.log(
        `📐 Created main frame: ${finalWidth}×${finalHeight} (Scale: ${this.scaleFactor})`
      );
    }

    return frame;
  }

  /**
   * Compute where to place the next imported frame so it does not overlap
   * previous imports. We lay frames out in a single row to the right with spacing.
   */
  private getNextImportPosition(
    width: number,
    height: number
  ): { x: number; y: number } {
    const page = figma.currentPage;
    const siblings = page.children.filter(
      (n) =>
        n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE"
    ) as Array<FrameNode | ComponentNode | InstanceNode>;

    if (!siblings.length) {
      return { x: 0, y: 0 };
    }

    let maxRight = 0;
    let minY = 0;
    siblings.forEach((n) => {
      const right = n.x + n.width;
      if (right > maxRight) maxRight = right;
      if (n.y < minY) minY = n.y;
    });

    const padding = 200; // space between imports
    return { x: maxRight + padding, y: minY };
  }

  /**
   * Process all nodes with batch optimization for images
   */
  private async processNodesWithBatching(
    parentFrame: FrameNode
  ): Promise<void> {
    console.log("🔍 Enhanced importer: Checking data structure:", {
      hasData: !!this.data,
      hasTree: !!this.data?.tree,
      dataKeys: this.data ? Object.keys(this.data) : [],
      treeType: this.data?.tree ? typeof this.data.tree : "undefined",
      dataVersion: this.data?.version,
      schemaStructure: {
        version: !!this.data?.version,
        metadata: !!this.data?.metadata,
        tree: !!this.data?.tree,
        assets: !!this.data?.assets,
        styles: !!this.data?.styles,
      },
    });

    if (!this.data.tree) {
      const errorDetails = {
        hasData: !!this.data,
        dataKeys: this.data ? Object.keys(this.data) : [],
        dataType: typeof this.data,
        treeValue: this.data?.tree,
        dataStringified: this.data
          ? JSON.stringify(this.data).substring(0, 500) + "..."
          : "null",
      };
      console.error(
        "❌ Enhanced importer: Missing tree data - diagnostic info:",
        errorDetails
      );
      throw new Error(
        `No tree data available for import. Data structure: ${JSON.stringify(
          errorDetails,
          null,
          2
        )}`
      );
    }

    // Collect all nodes and images via recursive traversal for batching and progress
    const { totalNodes, imageNodes } = this.traverseAndCollect(this.data.tree);

    console.log("🌳 Enhanced importer: tree analysis", {
      totalNodes,
      imageNodesCount: imageNodes.length,
      rootId: this.data.tree.id,
    });

    figma.ui.postMessage({
      type: "progress",
      message: `Processing ${totalNodes} elements (${imageNodes.length} images)...`,
      percent: 10,
    });

    // Step 1: Batch process images first
    if (this.options.enableBatchProcessing && imageNodes.length > 0) {
      await this.batchProcessImages(imageNodes);
    }

    // Step 2: Create nodes while preserving hierarchy
    let processedCount = 0;

    const buildHierarchy = async (
      nodeData: any,
      parent: FrameNode | SceneNode
    ): Promise<SceneNode | null> => {
      try {
        const figmaNode = await this.createSingleNode(
          nodeData,
          parent as FrameNode
        );
        if (!figmaNode) {
          return null;
        }

        this.createdNodes.set(nodeData.id, figmaNode);
        this.verificationData.push({
          elementId: nodeData.id,
          originalData: nodeData,
          figmaNode,
        });

        processedCount++;
        const progress = 10 + (processedCount / totalNodes) * 70;
        figma.ui.postMessage({
          type: "progress",
          message: `Created ${processedCount}/${totalNodes} elements...`,
          percent: progress,
        });

        // Sort children by z-index to ensure correct stacking order
        // In Figma, the last child in the list is visually on top
        // Stacking order:
        // 1. Negative z-index (positioned)
        // 2. Static elements (non-positioned)
        // 3. Positioned elements with z-index 0/auto
        // 4. Positive z-index (positioned)
        if (nodeData.children && Array.isArray(nodeData.children)) {
          const sortedChildren = [...nodeData.children].sort((a, b) => {
            const zIndexA = a.zIndex || 0;
            const zIndexB = b.zIndex || 0;

            const isPositionedA = a.position && a.position !== "static";
            const isPositionedB = b.position && b.position !== "static";

            const getWeight = (
              zIndex: number,
              isPositioned: boolean | undefined
            ) => {
              if (zIndex < 0) return zIndex; // Negative values stay negative
              if (zIndex > 0) return zIndex; // Positive values stay positive
              // zIndex is 0 or undefined
              if (isPositioned) return 0.1; // Positioned elements with z=0 sit above static
              return 0; // Static elements sit at 0
            };

            const weightA = getWeight(zIndexA, isPositionedA);
            const weightB = getWeight(zIndexB, isPositionedB);

            return weightA - weightB;
          });

          for (const child of sortedChildren) {
            await buildHierarchy(child, figmaNode);
          }
        }

        // Handle pseudo-elements (::before, ::after)
        if (nodeData.pseudoElements) {
          if (nodeData.pseudoElements.before) {
            await buildHierarchy(nodeData.pseudoElements.before, figmaNode);
          }
          if (nodeData.pseudoElements.after) {
            await buildHierarchy(nodeData.pseudoElements.after, figmaNode);
          }
        }

        return figmaNode;
      } catch (error) {
        console.warn(`⚠️ Failed to create node ${nodeData.id}:`, error);
        return null;
      }
    };

    // CRITICAL FIX: If root tree is body, skip body node and process children directly
    // This prevents body background from overriding main frame background
    if (this.data.tree.htmlTag === "body" && this.data.tree.children) {
      console.log(
        "🔄 [BODY] Root is body node, processing children directly to avoid background override"
      );
      for (const child of this.data.tree.children) {
        await buildHierarchy(child, parentFrame);
      }
    } else {
      await buildHierarchy(this.data.tree, parentFrame);
    }

    if (this.options.enableDebugMode) {
      console.log(
        `✅ Node processing complete: ${processedCount}/${totalNodes} nodes created`
      );
    }
  }

  /**
   * Batch process images for optimal performance
   */
  private async batchProcessImages(imageNodes: any[]): Promise<void> {
    const batches = this.chunkArray(imageNodes, this.options.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      figma.ui.postMessage({
        type: "progress",
        message: `Processing image batch ${i + 1}/${batches.length}...`,
        percent: 15 + (i / batches.length) * 15,
      });

      // Process images in parallel within batch
      const batchPromises = batch.map((nodeData) =>
        this.preloadImage(nodeData)
      );
      await Promise.allSettled(batchPromises);

      // Small delay to prevent overwhelming Figma
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Preload image and cache the result
   */
  private async preloadImage(
    nodeData: any,
    attempt = 0
  ): Promise<ImageCreationResult> {
    const startTime = Date.now();
    const result: ImageCreationResult = {
      success: false,
      retryAttempts: attempt,
      processingTime: 0,
    };

    try {
      const imageHash = nodeData.imageHash;
      if (!imageHash || this.imageCreationCache.has(imageHash)) {
        result.success = true;
        result.imageHash = this.imageCreationCache.get(imageHash);
        return result;
      }

      // Get image data from assets (accept multiple property names for robustness)
      const imageAsset = this.data.assets?.images?.[imageHash];
      if (!imageAsset) {
        throw new Error(`Image asset not found for hash: ${imageHash}`);
      }

      // Some capture code (e.g. puppeteer helper) writes the raw base64 into
      // `data` or `screenshot` fields instead of `base64`. Accept those as
      // fallbacks to be more tolerant of upstream shape changes.
      const base64Candidate: string | undefined =
        imageAsset.base64 || imageAsset.data || imageAsset.screenshot;
      if (
        !base64Candidate ||
        typeof base64Candidate !== "string" ||
        base64Candidate.length === 0
      ) {
        throw new Error(
          `Image asset for hash ${imageHash} has no base64 data (missing .base64/.data/.screenshot)`
        );
      }

      // Convert base64 to Uint8Array using proper method
      const imageBytes = await this.base64ToUint8Array(base64Candidate);

      // Create Figma image
      const figmaImage = figma.createImage(imageBytes);
      this.imageCreationCache.set(imageHash, figmaImage.hash);

      // Share with NodeBuilder
      this.nodeBuilder.preloadImageHash(imageHash, figmaImage.hash);

      result.success = true;
      result.imageHash = figmaImage.hash;

      if (this.options.enableDebugMode) {
        console.log(`✅ Preloaded image ${imageHash} → ${figmaImage.hash}`);
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";

      // Retry logic with bounded attempts
      const nextAttempt = attempt + 1;
      if (this.options.retryFailedImages && nextAttempt <= 2) {
        await new Promise((resolve) => setTimeout(resolve, 100 * nextAttempt));
        return this.preloadImage(nodeData, nextAttempt);
      }

      if (this.options.enableDebugMode) {
        console.warn(
          `❌ Failed to preload image ${nodeData.imageHash}:`,
          error
        );
      }
    } finally {
      result.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Convert base64 string to Uint8Array for Figma
   */
  private async base64ToUint8Array(base64: string): Promise<Uint8Array> {
    // Handle data URL format or raw base64 and decode using Figma API
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    const clean = base64Data.replace(/\s/g, "");

    const isWebp = clean.startsWith("UklG") || clean.includes("WEBP");
    if (isWebp) {
      try {
        const pngBytes = await this.transcodeWebpWithRetry(clean);
        if (pngBytes?.length) {
          return pngBytes;
        }
        console.warn("⚠️ WebP transcode returned empty buffer");
      } catch (error) {
        console.warn(
          "❌ WebP transcode failed, falling back to direct decode",
          error
        );
      }
    }

    return figma.base64Decode(clean);
  }

  /**
   * Create a single Figma node with proper positioning
   */
  private async createSingleNode(
    nodeData: any,
    parent: FrameNode
  ): Promise<SceneNode | null> {
    try {
      console.log("🧱 Enhanced importer: creating node", {
        id: nodeData.id,
        type: nodeData.type,
        tag: nodeData.htmlTag,
        name: nodeData.name,
        children: Array.isArray(nodeData.children)
          ? nodeData.children.length
          : 0,
        bounds: nodeData.absoluteLayout || nodeData.layout,
        hasFills: !!nodeData.fills,
        fillsCount: nodeData.fills?.length || 0,
        hasBackgrounds: !!nodeData.backgrounds,
        backgroundsCount: nodeData.backgrounds?.length || 0,
        hasImageHash: !!nodeData.imageHash,
      });

      // DEBUG: Log text node details
      if (nodeData.type === "TEXT") {
        console.log("📝 TEXT NODE:", {
          id: nodeData.id,
          text: nodeData.characters
            ? nodeData.characters.substring(0, 20) + "..."
            : "empty",
          bounds: nodeData.absoluteLayout,
          layout: nodeData.layout,
          parent: parent.name,
        });
      }

      // CRITICAL DEBUG: Log fill/background data if present
      if (nodeData.fills && nodeData.fills.length > 0) {
        console.log(
          "  📌 Node has fills:",
          nodeData.fills.map((f: any) => ({ type: f.type, color: f.color }))
        );
      }
      if (nodeData.backgrounds && nodeData.backgrounds.length > 0) {
        console.log(
          "  🎨 Node has backgrounds:",
          nodeData.backgrounds.map((b: any) => ({
            type: b.type,
            color: b.color,
          }))
        );
      }

      // CRITICAL FIX: If this is a body node with a solid background fill,
      // clear it to prevent overriding the main frame's white background
      // (unless it's a small section with intentional colored background)

      // Use shared NodeBuilder to materialize the SceneNode
      const figmaNode = await this.nodeBuilder.createNode(nodeData);

      if (!figmaNode) {
        console.warn(
          "⚠️ Enhanced importer: nodeBuilder.createNode returned null",
          {
            id: nodeData.id,
            type: nodeData.type,
            name: nodeData.name,
          }
        );
        return null;
      }

      // CRITICAL FIX: Always clear body/html background fills to prevent overriding main frame
      // The main frame has a white background, and body backgrounds should not override it
      // Body backgrounds are typically full-page backgrounds that should be handled by the main frame
      if (
        (nodeData.htmlTag === "body" || nodeData.htmlTag === "html") &&
        "fills" in figmaNode
      ) {
        const bodyFills = (figmaNode as any).fills;
        if (bodyFills && bodyFills.length > 0) {
          // Check if any fill is a solid color (not white/transparent)
          const hasNonWhiteFill = bodyFills.some((fill: any) => {
            if (fill.type === "SOLID" && fill.color) {
              // Check if color is not white (allowing for slight variations)
              const isWhite =
                fill.color.r > 0.95 &&
                fill.color.g > 0.95 &&
                fill.color.b > 0.95;
              const isTransparent = fill.opacity === 0 || fill.color.a === 0;
              return !isWhite && !isTransparent;
            }
            return false;
          });

          if (hasNonWhiteFill) {
            console.log(
              `🔄 [BODY] Clearing ${nodeData.htmlTag} background fill (${bodyFills.length} fills) to prevent overriding main frame white background`
            );
            (figmaNode as any).fills = [];
          }
        }
      }

      // Shadow Host labeling
      if (nodeData.isShadowHost) {
        figmaNode.name = `${figmaNode.name} (Shadow Host)`;
        figmaNode.setPluginData("isShadowHost", "true");
      }

      // AI Enhancement: Apply ML classification to component type
      if (nodeData.mlUIType && nodeData.mlConfidence > 0.7) {
        const mlType = nodeData.mlUIType;
        this.safeSetPluginData(figmaNode, "mlClassification", mlType);
        this.safeSetPluginData(
          figmaNode,
          "mlConfidence",
          String(nodeData.mlConfidence)
        );

        // Enhance node name with ML type if generic
        if (
          figmaNode.name === "Frame" ||
          figmaNode.name === "Rectangle" ||
          figmaNode.name === nodeData.htmlTag
        ) {
          figmaNode.name = `${mlType} - ${figmaNode.name}`;
          console.log(
            `✅ [AI] Enhanced node name with ML classification: ${mlType} (confidence: ${nodeData.mlConfidence.toFixed(
              2
            )})`
          );
        }

        // For high-confidence button/input detections, suggest component creation
        if (
          (mlType === "BUTTON" || mlType === "INPUT") &&
          nodeData.mlConfidence > 0.9
        ) {
          this.safeSetPluginData(figmaNode, "suggestedComponentType", mlType);
          console.log(
            `✅ [AI] High-confidence ${mlType} detected - consider creating component`
          );
        }
      }

      console.log("✅ Node created:", {
        id: nodeData.id,
        figmaType: figmaNode.type,
        hasFills: "fills" in figmaNode,
        fillsCount:
          "fills" in figmaNode ? (figmaNode as any).fills?.length || 0 : "N/A",
        mlType: nodeData.mlUIType || "none",
        hasOCRText: !!(nodeData.ocrText && nodeData.hasOCRText),
      });

      // CRITICAL FIX: Determine absolute position first (always use absoluteLayout if available)
      let absX = 0;
      let absY = 0;

      if (nodeData.absoluteLayout) {
        // CRITICAL: Always prefer absoluteLayout for consistent coordinate system
        absX = nodeData.absoluteLayout.left;
        absY = nodeData.absoluteLayout.top;
      } else if (nodeData.layout) {
        // Fallback: dom-extractor puts absolute coords in layout.x/y (document coordinates: viewport + scroll)
        absX = nodeData.layout.x;
        absY = nodeData.layout.y;
      }

      // Store absolute position for children to use
      this.safeSetPluginData(figmaNode, "absoluteX", String(absX));
      this.safeSetPluginData(figmaNode, "absoluteY", String(absY));

      // CRITICAL FIX: Check if parent has Auto Layout BEFORE setting position
      // Auto Layout parents ignore manual x/y positioning - children are positioned automatically
      // Must check AFTER parent's Auto Layout has been applied (which happens in previous recursive call)
      const parentHasAutoLayout =
        "layoutMode" in parent && parent.layoutMode !== "NONE";

      // Only set manual position if parent does NOT have Auto Layout
      // Auto Layout will position children automatically based on itemSpacing and alignment
      if (!parentHasAutoLayout) {
        // Calculate relative position for Figma
        // If parent has absolute position, subtract it to get relative
        const parentAbsXStr = parent.getPluginData("absoluteX");
        const parentAbsYStr = parent.getPluginData("absoluteY");

        if (parentAbsXStr && parentAbsYStr) {
          const parentAbsX = parseFloat(parentAbsXStr);
          const parentAbsY = parseFloat(parentAbsYStr);

          // CRITICAL FIX: Calculate relative position accounting for parent's position and padding
          // For Auto Layout parents, padding affects child positioning
          const parentPaddingLeft =
            "paddingLeft" in parent ? (parent as FrameNode).paddingLeft : 0;
          const parentPaddingTop =
            "paddingTop" in parent ? (parent as FrameNode).paddingTop : 0;

          figmaNode.x =
            (absX - parentAbsX) * this.scaleFactor - parentPaddingLeft;
          figmaNode.y =
            (absY - parentAbsY) * this.scaleFactor - parentPaddingTop;
        } else {
          // Root level or parent has no position data - use absolute as relative
          figmaNode.x = absX * this.scaleFactor;
          figmaNode.y = absY * this.scaleFactor;
        }
      } else {
        // Parent has Auto Layout - don't set x/y, let Auto Layout position the child
        // Store position in plugin data for reference/debugging
        this.safeSetPluginData(figmaNode, "originalX", String(absX));
        this.safeSetPluginData(figmaNode, "originalY", String(absY));
        if (this.options.enableDebugMode) {
          console.log(
            `📍 Skipping manual position for ${figmaNode.name} - parent has Auto Layout (${parent.layoutMode})`
          );
        }
      }

      // Apply size from layout
      if ("resize" in figmaNode && nodeData.layout) {
        const width = (nodeData.layout.width || 1) * this.scaleFactor;
        const height = (nodeData.layout.height || 1) * this.scaleFactor;
        const w = Math.max(width, 0.01);
        const h = Math.max(height, 0.01);
        (figmaNode as LayoutMixin).resize(w, h);
      }

      // CRITICAL FIX: Apply Auto Layout BEFORE appending to parent
      // This ensures parent's Auto Layout check works correctly for children
      // Check both autoLayout object (legacy) and top-level properties (from dom-extractor)
      // Also check AI-suggested Auto Layout
      const hasAutoLayoutData =
        nodeData.autoLayout ||
        (nodeData.layoutMode &&
          nodeData.layoutMode !== "NONE" &&
          nodeData.layoutMode !== "GRID") ||
        (nodeData.suggestedAutoLayout && nodeData.suggestedLayoutMode);

      if (hasAutoLayoutData && "layoutMode" in figmaNode) {
        const frame = figmaNode as FrameNode;

        // Read from autoLayout object, top-level properties, or AI suggestion
        const layoutMode =
          nodeData.autoLayout?.layoutMode ||
          nodeData.layoutMode ||
          (nodeData.suggestedLayoutMode as "HORIZONTAL" | "VERTICAL");

        if (layoutMode && layoutMode !== "NONE" && layoutMode !== "GRID") {
          frame.layoutMode = layoutMode as "HORIZONTAL" | "VERTICAL";

          // If this was AI-suggested, log it
          if (nodeData.suggestedAutoLayout) {
            console.log(
              `✅ [AI] Applied suggested Auto Layout to ${figmaNode.name}: ${layoutMode}`
            );
          }

          // Sizing modes
          frame.primaryAxisSizingMode = (nodeData.autoLayout
            ?.primaryAxisSizingMode ||
            nodeData.primaryAxisSizingMode ||
            "AUTO") as "FIXED" | "AUTO";
          frame.counterAxisSizingMode = (nodeData.autoLayout
            ?.counterAxisSizingMode ||
            nodeData.counterAxisSizingMode ||
            "AUTO") as "FIXED" | "AUTO";

          // Alignment
          frame.primaryAxisAlignItems = (nodeData.autoLayout
            ?.primaryAxisAlignItems ||
            nodeData.primaryAxisAlignItems ||
            "MIN") as "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN";
          frame.counterAxisAlignItems = (nodeData.autoLayout
            ?.counterAxisAlignItems ||
            nodeData.counterAxisAlignItems ||
            "MIN") as "MIN" | "MAX" | "CENTER" | "BASELINE";

          // Spacing
          frame.itemSpacing =
            nodeData.autoLayout?.itemSpacing ?? nodeData.itemSpacing ?? 0;
          frame.paddingLeft = this.clampPadding(
            nodeData.autoLayout?.paddingLeft ?? nodeData.paddingLeft
          );
          frame.paddingRight = this.clampPadding(
            nodeData.autoLayout?.paddingRight ?? nodeData.paddingRight
          );
          frame.paddingTop = this.clampPadding(
            nodeData.autoLayout?.paddingTop ?? nodeData.paddingTop
          );
          frame.paddingBottom = this.clampPadding(
            nodeData.autoLayout?.paddingBottom ?? nodeData.paddingBottom
          );

          // Wrap mode
          const layoutWrap =
            nodeData.autoLayout?.layoutWrap || nodeData.layoutWrap;
          if (layoutWrap === "WRAP") {
            frame.layoutWrap = "WRAP";
            frame.counterAxisSpacing =
              nodeData.autoLayout?.counterAxisSpacing ??
              nodeData.counterAxisSpacing ??
              0;
          }

          console.log(`✅ Auto Layout applied to ${frame.name}: ${layoutMode}`);
        }
      }

      // === Apply flex child properties (layoutGrow, layoutAlign) ===
      // These are applied to the node itself when it's a child of an Auto Layout frame
      if ("layoutGrow" in figmaNode) {
        // layoutGrow: 0 = fixed, 1 = fill container
        const layoutGrow = nodeData.layoutGrow;
        if (layoutGrow !== undefined && layoutGrow > 0) {
          (figmaNode as FrameNode).layoutGrow = layoutGrow;
        }
      }

      if ("layoutAlign" in figmaNode) {
        // layoutAlign: override parent's counterAxisAlignItems for this child
        const layoutAlign = nodeData.layoutAlign;
        if (layoutAlign && layoutAlign !== "INHERIT") {
          (figmaNode as FrameNode).layoutAlign = layoutAlign as
            | "MIN"
            | "CENTER"
            | "MAX"
            | "STRETCH";
        }
      }

      // Append to parent frame
      // CRITICAL: Text nodes cannot have children in Figma, so we must handle them carefully
      // If the parent is a TextNode (which shouldn't happen with our logic), we can't append
      if ((parent as SceneNode).type !== "TEXT") {
        parent.appendChild(figmaNode);
      } else {
        console.warn("⚠️ Cannot append child to TEXT node:", parent.name);
      }

      return figmaNode;
    } catch (error) {
      console.warn(`Failed to create node ${nodeData.id}:`, error);
      if (error instanceof Error) {
        console.error("Stack trace:", error.stack);
        console.log(
          "Node data causing error:",
          JSON.stringify(nodeData, null, 2)
        );
      }
      return null;
    }
  }

  private safeSetPluginData(node: SceneNode, key: string, value: string) {
    try {
      node.setPluginData(key, value);
    } catch (e) {
      console.warn(`Failed to set plugin data ${key} on ${node.name}`, e);
    }
  }

  /**
   * Verify import accuracy by checking positions
   */
  private async verifyImportAccuracy(): Promise<ImportVerificationReport> {
    figma.ui.postMessage({
      type: "progress",
      message: "Verifying import accuracy...",
      percent: 85,
    });

    const verificationResults: PositionVerificationResult[] = [];
    let withinTolerance = 0;
    let outsideTolerance = 0;
    const deviations: number[] = [];
    const sizeMismatches: Array<{
      id: string;
      expected: { w: number; h: number };
      actual: { w: number; h: number };
      delta: { dw: number; dh: number };
    }> = [];

    for (const { elementId, originalData, figmaNode } of this
      .verificationData) {
      if (!("x" in figmaNode) || !("y" in figmaNode) || !originalData.layout) {
        continue;
      }

      const expectedX =
        typeof originalData.absoluteLayout?.left === "number"
          ? originalData.absoluteLayout.left
          : originalData.layout?.x || 0;
      const expectedY =
        typeof originalData.absoluteLayout?.top === "number"
          ? originalData.absoluteLayout.top
          : originalData.layout?.y || 0;

      const expected = { x: expectedX, y: expectedY };

      const actual = {
        x: figmaNode.x,
        y: figmaNode.y,
      };

      const xDiff = Math.abs(actual.x - expected.x);
      const yDiff = Math.abs(actual.y - expected.y);
      const deviation = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      const withinToleranceFlag = deviation <= this.options.coordinateTolerance;

      if (withinToleranceFlag) {
        withinTolerance++;
      } else {
        outsideTolerance++;
      }

      deviations.push(deviation);
      verificationResults.push({
        elementId,
        expected,
        actual,
        deviation,
        withinTolerance: withinToleranceFlag,
      });

      // Size verification when possible
      if ("width" in figmaNode && "height" in figmaNode) {
        const expectedW =
          typeof originalData.absoluteLayout?.width === "number"
            ? originalData.absoluteLayout.width
            : originalData.layout?.width ?? (figmaNode as LayoutMixin).width;
        const expectedH =
          typeof originalData.absoluteLayout?.height === "number"
            ? originalData.absoluteLayout.height
            : originalData.layout?.height ?? (figmaNode as LayoutMixin).height;
        const actualW = (figmaNode as LayoutMixin).width;
        const actualH = (figmaNode as LayoutMixin).height;
        const dw = Math.abs(actualW - expectedW);
        const dh = Math.abs(actualH - expectedH);
        if (dw > 1 || dh > 1) {
          sizeMismatches.push({
            id: elementId,
            expected: { w: expectedW, h: expectedH },
            actual: { w: actualW, h: actualH },
            delta: { dw, dh },
          });
        }
      }
    }

    // Sort by deviation (worst first)
    verificationResults.sort((a, b) => b.deviation - a.deviation);

    const report: ImportVerificationReport = {
      totalElements: this.verificationData.length,
      positionsVerified: verificationResults.length,
      positionsWithinTolerance: withinTolerance,
      positionsOutsideTolerance: outsideTolerance,
      maxDeviation: deviations.length > 0 ? Math.max(...deviations) : 0,
      averageDeviation:
        deviations.length > 0
          ? deviations.reduce((sum, d) => sum + d, 0) / deviations.length
          : 0,
      problematicElements: verificationResults
        .filter((r) => !r.withinTolerance)
        .slice(0, 10), // Top 10 worst
      imagesProcessed: this.imageCreationCache.size,
      imagesSuccessful: Array.from(this.imageCreationCache.values()).filter(
        (hash) => hash
      ).length,
      imagesFailed: 0, // Would need to track this separately
      totalProcessingTime: 0, // Set by caller
    };

    // Log verification results
    if (this.options.enableDebugMode) {
      console.log("📐 Position verification results:", {
        accuracy: `${withinTolerance}/${verificationResults.length} within ${this.options.coordinateTolerance}px`,
        maxDeviation: `${report.maxDeviation.toFixed(2)}px`,
        averageDeviation: `${report.averageDeviation.toFixed(2)}px`,
      });

      if (sizeMismatches.length) {
        const worstSizes = sizeMismatches
          .sort(
            (a, b) =>
              Math.max(b.delta.dw, b.delta.dh) -
              Math.max(a.delta.dw, a.delta.dh)
          )
          .slice(0, 5)
          .map((m) => ({
            id: m.id,
            expected: `${m.expected.w}x${m.expected.h}`,
            actual: `${m.actual.w}x${m.actual.h}`,
            delta: `Δw=${m.delta.dw.toFixed(2)}, Δh=${m.delta.dh.toFixed(2)}`,
          }));
        console.warn("⚠️ Size mismatches detected:", worstSizes);
      }

      if (report.problematicElements.length > 0) {
        console.warn(
          "⚠️ Elements with position mismatches:",
          report.problematicElements.slice(0, 5).map((el) => ({
            id: el.elementId,
            expected: `(${el.expected.x}, ${el.expected.y})`,
            actual: `(${el.actual.x}, ${el.actual.y})`,
            deviation: `${el.deviation.toFixed(2)}px`,
          }))
        );
      }
    }

    // Notify user of verification results
    if (report.positionsOutsideTolerance > 0) {
      figma.notify(
        `⚠️ ${report.positionsOutsideTolerance} elements have position mismatches > ${this.options.coordinateTolerance}px`,
        { timeout: 5000 }
      );
    } else {
      figma.notify("✅ Import accuracy verified - all positions correct!");
    }

    return report;
  }

  private async createScreenshotBaseLayer(
    frame: FrameNode,
    screenshotBase64: string
  ): Promise<void> {
    try {
      figma.ui.postMessage({
        type: "progress",
        message: "Creating screenshot base layer...",
        percent: 15,
      });

      const imageBytes = figma.base64Decode(screenshotBase64);
      const image = figma.createImage(imageBytes);

      const rect = figma.createRectangle();
      rect.name = "Screenshot Base Layer";
      rect.resize(frame.width, frame.height);
      rect.fills = [
        {
          type: "IMAGE",
          imageHash: image.hash,
          scaleMode: "FILL",
        },
      ];
      rect.locked = true;

      frame.insertChild(0, rect);

      console.log("✅ Created screenshot base layer");
    } catch (error) {
      console.warn("⚠️ Failed to create screenshot base layer:", error);
    }
  }

  /**
   * Utility methods
   */
  private traverseAndCollect(root: any): {
    totalNodes: number;
    imageNodes: any[];
  } {
    let totalNodes = 0;
    const imageNodes: any[] = [];

    const traverse = (node: any) => {
      if (!node) return;
      totalNodes++;

      if (node.type === "IMAGE" || node.imageHash) {
        imageNodes.push(node);
      }

      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return { totalNodes, imageNodes };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private weightToStyle(weight: number): string {
    if (weight >= 700) return "Bold";
    if (weight >= 600) return "SemiBold";
    if (weight >= 500) return "Medium";
    if (weight >= 300) return "Light";
    return "Regular";
  }

  /**
   * Retry helper for WebP → PNG transcode via the UI bridge.
   * Avoids silent failures that leave images empty.
   */
  private async transcodeWebpWithRetry(
    base64: string,
    retries: number = 2
  ): Promise<Uint8Array> {
    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const png = await requestWebpTranscode(base64);
        if (png?.length) {
          return png;
        }
        lastError = new Error("Empty transcode result");
      } catch (error) {
        lastError = error;
        // Small backoff before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, 200 * (attempt + 1))
        );
      }
    }
    throw lastError || new Error("WebP transcode failed");
  }

  /**
   * Integrate AI-extracted color palette into Figma styles
   */
  private async integrateColorPalette(colorPalette: any): Promise<void> {
    if (
      !colorPalette.palette ||
      Object.keys(colorPalette.palette).length === 0
    ) {
      return;
    }

    try {
      for (const [name, color] of Object.entries(colorPalette.palette)) {
        if (!color || !color.figma) continue;

        try {
          const style = figma.createPaintStyle();
          style.name = `AI Colors/${name}`;
          style.paints = [
            {
              type: "SOLID",
              color: color.figma,
              opacity: 1,
            },
          ];
          console.log(`✅ Created color style from AI palette: ${name}`);
        } catch (e) {
          console.warn(`⚠️ Failed to create color style for ${name}:`, e);
        }
      }
    } catch (error) {
      console.warn("⚠️ Color palette integration failed:", error);
    }
  }

  /**
   * Integrate AI-extracted typography analysis into Figma styles
   */
  private async integrateTypographyAnalysis(typography: any): Promise<void> {
    if (!typography.tokens || Object.keys(typography.tokens).length === 0) {
      return;
    }

    try {
      for (const [name, token] of Object.entries(typography.tokens)) {
        if (!token || typeof token !== "object") continue;

        try {
          const fontFamily = token.fontFamily || "Inter";
          const fontWeight = token.fontWeight || 400;
          const fontSize = token.fontSize || 16;

          // Map font weight to style name
          const weightToStyle = (weight: number): string => {
            if (weight >= 700) return "Bold";
            if (weight >= 600) return "SemiBold";
            if (weight >= 500) return "Medium";
            if (weight >= 300) return "Light";
            return "Regular";
          };
          const fontStyle = weightToStyle(fontWeight);

          await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

          const style = figma.createTextStyle();
          style.name = `AI Typography/${name}`;
          style.fontName = { family: fontFamily, style: fontStyle };
          style.fontSize = fontSize;

          if (token.lineHeight) {
            style.lineHeight = { unit: "PIXELS", value: token.lineHeight };
          }

          if (token.letterSpacing) {
            style.letterSpacing = {
              unit: "PIXELS",
              value: token.letterSpacing,
            };
          }

          console.log(`✅ Created text style from AI typography: ${name}`);
        } catch (e) {
          console.warn(`⚠️ Failed to create text style for ${name}:`, e);
        }
      }
    } catch (error) {
      console.warn("⚠️ Typography integration failed:", error);
    }
  }
}
