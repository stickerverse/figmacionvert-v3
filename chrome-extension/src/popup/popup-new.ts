/**
 * Modern popup UI with live capture preview and terminal progress
 */

// Global error handlers
window.addEventListener("error", (event) => {
  console.error("[GLOBAL_ERROR]", event.message, event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[UNHANDLED_REJECTION]", event.reason);
});

// DOM Elements
const captureFullPageBtn = document.getElementById(
  "capture-full-page"
) as HTMLButtonElement;
const captureComponentBtn = document.getElementById(
  "capture-component"
) as HTMLButtonElement;
const captureMultipleBtn = document.getElementById(
  "capture-multiple"
) as HTMLButtonElement;
const captureDownloadBtn = document.getElementById(
  "capture-download"
) as HTMLButtonElement;
const capturePreview = document.getElementById(
  "capture-preview"
) as HTMLDivElement;
const previewStatus = document.getElementById(
  "preview-status"
) as HTMLSpanElement;
const previewCanvas = document.getElementById(
  "preview-canvas"
) as HTMLCanvasElement;
const laserScan = document.getElementById("laser-scan") as HTMLDivElement;
const terminal = document.getElementById("terminal") as HTMLDivElement;
const terminalLog = document.getElementById("terminal-log") as HTMLDivElement;
const terminalStats = document.getElementById(
  "terminal-stats"
) as HTMLSpanElement;
const terminalClearBtn = document.getElementById(
  "terminal-clear"
) as HTMLButtonElement;
const terminalMinimizeBtn = document.getElementById(
  "terminal-minimize"
) as HTMLButtonElement;
// Connection UI elements removed per user request
const captureDialog = document.getElementById(
  "capture-dialog"
) as HTMLDivElement;
const captureDialogClose = document.getElementById(
  "capture-dialog-close"
) as HTMLButtonElement;

// State
let isCapturing = false;
let captureStartTime = 0;
const logEntries: Array<{
  timestamp: Date;
  level: string;
  message: string;
  data?: any;
}> = [];

// Debugging Stages
type CaptureStage =
  | "idle"
  | "capturingDom"
  | "uploadingPayload"
  | "waitingForJob"
  | "waitingForFigma"
  | "complete"
  | "error";

let completionTimeout: number | null = null;

function setStage(stage: CaptureStage, jobId: string = "unknown") {
  console.log("[CAPTURE_STAGE]", stage);
  let percent = 0;

  switch (stage) {
    case "capturingDom":
      percent = 25;
      break;
    case "uploadingPayload":
      percent = 60;
      break;
    case "waitingForJob":
      percent = 90;
      break;
    case "waitingForFigma":
      percent = 98;
      break;
    case "complete":
      percent = 100;
      break;
    case "error":
      percent = 0;
      break;
  }

  console.log("[CAPTURE_PROGRESS]", { stage, percent });
  updateProgressRing(percent, stage);

  // Watchdog logic
  if (stage === "waitingForFigma") {
    waitForCompletionOrTimeout(jobId);
  } else if (stage === "complete" || stage === "error") {
    if (completionTimeout !== null) {
      clearTimeout(completionTimeout);
      completionTimeout = null;
    }
  }
}

function waitForCompletionOrTimeout(jobId: string) {
  if (completionTimeout !== null) {
    clearTimeout(completionTimeout);
  }

  completionTimeout = window.setTimeout(() => {
    console.error("[CAPTURE_TIMEOUT] Stuck at 98%. Last known jobId:", jobId);
    alert(
      "Capture appears stuck waiting for Figma completion.\n\n" +
        "Check:\n" +
        "- capture-service logs\n" +
        "- Figma plugin console\n" +
        "- network requests to /figma-report or job status endpoints."
    );
    setStage("error");
    updateStatus("Capture timed out waiting for Figma");
    finishCapture();
  }, 60_000); // 60s timeout
}

/**
 * Initialize popup
 */
// Prevent duplicate initialization
let isInitialized = false;

function init() {
  if (isInitialized) {
    console.warn("⚠️ Popup already initialized, skipping duplicate init");
    return;
  }
  isInitialized = true;

  log("info", "Extension popup initialized");

  // Set up event listeners
  captureFullPageBtn.addEventListener("click", () => startCapture("send"));
  captureComponentBtn.addEventListener("click", () =>
    log("info", "Component capture coming soon!")
  );
  captureDownloadBtn.addEventListener("click", () => startCapture("download"));
  terminalClearBtn.addEventListener("click", clearTerminal);
  terminalMinimizeBtn.addEventListener("click", toggleTerminal);
  captureDialogClose?.addEventListener("click", () => hideCaptureDialog());

  // Debug listeners removed

  // Success modal listeners
  const successModalOverlay = document.getElementById("success-modal-overlay");
  const closeModalBtn = document.getElementById("close-modal");
  const successModal = document.getElementById("success-modal");

  if (successModalOverlay && successModal) {
    successModalOverlay.addEventListener("click", () => {
      successModal.classList.add("hidden");
    });
  }

  if (closeModalBtn && successModal) {
    closeModalBtn.addEventListener("click", () => {
      successModal.classList.add("hidden");
    });
  }

  // Listen for background messages
  chrome.runtime.onMessage.addListener(handleMessage);

  // Initial connection checks
  const checkConnections = async () => {
    log("info", "Verifying connections...");

    // Disable capture button while checking
    captureFullPageBtn.disabled = true;
    captureFullPageBtn.textContent = "Connecting...";
    captureFullPageBtn.classList.add("disabled");

    const figmaOk = await checkFigmaConnection();

    if (figmaOk) {
      log("success", "✅ Figma plugin verified!");
      captureFullPageBtn.disabled = false;
      captureFullPageBtn.textContent = "Capture Full Page";
      captureFullPageBtn.classList.remove("disabled");

      // Update UI to show ready state
      const statusEl = document.getElementById("status");
      if (statusEl) {
        statusEl.textContent = "Ready to capture";
        statusEl.className = "status success";
      }
    } else {
      log(
        "warning",
        "⚠️ Figma plugin not detected. Please open the plugin in Figma."
      );
      captureFullPageBtn.disabled = true;
      captureFullPageBtn.textContent = "Waiting for Figma Plugin...";

      // Keep checking if not connected
      setTimeout(checkConnections, 2000);
    }
  };

  // Initial check
  checkConnections();

  // Periodic checks (every 5 seconds)
  setInterval(checkConnections, 5000);
}

function isWebTab(tab: chrome.tabs.Tab): boolean {
  const url = tab.url || "";
  return (
    typeof tab.id === "number" &&
    !url.startsWith("chrome-extension://") &&
    !url.startsWith("chrome://")
  );
}

async function getActiveWebTab(): Promise<chrome.tabs.Tab | null> {
  const [activeInWindow] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (activeInWindow && isWebTab(activeInWindow)) return activeInWindow;

  const activeCandidates = await chrome.tabs.query({
    lastFocusedWindow: true,
    active: true,
  });
  const candidate = activeCandidates.find(isWebTab);
  if (candidate) return candidate;

  const allTabs = await chrome.tabs.query({ lastFocusedWindow: true });
  return allTabs.find(isWebTab) ?? null;
}

/**
 * Start full page capture
 */
async function startCapture(mode: "send" | "download" = "send") {
  if (isCapturing) return;

  isCapturing = true;
  captureStartTime = Date.now();
  // Multiple pages feature is opt-in; default to locking navigation to the current page
  const allowNavigation = Boolean(
    captureMultipleBtn?.classList.contains("selected")
  );

  // Show preview and terminal
  capturePreview.classList.remove("hidden");
  capturePreview.classList.add("active"); // Activate for progress ring
  terminal.classList.remove("hidden");

  // Show progress ring overlay
  const progressOverlay = document.getElementById("progress-ring-overlay");
  if (progressOverlay) {
    progressOverlay.classList.add("visible");
  }

  clearTerminal();
  log("info", "Starting full page capture...");
  updateStatus("Initializing capture");

  try {
    // Explicitly set delivery mode
    try {
      await chrome.runtime.sendMessage({
        type: "SET_CAPTURE_MODE",
        mode: mode,
      });
      log("info", `Capture mode set to: ${mode}`);
    } catch (error) {
      log("warning", "Could not set delivery mode, falling back to default");
    }

    // Get the active web tab (works from side panel context)
    const tab = await getActiveWebTab();
    if (!tab?.id) {
      throw new Error("No active tab found");
    }

    log("info", `Target URL: ${tab.url}`);
    log("info", `Tab ID: ${tab.id}`);

    // Make sure the capture content script is present before messaging the tab
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["dist/content-scripts/capture-dom.js"],
      });
      log("info", "Capture content script ensured");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Content script injection failed";
      log("error", message);
      updateStatus("Capture failed");
      finishCapture();
      return;
    }

    // Take initial screenshot for preview
    await updatePreview(tab.id);

    // Send capture command to background
    log("info", "Sending capture command to background script...");
    setStage("capturingDom");

    await new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "START_CAPTURE", tabId: tab.id, allowNavigation, mode },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.ok === false) {
            reject(new Error(response.error || "Failed to start capture"));
            return;
          }
          resolve();
        }
      );
    });

    // Show loading state
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = "Capturing page...";
      statusEl.className = "status";
      statusEl.style.display = "block";
    }
    log("info", "Capture started; waiting for progress updates...");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("error", `Capture failed: ${message}`);
    updateStatus("Capture failed");
    finishCapture();
  }
}

