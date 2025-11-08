let capturedData: any = null;
let validationReport: any = null;
let previewWithOverlay: string | null = null;
let originalScreenshot: string | null = null;
let showingOverlay = false;

const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const sendToFigmaBtn = document.getElementById('send-to-figma-btn') as HTMLButtonElement;
const captureDownloadBtn = document.getElementById('capture-download-btn') as HTMLButtonElement;
const captureRemoteBtn = document.getElementById('capture-remote-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const screenshotImg = document.getElementById('screenshot') as HTMLImageElement;
const screenshotContainer = document.getElementById('screenshot-container') as HTMLDivElement;
const statsEl = document.getElementById('stats') as HTMLDivElement;
const actionsEl = document.getElementById('actions') as HTMLDivElement;
const statElements = document.getElementById('stat-elements') as HTMLSpanElement;
const statSize = document.getElementById('stat-size') as HTMLSpanElement;
const handoffStatusEl = document.getElementById('handoff-status') as HTMLDivElement;
const previewCard = document.getElementById('preview-card') as HTMLDivElement;
const previewTitleEl = document.getElementById('preview-title') as HTMLSpanElement;
const previewUrlEl = document.getElementById('preview-url') as HTMLSpanElement;
const previewTimestampEl = document.getElementById('preview-timestamp') as HTMLSpanElement;
const openPreviewBtn = document.getElementById('open-preview-btn') as HTMLButtonElement;
const toggleOverlayBtn = document.getElementById('toggle-overlay-btn') as HTMLButtonElement;
const validationSummary = document.getElementById('validation-summary') as HTMLDivElement;
const validationStatus = document.getElementById('validation-status') as HTMLSpanElement;
const validationDetails = document.getElementById('validation-details') as HTMLSpanElement;
const targetUrlInput = document.getElementById('target-url') as HTMLInputElement;
const serverIndicator = createIndicator('server');
const pluginIndicator = createIndicator('plugin');
const transferIndicator = createIndicator('transfer');
const defaultCaptureLabel = captureBtn?.textContent || '📸 Capture & Send to Figma';
const defaultSendBtnLabel = sendToFigmaBtn?.textContent || '🚀 Send to Figma';

// Progress elements
const progressSection = document.getElementById('progress-section') as HTMLDivElement;
const progressPhaseEl = document.getElementById('progress-phase') as HTMLSpanElement;
const progressPercentEl = document.getElementById('progress-percent') as HTMLSpanElement;
const progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement;
const progressMessageEl = document.getElementById('progress-message') as HTMLDivElement;
const progressStats = document.getElementById('progress-stats') as HTMLDivElement;
const progressStatElements = document.getElementById('progress-stat-elements') as HTMLSpanElement;
const progressStatFigma = document.getElementById('progress-stat-figma') as HTMLSpanElement;
const progressStatImages = document.getElementById('progress-stat-images') as HTMLSpanElement;
const progressStatStyles = document.getElementById('progress-stat-styles') as HTMLSpanElement;
const progressStatFonts = document.getElementById('progress-stat-fonts') as HTMLSpanElement;

type IndicatorState = 'idle' | 'connected' | 'warning' | 'disconnected';
type TransferState = 'idle' | 'pending' | 'delivered' | 'error';

interface ConnectionIndicator {
  dot: HTMLSpanElement;
  detail: HTMLSpanElement;
}

interface ViewportSelection {
  name: string;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
}

interface HandoffTelemetry {
  queueLength?: number;
  lastExtensionPingAt?: number | null;
  lastExtensionTransferAt?: number | null;
  lastPluginPollAt?: number | null;
  lastPluginDeliveryAt?: number | null;
  lastQueuedJobId?: string | null;
  lastDeliveredJobId?: string | null;
}

interface BackgroundHandoffState {
  status: 'idle' | 'queued' | 'sending' | 'success' | 'error';
  trigger?: 'auto' | 'manual' | null;
  lastAttemptAt?: number | null;
  lastSuccessAt?: number | null;
  error?: string | null;
  pendingCount?: number;
  nextRetryAt?: number | null;
}

let healthInterval: number | null = null;
let lastTelemetryTransferAt: number | null = null;
let currentTransferState: TransferState = 'idle';
let captureReady = false;
let currentCaptureMode: 'send' | 'download' = 'send';
let extractionTimeoutId: number | null = null;
let lastHandoffState: BackgroundHandoffState = {
  status: 'idle',
  trigger: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  error: null,
  pendingCount: 0,
  nextRetryAt: null
};

console.log('🎨 Popup loaded');
startConnectionMonitor();
updateTransferIndicator('idle', 'Idle');
applyHandoffState(lastHandoffState);
void initializeHandoffState();

captureBtn.addEventListener('click', () => {
  void startCapture('send');
});

captureDownloadBtn.addEventListener('click', () => {
  void startCapture('download');
});

captureRemoteBtn?.addEventListener('click', () => {
  void startRemoteCapture();
});

async function startCapture(mode: 'send' | 'download' = 'send') {
  console.log('🔵 Capture requested', mode === 'download' ? '(download only)' : '(auto-send enabled)');
  currentCaptureMode = mode;

  const selectedViewports = getSelectedViewports();
  if (selectedViewports.length === 0) {
    statusEl.textContent = '⚠️ Please select at least one viewport';
    return;
  }

  const targetUrlRaw = targetUrlInput?.value.trim() || '';

  try {
    await chrome.runtime.sendMessage({ type: 'SET_CAPTURE_MODE', mode });
  } catch (error) {
    console.warn('Failed to set capture mode:', error);
  }

  captureReady = false;
  applyHandoffState(lastHandoffState);
  setCaptureButtonLoading(true);

  // Reset progress UI for new capture
  resetProgressUI();

  const statusPrefix = `🔄 Capturing ${selectedViewports.length} viewport${selectedViewports.length > 1 ? 's' : ''}...`;
  statusEl.textContent =
    mode === 'download'
      ? `${statusPrefix} JSON will download when complete.`
      : `${statusPrefix} Sending to Figma automatically when done.`;

  handoffStatusEl?.classList.add('hidden');
  previewCard?.classList.add('hidden');
  screenshotContainer.classList.add('hidden');
  previewUrlEl.textContent = '';
  previewTimestampEl.textContent = '';
  openPreviewBtn.disabled = true;
  updateTransferIndicator('pending', 'Capturing page…');

  try {
    const captureTabId = await resolveCaptureTabId(targetUrlRaw);
    console.log('📍 Capture tab ready:', captureTabId, targetUrlRaw || 'active tab');

    console.log('💉 Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: captureTabId },
      files: ['content-script.js']
    });
    console.log('✅ Content script injected');

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('📤 Sending START_CAPTURE message with viewports:', selectedViewports);
    chrome.tabs.sendMessage(captureTabId, {
      type: 'START_CAPTURE',
      viewports: selectedViewports
    }, (response) => {
      console.log('📥 Response from content script:', response);
      if (chrome.runtime.lastError) {
        console.error('❌ Message error:', chrome.runtime.lastError);
        statusEl.textContent = '❌ Failed: ' + chrome.runtime.lastError.message;
        setCaptureButtonLoading(false);
      }
    });

  } catch (error) {
    console.error('❌ Capture error:', error);
    statusEl.textContent =
      error instanceof Error ? `❌ Failed: ${error.message}` : '❌ Failed to capture';
    updateTransferIndicator('error', 'Capture failed');
    setCaptureButtonLoading(false);
    
    // Clear extraction timeout and hide progress on error
    clearExtractionTimeout();
    progressSection.classList.add('hidden');
  }
}

