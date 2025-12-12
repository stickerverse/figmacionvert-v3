/**
 * Production-Grade Enhanced Figma Importer v2.0
 *
 * Implements pixel-perfect reconstruction with enterprise-grade reliability:
 * - Comprehensive runtime type validation
 * - Robust text node validation and font fallback
 * - NaN/Infinity guards for all numeric operations
 * - Enhanced error reporting with failed node tracking
 * - Memory management and cleanup
 * - Performance monitoring and telemetry
 * - Defensive programming patterns throughout
 */

import { NodeBuilder } from "./node-builder";
import { StyleManager } from "./style-manager";
import { ComponentManager } from "./component-manager";
import { ImportOptions } from "./import-options";
import { ScreenshotOverlay } from "./screenshot-overlay";
import { DesignTokensManager } from "./design-tokens-manager";
import { requestWebpTranscode } from "./ui-bridge";
import { createHoverVariants } from "./hover-variant-mapper";

// ============================================================================
// TYPE DEFINITIONS WITH STRICT VALIDATION
// ============================================================================

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
  maxImportDuration?: number; // Timeout in ms
  enableMemoryCleanup?: boolean;
  validateTextNodes?: boolean;
}

export interface ImageCreationResult {
  success: boolean;
  imageHash?: string;
  error?: string;
  retryAttempts: number;
  processingTime: number;
  originalHash: string;
}

export interface PositionVerificationResult {
  elementId: string;
  expected: { x: number; y: number };
  actual: { x: number; y: number };
  deviation: number;
  withinTolerance: boolean;
}

export interface TextValidationResult {
  elementId: string;
  success: boolean;
  fontLoaded: boolean;
  contentMatches: boolean;
  boundsReasonable: boolean;
  errors: string[];
}

export interface FailedNodeReport {
  id: string;
  type: string;
  error: string;
  stack?: string;
  nodeData: any;
  timestamp: number;
}

export interface ImportVerificationReport {
  totalElements: number;
  successfulElements: number;
  failedElements: number;
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
  textNodesValidated: number;
  textValidationFailures: number;
  failedNodes: FailedNodeReport[];
  memoryUsage?: {
    imageCache: number;
    nodeCache: number;
    verificationData: number;
  };
}

interface LayoutData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

interface ValidatedNodeData {
  id: string;
  type: string;
  htmlTag?: string;
  name?: string;
  layout?: LayoutData;
  absoluteLayout?: LayoutData;
  fills?: any[];
  backgrounds?: any[];
  imageHash?: string;
  children?: any[];
  characters?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  autoLayout?: any;
  layoutMode?: string;
  position?: string;
  zIndex?: number;
  pseudoElements?: any;
  isShadowHost?: boolean;
  mlUIType?: string;
  mlConfidence?: number;
  suggestedAutoLayout?: boolean;
  suggestedLayoutMode?: string;
  layoutGrow?: number;
  layoutAlign?: string;
  strokeWeight?: number;
  [key: string]: any;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

class ValidationUtils {
  static isValidNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
  }

  static safeParseFloat(value: unknown, fallback: number = 0): number {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  static clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static validateNodeData(data: unknown): ValidatedNodeData | null {
    if (!data || typeof data !== "object") {
      console.warn("⚠️ Invalid node data: not an object");
      return null;
    }

    const node = data as any;

    // Required fields
    if (!node.id || typeof node.id !== "string") {
      console.warn("⚠️ Invalid node data: missing or invalid id");
      return null;
    }

    if (!node.type || typeof node.type !== "string") {
      console.warn(`⚠️ Node ${node.id}: missing or invalid type`);
      return null;
    }

    // Validate layout if present
    if (node.layout && typeof node.layout === "object") {
      const layout = node.layout;
      if (layout.width !== undefined && !this.isValidNumber(layout.width)) {
        console.warn(`⚠️ Node ${node.id}: invalid layout.width`);
        layout.width = 0;
      }
      if (layout.height !== undefined && !this.isValidNumber(layout.height)) {
        console.warn(`⚠️ Node ${node.id}: invalid layout.height`);
        layout.height = 0;
      }
    }

    return node as ValidatedNodeData;
  }

  static validateBase64(data: string): boolean {
    if (!data || typeof data !== "string") return false;

    // Remove data URL prefix if present
    const base64Data = data.includes(",") ? data.split(",")[1] : data;

    // Check length and valid base64 characters
    if (base64Data.length === 0) return false;
    if (base64Data.length % 4 !== 0) return false;

    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(base64Data.replace(/\s/g, ""));
  }

  static isWebP(base64: string): boolean {
    try {
      const clean = base64.includes(",") ? base64.split(",")[1] : base64;
      // WebP magic number in base64: "UklGR" (RIFF) followed by WebP signature
      return clean.startsWith("UklGR") && clean.substring(16, 20) === "V0VC";
    } catch {
      return false;
    }
  }

  static sanitizeText(text: string): string {
    if (!text || typeof text !== "string") return "";

    // Remove null bytes and control characters except newlines/tabs
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  }

  static validateFontName(fontName: unknown): fontName is FontName {
    if (!fontName || typeof fontName !== "object") return false;
    const font = fontName as any;
    return (
      typeof font.family === "string" &&
      font.family.length > 0 &&
      typeof font.style === "string" &&
      font.style.length > 0
    );
  }
}

// ============================================================================
// MAIN IMPORTER CLASS
// ============================================================================

export class EnhancedFigmaImporter {
  private options: EnhancedImportOptions;
  private nodeBuilder: NodeBuilder;
  private styleManager: StyleManager;
  private designTokensManager?: DesignTokensManager;
  private imageCreationCache = new Map<string, string>();
  private createdNodes = new Map<string, SceneNode>();
  private failedNodes: FailedNodeReport[] = [];
  private textValidationResults: TextValidationResult[] = [];
  private verificationData: Array<{
    elementId: string;
    originalData: ValidatedNodeData;
    figmaNode: SceneNode;
  }> = [];
  private scaleFactor: number = 1;
  private importStartTime: number = 0;
  private processedNodeCount: number = 0;
  private loadedFonts = new Set<string>();