/**
 * Update preview with screenshot
 */
async function updatePreview(tabId: number) {
  try {
    log("info", "Capturing screenshot for preview...");

    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "png",
    });

    const img = new Image();
    img.onload = () => {
      const ctx = previewCanvas.getContext("2d");
      if (ctx) {
        previewCanvas.width = img.width;
        previewCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        log("success", `Screenshot captured: ${img.width}x${img.height}`);
      }
    };
    img.src = dataUrl;

    // Start laser animation
    if (laserScan) {
      laserScan.style.animation = "none";
      setTimeout(() => {
        laserScan.style.animation = "laser-scan 3s ease-in-out infinite";
      }, 10);
    }
  } catch (error) {
    log("warning", "Screenshot preview unavailable");
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
 * Update circular progress ring
 */
function updateProgressRing(percent: number, label: string = "") {
  // Update progress ring visualization
  const ring = document.querySelector(
    ".progress-ring-fill"
  ) as SVGCircleElement;
  const percentText = document.querySelector(
    ".progress-percent"
  ) as HTMLElement;
  const labelText = document.querySelector(".progress-label") as HTMLElement;

  if (ring) {
    const circumference = 2 * Math.PI * 54; // radius = 54
    const offset = circumference - (percent / 100) * circumference;
    ring.style.strokeDashoffset = offset.toString();

    if (percent >= 100) {
      ring.classList.add("complete");
    } else if (percent > 0) {
      ring.classList.add("active");
    }
  }

  if (percentText) {
    percentText.textContent = `${Math.round(percent)}%`;
  }

  if (labelText && label) {
    labelText.textContent = label;
  }
}

/**
 * Show success dialog with capture details
 */
function showSuccessDialog(data: any) {
  const modal = document.getElementById("success-modal");
  if (!modal) return;

  // Populate details
  const viewport =
    data.metadata?.viewportName ||
    `${data.metadata?.viewport?.width}×${data.metadata?.viewport?.height}` ||
    "Natural";
  const sizeKB =
    data.dataSizeKB || (JSON.stringify(data).length / 1024).toFixed(1);
  const elements =
    data.metadata?.extractionSummary?.totalElements ||
    data.tree?.children?.length ||
    0;
  const duration = ((Date.now() - captureStartTime) / 1000).toFixed(1);

  const detailViewport = document.getElementById("detail-viewport");
  const detailSize = document.getElementById("detail-size");
  const detailElements = document.getElementById("detail-elements");
  const detailDuration = document.getElementById("detail-duration");

  if (detailViewport) detailViewport.textContent = viewport;
  if (detailSize) detailSize.textContent = `${sizeKB} MB`;
  if (detailElements) detailElements.textContent = elements.toLocaleString();
  if (detailDuration) detailDuration.textContent = `${duration}s`;

  modal.classList.remove("hidden");

  // Show success toast
  showToast(
    "success",
    "Capture Complete",
    "Data successfully sent to Figma plugin"
  );
}

/**
 * Show toast notification
 */
function showToast(
  type: "info" | "success" | "warning" | "error",
  title: string,
  message?: string
) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    info: "ℹ️",
    success: "✓",
    warning: "⚠️",
    error: "✕",
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ""}
    </div>
    <button class="toast-close">×</button>
  `;

  container.appendChild(toast);

  // Auto-dismiss after 4 seconds
  const timeoutId = setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 200);
  }, 4000);

  // Close button
  const closeBtn = toast.querySelector(".toast-close");
  closeBtn?.addEventListener("click", () => {
    clearTimeout(timeoutId);
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 200);
  });
}

/**
 * Finish capture
 */
function finishCapture() {
  isCapturing = false;
  const duration = ((Date.now() - captureStartTime) / 1000).toFixed(2);
  log("info", `Capture completed in ${duration}s`);

  // Stop laser animation after a delay
  setTimeout(() => {
    if (laserScan) {
      laserScan.style.animation = "none";
    }
  }, 2000);
}

/**
 * Handle messages from background script
 */
function handleMessage(message: any, sender: any, sendResponse: any) {
  switch (message.type) {
    case "CAPTURE_PROGRESS":
      handleCaptureProgress(message);
      break;

    case "CAPTURE_COMPLETE":
      handleCaptureComplete(message);
      break;

    case "CAPTURE_ERROR":
      handleCaptureError(message);
      break;

    case "EXTRACTION_PROGRESS":
      handleExtractionProgress(message);
      break;
  }
}

/**
 * Handle capture progress updates
 */
function handleCaptureProgress(message: any) {
  if (!isCapturing) return;

  // Normalize progress messages coming from both background and content scripts
  // Background: { type: 'CAPTURE_PROGRESS', phase, progress, details }
  // Content script: { type: 'CAPTURE_PROGRESS', status, current, total, viewport, completed }

  const phase: string = message.phase || message.status || "Capturing";

  let percent: number | undefined = undefined;

  if (typeof message.progress === "number") {
    // Direct numeric progress from background script
    percent = message.progress;
  } else if (
    typeof message.current === "number" &&
    typeof message.total === "number" &&
    message.total > 0
  ) {
    // Derive percentage from current/total (multi-viewport capture)
    percent = Math.round((message.current / message.total) * 100);
  } else if (typeof message.percent === "number") {
    // Fallback: some senders may provide a percent field
    percent = Math.round(message.percent);
  }

  // Clamp to [0, 100]
  if (typeof percent !== "number" || Number.isNaN(percent)) {
    percent = 0;
  } else {
    percent = Math.max(0, Math.min(100, percent));
  }

  const details = message.details ||
    message.stats || {
      current: message.current,
      total: message.total,
      viewport: message.viewport,
      completed: message.completed,
    };

  log("info", `${phase}: ${percent}%`, details);

  // Use setStage for critical phases to trigger watchdog
  if (percent >= 97 && percent < 100) {
    setStage("waitingForFigma");
  } else {
    updateStatus(`${phase} - ${percent}%`);
    updateProgressRing(percent, phase);
    updateTerminalStats(percent, details);
  }
}

/**
 * Handle extraction progress
 */
function handleExtractionProgress(message: any) {
  // Messages forwarded from injected extraction script via content script
  // Content script sends: { type: 'EXTRACTION_PROGRESS', phase, message, percent, stats }
  // Older paths may send: { phase, current, total, data }

  const phase: string = message.phase || message.status || "Extracting";

  let percent: number | undefined = undefined;

  if (typeof message.percent === "number") {
    percent = Math.round(message.percent);
  } else if (
    typeof message.current === "number" &&
    typeof message.total === "number" &&
    message.total > 0
  ) {
    percent = Math.round((message.current / message.total) * 100);
  }

  if (typeof percent !== "number" || Number.isNaN(percent)) {
    percent = 0;
  } else {
    percent = Math.max(0, Math.min(100, percent));
  }

  const data = message.stats || message.data;
  const progressLabel =
    typeof message.current === "number" && typeof message.total === "number"
      ? `${message.current}/${message.total} (${percent}%)`
      : `${percent}%`;

  // Enhanced image stats logging
  if (data?.imagesFound !== undefined || data?.imagesFetched !== undefined) {
    const imgStats = [];
    if (data.imagesFound !== undefined)
      imgStats.push(`found: ${data.imagesFound}`);
    if (data.imagesFetched !== undefined)
      imgStats.push(`fetched: ${data.imagesFetched}`);
    if (data.imagesFailed !== undefined && data.imagesFailed > 0) {
      imgStats.push(`failed: ${data.imagesFailed}`);
    }
    if (imgStats.length > 0) {
      log("info", `📷 Images: ${imgStats.join(", ")}`);
    }
  }

  if (data) {
    log("data", `${phase}: ${progressLabel}`, data);
  } else if (message.message) {
    log("info", `${phase}: ${message.message} (${percent}%)`);
  } else {
    log("info", `${phase}: ${progressLabel}`);
  }

  updateStatus(`${phase} - ${percent}%`);
  updateProgressRing(percent, phase);
  updateTerminalStats(percent, data);
}

/**
 * Handle capture completion
 */
function handleCaptureComplete(message: any) {
  let { data, dataSize, dataSizeKB } = message;

  log("success", "✓ Capture completed successfully");
  log("data", `Data size: ${dataSizeKB} KB`, { bytes: dataSize });

  // Handle rawSchemaJson format (from chunked transfers)
  if (data?.rawSchemaJson && !data?.assets) {
    try {
      log("info", "Parsing chunked schema data...");
      data = JSON.parse(data.rawSchemaJson);
      log("success", "Schema parsed successfully");
    } catch (e) {
      log("error", `Failed to parse schema: ${e}`);
    }
  }

  // Detailed image diagnostics
  if (data?.assets?.images) {
    const imageKeys = Object.keys(data.assets.images);
    const imageCount = imageKeys.length;

    let imagesWithData = 0;
    let imagesWithoutData = 0;
    let totalImageDataSize = 0;
    const missingDataImages: string[] = [];

    imageKeys.forEach((key) => {
      const img = data.assets.images[key];
      const hasData = !!(img.data || img.base64);
      const dataLen = (img.data || img.base64 || "").length;

      if (hasData && dataLen > 100) {
        imagesWithData++;
        totalImageDataSize += dataLen;
      } else {
        imagesWithoutData++;
        missingDataImages.push(
          `${key} (${img.url?.substring(0, 40) || "no-url"}...)`
        );
      }
    });

    const dataSizeKBImages = ((totalImageDataSize * 0.75) / 1024).toFixed(1);

    log("info", `📷 Images: ${imageCount} total`);

    if (imagesWithData > 0) {
      log(
        "success",
        `  ✓ ${imagesWithData} images with valid base64 data (~${dataSizeKBImages} KB)`
      );
    }

    if (imagesWithoutData > 0) {
      log("error", `  ✗ ${imagesWithoutData} images MISSING data!`);
      missingDataImages.slice(0, 5).forEach((img) => {
        log("warning", `    - ${img}`);
      });
      if (missingDataImages.length > 5) {
        log("warning", `    ... and ${missingDataImages.length - 5} more`);
      }
    }

    // Sample first image for debugging
    if (imageKeys.length > 0) {
      const firstKey = imageKeys[0];
      const firstImg = data.assets.images[firstKey];
      log("data", `  Sample image:`, {
        hash: firstKey,
        hasData: !!(firstImg.data || firstImg.base64),
        dataLen: (firstImg.data || firstImg.base64 || "").length,
        dims: `${firstImg.width}x${firstImg.height}`,
        type: firstImg.contentType || firstImg.mimeType || "unknown",
      });
    }
  } else {
    log("warning", "⚠️ No images found in capture!");
    log("warning", `   assets exists: ${!!data?.assets}`);
    log("warning", `   assets.images exists: ${!!data?.assets?.images}`);
  }

  // Node tree stats
  if (data?.tree) {
    const countNodesWithImages = (
      node: any
    ): { total: number; withImageHash: number; withImageFills: number } => {
      let total = 1;
      let withImageHash = node.imageHash ? 1 : 0;
      let withImageFills = 0;

      if (node.fills?.some((f: any) => f.type === "IMAGE")) withImageFills++;
      if (
        node.backgrounds?.some(
          (b: any) => b.fill?.type === "IMAGE" || b.type === "image"
        )
      )
        withImageFills++;

      if (node.children) {
        node.children.forEach((child: any) => {
          const childStats = countNodesWithImages(child);
          total += childStats.total;
          withImageHash += childStats.withImageHash;
          withImageFills += childStats.withImageFills;
        });
      }
      return { total, withImageHash, withImageFills };
    };

    const nodeStats = countNodesWithImages(data.tree);
    log("info", `🌳 Nodes: ${nodeStats.total} total`);
    log("info", `   - ${nodeStats.withImageHash} nodes with imageHash`);
    log(
      "info",
      `   - ${nodeStats.withImageFills} nodes with image fills/backgrounds`
    );
  }

  log("info", "Sending to cloud service and Figma plugin...");

  updateStatus("Complete!");
  setStage("complete");

  // Keep terminal open but stop laser
  finishCapture();

  // Show success dialog with details
  if (data) {
    setTimeout(() => showSuccessDialog(data), 500);
  } else {
    showCaptureDialog();
  }
}

/**
 * Handle capture error
 */
function handleCaptureError(message: any) {
  log("error", ` Capture failed: ${message.error}`);
  updateStatus("Capture failed");
  setStage("error");
  finishCapture();
}

function showCaptureDialog() {
  if (!captureDialog) return;
  captureDialog.classList.remove("hidden");
  // Auto-hide after a few seconds
  setTimeout(() => hideCaptureDialog(), 4000);
}

function hideCaptureDialog() {
  if (!captureDialog) return;
  captureDialog.classList.add("hidden");
}

/**
 * Update terminal stats footer
 */
function updateTerminalStats(progress: number, data?: any) {
  if (!terminalStats) return;

  const elapsed = ((Date.now() - captureStartTime) / 1000).toFixed(1);
  let stats = `[${elapsed}s] ${progress}%`;

  if (data) {
    if (data.nodesProcessed) stats += ` | Nodes: ${data.nodesProcessed}`;
    if (data.imagesFound !== undefined) {
      stats += ` | 📷 ${data.imagesFound}`;
      if (data.imagesFetched !== undefined) {
        stats += `/${data.imagesFetched} fetched`;
      }
      if (data.imagesFailed !== undefined && data.imagesFailed > 0) {
        stats += ` (${data.imagesFailed} failed!)`;
      }
    }
    if (data.memoryMB) stats += ` | ${data.memoryMB}MB`;
  }

  terminalStats.textContent = stats;
}

/**
 * Log message to terminal
 */
function log(
  level: "info" | "success" | "error" | "warning" | "data",
  message: string,
  data?: any
) {
  const timestamp = new Date();
  logEntries.push({ timestamp, level, message, data });

  // Create log line
  const line = document.createElement("div");
  line.className = "terminal-line";

  const timeSpan = document.createElement("span");
  timeSpan.className = "terminal-timestamp";
  timeSpan.textContent = formatTime(timestamp);

  const messageSpan = document.createElement("span");
  messageSpan.className = `terminal-message ${level}`;
  messageSpan.textContent = message;

  line.appendChild(timeSpan);
  line.appendChild(messageSpan);

  // Add data if provided
  if (data) {
    const dataSpan = document.createElement("span");
    dataSpan.className = "terminal-data";
    dataSpan.textContent = ` ${JSON.stringify(data)}`;
    line.appendChild(dataSpan);
  }

  terminalLog.appendChild(line);

  // Auto-scroll to bottom
  terminalLog.parentElement!.scrollTop =
    terminalLog.parentElement!.scrollHeight;

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
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Clear terminal
 */
function clearTerminal() {
  terminalLog.innerHTML = "";
  logEntries.length = 0;
  if (terminalStats) {
    terminalStats.textContent = "Ready";
  }
}

/**
 * Toggle terminal visibility
 */
function toggleTerminal() {
  const body = terminal.querySelector(".terminal-body") as HTMLDivElement;
  const footer = terminal.querySelector(".terminal-footer") as HTMLDivElement;

  if (body && footer) {
    const isMinimized = body.classList.contains("hidden");
    body.classList.toggle("hidden");
    footer.classList.toggle("hidden");
    terminalMinimizeBtn.textContent = isMinimized ? "−" : "+";
  }
}

/**
 * Check Figma plugin connection status via the capture service status endpoint(s).
 * Tries multiple local ports so we don't get stuck on "Waiting for Figma plugin"
 * when the service is running on a different port.
 */
async function checkFigmaConnection() {
  const statusUrls = [
    "http://127.0.0.1:5511/api/status",
    "http://localhost:5511/api/status",
    "http://127.0.0.1:3000/api/status",
    "http://localhost:3000/api/status",
  ];

  for (const statusUrl of statusUrls) {
    try {
      const response = await fetch(statusUrl, {
        method: "GET",
        headers: { "cache-control": "no-cache" },
        mode: "cors",
      });

      if (response.ok) {
        const status = await response.json();
        console.log("[POPUP_STATUS_CHECK]", { urlTried: statusUrl, status });

        // Treat either new ({ ok: true }) or old ({ server: 'ok' }) status responses as healthy
        if (status.server === "ok" || status.ok === true) {
          log("success", `Capture service connected via ${statusUrl}`);
          return true;
        }
      }
    } catch (error) {
      log("warning", `Capture service unreachable at ${statusUrl}`);
    }
  }

  return false;
}

// Initialize on load
init();

// Export for webpack
export {};
