/**
 * Simplified popup for essential capture and download functionality
 */

let capturedData: any = null;

// Get DOM elements
const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const sendToFigmaBtn = document.getElementById('send-to-figma-btn') as HTMLButtonElement;
const captureDownloadBtn = document.getElementById('capture-download-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const actionsEl = document.getElementById('actions') as HTMLDivElement;
const progressSection = document.getElementById('progress-section') as HTMLDivElement;
const progressPhaseEl = document.getElementById('progress-phase') as HTMLSpanElement;
const progressPercentEl = document.getElementById('progress-percent') as HTMLSpanElement;
const progressRingIndicator = document.getElementById('progress-ring-indicator') as unknown as SVGCircleElement;
const progressMessageEl = document.getElementById('progress-message') as HTMLDivElement;
const serverIndicator = createIndicator('server');
const pluginIndicator = createIndicator('plugin');
const transferIndicator = createIndicator('transfer');

// Progress ring setup
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * 54;
if (progressRingIndicator) {
  progressRingIndicator.style.strokeDasharray = `${PROGRESS_RING_CIRCUMFERENCE}`;
  progressRingIndicator.style.strokeDashoffset = `${PROGRESS_RING_CIRCUMFERENCE}`;
}

type IndicatorState = 'idle' | 'connected' | 'warning' | 'disconnected';
type TransferState = 'idle' | 'pending' | 'delivered' | 'error';

interface ConnectionIndicator {
  dot: HTMLSpanElement | null;
  detail: HTMLSpanElement | null;
}

interface HandoffTelemetry {
  queueLength?: number;
  lastExtensionPingAt?: number | null;
  lastExtensionTransferAt?: number | null;
  lastPluginPollAt?: number | null;
  lastPluginDeliveryAt?: number | null;
}

let healthInterval: number | null = null;
let lastTelemetryTransferAt: number | null = null;
let currentTransferState: TransferState = 'idle';

setIndicator(serverIndicator, 'warning', 'Checking status…');
setIndicator(pluginIndicator, 'warning', 'Waiting for plugin heartbeat…');
setIndicator(transferIndicator, 'idle', 'Idle');

/**
 * Update progress display
 */
function updateProgress(percent: number, phase: string, message: string) {
  if (progressPercentEl) progressPercentEl.textContent = `${Math.round(percent)}%`;
  if (progressPhaseEl) progressPhaseEl.textContent = phase;
  if (progressMessageEl) progressMessageEl.textContent = message;
  
  if (progressRingIndicator) {
    const offset = PROGRESS_RING_CIRCUMFERENCE - (percent / 100) * PROGRESS_RING_CIRCUMFERENCE;
    progressRingIndicator.style.strokeDashoffset = `${offset}`;
  }
}

/**
 * Show/hide progress section
 */
function showProgress(show: boolean) {
  if (progressSection) {
    progressSection.classList.toggle('hidden', !show);
  }
}

/**
 * Update status message
 */
function updateStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }
}

/**
 * Show/hide action buttons
 */
function showActions(show: boolean) {
  if (actionsEl) {
    actionsEl.classList.toggle('hidden', !show);
  }
}

/**
 * Disable/enable capture buttons
 */
function setCaptureEnabled(enabled: boolean) {
  [captureBtn, captureDownloadBtn].forEach(btn => {
    if (btn) btn.disabled = !enabled;
  });
}

/**
 * Update transfer indicator helper
 */
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

/**
 * Start capture process
 */
