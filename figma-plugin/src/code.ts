import {
  handleImageTranscodeResult,
  handleWebpTranscodeResult,
} from "./ui-bridge";

// Import the static UI
import uiHtml from "../ui/index-static.html";
import {
  EnhancedFigmaImporter,
  EnhancedImportOptions,
} from "./enhanced-figma-importer";
import { prepareLayoutSchema } from "./layout-solver";
import { upgradeSelectionToAutoLayout } from "./layout-upgrader";
import { WTFParser } from "./wtf-parser";
import { diagnostics } from "./node-builder";
import { normalizeSchemaTreeForFigma } from "./tree-normalizer";
import pako from "pako";

// Type definitions for API responses
interface HandoffJobResponse {
  job?: {
    id: string;
    payload: any;
  };
  telemetry?: any;
}

interface HandoffHealthResponse {
  telemetry?: any;
  queueLength: number;
  ok: boolean;
}

interface HandoffHistoryItem {
  id: string;
  timestamp?: number;
  deliveredAt?: number;
  permalink?: string;
  hasScreenshot?: boolean;
  size?: number;
}

interface MissingFontReport {
  family: string;
  styles: string[];
}

figma.showUI(uiHtml, { width: 400, height: 600 });

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message || String(error);
    
    // Improve common network error messages
    if (msg.toLowerCase().includes('failed to fetch')) {
      return 'Server connection failed - ensure handoff server is running on localhost:4411';
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('connection refused')) {
      return 'Connection refused - handoff server not running';
    }
    if (msg.includes('ENOTFOUND') || msg.includes('name resolution failed')) {
      return 'Host not found - check server configuration';
    }
    if (msg.includes('timeout')) {
      return 'Connection timeout - server may be overloaded';
    }
    
    return msg;
  }
  if (typeof error === "string") {
    // Handle string error messages
    if (error.toLowerCase().includes('failed to fetch')) {
      return 'Server connection failed - ensure handoff server is running on localhost:4411';
    }
    return error;
  }
  if (error === null || error === undefined) return String(error);
  if (typeof error === "number" || typeof error === "boolean")
    return String(error);
  if (typeof error === "object") {
    const maybe = error as any;
    if (typeof maybe.message === "string" && maybe.message.trim()) {
      return formatUnknownError(maybe.message);
    }
    if (typeof maybe.error === "string" && maybe.error.trim()) {
      return formatUnknownError(maybe.error);
    }
    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}

const defaultEnhancedOptions: Partial<EnhancedImportOptions> = {
  createMainFrame: true,
  createScreenshotOverlay: false,
  enableBatchProcessing: true,
  verifyPositions: true,
  maxBatchSize: 10,
  coordinateTolerance: 2,
  enableDebugMode: false,
  retryFailedImages: true,
  enableProgressiveLoading: false,
  usePixelPerfectPositioning: true,
  showValidationMarkers: false,
  applyAutoLayout: true,
  createStyles: true,
};