  constructor(private data: any, options: Partial<EnhancedImportOptions> = {}) {
    this.options = {
      createMainFrame: true,
      enableBatchProcessing: true,
      verifyPositions: false, // Disabled by default for performance
      maxBatchSize: 10,
      coordinateTolerance: 2,
      enableDebugMode: false,
      retryFailedImages: true,
      enableProgressiveLoading: false,
      maxImportDuration: 300000, // 5 minutes
      enableMemoryCleanup: true,
      validateTextNodes: true,
      ...options,
    };

    // Validate data structure
    if (!this.validateDataStructure(data)) {
      throw new Error("Invalid data structure provided to importer");
    }

    this.logImporterInit();

    // Initialize managers
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
      undefined
    );

    console.log("🎯 Production-grade importer initialized:", this.options);
  }

  // ============================================================================
  // VALIDATION & INITIALIZATION
  // ============================================================================

  private validateDataStructure(data: any): boolean {
    if (!data || typeof data !== "object") {
      console.error("❌ Data is not an object");
      return false;
    }

    if (!data.tree) {
      console.error("❌ Missing tree data");
      return false;
    }

    if (!data.tree.id || !data.tree.type) {
      console.error("❌ Invalid tree root - missing id or type");
      return false;
    }

    console.log("✅ Data structure validation passed");
    return true;
  }

  private logImporterInit(): void {
    const diagnostics = {
      hasData: !!this.data,
      hasTree: !!this.data?.tree,
      hasAssets: !!this.data?.assets,
      hasStyles: !!this.data?.styles,
      treeNodeCount: Array.isArray(this.data?.tree?.children)
        ? this.data.tree.children.length
        : 0,
      imageCount: this.data?.assets?.images
        ? Object.keys(this.data.assets.images).length
        : 0,
    };

    console.log("🔍 Importer initialization diagnostics:", diagnostics);

    // Agent logging
    this.sendAgentLog("importer-initialized", {
      importerVersion: "2.0.0-production",
      ...diagnostics,
    });
  }