async function startRemoteCapture() {
  console.log('☁️ Remote capture requested (Playwright/Puppeteer pipeline)');
  statusEl.textContent = '☁️ Preparing remote capture...';
  setCaptureButtonLoading(true);
  handoffStatusEl?.classList.add('hidden');
  previewCard?.classList.add('hidden');
  screenshotContainer.classList.add('hidden');
  actionsEl.classList.add('hidden');

  try {
    const manualUrl = normalizeTargetUrl(targetUrlInput?.value);
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const fallbackUrl = activeTab?.url || '';
    const targetUrl = manualUrl || fallbackUrl;

    if (!targetUrl) {
      throw new Error('No URL available to capture');
    }
    if (isRestrictedUrl(targetUrl)) {
      throw new Error('Cannot capture internal browser pages');
    }

    statusEl.textContent = `☁️ Server capturing ${targetUrl}...`;

    const response = await chrome.runtime.sendMessage({
      type: 'REMOTE_CAPTURE_REQUEST',
      targetUrl
    });

    if (!response?.ok || !response.data) {
      throw new Error(response?.error || 'Remote capture failed');
    }

    capturedData = response.data;
    validationReport = response.validationReport;
    previewWithOverlay = response.previewWithOverlay;
    originalScreenshot = capturedData.screenshot || null;
    showingOverlay = false;
    captureReady = true;

    statusEl.textContent = '✅ Server capture complete! Ready to download or send.';
    actionsEl.classList.remove('hidden');
    downloadBtn.disabled = false;
    setCaptureButtonLoading(false);
    updateTransferIndicator('idle', 'Ready to send');

  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Remote capture failed';
    let hint = '';
    if (/Failed to fetch|NetworkError/i.test(rawMessage)) {
      hint = 'Is the handoff server running on http://127.0.0.1:4411 ?';
    } else if (/injected script not built/i.test(rawMessage)) {
      hint = 'Run `cd chrome-extension && npm run build` before starting the server.';
    }
    console.error('Remote capture failed:', error);
    statusEl.textContent = `❌ ${rawMessage}${hint ? ` — ${hint}` : ''}`;
    setCaptureButtonLoading(false);
    updateTransferIndicator('error', 'Remote capture failed');
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Popup received message:', message.type);

  if (message.type === 'CAPTURE_PROGRESS') {
    // Update status with viewport progress
    const { status, current, total, viewport } = message;
    if (current && total) {
      statusEl.textContent = `🔄 [${current}/${total}] ${status}`;

      // Update transfer indicator with more details
      const progressPercent = Math.round((current / total) * 100);
      updateTransferIndicator('pending', `${viewport || 'Viewport'} ${progressPercent}%`);
    } else {
      statusEl.textContent = `🔄 ${status}`;
    }
  }

  if (message.type === 'EXTRACTION_PROGRESS') {
    // Show progress section
    progressSection.classList.remove('hidden');

    // Update progress bar and phase
    const { phase, message: progressMessage, percent, stats } = message;
    progressPhaseEl.textContent = phase.replace(/-/g, ' ');
    progressPercentEl.textContent = `${Math.round(percent)}%`;
    progressBarFill.style.width = `${percent}%`;
    progressMessageEl.textContent = progressMessage || '';

    // Update stats if available
    if (stats) {
      progressStats.classList.remove('hidden');
      progressStatElements.textContent = stats.elementsProcessed || '0';
      progressStatFigma.textContent = stats.figmaNodesCreated || '0';
      progressStatImages.textContent = stats.imagesExtracted || '0';
      progressStatStyles.textContent = stats.stylesCollected || '0';
      progressStatFonts.textContent = stats.fontsDetected || '0';
    }

    // Hide progress section when complete
    if (phase === 'complete') {
      setTimeout(() => {
        progressSection.classList.add('hidden');
      }, 2000);
    }

    // Reset extraction timeout on each progress update
    resetExtractionTimeout();
  }

  if (message.type === 'CAPTURE_COMPLETE') {
    capturedData = message.data;
    validationReport = message.validationReport;
    previewWithOverlay = message.previewWithOverlay;
    originalScreenshot = capturedData.screenshot;
    showingOverlay = false;

    const dataSizeKB = message.dataSizeKB || '0';
    const completionMessage = `✅ Capture complete! (${dataSizeKB} KB)`;

    statusEl.textContent = completionMessage;
    
    // Clear extraction timeout since capture completed
    clearExtractionTimeout();
    
    // Hide progress section for chunked transfers (regular transfers hide it via EXTRACTION_PROGRESS)
    if (message.chunked) {
      setTimeout(() => {
        progressSection.classList.add('hidden');
      }, 1500);
    }
    
    // Keep capture button disabled until handoff completes
    captureBtn.disabled = true;
    captureBtn.textContent = '⏳ Preparing handoff...';

    // Show screenshot (original by default)
    if (originalScreenshot) {
      screenshotImg.src = originalScreenshot;
      screenshotContainer.classList.remove('hidden');
      previewCard.classList.remove('hidden');

      // Enable overlay toggle if we have it
      if (previewWithOverlay) {
        toggleOverlayBtn.disabled = false;
        toggleOverlayBtn.classList.remove('active');
      }
    }

    // Display validation summary
    if (validationReport) {
      displayValidationSummary(validationReport);
    }

    updatePreviewMeta(capturedData);

    // Show stats
    let count = 0;
    if (capturedData.multiViewport && capturedData.captures) {
      // Sum elements from all viewports
      for (const capture of capturedData.captures) {
        count += countElements(capture.data?.tree);
      }
    } else {
      count = countElements(capturedData.tree);
    }
    statElements.textContent = count.toString();
    statSize.textContent = `${dataSizeKB} KB`;
    statsEl.classList.remove('hidden');

    captureReady = true;
    downloadBtn.disabled = false;
    actionsEl.classList.remove('hidden');

    if (currentCaptureMode === 'download') {
      statusEl.textContent = `${completionMessage} Downloading JSON…`;
      downloadCapturedData(false);
      updateTransferIndicator('idle', 'Ready to send');
    } else {
      applyHandoffState(lastHandoffState);
      statusEl.textContent = `${completionMessage} Dispatching to Figma…`;
    }
    currentCaptureMode = 'send';
  }

  if (message.type === 'CAPTURE_DOWNLOAD_READY') {
    capturedData = message.data;
    validationReport = message.validationReport || null;
    previewWithOverlay = message.previewWithOverlay || null;
    originalScreenshot = capturedData?.screenshot || null;
    showingOverlay = false;

    const sizeKB = message.dataSizeKB || '0';
    statusEl.textContent = `✅ Capture complete! (${sizeKB} KB) Downloading JSON…`;
    setCaptureButtonLoading(false);
    captureReady = true;
    actionsEl.classList.remove('hidden');
    downloadBtn.disabled = false;
    downloadCapturedData(false);
    updateTransferIndicator('idle', 'Ready to send');
    currentCaptureMode = 'send';
  }

  if (message.type === 'HANDOFF_STATUS_UPDATE') {
    applyHandoffState(message.state as BackgroundHandoffState, message.hasCapture);
  }

  if (message.type === 'CAPTURE_SIZE_WARNING') {
    const { sizeKB, maxSizeKB } = message;
    statusEl.textContent = `⚠️ Large capture (${sizeKB}KB) - using chunked transfer...`;
    console.warn(`Capture size ${sizeKB}KB exceeds recommended ${maxSizeKB}KB limit`);
  }

  sendResponse({ received: true });
});

