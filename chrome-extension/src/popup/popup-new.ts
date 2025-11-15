/**
 * Modern popup UI with live capture preview and terminal progress
 */

// DOM Elements
const captureFullPageBtn = document.getElementById('capture-full-page') as HTMLButtonElement;
const captureComponentBtn = document.getElementById('capture-component') as HTMLButtonElement;
const captureMultipleBtn = document.getElementById('capture-multiple') as HTMLButtonElement;
const capturePreview = document.getElementById('capture-preview') as HTMLDivElement;
const previewStatus = document.getElementById('preview-status') as HTMLSpanElement;
const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
const laserScan = document.getElementById('laser-scan') as HTMLDivElement;
const terminal = document.getElementById('terminal') as HTMLDivElement;
const terminalLog = document.getElementById('terminal-log') as HTMLDivElement;
const terminalStats = document.getElementById('terminal-stats') as HTMLSpanElement;
const terminalClearBtn = document.getElementById('terminal-clear') as HTMLButtonElement;
const terminalMinimizeBtn = document.getElementById('terminal-minimize') as HTMLButtonElement;
const cloudDot = document.getElementById('cloud-dot') as HTMLSpanElement;
const figmaDot = document.getElementById('figma-dot') as HTMLSpanElement;

// State
let isCapturing = false;
let captureStartTime = 0;
const logEntries: Array<{timestamp: Date; level: string; message: string; data?: any}> = [];

/**
 * Initialize popup
 */
function init() {
  log('info', 'Extension popup initialized');

  // Set up event listeners
  captureFullPageBtn.addEventListener('click', startCapture);
  captureComponentBtn.addEventListener('click', () => log('info', 'Component capture coming soon!'));
  terminalClearBtn.addEventListener('click', clearTerminal);
  terminalMinimizeBtn.addEventListener('click', toggleTerminal);

  // Listen for background messages
  chrome.runtime.onMessage.addListener(handleMessage);

  // Check connection status (reduced frequency to avoid rate limiting)
  checkCloudConnection();
  setInterval(checkCloudConnection, 30000); // Every 30 seconds instead of 5

  log('success', 'Ready to capture');
}

/**
 * Start full page capture
 */