function sanitizeLargeVibrantPaletteFills(schema: any): number {
  const palette = schema?.colorPalette?.palette;
  const vibrant = palette?.Vibrant || palette?.vibrant;
  const vibrantColor = vibrant?.figma;
  if (!vibrantColor) return 0;

  const vp = schema?.metadata?.viewport || {};
  const viewportWidth = vp.width || schema?.metadata?.viewportWidth || 1440;
  const viewportHeight = vp.height || schema?.metadata?.viewportHeight || 900;
  const viewportArea = Math.max(1, viewportWidth * viewportHeight);
  const maxArea = viewportArea * 0.05; // must match schema guardrail threshold
  const eps = 1e-6;

  const nearlyEqual = (a: number, b: number) => Math.abs(a - b) <= eps;
  const isVibrantSolid = (fill: any) => {
    if (!fill || fill.type !== "SOLID" || !fill.color) return false;
    const c = fill.color;
    return (
      nearlyEqual(c.r, vibrantColor.r) &&
      nearlyEqual(c.g, vibrantColor.g) &&
      nearlyEqual(c.b, vibrantColor.b)
    );
  };

  let removed = 0;
  const walk = (node: any) => {
    if (!node) return;
    const w = node.layout?.width || 0;
    const h = node.layout?.height || 0;
    const area = w * h;

    if (area > maxArea && Array.isArray(node.fills) && node.fills.length > 0) {
      const before = node.fills.length;
      node.fills = node.fills.filter((f: any) => !isVibrantSolid(f));
      removed += before - node.fills.length;
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  };

  walk(schema?.root || schema?.tree);
  return removed;
}

let isImporting = false;

// Handoff status tracking
type HandoffStatus = "waiting" | "job-ready" | "error" | "disconnected";
interface HandoffTelemetry {
  queueLength?: number;
  lastExtensionPingAt?: number | null;
  lastExtensionTransferAt?: number | null;
  lastPluginPollAt?: number | null;
  lastPluginDeliveryAt?: number | null;
  lastQueuedJobId?: string | null;
  lastDeliveredJobId?: string | null;
}
let lastHandoffStatus: HandoffStatus | null = null;
let lastTelemetry: HandoffTelemetry | null = null;
let chromeConnectionState: "connected" | "disconnected" = "disconnected";
let serverConnectionState: "connected" | "disconnected" = "disconnected";
// Capture service endpoints - configured for cloud deployment
// Handoff server configuration
const HANDOFF_API_KEY =
  ((globalThis as any).__HANDOFF_API_KEY as string | undefined) || "";

const HANDOFF_BASES = [
  (globalThis as any).__HANDOFF_SERVER_URL ?? "http://127.0.0.1:4411",
  "http://localhost:4411",
  // Legacy ports (kept for backward compatibility) 
  "http://127.0.0.1:5511",
  "http://localhost:5511",
];
const HANDOFF_POLL_INTERVAL = 10000;
let handoffBaseIndex = 0;
let handoffPollTimer: ReturnType<typeof setInterval> | null = null;
let handoffPollInFlight = false;
let handoffCooldownUntil = 0; // pause polling after errors (e.g., 429)
let handoffBackoffMs = 0; // exponential backoff for rate limits
let availableFontsCache: {
  families: Set<string>;
  variants: Set<string>;
} | null = null;

figma.on("run", (runEvent) => {
  if (runEvent.command === "auto-import") {
    figma.ui.postMessage({ type: "auto-import-ready" });
  }
  startHandoffPolling();
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "handoff-telemetry") {
    handleTelemetryFromUi(msg.telemetry as HandoffTelemetry | null);
    return;
  }
  if (msg.type === "ui-ready") {
    figma.ui.postMessage({
      type:
        chromeConnectionState === "connected"
          ? "chrome-extension-connected"
          : "chrome-extension-disconnected",
    });
    figma.ui.postMessage({
      type:
        serverConnectionState === "connected"
          ? "server-connected"
          : "server-disconnected",
    });
    figma.ui.postMessage({
      type: "handoff-status",
      status: lastHandoffStatus || "waiting",
    });
    figma.ui.postMessage({
      type: "handoff-telemetry",
      telemetry: lastTelemetry,
    });
    return;
  }
  if (msg.type === "fetch-history") {
    await sendHandoffHistory();
    return;
  }
  if (msg.type === "import-history-job") {
    await importFromHistory(msg.jobId as string);
    return;
  }
  if (msg.type === "webp-transcoded") {
    handleWebpTranscodeResult(msg);
    return;
  }
  if (msg.type === "image-transcoded") {
    handleImageTranscodeResult(msg);
    return;
  }


  if (
    msg.type === "import" ||
    msg.type === "auto-import" ||
    msg.type === "live-import"
  ) {
    await handleImportRequest(msg.data, msg.options, msg.type);
    return;
  }

  if (msg.type === "import-wtf") {
    await handleWTFImport(msg.fileData, msg.options);
    return;
  }
  if (msg.type === "import-enhanced") {
    await handleEnhancedImportV2(msg.data, msg.options);
    return;
  }
  if (msg.type === "parse-wtf") {
    await handleWTFParsing(msg.fileData);
    return;
  }

  if (msg.type === "fix-legacy-screenshot-layer") {
    const { removed, scannedScopes } = removeLegacyScreenshotBaseLayers(
      msg.scope === "page" ? "page" : "selection"
    );
    figma.ui.postMessage({
      type: "legacy-screenshot-fix-result",
      removed,
      scannedScopes,
    });
    if (removed > 0) {
      figma.notify(`✅ Removed ${removed} legacy Screenshot Base Layer(s)`, {
        timeout: 3000,
      });
    } else {
      figma.notify("No legacy Screenshot Base Layer found in scope", {
        timeout: 2500,
      });
    }
    return;
  }

  if (msg.type === "upgrade-auto-layout") {
    upgradeSelectionToAutoLayout();
    return;
  }
};

function removeLegacyScreenshotBaseLayers(scope: "selection" | "page"): {
  removed: number;
  scannedScopes: number;
} {
  const roots =
    scope === "selection" && figma.currentPage.selection.length > 0
      ? figma.currentPage.selection
      : [figma.currentPage];

  let removed = 0;
  let scannedScopes = 0;

  for (const root of roots) {
    scannedScopes++;
    // If the root itself is the legacy layer.
    if (root.type === "RECTANGLE" && root.name === "Screenshot Base Layer") {
      root.remove();
      removed++;
      continue;
    }

    if ("findAll" in root) {
      const matches = (root as any).findAll(
        (n: SceneNode) =>
          n.type === "RECTANGLE" && n.name === "Screenshot Base Layer"
      ) as RectangleNode[];

      for (const node of matches) {
        node.remove();
        removed++;
      }
    }
  }

  return { removed, scannedScopes };
}

async function handleImportRequest(
  data: any,
  options: Partial<EnhancedImportOptions> | undefined,
  trigger: "import" | "auto-import" | "live-import"
): Promise<void> {
  console.log("🔵 handleImportRequest called", {
    hasData: !!data,
    dataType: typeof data,
    trigger,
    isImporting,
  });

  if (!data) {
    console.error("❌ No data received");
    figma.ui.postMessage({
      type: "error",
      message: "No schema payload received.",
    });
    return;
  }

  if (isImporting) {
    console.warn("⚠️ Import already in progress");
    figma.ui.postMessage({
      type: "import-busy",
      message: "An import is already running. Please wait for it to finish.",
    });
    return;
  }

  isImporting = true;
  console.log("✅ Import started");

  // Unwrap rawSchemaJson if present (chunked transfer format from Chrome extension)
  let schema = data;
  if (data.rawSchemaJson && typeof data.rawSchemaJson === "string") {
    console.log("🔓 Unwrapping rawSchemaJson string from chunked transfer...");
    try {
      schema = JSON.parse(data.rawSchemaJson);
      console.log("✅ Successfully parsed rawSchemaJson");
    } catch (parseError) {
      const errorMsg =
        parseError instanceof Error ? parseError.message : "Parse failed";
      console.error("❌ Failed to parse rawSchemaJson:", errorMsg);
      figma.ui.postMessage({
        type: "error",
        message: `Failed to parse schema data: ${errorMsg}`,
      });
      isImporting = false;
      return;
    }
  }

  // Unwrap multi-viewport format if present (checking for captures array is sufficient)
  if (Array.isArray(schema.captures) && schema.captures.length > 0) {
    console.log("🔓 Unwrapping multi-viewport capture format...");
    console.log(
      `[DEBUG] Found ${schema.captures.length} captures in multiViewport format`
    );

    // Debug each capture structure
    schema.captures.forEach((cap, i) => {
      console.log(`[DEBUG] Capture ${i}:`, {
        viewport: cap.viewport || cap.name || "unnamed",
        hasData: !!cap.data,
        hasRoot: !!cap.data?.root,
        hasTree: !!cap.data?.tree,
        hasSchema: !!cap.data?.schema,
        hasRawJson: !!cap.data?.rawSchemaJson,
        directRoot: !!cap.root,
        directTree: !!cap.tree,
        directSchema: !!cap.schema,
        rootChildCount:
          cap.data?.root?.children?.length || cap.root?.children?.length || cap.data?.tree?.children?.length || cap.tree?.children?.length || 0,
      });
    });

    let picked: any = null;
    for (const cap of schema.captures) {
      if (!cap) continue;
      // Try common shapes
      const candidate = (cap.data?.root || cap.data?.tree)
        ? cap.data
        : (cap.data?.schema?.root || cap.data?.schema?.tree)
        ? cap.data.schema
        : cap.data?.rawSchemaJson
        ? JSON.parse(cap.data.rawSchemaJson)
        : cap.data || cap.schema;
      if (candidate?.root || candidate?.tree) {
        picked = candidate;
        console.log(
          `✅ Selected viewport: ${cap.viewport || cap.name || "unnamed"}`,
          `Root children: ${(candidate.root || candidate.tree)?.children?.length || 0}`
        );
        break;
      }
      if (cap?.rawSchemaJson && !picked) {
        try {
          const parsed = JSON.parse(cap.rawSchemaJson);
          if (parsed?.root || parsed?.tree) {
            picked = parsed;
            console.log(
              `✅ Parsed rawSchemaJson for viewport: ${
                cap.viewport || cap.name || "unnamed"
              }`
            );
            break;
          }
        } catch {
          // ignore parse error and continue
        }
      }
    }
    if (picked) {
      schema = picked;
      console.log("[DEBUG] Schema after unwrapping:", {
        hasRoot: !!schema.root,
        hasTree: !!schema.tree,
        hasMetadata: !!schema.metadata,
        hasAssets: !!schema.assets,
        rootType: schema.root?.type,
        rootChildren: schema.root?.children?.length || 0,
        rootNodeId: schema.root?.id,
      });
    } else {
      console.error(
        "❌ Multi-viewport format detected but no valid capture data found"
      );
      figma.ui.postMessage({
        type: "error",
        message: "Multi-viewport format is invalid - no data in captures array",
      });
      isImporting = false;
      return;
    }
  }

  // Apply migration if legacy tree exists
  if (schema.tree && !schema.root) {
    console.log("🔄 [MIGRATION] Converting legacy 'tree' to canonical 'root'");
    schema.root = schema.tree;
    delete schema.tree;
  }

  // Fallback: unwrap rawSchemaJson or nested schema if root missing
  if (!schema.root) {
    if (schema.rawSchemaJson && typeof schema.rawSchemaJson === "string") {
      try {
        const parsed = JSON.parse(schema.rawSchemaJson);
        if (parsed?.root) {
          schema = parsed;
        } else if (parsed?.tree) {
          console.log("🔄 [MIGRATION] Converting nested legacy 'tree' to canonical 'root'");
          parsed.root = parsed.tree;
          delete parsed.tree;
          schema = parsed;
        }
      } catch {
        // ignore parse error
      }
    } else if (schema.schema?.root) {
      schema = schema.schema;
    } else if (schema.schema?.tree) {
      console.log("🔄 [MIGRATION] Converting nested legacy 'tree' to canonical 'root'");
      schema.schema.root = schema.schema.tree;
      delete schema.schema.tree;
      schema = schema.schema;
    }
  }

  // Final validation: ensure we have root data
  if (!schema.root) {
    // Deep search for any nested object that contains a root or tree
    const visited = new Set<any>();
    const findSchemaWithRoot = (obj: any): any | null => {
      if (!obj || typeof obj !== "object") return null;
      if (visited.has(obj)) return null;
      visited.add(obj);
      if ((obj as any).root || (obj as any).tree) return obj;
      for (const value of Object.values(obj)) {
        if (value && typeof value === "object") {
          const found = findSchemaWithRoot(value);
          if (found) return found;
        }
      }
      return null;
    };
    const nested = findSchemaWithRoot(schema);
    if (nested) {
      console.log("✅ Found nested schema with root/tree, using it");
      schema = nested;
    }
  }

  // Accept schemas from Extension capture engine
  const captureEngine =
    schema.meta?.captureEngine || schema.metadata?.captureEngine;
  if (captureEngine === "extension") {
    console.log("✅ Extension capture engine confirmed");
  } else if (captureEngine) {
    console.log(
      `ℹ️ Unknown capture engine: ${captureEngine}, proceeding anyway`
    );
  }

  if (!schema.root) {
    console.error("❌ No root data available for import. Data structure:", {
      hasData: !!schema,
      dataKeys: schema && typeof schema === "object" ? Object.keys(schema) : [],
      dataType: typeof schema,
      dataStringified:
        typeof schema === "object"
          ? JSON.stringify(schema).substring(0, 500)
          : String(schema).substring(0, 500),
    });
    figma.ui.postMessage({
      type: "error",
      message:
        "No root data available for import. The schema may be in an unsupported format.",
    });
    isImporting = false;
    return;
  }

  const resolvedOptions: Partial<EnhancedImportOptions> = {
    ...defaultEnhancedOptions,
    ...(options || {}),
  };

  try {
    console.log("🚀 Starting import with schema:", {
      version: schema.version,
      rootNodes: schema.root ? "present" : "missing",
      rootType: schema.root?.type,
      rootName: schema.root?.name,
      rootChildren: schema.root?.children?.length || 0,
      assets: schema.assets
        ? Object.keys(schema.assets.images || {}).length
        : 0,
      metadata: schema.metadata ? "present" : "missing",
      validation: schema.validation
        ? `${schema.validation.issuesCount} issues`
        : "missing",
    });

    // Report missing fonts before import
    try {
      const missingFonts = await findMissingFonts(schema);
      figma.ui.postMessage({ type: "font-warnings", fonts: missingFonts });
    } catch (e) {
      console.warn("Font warning detection failed", e);
    }

    figma.ui.postMessage({
      type: "progress",
      message: "Preparing Figma canvas...",
      percent: 5,
    });

    const treeNorm = normalizeSchemaTreeForFigma(schema);
    if (treeNorm.removedNodes > 0 || treeNorm.renamedNodes > 0) {
      console.log(
        "🧹 Normalized schema tree for professional nesting:",
        treeNorm
      );
    }

    if (resolvedOptions.applyAutoLayout !== false) {
      console.log("✅ Preparing layout schema (Auto Layout enabled)...");
      prepareLayoutSchema(schema);
      console.log("✅ Schema preparation complete");
    } else {
      console.log(
        "🧷 Pixel-perfect mode: skipping prepareLayoutSchema() (Auto Layout disabled)"
      );
    }

    // Guardrail: older jobs may contain AI-invented palette fills that can create
    // giant orange/yellow overlays; remove those fills from large nodes.
    const removedPaletteFills = sanitizeLargeVibrantPaletteFills(schema);
    if (removedPaletteFills > 0) {
      console.warn(
        `⚠️ Removed ${removedPaletteFills} large-node Vibrant palette fill(s) for pixel fidelity`
      );
    }

    // Use enhanced importer for better Figma compatibility
    console.log("✅ Creating enhanced Figma importer...");
    const enhancedOptions: Partial<EnhancedImportOptions> = {
      createMainFrame: resolvedOptions.createMainFrame,
      enableBatchProcessing: true,
      verifyPositions: resolvedOptions.usePixelPerfectPositioning,
      maxBatchSize: 10,
      coordinateTolerance: 2,
      enableDebugMode: false,
      retryFailedImages: true,
      enableProgressiveLoading: false,
      applyAutoLayout: resolvedOptions.applyAutoLayout,
    };


    // ENHANCED PRE-IMPORT VALIDATION - Added to debug blank white frames issue
    console.log("🔍 [PRE-IMPORT] Comprehensive schema validation before EnhancedFigmaImporter creation...");
    console.log("🔍 [PRE-IMPORT] Schema overview:", {
      schemaExists: !!schema,
      schemaType: typeof schema,
      schemaSize: JSON.stringify(schema).length,
      rootKeys: schema && typeof schema === 'object' ? Object.keys(schema) : []
    });

    if (schema && schema.root) {
      console.log("✅ [PRE-IMPORT] Root validation:", {
        rootExists: !!schema.root,
        rootType: typeof schema.root,
        rootId: schema.root.id,
        rootNodeType: schema.root.type,
        hasChildren: Array.isArray(schema.root.children),
        childrenCount: schema.root.children ? schema.root.children.length : 0,
        rootKeys: schema.root && typeof schema.root === 'object' ? Object.keys(schema.root) : []
      });

      if (schema.root.children && schema.root.children.length > 0) {
        const firstChild = schema.root.children[0];
        console.log("✅ [PRE-IMPORT] First child sample:", {
          childId: firstChild?.id,
          childType: firstChild?.type,
          childName: firstChild?.name,
          hasLayout: !!firstChild?.layout,
          hasStyles: !!firstChild?.styles
        });
      } else {
        console.warn("⚠️ [PRE-IMPORT] Root has no children - this will likely result in blank frames");
      }
    } else {
      console.error("❌ [PRE-IMPORT] CRITICAL: Schema has no tree - this WILL cause blank frames");
    }

    if (schema && schema.metadata) {
      console.log("✅ [PRE-IMPORT] Metadata validation:", {
        hasMetadata: !!schema.metadata,
        metadataKeys: schema.metadata && typeof schema.metadata === 'object' ? Object.keys(schema.metadata) : [],
        url: schema.metadata?.url,
        viewportWidth: schema.metadata?.viewportWidth,
        viewportHeight: schema.metadata?.viewportHeight
      });
    }

    if (schema && schema.assets) {
      console.log("✅ [PRE-IMPORT] Assets validation:", {
        hasAssets: !!schema.assets,
        assetKeys: schema.assets && typeof schema.assets === 'object' ? Object.keys(schema.assets) : [],
        imageCount: schema.assets?.images ? Object.keys(schema.assets.images).length : 0
      });
    }

    console.log("[DEBUG] About to create EnhancedFigmaImporter with schema:", {
      hasRoot: !!schema.root,
      rootType: schema.root?.type,
      rootChildren: schema.root?.children?.length || 0,
      hasAssets: !!schema.assets,
      hasMetadata: !!schema.metadata,
      schemaKeys: Object.keys(schema),
    });

    const importer = new EnhancedFigmaImporter(schema, enhancedOptions);
    console.log("✅ Starting enhanced import process...");
    const verificationReport = await importer.runImport();
    console.log("✅ Enhanced import process completed successfully");

    // Log verification results
    console.log("📐 Import verification:", {
      totalElements: verificationReport.totalElements,
      withinTolerance: verificationReport.positionsWithinTolerance,
      outsideTolerance: verificationReport.positionsOutsideTolerance,
      maxDeviation: verificationReport.maxDeviation.toFixed(2) + "px",
      averageDeviation: verificationReport.averageDeviation.toFixed(2) + "px",
    });

    const enhancedStats = {
      elements: verificationReport.totalElements,
      images: verificationReport.imagesProcessed,
      designTokens: schema.designTokens
        ? {
            colors: Object.keys(schema.designTokens.colors || {}).length,
            typography: Object.keys(schema.designTokens.typography || {})
              .length,
            spacing: Object.keys(schema.designTokens.spacing || {}).length,
            shadows: Object.keys(schema.designTokens.shadows || {}).length,
            borderRadius: Object.keys(schema.designTokens.borderRadius || {})
              .length,
          }
        : null,
      extraction: schema.metadata?.extractionSummary,
      verification: {
        totalElements: verificationReport.totalElements,
        positionsVerified: verificationReport.positionsVerified,
        positionsWithinTolerance: verificationReport.positionsWithinTolerance,
        positionsOutsideTolerance: verificationReport.positionsOutsideTolerance,
        maxDeviation: verificationReport.maxDeviation,
        averageDeviation: verificationReport.averageDeviation,
        accuracy: verificationReport.averageDeviation,
      },
      processingTime: verificationReport.totalProcessingTime,
    };

    figma.ui.postMessage({ type: "complete", stats: enhancedStats });

    // Send import diagnostics summary to UI
    const diagSummary = diagnostics.getSummary();
    figma.ui.postMessage({ type: "import-diagnostics", summary: diagSummary });
    console.log("📊 [FIGMA IMPORT] Diagnostics Summary:", diagSummary);

    // Show enhanced validation-aware notification
    if (verificationReport.positionsOutsideTolerance > 0) {
      figma.notify(
        `⚠️ Import complete with ${
          verificationReport.positionsOutsideTolerance
        } position mismatches > 2px (avg: ${verificationReport.averageDeviation.toFixed(
          1
        )}px)`,
        { timeout: 5000 }
      );
    } else if (verificationReport.averageDeviation > 1) {
      figma.notify(
        `✓ Import complete with good positioning accuracy (avg: ${verificationReport.averageDeviation.toFixed(
          1
        )}px)`,
        { timeout: 3000 }
      );
    } else {
      figma.notify("✅ Import complete with pixel-perfect accuracy!", {
        timeout: 3000,
      });
    }

    postHandoffStatus("waiting");
  } catch (error) {
    console.error("❌ IMPORT ERROR CAUGHT:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    console.error(
      "Error name:",
      error instanceof Error ? error.name : "Unknown"
    );
    const message =
      error instanceof Error
        ? error.message
        : "Import failed. See console for details.";
    console.error("Error message:", message);
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "code.ts:handleImportRequest:catch",
        message: "Top-level import error caught",
        data: {
          message,
          errName: error instanceof Error ? error.name : "unknown",
          errStack:
            error instanceof Error ? (error.stack || "").slice(0, 800) : "",
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H_IMPORT_ABORT",
      }),
    }).catch(() => {});
    // #endregion
    figma.ui.postMessage({ type: "error", message });
    figma.notify(`✗ Import failed: ${message}`, { error: true });
    postHandoffStatus("error", message);
  } finally {
    isImporting = false;
  }
}

