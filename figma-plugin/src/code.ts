import uiHtml from '../ui/index.html';
import { FigmaImporter, ImportOptions } from './importer';
import { prepareLayoutSchema } from './layout-solver';
import { upgradeSelectionToAutoLayout } from './layout-upgrader';

figma.showUI(uiHtml, { width: 400, height: 600 });

const defaultImportOptions: ImportOptions = {
  createMainFrame: true,
  createVariantsFrame: false,
  createComponentsFrame: true,
  createDesignSystem: false,
  applyAutoLayout: false,
  createStyles: true,
  usePixelPerfectPositioning: true,  // Enable pixel-perfect positioning
  createScreenshotOverlay: true,     // Enable screenshot reference overlay
  showValidationMarkers: false      // Disable by default to avoid clutter
};

let isImporting = false;

// Handoff status tracking
type HandoffStatus = 'waiting' | 'job-ready' | 'error' | 'disconnected';
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
let chromeConnectionState: 'connected' | 'disconnected' = 'disconnected';
let serverConnectionState: 'connected' | 'disconnected' = 'disconnected';
const HANDOFF_BASES = ['http://127.0.0.1:4411', 'http://localhost:4411'];
const HANDOFF_POLL_INTERVAL = 2500;
let handoffBaseIndex = 0;
let handoffPollTimer: ReturnType<typeof setInterval> | null = null;
let handoffPollInFlight = false;

figma.on('run', (runEvent) => {
  if (runEvent.command === 'auto-import') {
    figma.ui.postMessage({ type: 'auto-import-ready' });
  }
  startHandoffPolling();
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'handoff-telemetry') {
    handleTelemetryFromUi(msg.telemetry as HandoffTelemetry | null);
    return;
  }

  if (msg.type === 'puppeteer-start-live-mode') {
    figma.ui.postMessage({ type: 'puppeteer-control-start' });
    return;
  }

  if (msg.type === 'import' || msg.type === 'auto-import' || msg.type === 'live-import') {
    await handleImportRequest(msg.data, msg.options, msg.type);
    return;
  }

  if (msg.type === 'upgrade-auto-layout') {
    upgradeSelectionToAutoLayout();
    return;
  }
};

async function handleImportRequest(
  schema: any,
  options: Partial<ImportOptions> | undefined,
  trigger: 'import' | 'auto-import' | 'live-import'
): Promise<void> {
  if (!schema) {
    figma.ui.postMessage({ type: 'error', message: 'No schema payload received.' });
    return;
  }

  if (isImporting) {
    figma.ui.postMessage({
      type: 'import-busy',
      message: 'An import is already running. Please wait for it to finish.'
    });
    return;
  }

  isImporting = true;

  const resolvedOptions: ImportOptions = {
    ...defaultImportOptions,
    ...(options || {})
  };

  try {
    figma.ui.postMessage({
      type: 'progress',
      message: 'Preparing Figma canvas...',
      percent: 5
    });

    prepareLayoutSchema(schema);
    const importer = new FigmaImporter(schema, resolvedOptions);
    await importer.run();

    const stats = importer.getStats();
    const enhancedStats = {
      ...stats,
      designTokens: schema.designTokens
        ? {
            colors: Object.keys(schema.designTokens.colors || {}).length,
            typography: Object.keys(schema.designTokens.typography || {}).length,
            spacing: Object.keys(schema.designTokens.spacing || {}).length,
            shadows: Object.keys(schema.designTokens.shadows || {}).length,
            borderRadius: Object.keys(schema.designTokens.borderRadius || {}).length
          }
        : null,
      extraction: schema.metadata?.extractionSummary
    };

    figma.ui.postMessage({ type: 'complete', stats: enhancedStats });
    figma.notify('✓ Import complete', { timeout: 3000 });
    postHandoffStatus('waiting');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Import failed. See console for details.';
    figma.ui.postMessage({ type: 'error', message });
    figma.notify(`✗ Import failed: ${message}`, { error: true });
    postHandoffStatus('error', message);
  } finally {
    isImporting = false;
  }
}

function postHandoffStatus(status: HandoffStatus, detail?: string, meta?: Record<string, any>) {
  if (status === lastHandoffStatus && status !== 'job-ready') {
    return;
  }

  lastHandoffStatus = status;
  figma.ui.postMessage({ type: 'handoff-status', status, detail, meta });
}

function updateChromeConnection(state: 'connected' | 'disconnected') {
  if (state === chromeConnectionState) return;
  chromeConnectionState = state;

  figma.ui.postMessage({
    type: state === 'connected' ? 'chrome-extension-connected' : 'chrome-extension-disconnected'
  });
}

function updateServerConnection(state: 'connected' | 'disconnected') {
  if (state === serverConnectionState) return;
  serverConnectionState = state;

  figma.ui.postMessage({
    type: state === 'connected' ? 'server-connected' : 'server-disconnected'
  });
}

function handleTelemetryFromUi(telemetry?: HandoffTelemetry | null) {
  figma.ui.postMessage({ type: 'handoff-telemetry', telemetry: telemetry || null });

  if (!telemetry) {
    updateServerConnection('disconnected');
    updateChromeConnection('disconnected');
    return;
  }

  const now = Date.now();
  const extensionHeartbeat =
    typeof telemetry.lastExtensionPingAt === 'number' && now - telemetry.lastExtensionPingAt < 8000;
  const pluginPolling =
    typeof telemetry.lastPluginPollAt === 'number' && now - telemetry.lastPluginPollAt < 8000;

  updateChromeConnection(extensionHeartbeat ? 'connected' : 'disconnected');
  updateServerConnection(pluginPolling ? 'connected' : 'disconnected');
}

function applyTelemetry(telemetry?: HandoffTelemetry | null): boolean {
  if (!telemetry) return false;

  const now = Date.now();
  const extensionHeartbeat =
    typeof telemetry.lastExtensionPingAt === 'number' && now - telemetry.lastExtensionPingAt < 8000;

  updateChromeConnection(extensionHeartbeat ? 'connected' : 'disconnected');
  figma.ui.postMessage({ type: 'handoff-telemetry', telemetry });
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
  return HANDOFF_BASES[handoffBaseIndex] || 'http://127.0.0.1:4411';
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

    const endpoint = `${currentHandoffBase()}/jobs/next`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'cache-control': 'no-cache' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    applyTelemetry(body?.telemetry || null);
    updateServerConnection('connected');

    if (body?.job?.payload) {
      postHandoffStatus('job-ready', `Importing job ${body.job.id}`);
      await handleImportRequest(body.job.payload, undefined, 'auto-import');
    } else {
      postHandoffStatus('waiting');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    postHandoffStatus('error', message);
    updateServerConnection('disconnected');
    rotateHandoffBase();
  } finally {
    handoffPollInFlight = false;
  }
}

async function pingHandoffHealth(): Promise<void> {
  try {
    const response = await fetch(`${currentHandoffBase()}/health?source=plugin`, {
      headers: { 'cache-control': 'no-cache' }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = await response.json();
    applyTelemetry(body?.telemetry || null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateServerConnection('disconnected');
    postHandoffStatus('error', message);
    rotateHandoffBase();
  }
}
