import { handleWebpTranscodeResult } from "./ui-bridge";

// Import the static UI
import uiHtml from "../ui/index-static.html";
import { FigmaImporter, ImportOptions } from "./importer";
import {
  EnhancedFigmaImporter,
  EnhancedImportOptions,
} from "./enhanced-figma-importer";
import { prepareLayoutSchema } from "./layout-solver";
import { upgradeSelectionToAutoLayout } from "./layout-upgrader";
import { WTFParser } from "./wtf-parser";
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

const defaultImportOptions: ImportOptions = {
  createMainFrame: true,
  createVariantsFrame: false,
  createComponentsFrame: true,
  createDesignSystem: false,
  applyAutoLayout: true, // Enable Auto Layout by default for pixel-perfect fidelity
  createStyles: true,
  usePixelPerfectPositioning: true, // Enable pixel-perfect positioning
  createScreenshotOverlay: true, // Enable screenshot reference overlay
  showValidationMarkers: false, // Disable by default to avoid clutter
};

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
let chromeConnectionState: "connected" | "disconnected" = "disconnected";
let serverConnectionState: "connected" | "disconnected" = "disconnected";
// Capture service endpoints - configured for cloud deployment
// Note: Environment variables not available in Figma plugin sandbox
// Temporarily disabled cloud for local testing
const CAPTURE_SERVICE_URL = null; // 'https://capture-service-sandy.vercel.app';
const CAPTURE_SERVICE_API_KEY =
  "f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2";
const HANDOFF_API_KEY =
  ((globalThis as any).__HANDOFF_API_KEY as string | undefined) || "";