async function handleWTFImport(
  fileData: ArrayBuffer,
  options: Partial<EnhancedImportOptions> | undefined
): Promise<void> {
  if (!fileData) {
    figma.ui.postMessage({
      type: "error",
      message: "No .wtf file data received.",
    });
    return;
  }

  if (isImporting) {
    figma.ui.postMessage({
      type: "import-busy",
      message: "An import is already running. Please wait for it to finish.",
    });
    return;
  }

  isImporting = true;

  try {
    console.log("📦 Parsing .wtf file...");
    figma.ui.postMessage({
      type: "progress",
      message: "Parsing .wtf archive...",
      percent: 5,
    });

    const parser = new WTFParser();
    const wtfData = await parser.parse(fileData);

    console.log("✅ .wtf file parsed successfully:", {
      url: wtfData.manifest.url,
      capturedAt: wtfData.manifest.capturedAt,
      elementCount: wtfData.manifest.schema.elementCount,
    });

    figma.ui.postMessage({
      type: "progress",
      message: "Loading schema and screenshot...",
      percent: 15,
    });

    // Add screenshot to schema if not already present
    if (!wtfData.schema.screenshot && wtfData.screenshotDataUrl) {
      wtfData.schema.screenshot = wtfData.screenshotDataUrl;
    }

    // Add metadata from manifest if not already present
    if (!wtfData.schema.metadata) {
      wtfData.schema.metadata = {
        url: wtfData.manifest.url,
        timestamp: wtfData.manifest.capturedAt,
        viewport: wtfData.manifest.viewport,
      };
    }

    // Now import the schema using the regular import flow
    await handleImportRequest(wtfData.schema, options, "import");

    figma.notify("✓ .wtf file imported successfully", { timeout: 3000 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to import .wtf file. See console for details.";
    figma.ui.postMessage({ type: "error", message });
    figma.notify(`✗ .wtf import failed: ${message}`, { error: true });
    console.error("❌ .wtf import error:", error);
  } finally {
    isImporting = false;
  }
}

function postHandoffStatus(
  status: HandoffStatus,
  detail?: string,
  meta?: Record<string, any>
) {
  if (status === lastHandoffStatus && status !== "job-ready") {
    return;
  }

  lastHandoffStatus = status;
  figma.ui.postMessage({ type: "handoff-status", status, detail, meta });
}

function updateChromeConnection(state: "connected" | "disconnected") {
  if (state === chromeConnectionState) return;
  chromeConnectionState = state;

  figma.ui.postMessage({
    type:
      state === "connected"
        ? "chrome-extension-connected"
        : "chrome-extension-disconnected",
  });
}

function updateServerConnection(state: "connected" | "disconnected") {
  if (state === serverConnectionState) return;
  serverConnectionState = state;

  figma.ui.postMessage({
    type: state === "connected" ? "server-connected" : "server-disconnected",
  });
}

function handleTelemetryFromUi(telemetry?: HandoffTelemetry | null) {
  lastTelemetry = telemetry || null;
  figma.ui.postMessage({
    type: "handoff-telemetry",
    telemetry: telemetry || null,
  });

  if (!telemetry) {
    updateServerConnection("disconnected");
    updateChromeConnection("disconnected");
    return;
  }

  const now = Date.now();
  const extensionHeartbeat =
    typeof telemetry.lastExtensionPingAt === "number" &&
    now - telemetry.lastExtensionPingAt < 30000;
  const pluginPolling =
    typeof telemetry.lastPluginPollAt === "number" &&
    now - telemetry.lastPluginPollAt < 30000;

  updateChromeConnection(extensionHeartbeat ? "connected" : "disconnected");
  updateServerConnection(pluginPolling ? "connected" : "disconnected");
}

function applyTelemetry(telemetry?: HandoffTelemetry | null): boolean {
  if (!telemetry) return false;

  console.log("📡 Applying telemetry:", telemetry);
  lastTelemetry = telemetry;

  const now = Date.now();
  const extensionHeartbeat =
    typeof telemetry.lastExtensionPingAt === "number" &&
    now - telemetry.lastExtensionPingAt < 30000;

  updateChromeConnection(extensionHeartbeat ? "connected" : "disconnected");
  updateServerConnection("connected");
  figma.ui.postMessage({ type: "handoff-telemetry", telemetry });
  return true;
}

function startHandoffPolling() {
  if (handoffPollTimer) return;
  void pollHandoffJobs();
  handoffPollTimer = setInterval(() => {
    if (handoffPollInFlight) return;
    void pollHandoffJobs();
  }, HANDOFF_POLL_INTERVAL);
}

function currentHandoffBase(): string {
  return HANDOFF_BASES[handoffBaseIndex] || "http://127.0.0.1:4411";
}

function rotateHandoffBase() {
  handoffBaseIndex = (handoffBaseIndex + 1) % HANDOFF_BASES.length;
}

function buildHandoffHeaders(
  base: Record<string, string> = {}
): Record<string, string> {
  const headers = { ...base };
  if (HANDOFF_API_KEY) headers["x-api-key"] = HANDOFF_API_KEY;
  return headers;
}

async function loadAvailableFonts(): Promise<{
  families: Set<string>;
  variants: Set<string>;
}> {
  if (availableFontsCache) return availableFontsCache;
  const fonts = await figma.listAvailableFontsAsync();
  const families = new Set<string>();
  const variants = new Set<string>();
  for (const font of fonts) {
    families.add(font.fontName.family);
    variants.add(`${font.fontName.family}::${font.fontName.style}`);
  }
  availableFontsCache = { families, variants };
  return availableFontsCache;
}

function weightToStyle(weight: number): string {
  if (weight >= 900) return "Black";
  if (weight >= 800) return "Extra Bold";
  if (weight >= 700) return "Bold";
  if (weight >= 600) return "Semi Bold";
  if (weight >= 500) return "Medium";
  if (weight >= 300) return "Light";
  return "Regular";
}

async function findMissingFonts(schema: any): Promise<MissingFontReport[]> {
  const missing: Map<string, Set<string>> = new Map();
  const { families, variants } = await loadAvailableFonts();

  const addMissing = (family: string, style: string) => {
    if (!family) return;
    const key = family;
    if (!missing.has(key)) missing.set(key, new Set<string>());
    missing.get(key)!.add(style);
  };

  // From metadata fonts
  if (schema?.metadata?.fonts) {
    for (const font of schema.metadata.fonts) {
      const family = font.family;
      const weights: number[] = font.weights || [400];
      const styles = weights.map((w) => weightToStyle(w));
      styles.forEach((style) => {
        if (!variants.has(`${family}::${style}`)) {
          addMissing(family, style);
        }
      });
    }
  }

  // From assets.fonts (captured @font-face)
  if (schema?.assets?.fonts) {
    Object.values(schema.assets.fonts).forEach((f: any) => {
      const family = f.family || "";
      const style = f.style || weightToStyle(parseInt(f.weight || "400", 10));
      if (!variants.has(`${family}::${style}`)) {
        addMissing(family, style);
      }
    });
  }

  // If any text nodes carry explicit font styles, sample a small walk
  const walkTextFonts = (node: any) => {
    if (!node) return;
    if (node.type === "TEXT" && node.textStyle) {
      const family = node.textStyle.fontFamily;
      const style = node.textStyle.fontStyle
        ? node.textStyle.fontStyle
        : weightToStyle(node.textStyle.fontWeight || 400);
      if (!variants.has(`${family}::${style}`)) {
        addMissing(family, style);
      }
    }
    if (node.children) {
      for (const child of node.children) walkTextFonts(child);
    }
  };
  walkTextFonts(schema?.tree);

  return Array.from(missing.entries()).map(([family, styles]) => ({
    family,
    styles: Array.from(styles),
  }));
}

async function fetchHandoffHistory(): Promise<{
  jobs: HandoffHistoryItem[];
  telemetry?: HandoffTelemetry | null;
}> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < HANDOFF_BASES.length; attempt++) {
    handoffBaseIndex = attempt;
    try {
      const response = await fetch(`${currentHandoffBase()}/api/jobs/history`, {
        headers: buildHandoffHeaders({ "cache-control": "no-cache" }),
      });
      if (!response.ok) {
        lastError = new Error(
          `History request failed: HTTP ${response.status}`
        );
        continue;
      }
      const body = (await response.json()) as {
        jobs?: HandoffHistoryItem[];
        telemetry?: HandoffTelemetry | null;
      };
      applyTelemetry(body?.telemetry || null);
      return { jobs: body?.jobs || [], telemetry: body?.telemetry || null };
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error(formatUnknownError(err));
      continue;
    }
  }
  throw lastError || new Error("History request failed");
}