async function startCapture() {
  if (isCapturing) return;

  isCapturing = true;
  captureStartTime = Date.now();
  // Multiple pages feature is opt-in; default to locking navigation to the current page
  const allowNavigation = Boolean(captureMultipleBtn?.classList.contains('selected'));

  // Show preview and terminal
  capturePreview.classList.remove('hidden');
  terminal.classList.remove('hidden');

  clearTerminal();
  log('info', 'Starting full page capture...');
  updateStatus('Initializing capture');

  try {
    // Explicitly set delivery mode to auto-send so the payload goes straight to the Figma plugin
    try {
      await chrome.runtime.sendMessage({ type: 'SET_CAPTURE_MODE', mode: 'send' });
      log('info', 'Auto-send to Figma enabled');
    } catch (error) {
      log('warning', 'Could not set delivery mode, falling back to default');
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    log('info', `Target URL: ${tab.url}`);
    log('info', `Tab ID: ${tab.id}`);

    // Take initial screenshot for preview
    await updatePreview(tab.id);

    // Send capture command to background
    log('info', 'Sending capture command to background script...');
    updateStatus('Starting DOM extraction');

    chrome.runtime.sendMessage(
      { type: 'START_CAPTURE', tabId: tab.id, allowNavigation },
      (response) => {
        if (chrome.runtime.lastError) {
          log('error', `Communication error: ${chrome.runtime.lastError.message}`);
        }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', `Capture failed: ${message}`);
    updateStatus('Capture failed');
    finishCapture();
  }
}

/**
 * Update preview with screenshot
 */
async function updatePreview(tabId: number) {
  try {
    log('info', 'Capturing screenshot for preview...');

    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: 'png'
    });

    const img = new Image();
    img.onload = () => {
      const ctx = previewCanvas.getContext('2d');
      if (ctx) {
        previewCanvas.width = img.width;
        previewCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        log('success', `Screenshot captured: ${img.width}x${img.height}`);
      }
    };
    img.src = dataUrl;

    // Start laser animation
    if (laserScan) {
      laserScan.style.animation = 'none';
      setTimeout(() => {
        laserScan.style.animation = 'laser-scan 3s ease-in-out infinite';
      }, 10);
    }

  } catch (error) {
    log('warning', 'Screenshot preview unavailable');
  }
}

/**
 * Update preview status
 */
function updateStatus(status: string) {
  if (previewStatus) {
    previewStatus.textContent = status;
  }
}

/**
 * Finish capture
 */
function finishCapture() {
  isCapturing = false;
  const duration = ((Date.now() - captureStartTime) / 1000).toFixed(2);
  log('info', `Capture completed in ${duration}s`);

  // Stop laser animation after a delay
  setTimeout(() => {
    if (laserScan) {
      laserScan.style.animation = 'none';
    }
  }, 2000);
}

/**
 * Handle messages from background script
 */
function handleMessage(message: any, sender: any, sendResponse: any) {
  switch (message.type) {
    case 'CAPTURE_PROGRESS':
      handleCaptureProgress(message);
      break;

    case 'CAPTURE_COMPLETE':
      handleCaptureComplete(message);
      break;

    case 'CAPTURE_ERROR':
      handleCaptureError(message);
      break;

    case 'EXTRACTION_PROGRESS':
      handleExtractionProgress(message);
      break;
  }
}

/**
 * Handle capture progress updates
 */
function handleCaptureProgress(message: any) {
  const { phase, progress, details } = message;

  log('info', `${phase}: ${progress}%`, details);
  updateStatus(phase);
  updateTerminalStats(progress, details);
}

/**
 * Handle extraction progress
 */
function handleExtractionProgress(message: any) {
  const { phase, current, total, data } = message;

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  if (data) {
    log('data', `${phase}: ${current}/${total} (${percent}%)`, data);
  } else {
    log('info', `${phase}: ${current}/${total}`);
  }

  updateStatus(`${phase} - ${percent}%`);
  updateTerminalStats(percent, data);
}

/**
 * Handle capture completion
 */
function handleCaptureComplete(message: any) {
  const { dataSize, dataSizeKB } = message;

  log('success', '✓ Capture completed successfully');
  log('data', `Data size: ${dataSizeKB} KB`, { bytes: dataSize });
  log('info', 'Sending to cloud service and Figma plugin...');

  updateStatus('Sending to Figma...');

  // Keep terminal open but stop laser
  finishCapture();
}

/**
 * Handle capture error
 */
function handleCaptureError(message: any) {
  log('error', `✗ Capture failed: ${message.error}`);
  updateStatus('Capture failed');
  finishCapture();
}

/**
 * Update terminal stats footer
 */
function updateTerminalStats(progress: number, data?: any) {
  if (!terminalStats) return;

  const elapsed = ((Date.now() - captureStartTime) / 1000).toFixed(1);
  let stats = `[${elapsed}s] Progress: ${progress}%`;

  if (data) {
    if (data.nodesProcessed) stats += ` | Nodes: ${data.nodesProcessed}`;
    if (data.imagesFound) stats += ` | Images: ${data.imagesFound}`;
    if (data.memoryMB) stats += ` | Memory: ${data.memoryMB}MB`;
  }

  terminalStats.textContent = stats;
}

/**
 * Log message to terminal
 */
function log(level: 'info' | 'success' | 'error' | 'warning' | 'data', message: string, data?: any) {
  const timestamp = new Date();
  logEntries.push({ timestamp, level, message, data });

  // Create log line
  const line = document.createElement('div');
  line.className = 'terminal-line';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'terminal-timestamp';
  timeSpan.textContent = formatTime(timestamp);

  const messageSpan = document.createElement('span');
  messageSpan.className = `terminal-message ${level}`;
  messageSpan.textContent = message;

  line.appendChild(timeSpan);
  line.appendChild(messageSpan);

  // Add data if provided
  if (data) {
    const dataSpan = document.createElement('span');
    dataSpan.className = 'terminal-data';
    dataSpan.textContent = ` ${JSON.stringify(data)}`;
    line.appendChild(dataSpan);
  }

  terminalLog.appendChild(line);

  // Auto-scroll to bottom
  terminalLog.parentElement!.scrollTop = terminalLog.parentElement!.scrollHeight;

  // Limit log entries
  if (logEntries.length > 100) {
    logEntries.shift();
    terminalLog.removeChild(terminalLog.firstChild!);
  }
}

/**
 * Format timestamp
 */
function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Clear terminal
 */
function clearTerminal() {
  terminalLog.innerHTML = '';
  logEntries.length = 0;
  if (terminalStats) {
    terminalStats.textContent = 'Ready';
  }
}

/**
 * Toggle terminal visibility
 */
function toggleTerminal() {
  const body = terminal.querySelector('.terminal-body') as HTMLDivElement;
  const footer = terminal.querySelector('.terminal-footer') as HTMLDivElement;

  if (body && footer) {
    const isMinimized = body.classList.contains('hidden');
    body.classList.toggle('hidden');
    footer.classList.toggle('hidden');
    terminalMinimizeBtn.textContent = isMinimized ? '−' : '+';
  }
}

/**
 * Check cloud service connection
 */
async function checkCloudConnection() {
  try {
    const response = await fetch('https://capture-service-sandy.vercel.app/health', {
      method: 'GET',
      headers: { 'cache-control': 'no-cache' }
    });

    if (response.ok) {
      setConnectionStatus(cloudDot, 'connected');
    } else {
      setConnectionStatus(cloudDot, 'disconnected');
    }
  } catch (error) {
    setConnectionStatus(cloudDot, 'disconnected');
  }
}

/**
 * Set connection status
 */
function setConnectionStatus(dot: HTMLElement, status: 'connected' | 'disconnected') {
  dot.classList.remove('connected', 'disconnected');
  dot.classList.add(status);
}

// Initialize on load
init();

// Export for webpack
export {};