sendToFigmaBtn.addEventListener('click', () => {
  void sendCapturedDataToFigma();
});

downloadBtn.addEventListener('click', () => {
  downloadCapturedData(true);
});

openPreviewBtn.addEventListener('click', () => {
  if (!capturedData) return;

  const targetUrl = capturedData.metadata?.url;
  if (targetUrl) {
    chrome.tabs.create({ url: targetUrl });
    return;
  }

  if (capturedData.screenshot) {
    const viewerUrl = capturedData.screenshot;
    chrome.tabs.create({ url: viewerUrl });
  }
});

function countElements(node: any): number {
  if (!node) return 0;
  let count = 1;
  for (const child of node.children || []) {
    count += countElements(child);
  }
  return count;
}

function updatePreviewMeta(data: any) {
  const title = data?.metadata?.title || 'Preview ready';
  const url = data?.metadata?.url || '';
  const timestamp = data?.metadata?.timestamp;
  const canOpen = Boolean(url || data?.screenshot);
  openPreviewBtn.disabled = !canOpen;

  previewTitleEl.textContent = title.length > 60 ? `${title.slice(0, 57)}…` : title;

  if (url) {
    previewUrlEl.textContent = url;
    previewUrlEl.title = url;
  } else {
    previewUrlEl.textContent = '';
    previewUrlEl.title = '';
  }

  if (timestamp) {
    try {
      const formatted = new Date(timestamp).toLocaleString();
      previewTimestampEl.textContent = formatted;
    } catch {
      previewTimestampEl.textContent = '';
    }
  } else {
    previewTimestampEl.textContent = '';
  }
}

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('chrome-extension://')
  );
}

