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
import { requestImageTranscode, requestWebpTranscode } from "./ui-bridge";
import { createHoverVariants } from "./hover-variant-mapper";
import {
  inferHierarchy,
  convertInferredTreeToElementNode,
} from "./hierarchy-inference";
import {
  generateTreeQualityReport,
  printTreeQualityReport,
  exportDebugArtifact,
} from "./hierarchy-inference/diagnostics";
import { ProfessionalLayoutSolver, prepareLayoutSchema } from "./layout-solver";

// Import shared schema types (CRITICAL: Single source of truth)
import type { WebToFigmaSchema, AnalyzedNode } from "../../shared/schema";

// Import diagnostic collector for fidelity debugging
import { DiagnosticCollector } from "./diagnostic-collector";

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
  useHierarchyInference?: boolean; // Default: true - use hierarchy inference to improve tree structure
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
  samplingUsed?: boolean;
  sampleSize?: number;
  estimatedAccuracy?: number;
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
  relativeX?: number;
  relativeY?: number;
  boxSizing?: "border-box" | "content-box";
  position?: string;
}

interface ValidatedNodeData {
  id: string;
  type: string;
  htmlTag?: string;
  name?: string;
  layout?: LayoutData;
  absoluteLayout?: LayoutData;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    viewportX: number;
    viewportY: number;
    hasTransform: boolean;
  };
  computedPosition?: {
    position: "static" | "relative" | "absolute" | "fixed" | "sticky";
    transform: string | null;
    zIndex: number;
  };
  viewport?: {
    scrollX: number;
    scrollY: number;
    devicePixelRatio: number;
  };
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
      console.error("❌ [VALIDATION] Invalid node data: not an object", {
        data,
      });
      return null;
    }

    const node = data as any;

    // Required fields
    if (!node.id || typeof node.id !== "string") {
      console.error(
        "❌ [VALIDATION] Invalid node data: missing or invalid id",
        {
          hasId: !!node.id,
          idType: typeof node.id,
          node: node,
        }
      );
      return null;
    }

    // CRITICAL FIX: Migrate 'tagName' (from shared schema) to 'type' (expected by plugin)
    // The shared/schema.ts uses 'tagName' but the plugin expects 'type'
    if (!node.type && node.tagName && typeof node.tagName === "string") {
      console.log(
        `🔄 [SCHEMA-MIGRATION] Node ${node.id}: Converting tagName='${node.tagName}' to type`
      );
      node.type = node.tagName;
    }

    if (!node.type || typeof node.type !== "string") {
      console.error(
        `❌ [VALIDATION] Node ${node.id}: missing or invalid type`,
        {
          hasType: !!node.type,
          typeValue: node.type,
          typeType: typeof node.type,
          hasTagName: !!node.tagName,
          tagNameValue: node.tagName,
          nodeKeys: Object.keys(node).slice(0, 20),
        }
      );
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

    const normalized = this.normalizeBase64Payload(data);
    if (normalized.length === 0) return false;
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(normalized);
  }

  static normalizeBase64Payload(data: string): string {
    if (!data || typeof data !== "string") return "";
    const base64Data = data.includes(",") ? data.split(",")[1] : data;
    let normalized = base64Data.replace(/\s/g, "");
    try {
      normalized = decodeURIComponent(normalized);
    } catch {
      // ignore
    }
    normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
    normalized = normalized.replace(/[^A-Za-z0-9+/=]/g, "");
    while (normalized.length % 4 !== 0) {
      normalized += "=";
    }
    return normalized;
  }

  static isWebP(base64: string): boolean {
    try {
      const clean = this.normalizeBase64Payload(base64);
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
  private mainFrame: FrameNode | null = null;
  public diagnosticCollector: DiagnosticCollector; // Public so NodeBuilder can access

  constructor(private data: any, options: Partial<EnhancedImportOptions> = {}) {
    (this as any).importStartTime = Date.now();
    // DEBUG: Log what schema data we received
    console.log("🔍 [EnhancedFigmaImporter] Constructor received data:", {
      hasData: !!data,
      hasRoot: !!data?.root,
      rootType: data?.root?.type,
      rootChildren: data?.root?.children?.length || 0,
      dataKeys:
        data && typeof data === "object" ? Object.keys(data) : "not-object",
    });
    this.options = {
      createMainFrame: true,
      enableBatchProcessing: true,
      verifyPositions: true, // Re-enabled with optimized sampling
      maxBatchSize: 10,
      coordinateTolerance: 2,
      enableDebugMode: false,
      retryFailedImages: true,
      enableProgressiveLoading: false,
      maxImportDuration: 300000, // 5 minutes
      enableMemoryCleanup: true,
      validateTextNodes: true,
      useHierarchyInference: false, // Default: disabled (hierarchy inference has bugs that collapse nodes)
      ...options,
    };

    // Validate data structure
    if (!this.validateDataStructure(data)) {
      throw new Error("Invalid data structure provided to importer");
    }

    this.logImporterInit();

    // Initialize diagnostic collector for fidelity debugging
    const sourceUrl = data?.url || data?.metadata?.url || "unknown";
    this.diagnosticCollector = new DiagnosticCollector(sourceUrl);
    console.log("📊 [DIAGNOSTICS] Diagnostic collector initialized for import tracking");

    // ENHANCED: Scale factor is now fixed at 1.0 because the extractor provides CSS pixels.
    // Legacy support for devicePixelRatio is kept for logging but NOT used for scaling coordinates.
    const devicePixelRatio = data.metadata?.devicePixelRatio || 1;
    this.scaleFactor = 1;
    console.log(
      `📏 [SCALE FACTOR] Fixed scale factor: ${this.scaleFactor} (extraction dpr was: ${devicePixelRatio})`
    );

    // Initialize managers
    this.styleManager = new StyleManager(data.styles);

    const builderImportOptions: ImportOptions = {
      createMainFrame: true, // ✅ Keep main frame
      createVariantsFrame: false, // ❌ Disable - user wants only one frame
      createComponentsFrame: false, // ❌ Disable - user wants only one frame
      createDesignSystem: false, // ❌ Disable - user wants only one frame
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
      { ...(data.assets || {}), baseUrl: data?.metadata?.url },
      undefined
    );

    console.log("🎯 Production-grade importer initialized:", this.options);
  }

  // ============================================================================
  // VALIDATION & INITIALIZATION
  // ============================================================================

  private validateDataStructure(data: any): boolean {
    console.log(
      "🔍 [VALIDATION] Starting comprehensive data structure validation...",
      {
        hasData: !!data,
        dataType: typeof data,
        dataKeys: data && typeof data === "object" ? Object.keys(data) : [],
        dataStringified:
          data && typeof data === "object"
            ? JSON.stringify(data).substring(0, 300) + "..."
            : String(data),
      }
    );

    if (!data || typeof data !== "object") {
      console.error("❌ [VALIDATION] Data is not an object", {
        received: typeof data,
        value: String(data).substring(0, 100),
      });
      return false;
    }

    if (!data.root) {
      console.error("❌ [VALIDATION] Missing root data", {
        availableKeys: Object.keys(data),
        hasRootProperty: "root" in data,
        rootValue: data.root,
      });
      return false;
    }

    console.log("✅ [VALIDATION] Root exists, validating structure...", {
      rootType: typeof data.root,
      rootKeys:
        data.root && typeof data.root === "object"
          ? Object.keys(data.root)
          : [],
      hasId: !!(data.root && data.root.id),
      hasType: !!(data.root && data.root.type),
      hasChildren: !!(data.root && data.root.children),
      childrenCount:
        data.root && data.root.children ? data.root.children.length : 0,
    });

    if (!data.root.id || !data.root.type) {
      console.error("❌ [VALIDATION] Invalid root node - missing id or type", {
        hasId: !!(data.root && data.root.id),
        hasType: !!(data.root && data.root.type),
        rootId: data.root?.id,
        rootType: data.root?.type,
        rootStructure: JSON.stringify(data.root).substring(0, 200),
      });
      return false;
    }

    console.log("✅ [VALIDATION] Data structure validation passed", {
      rootId: data.root.id,
      rootType: data.root.type,
      childrenCount: data.root.children ? data.root.children.length : 0,
      hasMetadata: !!data.metadata,
      hasAssets: !!data.assets,
      hasStyles: !!data.styles,
    });

    return true;
  }

  private logImporterInit(): void {
    const diagnostics = {
      hasData: !!this.data,
      hasRoot: !!this.data?.root,
      hasAssets: !!this.data?.assets,
      hasStyles: !!this.data?.styles,
      rootNodeCount: Array.isArray(this.data?.root?.children)
        ? this.data.root.children.length
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

      // Step 1: PHASE 1 OPTIMIZATION - Fonts are now pre-loaded during node processing
      // (Moved to processNodesWithBatchingRobust for better parallelization)
      this.checkTimeout();

      // Step 2: Create Figma styles
      if (this.options.createStyles) {
        this.postProgress("Creating local styles with hang protection...", 8);
        try {
          const styleStartTime = Date.now();
          await Promise.race([
            this.styleManager.createFigmaStyles(),
            new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error("Style creation timeout")),
                30000
              );
            }),
          ]);
          const styleTime = Date.now() - styleStartTime;
          this.postProgress(`Styles created successfully (${styleTime}ms)`, 12);

          if (this.data.colorPalette?.palette) {
            await this.integrateColorPalette(this.data.colorPalette);
          }
          if (this.data.typography?.tokens) {
            await this.integrateTypographyAnalysis(this.data.typography);
          }
        } catch (styleError) {
          console.warn(
            "⚠️ [ENHANCED-IMPORTER] Style creation failed/timeout, continuing:",
            styleError
          );
          this.postProgress(
            "Skipping styles due to timeout, continuing import...",
            12
          );
          // Continue without styles rather than hanging
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

      // Step 5: Screenshot overlay / empty-tree fallback.
      // Runtime evidence: some captures (notably YouTube) can arrive with treeNodeCount=0,
      // which would otherwise produce a blank white frame. If we have a screenshot, render
      // it as a locked base layer so the import is never visually empty.
      const rootChildrenCount = Array.isArray(this.data?.root?.children)
        ? this.data.root.children.length
        : 0;
      const hasScreenshot = !!this.data?.screenshot;
      const shouldForceScreenshotFallback =
        rootChildrenCount === 0 && hasScreenshot;

      if (shouldForceScreenshotFallback) {
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location:
                "enhanced-figma-importer.ts:runImport:emptyTreeFallback",
              message: "Empty tree detected; forcing screenshot base layer",
              data: {
                rootChildrenCount,
                hasScreenshot,
                metadataUrl: this.data?.metadata?.url || null,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "fix1",
              hypothesisId: "H_EMPTY_TREE_FALLBACK",
            }),
          }
        ).catch(() => {});
        // #endregion
      }

      // Optional reference screenshot overlay (for validation/debugging)
      // Never render the screenshot as the main frame background unless explicitly enabled,
      // EXCEPT the empty-tree fallback where we must ensure something is visible.
      if (
        (this.options.createScreenshotOverlay ||
          shouldForceScreenshotFallback) &&
        hasScreenshot
      ) {
        const screenshotDataUrl = this.normalizeScreenshotToDataUrl(
          this.data.screenshot
        );
        if (screenshotDataUrl) {
          const overlay = await ScreenshotOverlay.createReferenceOverlay(
            screenshotDataUrl,
            mainFrame,
            {
              opacity: shouldForceScreenshotFallback ? 1 : 0.3,
              visible: true,
              position: "background",
            }
          );
          // #region agent log
          fetch(
            "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location:
                  "enhanced-figma-importer.ts:runImport:screenshotOverlay",
                message: "Screenshot overlay creation attempted",
                data: {
                  forced: shouldForceScreenshotFallback,
                  overlayCreated: !!overlay,
                  frameW: mainFrame.width,
                  frameH: mainFrame.height,
                },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "fix1",
                hypothesisId: "H_EMPTY_TREE_FALLBACK",
              }),
            }
          ).catch(() => {});
          // #endregion
        }
      }
      this.checkTimeout();

      // Step 6: Process all nodes with batching
      await this.processNodesWithBatchingRobust(mainFrame);
      this.checkTimeout();

      // CRITICAL FIX: Ensure main frame background matches document background color
      // This prevents root element backgrounds from overriding the main frame
      // But we should respect the actual document background (black, white, etc.)
      const documentBgColor = this.data.metadata?.documentBackgroundColor;

      if (mainFrame.fills && Array.isArray(mainFrame.fills)) {
        // Check if fills match the document background color
        const hasMatchingFill =
          documentBgColor &&
          mainFrame.fills.some((fill) => {
            if (fill.type === "SOLID" && fill.color) {
              // Parse document background and compare
              const docColor =
                this.nodeBuilder.parseColorString(documentBgColor);
              if (docColor) {
                const fillMatches =
                  Math.abs(fill.color.r - docColor.r) < 0.01 &&
                  Math.abs(fill.color.g - docColor.g) < 0.01 &&
                  Math.abs(fill.color.b - docColor.b) < 0.01;
                return fillMatches;
              }
            }
            return false;
          });

        // Only clear fills if they don't match the document background
        // This allows dark backgrounds (black) to be preserved
        if (!hasMatchingFill) {
          const hasImageFill = mainFrame.fills.some(
            (fill) => fill.type === "IMAGE"
          );
          if (hasImageFill) {
            // Restore document background color (or white if not specified)
            const docColor = documentBgColor
              ? this.nodeBuilder.parseColorString(documentBgColor)
              : null;

            if (docColor) {
              let alpha = 1;
              const rgbaMatch = /rgba?\([^)]+\)/.exec(documentBgColor);
              if (rgbaMatch) {
                const rgbaParts = rgbaMatch[0].match(/[\d.]+/g);
                if (rgbaParts && rgbaParts.length >= 4) {
                  alpha = Math.max(0, Math.min(1, parseFloat(rgbaParts[3])));
                }
              }
              mainFrame.fills = [
                {
                  type: "SOLID",
                  color: { r: docColor.r, g: docColor.g, b: docColor.b },
                  opacity: alpha,
                },
              ];
              console.log(
                `🛡️ Main frame had image fill, restoring document background color: ${documentBgColor}`
              );
            } else {
              mainFrame.fills = [
                { type: "SOLID", color: { r: 1, g: 1, b: 1 } },
              ];
              console.log(
                `🛡️ Main frame had image fill, restoring white solid background (no document color)`
              );
            }
          }
        }
      } else if (documentBgColor) {
        // If no fills but we have document background, set it
        const docColor = this.nodeBuilder.parseColorString(documentBgColor);
        if (docColor) {
          let alpha = 1;
          const rgbaMatch = /rgba?\([^)]+\)/.exec(documentBgColor);
          if (rgbaMatch) {
            const rgbaParts = rgbaMatch[0].match(/[\d.]+/g);
            if (rgbaParts && rgbaParts.length >= 4) {
              alpha = Math.max(0, Math.min(1, parseFloat(rgbaParts[3])));
            }
          }
          mainFrame.fills = [
            {
              type: "SOLID",
              color: { r: docColor.r, g: docColor.g, b: docColor.b },
              opacity: alpha,
            },
          ];
        }
      } else {
        // Default to white if no document background color
        mainFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      }

      // Step 7: Create hover variants
      // DISABLED: Keep all elements in the main frame without creating separate component variants
      // if (this.data.hoverStates?.length > 0) {
      //   this.postProgress(
      //     `Creating ${this.data.hoverStates.length} hover variants...`,
      //     82
      //   );
      //   await createHoverVariants(this.data.hoverStates, this.createdNodes);
      // }
      this.checkTimeout();

      // Step 7.5: Create interactive prototype frame
      // DISABLED: Keep all interactive elements in the main frame instead of creating a separate prototype frame
      // const interactiveFrame = await this.createInteractivePrototypeFrame(
      //   mainFrame
      // );
      // if (interactiveFrame) {
      //   this.postProgress("Interactive prototype frame created", 85);
      //   // Set up prototype connections
      //   await this.setupPrototypeConnections(mainFrame, interactiveFrame);
      // }
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

      // Enhanced completion report with schema statistics
      this.logImportCompletionReport(report);

      // Export diagnostic data for fidelity debugging
      this.exportDiagnosticReport();

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

  /**
   * PHASE 1 OPTIMIZATION: Pre-load fonts with smart fallback and caching
   */
  private async preloadFontsWithSmartFallback(
    requiredFonts: Set<string>
  ): Promise<Map<string, FontName>> {
    const fontMap = new Map<string, FontName>();
    const fontPromises: Array<
      Promise<{ fontKey: string; loaded: FontName | null }>
    > = [];

    // Convert Set to FontName array
    const fontsToLoad: FontName[] = Array.from(requiredFonts).map((fontKey) => {
      const [family, style] = fontKey.split("|");
      return { family, style };
    });

    console.log(`📝 Pre-loading ${fontsToLoad.length} fonts in parallel...`);

    // Load fonts in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < fontsToLoad.length; i += concurrency) {
      const batch = fontsToLoad.slice(i, i + concurrency);
      const batchPromises = batch.map(async (font) => {
        const fontKey = `${font.family}|${font.style}`;
        try {
          // Use NodeBuilder's font loading with fallbacks
          const loaded = await this.nodeBuilder.loadFontWithFallbacks(
            font.family,
            font.style
          );
          return { fontKey, loaded };
        } catch (error) {
          console.warn(`⚠️ Failed to load font ${fontKey}:`, error);
          return { fontKey, loaded: null };
        }
      });
      fontPromises.push(...batchPromises);
    }

    const results = await Promise.allSettled(fontPromises);
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.loaded) {
        fontMap.set(result.value.fontKey, result.value.loaded);
      }
    });

    console.log(`✅ Pre-loaded ${fontMap.size}/${fontsToLoad.length} fonts`);

    // Always ensure fallback font is loaded
    await this.ensureFallbackFont();

    return fontMap;
  }

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
    this.extractFontsFromTree(this.data.root, fonts);

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
        this.data.root?.layout?.width,
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
      this.data.root?.layout?.height,
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

    // CRITICAL FIX: Use actual document background color instead of always white
    // This allows dark themes (black) and other backgrounds to be preserved
    const documentBgColor = this.data.metadata?.documentBackgroundColor;
    let mainFrameFill: SolidPaint;

    if (documentBgColor) {
      // Parse the document background color using NodeBuilder's parseColorString
      const parsedColor = this.nodeBuilder.parseColorString(documentBgColor);
      if (parsedColor) {
        // Extract alpha if available (rgba format)
        let alpha = 1;
        const rgbaMatch = /rgba?\([^)]+\)/.exec(documentBgColor);
        if (rgbaMatch) {
          const rgbaParts = rgbaMatch[0].match(/[\d.]+/g);
          if (rgbaParts && rgbaParts.length >= 4) {
            alpha = Math.max(0, Math.min(1, parseFloat(rgbaParts[3])));
          }
        }

        mainFrameFill = {
          type: "SOLID",
          color: { r: parsedColor.r, g: parsedColor.g, b: parsedColor.b },
          opacity: alpha,
        };
        console.log(
          `🎨 [BACKGROUND] Using document background color: ${documentBgColor} → RGB(${Math.round(
            parsedColor.r * 255
          )}, ${Math.round(parsedColor.g * 255)}, ${Math.round(
            parsedColor.b * 255
          )})`
        );
      } else {
        // Fallback to white if parsing fails
        mainFrameFill = { type: "SOLID", color: { r: 1, g: 1, b: 1 } };
        console.warn(
          `⚠️ [BACKGROUND] Failed to parse document background color: ${documentBgColor}. Using white fallback.`
        );
      }
    } else {
      // Default to white if no background color is specified
      mainFrameFill = { type: "SOLID", color: { r: 1, g: 1, b: 1 } };
      console.log(
        `🎨 [BACKGROUND] No document background color found. Using white default.`
      );
    }

    frame.fills = [mainFrameFill];

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

  /**
   * Collect all interactive elements from the tree
   */
  private collectInteractiveElements(
    node: any,
    interactiveElements: any[] = []
  ): void {
    if (!node) return;

    // Check if this node is interactive
    if (node.isInteractive) {
      interactiveElements.push(node);
    }

    // Recursively check children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.collectInteractiveElements(child, interactiveElements);
      }
    }
  }

  /**
   * Create a second frame with all interactive elements for prototyping
   */
  private async createInteractivePrototypeFrame(
    mainFrame: FrameNode
  ): Promise<FrameNode | null> {
    if (!this.data.root) return null;

    // Collect all interactive elements
    const interactiveElements: any[] = [];
    this.collectInteractiveElements(this.data.root, interactiveElements);

    if (interactiveElements.length === 0) {
      console.log("ℹ️ No interactive elements found, skipping prototype frame");
      return null;
    }

    console.log(
      `🎯 Found ${interactiveElements.length} interactive elements for prototype frame`
    );

    // Create the interactive frame
    const interactiveFrame = figma.createFrame();
    interactiveFrame.name = "🎨 Interactive Elements (Prototype)";
    interactiveFrame.layoutMode = "VERTICAL";
    interactiveFrame.primaryAxisSizingMode = "AUTO";
    interactiveFrame.counterAxisSizingMode = "AUTO";
    interactiveFrame.itemSpacing = 20;
    interactiveFrame.paddingTop = 40;
    interactiveFrame.paddingBottom = 40;
    interactiveFrame.paddingLeft = 40;
    interactiveFrame.paddingRight = 40;
    interactiveFrame.fills = [
      { type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.98 } },
    ];

    // Position frame next to main frame
    interactiveFrame.x = mainFrame.x + mainFrame.width + 100;
    interactiveFrame.y = mainFrame.y;

    // Group interactive elements by type for better organization
    const elementsByType = new Map<string, any[]>();
    for (const element of interactiveElements) {
      const type = element.interactionType || "interactive";
      if (!elementsByType.has(type)) {
        elementsByType.set(type, []);
      }
      elementsByType.get(type)!.push(element);
    }

    // Create sections for each interaction type
    for (const [type, elements] of elementsByType.entries()) {
      const sectionFrame = figma.createFrame();
      sectionFrame.name = `${type.charAt(0).toUpperCase() + type.slice(1)}s (${
        elements.length
      })`;
      sectionFrame.layoutMode = "VERTICAL";
      sectionFrame.primaryAxisSizingMode = "AUTO";
      sectionFrame.counterAxisSizingMode = "AUTO";
      sectionFrame.itemSpacing = 16;
      sectionFrame.paddingTop = 20;
      sectionFrame.paddingBottom = 20;
      sectionFrame.paddingLeft = 20;
      sectionFrame.paddingRight = 20;
      sectionFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      sectionFrame.strokes = [
        { type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } },
      ];
      sectionFrame.strokeWeight = 1;
      sectionFrame.cornerRadius = 8;

      // Create nodes for each interactive element
      // CRITICAL: Create isolated interactive elements WITHOUT children
      // This ensures only the clickable element itself is shown, not all nested content
      for (const elementData of elements) {
        try {
          // Create isolated version: copy element data but remove children
          // This ensures we only show the interactive element itself, not everything inside it
          const isolatedElementData = {
            ...elementData,
            children: [], // Remove children - we only want the interactive element itself
            // Keep essential properties for rendering the element
            layout: elementData.layout,
            fills: elementData.fills,
            strokes: elementData.strokes,
            effects: elementData.effects,
            textStyle: elementData.textStyle,
            characters: elementData.characters,
            imageHash: elementData.imageHash,
            // Keep interaction metadata
            isInteractive: true,
            interactionType: elementData.interactionType,
            interactionMetadata: elementData.interactionMetadata,
          };

          const elementNode = await this.createSingleNodeRobust(
            isolatedElementData,
            sectionFrame
          );
          if (elementNode) {
            // Store original element ID for prototype connections
            this.safeSetPluginData(
              elementNode,
              "originalElementId",
              elementData.id
            );
            this.safeSetPluginData(
              elementNode,
              "interactionType",
              elementData.interactionType || "interactive"
            );

            // Add label showing what type of interaction this is
            if (
              elementData.interactionType &&
              elementData.interactionType !== "interactive"
            ) {
              elementNode.name = `${elementData.name || "Element"} (${
                elementData.interactionType
              })`;
            }

            sectionFrame.appendChild(elementNode);
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to create interactive element ${elementData.id}:`,
            error
          );
        }
      }

      if (sectionFrame.children.length > 0) {
        interactiveFrame.appendChild(sectionFrame);
      } else {
        sectionFrame.remove();
      }
    }

    if (interactiveFrame.children.length > 0) {
      // Add to the same page as main frame
      mainFrame.parent?.appendChild(interactiveFrame);
      console.log(
        `✅ Created interactive prototype frame with ${interactiveElements.length} elements`
      );
      return interactiveFrame;
    } else {
      interactiveFrame.remove();
      return null;
    }
  }

  /**
   * Set up prototype connections between main frame and interactive frame
   */
  private async setupPrototypeConnections(
    mainFrame: FrameNode,
    interactiveFrame: FrameNode
  ): Promise<void> {
    if (!mainFrame || !interactiveFrame) return;

    // Create a connection from main frame to interactive frame
    // This allows users to click on interactive elements in the main frame
    // and navigate to the interactive prototype frame

    // Find all interactive elements in the main frame
    const findInteractiveNodes = (node: SceneNode): SceneNode[] => {
      const interactive: SceneNode[] = [];

      // Check if node has interaction metadata
      const pluginData =
        (node as any).getPluginData?.("originalElementId") ||
        (node as any).getPluginData?.("interactionType");

      // Also check by name/type patterns
      const isLikelyInteractive =
        node.type === "COMPONENT" ||
        node.type === "INSTANCE" ||
        (node.name &&
          /button|link|dropdown|input|select|tab|menu/i.test(node.name));

      if (pluginData || isLikelyInteractive) {
        interactive.push(node);
      }

      // Recursively check children
      if ("children" in node) {
        for (const child of node.children) {
          interactive.push(...findInteractiveNodes(child));
        }
      }

      return interactive;
    };

    const mainInteractiveNodes = findInteractiveNodes(mainFrame);
    const interactiveFrameNodes = findInteractiveNodes(interactiveFrame);

    console.log(
      `🔗 Setting up prototype connections: ${mainInteractiveNodes.length} nodes in main frame, ${interactiveFrameNodes.length} in interactive frame`
    );

    // Create prototype connections
    // For each interactive element in main frame, connect to corresponding element in interactive frame
    for (const mainNode of mainInteractiveNodes) {
      if (!("setPrototypeData" in mainNode)) continue;

      try {
        // Find corresponding node in interactive frame by name or ID
        const mainNodeId =
          (mainNode as any).getPluginData?.("sourceNodeId") ||
          (mainNode as any).getPluginData?.("originalElementId");

        let targetNode: SceneNode | null = null;
        if (mainNodeId) {
          // Try to find by original element ID
          for (const interactiveNode of interactiveFrameNodes) {
            const interactiveId = (interactiveNode as any).getPluginData?.(
              "originalElementId"
            );
            if (interactiveId === mainNodeId) {
              targetNode = interactiveNode;
              break;
            }
          }
        }

        // If not found by ID, try to find by name
        if (!targetNode) {
          for (const interactiveNode of interactiveFrameNodes) {
            if (interactiveNode.name === mainNode.name) {
              targetNode = interactiveNode;
              break;
            }
          }
        }

        // If still not found, connect to the interactive frame itself
        if (!targetNode) {
          targetNode = interactiveFrame;
        }

        // Set prototype connection using Figma's prototype API
        // Store connection metadata in plugin data for reference
        this.safeSetPluginData(
          mainNode as SceneNode,
          "prototypeTarget",
          targetNode.id
        );
        this.safeSetPluginData(
          mainNode as SceneNode,
          "prototypeTransition",
          JSON.stringify({
            type: "INSTANT",
            duration: 0,
            easing: { type: "EASE_IN_OUT" },
          })
        );

        // Set actual prototype connection using Figma API
        // Note: Figma requires nodes to be components or frames for prototype connections
        try {
          // Convert to component if needed for prototype connections
          let prototypeNode = mainNode;
          if (
            mainNode.type !== "COMPONENT" &&
            mainNode.type !== "FRAME" &&
            "children" in mainNode
          ) {
            // For non-frame nodes, we'll store the connection info in plugin data
            // Users can manually set up connections in Figma's prototype mode
            console.log(
              `ℹ️ Node ${mainNode.name} is not a frame/component, storing prototype info in plugin data`
            );
          } else {
            // Set prototype connection for frames/components
            if ("setPrototypeData" in prototypeNode) {
              (prototypeNode as any).setPrototypeData({
                connections: [
                  {
                    destination: targetNode,
                    transition: {
                      type: "INSTANT",
                      duration: 0,
                      easing: { type: "EASE_IN_OUT" },
                    },
                  },
                ],
              });
              console.log(
                `✅ Set prototype connection from ${mainNode.name} to ${targetNode.name}`
              );
            }
          }
        } catch (error) {
          // If setPrototypeData fails, the plugin data will still be available
          console.warn(
            `⚠️ Could not set prototype data directly, stored in plugin data instead:`,
            error
          );
        }

        console.log(`✅ Connected ${mainNode.name} to ${targetNode.name}`);
      } catch (error) {
        console.warn(
          `⚠️ Failed to set prototype connection for ${mainNode.name}:`,
          error
        );
      }
    }

    // Also create a connection from interactive frame back to main frame
    // This allows users to navigate back
    try {
      this.safeSetPluginData(interactiveFrame, "prototypeTarget", mainFrame.id);
      this.safeSetPluginData(
        interactiveFrame,
        "prototypeTransition",
        JSON.stringify({
          type: "INSTANT",
          duration: 0,
          easing: { type: "EASE_IN_OUT" },
        })
      );

      // Set actual prototype connection from interactive frame back to main frame
      try {
        if ("setPrototypeData" in interactiveFrame) {
          (interactiveFrame as any).setPrototypeData({
            connections: [
              {
                destination: mainFrame,
                transition: {
                  type: "INSTANT",
                  duration: 0,
                  easing: { type: "EASE_IN_OUT" },
                },
              },
            ],
          });
          console.log("✅ Connected interactive frame back to main frame");
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not set prototype connection from interactive frame:",
          error
        );
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to set prototype connection from interactive frame:",
        error
      );
    }
  }

  private async processNodesWithBatchingRobust(
    parentFrame: FrameNode
  ): Promise<void> {
    // 🚨 EMERGENCY DIAGNOSTIC LOGGING - Capture complete schema structure
    console.log("\n" + "=".repeat(80));
    console.log("🚨 [EMERGENCY DIAGNOSTIC] SCHEMA STRUCTURE ANALYSIS");
    console.log("=".repeat(80));

    // Log all top-level keys in schema
    const schemaKeys = this.data ? Object.keys(this.data) : [];
    console.log("📋 Top-level schema keys:", schemaKeys);

    // Check root field
    console.log("\n🔍 Checking this.data.root:");
    if (this.data.root === undefined) {
      console.log("  ❌ this.data.root is UNDEFINED");
    } else if (this.data.root === null) {
      console.log("  ❌ this.data.root is NULL");
    } else {
      console.log("  ✅ this.data.root EXISTS");
      console.log("  Type:", typeof this.data.root);
      console.log("  Constructor:", this.data.root.constructor?.name);
      console.log("  Keys:", Object.keys(this.data.root).slice(0, 20));
      console.log("  .type:", this.data.root.type);
      console.log("  .htmlTag:", this.data.root.htmlTag);
      console.log("  .children type:", Array.isArray(this.data.root.children) ? "Array" : typeof this.data.root.children);
      console.log("  .children length:", this.data.root.children?.length);
      if (this.data.root.children?.length > 0) {
        console.log("  First child:", {
          type: this.data.root.children[0]?.type,
          htmlTag: this.data.root.children[0]?.htmlTag,
          id: this.data.root.children[0]?.id,
        });
      }
    }

    // Check tree field
    console.log("\n🔍 Checking this.data.tree:");
    if (this.data.tree === undefined) {
      console.log("  ℹ️ this.data.tree is UNDEFINED (expected for schema v2)");
    } else if (this.data.tree === null) {
      console.log("  ❌ this.data.tree is NULL");
    } else {
      console.log("  ✅ this.data.tree EXISTS (schema v1 compatibility)");
      console.log("  Type:", typeof this.data.tree);
      console.log("  .children length:", this.data.tree.children?.length);
    }

    // Check other critical fields
    console.log("\n📊 Other schema fields:");
    console.log("  .version:", this.data.version);
    console.log("  .schemaVersion:", (this.data as any).schemaVersion);
    console.log("  .metadata exists:", !!this.data.metadata);
    console.log("  .assets exists:", !!this.data.assets);
    console.log("  .styles exists:", !!this.data.styles);

    console.log("=".repeat(80) + "\n");
    // 🚨 END EMERGENCY DIAGNOSTIC LOGGING

    // BACKWARDS COMPATIBILITY: Support both schema v2 (root) and v1 (tree)
    if (!this.data.root && !this.data.tree) {
      throw new Error("No root data available (expected 'root' or 'tree' field in schema)");
    }

    // BACKWARDS COMPATIBILITY: Support both schema v2 (root) and v1 (tree)
    const rootNode = this.data.root || this.data.tree;

    if (!rootNode) {
      throw new Error(
        `CRITICAL: No root node found in schema. ` +
        `Expected 'root' (schema v2) or 'tree' (schema v1), but got: ${Object.keys(this.data || {})}`
      );
    }

    console.log("🔍 [SCHEMA] Root node structure:", {
      field: this.data.root ? 'root' : 'tree',
      type: rootNode.type,
      htmlTag: rootNode.htmlTag,
      hasChildren: !!rootNode.children,
      childCount: rootNode.children?.length || 0,
      hasLayout: !!rootNode.layout,
      schemaKeys: Object.keys(this.data || {}),
    });

    // PHASE 1 OPTIMIZATION: Pre-analyze schema for better planning
    const analysis = this.analyzeSchema(rootNode);
    console.log(
      `🌳 Schema Analysis: ${analysis.totalNodes} nodes, ${analysis.requiredFonts.size} fonts, ${analysis.imageHashes.size} images, depth: ${analysis.depth}`
    );

    // CRITICAL CHECK: If analysis found 0 nodes, something is wrong
    if (analysis.totalNodes === 0) {
      console.error("❌ [CRITICAL] Schema analysis found 0 nodes!");
      console.error("Root node details:", {
        type: rootNode?.type,
        htmlTag: rootNode?.htmlTag,
        hasChildren: !!rootNode?.children,
        childrenType: Array.isArray(rootNode?.children) ? 'array' : typeof rootNode?.children,
        childCount: rootNode?.children?.length,
        rootKeys: Object.keys(rootNode || {}),
      });

      console.warn("⚠️ Proceeding with 0 nodes - this will likely result in blank frame");
    }

    this.postProgress(`Pre-analyzing schema...`, 5);

    // PHASE 2: Pre-process schema (normalize values upfront)
    this.preprocessSchema(rootNode);

    // PROFESSIONAL: Prepare layout schema with professional layout intelligence
    console.log(
      "🏗️ [PROFESSIONAL LAYOUT] Preparing layout schema with professional intelligence..."
    );
    prepareLayoutSchema(this.data);
    console.log(
      "✅ [PROFESSIONAL LAYOUT] Layout schema prepared with professional-grade analysis"
    );

    // PHASE 1 OPTIMIZATION: Pre-load all fonts upfront (parallel)
    this.postProgress(`Pre-loading ${analysis.requiredFonts.size} fonts...`, 6);
    const fontMap = await this.preloadFontsWithSmartFallback(
      analysis.requiredFonts
    );
    console.log(`✅ Pre-loaded ${fontMap.size} fonts`);

    // PHASE 1 OPTIMIZATION: Pre-resolve all images upfront (parallel)
    if (analysis.imageHashes.size > 0) {
      this.postProgress(
        `Pre-resolving ${analysis.imageHashes.size} images...`,
        8
      );
      const imageMap = await this.preResolveImages(analysis.imageHashes);
      console.log(`✅ Pre-resolved ${imageMap.size} images`);
      // Store image map for use during node creation
      (this.nodeBuilder as any).preResolvedImages = imageMap;
    }

    this.postProgress(`Processing ${analysis.totalNodes} elements...`, 10);

    // HIERARCHY INFERENCE: Improve tree structure before building
    // BACKWARDS COMPATIBILITY: Use rootNode (which is already root || tree)
    let treeToBuild = rootNode;
    let inferredTreeMetrics: any = null;

    if (this.options.useHierarchyInference !== false) {
      try {
        console.log("🌳 [HIERARCHY] Running hierarchy inference...");
        this.postProgress("Inferring hierarchy structure...", 9);

        // For very large pages (like YouTube), add timeout protection
        const inferenceStartTime = Date.now();
        const INFERENCE_TIMEOUT = 30000; // 30 seconds max for inference

        const inferredTree = inferHierarchy(this.data.root);
        const inferenceTime = Date.now() - inferenceStartTime;

        if (inferenceTime > INFERENCE_TIMEOUT) {
          console.warn(
            `⚠️ [HIERARCHY] Inference took ${inferenceTime}ms (exceeded ${INFERENCE_TIMEOUT}ms threshold), using original tree for performance`
          );
          treeToBuild = this.data.root;
        } else {
          inferredTreeMetrics = inferredTree.metrics;

          // Convert inferred tree back to ElementNode format
          treeToBuild = convertInferredTreeToElementNode(inferredTree);

          // Generate and print quality report
          const report = generateTreeQualityReport(
            inferredTree,
            analysis.totalNodes
          );
          printTreeQualityReport(report);

          // Export debug artifact if in debug mode
          if (this.options.enableDebugMode) {
            const debugArtifact = exportDebugArtifact(inferredTree, report);
            console.log(
              "📊 [HIERARCHY] Debug artifact (first 1000 chars):",
              debugArtifact.substring(0, 1000)
            );
            // Store in plugin data for potential download
            figma.root.setPluginData(
              "hierarchy-inference-debug",
              debugArtifact
            );
          }

          console.log(
            `✅ [HIERARCHY] Hierarchy inference complete (${inferenceTime}ms)`
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `❌ [HIERARCHY] Hierarchy inference failed, falling back to original tree: ${errorMsg}`
        );
        if (error instanceof Error && error.stack) {
          console.error("Stack trace:", error.stack);
        }
        // Fall back to original tree on error
        treeToBuild = this.data.root;
      }
    } else {
      console.log(
        "⏭️ [HIERARCHY] Hierarchy inference disabled (useHierarchyInference=false)"
      );
    }

    // Build node hierarchy with error tracking and PARALLEL processing
    this.processedNodeCount = 0;

    const buildHierarchy = async (
      nodeData: any,
      parent: FrameNode | SceneNode,
      options: { batchSize?: number } = {}
    ): Promise<SceneNode | null> => {
      const batchSize = options.batchSize || 50; // Optimized batch size for stability and speed

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
        const progress =
          10 + (this.processedNodeCount / analysis.totalNodes) * 70;

        if (this.processedNodeCount % 50 === 0) {
          this.postProgress(
            `Created ${this.processedNodeCount}/${analysis.totalNodes} elements...`,
            progress
          );
        }

        // Process pseudo-elements and children in correct paint order.
        // CSS: ::before paints before the element's children; ::after paints after.
        if (validated.pseudoElements?.before) {
          await buildHierarchy(
            validated.pseudoElements.before,
            figmaNode,
            options
          );
        }

        // PHASE 1 OPTIMIZATION: Process children in PARALLEL batches instead of sequentially
        // RULE 6.1: Sort by stacking context (z-index, position, opacity, transform)
        if (validated.children && Array.isArray(validated.children)) {
          const sortedChildren = this.sortChildrenByStackingContext(
            validated.children
          );

          // Process children in parallel batches
          for (let i = 0; i < sortedChildren.length; i += batchSize) {
            const batch = sortedChildren.slice(i, i + batchSize);
            const batchPromises = batch.map((child) =>
              buildHierarchy(child, figmaNode, options)
            );

            // Use Promise.allSettled to continue even if some fail
            const results = await Promise.allSettled(batchPromises);

            // Log any failures in this batch
            const failures = results.filter((r) => r.status === "rejected");
            if (failures.length > 0) {
              console.warn(
                `⚠️ ${failures.length} nodes failed in batch ${
                  Math.floor(i / batchSize) + 1
                }`
              );
            }
          }
        }

        if (validated.pseudoElements?.after) {
          await buildHierarchy(
            validated.pseudoElements.after,
            figmaNode,
            options
          );
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

    // Handle body node properly - support both html and body root tags
    // CRITICAL FIX: The schema may have either "html" or "body" as root
    // If root is "html", find the body child and process that
    let bodyNode = treeToBuild;

    if (treeToBuild.htmlTag === "html") {
      console.log("🔄 Root is <html>, finding <body> child...");
      const bodyChild = treeToBuild.children?.find(
        (child: any) => child.htmlTag === "body"
      );
      if (bodyChild) {
        console.log("✅ Found <body> child, processing from there");
        bodyNode = bodyChild;
      } else {
        console.warn(
          "⚠️ No <body> child found in <html> root, processing html children directly"
        );
      }
    }

    // Only do special body processing if we have a body or html node
    if (
      (bodyNode.htmlTag === "body" || bodyNode.htmlTag === "html") &&
      bodyNode.children
    ) {
      console.log(
        `🔄 Processing ${bodyNode.children.length} children from <${
          bodyNode.htmlTag || bodyNode.name
        }>`
      );

      // CRITICAL FIX: Check if first child is a full-page container with dark background
      // Many sites (like Facebook) have a root container that covers the entire page
      // If it has a dark background, it will override the white main frame
      const firstChild = bodyNode.children[0];
      if (firstChild) {
        const firstChildLayout = firstChild.layout || firstChild.absoluteLayout;
        const mainFrameWidth = parentFrame.width;
        const mainFrameHeight = parentFrame.height;

        // ENHANCED: Check if first child is a hero section or important content area
        // Hero sections should NOT have their fills cleared even if they're large
        const isHeroSection =
          firstChild.name?.toLowerCase().includes("hero") ||
          firstChild.cssClasses?.some((cls: string) =>
            /hero|banner|main.*section/i.test(cls)
          ) ||
          (firstChildLayout &&
            firstChildLayout.y < 500 && // Near top of page
            firstChildLayout.height > 300); // Tall section

        // Check if first child covers most of the main frame (likely a root container)
        const coversMostOfFrame =
          firstChildLayout &&
          firstChildLayout.width > mainFrameWidth * 0.9 &&
          firstChildLayout.height > mainFrameHeight * 0.9;

        // Check if it has a dark background
        const hasDarkFill = firstChild.fills?.some((fill: any) => {
          if (fill.type === "SOLID" && fill.color) {
            const { r, g, b } = fill.color;
            const lightness = (r + g + b) / 3;
            return lightness < 0.5; // Dark color
          }
          return false;
        });

        // CRITICAL FIX: Don't clear fills from hero sections or sections with images
        // Hero sections often have intentional backgrounds (images, gradients, dark themes)
        const hasImageFill = firstChild.fills?.some(
          (fill: any) => fill.type === "IMAGE" || fill.type === "GRADIENT"
        );
        const hasImageHash = !!firstChild.imageHash;

        // Only clear dark fills if:
        // 1. It covers most of the frame (root container)
        // 2. It has a dark fill
        // 3. It's NOT a hero section
        // 4. It doesn't have image/gradient fills (those are intentional)
        if (
          coversMostOfFrame &&
          hasDarkFill &&
          !isHeroSection &&
          !hasImageFill &&
          !hasImageHash
        ) {
          // ENHANCED: PRESERVE DARK MODE
          // Logic to strip dark backgrounds has been removed to support dark mode sites (YouTube, etc.)
          // The background should be determined by the content, not forced to white.
          if (hasDarkFill) {
            console.log(
              `✅ [THEME] Preserving dark background on ${
                firstChild.name || firstChild.id
              }`
            );
          } else if (isHeroSection) {
            console.log(
              `✅ [HERO] Preserving hero section fills: ${
                firstChild.name || firstChild.id
              }`
            );
          }
        }

        // Track build success/failure for debugging white frame bug
        let successCount = 0;
        let failCount = 0;
        console.log(
          `[DEBUG] Building ${bodyNode.children.length} child nodes...`
        );

        // FIDELITY FIX: Sort children by z-index before building
        const sortedChildren = (bodyNode.children || []).sort((a: any, b: any) => {
          const zA = typeof a.zIndex === 'number' ? a.zIndex :
                    (a.layoutContext?.zIndex && a.layoutContext.zIndex !== 'auto' ? parseInt(a.layoutContext.zIndex, 10) : 0);
          const zB = typeof b.zIndex === 'number' ? b.zIndex :
                    (b.layoutContext?.zIndex && b.layoutContext.zIndex !== 'auto' ? parseInt(b.layoutContext.zIndex, 10) : 0);
          return zA - zB;
        });

        for (const child of sortedChildren) {
          const result = await buildHierarchy(child, parentFrame);
          if (result) {
            successCount++;
          } else {
            failCount++;
            console.error(`❌ [CRITICAL] Failed to build child node:`, {
              id: child.id,
              tagName: child.tagName,
              hasRect: !!child.rect,
              hasLayout: !!child.layout,
              childCount: child.children?.length || 0,
            });
          }
        }

        console.log(
          `[DEBUG] Build results: ${successCount} success, ${failCount} failed out of ${bodyNode.children.length} total`
        );

        // GRACEFUL FAILURE: Don't throw - allow partial imports to persist for validation
        if (successCount === 0 && bodyNode.children.length > 0) {
          console.error(
            `❌ [CRITICAL] All ${bodyNode.children.length} child nodes failed to build. ` +
              `This will result in a blank white frame. Check console above for specific validation/creation errors. ` +
              `Failed nodes tracked in this.failedNodes (${this.failedNodes.length} total).`
          );
          console.warn(`⚠️ [GRACEFUL] Continuing import to preserve partial results for debugging`);
        }
      } else {
        console.log(`[DEBUG] Building single bodyNode directly...`);
        const result = await buildHierarchy(bodyNode, parentFrame);
        if (!result) {
          console.error(`❌ [CRITICAL] Failed to build bodyNode:`, {
            id: bodyNode.id,
            tagName: bodyNode.tagName,
            hasRect: !!bodyNode.rect,
            hasLayout: !!bodyNode.layout,
          });
          // GRACEFUL FAILURE: Don't throw - allow partial imports to persist for validation
          console.warn(`⚠️ [GRACEFUL] Continuing import despite root bodyNode failure`);
        }
      }

      console.log(
        `✅ Node processing complete: ${this.processedNodeCount} created, ${this.failedNodes.length} failed`
      );
    } else {
      // Not a body/html node, process the tree normally
      console.log(`[DEBUG] Building non-body tree...`);
      const result = await buildHierarchy(treeToBuild, parentFrame);
      if (!result) {
        console.error(`❌ [CRITICAL] Failed to build root tree node:`, {
          id: treeToBuild.id,
          tagName: treeToBuild.tagName,
          hasRect: !!treeToBuild.rect,
          hasLayout: !!treeToBuild.layout,
        });
        // GRACEFUL FAILURE: Don't throw - allow partial imports to persist for validation
        console.warn(`⚠️ [GRACEFUL] Continuing import despite root tree node failure`);
      }

      console.log(
        `✅ Node processing complete: ${this.processedNodeCount} created, ${this.failedNodes.length} failed`
      );
    }
  }

  // RULE 6.1: Sort by stacking context (not just z-index)
  private sortChildrenByStackingContext(children: any[]): any[] {
    return this.sortChildrenByZIndex(children); // Uses enhanced logic below
  }

  private sortChildrenByZIndex(children: any[]): any[] {
    // Preserve original DOM order as a deterministic tie-breaker.
    // (Some runtimes have had unstable sorts; even with stable sorts, being explicit
    // prevents accidental reordering that can place overlay rectangles above images.)
    return children
      .map((child, index) => ({ child, index }))
      .sort((aWrap, bWrap) => {
        const a = aWrap.child;
        const b = bWrap.child;
        const zIndexA = ValidationUtils.safeParseFloat(
          a.zIndex || a.layoutContext?.zIndex,
          0
        );
        const zIndexB = ValidationUtils.safeParseFloat(
          b.zIndex || b.layoutContext?.zIndex,
          0
        );

        // RULE 6.1: Consider stacking context markers
        const stackingA =
          a._stackingContext || a.layoutContext?._stackingContext || false;
        const stackingB =
          b._stackingContext || b.layoutContext?._stackingContext || false;
        const isPositionedA =
          (a.position || a.layoutContext?.position) &&
          (a.position || a.layoutContext?.position) !== "static";
        const isPositionedB =
          (b.position || b.layoutContext?.position) &&
          (b.position || b.layoutContext?.position) !== "static";

        const getWeight = (
          zIndex: number,
          isPositioned: boolean,
          hasStacking: boolean
        ) => {
          if (zIndex < 0) return zIndex;
          if (zIndex > 0) return zIndex;
          // RULE 6.1: Stacking context elements sort above non-stacking
          if (hasStacking && !isPositioned) return 0.05;
          return isPositioned ? 0.1 : 0;
        };

        const diff =
          getWeight(zIndexA, isPositionedA, stackingA) -
          getWeight(zIndexB, isPositionedB, stackingB);
        if (diff !== 0) return diff;
        return aWrap.index - bWrap.index;
      })
      .map((w) => w.child);
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
      console.error(
        `❌ [NODE_CREATION] NodeBuilder returned null for ${nodeData.id}`,
        {
          id: nodeData.id,
          type: nodeData.type,
          tagName: nodeData.tagName,
          hasLayout: !!nodeData.layout,
          hasRect: !!nodeData.rect,
          hasStyles: !!nodeData.styles,
          nodeKeys: Object.keys(nodeData),
        }
      );
      return null;
    }

    // Clear body/html backgrounds (including images)
    // Body/html elements should not have backgrounds applied as they would override the main frame
    if (
      (nodeData.htmlTag === "body" || nodeData.htmlTag === "html") &&
      "fills" in figmaNode
    ) {
      const bodyFills = (figmaNode as any).fills;
      if (Array.isArray(bodyFills) && bodyFills.length > 0) {
        const hasNonWhiteFill = bodyFills.some((fill: any) => {
          // Check for IMAGE fills - these should always be cleared for body/html
          if (fill.type === "IMAGE") {
            return true;
          }
          // Check for non-white SOLID fills
          if (fill.type === "SOLID" && fill.color) {
            const isWhite =
              fill.color.r > 0.95 && fill.color.g > 0.95 && fill.color.b > 0.95;
            const isTransparent = fill.opacity === 0;
            return !isWhite && !isTransparent;
          }
          // Clear any other fill types (gradients, etc.) for body/html
          return fill.type !== "SOLID";
        });

        if (hasNonWhiteFill) {
          // ENHANCED: PRESERVE DARK MODE
          // Do NOT strip backgrounds from body/html. If they are dark, we want them!
          console.log(
            `  ✅ [THEME] Preserving ${bodyFills.length} fill(s) on ${nodeData.htmlTag} element (Dark Mode support)`
          );
          // (figmaNode as any).fills = []; // DISABLED
        }
      }
    }

    // Apply metadata
    this.applyNodeMetadata(figmaNode, nodeData);

    // Calculate and apply position
    // CRITICAL VALIDATION: IMAGE nodes must have proper parent relationships
    if (nodeData.type === "IMAGE" && !nodeData.parentId) {
      const error = `❌ CRITICAL: IMAGE node "${
        nodeData.name || nodeData.id
      }" has no parentId - this will cause incorrect placement`;
      console.error(error);
      throw new Error(error);
    }

    // CRITICAL FIX: Ensure parent absolute coordinates are stored before calculating child position
    // This must happen BEFORE position calculation so child can reference parent's position
    if (
      !parent.getPluginData("absoluteX") ||
      !parent.getPluginData("absoluteY")
    ) {
      // Try to get parent's absolute coordinates from its stored data
      const parentAbsX = nodeData.parentId
        ? this.createdNodes
            .get(nodeData.parentId)
            ?.getPluginData("absoluteX") || "0"
        : "0";
      const parentAbsY = nodeData.parentId
        ? this.createdNodes
            .get(nodeData.parentId)
            ?.getPluginData("absoluteY") || "0"
        : "0";

      // If parent doesn't have stored coordinates, check if it's the root frame
      if (parentAbsX === "0" && parentAbsY === "0") {
        // Check if this is the main frame (root of import)
        const isMainFrame =
          parent.name === this.data.root?.name ||
          parent.id === this.mainFrame?.id ||
          !parent.parent ||
          parent.parent.type === "PAGE";

        if (isMainFrame) {
          // Root frame starts at (0, 0) in document coordinates
          this.safeSetPluginData(parent, "absoluteX", "0");
          this.safeSetPluginData(parent, "absoluteY", "0");
        } else if ("x" in parent && "y" in parent) {
          // For non-root frames, use their position as absolute (if not in Auto Layout)
          const hasAutoLayout =
            "layoutMode" in parent && parent.layoutMode !== "NONE";
          if (!hasAutoLayout) {
            // Calculate absolute position from parent's position in its parent
            const parentParent = parent.parent;
            if (parentParent && "x" in parentParent && "y" in parentParent) {
              const parentParentAbsX = ValidationUtils.safeParseFloat(
                parentParent.getPluginData("absoluteX") || "0",
                0
              );
              const parentParentAbsY = ValidationUtils.safeParseFloat(
                parentParent.getPluginData("absoluteY") || "0",
                0
              );
              const absX = parentParentAbsX + parent.x;
              const absY = parentParentAbsY + parent.y;
              this.safeSetPluginData(parent, "absoluteX", String(absX));
              this.safeSetPluginData(parent, "absoluteY", String(absY));
            } else {
              // No parent parent, use position directly
              this.safeSetPluginData(parent, "absoluteX", String(parent.x));
              this.safeSetPluginData(parent, "absoluteY", String(parent.y));
            }
          }
        }
      } else {
        // Parent has stored coordinates, use them
        this.safeSetPluginData(parent, "absoluteX", parentAbsX);
        this.safeSetPluginData(parent, "absoluteY", parentAbsY);
      }
    }

    // Calculate position BEFORE appending (needs parent context)
    const position = this.calculateNodePosition(nodeData, parent);
    const parentHasAutoLayout =
      "layoutMode" in parent && parent.layoutMode !== "NONE";

    // Store absolute coordinates in plugin data for future reference
    this.safeSetPluginData(figmaNode, "absoluteX", String(position.absoluteX));
    this.safeSetPluginData(figmaNode, "absoluteY", String(position.absoluteY));

    // Apply Auto Layout (optional) - must happen BEFORE appending
    if (this.options.applyAutoLayout !== false) {
      await this.applyAutoLayoutRobust(figmaNode, nodeData);
      this.applyFlexChildProperties(figmaNode, nodeData);
    }

    // CRITICAL FIX: Append to parent FIRST, then set position
    // Figma requires nodes to be in the parent's coordinate system before positioning
    if ((parent as SceneNode).type !== "TEXT") {
      parent.appendChild(figmaNode);
    }

    // CRITICAL FIX: Set position AFTER appending to parent AND validate coordinates
    // This ensures the position is set in the correct coordinate system
    if (!parentHasAutoLayout) {
      // Validate and sanitize coordinates before applying
      const validX = this.validateCoordinate(position.x, "x", nodeData.id);
      const validY = this.validateCoordinate(position.y, "y", nodeData.id);

      figmaNode.x = validX;
      figmaNode.y = validY;

      console.log(
        `📍 [POSITION] Node "${nodeData.name}" positioned at (${validX}, ${validY})`
      );

      // Store absolute coordinates for verification
      this.safeSetPluginData(figmaNode, "appliedX", String(validX));
      this.safeSetPluginData(figmaNode, "appliedY", String(validY));
    } else {
      // For Auto Layout parents, store original position but don't set x/y
      // (Auto Layout will position the child)
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

    // Size is applied by NodeBuilder using absoluteLayout/layout (getBoundingClientRect),
    // which already reflects CSS border-box sizing; avoid double-resizing here.

    return figmaNode;
  }

  private calculateNodePosition(
    nodeData: ValidatedNodeData,
    parent: FrameNode
  ): { x: number; y: number; absoluteX: number; absoluteY: number } {
    // PIXEL-PERFECT POSITION CALCULATION v2.0
    // Fixes coordinate system mismatches and Auto Layout positioning issues

    // 1. Extract absolute position with priority order (most accurate first)
    let absX = 0;
    let absY = 0;

    if (nodeData.boundingBox) {
      // boundingBox is most accurate (includes transforms)
      absX = ValidationUtils.safeParseFloat(nodeData.boundingBox.x, 0);
      absY = ValidationUtils.safeParseFloat(nodeData.boundingBox.y, 0);
    } else if (nodeData.absoluteLayout) {
      // absoluteLayout for fixed/absolute positioned elements
      absX = ValidationUtils.safeParseFloat(nodeData.absoluteLayout.left, 0);
      absY = ValidationUtils.safeParseFloat(nodeData.absoluteLayout.top, 0);
    } else if (nodeData.layout) {
      // Fallback to basic layout
      absX = ValidationUtils.safeParseFloat(nodeData.layout.x, 0);
      absY = ValidationUtils.safeParseFloat(nodeData.layout.y, 0);
    }

    // 2. Determine positioning context
    const cssPosition =
      nodeData.computedPosition?.position ||
      (nodeData as any)?.layoutContext?.position ||
      (nodeData as any)?.position ||
      "";
    const isFixed = cssPosition === "fixed";
    const isAbsolute = cssPosition === "absolute";
    const isSpeciallyPositioned = isFixed || isAbsolute;

    // 3. Check parent Auto Layout status
    const parentHasAutoLayout =
      "layoutMode" in parent && parent.layoutMode !== "NONE";

    // 4. Get parent coordinate information
    const parentAbsXStr = parent.getPluginData("absoluteX");
    const parentAbsYStr = parent.getPluginData("absoluteY");
    const parentAbsX = ValidationUtils.safeParseFloat(parentAbsXStr || "0", 0);
    const parentAbsY = ValidationUtils.safeParseFloat(parentAbsYStr || "0", 0);

    // 5. Calculate relative position based on context
    let relativeX: number;
    let relativeY: number;

    if (isSpeciallyPositioned) {
      // CRITICAL BUG FIX: Fixed/Absolute elements still need to be relative to their parent
      // The old code: relativeX = absX * this.scaleFactor was causing 2845px deviations
      relativeX = absX - parentAbsX;
      relativeY = absY - parentAbsY;

      console.log(
        `🔧 [FIXED BUG] ${cssPosition} element "${nodeData.name}": abs(${absX}, ${absY}) - parent(${parentAbsX}, ${parentAbsY}) = rel(${relativeX}, ${relativeY})`
      );
    } else if (parentHasAutoLayout) {
      // CRITICAL FIX: Don't override positions for manually positioned elements within Auto Layout containers
      // Check if element is actually supposed to be auto-laid-out or manually positioned
      const isManuallyPositioned =
        isAbsolute ||
        isFixed ||
        nodeData.layoutContext?.position === "absolute" ||
        nodeData.layoutContext?.position === "fixed" ||
        nodeData.layout?.position === "absolute" ||
        nodeData.layout?.position === "fixed";

      if (isManuallyPositioned) {
        // Element is manually positioned within Auto Layout parent - preserve its position
        relativeX = absX - parentAbsX;
        relativeY = absY - parentAbsY;

        console.log(
          `📍 [MANUAL IN AUTO] "${nodeData.name}" manually positioned in Auto Layout parent: (${relativeX}, ${relativeY})`
        );
      } else {
        // True Auto Layout child: let layout handle positioning
        relativeX = 0;
        relativeY = 0;

        console.log(
          `🔄 [AUTO LAYOUT] Child "${nodeData.name}" in Auto Layout parent - position managed by layout`
        );
      }
    } else if (
      nodeData.layout?.relativeX !== undefined &&
      nodeData.layout?.relativeY !== undefined
    ) {
      // Use pre-calculated relative positions, but validate against absolute coordinates
      const preCalcRelX = ValidationUtils.safeParseFloat(
        nodeData.layout.relativeX,
        0
      );
      const preCalcRelY = ValidationUtils.safeParseFloat(
        nodeData.layout.relativeY,
        0
      );

      // Validate pre-calculated relative position against absolute coordinates
      const calculatedRelX = absX - parentAbsX;
      const calculatedRelY = absY - parentAbsY;

      // Check if pre-calculated position significantly differs from calculated position
      const xDiff = Math.abs(preCalcRelX - calculatedRelX);
      const yDiff = Math.abs(preCalcRelY - calculatedRelY);
      const tolerance = 50; // 50px tolerance for differences

      if (xDiff > tolerance || yDiff > tolerance) {
        // Pre-calculated position is inconsistent, use calculated position
        relativeX = calculatedRelX;
        relativeY = calculatedRelY;

        console.log(
          `⚠️ [POSITION FIX] "${nodeData.name}": Pre-calc rel(${preCalcRelX}, ${preCalcRelY}) differs from calc rel(${calculatedRelX}, ${calculatedRelY}) by (${xDiff}, ${yDiff})px. Using calculated position.`
        );
      } else {
        // Pre-calculated position is reasonable, use it
        relativeX = preCalcRelX;
        relativeY = preCalcRelY;

        console.log(
          `📐 [RELATIVE] Pre-calc position for "${nodeData.name}": (${relativeX}, ${relativeY})`
        );
      }
    } else {
      // Calculate relative position from absolute coordinates
      // CRITICAL FIX: Account for coordinate system and parent context

      // Basic relative calculation (REMOVED INCORRECT scaleFactor multiplication)
      relativeX = absX - parentAbsX;
      relativeY = absY - parentAbsY;

      // Apply coordinate system corrections
      const isTopLevelElement = parentAbsX === 0 && parentAbsY === 0;

      // Account for scroll offset if this is a top-level element
      if (isTopLevelElement) {
        const scrollOffset = this.data.metadata?.scrollOffset || {
          top: 0,
          left: 0,
        };

        // If element appears too high due to scroll offset being subtracted, correct it
        if (absY < scrollOffset.top && relativeY < 0) {
          relativeY = absY; // Use absolute position instead (REMOVED incorrect scaleFactor)
          console.log(
            `📜 [SCROLL FIX] Top-level element "${nodeData.name}" scroll correction: ${absY} → ${relativeY}`
          );
        }
        if (absX < scrollOffset.left && relativeX < 0) {
          relativeX = absX; // Use absolute position instead (REMOVED incorrect scaleFactor)
          console.log(
            `📜 [SCROLL FIX] Top-level element "${nodeData.name}" scroll correction: ${absX} → ${relativeX}`
          );
        }
      }

      console.log(
        `🧮 [CALC] Position for "${nodeData.name}": abs(${absX}, ${absY}) - parent(${parentAbsX}, ${parentAbsY}) = rel(${relativeX}, ${relativeY})`
      );
    }

    // 6. Validate and sanitize final positions
    relativeX = ValidationUtils.safeParseFloat(relativeX, 0);
    relativeY = ValidationUtils.safeParseFloat(relativeY, 0);

    // 7. Handle special cases for hero/banner elements
    const isHeroElement =
      nodeData.name?.toLowerCase().includes("hero") ||
      nodeData.cssClasses?.some((cls: string) =>
        /hero|banner|navbar|header/i.test(cls)
      ) ||
      (absY < 100 && (nodeData.layout?.height || 0) > 200);

    if (isHeroElement && relativeY < 0 && !isSpeciallyPositioned) {
      console.log(
        `🦸 [HERO FIX] Hero element "${nodeData.name}" had negative Y (${relativeY}), correcting using absolute Y: ${absY}`
      );
      relativeY = Math.max(0, absY);
    }

    // 8. Log final positioning for debugging
    if (this.options?.enableDebugMode) {
      console.log(
        `✅ [FINAL POSITION] "${nodeData.name}": (${relativeX.toFixed(
          1
        )}, ${relativeY.toFixed(1)}) | absolute: (${absX}, ${absY})`
      );
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

  /**
   * PHASE 1 OPTIMIZATION: Pre-resolve all images upfront in parallel
   */
  private async preResolveImages(
    imageHashes: Set<string>
  ): Promise<Map<string, Paint>> {
    const imageMap = new Map<string, Paint>();
    const hashArray = Array.from(imageHashes);

    if (hashArray.length === 0) {
      return imageMap;
    }

    console.log(`📸 Pre-resolving ${hashArray.length} images in parallel...`);

    // Process images in parallel batches with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < hashArray.length; i += concurrency) {
      const batch = hashArray.slice(i, i + concurrency);
      const batchPromises = batch.map(async (hash) => {
        try {
          const fill = { imageHash: hash, type: "IMAGE" as const };
          const paint = await this.nodeBuilder.resolveImagePaint(fill);
          return { hash, paint };
        } catch (error) {
          console.warn(`⚠️ Failed to resolve image ${hash}:`, error);
          // Return a placeholder solid fill
          return {
            hash,
            paint: {
              type: "SOLID",
              color: { r: 1, g: 0.5, b: 0.5 },
              opacity: 0.7,
            } as SolidPaint,
          };
        }
      });

      const results = await Promise.allSettled(batchPromises);
      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          imageMap.set(batch[idx], result.value.paint);
        } else {
          // Fallback to placeholder on error
          imageMap.set(batch[idx], {
            type: "SOLID",
            color: { r: 1, g: 0.5, b: 0.5 },
            opacity: 0.7,
          } as SolidPaint);
        }
      });

      // Small delay between batches to avoid overwhelming Figma API
      if (i + concurrency < hashArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    console.log(`✅ Pre-resolved ${imageMap.size}/${hashArray.length} images`);
    return imageMap;
  }

  private async batchProcessImagesRobust(imageNodes: any[]): Promise<void> {
    // Also collect all image hashes from assets registry that might not be in tree
    const assetImageHashes = new Set<string>();
    if (this.data.assets?.images) {
      Object.keys(this.data.assets.images).forEach((hash) => {
        assetImageHashes.add(hash);
        // Also add as a node for preloading
        if (!imageNodes.find((n) => n.imageHash === hash)) {
          imageNodes.push({ imageHash: hash, source: "asset-registry" });
        }
      });
    }

    console.log(
      `📸 Preloading ${imageNodes.length} images (${assetImageHashes.size} from asset registry)`
    );

    const batches = this.chunkArray(imageNodes, this.options.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      this.postProgress(
        `Processing image batch ${i + 1}/${batches.length}...`,
        15 + (i / batches.length) * 15
      );

      const batchPromises = batches[i].map((node) =>
        this.preloadImageRobust(node)
      );
      const results = await Promise.allSettled(batchPromises);

      // Log failures
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        console.warn(
          `⚠️ ${failures.length} images failed to preload in batch ${i + 1}`
        );
      }

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

      let imageAsset = this.data.assets?.images?.[imageHash];

      // If exact match not found, try fuzzy matching
      if (!imageAsset && this.data.assets?.images) {
        const hashSuffix = imageHash.slice(-8); // Last 8 chars
        const allKeys = Object.keys(this.data.assets.images);

        // Deterministic fuzzy matching: only accept suffix matches when unique.
        const candidates = allKeys.filter(
          (key) => key.endsWith(hashSuffix) || imageHash.endsWith(key.slice(-8))
        );
        if (candidates.length === 1) {
          const key = candidates[0];
          console.log(
            `  🔍 Fuzzy matching image hash (unique candidate): ${key} for ${imageHash}`
          );
          imageAsset = this.data.assets.images[key];
          // Note: Don't cache here - wait until Figma image is actually created below
        } else if (candidates.length > 1) {
          console.warn(
            `  ⚠️ Ambiguous fuzzy image hash match for ${imageHash} (${candidates.length} candidates) - skipping fuzzy mapping to avoid wrong images`
          );
        }

        // Try case-insensitive matching
        if (!imageAsset) {
          const lowerHash = imageHash.toLowerCase();
          for (const key of allKeys) {
            if (key.toLowerCase() === lowerHash) {
              console.log(
                `  🔍 Case-insensitive match: ${key} for ${imageHash}`
              );
              imageAsset = this.data.assets.images[key];
              if (imageAsset) {
                break;
              }
            }
          }
        }
      }

      if (!imageAsset) {
        console.error(
          `❌ Image asset not found: ${imageHash}. Available keys:`,
          Object.keys(this.data.assets?.images || {}).slice(0, 10)
        );
        throw new Error(`Image asset not found: ${imageHash}`);
      }

      const base64Data =
        imageAsset.base64 || imageAsset.data || imageAsset.screenshot;

      const urlCandidate =
        (typeof imageAsset.url === "string" && imageAsset.url) ||
        (typeof imageAsset.absoluteUrl === "string" &&
          imageAsset.absoluteUrl) ||
        (typeof imageAsset.originalUrl === "string" &&
          imageAsset.originalUrl) ||
        null;

      const mimeHint =
        (typeof imageAsset.mimeType === "string" && imageAsset.mimeType) ||
        (typeof (imageAsset as any).contentType === "string" &&
          (imageAsset as any).contentType) ||
        "";
      const isAvifAsset =
        mimeHint.toLowerCase().includes("avif") ||
        (typeof urlCandidate === "string" &&
          /\.avif(\?|#|$)/i.test(urlCandidate));

      let imageBytes: Uint8Array | null = null;

      if (base64Data && typeof base64Data === "string") {
        const normalized = ValidationUtils.normalizeBase64Payload(base64Data);
        if (!ValidationUtils.validateBase64(normalized)) {
          console.warn(
            `⚠️ Invalid base64 for image ${imageHash}, will try URL fallback if available`
          );
        } else {
          try {
            // AVIF is common on modern sites (incl. Etsy), but Figma createImage doesn't support it.
            // Prefer transcoding up-front when we have a strong AVIF hint.
            imageBytes = isAvifAsset
              ? await requestImageTranscode(normalized, "image/avif")
              : await this.base64ToUint8ArrayRobust(normalized);
          } catch (decodeError) {
            console.warn(
              `⚠️ base64Decode failed for ${imageHash}, will try URL fallback if available`,
              decodeError
            );
          }
        }
      }

      if (!imageBytes && urlCandidate) {
        const isSvg =
          /\.svg(\?|#|$)/i.test(urlCandidate) ||
          (typeof imageAsset.mimeType === "string" &&
            imageAsset.mimeType.includes("svg"));

        // Let NodeBuilder handle SVG rasterization/vector conversion; don't preload.
        if (!isSvg) {
          const fetched = await this.fetchImageBytesRobust(urlCandidate);
          const isWebp =
            (fetched.contentType || "").includes("image/webp") ||
            /\.webp(\?|#|$)/i.test(urlCandidate) ||
            this.isWebpBytes(fetched.bytes);
          const isAvif =
            (fetched.contentType || "").includes("image/avif") ||
            /\.avif(\?|#|$)/i.test(urlCandidate) ||
            this.isAvifBytes(fetched.bytes);
          imageBytes = isWebp
            ? await this.transcodeWebpWithRetry(
                this.uint8ToBase64(fetched.bytes),
                2
              )
            : isAvif
            ? await requestImageTranscode(
                this.uint8ToBase64(fetched.bytes),
                "image/avif"
              )
            : fetched.bytes;
        }
      }

      if (!imageBytes) {
        throw new Error(
          urlCandidate
            ? `No usable image bytes for ${imageHash} (base64 invalid and URL fetch skipped/failed)`
            : `No usable image bytes for ${imageHash} (missing/invalid base64 and no URL)`
        );
      }
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
    const clean = ValidationUtils.normalizeBase64Payload(base64);

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

    const decoded = figma.base64Decode(clean);
    // If the payload is AVIF (even if mislabeled), transcode before createImage.
    if (this.isAvifBytes(decoded)) {
      return requestImageTranscode(clean, "image/avif");
    }
    return decoded;
  }

  private async fetchImageBytesRobust(
    url: string,
    timeoutMs = 20000
  ): Promise<{ bytes: Uint8Array; contentType?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept:
            "image/webp,image/png,image/jpeg,image/apng,image/svg+xml,*/*;q=0.8",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || undefined;
      const buffer = await response.arrayBuffer();
      return { bytes: new Uint8Array(buffer), contentType };
    } finally {
      clearTimeout(timeout);
    }
  }

  private isWebpBytes(bytes: Uint8Array): boolean {
    // "RIFF"...."WEBP"
    if (!bytes || bytes.length < 12) return false;
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  private isAvifBytes(bytes: Uint8Array): boolean {
    // ISO BMFF: size(4) + 'ftyp'(4) + majorBrand(4)
    if (!bytes || bytes.length < 16) return false;
    const isFtyp =
      bytes[4] === 0x66 && // f
      bytes[5] === 0x74 && // t
      bytes[6] === 0x79 && // y
      bytes[7] === 0x70; // p
    if (!isFtyp) return false;
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return brand === "avif" || brand === "avis";
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    const CHUNK_SIZE = 0x8000;
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      chunks.push(
        String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + CHUNK_SIZE))
        )
      );
    }
    if (typeof btoa === "function") {
      return btoa(chunks.join(""));
    }
    throw new Error("btoa not available for base64 encoding");
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
    this.postProgress("Verifying positions (sampling)...", 90);

    // OPTIMIZED SAMPLING APPROACH v2.0
    // Instead of checking ALL elements (which causes 98% stall), use intelligent sampling
    // to get representative feedback without performance impact

    const allElements = Array.from(this.verificationData);
    const totalElements = allElements.length;

    // Determine sample size based on total elements (max 100 elements for performance)
    const maxSampleSize = Math.min(
      100,
      Math.max(10, Math.floor(totalElements * 0.05))
    ); // 5% sample, capped at 100

    console.log(
      `📊 [VERIFICATION] Sampling ${maxSampleSize} elements from ${totalElements} total for position verification`
    );

    let samplesToCheck: typeof allElements = [];

    if (totalElements <= maxSampleSize) {
      // Check all if small dataset
      samplesToCheck = allElements;
    } else {
      // INTELLIGENT SAMPLING: Mix of different element types for representative results
      const stratifiedSample = this.createStratifiedSample(
        allElements,
        maxSampleSize
      );
      samplesToCheck = stratifiedSample;
    }

    const results: PositionVerificationResult[] = [];
    const deviations: number[] = [];

    for (const { elementId, originalData, figmaNode } of samplesToCheck) {
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

      // Log problematic elements immediately for debugging
      if (!withinTolerance) {
        console.warn(
          `⚠️ [POSITION] Element "${elementId}" position deviation: ${deviation.toFixed(
            1
          )}px (expected: ${expected.x}, ${expected.y} | actual: ${actual.x}, ${
            actual.y
          })`
        );
      }
    }

    results.sort((a, b) => b.deviation - a.deviation);

    const withinTolerance = results.filter((r) => r.withinTolerance).length;
    const outsideTolerance = results.length - withinTolerance;

    // Calculate confidence interval for the sample
    const sampleAccuracy = withinTolerance / results.length;
    const estimatedTotalAccurate = Math.round(sampleAccuracy * totalElements);

    console.log(
      `📊 [VERIFICATION] Sample accuracy: ${(sampleAccuracy * 100).toFixed(
        1
      )}% (${withinTolerance}/${
        results.length
      }) | Estimated total accurate: ${estimatedTotalAccurate}/${totalElements}`
    );

    return {
      totalElements: this.createdNodes.size,
      successfulElements: this.createdNodes.size - this.failedNodes.length,
      failedElements: this.failedNodes.length,
      positionsVerified: results.length, // Sample size, not total
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
      // Add sampling metadata
      samplingUsed: true,
      sampleSize: results.length,
      estimatedAccuracy: sampleAccuracy,
    };
  }

  /**
   * Creates a stratified sample that represents different types of elements
   * for more accurate position verification without checking every element
   */
  private createStratifiedSample(elements: any[], sampleSize: number): any[] {
    // Categorize elements by type for stratified sampling
    const textElements = elements.filter((e) => e.originalData.type === "TEXT");
    const imageElements = elements.filter(
      (e) => e.originalData.type === "IMAGE"
    );
    const frameElements = elements.filter(
      (e) => e.originalData.type === "FRAME"
    );
    const otherElements = elements.filter(
      (e) => !["TEXT", "IMAGE", "FRAME"].includes(e.originalData.type)
    );

    const strata = [
      { name: "TEXT", elements: textElements },
      { name: "IMAGE", elements: imageElements },
      { name: "FRAME", elements: frameElements },
      { name: "OTHER", elements: otherElements },
    ];

    let sample: any[] = [];
    const remainingSize = sampleSize;

    // Proportional allocation with minimum representation for each type
    for (const stratum of strata) {
      if (stratum.elements.length === 0) continue;

      // Calculate stratum sample size (proportional + minimum 1 if exists)
      const proportion = stratum.elements.length / elements.length;
      let stratumSample = Math.max(1, Math.floor(proportion * remainingSize));
      stratumSample = Math.min(stratumSample, stratum.elements.length);

      // Random sample within stratum
      const shuffled = stratum.elements.sort(() => 0.5 - Math.random());
      sample = sample.concat(shuffled.slice(0, stratumSample));
    }

    // If we're under the target, fill with random elements
    if (sample.length < sampleSize) {
      const remaining = elements.filter((e) => !sample.includes(e));
      const additional = remaining
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize - sample.length);
      sample = sample.concat(additional);
    }

    console.log(
      `📊 [SAMPLING] Created stratified sample: ${
        sample.length
      } elements (Text: ${
        sample.filter((e) => e.originalData.type === "TEXT").length
      }, Images: ${
        sample.filter((e) => e.originalData.type === "IMAGE").length
      }, Frames: ${
        sample.filter((e) => e.originalData.type === "FRAME").length
      }, Other: ${
        sample.filter(
          (e) => !["TEXT", "IMAGE", "FRAME"].includes(e.originalData.type)
        ).length
      })`
    );

    return sample.slice(0, sampleSize);
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

  /**
   * PHASE 2: Pre-process schema to normalize values upfront
   */
  private preprocessSchema(node: any): void {
    if (!node) return;

    // Normalize numeric values
    if (node.layout) {
      node.layout.x = ValidationUtils.safeParseFloat(node.layout.x, 0);
      node.layout.y = ValidationUtils.safeParseFloat(node.layout.y, 0);
      node.layout.width = ValidationUtils.safeParseFloat(node.layout.width, 0);
      node.layout.height = ValidationUtils.safeParseFloat(
        node.layout.height,
        0
      );
    }

    // Normalize opacity
    if (node.opacity !== undefined) {
      node.opacity = Math.max(
        0,
        Math.min(1, ValidationUtils.safeParseFloat(node.opacity, 1))
      );
    }

    // Normalize zIndex
    if (node.zIndex !== undefined) {
      node.zIndex = ValidationUtils.safeParseFloat(node.zIndex, 0);
    }

    // Process children recursively
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any) => this.preprocessSchema(child));
    }
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

  private normalizeScreenshotToDataUrl(screenshot: unknown): string | null {
    if (typeof screenshot !== "string") return null;
    const trimmed = screenshot.trim();
    if (!trimmed) return null;
    if (trimmed.includes(",")) return trimmed;

    const cleanBase64 = trimmed.replace(/\s/g, "");
    if (!ValidationUtils.validateBase64(cleanBase64)) return null;

    // Assume PNG when only base64 is provided.
    return `data:image/png;base64,${cleanBase64}`;
  }

  /**
   * PHASE 1 OPTIMIZATION: Comprehensive schema analysis in single pass
   */
  private analyzeSchema(root: any): {
    totalNodes: number;
    imageNodes: any[];
    imageHashes: Set<string>;
    requiredFonts: Set<string>;
    nodeTypes: Map<string, number>;
    depth: number;
  } {
    // 🚨 EMERGENCY: Log what analyzeSchema receives
    console.log("🔬 [analyzeSchema] Called with root:", {
      exists: !!root,
      type: typeof root,
      isNull: root === null,
      isUndefined: root === undefined,
      constructor: root?.constructor?.name,
      keys: root ? Object.keys(root).slice(0, 20) : [],
      hasChildren: !!root?.children,
      childrenIsArray: Array.isArray(root?.children),
      childrenLength: root?.children?.length,
    });

    let totalNodes = 0;
    const imageNodes: any[] = [];
    const imageHashes = new Set<string>();
    const requiredFonts = new Set<string>();
    const nodeTypes = new Map<string, number>();
    let maxDepth = 0;

    const traverse = (node: any, depth: number = 0) => {
      if (!node) {
        console.log(`🔬 [analyzeSchema traverse] Skipping null/undefined node at depth ${depth}`);
        return;
      }

      totalNodes++;

      // 🚨 EMERGENCY: Log first few nodes
      if (totalNodes <= 3) {
        console.log(`🔬 [analyzeSchema traverse] Node ${totalNodes} at depth ${depth}:`, {
          type: node.type,
          htmlTag: node.htmlTag,
          id: node.id,
          hasChildren: !!node.children,
          childrenLength: node.children?.length,
        });
      }

      maxDepth = Math.max(maxDepth, depth);

      // Track node types
      const type = node.type || "UNKNOWN";
      nodeTypes.set(type, (nodeTypes.get(type) || 0) + 1);

      // Collect image hashes
      if (node.type === "IMAGE" || node.imageHash) {
        imageNodes.push(node);
        if (node.imageHash) {
          imageHashes.add(node.imageHash);
        }
      }

      // Check for images in fills array
      if (Array.isArray(node.fills)) {
        const imageFills = node.fills.filter(
          (fill: any) => fill?.type === "IMAGE" && fill?.imageHash
        );
        imageFills.forEach((fill: any) => {
          imageHashes.add(fill.imageHash);
          if (!imageNodes.find((n: any) => n.imageHash === fill.imageHash)) {
            imageNodes.push({ imageHash: fill.imageHash, source: "fill" });
          }
        });
      }

      // Check for images in backgrounds array
      if (Array.isArray(node.backgrounds)) {
        node.backgrounds.forEach((bg: any) => {
          const bgHash = bg?.imageHash || bg?.fill?.imageHash;
          if (bgHash) {
            imageHashes.add(bgHash);
            if (!imageNodes.find((n: any) => n.imageHash === bgHash)) {
              imageNodes.push({ imageHash: bgHash, source: "background" });
            }
          }
        });
      }

      // Collect required fonts from text nodes
      if (node.type === "TEXT") {
        if (node.textStyle?.fontFamily) {
          const family = node.textStyle.fontFamily;
          const weight = node.textStyle.fontWeight || 400;
          const style = this.weightToStyle(weight);
          requiredFonts.add(`${family}|${style}`);
        } else if (node.fontFamily) {
          const family = node.fontFamily;
          const weight = node.fontWeight || 400;
          const style = this.weightToStyle(weight);
          requiredFonts.add(`${family}|${style}`);
        }
      }

      if (Array.isArray(node.children)) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      } else if (node.children !== undefined && node.children !== null) {
        console.log(`⚠️ [analyzeSchema traverse] Node has non-array children at depth ${depth}:`, {
          type: node.type,
          childrenType: typeof node.children,
          childrenValue: node.children,
        });
      }
    };

    traverse(root, 0);

    // 🚨 EMERGENCY: Log final analysis results
    console.log("🔬 [analyzeSchema] Traversal complete. Final results:", {
      totalNodes,
      imageNodesCount: imageNodes.length,
      imageHashesCount: imageHashes.size,
      requiredFontsCount: requiredFonts.size,
      nodeTypesCount: nodeTypes.size,
      maxDepth,
      nodeTypeBreakdown: Array.from(nodeTypes.entries()),
    });

    return {
      totalNodes,
      imageNodes,
      imageHashes,
      requiredFonts,
      nodeTypes,
      depth: maxDepth,
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   */
  private traverseAndCollect(root: any): {
    totalNodes: number;
    imageNodes: any[];
  } {
    const analysis = this.analyzeSchema(root);
    return { totalNodes: analysis.totalNodes, imageNodes: analysis.imageNodes };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * CRITICAL: Validate and sanitize coordinates to prevent positioning failures
   */
  private validateCoordinate(
    value: any,
    axis: "x" | "y",
    nodeId: string
  ): number {
    if (typeof value !== "number" || !isFinite(value)) {
      console.warn(
        `⚠️ Invalid ${axis} coordinate for node ${nodeId}: ${value}, using 0`
      );
      return 0;
    }

    // Clamp to reasonable bounds to prevent Figma crashes
    const MIN_COORD = -100000;
    const MAX_COORD = 100000;

    if (value < MIN_COORD || value > MAX_COORD) {
      console.warn(
        `⚠️ ${axis} coordinate ${value} outside safe bounds for node ${nodeId}, clamping`
      );
      return Math.max(MIN_COORD, Math.min(MAX_COORD, value));
    }

    return value;
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

  /**
   * Log comprehensive import completion report with schema statistics
   */
  private logImportCompletionReport(report: any): void {
    const stats = this.calculateImportStatistics();
    const totalTime = Date.now() - (this as any).importStartTime;

    console.log(
      "\n🎯 ═══════════════════════════════════════════════════════════"
    );
    console.log("🚀 FIGMA IMPORT COMPLETION REPORT");
    console.log("═══════════════════════════════════════════════════════════");

    console.log(`📄 SOURCE: ${this.data?.metadata?.url || "Unknown"}`);
    console.log(
      `⏱️  IMPORT TIME: ${totalTime || report.processingTime || "Unknown"}ms`
    );
    console.log(
      `📊 SUCCESS RATE: ${report.successfulNodes || 0}/${
        report.totalNodes || 0
      } nodes (${(
        ((report.successfulNodes || 0) / Math.max(1, report.totalNodes || 1)) *
        100
      ).toFixed(1)}%)`
    );

    if (stats) {
      console.log("\n🎯 PIXEL-PERFECT RESULTS:");
      console.log(
        `   Nodes with Transforms Applied: ${stats.transformsApplied}`
      );
      console.log(`   Matrix Transforms: ${stats.matrixTransforms}`);
      console.log(`   Auto Layout Frames: ${stats.autoLayoutFrames}`);
      console.log(`   Component Instances: ${stats.componentInstances || 0}`);

      console.log("\n📐 FIGMA STRUCTURE:");
      console.log(`   Total Figma Nodes: ${report.successfulNodes || 0}`);
      console.log(`   Frames Created: ${stats.framesCreated || 0}`);
      console.log(`   Text Nodes: ${stats.textNodes || 0}`);
      console.log(`   Vector Graphics: ${stats.vectorNodes || 0}`);
    }

    if (report.errors && report.errors.length > 0) {
      console.log("\n⚠️  ISSUES:");
      console.log(`   Failed Nodes: ${report.errors.length}`);
      report.errors.slice(0, 3).forEach((error: any, i: number) => {
        console.log(
          `   ${i + 1}. ${error.type || "Error"}: ${
            error.message || "Unknown error"
          }`
        );
      });
    }

    if (report.warnings && report.warnings.length > 0) {
      console.log("\n💡 OPTIMIZATION OPPORTUNITIES:");
      report.warnings.slice(0, 3).forEach((warning: any) => {
        console.log(`   - ${warning}`);
      });
    }

    console.log("═══════════════════════════════════════════════════════════");
    console.log(`🎉 FIGMA IMPORT COMPLETE: Ready for design iteration!`);
    console.log(
      "═══════════════════════════════════════════════════════════\n"
    );
  }

  /**
   * Calculate import-specific statistics
   */
  private calculateImportStatistics(): any {
    let stats = {
      transformsApplied: 0,
      matrixTransforms: 0,
      autoLayoutFrames: 0,
      componentInstances: 0,
      framesCreated: 0,
      textNodes: 0,
      vectorNodes: 0,
    };

    // Walk through created Figma nodes to gather statistics
    try {
      const mainFrame = this.mainFrame;
      if (mainFrame) {
        stats = this.analyzeNodeStats(mainFrame, stats);
      }
    } catch (error) {
      console.warn("Could not calculate import statistics:", error);
    }

    return stats;
  }

  /**
   * Recursively analyze Figma node statistics
   */
  private analyzeNodeStats(node: SceneNode, stats: any): any {
    // Count node types
    switch (node.type) {
      case "FRAME":
      case "GROUP":
        stats.framesCreated++;
        if ("layoutMode" in node && node.layoutMode !== "NONE") {
          stats.autoLayoutFrames++;
        }
        break;
      case "TEXT":
        stats.textNodes++;
        break;
      case "VECTOR":
      case "STAR":
      case "POLYGON":
      case "ELLIPSE":
      case "RECTANGLE":
        stats.vectorNodes++;
        break;
      case "INSTANCE":
        stats.componentInstances++;
        break;
    }

    // Count transforms
    if (node.getPluginData("absoluteTransformApplied")) {
      stats.transformsApplied++;
    }
    if (node.getPluginData("transformMatrix")) {
      stats.matrixTransforms++;
    }

    // Recurse to children
    if ("children" in node && node.children) {
      node.children.forEach((child: any) => {
        stats = this.analyzeNodeStats(child, stats);
      });
    }

    return stats;
  }

  /**
   * Export diagnostic report for pixel-perfect fidelity debugging
   * Generates comprehensive JSON report with all import tracking data
   */
  private exportDiagnosticReport(): void {
    try {
      const diagnosticExport = this.diagnosticCollector.export();

      // Log summary to console
      console.log("\n📊 ═══════════════════════════════════════════════════════════");
      console.log("🔬 DIAGNOSTIC EXPORT SUMMARY");
      console.log("═══════════════════════════════════════════════════════════");
      console.log(`Import ID: ${diagnosticExport.importId}`);
      console.log(`Timestamp: ${diagnosticExport.timestamp}`);
      console.log(`Source URL: ${diagnosticExport.sourceUrl}`);
      console.log("\n📈 NODE STATISTICS:");
      console.log(`   Total Nodes: ${diagnosticExport.summary.totalNodes}`);
      console.log(`   Successful Nodes: ${diagnosticExport.summary.successfulNodes}`);
      console.log(`   Failed Nodes: ${diagnosticExport.summary.failedNodes.length}`);
      console.log(`   White Blank Frames: ${diagnosticExport.summary.whiteBlankFrames.length}`);
      console.log(`   Rasterized Nodes: ${diagnosticExport.summary.rasterizedNodes}`);
      console.log(`   Auto Layout Nodes: ${diagnosticExport.summary.autoLayoutNodes}`);
      console.log(`   Transformed Nodes: ${diagnosticExport.summary.transformedNodes}`);
      console.log(`   Early Returns Detected: ${diagnosticExport.summary.earlyReturns.length}`);
      console.log(`   Critical Failures: ${diagnosticExport.summary.criticalFailures}`);

      if (diagnosticExport.performanceMetrics) {
        console.log("\n⏱️  PERFORMANCE:");
        console.log(`   Total Import Duration: ${diagnosticExport.performanceMetrics.totalImportDurationMs}ms`);
        console.log(`   Average Node Build Time: ${diagnosticExport.performanceMetrics.averageNodeBuildTimeMs.toFixed(2)}ms`);
        console.log(`   Rasterization Time: ${diagnosticExport.performanceMetrics.rasterizationTimeMs}ms`);
      }

      console.log("\n💾 EXPORT:");
      console.log(`   Diagnostic data collected for ${diagnosticExport.nodeDetails.length} nodes`);
      console.log(`   Use figma.ui.postMessage to export full JSON`);
      console.log("═══════════════════════════════════════════════════════════\n");

      // Post diagnostic data to UI for download
      figma.ui.postMessage({
        type: "diagnostic-export",
        data: diagnosticExport,
      });

      // Also log the full JSON to console (can be large, but useful for debugging)
      console.log("📋 Full diagnostic data (copy from console):");
      console.log(JSON.stringify(diagnosticExport, null, 2));

    } catch (error) {
      console.error("❌ Failed to export diagnostic report:", error);
    }
  }
}