async function startCapture(mode: 'send' | 'download') {
  try {
    setCaptureEnabled(false);
    showProgress(true);
    updateProgress(0, 'Starting', 'Initializing capture...');
    updateStatus('Capturing page...');
    updateTransferIndicator('pending', 'Preparing capture…');

    // Set the capture mode in background script
    await new Promise<void>((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SET_CAPTURE_MODE', mode: mode },
        () => resolve()
      );
    });

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    // Inject content script if needed
    updateProgress(10, 'Injecting', 'Preparing page extraction...');
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-script.js']
      });
    } catch (error) {
      // Content script might already be injected
      console.log('Content script injection skipped:', error);
    }

    // Start extraction
    updateProgress(20, 'Extracting', 'Analyzing page structure...');
    
    // Set up promise to wait for capture completion
    const capturePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Capture timeout after 60 seconds'));
      }, 60000);

      const messageListener = (message: any) => {
        if (message.type === 'CAPTURE_COMPLETE' || message.type === 'CAPTURE_DOWNLOAD_READY') {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.data);
        } else if (message.type === 'CAPTURE_ERROR') {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(messageListener);
          reject(new Error(message.error || 'Capture failed'));
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
    });

    // Send the capture message
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'START_CAPTURE',
      options: {
        includeScreenshot: false,
        viewport: { width: 1440, height: 900 },
        mode: mode
      }
    });

    if (!response || response.error) {
      throw new Error(response?.error || 'Failed to start capture');
    }

    // Wait for the actual capture data
    const captureData = await capturePromise;
    
    // Handle multi-viewport capture structure
    if (captureData && (captureData as any).captures && (captureData as any).captures.length > 0) {
      // Extract the first capture's data (for single viewport)
      capturedData = (captureData as any).captures[0].data;
    } else {
      // Direct data format
      capturedData = captureData;
    }
    
    updateProgress(100, 'Complete', 'Capture completed successfully!');
    updateStatus('✅ Capture completed!', 'success');

    // Handle based on mode
    if (mode === 'send') {
      // Data should already be sent automatically by background script
      updateStatus('✅ Sent to Figma! Check the plugin.', 'success');
      updateTransferIndicator('delivered', 'Delivered just now');
      showActions(false);
    } else {
      updateTransferIndicator('pending', 'Downloading JSON…');
      showActions(true);
      downloadData(false);
    }

  } catch (error) {
    console.error('Capture failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateStatus(`❌ Capture failed: ${errorMessage}`, 'error');
    updateProgress(0, 'Error', errorMessage);
    updateTransferIndicator('error', errorMessage);
  } finally {
    setCaptureEnabled(true);
    setTimeout(() => showProgress(false), 2000);
  }
}

/**
 * Send captured data to Figma
 */
async function sendToFigma() {
  if (!capturedData) {
    updateStatus('❌ No data to send', 'error');
    return;
  }

  try {
    updateStatus('Sending to Figma...');
    updateTransferIndicator('pending', 'Sending captured data to cloud…');

    // Use the background script to send to handoff server (proper message passing)
    const response = await new Promise<{ok: boolean, error?: string}>((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SEND_TO_HANDOFF', data: capturedData },
        (response) => resolve(response || { ok: false, error: 'No response' })
      );
    });

    if (!response.ok) {
      throw new Error(response.error || 'Failed to send to handoff server');
    }

    updateStatus('✅ Sent to Figma! Check the plugin.', 'success');
    updateTransferIndicator('delivered', 'Delivered just now');
    showActions(false);

  } catch (error) {
    console.error('Send to Figma failed:', error);
    updateStatus('❌ Send failed. Try download instead.', 'error');
    updateTransferIndicator('error', 'Send failed');
    showActions(true); // Show download option
  }
}

/**
 * Download captured data as JSON
 */