function normalizeTargetUrl(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function startConnectionMonitor() {
  if (healthInterval) return;
  runHealthCheck();
  healthInterval = window.setInterval(runHealthCheck, 5000);
}

async function runHealthCheck() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'HANDOFF_HEALTH_CHECK' });
    if (!response || !response.ok || !response.health) {
      throw new Error(response?.error || 'No health payload');
    }

    const telemetry = (response.health.telemetry || {}) as HandoffTelemetry;
    updateServerIndicator(telemetry);
    updatePluginIndicator(telemetry);
    syncTransferIndicatorFromTelemetry(telemetry);
    clearHandoffErrorIfResolved();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    setIndicator(serverIndicator, 'disconnected', message);
    showHandoffError(`Handoff server offline: ${message}`);
  }
}

function updateServerIndicator(telemetry: HandoffTelemetry) {
  const queueLabel = typeof telemetry.queueLength === 'number'
    ? `${telemetry.queueLength} in queue`
    : 'Queue ready';
  const pluginHeartbeat = telemetry.lastPluginPollAt
    ? ` • Plugin ${formatRelativeTime(telemetry.lastPluginPollAt)}`
    : '';
  setIndicator(serverIndicator, 'connected', `${queueLabel}${pluginHeartbeat}`.trim());
}