async function fetchHandoffJob(jobId: string): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < HANDOFF_BASES.length; attempt++) {
    handoffBaseIndex = attempt;
    try {
      const response = await fetch(
        `${currentHandoffBase()}/api/jobs/${jobId}`,
        {
          headers: buildHandoffHeaders({ "cache-control": "no-cache" }),
        }
      );
      if (!response.ok) {
        lastError = new Error(`Job fetch failed: HTTP ${response.status}`);
        continue;
      }
      const body = (await response.json()) as {
        job?: { id: string; payload?: any; permalink?: string };
        telemetry?: HandoffTelemetry | null;
      };
      applyTelemetry(body?.telemetry || null);
      const payload = decompressPayload(body?.job?.payload);
      return { job: body?.job, payload };
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error(formatUnknownError(err));
      continue;
    }
  }
  throw lastError || new Error("Job fetch failed");
}

async function pollHandoffJobs(): Promise<void> {
  handoffPollInFlight = true;
  try {
    console.log("[POLL] Starting poll cycle", { isImporting });

    // Respect cooldown to avoid hammering the server (e.g., after 429)
    const now = Date.now();
    if (handoffCooldownUntil && now < handoffCooldownUntil) {
      postHandoffStatus(
        "waiting",
        `Cooling down… retrying in ${Math.ceil(
          (handoffCooldownUntil - now) / 1000
        )}s`
      );
      return;
    }
    // Reset cooldown/backoff when we're allowed to poll again
    if (handoffCooldownUntil && now >= handoffCooldownUntil) {
      handoffCooldownUntil = 0;
    }

    // Try a lightweight health ping each cycle to update connection lights
    await pingHandoffHealth();

    if (isImporting) {
      console.log("[POLL] Skipping job check - already importing");
      return;
    }

    const endpoint = `${currentHandoffBase()}/api/jobs/next`;
    console.log("[POLL] Fetching jobs from:", endpoint);

    const headers: Record<string, string> = buildHandoffHeaders({
      "cache-control": "no-cache",
    });

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    console.log("[POLL] Response status:", response.status);

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited: back off polling for a bit
        handoffBackoffMs = handoffBackoffMs
          ? Math.min(handoffBackoffMs * 2, 120000)
          : 15000;
        handoffCooldownUntil = Date.now() + handoffBackoffMs;
        postHandoffStatus(
          "error",
          `Server rate limited. Retrying in ${Math.ceil(
            handoffBackoffMs / 1000
          )}s`
        );
        updateServerConnection("disconnected");
        return;
      }
      if (response.status === 204) {
        // No jobs available
        updateServerConnection("connected");
        postHandoffStatus("waiting");
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    // Success; reset backoff
    handoffBackoffMs = 0;
    handoffCooldownUntil = 0;
    updateServerConnection("connected");

    // Localhost handoff format: { job: { id, payload }, telemetry }
    const body = (await response.json()) as HandoffJobResponse;
    console.log("[POLL] Response body:", {
      hasJob: !!body?.job,
      hasPayload: !!body?.job?.payload,
      hasTelemetry: !!body?.telemetry,
    });

    applyTelemetry(body?.telemetry || null);

    if (body?.job?.payload) {
      console.log("[POLL] Job found! Starting import...");
      const payload = decompressPayload(body.job.payload);
      postHandoffStatus("job-ready", `Importing job ${body.job.id}`);
      await handleImportRequest(payload, undefined, "auto-import");
    } else {
      console.log("[POLL] No job in response");
      postHandoffStatus("waiting");
    }
    updateServerConnection("connected");
  } catch (error) {
    console.error("[POLL] Error during poll:", error);
    const message = formatUnknownError(error);
    const baseUrl = currentHandoffBase();
    
    // Provide context about which server failed
    const contextualMessage = message.includes('localhost:4411') 
      ? message 
      : `${message} (trying ${baseUrl})`;
      
    postHandoffStatus("error", contextualMessage);
    updateServerConnection("disconnected");
    rotateHandoffBase();
  } finally {
    handoffPollInFlight = false;
  }
}