const HANDOFF_BASES = CAPTURE_SERVICE_URL
  ? [CAPTURE_SERVICE_URL]
  : [
      (globalThis as any).__HANDOFF_SERVER_URL ?? "http://127.0.0.1:4411",
      "http://localhost:4411",
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

  if (msg.type === "puppeteer-start-live-mode") {
    figma.ui.postMessage({ type: "puppeteer-control-start" });
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

  if (msg.type === "upgrade-auto-layout") {
    upgradeSelectionToAutoLayout();
    return;
  }
};

async function handleImportRequest(
  data: any,
  options: Partial<ImportOptions> | undefined,
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
    let picked: any = null;
    for (const cap of schema.captures) {
      if (!cap) continue;
      // Try common shapes
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
          `✅ Using viewport: ${cap.viewport || cap.name || "unnamed"}`
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

  // Fallback: unwrap rawSchemaJson or nested schema if tree missing
  if (!schema.tree) {
    if (schema.rawSchemaJson && typeof schema.rawSchemaJson === "string") {
      try {
        const parsed = JSON.parse(schema.rawSchemaJson);
        if (parsed?.tree) schema = parsed;
      } catch {
        // ignore parse error
      }
    } else if (schema.schema?.tree) {
      schema = schema.schema;
    }
  }

  // Final validation: ensure we have tree data
  if (!schema.tree) {
    // Deep search for any nested object that contains a tree
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
      console.log("✅ Found nested schema with tree, using it");
      schema = nested;
    }
  }

  if (!schema.tree) {
    console.error("❌ No tree data available for import. Data structure:", {
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
        "No tree data available for import. The schema may be in an unsupported format.",
    });
    isImporting = false;
    return;
  }

  // ===== ENFORCED: Puppeteer Engine Validation =====
  // All schemas must come from Puppeteer capture, not direct extension injection
  const captureEngine = schema.meta?.captureEngine;
  if (captureEngine && captureEngine !== "puppeteer") {
    console.warn(`⚠️ Schema from non-Puppeteer engine: ${captureEngine}`);
    // For now, log warning but allow - strict mode can be enabled later
    // To enforce strictly, uncomment the block below:
    /*
    figma.ui.postMessage({
      type: "error",
      message: `Only Puppeteer captures are supported. Got: ${captureEngine}`,
    });
    isImporting = false;
    return;
    */
  }
  if (captureEngine === "puppeteer") {
    console.log("✅ Schema verified: captureEngine=puppeteer");
  }

  const resolvedOptions: ImportOptions = {
    ...defaultImportOptions,
    ...(options || {}),
  };

  try {
    console.log("🚀 Starting import with schema:", {
      version: schema.version,
      treeNodes: schema.tree ? "present" : "missing",
      treeType: schema.tree?.type,
      treeName: schema.tree?.name,
      treeChildren: schema.tree?.children?.length || 0,
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

    console.log("✅ Preparing layout schema...");
    prepareLayoutSchema(schema);
    console.log("✅ Schema preparation complete");

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
    };

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
    figma.ui.postMessage({ type: "error", message });
    figma.notify(`✗ Import failed: ${message}`, { error: true });
    postHandoffStatus("error", message);
  } finally {
    isImporting = false;
  }
}

async function handleWTFImport(
  fileData: ArrayBuffer,
  options: Partial<ImportOptions> | undefined
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
    now - telemetry.lastExtensionPingAt < 8000;
  const pluginPolling =
    typeof telemetry.lastPluginPollAt === "number" &&
    now - telemetry.lastPluginPollAt < 8000;

  updateChromeConnection(extensionHeartbeat ? "connected" : "disconnected");
  updateServerConnection(pluginPolling ? "connected" : "disconnected");
}

function applyTelemetry(telemetry?: HandoffTelemetry | null): boolean {
  if (!telemetry) return false;

  const now = Date.now();
  const extensionHeartbeat =
    typeof telemetry.lastExtensionPingAt === "number" &&
    now - telemetry.lastExtensionPingAt < 8000;

  updateChromeConnection(extensionHeartbeat ? "connected" : "disconnected");
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
  return HANDOFF_BASES[handoffBaseIndex] || "http://127.0.0.1:5511";
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
  const response = await fetch(`${currentHandoffBase()}/api/jobs/history`, {
    headers: buildHandoffHeaders({ "cache-control": "no-cache" }),
  });
  if (!response.ok) {
    throw new Error(`History request failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    jobs?: HandoffHistoryItem[];
    telemetry?: HandoffTelemetry | null;
  };
  applyTelemetry(body?.telemetry || null);
  return { jobs: body?.jobs || [], telemetry: body?.telemetry || null };
}

async function fetchHandoffJob(jobId: string): Promise<any> {
  const response = await fetch(`${currentHandoffBase()}/api/jobs/${jobId}`, {
    headers: buildHandoffHeaders({ "cache-control": "no-cache" }),
  });
  if (!response.ok) {
    throw new Error(`Job fetch failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    job?: { id: string; payload?: any; permalink?: string };
    telemetry?: HandoffTelemetry | null;
  };
  applyTelemetry(body?.telemetry || null);
  const payload = decompressPayload(body?.job?.payload);
  return { job: body?.job, payload };
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

    const isCloudService = !!CAPTURE_SERVICE_URL;
    const endpoint = `${currentHandoffBase()}/api/jobs/next`;
    console.log("[POLL] Fetching jobs from:", endpoint);

    const headers: Record<string, string> = buildHandoffHeaders({
      "cache-control": "no-cache",
    });

    if (CAPTURE_SERVICE_API_KEY) {
      headers["x-api-key"] = CAPTURE_SERVICE_API_KEY;
    }

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
        // No jobs available (cloud service returns 204)
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

    if (isCloudService) {
      // Cloud service format: { jobId, state, schemaUrl, screenshotUrl, metadata }
      const jobResult = (await response.json()) as {
        jobId: string;
        state: string;
        schemaUrl?: string;
        screenshotUrl?: string;
        metadata?: unknown;
      };

      if (jobResult.state === "completed" && jobResult.schemaUrl) {
        // Fetch the schema from signed URL
        const schemaResponse = await fetch(jobResult.schemaUrl);
        let schema = await schemaResponse.json();

        // Decompress if needed
        schema = decompressPayload(schema);

        postHandoffStatus("job-ready", `Importing job ${jobResult.jobId}`);
        await handleImportRequest(schema, undefined, "auto-import");
      } else {
        postHandoffStatus("waiting");
      }
    } else {
      // Legacy localhost handoff format: { job: { id, payload }, telemetry }
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
    }
  } catch (error) {
    console.error("[POLL] Error during poll:", error);
    const message = error instanceof Error ? error.message : String(error);
    postHandoffStatus("error", message);
    updateServerConnection("disconnected");
    rotateHandoffBase();
  } finally {
    handoffPollInFlight = false;
  }
}

function decompressPayload(payload: any): any {
  if (payload && payload.compressed && typeof payload.data === "string") {
    console.log("📦 Decompressing payload...");
    try {
      const compressedData = safeBase64ToUint8(payload.data);
      const jsonString =
        typeof pako.inflate === "function"
          ? pako.inflate(compressedData, { to: "string" })
          : "";
      const parsed = jsonString ? JSON.parse(jsonString) : null;
      return parsed?.schema ?? parsed ?? payload;
    } catch (e) {
      console.error("Failed to decompress payload:", e);
      // Fallback: return original payload so we can still attempt import
      return payload;
    }
  }
  if (payload && payload.schema) {
    // Handle zero-parse forwarding that wraps schema
    return payload.schema;
  }
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
    figma.ui.postMessage({
      type: "handoff-health",
      base: currentHandoffBase(),
      status: "ok",
      queueLength: body.queueLength,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateServerConnection("disconnected");
    postHandoffStatus("error", message);
    rotateHandoffBase();
    console.warn("[handoff] Health check failed, rotating base", message);
    figma.ui.postMessage({
      type: "handoff-health",
      base: currentHandoffBase(),
      status: `error: ${message}`,
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

    console.log("✅ Preparing layout schema...");
    prepareLayoutSchema(data);
    console.log("✅ Layout schema prepared.");

    // Transform options from enhanced UI format
    const importOptions: ImportOptions = {
      ...defaultImportOptions,
      applyAutoLayout: options?.autoLayout ?? true,
      createComponentsFrame: options?.components ?? true,
      createStyles: options?.styles ?? true,
      createVariantsFrame: options?.variants ?? false,
    };

    // Create importer instance
    const importer = new FigmaImporter(importOptions);

    // Set up progress callback for enhanced UI
    importer.setProgressCallback(
      (percent: number, message: string, phase?: string) => {
        figma.ui.postMessage({
          type: "progress",
          percent: Math.min(percent, 95), // Leave 5% for finalization
          message,
          phase: phase || "Processing",
        });
      }
    );

    // Import the data
    const result = await importer.import(data);

    // Send statistics
    const stats = {
      nodes: result.elementsCount || 0,
      styles: result.stylesCount || 0,
      components: result.componentsCount || 0,
    };

    figma.ui.postMessage({ type: "import-stats", ...stats });
    figma.ui.postMessage({
      type: "progress",
      percent: 100,
      message: "Import completed!",
      phase: "Complete",
    });
    figma.ui.postMessage({ type: "complete", stats });

    // Show Figma notification
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

    // Fallback: unwrap rawSchemaJson or nested schema if tree missing
    if (!schema.tree) {
      if (schema.rawSchemaJson && typeof schema.rawSchemaJson === "string") {
        try {
          const parsed = JSON.parse(schema.rawSchemaJson);
          if (parsed?.tree) schema = parsed;
        } catch {
          // ignore
        }
      } else if (schema.schema?.tree) {
        schema = schema.schema;
      }
    }

    // Deep search for any nested object that contains a tree
    if (!schema.tree) {
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
      treeNodes: schema.tree ? "present" : "missing",
      assets: schema.assets
        ? Object.keys(schema.assets.images || {}).length
        : 0,
      metadata: schema.metadata ? "present" : "missing",
    });

    // ✅ IMPORTANT: run the same layout preprocessing as the other path
    console.log("✅ Preparing layout schema (V2)...");
    prepareLayoutSchema(schema);
    console.log("✅ Layout schema prepared (V2).");

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