function updatePluginIndicator(telemetry: HandoffTelemetry) {
  const lastSeen = telemetry.lastPluginPollAt;
  if (!lastSeen) {
    setIndicator(pluginIndicator, 'warning', 'Waiting for plugin heartbeat…');
    return;
  }

  const ageMs = Date.now() - lastSeen;
  if (ageMs < 7000) {
    setIndicator(pluginIndicator, 'connected', `Heartbeat ${formatRelativeTime(lastSeen)}`);
  } else if (ageMs < 30000) {
    setIndicator(pluginIndicator, 'warning', `Last seen ${formatRelativeTime(lastSeen)}`);
  } else {
    setIndicator(pluginIndicator, 'disconnected', `No contact ${formatRelativeTime(lastSeen)}`);
  }
}

function syncTransferIndicatorFromTelemetry(telemetry: HandoffTelemetry) {
  if (!telemetry.lastExtensionTransferAt) return;
  if (lastTelemetryTransferAt === telemetry.lastExtensionTransferAt) return;
  lastTelemetryTransferAt = telemetry.lastExtensionTransferAt;
  if (currentTransferState === 'pending') return;
  updateTransferIndicator('delivered', `Last handoff ${formatRelativeTime(telemetry.lastExtensionTransferAt)}`);
}

function updateTransferIndicator(state: TransferState, detail: string) {
  let indicatorState: IndicatorState = 'idle';
  switch (state) {
    case 'pending':
      indicatorState = 'warning';
      break;
    case 'delivered':
      indicatorState = 'connected';
      break;
    case 'error':
      indicatorState = 'disconnected';
      break;
    default:
      indicatorState = 'idle';
  }
  currentTransferState = state;
  setIndicator(transferIndicator, indicatorState, detail);
}

function createIndicator(prefix: 'server' | 'plugin' | 'transfer'): ConnectionIndicator {
  const dot = document.getElementById(`${prefix}-connection-dot`) as HTMLSpanElement;
  const detail = document.getElementById(`${prefix}-connection-detail`) as HTMLSpanElement;
  return {
    dot,
    detail
  };
}

function setIndicator(indicator: ConnectionIndicator, state: IndicatorState, detail: string) {
  if (!indicator?.dot || !indicator?.detail) return;
  indicator.dot.classList.remove('idle', 'connected', 'warning', 'disconnected');
  indicator.dot.classList.add(state);
  indicator.detail.textContent = detail;
}

function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return 'no signal';
  const diffMs = timestamp - Date.now();
  if (diffMs > 0) {
    const futureSeconds = Math.round(diffMs / 1000);
    if (futureSeconds < 1) return 'in a moment';
    if (futureSeconds < 60) return `in ${futureSeconds}s`;
    const futureMinutes = Math.floor(futureSeconds / 60);
    if (futureMinutes < 60) return `in ${futureMinutes}m`;
    const futureHours = Math.floor(futureMinutes / 60);
    return `in ${futureHours}h`;
  }

  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diffSeconds < 1) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function clearHandoffErrorIfResolved() {
  if (!handoffStatusEl) return;
  if (handoffStatusEl.classList.contains('error')) {
    handoffStatusEl.textContent = '✅ Handoff server online';
    handoffStatusEl.className = 'handoff-status success';
    setTimeout(() => handoffStatusEl.classList.add('hidden'), 1500);
  }
}

function showHandoffError(message: string) {
  if (!handoffStatusEl) return;
  handoffStatusEl.textContent = `⚠️ ${message}`;
  handoffStatusEl.className = 'handoff-status error';
  handoffStatusEl.classList.remove('hidden');
}

// Toggle overlay button handler
toggleOverlayBtn.addEventListener('click', () => {
  if (!originalScreenshot || !previewWithOverlay) return;

  showingOverlay = !showingOverlay;

  if (showingOverlay) {
    screenshotImg.src = previewWithOverlay;
    toggleOverlayBtn.classList.add('active');
    toggleOverlayBtn.title = 'Show original screenshot';
  } else {
    screenshotImg.src = originalScreenshot;
    toggleOverlayBtn.classList.remove('active');
    toggleOverlayBtn.title = 'Show element overlay';
  }
});

// Display validation summary
function displayValidationSummary(report: any) {
  if (!report || !validationSummary) return;

  validationSummary.classList.remove('hidden');

  const statusText = report.valid ? '✅ Layout Valid' : '⚠️ Layout Issues Found';
  validationStatus.textContent = statusText;
  validationStatus.className = `validation-status ${report.valid ? 'valid' : 'invalid'}`;

  const errors = report.issues.filter((i: any) => i.severity === 'error').length;
  const warnings = report.issues.filter((i: any) => i.severity === 'warning').length;
  const info = report.issues.filter((i: any) => i.severity === 'info').length;

  const parts = [];
  if (errors > 0) parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
  if (info > 0) parts.push(`${info} info`);

  if (parts.length > 0) {
    validationDetails.textContent = parts.join(', ') + ` • ${report.totalNodes} nodes validated`;
  } else {
    validationDetails.textContent = `All ${report.totalNodes} nodes passed validation`;
  }
}