// Enhanced decompression function with comprehensive debugging
function decompressPayload(payload: any): any {
  console.log("🔍 [DECOMPRESS] Starting payload analysis...", {
    hasPayload: !!payload,
    payloadType: typeof payload,
    isCompressed: !!(payload && payload.compressed),
    hasData: !!(payload && payload.data),
    dataType: payload && payload.data ? typeof payload.data : 'none',
    hasSchema: !!(payload && payload.schema),
    payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : []
  });

  // Handle compressed payload
  if (payload && payload.compressed && typeof payload.data === "string") {
    console.log("📦 [DECOMPRESS] Processing compressed payload...", {
      dataLength: payload.data.length,
      compressionType: payload.compressionType || 'pako'
    });
    
    try {
      console.log("📦 [DECOMPRESS] Step 1: Base64 decode...");
      const compressedData = safeBase64ToUint8(payload.data);
      console.log("✅ [DECOMPRESS] Base64 decoded successfully", {
        originalSize: payload.data.length,
        binarySize: compressedData.length
      });

      console.log("📦 [DECOMPRESS] Step 2: Pako inflate...");
      if (typeof pako.inflate !== "function") {
        throw new Error("Pako inflate function not available");
      }
      
      const jsonString = pako.inflate(compressedData, { to: "string" });
      console.log("✅ [DECOMPRESS] Pako inflate successful", {
        inflatedSize: jsonString.length,
        preview: jsonString.substring(0, 200) + '...'
      });

      console.log("📦 [DECOMPRESS] Step 3: JSON parse...");
      const parsed = JSON.parse(jsonString);
      console.log("✅ [DECOMPRESS] JSON parse successful", {
        hasTree: !!(parsed && parsed.tree),
        hasMetadata: !!(parsed && parsed.metadata),
        parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
        treeChildren: parsed && parsed.tree && parsed.tree.children ? parsed.tree.children.length : 0
      });

      // Return the most appropriate data structure
      const result = parsed?.schema ?? parsed ?? payload;
      console.log("✅ [DECOMPRESS] Decompression completed", {
        resultType: typeof result,
        hasTree: !!(result && result.tree),
        finalKeys: result && typeof result === 'object' ? Object.keys(result) : []
      });
      
      return result;
    } catch (e) {
      console.error("❌ [DECOMPRESS] Decompression failed:", {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack?.substring(0, 500) : undefined,
        payloadPreview: JSON.stringify(payload).substring(0, 200)
      });
      
      // Fallback: return original payload but log the attempt
      console.warn("🔄 [DECOMPRESS] Falling back to original payload");
      return payload;
    }
  }

  // Handle schema wrapper
  if (payload && payload.schema) {
    console.log("🔍 [DECOMPRESS] Found schema wrapper, unwrapping...", {
      schemaType: typeof payload.schema,
      schemaKeys: payload.schema && typeof payload.schema === 'object' ? Object.keys(payload.schema) : [],
      hasRoot: !!(payload.schema && payload.schema.root)
    });
    return payload.schema;
  }

  // Handle direct payload
  console.log("🔍 [DECOMPRESS] Using payload directly (no compression or wrapping detected)", {
    hasTree: !!(payload && payload.tree),
    directKeys: payload && typeof payload === 'object' ? Object.keys(payload) : []
  });
  
  return payload;
}


