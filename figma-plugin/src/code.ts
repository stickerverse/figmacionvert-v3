import { handleWebpTranscodeResult } from "./ui-bridge";

// Import the static UI
const uiHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Web to Figma</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px; background: #ffffff; color: #000000; padding: 20px; width: 400px; min-height: 300px;
    }
    .container { display: flex; flex-direction: column; gap: 20px; }
    h1 { font-size: 18px; font-weight: 600; color: #1f2937; text-align: center; margin-bottom: 10px; }
    .status { padding: 12px 16px; border-radius: 8px; text-align: center; font-weight: 500; margin-bottom: 20px; }
    .status.info { background: #f3f4f6; color: #374151; }
    .status.success { background: #d1fae5; color: #065f46; }
    .status.error { background: #fee2e2; color: #991b1b; }
    .progress-section { margin-bottom: 20px; }
    .progress-section.hidden { display: none; }
    .progress-bar { width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; background: #6366f1; width: 0%; }
    .progress-text { font-size: 12px; color: #6b7280; text-align: center; }
    .upload-section { padding: 20px; border: 2px dashed #d1d5db; border-radius: 8px; text-align: center; cursor: pointer; margin-bottom: 16px; }
    .upload-section:hover { border-color: #6366f1; background: #fafafa; }
    .upload-section.has-file { border-color: #10b981; background: #f0fdf4; border-style: solid; }
    .upload-text { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
    .upload-hint { font-size: 12px; color: #9ca3af; }
    .file-input { display: none; }
    .file-name { margin-top: 12px; font-size: 12px; color: #059669; font-weight: 500; }
    .import-actions { display: flex; flex-direction: column; gap: 12px; }
    .btn { width: 100%; padding: 12px 16px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #6366f1; color: white; }
    .btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .connection-section { display: flex; flex-direction: column; gap: 12px; }
    .connection-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb; }
    .connection-dot { width: 12px; height: 12px; border-radius: 50%; background: #d1d5db; }
    .connection-dot.connected { background: #10b981; }
    .connection-dot.waiting { background: #f59e0b; }
    .connection-dot.error { background: #ef4444; }
    .connection-dot.idle { background: #9ca3af; }
    .connection-meta { display: flex; flex-direction: column; gap: 2px; }
    .connection-title { font-size: 13px; font-weight: 600; color: #1f2937; }
    .connection-detail { font-size: 12px; color: #6b7280; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Web to Figma</h1>
    <div id="status" class="status info">Ready to import</div>
    <div class="connection-section">
      <div class="connection-card">
        <span id="extension-connection-dot" class="connection-dot waiting" aria-hidden="true"></span>
        <div class="connection-meta">
          <div class="connection-title">Chrome Extension</div>
          <div id="extension-connection-detail" class="connection-detail">Waiting for capture…</div>
        </div>
      </div>
      <div class="connection-card">
        <span id="cloud-connection-dot" class="connection-dot waiting" aria-hidden="true"></span>
        <div class="connection-meta">
          <div class="connection-title">Cloud Service</div>
          <div id="cloud-connection-detail" class="connection-detail">Checking service…</div>
        </div>
      </div>
      <div class="connection-card">
        <span id="transfer-connection-dot" class="connection-dot idle" aria-hidden="true"></span>
        <div class="connection-meta">
          <div class="connection-title">Data Transfer</div>
          <div id="transfer-connection-detail" class="connection-detail">Listening for captures…</div>
        </div>
      </div>
    </div>
    <div id="progress-section" class="progress-section hidden">
      <div class="progress-bar"><div id="progress-fill" class="progress-fill"></div></div>
      <div id="progress-text" class="progress-text">Processing...</div>
    </div>
    <div id="upload-section" class="upload-section">
      <input type="file" id="file-input" class="file-input" accept=".json,.wtf">
      <div class="upload-text">📁 Click to choose file</div>
      <div class="upload-hint">JSON or .wtf format</div>
      <div id="file-name" class="file-name hidden"></div>
    </div>
    <div class="import-actions">
      <button id="import-btn" class="btn btn-primary" disabled>📸 Import to Figma</button>
    </div>
  </div>
  <script>
    let currentData = null;
    let currentWTFFile = null;
    const statusEl = document.getElementById('status');
    const progressSection = document.getElementById('progress-section');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('file-input');
    const fileNameEl = document.getElementById('file-name');
    const importBtn = document.getElementById('import-btn');
    const connectionIndicators = {
      extension: {
        dot: document.getElementById('extension-connection-dot'),
        detail: document.getElementById('extension-connection-detail')
      },
      cloud: {
        dot: document.getElementById('cloud-connection-dot'),
        detail: document.getElementById('cloud-connection-detail')
      },
      transfer: {
        dot: document.getElementById('transfer-connection-dot'),
        detail: document.getElementById('transfer-connection-detail')
      }
    };
    let transferState = 'idle';
    let lastTelemetryTransferAt = null;

    setConnectionState('extension', 'waiting', 'Waiting for capture…');
    setConnectionState('cloud', 'waiting', 'Checking service…');
    setTransferState('idle', 'Listening for captures…');
    
    function updateStatus(message, type = 'info') {
      statusEl.textContent = message;
      statusEl.className = \`status \${type}\`;
    }
    
    function updateProgress(percent, message = '') {
      if (percent > 0) {
        progressSection.classList.remove('hidden');
        progressFill.style.width = \`\${percent}%\`;
        if (message) progressText.textContent = message;
      } else {
        progressSection.classList.add('hidden');
      }
    }
    
    uploadSection.addEventListener('click', () => { fileInput.click(); });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      handleFile(file);
    });

    // Drag and Drop Support
    uploadSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadSection.style.borderColor = '#6366f1';
      uploadSection.style.background = '#f0fdf4';
    });

    uploadSection.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadSection.style.borderColor = '#d1d5db';
      uploadSection.style.background = '';
    });

    uploadSection.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadSection.style.borderColor = '#d1d5db';
      uploadSection.style.background = '';
      
      const file = e.dataTransfer.files[0];
      handleFile(file);
    });

    function handleFile(file) {
      if (!file) return;
      const isWTFFile = file.name.toLowerCase().endsWith('.wtf');
      uploadSection.classList.add('has-file');
      fileNameEl.textContent = \`✓ \${file.name}\`;
      fileNameEl.classList.remove('hidden');
      
      if (isWTFFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            currentWTFFile = event.target.result;
            currentData = null;
            importBtn.disabled = false;
            updateStatus('✅ Ready to import .wtf file', 'success');
          } catch (error) {
            updateStatus('❌ Invalid .wtf file', 'error');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            currentData = JSON.parse(event.target.result);
            currentWTFFile = null;
            importBtn.disabled = false;
            updateStatus('✅ Ready to import JSON', 'success');
          } catch (error) {
            updateStatus('❌ Invalid JSON file', 'error');
          }
        };
        reader.readAsText(file);
      }
    }
    
    importBtn.addEventListener('click', () => {
      if (!currentData && !currentWTFFile) return;
      updateStatus('Starting import...', 'info');
      updateProgress(10, 'Initializing...');
      importBtn.disabled = true;
      
      if (currentWTFFile) {
        parent.postMessage({ pluginMessage: { type: 'import-wtf', fileData: currentWTFFile, options: {} } }, '*');
      } else {
        parent.postMessage({ pluginMessage: { type: 'import-enhanced', data: currentData, options: {} } }, '*');
      }
    });
    
    onmessage = (event) => {
      const msg = event.data.pluginMessage;
      console.log('UI received message:', msg.type, msg);
      
      switch (msg.type) {
        case 'auto-import-ready':
          updateStatus('🔄 Checking for captures...', 'info');
          setTransferState('idle', 'Listening for captures…');
          break;
        case 'auto-import-data':
          currentData = msg.data;
          currentWTFFile = null;
          uploadSection.classList.add('has-file');
          fileNameEl.textContent = '⚡ Auto-imported from Chrome Extension';
          fileNameEl.classList.remove('hidden');
          importBtn.disabled = false;
          updateStatus('✅ Auto-import ready', 'success');
          setTransferState('working', 'Auto-import queued…');
          setTimeout(() => { importBtn.click(); }, 100);
          break;
        case 'handoff-status':
          if (msg.status === 'waiting') {
            setTransferState('idle', 'Awaiting new capture');
          } else if (msg.status === 'job-ready') {
            updateStatus('🚀 New capture detected!', 'success');
            setTransferState('working', msg.detail || 'Importing capture…');
          } else {
            setTransferState('error', msg.detail || 'Handoff error');
          }
          break;
        case 'handoff-telemetry':
          handleTelemetry(msg.telemetry);
          break;
        case 'chrome-extension-connected':
          setConnectionState('extension', 'connected', 'Extension online');
          break;
        case 'chrome-extension-disconnected':
          setConnectionState('extension', 'waiting', 'Waiting for capture…');
          break;
        case 'server-connected':
          setConnectionState('cloud', 'connected', 'Cloud service online');
          break;
        case 'server-disconnected':
          setConnectionState('cloud', 'error', 'Cloud service offline');
          break;
        case 'progress':
          updateProgress(msg.percent, msg.message);
          setTransferState('working', msg.message || 'Importing…');
          break;
        case 'complete':
          const elementCount = msg.stats?.elements || msg.stats?.nodes || 0;
          updateStatus(\`✅ Imported \${elementCount} elements!\`, 'success');
          updateProgress(100, 'Complete!');
          importBtn.disabled = false;
          setTransferState('delivered', 'Imported just now');
          setTimeout(() => { updateProgress(0); }, 2000);
          break;
        case 'error':
          updateStatus(\`❌ \${msg.message}\`, 'error');
          updateProgress(0);
          importBtn.disabled = false;
          setTransferState('error', msg.message || 'Import error');
          break;
        case 'import-busy':
          updateStatus('Import in progress...', 'info');
          setTransferState('working', 'Import already running…');
          break;
        case 'transcode-webp': {
          const { id, base64 } = msg;
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas context unavailable');
                ctx.drawImage(img, 0, 0);
                const pngBase64 = canvas.toDataURL('image/png');
                parent.postMessage({ pluginMessage: { type: 'webp-transcoded', id, pngBase64 } }, '*');
              } catch (error) {
                parent.postMessage({ pluginMessage: { type: 'webp-transcoded', id, error: String(error) } }, '*');
              }
            };
            img.onerror = (error) => {
              parent.postMessage({ pluginMessage: { type: 'webp-transcoded', id, error: 'Image decode failed' } }, '*');
            };
            const src = base64.startsWith('data:') ? base64 : \`data:image/webp;base64,\${base64}\`;
            img.src = src;
          } catch (error) {
            parent.postMessage({ pluginMessage: { type: 'webp-transcoded', id, error: String(error) } }, '*');
          }
          break;
        }
      }
    };
    
    function setConnectionState(type, state, detail) {
      const indicator = connectionIndicators[type];
      if (!indicator || !indicator.dot || !indicator.detail) return;
      indicator.dot.className = \`connection-dot \${state}\`;
      indicator.detail.textContent = detail;
    }

    function setTransferState(state, detail) {
      transferState = state;
      let visualState = 'idle';
      if (state === 'working') {
        visualState = 'waiting';
      } else if (state === 'delivered') {
        visualState = 'connected';
      } else if (state === 'error') {
        visualState = 'error';
      }
      setConnectionState('transfer', visualState, detail);
    }

    function formatRelativeTime(timestamp) {
      if (!timestamp) return 'no signal';
      const diffSeconds = Math.round((Date.now() - timestamp) / 1000);
      if (diffSeconds < 1) return 'just now';
      if (diffSeconds < 60) return diffSeconds + 's ago';
      const minutes = Math.floor(diffSeconds / 60);
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      return hours + 'h ago';
    }

    function handleTelemetry(telemetry) {
      if (!telemetry) {
        setConnectionState('cloud', 'error', 'No telemetry data');
        return;
      }
      const queueDetail = typeof telemetry.queueLength === 'number'
        ? \`\${telemetry.queueLength} job\${telemetry.queueLength === 1 ? '' : 's'} queued\`
        : 'Queue idle';
      const extensionBeat = telemetry.lastExtensionPingAt
        ? \` • Ext \${formatRelativeTime(telemetry.lastExtensionPingAt)}\`
        : '';
      setConnectionState('cloud', 'connected', \`\${queueDetail}\${extensionBeat}\`);

      if (telemetry.lastExtensionPingAt) {
        setConnectionState('extension', 'connected', \`Heartbeat \${formatRelativeTime(telemetry.lastExtensionPingAt)}\`);
      }

      if (telemetry.lastExtensionTransferAt && transferState !== 'working') {
        if (lastTelemetryTransferAt !== telemetry.lastExtensionTransferAt) {
          lastTelemetryTransferAt = telemetry.lastExtensionTransferAt;
          setTransferState('delivered', \`Delivered \${formatRelativeTime(lastTelemetryTransferAt)}\`);
        }
      }
    }

    updateStatus('Ready to import');
    console.log('Static Web to Figma plugin loaded');
  </script>
</body>
</html>`;
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

const HANDOFF_BASES = CAPTURE_SERVICE_URL
  ? [CAPTURE_SERVICE_URL]
  : ["http://127.0.0.1:5511", "http://localhost:5511"];
const HANDOFF_POLL_INTERVAL = 2500;
let handoffBaseIndex = 0;
let handoffPollTimer: ReturnType<typeof setInterval> | null = null;
let handoffPollInFlight = false;

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
  if (!data) {
    figma.ui.postMessage({
      type: "error",
      message: "No schema payload received.",
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
    const message =
      error instanceof Error
        ? error.message
        : "Import failed. See console for details.";
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

async function pollHandoffJobs(): Promise<void> {
  handoffPollInFlight = true;
  try {
    if (isImporting) {
      await pingHandoffHealth();
      return;
    }

    const isCloudService = !!CAPTURE_SERVICE_URL;
    const endpoint = `${currentHandoffBase()}/api/jobs/next`;

    const headers: Record<string, string> = {
      "cache-control": "no-cache",
    };

    if (CAPTURE_SERVICE_API_KEY) {
      headers["x-api-key"] = CAPTURE_SERVICE_API_KEY;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 204) {
        // No jobs available (cloud service returns 204)
        updateServerConnection("connected");
        postHandoffStatus("waiting");
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

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
      applyTelemetry(body?.telemetry || null);

      if (body?.job?.payload) {
        const payload = decompressPayload(body.job.payload);
        postHandoffStatus("job-ready", `Importing job ${body.job.id}`);
        await handleImportRequest(payload, undefined, "auto-import");
      } else {
        postHandoffStatus("waiting");
      }
    }
  } catch (error) {
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
      const compressedData = Uint8Array.from(atob(payload.data), (c) =>
        c.charCodeAt(0)
      );
      const jsonString = pako.inflate(compressedData, { to: "string" });
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to decompress payload:", e);
      throw new Error("Failed to decompress payload");
    }
  }
  return payload;
}

async function pingHandoffHealth(): Promise<void> {
  try {
    const response = await fetch(
      `${currentHandoffBase()}/api/health?source=plugin`,
      {
        headers: { "cache-control": "no-cache" },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = (await response.json()) as HandoffHealthResponse;
    applyTelemetry(body?.telemetry || null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateServerConnection("disconnected");
    postHandoffStatus("error", message);
    rotateHandoffBase();
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