function getSelectedViewports(): ViewportSelection[] {
  const viewports: ViewportSelection[] = [];
  const mobile = document.getElementById('viewport-mobile') as HTMLInputElement;
  const tablet = document.getElementById('viewport-tablet') as HTMLInputElement;
  const desktop = document.getElementById('viewport-desktop') as HTMLInputElement;

  if (mobile?.checked) {
    viewports.push({ name: 'Mobile', width: 375, height: 812, deviceScaleFactor: 2 });
  }
  if (tablet?.checked) {
    viewports.push({ name: 'Tablet', width: 768, height: 1024, deviceScaleFactor: 2 });
  }
  if (desktop?.checked) {
    // Use dynamic desktop size detection - let content script auto-detect the actual screen size
    viewports.push({ name: 'Desktop' }); // No hardcoded dimensions - content script will detect them
  }

  return viewports;
}

function setCaptureButtonLoading(isLoading: boolean) {
  if (!captureBtn) return;
  captureBtn.disabled = isLoading;
  if (captureDownloadBtn) {
    captureDownloadBtn.disabled = isLoading;
    captureDownloadBtn.textContent = isLoading ? '⏳ Capturing...' : '📸⬇️ Capture & Download JSON';
  }
  if (captureRemoteBtn) {
    captureRemoteBtn.disabled = isLoading;
  }
  captureBtn.textContent = isLoading ? '⏳ Capturing...' : defaultCaptureLabel;
}

function resetProgressUI() {
  // Hide progress section and reset all progress indicators
  progressSection.classList.add('hidden');
  progressPhaseEl.textContent = 'Initializing...';
  progressPercentEl.textContent = '0%';
  progressBarFill.style.width = '0%';
  progressMessageEl.textContent = 'Starting extraction...';
  progressStats.classList.add('hidden');
  
  // Reset progress stats
  progressStatElements.textContent = '0';
  progressStatFigma.textContent = '0';
  progressStatImages.textContent = '0';
  progressStatStyles.textContent = '0';
  progressStatFonts.textContent = '0';

  // Clear any existing extraction timeout
  clearExtractionTimeout();
}

function resetExtractionTimeout() {
  clearExtractionTimeout();
  // Set 3-minute timeout for extraction process
  extractionTimeoutId = window.setTimeout(() => {
    console.warn('⏰ Extraction timeout - hiding progress UI');
    progressSection.classList.add('hidden');
    statusEl.textContent = '⚠️ Extraction timed out - page may be too complex';
    captureBtn.disabled = false;
    captureBtn.textContent = defaultCaptureLabel;
    updateTransferIndicator('error', 'Extraction timeout');
  }, 180000); // 3 minutes
}

function clearExtractionTimeout() {
  if (extractionTimeoutId !== null) {
    clearTimeout(extractionTimeoutId);
    extractionTimeoutId = null;
  }
}

async function resolveCaptureTabId(targetUrlRaw: string): Promise<number> {
  const trimmed = targetUrlRaw.trim();
  
  try {
    const activeTab = await getActiveContentTab();

    if (trimmed) {
      const normalized = normalizeUrl(trimmed);
      if (!normalized) {
        throw new Error('Please enter a valid URL (https://example.com).');
      }

      if (activeTab && typeof activeTab.id === 'number') {
        const activeUrl = activeTab.url || '';
        if (!isRestrictedUrl(activeUrl) && normalizeForComparison(activeUrl) === normalizeForComparison(normalized)) {
          if (activeTab.status !== 'complete') {
            await waitForTabToLoad(activeTab.id);
          }
          return activeTab.id;
        }

        try {
          await chrome.tabs.update(activeTab.id, { url: normalized, active: true });
          await waitForTabToLoad(activeTab.id);
          return activeTab.id;
        } catch (error) {
          console.warn('Failed to update existing tab, creating a new one instead.', error);
          // Continue to create new tab below
        }
      }

      // Create new tab with enhanced error handling
      try {
        const newTab = await chrome.tabs.create({ url: normalized, active: true });
        if (!newTab?.id) {
          throw new Error('Failed to create tab - browser may have blocked the request');
        }
        await waitForTabToLoad(newTab.id);
        return newTab.id;
      } catch (tabError) {
        throw new Error(`Failed to open target URL: ${tabError instanceof Error ? tabError.message : 'Unknown error'}`);
      }
    }

    // Handle case where no URL is provided
    if (!activeTab || typeof activeTab.id !== 'number') {
      throw new Error('No open webpage found. Enter a URL above to capture.');
    }

    if (isRestrictedUrl(activeTab.url)) {
      const suggestions = [
        'Try opening a regular website like https://example.com',
        'Navigate to a non-restricted page in the active tab',
        'Enter a specific URL in the field above'
      ];
      throw new Error(`Cannot capture restricted pages (${activeTab.url?.split('://')[0]}://). ${suggestions[Math.floor(Math.random() * suggestions.length)]}`);
    }

    if (activeTab.status !== 'complete') {
      await waitForTabToLoad(activeTab.id);
    }

    return activeTab.id;
  } catch (error) {
    // Enhanced error context for debugging
    if (error instanceof Error) {
      throw new Error(`Tab resolution failed: ${error.message}`);
    }
    throw new Error(`Tab resolution failed: ${String(error)}`);
  }
}

