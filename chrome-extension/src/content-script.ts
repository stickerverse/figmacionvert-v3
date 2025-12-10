import { StatusOverlay } from "./utils/status-overlay";
import { PageScroller } from "./utils/page-scroller";
import { SelectionOverlay } from "./content-scripts/selection-overlay";
// Add type definition for window chunk storage
declare global {
  interface Window {
    _chunkBuffer?: any[];
    _chunkMap?: Record<string, string[]>;
  }
}

// Immediate execution test - if this doesn't log, script isn't running at all
const LOAD_TIME = new Date().toISOString();
console.log(`🚀🚀🚀 CONTENT SCRIPT LOADED AT ${LOAD_TIME} 🚀🚀🚀`);
console.log("If you see this, content-script.js is executing!");

(() => {
  console.log("🌐 Content script loaded");

  // ============================================================================
  // EXTENSION CONFLICT DETECTION
  // ============================================================================
  // Check if other capture extensions (like html.to.design) are already active
  // to prevent double-injection and script conflicts

  const CONFLICTING_EXTENSIONS = [
    "html.to.design",
    "htmltodesign",
    "webflow",
    "teleport",
  ];

  const RESTRICTED_URL_PREFIXES = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "data:",
    "javascript:",
    "file://",
    "view-source:",
    "chrome-search://",
  ];

  function isCapturablePageUrl(url: string): boolean {
    if (!url) return false;
    return !RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  function describeUrlType(url: string): string {
    if (url.startsWith("chrome-extension://")) return "extension";
    if (url.startsWith("chrome://")) return "Chrome internal";
    if (url.startsWith("edge://")) return "Edge internal";
    if (url.startsWith("about:")) return "browser";
    if (url.startsWith("data:")) return "data";
    if (url.startsWith("file://")) return "local file";
    if (url.startsWith("view-source:")) return "view-source";
    return "restricted";
  }

  function detectConflictingExtensions(): string | null {
    // Check for markers that other extensions might have set
    const markers = [
      "data-html-to-design",
      "data-htmltodesign-installed",
      "data-teleport-installed",
      "data-webflow-capture",
    ];

    for (const marker of markers) {
      if (
        document.documentElement.hasAttribute(marker) ||
        document.body?.hasAttribute(marker)
      ) {
        return marker.replace("data-", "").replace("-installed", "");
      }
    }

    // Check for global variables that other extensions might set
    const globalMarkers = [
      "__htmlToDesignExtension",
      "__teleportExtension",
      "__webflowCapture",
    ];

    for (const marker of globalMarkers) {
      if ((window as any)[marker]) {
        return marker.replace("__", "").replace("Extension", "");
      }
    }

    return null;
  }

  const conflictingExtension = detectConflictingExtensions();
  if (conflictingExtension) {
    console.warn(
      `⚠️ Detected conflicting extension: ${conflictingExtension}. ` +
        `Please disable "${conflictingExtension}" to use Web to Figma Capture and avoid conflicts.`
    );

    // Set a marker so we can detect this from the popup
    document.documentElement.setAttribute(
      "data-capture-conflict",
      conflictingExtension
    );

    // Still allow the extension to run, but log the warning
    // Users can choose which one to use by disabling the other
  }

  // Allow multiple injections but ensure we only run init logic once per top frame
  const isTopFrame = window.top === window;
  if (isTopFrame) {
    if (document.documentElement.hasAttribute("data-web-to-figma-installed")) {
      console.log(
        "📍 Content script already initialized in top frame, continuing (no-op init)..."
      );
    } else {
      document.documentElement.setAttribute(
        "data-web-to-figma-installed",
        "true"
      );
    }
    // Signal to automated tests that the content script is present
    document.body?.setAttribute("data-extension-installed", "true");
  } else {
    console.log("📍 Running in iframe; will still register message listeners");
  }

  // Content script loaded and ready

  const overlay = new StatusOverlay();
  const scroller = new PageScroller();
  let isCapturing = false;
  let watchdogTimer: any = null;
  let cancelCurrentExtraction: (() => void) | null = null;
  const WATCHDOG_TIMEOUT = 90000; // 90 seconds without progress = stall (increased for complex sites)
  let isScriptInjected = false; // Track if injection script has been loaded this session

  function sendCaptureProgress(
    phase: string,
    percent?: number,
    details?: Record<string, any>
  ) {
    chrome.runtime.sendMessage(
      {
        type: "CAPTURE_PROGRESS",
        phase,
        progress: percent,
        details,
      },
      () => void chrome.runtime.lastError
    );
  }

  function resetWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    if (!isCapturing) return;

    watchdogTimer = setTimeout(() => {
      console.warn("⚠️ [WATCHDOG] Capture stalled!");
      overlay.update("⚠️ Capture seems stuck. Waiting...");

      // Set a second timeout for ultimate failure
      watchdogTimer = setTimeout(() => {
        console.error("❌ [WATCHDOG] Capture timed out completely.");
        overlay.update("❌ Capture timed out. Please refresh and try again.");
        isCapturing = false;
        if (cancelCurrentExtraction) {
          cancelCurrentExtraction();
          cancelCurrentExtraction = null;
        }
      }, 30000); // Wait another 30s before giving up
    }, WATCHDOG_TIMEOUT);
  }

  // Add type definition for window chunk storage

  // Lightweight size estimator - avoids blocking JSON.stringify on large objects
  function estimateCaptureSize(data: any): number {
    if (!data) return 0;

    let bytes = 0;

    // Estimate screenshot size (usually the largest part)
    if (typeof data.screenshot === "string") {
      bytes += data.screenshot.length * 0.75; // base64 overhead
    }

    // Estimate image assets size
    if (data.assets?.images) {
      const images = Object.values(data.assets.images);
      for (const img of images.slice(0, 100)) {
        // Sample first 100
        const imgData = (img as any)?.data || (img as any)?.base64;
        if (typeof imgData === "string") {
          bytes += imgData.length * 0.75;
        }
      }
      // Extrapolate for remaining
      if (images.length > 100) {
        bytes = bytes * (images.length / 100);
      }
    }

    // Estimate tree size (rough: 300 bytes per node)
    if (data.tree) {
      const nodeCount = countTreeNodes(data.tree, 5000);
      bytes += nodeCount * 300;
    }

    return Math.max(bytes, 1024); // Minimum 1KB
  }

  function countTreeNodes(node: any, cap: number): number {
    if (!node || cap <= 0) return 0;
    let count = 1;
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (count >= cap) break;
        count += countTreeNodes(child, cap - count);
      }
    }
    return count;
  }

  // Send capture data to background using chunked transfer to avoid Chrome message size limits
  async function sendCaptureToBackground(captureData: any): Promise<void> {
    const CHUNK_SIZE = 256 * 1024; // 256KB chunks

    let jsonString: string;
    try {
      jsonString = JSON.stringify(captureData);
    } catch (e) {
      console.error("❌ Failed to stringify capture data:", e);
      throw e;
    }

    const totalSize = jsonString.length;
    const totalSizeKB = (totalSize / 1024).toFixed(1);

    // For small payloads, send directly
    if (totalSize < CHUNK_SIZE) {
      console.log(`📦 Small payload (${totalSizeKB}KB), sending directly`);
      await chrome.runtime.sendMessage({
        type: "CAPTURE_COMPLETE",
        data: captureData,
        dataSize: totalSize,
        dataSizeKB: totalSizeKB,
      });
      return;
    }

    // For large payloads, chunk it
    const chunks: string[] = [];
    for (let i = 0; i < jsonString.length; i += CHUNK_SIZE) {
      chunks.push(jsonString.slice(i, i + CHUNK_SIZE));
    }

    // Attach a marker so downstream knows to use background cache for download/send
    captureData.chunked = true;

    console.log(
      `📦 Large payload (${totalSizeKB}KB), chunking into ${chunks.length} parts`
    );

    // Send start
    await chrome.runtime.sendMessage({
      type: "CAPTURE_CHUNKED_START",
      totalChunks: chunks.length,
      totalSize: totalSize,
      totalSizeKB: totalSizeKB,
    });

    // Send chunks
    for (let i = 0; i < chunks.length; i++) {
      await chrome.runtime.sendMessage({
        type: "CAPTURE_CHUNKED_DATA",
        chunkIndex: i,
        chunkData: chunks[i],
        totalChunks: chunks.length,
      });
      // Small delay to avoid overwhelming the message channel
      await wait(10);
    }

    // Send complete
    await chrome.runtime.sendMessage({
      type: "CAPTURE_CHUNKED_COMPLETE",
      totalChunks: chunks.length,
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📨 [CONTENT SCRIPT] Received message:", message.type);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Only allow capture orchestration from the top frame; sandboxed iframes (about:blank) should ignore
    const isTopFrame = window.top === window;

    if (
      isTopFrame &&
      (message.type === "start-capture" || message.type === "START_CAPTURE")
    ) {
      const currentUrl = window.location.href || "";
      if (!isCapturablePageUrl(currentUrl)) {
        const blockedType = describeUrlType(currentUrl);
        const errorMessage = `Cannot capture this page. Chrome blocks debugger access to ${blockedType} URLs. Please capture a regular webpage (http:// or https://).`;
        console.error("❌ Capture blocked:", errorMessage, { currentUrl });
        overlay.update("❌ " + errorMessage);
        chrome.runtime.sendMessage(
          { type: "CAPTURE_ERROR", error: errorMessage },
          () => void chrome.runtime.lastError
        );
        sendResponse({ started: false, error: errorMessage });
        return true;
      }

      document.body.setAttribute("data-debug-startcapture", "received");
      const startTime = Date.now();
      console.log("🚀 [CAPTURE START] Initiating capture process...");
      console.log("   ⏱️  Started at:", new Date().toLocaleTimeString());
      isCapturing = true;
      sendCaptureProgress("Capture started", 20, {
        allowNavigation: message.allowNavigation,
      });

      // Notify test script if listening
      window.postMessage({ type: "CAPTURE_STARTED" }, "*");

      const allowNavigation = Boolean(message.allowNavigation);

      // Get natural page dimensions without forcing resize
      const naturalDimensions = detectNaturalPageDimensions();

      const viewports: CaptureViewportTarget[] = message.viewports || [
        {
          name: "Natural",
          width: naturalDimensions.width,
          height: naturalDimensions.height,
          deviceScaleFactor: window.devicePixelRatio || 1,
          preserveNatural: true,
        },
      ];
      console.log(
        `📐 [VIEWPORTS] Prepared ${viewports.length} viewport configuration(s)`
      );
      viewports.forEach((vp, idx) => {
        console.log(`   ${idx + 1}. ${vp.name}: ${vp.width}x${vp.height}px`);
      });

      // Send response IMMEDIATELY before async work to acknowledge message receipt
      sendResponse({ started: true });

      handleMultiViewportCapture(viewports, allowNavigation)
        .then(() => {
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log(
            `✅ [CAPTURE COMPLETE] All ${viewports.length} viewport(s) captured successfully`
          );
          console.log(`   ⏱️  Total duration: ${duration}s`);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        })
        .catch((error) => {
          console.error("❌ Capture failed:", error);

          // Even if capture failed, show dialog with error message
          overlay.hide();

          // Create a minimal capture data for error case
          const errorCaptureData = {
            version: "2.0.0",
            multiViewport: true,
            captures: [],
            error: error.message,
            errorCode: (error as any).code,
            errorDetails: (error as any).details,
          };

          setTimeout(() => {
            console.log("📋 Showing error completion dialog");
            showCaptureCompletionDialog(0, "0", errorCaptureData as any);
          }, 1000);
        })
        .finally(() => {
          isCapturing = false;
        });

      // Return true to indicate we've handled the message (response already sent)
      return true;
    }

    if (message.type === "START_SELECTION_CAPTURE") {
      console.log("🎯 [SELECTION CAPTURE] Starting selection mode...");

      const selectionOverlay = new SelectionOverlay(
        (element) => {
          console.log("✅ [SELECTION CAPTURE] Element selected:", element);
          // Trigger capture for this specific element
          // For now, we'll just capture the viewport but we should ideally pass the element bounds
          // to the capture logic to crop or focus on it.
          // TODO: Implement element-specific capture logic in handleCapture/extractPage

          // Temporarily using full page capture but logging the selection
          // In a real implementation, we'd pass the element to extractPage

          // Trigger standard capture flow but maybe with a flag or specific target
          handleCapture(
            {
              name: "Selection",
              width: window.innerWidth,
              height: window.innerHeight,
              preserveNatural: true,
            },
            true,
            false
          ).then((result) => {
            // Post-process result to filter for selected element if possible
            // or just send as is for now
            chrome.runtime.sendMessage({
              type: "CAPTURE_COMPLETE",
              data: result.data,
              dataSize: JSON.stringify(result.data).length,
              dataSizeKB: (JSON.stringify(result.data).length / 1024).toFixed(
                1
              ),
            });
            overlay.update("✅ Selection captured!");
            setTimeout(() => overlay.hide(), 1500);
          });
        },
        () => {
          console.log("❌ [SELECTION CAPTURE] Cancelled");
          overlay.update("Selection cancelled");
          setTimeout(() => overlay.hide(), 1500);
        }
      );

      selectionOverlay.start();
      overlay.show("🎯 Select an element to capture (Esc to cancel)");
      sendResponse({ started: true });
    }

    if (message.type === "PING") {
      sendResponse({ pong: true });
      return false;
    }

    return false;
  });

  // Listen for messages from the main page (for testing/automation)
  let extractionDone = false;

  window.addEventListener("message", (event) => {
    // Only accept messages from ourselves
    if (event.source !== window) return;

    // Reset watchdog on any valid message from injected script
    if (event.data.type && event.data.type.startsWith("EXTRACTION_")) {
      resetWatchdog();
    }

    if (event.data.type === "EXTRACTION_COMPLETE") {
      extractionDone = true;
    }

    if (event.data.type === "EXTRACTION_ERROR") {
      if (extractionDone) {
        console.warn(
          "[CAPTURE] EXTRACTION_ERROR ignored after completion:",
          event.data.error
        );
        return;
      }
      // Continue with normal error handling...
    }

    if (event.data.type === "FETCH_IMAGE_PROXY") {
      const { url, requestId } = event.data;
      console.log(`🔄 [PROXY] Fetching image via background: ${url}`);

      chrome.runtime.sendMessage(
        {
          type: "FETCH_IMAGE",
          url,
        },
        (response) => {
          // Forward response back to injected script
          window.postMessage(
            {
              type: "FETCH_IMAGE_PROXY_RESPONSE",
              requestId,
              success: response?.base64 ? true : false,
              data: response?.base64
                ? {
                    base64: response.base64,
                    width: 0, // Background script doesn't calculate dimensions currently
                    height: 0,
                  }
                : undefined,
              error:
                response?.error ||
                (chrome.runtime.lastError
                  ? chrome.runtime.lastError.message
                  : "Unknown error"),
            },
            "*"
          );
        }
      );
      return;
    }

    if (event.data.type === "START_CAPTURE_TEST") {
      document.body.setAttribute("data-debug-postmessage", "received");
      console.log("🧪 [TEST] Received capture trigger via postMessage");
      // Simulate the runtime message
      const mockMessage = {
        type: "start-capture",
        allowNavigation: false,
        viewports: event.data.viewports,
      };

      // Trigger via background
      chrome.runtime.sendMessage({ type: "TRIGGER_CAPTURE_FOR_TAB" });
    }

    // Proxy for image fetching from injected script (Main World) to background (Isolated World)
    if (event.data.type === "FETCH_IMAGE_PROXY") {
      const { url, requestId } = event.data;
      console.log(`🔄 [PROXY] Forwarding image fetch for ${requestId}`);

      chrome.runtime.sendMessage({ type: "FETCH_IMAGE", url }, (response) => {
        // Send response back to Main World
        window.postMessage(
          {
            type: "FETCH_IMAGE_RESULT",
            requestId,
            response,
          },
          "*"
        );
      });
    }

    // Ping handler to verify bridge connection
    if (event.data.type === "PING_PROXY") {
      console.log("🏓 [PROXY] Ping received, sending pong");
      window.postMessage({ type: "PONG_PROXY", timestamp: Date.now() }, "*");
    }
  });

  type CaptureViewportTarget = {
    name?: string;
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    preserveNatural?: boolean;
  };

  async function handleMultiViewportCapture(
    viewports: CaptureViewportTarget[],
    allowNavigation: boolean
  ) {
    const captures: any[] = [];

    try {
      console.log("💉 Injecting script once for all viewports...");
      overlay.show("📦 Preparing capture...");

      chrome.runtime.sendMessage({
        type: "CAPTURE_PROGRESS",
        status: "Preparing capture script...",
        current: 0,
        total: viewports.length,
      });
      sendCaptureProgress("Preparing capture script", 22, {
        viewports: viewports.length,
      });

      await injectScript();
      await wait(500);

      for (let i = 0; i < viewports.length; i++) {
        const viewport = viewports[i];
        console.log(
          `\n📐 [VIEWPORT ${i + 1}/${viewports.length}] ${viewport.name}`
        );
        console.log(`   📏 Dimensions: ${viewport.width}x${viewport.height}px`);
        console.log(`   🔄 Starting capture sequence...`);

        overlay.show(
          `🔄 Capturing ${viewport.name} (${i + 1}/${viewports.length})...`
        );

        chrome.runtime.sendMessage({
          type: "CAPTURE_PROGRESS",
          status: `Resizing to ${viewport.name} (${viewport.width}x${viewport.height})...`,
          current: i + 1,
          total: viewports.length,
          viewport: viewport.name,
        });
        sendCaptureProgress(
          `Capturing ${viewport.name}`,
          Math.min(25 + i * 5, 35),
          {
            viewport: viewport.name,
            index: i + 1,
            total: viewports.length,
          }
        );

        await wait(300);

        const captureResult = await handleCapture(
          viewport,
          true,
          allowNavigation
        );

        if (captureResult && captureResult.data) {
          captures.push({
            viewport: viewport.name,
            width: viewport.width,
            height: viewport.height,
            data: captureResult.data,
            validationReport: captureResult.validationReport,
            previewWithOverlay: captureResult.previewWithOverlay,
          });

          chrome.runtime.sendMessage({
            type: "CAPTURE_PROGRESS",
            status: `${viewport.name} captured ✓`,
            current: i + 1,
            total: viewports.length,
            viewport: viewport.name,
            completed: true,
          });
        }

        if (i < viewports.length - 1) {
          await wait(500);
        }
      }

      console.log(`📦 Sending ${captures.length} viewport captures to popup`);
      const captureData = {
        version: "2.0.0",
        multiViewport: true,
        captures,
      };

      // Expose capture payload for automated tests/diagnostics
      (window as any).lastCaptureData = captureData;

      // Check if this was a chunked transfer (for large pages like Amazon)
      const isChunkedCapture = captures.some((c) => c.data?.chunked === true);

      if (isChunkedCapture) {
        console.log(
          "✅ Chunked capture detected - background already has data"
        );
        overlay.update("✅ Capture complete!");

        // Wait a moment to show success message
        await wait(1500);
        overlay.hide();

        // Show completion dialog - background has the real data
        await wait(500);
        console.log("📋 Showing completion dialog for chunked capture");
        showCaptureCompletionDialog(
          captures.length,
          "Large", // Size is in background
          { chunked: true }, // Signal to use background's cached data
          undefined
        );

        return;
      }

      // Send to background (chunked if large to avoid message size limits)
      await sendCaptureToBackground(captureData);
      let totalSize = 0;
      try {
        totalSize = JSON.stringify(captureData).length;
      } catch (e) {
        totalSize = 0;
      }
      const totalSizeKB = totalSize ? (totalSize / 1024).toFixed(1) : "unknown";
      sendCaptureProgress("Capture complete", 100, {
        totalSizeKB,
        captures: captures.length,
      });

      overlay.update(
        `✅ All ${captures.length} viewports captured! (${totalSizeKB} KB)`
      );
      console.log("EXTRACTION_COMPLETE");
      document.body.setAttribute("data-capture-status", "complete");

      // Wait a moment to show success message, then show dialog
      await wait(1500);
      console.log("📋 Hiding overlay...");
      overlay.hide();

      // Validate capture data before showing dialog
      const hasValidData = captures.some(
        (capture) => capture.data && capture.data.tree
      );
      const dialogOptions = hasValidData
        ? undefined
        : {
            disableSendToFigma: true,
            message:
              "Capture finished but schema data is incomplete. Download JSON to inspect raw output.",
          };
      if (!hasValidData) {
        console.warn(
          "⚠️ No valid capture data with tree structure found. Showing limited completion dialog."
        );
      }

      // Show completion dialog with options
      await wait(500); // Small delay to ensure overlay is hidden
      console.log("📋 About to show completion dialog with:", {
        captureCount: captures.length,
        sizeKB: totalSizeKB,
        limited: !hasValidData,
      });

      try {
        showCaptureCompletionDialog(
          captures.length,
          totalSizeKB,
          captureData,
          dialogOptions
        );
        console.log("📋 Completion dialog displayed successfully");
      } catch (e) {
        console.error("❌ Failed to show completion dialog:", e);
        alert(
          "Capture complete! (" +
            totalSizeKB +
            " KB). Check console for details."
        );
      }

      // Auto-queue handoff so the plugin can import without relying on the popup payload
      try {
        const payloadForHandoff = (captureData as any).chunked
          ? null
          : captureData;
        await chrome.runtime.sendMessage({
          type: "SEND_TO_HANDOFF",
          data: payloadForHandoff,
        });
        console.log("🚀 Auto handoff enqueue requested");
      } catch (e) {
        console.warn("⚠️ Auto handoff enqueue failed", e);
      }
    } finally {
      // Don't reset viewport - this was causing page refresh
      // The browser will naturally restore viewport when user navigates away
      console.log("📦 Capture pipeline complete - keeping current viewport");
      resetWatchdog(); // Reset watchdog after capture pipeline completes
    }
  }

  async function handleCapture(
    viewport?: CaptureViewportTarget,
    skipInject?: boolean,
    allowNavigation: boolean = false
  ): Promise<any> {
    try {
      const currentUrl = window.location.href || "";
      if (!isCapturablePageUrl(currentUrl)) {
        const blockedType = describeUrlType(currentUrl);
        const errorMessage = `Cannot capture this page. Chrome blocks debugger access to ${blockedType} URLs. Please capture a regular webpage (http:// or https://).`;
        console.error("❌ Capture blocked:", errorMessage);
        overlay.update("❌ " + errorMessage);
        throw new Error(errorMessage);
      }

      // CDP capture doesn't need injected script - it uses the DevTools Protocol directly

      // Only resize viewport if explicitly requested (not for natural capture)
      const viewportConfig = getViewportDimensions(viewport);
      if (viewportConfig && !viewport?.preserveNatural) {
        console.log(
          "🪟 Resizing viewport to",
          viewportConfig.width,
          "x",
          viewportConfig.height
        );
        await chrome.runtime.sendMessage({
          type: "SET_VIEWPORT",
          width: viewportConfig.width,
          height: viewportConfig.height,
          deviceScaleFactor: viewportConfig.deviceScaleFactor,
        });
        await wait(250);
      } else if (viewport?.preserveNatural) {
        console.log(
          "📐 Capturing at natural page dimensions:",
          viewportConfig?.width + "x" + viewportConfig?.height
        );
      }

      // Scroll page
      console.log("📍 Step 2: Scroll page");
      overlay.update("📜 Scrolling page...");
      sendCaptureProgress("Scrolling page", 30);
      await scroller.scrollPage();
      await wait(200);

      // Capture interactive states (dropdowns, accordions, etc.)
      console.log("📍 Step 2b: Capturing interactive states...");
      overlay.update("🖱️ Expanding dropdowns & menus...");
      sendCaptureProgress("Capturing interactive states", 32);
      await scroller.captureInteractiveStates();
      await wait(200);

      // Capture screenshot
      console.log("📍 [STEP 3/4] Capturing screenshot...");

      const screenshotStart = Date.now();
      const screenshot = await captureScreenshot();
      const optimizedScreenshot = await optimizeScreenshot(screenshot);
      const screenshotTime = ((Date.now() - screenshotStart) / 1000).toFixed(2);

      if (screenshot) {
        const sizeKB = (screenshot.length / 1024).toFixed(1);
        console.log(
          `✅ Screenshot captured successfully (${sizeKB}KB, took ${screenshotTime}s)`
        );
        sendCaptureProgress("Screenshot captured", 40, { sizeKB });
      } else {
        console.warn("⚠️  Screenshot capture failed or returned empty");
        sendCaptureProgress("Screenshot capture failed", 40);
      }

      // Reset watchdog after screenshot completes
      resetWatchdog();

      // Wait longer to respect Chrome's MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota (2 per second)
      await wait(600);

      // Extract DOM
      console.log("📍 [STEP 4/4] Extracting DOM structure...");
      sendCaptureProgress("Starting DOM extraction", 45);

      const extractStart = Date.now();
      const result = await extractPage(
        optimizedScreenshot || screenshot,
        viewportConfig || undefined,
        allowNavigation
      );
      const extractTime = ((Date.now() - extractStart) / 1000).toFixed(2);

      if (result.data) {
        const elementCount = result.data.tree?.children?.length || 0;
        console.log(
          `✅ DOM extraction complete (${elementCount} elements, took ${extractTime}s)`
        );
        sendCaptureProgress("DOM extraction complete", 70, {
          elements: elementCount,
          viewport:
            viewport?.name ||
            viewportConfig?.width + "x" + viewportConfig?.height,
        });
      } else {
        console.error("❌ DOM extraction failed - no data returned");
        sendCaptureProgress("DOM extraction failed", 70);
      }

      if (viewport?.name && result.data?.metadata) {
        result.data.metadata.viewportName = viewport.name;
      }
      if (viewportConfig?.width && result.data?.metadata) {
        result.data.metadata.viewportWidth = viewportConfig.width;
      }
      if (viewportConfig?.height && result.data?.metadata) {
        result.data.metadata.viewportHeight = viewportConfig.height;
      }

      return result;
    } catch (error) {
      console.error("❌ Capture failed:", error);
      overlay.update("❌ Capture failed: " + String(error));
      await wait(2000);
      throw error;
    }
  }

  function injectScript(): Promise<void> {
    // If already injected this content script session, skip
    if (isScriptInjected) {
      console.log("💉 Script already injected in this session, reusing");
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Start the watchdog
      resetWatchdog();

      console.log("💉 Injecting script via chrome.scripting (CSP-safe)...");
      const candidatePaths = ["dist/injected-script.js", "injected-script.js"];

      // First, try to inject via the background page using chrome.scripting (bypasses page CSP)
      chrome.runtime.sendMessage(
        { type: "INJECT_IN_PAGE_SCRIPT", files: [candidatePaths[0]] },
        (response) => {
          if (response?.ok) {
            console.log(
              `✅ Injected script loaded via scripting API from ${candidatePaths[0]}`
            );
            isScriptInjected = true; // Mark as injected
            return resolve();
          }

          console.warn(
            "⚠️ Scripting API inject failed, falling back to DOM injection",
            response?.error || chrome.runtime.lastError?.message
          );

          // Fallback: inject via script tag (may be blocked by CSP)
          const tryLoad = (index: number) => {
            const script = document.createElement("script");
            const path = candidatePaths[index];
            script.src = chrome.runtime.getURL(path);
            script.onload = () => {
              console.log(`✅ Injected script loaded from ${path}`);
              script.remove();
              isScriptInjected = true; // Mark as injected
              resolve();
            };
            script.onerror = (error) => {
              console.error(`❌ Failed to inject script from ${path}:`, error);
              script.remove();
              if (index + 1 < candidatePaths.length) {
                console.log("↪️ Retrying injected script with fallback path");
                tryLoad(index + 1);
              } else {
                reject(new Error("Failed to inject script"));
              }
            };
            (document.head || document.documentElement).appendChild(script);
          };

          tryLoad(0);
        }
      );
    });
  }

  async function captureScreenshot(): Promise<string> {
    try {
      console.log("📸 Requesting screenshot...");
      const response = await chrome.runtime.sendMessage({
        type: "CAPTURE_SCREENSHOT",
      });
      console.log("📸 Screenshot response:", response ? "received" : "empty");
      return response.screenshot || "";
    } catch (e) {
      console.error("❌ Screenshot failed:", e);
      return "";
    }
  }

  async function extractPage(
    screenshot: string,
    viewport?: CaptureViewportTarget | null,
    allowNavigation: boolean = false
  ): Promise<any> {
    console.log("📸 Starting Direct DOM extraction...");

    overlay.update("🔍 Extracting DOM structure... (25%)");
    chrome.runtime.sendMessage(
      {
        type: "EXTRACTION_PROGRESS",
        phase: "Extracting DOM",
        message: "Extracting DOM structure...",
        percent: 25,
      },
      () => void chrome.runtime.lastError
    );
    sendCaptureProgress("Extracting DOM structure", 25);

    return new Promise(async (resolve, reject) => {
      // Set up message listener for extraction results
      const messageListener = (event: MessageEvent) => {
        // Relaxed check for extraction messages to ensure we catch them from Main World
        const isExtractionMessage =
          event.data?.type === "EXTRACTION_COMPLETE" ||
          event.data?.type === "EXTRACTION_PROGRESS" ||
          event.data?.type === "EXTRACTION_ERROR" ||
          event.data?.type === "EXT_DEBUG_LOG";

        if (event.source !== window && !isExtractionMessage) return;

        if (isExtractionMessage && event.source !== window) {
          console.log(
            `📨 [DEBUG] Received ${event.data.type} from non-window source`,
            event.source
          );
        }

        if (event.data.type === "EXTRACTION_COMPLETE") {
          console.log("✅ Extraction complete, received data");
          window.removeEventListener("message", messageListener);

          const schema = event.data.data;

          // Attach screenshot to schema
          if (screenshot && schema) {
            schema.screenshot = screenshot;
          }

          // Add viewport metadata
          if (viewport?.name && schema?.metadata) {
            schema.metadata.viewportName = viewport.name;
          }
          if (viewport?.width && schema?.metadata) {
            schema.metadata.viewportWidth = viewport.width;
          }
          if (viewport?.height && schema?.metadata) {
            schema.metadata.viewportHeight = viewport.height;
          }

          overlay.update("✅ DOM extraction complete (50%)");
          chrome.runtime.sendMessage(
            {
              type: "EXTRACTION_PROGRESS",
              phase: "Extracting",
              message: "DOM extraction complete",
              percent: 50,
              stats: {
                elements: schema?.tree?.children?.length,
                images: schema?.assets?.images
                  ? Object.keys(schema.assets.images).length
                  : undefined,
              },
            },
            () => void chrome.runtime.lastError
          );

          resolve({
            data: schema,
            validationReport: null,
            previewWithOverlay: null,
          });
        }

        if (event.data.type === "EXTRACTION_ERROR") {
          console.error("❌ Extraction error:", event.data.error);
          chrome.runtime.sendMessage(
            {
              type: "CAPTURE_ERROR",
              error: event.data.error,
              details: event.data.details,
            },
            () => void chrome.runtime.lastError
          );
          window.removeEventListener("message", messageListener);
          reject(new Error(event.data.error));
        }

        if (event.data.type === "EXTRACTION_PROGRESS") {
          console.log(
            `📊 Progress: ${event.data.message} (${event.data.percent}%)`
          );
          overlay.update(`${event.data.message} (${event.data.percent}%)`);
          sendCaptureProgress(
            event.data.message || "Extracting",
            event.data.percent,
            event.data.stats || event.data.data
          );
          chrome.runtime.sendMessage(
            {
              type: "EXTRACTION_PROGRESS",
              phase: event.data.phase || "Extracting",
              message: event.data.message,
              percent: event.data.percent,
              current: event.data.current,
              total: event.data.total,
              stats: event.data.stats || event.data.data,
            },
            () => void chrome.runtime.lastError
          );
        }

        if (event.data.type === "EXT_DEBUG_LOG") {
          // Forward to background for server logging
          chrome.runtime.sendMessage({
            type: "LOG_TO_SERVER",
            message: event.data.message,
            data: event.data.data,
          });
        }
      };

      window.addEventListener("message", messageListener);

      // CRITICAL: Wait for injected script's event listener to be ready
      console.log("⏳ Waiting for injected script listener to register...");
      chrome.runtime.sendMessage({
        type: "LOG_TO_SERVER",
        message: "Waiting for injected script...",
      });

      const waitForInjectedScript = async () => {
        console.log("⏳ Waiting for PONG...");
        return new Promise<boolean>((resolve) => {
          let resolved = false;
          const pongListener = (e: MessageEvent) => {
            if (e.data.type === "PONG") {
              console.log("✅ PONG received!");
              resolved = true;
              window.removeEventListener("message", pongListener);

              chrome.runtime.sendMessage({
                type: "LOG_TO_SERVER",
                message: "Injected script ready!",
              });

              resolve(true);
            }
          };
          window.addEventListener("message", pongListener);

          // Send PINGs every 200ms for 5 seconds
          let attempts = 0;
          const interval = setInterval(() => {
            if (resolved) {
              clearInterval(interval);
              return;
            }
            if (attempts >= 25) {
              // 5 seconds
              clearInterval(interval);
              window.removeEventListener("message", pongListener);
              console.warn("❌ PING timeout after 5s");

              chrome.runtime.sendMessage({
                type: "LOG_TO_SERVER",
                message: "Injected script PING timeout",
              });

              resolve(false);
              return;
            }
            console.log(`Ping attempt ${attempts + 1}`);
            window.postMessage({ type: "PING" }, "*");
            attempts++;
          }, 200);

          // Send first one immediately
          window.postMessage({ type: "PING" }, "*");
        });
      };

      const isReady = await waitForInjectedScript();
      if (!isReady) {
        console.warn(
          "⚠️ Injected script did not respond to PING. Attempting to proceed anyway..."
        );
        chrome.runtime.sendMessage({
          type: "LOG_TO_SERVER",
          message: "Proceeding despite PING failure",
        });
      }

      // Trigger extraction by posting message to injected script
      console.log("📤 Posting START_EXTRACTION message to injected script");
      chrome.runtime.sendMessage({
        type: "LOG_TO_SERVER",
        message: "Posting START_EXTRACTION",
      });
      window.postMessage(
        {
          type: "START_EXTRACTION",
          allowNavigation: allowNavigation,
        },
        "*"
      );

      // Set timeout to prevent hanging forever
      setTimeout(() => {
        window.removeEventListener("message", messageListener);
        reject(new Error("DOM extraction timed out after 60 seconds"));
      }, 60000);
    });
  }

  interface CaptureData {
    version: string;
    metadata: any;
    tree: any;
    assets: any;
    styles: any;
    components?: any;
    variants?: any;
    designTokens?: any;
    designTokensRegistry?: any;
    cssVariables?: any;
    screenshot?: string;
    validation?: any;
    assetOptimization?: any;
    coordinateMetrics?: any;
    comprehensiveStates?: any;
    [key: string]: any; // Allow for other properties
  }

  async function sendLargeCaptureData(
    captureData: CaptureData,
    totalSize: number,
    totalSizeKB: string
  ): Promise<void> {
    try {
      console.log("📦 sendLargeCaptureData called");
      // Use smaller chunks to avoid Chrome's message size limit
      const chunkSize = 256 * 1024; // 256KB chunks (Chrome limit is ~64MB but smaller is safer)

      // Yield to UI before heavy operation
      await wait(10);

      console.log(
        "📦 Stringifying capture data for chunking (may take a moment)..."
      );
      const startStringify = Date.now();

      // Use smaller chunks of work to avoid complete UI freeze
      let jsonString: string;
      try {
        jsonString = JSON.stringify(captureData);
      } catch (e) {
        console.error("❌ Failed to stringify capture data:", e);
        throw e;
      }

      console.log(
        `📦 Stringify complete in ${Date.now() - startStringify}ms. Length: ${
          jsonString.length
        }`
      );

      // Yield to UI after stringify
      await wait(10);

      const chunks: string[] = [];

      // Split into chunks
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        chunks.push(jsonString.slice(i, i + chunkSize));
      }

      console.log(`📦 Splitting large capture into ${chunks.length} chunks`);

      // Send metadata first
      await chrome.runtime.sendMessage({
        type: "CAPTURE_CHUNKED_START",
        totalChunks: chunks.length,
        totalSize: totalSize,
        totalSizeKB: totalSizeKB,
      });

      // Send chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        console.log(`📦 Sending chunk ${i + 1}/${chunks.length}...`);
        await chrome.runtime.sendMessage({
          type: "CAPTURE_CHUNKED_DATA",
          chunkIndex: i,
          chunkData: chunks[i],
          totalChunks: chunks.length,
        });

        // Small delay between chunks to avoid overwhelming the background script
        await wait(50);
      }

      // Send completion signal
      await chrome.runtime.sendMessage({
        type: "CAPTURE_CHUNKED_COMPLETE",
        totalChunks: chunks.length,
      });
    } catch (error) {
      console.error("❌ Failed to send large capture data:", error);
      // Fallback to regular send (may fail due to size)
      chrome.runtime.sendMessage({
        type: "CAPTURE_COMPLETE",
        data: captureData,
        dataSize: totalSize,
        dataSizeKB: totalSizeKB,
        sizeLimitExceeded: true,
      });
    }
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function detectNaturalPageDimensions() {
    // Method 1: Document content dimensions
    const contentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth,
      document.body?.scrollWidth || 0,
      document.body?.offsetWidth || 0
    );

    const contentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight,
      document.body?.scrollHeight || 0,
      document.body?.offsetHeight || 0
    );

    // Method 3: Check for absolute/fixed positioned elements that might expand bounds
    // This is crucial for single-page apps where body height might be 100vh but content overflows
    let maxBottom = 0;
    let maxRight = 0;
    // Sample first 100 children to avoid performance hit on massive DOMs
    const children = Array.from(document.body.children).slice(0, 100);
    for (const child of children) {
      if (child instanceof HTMLElement) {
        const rect = child.getBoundingClientRect();
        // Add scroll position to get absolute coordinates
        const bottom = rect.bottom + window.scrollY;
        const right = rect.right + window.scrollX;
        maxBottom = Math.max(maxBottom, bottom);
        maxRight = Math.max(maxRight, right);
      }
    }

    const finalContentWidth = Math.max(contentWidth, maxRight);
    const finalContentHeight = Math.max(contentHeight, maxBottom);

    // Method 2: Current viewport dimensions
    const viewportWidth = Math.max(
      document.documentElement.clientWidth,
      window.innerWidth || 0
    );
    const viewportHeight = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0
    );

    // Use the larger of content vs viewport for natural dimensions
    const naturalWidth = Math.max(finalContentWidth, viewportWidth);
    const naturalHeight = Math.max(finalContentHeight, viewportHeight);

    console.log("📐 Natural page dimensions detected:", {
      content: { width: contentWidth, height: contentHeight },
      viewport: { width: viewportWidth, height: viewportHeight },
      natural: { width: naturalWidth, height: naturalHeight },
    });

    return {
      width: naturalWidth,
      height: naturalHeight,
      contentWidth: finalContentWidth,
      contentHeight: finalContentHeight,
      viewportWidth,
      viewportHeight,
    };
  }

  function getViewportDimensions(target?: CaptureViewportTarget) {
    if (!target) return null;

    // If preserveNatural is set, use natural dimensions
    if (target.preserveNatural) {
      const natural = detectNaturalPageDimensions();
      return {
        width: natural.width,
        height: natural.height,
        deviceScaleFactor:
          target.deviceScaleFactor ?? (window.devicePixelRatio || 1),
      };
    }

    if (target.width && target.height) {
      return {
        width: target.width,
        height: target.height,
        deviceScaleFactor: target.deviceScaleFactor ?? 1,
      };
    }

    if (target.name) {
      const normalized = target.name.toLowerCase();
      if (normalized === "mobile") {
        return { width: 375, height: 812, deviceScaleFactor: 2 };
      }
      if (normalized === "tablet") {
        return { width: 768, height: 1024, deviceScaleFactor: 2 };
      }
      if (normalized === "desktop") {
        // For desktop, use natural dimensions instead of forcing screen size
        const natural = detectNaturalPageDimensions();
        return {
          width: natural.width,
          height: natural.height,
          deviceScaleFactor: window.devicePixelRatio || 1,
        };
      }
      if (normalized === "current" || normalized === "natural") {
        const natural = detectNaturalPageDimensions();
        return {
          width: natural.width,
          height: natural.height,
          deviceScaleFactor: window.devicePixelRatio || 1,
        };
      }
    }
    return null;
  }

  async function optimizeScreenshot(dataUrl: string): Promise<string | null> {
    if (!dataUrl) return null;
    try {
      const image = await loadImage(dataUrl);
      const maxSide = 1400;
      let { width, height } = image;

      if (width <= 0 || height <= 0) return dataUrl;

      if (width > maxSide || height > maxSide) {
        const scale = Math.min(maxSide / width, maxSide / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;

      ctx.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.55);
    } catch (error) {
      console.warn("⚠️ Failed to optimize screenshot, using original.", error);
      return dataUrl;
    }
  }

  function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  type CompletionDialogOptions = {
    disableSendToFigma?: boolean;
    message?: string;
  };

  function showCaptureCompletionDialog(
    viewportCount: number,
    sizeKB: string,
    captureData: any,
    options: CompletionDialogOptions = {}
  ) {
    console.log("🎯 showCaptureCompletionDialog called with:", {
      viewportCount,
      sizeKB,
      hasData: !!captureData,
    });

    // Remove any existing dialog
    const existingDialog = document.getElementById("capture-completion-dialog");
    if (existingDialog) {
      console.log("🗑️ Removing existing dialog");
      existingDialog.remove();
    }

    // Create completion dialog
    const dialog = document.createElement("div");
    dialog.id = "capture-completion-dialog";
    dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
    color: #333;
    min-width: 400px;
    max-width: 500px;
    border: 1px solid #e0e0e0;
  `;

    const statusMessage = options.message
      ? `
    <div style="
      margin-top: 8px;
      background: #fff7e6;
      border: 1px solid #ffd599;
      border-radius: 8px;
      padding: 10px 12px;
      color: #8a6116;
      font-size: 13px;
      text-align: left;
    ">
      ${options.message}
    </div>
  `
      : "";

    const isError = !!captureData.error;
    const title = isError ? "Capture Failed" : "Page Captured!";
    const icon = isError ? "❌" : "✅";
    const titleColor = isError ? "#d32f2f" : "#2e7d32";

    let contentHtml = "";

    if (isError) {
      console.log("🔍 Error Debug Info:");
      console.log("  captureData:", captureData);
      console.log("  captureData.error:", captureData.error);
      console.log("  captureData.errorCode:", captureData.errorCode);
      console.log("  captureData.errorDetails:", captureData.errorDetails);

      const details = captureData.errorDetails;
      console.log("  details object:", details);
      console.log("  details?.context:", details?.context);
      console.log("  details?.suggestions:", details?.suggestions);
      console.log("  details?.breadcrumb:", details?.breadcrumb);
      console.log("  details?.stack:", details?.stack);

      const context = details?.context;
      const suggestions = details?.suggestions || context?.suggestions || [];
      const breadcrumb = context?.breadcrumb || [];
      const timing = context?.timing;
      const pageState = context?.pageState;
      const stack = details?.stack || context?.stack;

      // Format error report for copying
      const errorReport = `
CAPTURE ERROR REPORT
===================
Error Code: ${captureData.errorCode || "UNKNOWN_ERROR"}
Message: ${captureData.error}
Time: ${new Date().toISOString()}

${
  pageState
    ? `
Page State:
- URL: ${pageState.url}
- DOM Elements: ${pageState.domElementCount}
- Viewport: ${pageState.viewportWidth}x${pageState.viewportHeight}
- Memory: ${pageState.memoryUsageMB?.toFixed(1)}MB
`
    : ""
}

${
  timing
    ? `
Timing:
- Total Duration: ${timing.duration}ms
- Phase Timings: ${JSON.stringify(timing.phaseTimings, null, 2)}
`
    : ""
}

${
  breadcrumb.length > 0
    ? `
Breadcrumb:
${breadcrumb
  .map(
    (b: any) =>
      `  ${new Date(b.timestamp).toISOString()} - ${b.phase}: ${b.status}`
  )
  .join("\\n")}
`
    : ""
}

${
  stack
    ? `
Stack Trace:
${stack}
`
    : ""
}

${
  suggestions.length > 0
    ? `
Suggestions:
${suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join("\\n")}
`
    : ""
}
    `.trim();

      contentHtml = `
      <div style="text-align: left; background: #ffebee; padding: 15px; border-radius: 8px; border: 1px solid #ffcdd2; margin-top: 10px;">
        <div style="font-weight: bold; color: #c62828; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
          <span>${captureData.errorCode || "UNKNOWN_ERROR"}</span>
          <button id="copy-error-report" style="
            background: #fff;
            border: 1px solid #999;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            color: #333;
          ">📋 Copy Report</button>
        </div>
        <div style="color: #b71c1c; font-size: 14px; margin-bottom: 10px;">${
          captureData.error
        }</div>
        
        ${
          suggestions.length > 0
            ? `
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
            <div style="font-weight: bold; color: #856404; font-size: 12px; margin-bottom: 5px;">💡 Suggestions:</div>
            <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 12px;">
              ${suggestions.map((s: string) => `<li>${s}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }

        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; font-size: 12px; color: #666; user-select: none;">
            🔍 Technical Details
          </summary>
          <div style="margin-top: 8px; font-size: 11px; background: rgba(255,255,255,0.7); padding: 8px; border-radius: 4px;">
            ${
              pageState
                ? `
              <div style="margin-bottom: 8px;">
                <strong>Page State:</strong><br/>
                URL: ${pageState.url}<br/>
                Elements: ${pageState.domElementCount}<br/>
                Viewport: ${pageState.viewportWidth}×${
                    pageState.viewportHeight
                  }<br/>
                ${
                  pageState.memoryUsageMB
                    ? `Memory: ${pageState.memoryUsageMB.toFixed(1)}MB<br/>`
                    : ""
                }
              </div>
            `
                : ""
            }
            
            ${
              timing
                ? `
              <div style="margin-bottom: 8px;">
                <strong>Timing:</strong><br/>
                Duration: ${timing.duration}ms<br/>
                ${
                  timing.phaseTimings
                    ? `
                  Phases: ${Object.entries(timing.phaseTimings || {})
                    .map(
                      ([phase, time]) =>
                        `${phase}=${Math.round(time as number)}ms`
                    )
                    .join(", ")}
                `
                    : ""
                }
              </div>
            `
                : ""
            }
            
            ${
              breadcrumb.length > 0
                ? `
              <div style="margin-bottom: 8px;">
                <strong>Breadcrumb:</strong><br/>
                <div style="max-height: 100px; overflow-y: auto; font-family: monospace; font-size: 10px;">
                  ${breadcrumb
                    .map((b: any) => `${b.phase}: ${b.status}`)
                    .join(" → ")}
                </div>
              </div>
            `
                : ""
            }
            
            ${
              stack
                ? `
              <div>
                <strong>Stack Trace:</strong><br/>
                <pre style="max-height: 150px; overflow: auto; font-size: 9px; background: rgba(0,0,0,0.05); padding: 5px; border-radius: 3px;">${stack}</pre>
              </div>
            `
                : ""
            }
          </div>
        </details>
      </div>
    `;

      // Store error report for copy button
      (window as any).__lastErrorReport = errorReport;
    } else {
      contentHtml = `
      <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
        ${viewportCount} viewport${
        viewportCount > 1 ? "s" : ""
      } captured • ${sizeKB} KB
      </p>
      ${statusMessage}
    `;
    }

    dialog.innerHTML = `
    <div style="text-align: center; margin-bottom: 25px;">
      <div style="font-size: 48px; margin-bottom: 15px;">${icon}</div>
      <h2 style="margin: 0; color: ${titleColor}; font-size: 24px;">${title}</h2>
      ${contentHtml}
    </div>
    
    <div style="display: flex; gap: 15px; margin-top: 25px;">
      <button id="send-to-figma" style="
        flex: 1;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        📤 Send to Figma Plugin
      </button>
      
      <button id="download-json" style="
        flex: 1;
        background: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        💾 Download JSON
      </button>
    </div>
    
    <div style="margin-top: 15px; text-align: center;">
      <button id="close-dialog" style="
        background: none;
        border: none;
        color: #999;
        font-size: 14px;
        cursor: pointer;
        text-decoration: underline;
      ">
        Close
      </button>
    </div>
  `;

    // Add event listeners
    const sendToFigmaBtn = dialog.querySelector(
      "#send-to-figma"
    ) as HTMLButtonElement;
    const downloadJsonBtn = dialog.querySelector(
      "#download-json"
    ) as HTMLButtonElement;
    const closeBtn = dialog.querySelector("#close-dialog") as HTMLButtonElement;
    const copyErrorReportBtn = dialog.querySelector(
      "#copy-error-report"
    ) as HTMLButtonElement;

    // Handle copy error report button if present
    if (copyErrorReportBtn) {
      copyErrorReportBtn.addEventListener("click", async () => {
        const errorReport = (window as any).__lastErrorReport;
        if (errorReport) {
          try {
            await navigator.clipboard.writeText(errorReport);
            copyErrorReportBtn.textContent = "✅ Copied!";
            setTimeout(() => {
              copyErrorReportBtn.textContent = "📋 Copy Report";
            }, 2000);
          } catch (err) {
            console.error("Failed to copy error report:", err);
            copyErrorReportBtn.textContent = "❌ Copy failed";
            setTimeout(() => {
              copyErrorReportBtn.textContent = "📋 Copy Report";
            }, 2000);
          }
        }
      });
    }

    if (options.disableSendToFigma) {
      sendToFigmaBtn.disabled = true;
      sendToFigmaBtn.style.opacity = "0.55";
      sendToFigmaBtn.style.cursor = "not-allowed";
      sendToFigmaBtn.innerHTML = "🚫 Send unavailable";
      if (options.message) {
        sendToFigmaBtn.title = options.message;
      }
    }

    sendToFigmaBtn.addEventListener("click", () => {
      if (sendToFigmaBtn.disabled) {
        console.warn("Send to Figma disabled - schema incomplete.");
        return;
      }
      sendToFigmaBtn.textContent = "⏳ Sending...";
      sendToFigmaBtn.disabled = true;

      // If chunked, send null data to force background to use cached payload
      const payloadToSend = captureData.chunked ? null : captureData;

      chrome.runtime.sendMessage(
        {
          type: "SEND_TO_HANDOFF",
          data: payloadToSend,
        },
        (response) => {
          if (response?.ok) {
            sendToFigmaBtn.innerHTML = "✅ Sent to Figma!";
            setTimeout(() => dialog.remove(), 2000);
          } else {
            sendToFigmaBtn.innerHTML = "❌ Send failed";
            sendToFigmaBtn.disabled = false;
            // If it failed and was chunked, maybe the background lost the data?
            if (captureData.chunked) {
              alert(
                "Background process lost the capture data. Please try capturing again."
              );
            }
          }
        }
      );
    });

    downloadJsonBtn.addEventListener("click", async () => {
      downloadJsonBtn.textContent = "⏳ Preparing...";

      try {
        // Yield to UI
        await new Promise((resolve) => setTimeout(resolve, 10));

        // If chunked, delegate download to background script
        if (captureData.chunked) {
          console.log("📦 Requesting background download for chunked data...");
          chrome.runtime.sendMessage(
            {
              type: "TRIGGER_DOWNLOAD",
            },
            (response) => {
              if (response?.ok) {
                downloadJsonBtn.innerHTML = "✅ Download started!";
                setTimeout(() => dialog.remove(), 2000);
              } else {
                downloadJsonBtn.innerHTML = "❌ Download failed";
                console.error("Background download failed:", response?.error);
                alert(
                  "Failed to trigger download: " +
                    (response?.error || "Unknown error")
                );
              }
            }
          );
          return;
        }

        const jsonString = JSON.stringify(captureData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `page-capture-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        downloadJsonBtn.innerHTML = "✅ Downloaded!";
        setTimeout(() => dialog.remove(), 2000);
      } catch (error) {
        downloadJsonBtn.innerHTML = "❌ Download failed";
        console.error("Download failed:", error);
      }
    });

    closeBtn.addEventListener("click", () => {
      dialog.remove();
    });

    // Add hover effects
    sendToFigmaBtn.addEventListener("mouseenter", () => {
      if (!sendToFigmaBtn.disabled) {
        sendToFigmaBtn.style.transform = "translateY(-2px)";
      }
    });
    sendToFigmaBtn.addEventListener("mouseleave", () => {
      sendToFigmaBtn.style.transform = "translateY(0)";
    });

    downloadJsonBtn.addEventListener("mouseenter", () => {
      downloadJsonBtn.style.transform = "translateY(-2px)";
    });
    downloadJsonBtn.addEventListener("mouseleave", () => {
      downloadJsonBtn.style.transform = "translateY(0)";
    });

    // Add to page
    document.body.appendChild(dialog);
    console.log("✅ Completion dialog added to page with ID:", dialog.id);

    // Focus trap
    setTimeout(() => sendToFigmaBtn.focus(), 100);
  }

  /**
   * Recursively optimizes the DOM tree by removing non-essential data
   * used only for debugging or advanced layout analysis.
   */
  function optimizeTree(node: any) {
    if (!node) return;

    // Strip redundant layout data
    if (node.viewportLayout) delete node.viewportLayout;
    if (node.coordinateValidation) delete node.coordinateValidation;

    // Strip verbose arrays if empty
    if (node.cssClasses && node.cssClasses.length === 0) delete node.cssClasses;
    if (node.dataAttributes && Object.keys(node.dataAttributes).length === 0)
      delete node.dataAttributes;

    // Round coordinates to 1 decimal place to save bytes
    if (node.layout) {
      node.layout.x = Math.round(node.layout.x * 10) / 10;
      node.layout.y = Math.round(node.layout.y * 10) / 10;
      node.layout.width = Math.round(node.layout.width * 10) / 10;
      node.layout.height = Math.round(node.layout.height * 10) / 10;
    }

    if (node.absoluteLayout) {
      node.absoluteLayout.left = Math.round(node.absoluteLayout.left * 10) / 10;
      node.absoluteLayout.top = Math.round(node.absoluteLayout.top * 10) / 10;
      node.absoluteLayout.width =
        Math.round(node.absoluteLayout.width * 10) / 10;
      node.absoluteLayout.height =
        Math.round(node.absoluteLayout.height * 10) / 10;
      // Remove redundant right/bottom as they can be calculated
      delete node.absoluteLayout.right;
      delete node.absoluteLayout.bottom;
    }

    // Recurse
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        optimizeTree(child);
      }
    }

    // Handle pseudo-elements
    if (node.pseudoElements) {
      if (node.pseudoElements.before) optimizeTree(node.pseudoElements.before);
      if (node.pseudoElements.after) optimizeTree(node.pseudoElements.after);
      // Remove if empty
      if (!node.pseudoElements.before && !node.pseudoElements.after) {
        delete node.pseudoElements;
      }
    }
  }

  // Reset injection flag when page is about to unload
  window.addEventListener("beforeunload", () => {
    isScriptInjected = false;
    console.log("🔄 Page unloading, reset injection flag");
  });
})();