function safeBase64ToUint8(base64: string): Uint8Array {
  try {
    if (typeof atob === "function") {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  } catch (err) {
    console.warn("atob failed, falling back to manual decoder", err);
  }

  // Manual base64 decode
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup: Record<string, number> = {};
  for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;

  const cleaned = base64.replace(/=+$/, "");
  const bufferLength = (cleaned.length * 3) / 4;
  const bytes = new Uint8Array(bufferLength | 0);

  let p = 0;
  for (let i = 0; i < cleaned.length; i += 4) {
    const encoded1 = lookup[cleaned[i]] ?? 0;
    const encoded2 = lookup[cleaned[i + 1]] ?? 0;
    const encoded3 = lookup[cleaned[i + 2]] ?? 0;
    const encoded4 = lookup[cleaned[i + 3]] ?? 0;

    const triplet =
      (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

    if (p < bytes.length) bytes[p++] = (triplet >> 16) & 0xff;
    if (p < bytes.length) bytes[p++] = (triplet >> 8) & 0xff;
    if (p < bytes.length) bytes[p++] = triplet & 0xff;
  }

  return bytes;
}

async function pingHandoffHealth(): Promise<void> {
  try {
    const response = await fetch(
      `${currentHandoffBase()}/api/health?source=plugin`,
      {
        headers: buildHandoffHeaders({ "cache-control": "no-cache" }),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status} ${text || ""}`.trim());
    }
    const body = (await response.json()) as HandoffHealthResponse;
    applyTelemetry(body?.telemetry || null);
    console.log("[handoff] Health OK", {
      base: currentHandoffBase(),
      queueLength: body.queueLength,
    });
    updateServerConnection("connected");
    figma.ui.postMessage({
      type: "handoff-health",
      base: currentHandoffBase(),
      status: "ok",
      queueLength: body.queueLength,
    });
  } catch (error) {
    const message = formatUnknownError(error);
    const baseUrl = currentHandoffBase();
    
    // Provide context about which server failed  
    const contextualMessage = message.includes('localhost:4411') 
      ? message 
      : `${message} (checking ${baseUrl})`;
      
    updateServerConnection("disconnected");
    postHandoffStatus("error", contextualMessage);
    rotateHandoffBase();
    console.warn("[handoff] Health check failed, rotating base", contextualMessage);
    figma.ui.postMessage({
      type: "handoff-health",
      base: currentHandoffBase(),
      status: `error: ${contextualMessage}`,
      queueLength: null,
    });
  }
}

// Options from the enhanced UI
interface EnhancedUIOptions {
  autoLayout?: boolean;
  components?: boolean;
  styles?: boolean;
  variants?: boolean;
}

// Enhanced import handler for the new UI
async function handleEnhancedImport(
  data: any,
  options: EnhancedUIOptions | undefined
): Promise<void> {
  if (isImporting) {
    figma.ui.postMessage({
      type: "import-error",
      error: "Another import is already in progress",
    });
    return;
  }

  if (!data) {
    figma.ui.postMessage({
      type: "import-error",
      error: "No data provided for import",
    });
    return;
  }

  isImporting = true;

  try {
    // Send initial progress
    figma.ui.postMessage({
      type: "progress",
      percent: 0,
      message: "Preparing import...",
      phase: "Initialize",
    });

    const treeNorm = normalizeSchemaTreeForFigma(data);
    if (treeNorm.removedNodes > 0 || treeNorm.renamedNodes > 0) {
      console.log(
        "🧹 Normalized schema tree for professional nesting:",
        treeNorm
      );
    }

    if (options?.autoLayout !== false) {
      console.log("✅ Preparing layout schema (Auto Layout enabled)...");
      prepareLayoutSchema(data);
      console.log("✅ Layout schema prepared.");
    } else {
      console.log(
        "🧷 Pixel-perfect mode: skipping prepareLayoutSchema() (Auto Layout disabled)"
      );
    }

    // Transform options from enhanced UI format
    const enhancedOptions: Partial<EnhancedImportOptions> = {
      ...defaultEnhancedOptions,
      applyAutoLayout: options?.autoLayout ?? true,
      createStyles: options?.styles ?? true,
      // These toggles map to our enhanced importer capabilities
      createMainFrame: true,
      enableBatchProcessing: true,
      verifyPositions: true,
    };

    const importer = new EnhancedFigmaImporter(data, enhancedOptions);
    const verificationReport = await importer.runImport();

    const stats = {
      nodes: verificationReport.totalElements || 0,
      styles: data?.styles ? Object.keys(data.styles || {}).length : 0,
      components: verificationReport.totalElements || 0,
    };

    figma.ui.postMessage({ type: "import-stats", ...stats });
    figma.ui.postMessage({
      type: "progress",
      percent: 100,
      message: "Import completed!",
      phase: "Complete",
    });
    figma.ui.postMessage({ type: "complete", stats });

    figma.notify(`✓ Successfully imported ${stats.nodes} elements!`, {
      timeout: 3000,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Import failed. See console for details.";
    figma.ui.postMessage({ type: "error", message });
    figma.notify(`✗ Import failed: ${message}`, { error: true });
  } finally {
    isImporting = false;
  }
}

// Enhanced import handler V2 with pixel-perfect positioning and verification
async function handleEnhancedImportV2(
  data: any,
  options: Partial<EnhancedImportOptions> | undefined
): Promise<void> {
  if (isImporting) {
    figma.ui.postMessage({
      type: "import-error",
      error: "Another import is already in progress",
    });
    return;
  }

  if (!data) {
    figma.ui.postMessage({
      type: "import-error",
      error: "No data provided for import",
    });
    return;
  }

  isImporting = true;

  try {
    // Unwrap rawSchemaJson if present (chunked transfer format from Chrome extension)
    let schema = data;
    if (data.rawSchemaJson && typeof data.rawSchemaJson === "string") {
      console.log(
        "🔓 Unwrapping rawSchemaJson string from chunked transfer..."
      );
      try {
        schema = JSON.parse(data.rawSchemaJson);
        console.log("✅ Successfully parsed rawSchemaJson");
      } catch (parseError) {
        const errorMsg =
          parseError instanceof Error ? parseError.message : "Parse failed";
        console.error("❌ Failed to parse rawSchemaJson:", errorMsg);
        figma.ui.postMessage({
          type: "error",
          message: `Failed to parse schema data: ${errorMsg}`,
        });
        isImporting = false;
        return;
      }
    }

    // Unwrap multi-viewport format if present
    if (Array.isArray(schema.captures) && schema.captures.length > 0) {
      console.log("🔓 Unwrapping multi-viewport capture format (V2)...");
      let picked: any = null;
      for (const cap of schema.captures) {
        if (!cap) continue;
        const candidate = cap.data?.tree
          ? cap.data
          : cap.data?.schema?.tree
          ? cap.data.schema
          : cap.data?.rawSchemaJson
          ? JSON.parse(cap.data.rawSchemaJson)
          : cap.data || cap.schema;
        if (candidate?.tree) {
          picked = candidate;
          console.log(
            `✅ Using viewport: ${cap.viewport || cap.name || "unnamed"} (V2)`
          );
          break;
        }
        if (cap?.rawSchemaJson && !picked) {
          try {
            const parsed = JSON.parse(cap.rawSchemaJson);
            if (parsed?.tree) {
              picked = parsed;
              console.log(
                `✅ Parsed rawSchemaJson for viewport: ${
                  cap.viewport || cap.name || "unnamed"
                } (V2)`
              );
              break;
            }
          } catch {
            // ignore parse error
          }
        }
      }
      if (picked) {
        schema = picked;
      } else {
        console.error(
          "❌ Multi-viewport format detected but no valid capture data found (V2)"
        );
        figma.ui.postMessage({
          type: "error",
          message: "Multi-viewport format is invalid - no data in captures",
        });
        isImporting = false;
        return;
      }
    }

    // Migration already handled in main import flow

    // Fallback: unwrap rawSchemaJson or nested schema if root missing
    if (!schema.root) {
      if (schema.rawSchemaJson && typeof schema.rawSchemaJson === "string") {
        try {
          const parsed = JSON.parse(schema.rawSchemaJson);
          if (parsed?.root) {
            schema = parsed;
          } else if (parsed?.tree) {
            console.log("🔄 [NESTED-IMPORT] Converting rawSchemaJson legacy 'tree' to canonical 'root'");
            parsed.root = parsed.tree;
            delete parsed.tree;
            schema = parsed;
          }
        } catch {
          // ignore
        }
      } else if (schema.schema?.root) {
        schema = schema.schema;
      } else if (schema.schema?.tree) {
        console.log("🔄 [NESTED-IMPORT] Converting nested legacy 'tree' to canonical 'root'");
        schema.schema.root = schema.schema.tree;
        delete schema.schema.tree;
        schema = schema.schema;
      }
    }

    // Deep search for any nested object that contains a root
    if (!schema.root) {
      const visited = new Set<any>();
      const findSchemaWithTree = (obj: any): any | null => {
        if (!obj || typeof obj !== "object") return null;
        if (visited.has(obj)) return null;
        visited.add(obj);
        if ((obj as any).tree) return obj;
        for (const value of Object.values(obj)) {
          if (value && typeof value === "object") {
            const found = findSchemaWithTree(value);
            if (found) return found;
          }
        }
        return null;
      };
      const nested = findSchemaWithTree(schema);
      if (nested) {
        console.log("✅ Found nested schema with tree (V2), using it");
        schema = nested;
      }
    }

    // Final validation
    if (!schema.tree) {
      const preview =
        typeof schema === "object"
          ? JSON.stringify(schema).substring(0, 500)
          : String(schema).substring(0, 500);
      console.error("❌ No tree data available (V2). Data structure:", {
        hasData: !!schema,
        dataKeys:
          schema && typeof schema === "object" ? Object.keys(schema) : [],
        dataType: typeof schema,
        dataStringified: preview,
      });
      figma.ui.postMessage({
        type: "error",
        message:
          "No tree data available for import. The schema may be in an unsupported format.",
      });
      isImporting = false;
      return;
    }

    console.log("🚀 Starting enhanced import V2 with schema:", {
      version: schema.version,
      rootNodes: schema.root ? "present" : "missing",
      assets: schema.assets
        ? Object.keys(schema.assets.images || {}).length
        : 0,
      metadata: schema.metadata ? "present" : "missing",
    });

    // ✅ IMPORTANT: run the same layout preprocessing as the other path
    // (unless pixel-perfect mode disables Auto Layout)
    console.log("✅ Preparing layout schema (V2)...");
    const treeNorm = normalizeSchemaTreeForFigma(schema);
    if (treeNorm.removedNodes > 0 || treeNorm.renamedNodes > 0) {
      console.log(
        "🧹 Normalized schema tree for professional nesting:",
        treeNorm
      );
    }
    if (options?.applyAutoLayout !== false) {
      prepareLayoutSchema(schema);
      console.log("✅ Layout schema prepared (V2).");
    } else {
      console.log(
        "🧷 Pixel-perfect mode: skipping prepareLayoutSchema() (Auto Layout disabled)"
      );
    }

    const removedPaletteFills = sanitizeLargeVibrantPaletteFills(schema);
    if (removedPaletteFills > 0) {
      console.warn(
        `⚠️ Removed ${removedPaletteFills} large-node Vibrant palette fill(s) for pixel fidelity`
      );
    }

    // Transform options to enhanced format
    const enhancedOptions: Partial<EnhancedImportOptions> = {
      createMainFrame: true,
      enableBatchProcessing: true,
      verifyPositions: true,
      maxBatchSize: 10,
      coordinateTolerance: 2,
      enableDebugMode: false,
      retryFailedImages: true,
      enableProgressiveLoading: false,
      ...options,
    };

    // Create enhanced importer instance
    const enhancedImporter = new EnhancedFigmaImporter(schema, enhancedOptions);

    // Set up progress callback if available (assuming EnhancedFigmaImporter supports it or we add it)
    // Note: EnhancedFigmaImporter might not have setProgressCallback exposed yet,
    // but we should try to hook it up if possible or add it.
    // For now, we'll send a starting progress message.
    figma.ui.postMessage({
      type: "progress",
      percent: 10,
      message: "Starting enhanced import...",
      phase: "Initialize",
    });

    // Run the enhanced import with verification
    const verificationReport = await enhancedImporter.runImport();

    // Send enhanced statistics including verification report
    const stats = {
      nodes: verificationReport.totalElements,
      styles: 0, // Will be enhanced later
      components: 0, // Will be enhanced later
      images: verificationReport.imagesProcessed,
      verification: {
        totalElements: verificationReport.totalElements,
        positionsVerified: verificationReport.positionsVerified,
        positionsWithinTolerance: verificationReport.positionsWithinTolerance,
        positionsOutsideTolerance: verificationReport.positionsOutsideTolerance,
        maxDeviation: verificationReport.maxDeviation,
        averageDeviation: verificationReport.averageDeviation,
        problematicElements: verificationReport.problematicElements.length,
      },
    };

    figma.ui.postMessage({ type: "import-stats", ...stats });
    figma.ui.postMessage({ type: "complete", stats });

    // Show enhanced notification with verification info
    if (verificationReport.positionsOutsideTolerance > 0) {
      figma.notify(
        `✓ Import complete with ${verificationReport.positionsOutsideTolerance} position mismatches`,
        { timeout: 4000 }
      );
    } else {
      figma.notify("✅ Import complete with pixel-perfect accuracy!", {
        timeout: 3000,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Enhanced import failed. See console for details.";
    figma.ui.postMessage({ type: "error", message });
    figma.notify(`✗ Enhanced import failed: ${message}`, { error: true });
    console.error("❌ Enhanced import V2 error:", error);
  } finally {
    isImporting = false;
  }
}

// WTF file parsing handler for the new UI
async function handleWTFParsing(fileData: ArrayBuffer): Promise<void> {
  try {
    const parser = new WTFParser();
    const data = await parser.parse(fileData);

    figma.ui.postMessage({
      type: "wtf-parsed",
      data: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse .wtf file";
    figma.ui.postMessage({
      type: "wtf-parse-error",
      error: message,
    });
  }
}

async function sendHandoffHistory(): Promise<void> {
  figma.ui.postMessage({ type: "history-loading" });
  try {
    const { jobs } = await fetchHandoffHistory();
    figma.ui.postMessage({ type: "history", jobs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load history";
    figma.ui.postMessage({ type: "history-error", message });
  }
}

async function importFromHistory(jobId: string): Promise<void> {
  if (!jobId) {
    figma.ui.postMessage({
      type: "history-error",
      message: "Missing job id",
    });
    return;
  }

  figma.ui.postMessage({
    type: "history-loading",
  });

  try {
    const { payload } = await fetchHandoffJob(jobId);
    if (!payload) {
      throw new Error("No payload found for this job");
    }
    await handleImportRequest(payload, undefined, "auto-import");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import from history";
    figma.ui.postMessage({
      type: "history-error",
      message,
    });
  }
}