function normalizeUrl(input: string): string | null {
  if (!input.trim()) return null;
  try {
    const withScheme = /^[a-zA-Z]+:\/\//.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
    const url = new URL(withScheme);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    let path = parsed.pathname || '/';
    path = path.replace(/\/+$/, '/');
    return `${parsed.origin}${path}`;
  } catch {
    return url;
  }
}

function waitForTabToLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let completed = false;
    const timeout = window.setTimeout(() => {
      if (completed) return;
      completed = true;
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Timed out waiting for page to load'));
    }, 45000);

    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (completed) return;
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        completed = true;
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs
      .get(tabId)
      .then((tab) => {
        if (completed) return;
        if (tab.status === 'complete') {
          completed = true;
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      })
      .catch(() => {
        // Ignore lookup failures; rely on listener/timeout
      });
  });
}

async function getActiveContentTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const window = await chrome.windows.getLastFocused({
      populate: true,
      windowTypes: ['normal']
    });
    const activeTab = window?.tabs?.find(tab => tab.active);
    if (activeTab) {
      return activeTab;
    }
  } catch (error) {
    console.warn('Failed to get last focused normal window:', error);
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
    windowType: 'normal'
  });
  return tab || null;
}

async function sendCapturedDataToFigma(manualTriggered = true) {
  console.log(manualTriggered ? '🚀 Send to Figma clicked' : '🤖 Background resend requested');

  // Error boundary wrapper
  const handleError = (error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error in ${context}:`, error);
    statusEl.textContent = `❌ Failed to send: ${message}`;
    
    if (handoffStatusEl) {
      handoffStatusEl.textContent = `⚠️ Failed: ${message}`;
      handoffStatusEl.className = 'handoff-status error';
      handoffStatusEl.classList.remove('hidden');
    }
    updateTransferIndicator('error', 'Send failed');
  };

  try {
    // Validate captured data before sending
    if (!capturedData) {
      throw new Error('No capture data available to send');
    }

    // Validate data size
    const dataSize = JSON.stringify(capturedData).length;
    const maxSize = 32 * 1024 * 1024; // 32MB limit
    
    if (dataSize > maxSize) {
      throw new Error(`Capture data too large: ${(dataSize / 1024 / 1024).toFixed(1)}MB exceeds 32MB limit`);
    }

    if (manualTriggered) {
      statusEl.textContent = '📡 Sending capture to Figma...';
    }

    const response = await chrome.runtime.sendMessage({
      type: 'SEND_TO_HANDOFF',
      data: capturedData
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || 'Failed to contact handoff server');
    }

  } catch (error) {
    handleError(error, 'sendCapturedDataToFigma');
  }
}

function downloadCapturedData(manualTrigger = false) {
  console.log('💾 Download requested', manualTrigger ? '(manual)' : '(auto)');
  if (!capturedData) {
    if (manualTrigger) {
      statusEl.textContent = '⚠️ No capture is ready to download yet.';
    }
    return;
  }

  try {
    if (manualTrigger) {
      statusEl.textContent = '💾 Preparing download…';
    }
    const serialized = JSON.stringify(capturedData);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to prepare download';
    console.error('Download failed:', error);
    statusEl.textContent = `❌ Download failed: ${message}`;
  }
}

async function initializeHandoffState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_HANDOFF_STATE' });
    if (response?.ok && response.state) {
      if (response.hasCapture) {
        captureReady = true;
        actionsEl.classList.remove('hidden');
      }
      applyHandoffState(response.state as BackgroundHandoffState, response.hasCapture);
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize handoff state', error);
  }
}

function applyHandoffState(state: BackgroundHandoffState, hasCaptureFromBackground?: boolean) {
  if (!state) return;

  lastHandoffState = {
    status: state.status,
    trigger: state.trigger ?? null,
    lastAttemptAt: state.lastAttemptAt ?? null,
    lastSuccessAt: state.lastSuccessAt ?? null,
    error: state.error ?? null
  };

  if (hasCaptureFromBackground) {
    captureReady = true;
  }

  const hasCapture = captureReady || Boolean(hasCaptureFromBackground);
  const isSending = state.status === 'sending';

  if (hasCapture) {
    actionsEl.classList.remove('hidden');
  }

  sendToFigmaBtn.disabled = !hasCapture || isSending;
  sendToFigmaBtn.textContent = isSending
    ? state.trigger === 'auto'
      ? '🚀 Auto-sending...'
      : '🚀 Sending...'
    : defaultSendBtnLabel;

  switch (state.status) {
    case 'sending': {
      const detail =
        state.trigger === 'auto'
          ? 'Auto-sending to handoff server...'
          : 'Sending to handoff server...';
      updateTransferIndicator('pending', detail);
      if (handoffStatusEl) {
        handoffStatusEl.textContent = detail;
        handoffStatusEl.className = 'handoff-status';
        handoffStatusEl.classList.remove('hidden');
      }
      break;
    }
    case 'queued': {
      const detail =
        state.pendingCount && state.pendingCount > 0
          ? `Waiting to send (${state.pendingCount} in queue)`
          : 'Waiting to send to handoff server...';
      updateTransferIndicator('pending', detail);
      if (handoffStatusEl) {
        handoffStatusEl.textContent = state.nextRetryAt
          ? `${detail} • retry ${formatRelativeTime(state.nextRetryAt)}`
          : detail;
        handoffStatusEl.className = 'handoff-status';
        handoffStatusEl.classList.remove('hidden');
      }
      statusEl.textContent = '⏳ Capture queued for delivery…';
      break;
    }
    case 'success': {
      updateTransferIndicator('delivered', 'Delivered to handoff server');
      statusEl.textContent = '✅ Sent to Figma! Check the plugin.';
      if (handoffStatusEl) {
        handoffStatusEl.textContent = '✅ Data sent to handoff server for Figma plugin';
        handoffStatusEl.className = 'handoff-status success';
        handoffStatusEl.classList.remove('hidden');
      }
      // Re-enable capture button after successful handoff
      captureBtn.disabled = false;
      captureBtn.textContent = defaultCaptureLabel;
      break;
    }
    case 'error': {
      updateTransferIndicator('error', 'Send failed');
      const message = state.error || 'Unknown error';
      statusEl.textContent = `❌ Failed to send: ${message}`;
      if (handoffStatusEl) {
        handoffStatusEl.textContent = `⚠️ Failed: ${message}`;
        handoffStatusEl.className = 'handoff-status error';
        handoffStatusEl.classList.remove('hidden');
      }
      // Re-enable capture button after error
      captureBtn.disabled = false;
      captureBtn.textContent = defaultCaptureLabel;
      sendToFigmaBtn.disabled = !hasCapture;
      sendToFigmaBtn.textContent = hasCapture ? 'Retry Send to Figma' : defaultSendBtnLabel;
      break;
    }
    default: {
      if (hasCapture) {
        updateTransferIndicator('idle', 'Ready to send');
      }
      if (handoffStatusEl && handoffStatusEl.classList.contains('success')) {
        setTimeout(() => handoffStatusEl.classList.add('hidden'), 1500);
      }
      break;
    }
  }
}

// Initialize desktop viewport label with actual screen dimensions
function updateDesktopViewportLabel() {
  const desktopLabel = document.getElementById('desktop-viewport-label');
  if (!desktopLabel) return;
  
  // Get current tab to access screen dimensions
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // Execute script in the current tab to get screen dimensions
      chrome.tabs.executeScript(tabs[0].id!, {
        code: `
          const screenWidth = screen.width;
          const screenHeight = screen.height;
          const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
          const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
          const devicePixelRatio = window.devicePixelRatio || 1;
          
          // Send back the detected dimensions
          ({screenWidth, screenHeight, viewportWidth, viewportHeight, devicePixelRatio});
        `
      }, (result) => {
        if (result && result[0]) {
          const { screenWidth, screenHeight, viewportWidth, viewportHeight } = result[0];
          const displayWidth = screenWidth || viewportWidth || 1440;
          const displayHeight = screenHeight || viewportHeight || 900;
          desktopLabel.textContent = `💻 Desktop (${displayWidth}×${displayHeight})`;
        }
      });
    }
  });
}

// Initialize the popup when DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateDesktopViewportLabel);
} else {
  updateDesktopViewportLabel();
}