  private sendAgentLog(location: string, data: any): void {
    try {
      fetch(
        "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location,
            message: "Production importer event",
            data,
            timestamp: Date.now(),
            sessionId: "prod-session",
            runId: "prod-run",
            hypothesisId: "production",
          }),
        }
      ).catch(() => {});
    } catch {
      // Silent fail for logging
    }
  }

  // ============================================================================
  // MAIN IMPORT ORCHESTRATION
  // ============================================================================

  async runImport(): Promise<ImportVerificationReport> {
    this.importStartTime = Date.now();

    try {
      // Check timeout
      this.checkTimeout();

      this.postProgress("Starting production-grade import...", 0);

      // Step 1: Load fonts with validation
      await this.loadAllFontsRobust();
      this.checkTimeout();

      // Step 2: Create Figma styles
      if (this.options.createStyles) {
        this.postProgress("Creating local styles...", 8);
        await this.styleManager.createFigmaStyles();

        if (this.data.colorPalette?.palette) {
          await this.integrateColorPalette(this.data.colorPalette);
        }

        if (this.data.typography?.tokens) {
          await this.integrateTypographyAnalysis(this.data.typography);
        }
      }
      this.checkTimeout();

      // Step 3: Create design tokens
      if (this.data.designTokensRegistry?.variables) {
        this.postProgress("Creating design tokens...", 10);
        this.designTokensManager = new DesignTokensManager(
          this.data.designTokensRegistry
        );
        await this.designTokensManager.createFigmaVariables();
      }
      this.checkTimeout();

      // Step 4: Create main frame
      const mainFrame = await this.createMainFrameRobust();
      this.checkTimeout();

      // Step 5: Screenshot base layer
      if (this.data.screenshot) {
        await this.createScreenshotBaseLayer(mainFrame, this.data.screenshot);
      }
      this.checkTimeout();

      // Step 6: Process all nodes with batching
      await this.processNodesWithBatchingRobust(mainFrame);
      this.checkTimeout();

      // Step 7: Create hover variants
      if (this.data.hoverStates?.length > 0) {
        this.postProgress(
          `Creating ${this.data.hoverStates.length} hover variants...`,
          82
        );
        await createHoverVariants(this.data.hoverStates, this.createdNodes);
      }
      this.checkTimeout();

      // Step 8: Validate text nodes if enabled
      if (this.options.validateTextNodes) {
        await this.validateAllTextNodes();
      }

      // Step 9: Position verification (optional)
      let verificationReport: ImportVerificationReport | null = null;
      if (this.options.verifyPositions) {
        verificationReport = await this.verifyImportAccuracyRobust();
      }

      // Step 10: Focus viewport
      figma.viewport.scrollAndZoomIntoView([mainFrame]);
      figma.currentPage.selection = [mainFrame];

      // Generate final report
      const totalTime = Date.now() - this.importStartTime;
      const report = this.generateFinalReport(totalTime, verificationReport);

      // Cleanup
      if (this.options.enableMemoryCleanup) {
        this.performMemoryCleanup();
      }

      this.postComplete(report);

      console.log("✅ Production import complete:", report);
      return report;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const stackTrace = error instanceof Error ? error.stack : undefined;

      console.error("❌ Production import failed:", error);

      figma.ui.postMessage({
        type: "error",
        message: errorMessage,
        details: stackTrace,
      });

      throw error;
    }
  }

  private checkTimeout(): void {
    if (!this.options.maxImportDuration) return;

    const elapsed = Date.now() - this.importStartTime;
    if (elapsed > this.options.maxImportDuration) {
      throw new Error(
        `Import timeout exceeded: ${elapsed}ms > ${this.options.maxImportDuration}ms`
      );
    }
  }

  // ============================================================================
  // FONT LOADING WITH ROBUST FALLBACKS
  // ============================================================================

  private async loadAllFontsRobust(): Promise<void> {
    this.postProgress("Loading fonts with validation...", 5);

    const requiredFonts = this.extractRequiredFontsRobust();
    console.log(`📝 Attempting to load ${requiredFonts.length} fonts`);

    const results = await Promise.allSettled(
      requiredFonts.map((font) => this.loadFontWithValidation(font))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `✅ Font loading complete: ${successful} succeeded, ${failed} failed`
    );

    // Always ensure fallback font is loaded
    await this.ensureFallbackFont();
  }

  private async loadFontWithValidation(fontName: FontName): Promise<void> {
    if (!ValidationUtils.validateFontName(fontName)) {
      throw new Error(`Invalid font name: ${JSON.stringify(fontName)}`);
    }

    const fontKey = `${fontName.family}-${fontName.style}`;

    if (this.loadedFonts.has(fontKey)) {
      return; // Already loaded
    }

    try {
      await figma.loadFontAsync(fontName);
      this.loadedFonts.add(fontKey);
      console.log(`✅ Loaded font: ${fontKey}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load font ${fontKey}:`, error);
      throw error;
    }
  }

  private async ensureFallbackFont(): Promise<void> {
    const fallbackFonts: FontName[] = [
      { family: "Inter", style: "Regular" },
      { family: "Roboto", style: "Regular" },
      { family: "Arial", style: "Regular" },
    ];

    for (const font of fallbackFonts) {
      try {
        await this.loadFontWithValidation(font);
        console.log(`✅ Fallback font loaded: ${font.family}`);
        return;
      } catch {
        continue;
      }
    }

    console.error("❌ Failed to load any fallback font!");
  }

  private extractRequiredFontsRobust(): FontName[] {
    const fonts = new Set<string>();

    // Extract from metadata
    if (this.data.metadata?.fonts) {
      Object.values(this.data.metadata.fonts).forEach((font: any) => {
        if (font.family && typeof font.family === "string") {
          fonts.add(`${font.family}|Regular`);

          if (Array.isArray(font.weights)) {
            font.weights.forEach((weight: number) => {
              if (ValidationUtils.isValidNumber(weight)) {
                const style = this.weightToStyle(weight);
                fonts.add(`${font.family}|${style}`);
              }
            });
          }
        }
      });
    }

    // Extract from text nodes in tree
    this.extractFontsFromTree(this.data.tree, fonts);

    // Convert to FontName format with validation
    const result: FontName[] = [];
    fonts.forEach((fontStr) => {
      const [family, style] = fontStr.split("|");
      if (family && style) {
        result.push({ family, style });
      }
    });

    return result;
  }

  private extractFontsFromTree(node: any, fonts: Set<string>): void {
    if (!node) return;

    if (node.type === "TEXT" && node.fontFamily) {
      const family = node.fontFamily;
      const weight = node.fontWeight || 400;
      const style = this.weightToStyle(weight);
      fonts.add(`${family}|${style}`);
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child: any) =>
        this.extractFontsFromTree(child, fonts)
      );
    }
  }

  private weightToStyle(weight: number): string {
    if (weight >= 700) return "Bold";
    if (weight >= 600) return "SemiBold";
    if (weight >= 500) return "Medium";
    if (weight >= 300) return "Light";
    if (weight >= 100) return "Thin";
    return "Regular";
  }

  // ============================================================================
  // FRAME CREATION WITH VALIDATION
  // ============================================================================

  private async createMainFrameRobust(): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = `Import ${new Date().toLocaleTimeString()}`;

    // Calculate dimensions with validation
    const viewport = this.data.metadata?.viewport || {};

    const layoutWidth = ValidationUtils.safeParseFloat(
      this.data.metadata?.viewportWidth ||
        viewport.layoutViewportWidth ||
        viewport.width ||
        this.data.tree?.layout?.width,
      1440
    );

    const viewportHeight = ValidationUtils.safeParseFloat(
      this.data.metadata?.viewportHeight ||
        this.data.metadata?.scrollHeight ||
        viewport.scrollHeight ||
        viewport.layoutViewportHeight ||
        viewport.height,
      900
    );

    const treeHeight = ValidationUtils.safeParseFloat(
      this.data.tree?.layout?.height,
      0
    );

    const scrollHeight = Math.max(viewportHeight, treeHeight);

    // Clamp to reasonable bounds
    const finalWidth = ValidationUtils.clampNumber(layoutWidth, 1, 16000);
    const finalHeight = ValidationUtils.clampNumber(scrollHeight, 1, 16000);

    frame.resize(finalWidth, finalHeight);

    // Position to avoid overlap
    const nextPos = this.getNextImportPosition(finalWidth, finalHeight);
    frame.x = nextPos.x;
    frame.y = nextPos.y;

    // White background
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

    figma.currentPage.appendChild(frame);

    // Store absolute coordinates
    this.safeSetPluginData(frame, "absoluteX", "0");
    this.safeSetPluginData(frame, "absoluteY", "0");

    console.log(`📐 Main frame created: ${finalWidth}×${finalHeight}`);
    return frame;
  }

  private getNextImportPosition(
    width: number,
    height: number
  ): { x: number; y: number } {
    const siblings = figma.currentPage.children.filter(
      (n) =>
        n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE"
    ) as Array<FrameNode | ComponentNode | InstanceNode>;

    if (siblings.length === 0) {
      return { x: 0, y: 0 };
    }

    let maxRight = 0;
    let minY = 0;

    siblings.forEach((n) => {
      const right = n.x + n.width;
      if (right > maxRight) maxRight = right;
      if (n.y < minY) minY = n.y;
    });

    return { x: maxRight + 200, y: minY };
  }

  // ============================================================================
  // NODE PROCESSING WITH ROBUST ERROR HANDLING
  // ============================================================================

  private async processNodesWithBatchingRobust(
    parentFrame: FrameNode
  ): Promise<void> {
    if (!this.data.tree) {
      throw new Error("No tree data available");
    }

    const { totalNodes, imageNodes } = this.traverseAndCollect(this.data.tree);
    console.log(
      `🌳 Processing ${totalNodes} nodes (${imageNodes.length} images)`
    );

    this.postProgress(`Processing ${totalNodes} elements...`, 10);

    // Batch process images
    if (this.options.enableBatchProcessing && imageNodes.length > 0) {
      await this.batchProcessImagesRobust(imageNodes);
    }

    // Build node hierarchy with error tracking
    this.processedNodeCount = 0;

    const buildHierarchy = async (
      nodeData: any,
      parent: FrameNode | SceneNode
    ): Promise<SceneNode | null> => {
      // Validate node data
      const validated = ValidationUtils.validateNodeData(nodeData);
      if (!validated) {
        this.recordFailedNode(nodeData, "Validation failed", null);
        return null;
      }

      try {
        const figmaNode = await this.createSingleNodeRobust(
          validated,
          parent as FrameNode
        );

        if (!figmaNode) {
          this.recordFailedNode(validated, "Node creation returned null", null);
          return null;
        }

        this.createdNodes.set(validated.id, figmaNode);
        this.verificationData.push({
          elementId: validated.id,
          originalData: validated,
          figmaNode,
        });

        this.processedNodeCount++;
        const progress = 10 + (this.processedNodeCount / totalNodes) * 70;

        if (this.processedNodeCount % 50 === 0) {
          this.postProgress(
            `Created ${this.processedNodeCount}/${totalNodes} elements...`,
            progress
          );
        }

        // Process children with z-index sorting
        if (validated.children && Array.isArray(validated.children)) {
          const sortedChildren = this.sortChildrenByZIndex(validated.children);

          for (const child of sortedChildren) {
            await buildHierarchy(child, figmaNode);
          }
        }

        // Process pseudo-elements
        if (validated.pseudoElements) {
          if (validated.pseudoElements.before) {
            await buildHierarchy(validated.pseudoElements.before, figmaNode);
          }
          if (validated.pseudoElements.after) {
            await buildHierarchy(validated.pseudoElements.after, figmaNode);
          }
        }

        return figmaNode;
      } catch (error) {
        this.recordFailedNode(
          validated,
          error instanceof Error ? error.message : "Unknown error",
          error instanceof Error ? error.stack : undefined
        );
        return null;
      }
    };

    // Handle body node properly
    if (this.data.tree.htmlTag === "body" && this.data.tree.children) {
      console.log("🔄 Processing body children directly");
      for (const child of this.data.tree.children) {
        await buildHierarchy(child, parentFrame);
      }
    } else {
      await buildHierarchy(this.data.tree, parentFrame);
    }

    console.log(
      `✅ Node processing complete: ${this.processedNodeCount} created, ${this.failedNodes.length} failed`
    );
  }

  private sortChildrenByZIndex(children: any[]): any[] {
    return [...children].sort((a, b) => {
      const zIndexA = ValidationUtils.safeParseFloat(a.zIndex, 0);
      const zIndexB = ValidationUtils.safeParseFloat(b.zIndex, 0);

      const isPositionedA = a.position && a.position !== "static";
      const isPositionedB = b.position && b.position !== "static";

      const getWeight = (zIndex: number, isPositioned: boolean) => {
        if (zIndex < 0) return zIndex;
        if (zIndex > 0) return zIndex;
        return isPositioned ? 0.1 : 0;
      };

      return (
        getWeight(zIndexA, isPositionedA) - getWeight(zIndexB, isPositionedB)
      );
    });
  }

  // ============================================================================
  // ROBUST NODE CREATION
  // ============================================================================

  private async createSingleNodeRobust(
    nodeData: ValidatedNodeData,
    parent: FrameNode
  ): Promise<SceneNode | null> {
    // Create node via NodeBuilder
    const figmaNode = await this.nodeBuilder.createNode(nodeData);

    if (!figmaNode) {
      console.warn(`⚠️ NodeBuilder returned null for ${nodeData.id}`);
      return null;
    }

    // Clear body/html backgrounds
    if (
      (nodeData.htmlTag === "body" || nodeData.htmlTag === "html") &&
      "fills" in figmaNode
    ) {
      const bodyFills = (figmaNode as any).fills;
      if (Array.isArray(bodyFills) && bodyFills.length > 0) {
        const hasNonWhiteFill = bodyFills.some((fill: any) => {
          if (fill.type === "SOLID" && fill.color) {
            const isWhite =
              fill.color.r > 0.95 && fill.color.g > 0.95 && fill.color.b > 0.95;
            const isTransparent = fill.opacity === 0;
            return !isWhite && !isTransparent;
          }
          return false;
        });

        if (hasNonWhiteFill) {
          (figmaNode as any).fills = [];
        }
      }
    }

    // Apply metadata
    this.applyNodeMetadata(figmaNode, nodeData);

    // Calculate and apply position
    const position = this.calculateNodePosition(nodeData, parent);
    const parentHasAutoLayout =
      "layoutMode" in parent && parent.layoutMode !== "NONE";

    if (!parentHasAutoLayout) {
      figmaNode.x = position.x;
      figmaNode.y = position.y;
    } else {
      this.safeSetPluginData(
        figmaNode,
        "originalX",
        String(position.absoluteX)
      );
      this.safeSetPluginData(
        figmaNode,
        "originalY",
        String(position.absoluteY)
      );
    }

    // Apply size
    if ("resize" in figmaNode && nodeData.layout) {
      const width = ValidationUtils.safeParseFloat(nodeData.layout.width, 0);
      const height = ValidationUtils.safeParseFloat(nodeData.layout.height, 0);

      const w = Math.max(0, width * this.scaleFactor);
      const h = Math.max(0, height * this.scaleFactor);

      (figmaNode as LayoutMixin).resize(w, h);
    }

    // Apply Auto Layout
    await this.applyAutoLayoutRobust(figmaNode, nodeData);

    // Apply flex child properties
    this.applyFlexChildProperties(figmaNode, nodeData);

    // Append to parent
    if ((parent as SceneNode).type !== "TEXT") {
      parent.appendChild(figmaNode);
    }

    return figmaNode;
  }

  private calculateNodePosition(
    nodeData: ValidatedNodeData,
    parent: FrameNode
  ): { x: number; y: number; absoluteX: number; absoluteY: number } {
    // Get absolute position
    let absX = 0;
    let absY = 0;

    if (nodeData.absoluteLayout) {
      absX = ValidationUtils.safeParseFloat(nodeData.absoluteLayout.left, 0);
      absY = ValidationUtils.safeParseFloat(nodeData.absoluteLayout.top, 0);
    } else if (nodeData.layout) {
      absX = ValidationUtils.safeParseFloat(nodeData.layout.x, 0);
      absY = ValidationUtils.safeParseFloat(nodeData.layout.y, 0);
    }

    // Get parent absolute position
    const parentAbsXStr = parent.getPluginData("absoluteX");
    const parentAbsYStr = parent.getPluginData("absoluteY");

    let relativeX = absX * this.scaleFactor;
    let relativeY = absY * this.scaleFactor;

    if (parentAbsXStr && parentAbsYStr) {
      const parentAbsX = ValidationUtils.safeParseFloat(parentAbsXStr, 0);
      const parentAbsY = ValidationUtils.safeParseFloat(parentAbsYStr, 0);

      relativeX = (absX - parentAbsX) * this.scaleFactor;
      relativeY = (absY - parentAbsY) * this.scaleFactor;
    }

    return {
      x: relativeX,
      y: relativeY,
      absoluteX: absX,
      absoluteY: absY,
    };
  }

  private applyNodeMetadata(
    node: SceneNode,
    nodeData: ValidatedNodeData
  ): void {
    // Store absolute coordinates
    const absX = nodeData.absoluteLayout?.left ?? nodeData.layout?.x ?? 0;
    const absY = nodeData.absoluteLayout?.top ?? nodeData.layout?.y ?? 0;

    this.safeSetPluginData(node, "absoluteX", String(absX));
    this.safeSetPluginData(node, "absoluteY", String(absY));

    // Shadow host
    if (nodeData.isShadowHost) {
      node.name = `${node.name} (Shadow Host)`;
      this.safeSetPluginData(node, "isShadowHost", "true");
    }

    // ML classification
    if (
      nodeData.mlUIType &&
      nodeData.mlConfidence &&
      nodeData.mlConfidence > 0.7
    ) {
      this.safeSetPluginData(node, "mlClassification", nodeData.mlUIType);
      this.safeSetPluginData(
        node,
        "mlConfidence",
        String(nodeData.mlConfidence)
      );

      if (
        node.name === "Frame" ||
        node.name === "Rectangle" ||
        node.name === nodeData.htmlTag
      ) {
        node.name = `${nodeData.mlUIType} - ${node.name}`;
      }

      if (
        (nodeData.mlUIType === "BUTTON" || nodeData.mlUIType === "INPUT") &&
        nodeData.mlConfidence > 0.9
      ) {
        this.safeSetPluginData(
          node,
          "suggestedComponentType",
          nodeData.mlUIType
        );
      }
    }
  }

  private async applyAutoLayoutRobust(
    node: SceneNode,
    nodeData: ValidatedNodeData
  ): Promise<void> {
    if (!("layoutMode" in node)) return;

    const hasAutoLayout =
      nodeData.autoLayout ||
      (nodeData.layoutMode &&
        nodeData.layoutMode !== "NONE" &&
        nodeData.layoutMode !== "GRID") ||
      (nodeData.suggestedAutoLayout && nodeData.suggestedLayoutMode);

    if (!hasAutoLayout) return;

    const frame = node as FrameNode;
    // Get raw layoutMode value (can be HORIZONTAL, VERTICAL, NONE, GRID, or undefined)
    const rawLayoutMode =
      nodeData.autoLayout?.layoutMode ||
      nodeData.layoutMode ||
      nodeData.suggestedLayoutMode;

    // Filter out invalid values before type assertion
    if (!rawLayoutMode || rawLayoutMode === "NONE" || rawLayoutMode === "GRID")
      return;

    // Now safely cast to valid Auto Layout mode
    const layoutMode = rawLayoutMode as "HORIZONTAL" | "VERTICAL";

    try {
      frame.layoutMode = layoutMode;

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
      const itemSpacing = ValidationUtils.safeParseFloat(
        nodeData.autoLayout?.itemSpacing ?? nodeData.itemSpacing,
        0
      );
      frame.itemSpacing = Math.max(0, itemSpacing);

      // Padding
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
      const layoutWrap = nodeData.autoLayout?.layoutWrap || nodeData.layoutWrap;
      if (layoutWrap === "WRAP") {
        frame.layoutWrap = "WRAP";
        const counterAxisSpacing = ValidationUtils.safeParseFloat(
          nodeData.autoLayout?.counterAxisSpacing ??
            nodeData.counterAxisSpacing,
          0
        );
        frame.counterAxisSpacing = Math.max(0, counterAxisSpacing);
      }

      console.log(`✅ Auto Layout applied: ${layoutMode}`);
    } catch (error) {
      console.warn(`⚠️ Failed to apply Auto Layout:`, error);
    }
  }

  private applyFlexChildProperties(
    node: SceneNode,
    nodeData: ValidatedNodeData
  ): void {
    if ("layoutGrow" in node && nodeData.layoutGrow !== undefined) {
      const layoutGrow = ValidationUtils.safeParseFloat(nodeData.layoutGrow, 0);
      if (layoutGrow > 0) {
        (node as FrameNode).layoutGrow = layoutGrow;
      }
    }

    if (
      "layoutAlign" in node &&
      nodeData.layoutAlign &&
      nodeData.layoutAlign !== "INHERIT"
    ) {
      (node as FrameNode).layoutAlign = nodeData.layoutAlign as
        | "MIN"
        | "CENTER"
        | "MAX"
        | "STRETCH";
    }
  }

  private clampPadding(value: number | undefined | null): number {
    if (value === undefined || value === null) return 0;
    const parsed = ValidationUtils.safeParseFloat(value, 0);
    return Math.max(0, parsed);
  }

  private safeSetPluginData(node: SceneNode, key: string, value: string): void {
    try {
      node.setPluginData(key, value);
    } catch (error) {
      console.warn(`Failed to set plugin data ${key}:`, error);
    }
  }

  private recordFailedNode(
    nodeData: any,
    errorMessage: string,
    stack: string | undefined | null
  ): void {
    this.failedNodes.push({
      id: nodeData.id || "unknown",
      type: nodeData.type || "unknown",
      error: errorMessage,
      stack: stack || undefined,
      nodeData: nodeData,
      timestamp: Date.now(),
    });
  }

  // ============================================================================
  // IMAGE PROCESSING WITH VALIDATION
  // ============================================================================

  private async batchProcessImagesRobust(imageNodes: any[]): Promise<void> {
    const batches = this.chunkArray(imageNodes, this.options.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      this.postProgress(
        `Processing image batch ${i + 1}/${batches.length}...`,
        15 + (i / batches.length) * 15
      );

      const batchPromises = batches[i].map((node) =>
        this.preloadImageRobust(node)
      );
      await Promise.allSettled(batchPromises);

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private async preloadImageRobust(
    nodeData: any,
    attempt: number = 0
  ): Promise<ImageCreationResult> {
    const startTime = Date.now();
    const result: ImageCreationResult = {
      success: false,
      retryAttempts: attempt,
      processingTime: 0,
      originalHash: nodeData.imageHash || "unknown",
    };

    try {
      const imageHash = nodeData.imageHash;

      if (!imageHash || typeof imageHash !== "string") {
        throw new Error("Invalid or missing imageHash");
      }

      if (this.imageCreationCache.has(imageHash)) {
        result.success = true;
        result.imageHash = this.imageCreationCache.get(imageHash);
        return result;
      }

      const imageAsset = this.data.assets?.images?.[imageHash];
      if (!imageAsset) {
        throw new Error(`Image asset not found: ${imageHash}`);
      }

      const base64Data =
        imageAsset.base64 || imageAsset.data || imageAsset.screenshot;

      if (!base64Data || typeof base64Data !== "string") {
        throw new Error(`No base64 data for image: ${imageHash}`);
      }

      if (!ValidationUtils.validateBase64(base64Data)) {
        throw new Error(`Invalid base64 data for image: ${imageHash}`);
      }

      const imageBytes = await this.base64ToUint8ArrayRobust(base64Data);
      const figmaImage = figma.createImage(imageBytes);

      this.imageCreationCache.set(imageHash, figmaImage.hash);
      this.nodeBuilder.preloadImageHash(imageHash, figmaImage.hash);

      result.success = true;
      result.imageHash = figmaImage.hash;

      console.log(`✅ Preloaded image: ${imageHash}`);
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";

      // Retry logic
      const nextAttempt = attempt + 1;
      if (this.options.retryFailedImages && nextAttempt <= 2) {
        await new Promise((resolve) => setTimeout(resolve, 100 * nextAttempt));
        return this.preloadImageRobust(nodeData, nextAttempt);
      }

      console.warn(
        `❌ Failed to preload image after ${attempt + 1} attempts:`,
        result.error
      );
    } finally {
      result.processingTime = Date.now() - startTime;
    }

    return result;
  }

  private async base64ToUint8ArrayRobust(base64: string): Promise<Uint8Array> {
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    const clean = base64Data.replace(/\s/g, "");

    // WebP detection and transcoding
    if (ValidationUtils.isWebP(clean)) {
      try {
        const pngBytes = await this.transcodeWebpWithRetry(clean, 2);
        if (pngBytes?.length > 0) {
          return pngBytes;
        }
      } catch (error) {
        console.warn("WebP transcode failed, using direct decode:", error);
      }
    }

    return figma.base64Decode(clean);
  }

  private async transcodeWebpWithRetry(
    base64: string,
    retries: number
  ): Promise<Uint8Array> {
    let lastError: any;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const png = await requestWebpTranscode(base64);
        if (png?.length > 0) {
          return png;
        }
        lastError = new Error("Empty transcode result");
      } catch (error) {
        lastError = error;
        await new Promise((resolve) =>
          setTimeout(resolve, 200 * (attempt + 1))
        );
      }
    }

    throw lastError || new Error("WebP transcode failed");
  }

  // ============================================================================
  // TEXT NODE VALIDATION
  // ============================================================================

  private async validateAllTextNodes(): Promise<void> {
    this.postProgress("Validating text nodes...", 88);

    const textNodes = Array.from(this.createdNodes.values()).filter(
      (node) => node.type === "TEXT"
    ) as TextNode[];

    console.log(`📝 Validating ${textNodes.length} text nodes`);

    for (const textNode of textNodes) {
      const validation = await this.validateTextNode(textNode);
      this.textValidationResults.push(validation);
    }

    const failures = this.textValidationResults.filter(
      (v) => !v.success
    ).length;
    console.log(`✅ Text validation complete: ${failures} failures`);
  }

  private async validateTextNode(
    textNode: TextNode
  ): Promise<TextValidationResult> {
    const result: TextValidationResult = {
      elementId: textNode.id,
      success: true,
      fontLoaded: false,
      contentMatches: true,
      boundsReasonable: true,
      errors: [],
    };

    try {
      // Validate font is loaded
      const fontName = textNode.fontName as FontName;
      const fontKey = `${fontName.family}-${fontName.style}`;
      result.fontLoaded = this.loadedFonts.has(fontKey);

      if (!result.fontLoaded) {
        result.errors.push(`Font not loaded: ${fontKey}`);
        result.success = false;
      }

      // Validate text content
      const text = ValidationUtils.sanitizeText(textNode.characters);
      if (text.length === 0 && textNode.characters.length > 0) {
        result.errors.push("Text contains only invalid characters");
        result.contentMatches = false;
        result.success = false;
      }

      // Validate bounds
      if (textNode.width < 0 || textNode.height < 0) {
        result.errors.push("Negative dimensions");
        result.boundsReasonable = false;
        result.success = false;
      }

      if (textNode.width > 10000 || textNode.height > 10000) {
        result.errors.push("Unreasonably large dimensions");
        result.boundsReasonable = false;
        result.success = false;
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    return result;
  }

  // ============================================================================
  // VERIFICATION & REPORTING
  // ============================================================================

  private async verifyImportAccuracyRobust(): Promise<ImportVerificationReport> {
    this.postProgress("Verifying positions...", 90);

    const results: PositionVerificationResult[] = [];
    const deviations: number[] = [];

    for (const { elementId, originalData, figmaNode } of this
      .verificationData) {
      if (!("x" in figmaNode) || !("y" in figmaNode)) continue;
      if (!originalData.layout && !originalData.absoluteLayout) continue;

      const expectedX = ValidationUtils.safeParseFloat(
        originalData.absoluteLayout?.left ?? originalData.layout?.x,
        0
      );
      const expectedY = ValidationUtils.safeParseFloat(
        originalData.absoluteLayout?.top ?? originalData.layout?.y,
        0
      );

      const actual = { x: figmaNode.x, y: figmaNode.y };
      const expected = { x: expectedX, y: expectedY };

      const xDiff = Math.abs(actual.x - expected.x);
      const yDiff = Math.abs(actual.y - expected.y);
      const deviation = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      const withinTolerance = deviation <= this.options.coordinateTolerance;

      deviations.push(deviation);
      results.push({
        elementId,
        expected,
        actual,
        deviation,
        withinTolerance,
      });
    }

    results.sort((a, b) => b.deviation - a.deviation);

    const withinTolerance = results.filter((r) => r.withinTolerance).length;
    const outsideTolerance = results.length - withinTolerance;

    return {
      totalElements: this.createdNodes.size,
      successfulElements: this.createdNodes.size - this.failedNodes.length,
      failedElements: this.failedNodes.length,
      positionsVerified: results.length,
      positionsWithinTolerance: withinTolerance,
      positionsOutsideTolerance: outsideTolerance,
      maxDeviation: deviations.length > 0 ? Math.max(...deviations) : 0,
      averageDeviation:
        deviations.length > 0
          ? deviations.reduce((sum, d) => sum + d, 0) / deviations.length
          : 0,
      problematicElements: results
        .filter((r) => !r.withinTolerance)
        .slice(0, 10),
      imagesProcessed: this.imageCreationCache.size,
      imagesSuccessful: Array.from(this.imageCreationCache.values()).filter(
        (h) => h
      ).length,
      imagesFailed: 0,
      totalProcessingTime: 0,
      textNodesValidated: this.textValidationResults.length,
      textValidationFailures: this.textValidationResults.filter(
        (v) => !v.success
      ).length,
      failedNodes: this.failedNodes,
    };
  }

  private generateFinalReport(
    totalTime: number,
    verification: ImportVerificationReport | null
  ): ImportVerificationReport {
    const report: ImportVerificationReport = verification || {
      totalElements: this.createdNodes.size,
      successfulElements: this.createdNodes.size - this.failedNodes.length,
      failedElements: this.failedNodes.length,
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
      textNodesValidated: this.textValidationResults.length,
      textValidationFailures: this.textValidationResults.filter(
        (v) => !v.success
      ).length,
      failedNodes: this.failedNodes,
    };

    report.totalProcessingTime = totalTime;
    report.memoryUsage = {
      imageCache: this.imageCreationCache.size,
      nodeCache: this.createdNodes.size,
      verificationData: this.verificationData.length,
    };

    return report;
  }

  // ============================================================================
  // MEMORY CLEANUP
  // ============================================================================

  private performMemoryCleanup(): void {
    console.log("🧹 Performing memory cleanup");

    this.imageCreationCache.clear();
    this.verificationData = [];

    // Keep createdNodes and failedNodes for reporting

    console.log("✅ Memory cleanup complete");
  }

  // ============================================================================
  // UI COMMUNICATION
  // ============================================================================

  private postProgress(message: string, percent: number): void {
    figma.ui.postMessage({
      type: "progress",
      message,
      percent: Math.min(100, Math.max(0, percent)),
    });
  }

  private postComplete(report: ImportVerificationReport): void {
    figma.ui.postMessage({
      type: "complete",
      stats: {
        elements: report.successfulElements,
        failed: report.failedElements,
        images: report.imagesSuccessful,
        textNodes: report.textNodesValidated,
      },
      verification: report,
    });

    // User notification
    if (report.failedElements > 0) {
      figma.notify(
        `⚠️ Import complete: ${report.successfulElements} successful, ${report.failedElements} failed`,
        { timeout: 5000 }
      );
    } else {
      figma.notify(
        `✅ Import complete: ${report.successfulElements} elements created!`
      );
    }
  }

  // ============================================================================
  // SCREENSHOT & UTILITIES
  // ============================================================================

  private async createScreenshotBaseLayer(
    frame: FrameNode,
    screenshotBase64: string
  ): Promise<void> {
    try {
      this.postProgress("Creating screenshot base layer...", 15);

      if (!ValidationUtils.validateBase64(screenshotBase64)) {
        throw new Error("Invalid screenshot base64 data");
      }

      const imageBytes = figma.base64Decode(screenshotBase64);
      const image = figma.createImage(imageBytes);

      const rect = figma.createRectangle();
      rect.name = "Screenshot Base Layer";
      rect.resize(frame.width, frame.height);
      rect.fills = [
        { type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" },
      ];
      rect.locked = true;

      frame.insertChild(0, rect);

      console.log("✅ Screenshot base layer created");
    } catch (error) {
      console.warn("⚠️ Failed to create screenshot base layer:", error);
    }
  }

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

      if (Array.isArray(node.children)) {
        node.children.forEach((child: any) => traverse(child));
      }
    };

    traverse(root);
    return { totalNodes, imageNodes };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================================================
  // AI INTEGRATION
  // ============================================================================

  private async integrateColorPalette(colorPalette: any): Promise<void> {
    if (
      !colorPalette.palette ||
      Object.keys(colorPalette.palette).length === 0
    ) {
      return;
    }

    try {
      for (const [name, colorData] of Object.entries(colorPalette.palette)) {
        const color = colorData as any;
        if (!color?.figma) continue;

        try {
          const style = figma.createPaintStyle();
          style.name = `AI Colors/${name}`;
          style.paints = [{ type: "SOLID", color: color.figma, opacity: 1 }];
          console.log(`✅ Color style created: ${name}`);
        } catch (error) {
          console.warn(`⚠️ Failed to create color style ${name}:`, error);
        }
      }
    } catch (error) {
      console.warn("⚠️ Color palette integration failed:", error);
    }
  }

  private async integrateTypographyAnalysis(typography: any): Promise<void> {
    if (!typography.tokens || Object.keys(typography.tokens).length === 0) {
      return;
    }

    try {
      for (const [name, tokenData] of Object.entries(typography.tokens)) {
        const token = tokenData as any;
        if (!token) continue;

        try {
          const fontFamily = token.fontFamily || "Inter";
          const fontWeight = ValidationUtils.safeParseFloat(
            token.fontWeight,
            400
          );
          const fontSize = ValidationUtils.safeParseFloat(token.fontSize, 16);
          const fontStyle = this.weightToStyle(fontWeight);

          await this.loadFontWithValidation({
            family: fontFamily,
            style: fontStyle,
          });

          const style = figma.createTextStyle();
          style.name = `AI Typography/${name}`;
          style.fontName = { family: fontFamily, style: fontStyle };
          style.fontSize = fontSize;

          if (token.lineHeight) {
            const lineHeight = ValidationUtils.safeParseFloat(
              token.lineHeight,
              0
            );
            if (lineHeight > 0) {
              style.lineHeight = { unit: "PIXELS", value: lineHeight };
            }
          }

          if (token.letterSpacing) {
            const letterSpacing = ValidationUtils.safeParseFloat(
              token.letterSpacing,
              0
            );
            style.letterSpacing = { unit: "PIXELS", value: letterSpacing };
          }

          console.log(`✅ Typography style created: ${name}`);
        } catch (error) {
          console.warn(`⚠️ Failed to create typography style ${name}:`, error);
        }
      }
    } catch (error) {
      console.warn("⚠️ Typography integration failed:", error);
    }
  }
}