function downloadData(manualTrigger = true) {
  if (!capturedData) {
    if (manualTrigger) {
      updateStatus('❌ No data to download', 'error');
    } else {
      console.warn('⚠️ Auto-download requested with no capture data available.');
    }
    return;
  }

  try {
    if (manualTrigger) {
      updateStatus('💾 Preparing download…');
    } else {
      updateStatus('💾 Preparing download…', 'info');
    }
    const dataStr = JSON.stringify(capturedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `web-to-figma-${timestamp}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateStatus('✅ JSON file downloaded!', 'success');
    updateTransferIndicator('idle', 'JSON downloaded locally');
    if (manualTrigger) {
      showActions(false);
    } else {
      showActions(true);
    }
    
  } catch (error) {
    console.error('Download failed:', error);
    updateStatus('❌ Download failed', 'error');
    updateTransferIndicator('error', 'Download failed');
    if (!manualTrigger) {
      showActions(true);
    }
  }
}

// Event listeners
captureBtn?.addEventListener('click', () => startCapture('send'));
captureDownloadBtn?.addEventListener('click', () => startCapture('download'));
sendToFigmaBtn?.addEventListener('click', sendToFigma);
downloadBtn?.addEventListener('click', () => downloadData(true));

// Initialize
updateStatus('Ready to capture');
console.log('Simplified Web to Figma popup loaded');

// Listen for progress messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_PROGRESS') {
    updateProgress(message.percent || (message.current / message.total * 100) || 0, 
                   message.phase || 'Processing', 
                   message.status || message.message || '');
    updateTransferIndicator('pending', message.status || message.message || 'Processing…');
  }
  // Note: CAPTURE_COMPLETE and CAPTURE_ERROR are now handled in the startCapture function
});

startConnectionMonitor();

function createIndicator(prefix: 'server' | 'plugin' | 'transfer'): ConnectionIndicator {
  return {
    dot: document.getElementById(`${prefix}-connection-dot`) as HTMLSpanElement | null,
    detail: document.getElementById(`${prefix}-connection-detail`) as HTMLSpanElement | null
  };
}

function setIndicator(indicator: ConnectionIndicator, state: IndicatorState, detail: string) {
  if (!indicator.dot || !indicator.detail) return;
  indicator.dot.classList.remove('idle', 'connected', 'warning', 'disconnected');
  indicator.dot.classList.add(state);
  indicator.detail.textContent = detail;
}

function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return 'no signal';
  const diffSeconds = Math.round((Date.now() - timestamp) / 1000);
  if (diffSeconds < 1) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function startConnectionMonitor() {
  if (healthInterval) return;
  void runHealthCheck();
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    setIndicator(serverIndicator, 'disconnected', message);
    setIndicator(pluginIndicator, 'disconnected', 'No heartbeat');
  }
}

function updateServerIndicator(telemetry: HandoffTelemetry) {
  const queue = typeof telemetry.queueLength === 'number'
    ? `${telemetry.queueLength} job${telemetry.queueLength === 1 ? '' : 's'} queued`
    : 'Queue idle';
  setIndicator(serverIndicator, 'connected', queue);
}

function updatePluginIndicator(telemetry: HandoffTelemetry) {
  const lastPoll = telemetry.lastPluginPollAt;
  if (!lastPoll) {
    setIndicator(pluginIndicator, 'warning', 'Waiting for plugin heartbeat…');
    return;
  }

  const ageMs = Date.now() - lastPoll;
  if (ageMs < 7000) {
    setIndicator(pluginIndicator, 'connected', `Heartbeat ${formatRelativeTime(lastPoll)}`);
  } else if (ageMs < 30000) {
    setIndicator(pluginIndicator, 'warning', `Last seen ${formatRelativeTime(lastPoll)}`);
  } else {
    setIndicator(pluginIndicator, 'disconnected', `No heartbeat ${formatRelativeTime(lastPoll)}`);
  }
}

function syncTransferIndicatorFromTelemetry(telemetry: HandoffTelemetry) {
  if (!telemetry.lastExtensionTransferAt) return;
  if (currentTransferState === 'pending') return;
  if (lastTelemetryTransferAt === telemetry.lastExtensionTransferAt) return;
  lastTelemetryTransferAt = telemetry.lastExtensionTransferAt;
  updateTransferIndicator('delivered', `Delivered ${formatRelativeTime(telemetry.lastExtensionTransferAt)}`);
}
