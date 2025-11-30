import { CaptureErrorCode } from "./types/capture-result";
import pako from "pako";

// Global error handlers
self.addEventListener("error", (event: ErrorEvent) => {
  console.error("[GLOBAL_ERROR]", event.message, event.error);
});

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  console.error("[UNHANDLED_REJECTION]", event.reason);
});

console.log("Web to Figma extension loaded");

// Handoff server endpoint - using local server for development
// Allow overriding via a global for local testing; default to null so we try multiple bases
const HANDOFF_SERVER_URL: string | null = ((globalThis as any)
  .__HANDOFF_SERVER_URL ?? null) as string | null;
const HANDOFF_PORT = 5511; // non-conflicting local port for handoff server
const HANDOFF_BASE = HANDOFF_SERVER_URL || `http://localhost:${HANDOFF_PORT}`;
const CLOUD_CAPTURE_URL = HANDOFF_SERVER_URL;
const CLOUD_API_KEY =
  "f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2";

const HANDOFF_BASES = [
  ...(HANDOFF_SERVER_URL ? [HANDOFF_SERVER_URL.replace(/\/$/, "")] : []),
  "http://127.0.0.1:5511",
  "http://localhost:5511",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];
let handoffBaseIndex = 0;

function currentHandoffBase() {
  return HANDOFF_BASES[handoffBaseIndex] || HANDOFF_BASES[0];
}

function rotateHandoffBase() {
  handoffBaseIndex = (handoffBaseIndex + 1) % HANDOFF_BASES.length;
}

/**
 * Check if a URL can be captured via CDP debugger
 * Chrome blocks CDP attachment to certain URL schemes for security
 */
function isCapturableUrl(url: string): boolean {
  if (!url) return false;

  const restrictedPrefixes = [
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

  const isRestricted = restrictedPrefixes.some((prefix) =>
    url.startsWith(prefix)
  );
  console.log(`[capture] checking URL for support: ${url} -> ${!isRestricted}`);
  return !isRestricted;
}

/**
 * Get user-friendly URL type description for error messages
 */
function getUrlType(url: string): string {
  if (url.startsWith("chrome-extension://")) return "extension";
  if (url.startsWith("chrome://")) return "Chrome internal";
  if (url.startsWith("edge://")) return "Edge internal";
  if (url.startsWith("about:")) return "browser";
  if (url.startsWith("data:")) return "data";
  if (url.startsWith("file://")) return "local file";
  if (url.startsWith("view-source:")) return "view-source";
  return "restricted";
}

function handoffEndpoint(path: string) {
  return `${currentHandoffBase()}${path}`;
}

function buildUnsupportedUrlError(url: string | undefined | null) {
  const urlType = getUrlType(url || "");
  const message = `Cannot capture this page. Chrome blocks debugger access to ${urlType} URLs. Please capture a regular webpage (http:// or https://).`;
  return {
    ok: false,
    error: message,
    errorCode: CaptureErrorCode.UNSUPPORTED_URL_SCHEME,
  };
}

async function ensureSidePanelBehavior() {
  if (!chrome.sidePanel) return;

  try {
    if (chrome.sidePanel.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      console.log("[SIDEPANEL] Configured action to open side panel");
    }
  } catch (error) {
    console.warn("[SIDEPANEL] Failed to set panel behavior", error);
  }
}

// CDP capture mode flag (html.to.design-level accuracy)
// CDP capture mode is now mandatory (no fallback allowed per PIXEL_PERFECT_RULESET.md)

type HandoffTrigger = "auto" | "manual";
type HandoffStatus = "idle" | "queued" | "sending" | "success" | "error";

interface HandoffState {
  status: HandoffStatus;
  trigger?: HandoffTrigger | null;
  lastAttemptAt?: number | null;
  lastSuccessAt?: number | null;
  error?: string | null;
  pendingCount?: number;
  nextRetryAt?: number | null;
}

interface HandoffPayload {
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
  [key: string]: any;
}

interface PendingJob {
  id: string;
  payload: HandoffPayload;
  trigger: HandoffTrigger;
  enqueuedAt: number;
  retries: number;
  nextRetryAt?: number | null;
}

type WindowBounds = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
};

interface CaptureTabViewportState {
  windowId: number;
  originalBounds?: WindowBounds;
  appliedViewport?: { width: number; height: number };
}

const WINDOW_FRAME_FUDGE = { width: 16, height: 100 };

let lastCapturedPayload: any = null;
// DEBUG: Expose to global scope for console inspection
(self as any).lastCapturedPayload = null;

function updateLastCapturedPayload(payload: any) {
  lastCapturedPayload = payload;
  (self as any).lastCapturedPayload = payload;
}

// DEBUG: Helper function to inspect schema from console
(self as any).debugSchema = () => {
  const payload = (self as any).lastCapturedPayload;
  if (!payload) {
    console.log("❌ No capture payload found. Run a capture first.");
    return;
  }

  let schema;
  if (payload.rawSchemaJson) {
    try {
      schema = JSON.parse(payload.rawSchemaJson);
    } catch (e) {
      console.error("JSON parse error", e);
      return;
    }
  } else if (payload.schema) {
    schema = payload.schema;
  } else {
    schema = payload;
  }

  if (!schema) {
    console.log("❌ Invalid payload structure", payload);
    return;
  }

  const images = (schema.assets && schema.assets.images) || {};
  const imageKeys = Object.keys(images);
  const firstKey = imageKeys[0];
  const firstImage = firstKey ? images[firstKey] : null;

  const root = schema.tree;
  const firstChild =
    root && Array.isArray(root.children) ? root.children[0] : null;

  console.log("🔍 SCHEMA_DEBUG SNAPSHOT:", {
    viewport: schema.metadata?.viewport,
    totalImages: imageKeys.length,
    firstImage: firstImage
      ? {
          id: firstImage.id,
          url: firstImage.url,
          dims: `${firstImage.width}x${firstImage.height}`,
          hasData: !!firstImage.data,
          dataLen: firstImage.data?.length || 0,
        }
      : "None",
    rootNode: {
      type: root?.type,
      name: root?.name,
      childCount: root?.children?.length || 0,
    },
    firstNode: firstChild
      ? {
          name: firstChild.name,
          type: firstChild.type,
          imageHash: firstChild.imageHash,
          fills: firstChild.fills,
        }
      : "None",
  });
};
let handoffState: HandoffState = {
  status: "idle",
  trigger: null,
  pendingCount: 0,
};
let hasInFlightJob = false;
const pendingJobs: PendingJob[] = [];
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let popupWindowId: number | null = null;
const captureTabState: Record<number, CaptureTabViewportState> = {};
let captureDeliveryMode: "send" | "download" = "send";

// Chunked data handling
let chunkedDataBuffer: string[] = [];
let expectedChunks = 0;
let receivedChunks = 0;

chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel for the current window
  if (tab.windowId) {
    try {
      await ensureSidePanelBehavior();
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error("Failed to open side panel:", error);
    }
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.log(`Command "${command}" triggered`);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;

    if (command === "capture-full-page") {
      chrome.tabs.sendMessage(tab.id, {
        type: "START_CAPTURE",
        allowNavigation: false,
      });
    } else if (command === "capture-selection") {
      chrome.tabs.sendMessage(tab.id, { type: "START_SELECTION_CAPTURE" });
    }
  });
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  try {
    if (captureTabState[tabId]) {
      delete captureTabState[tabId];
      console.log(`🧹 Cleaned up capture state for removed tab ${tabId}`);
    }
  } catch (error) {
    // Ignore permission errors for tab cleanup
    console.warn(
      "Tab cleanup warning:",
      error instanceof Error ? error.message : String(error)
    );
  }
});

function createPersistentWindow() {
  chrome.windows.create(
    {
      url: chrome.runtime.getURL("popup/popup.html"),
      type: "popup",
      width: 430,
      height: 720,
      focused: true,
    },
    (window) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Failed to open extension window:",
          chrome.runtime.lastError.message
        );
        return;
      }
      popupWindowId = window?.id ?? null;
    }
  );
}

let captureMode: "send" | "download" = "send";

// Removed captureTab function as it was wrapper for CDP capture
// The logic is now handled directly in the message handler or via content script flow

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_CAPTURE_MODE") {
    captureMode = message.mode;
    console.log(`[background] Capture mode set to: ${captureMode}`);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "INJECT_IN_PAGE_SCRIPT") {
    const tabId = sender.tab?.id;
    const frameId = sender.frameId;
    const files = Array.isArray(message.files)
      ? (message.files as string[])
      : [];

    if (!tabId || files.length === 0) {
      sendResponse?.({ ok: false, error: "Missing tab or files" });
      return false;
    }

    (async () => {
      try {
        await chrome.scripting.executeScript({
          target: {
            tabId,
            frameIds: typeof frameId === "number" ? [frameId] : undefined,
          },
          world: "MAIN",
          files,
        });
        sendResponse?.({ ok: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error("[INJECT] Failed via scripting.executeScript:", error);
        sendResponse?.({ ok: false, error });
      }
    })();
    return true;
  }

  if (message.type === "TRIGGER_CAPTURE_FOR_TAB") {
    if (sender.tab?.id) {
      console.log(`🧪 [TEST] Triggering capture for tab ${sender.tab.id}`);
      chrome.tabs.sendMessage(
        sender.tab.id,
        {
          type: "start-capture",
          allowNavigation: false,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "❌ [TEST] Failed to send start-capture:",
              chrome.runtime.lastError
            );
          } else {
            console.log("✅ [TEST] Sent start-capture, response:", response);
          }
        }
      );
    } else {
      console.error("❌ [TEST] Sender has no tab ID");
    }
    return false;
  }

  if (message.type === "START_CAPTURE") {
    (async () => {
      try {
        const tabId = message.tabId;
        const allowNavigation = Boolean(message.allowNavigation);
        const mode = message.mode || captureMode; // Use passed mode or fallback to global

        if (!tabId) {
          throw new Error("No tab ID provided");
        }

        // Update global mode if passed explicitly
        if (message.mode) captureMode = message.mode;

        console.log(
          `[capture] Starting capture for tab ${tabId} in mode: ${mode}`
        );

        // Inject the extraction script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["dist/injected-script.js"],
          world: "MAIN", // Execute in page context
        });

        // Trigger extraction via message
        // We use window.postMessage from content script to talk to injected script
        // But here we can just execute a function that calls the global exposed by injected script

        console.log("[capture] Triggering extraction...");

        // Wait for extraction to complete via message listener
        // The injected script sends EXTRACTION_COMPLETE to content script,
        // which should forward it to background.
        // However, let's use a direct execution approach for simplicity if possible,
        // or rely on the existing message passing architecture.

        // Existing architecture:
        // background -> content-script (START_CAPTURE) -> injected-script (START_EXTRACTION)
        // injected-script -> content-script (EXTRACTION_COMPLETE) -> background (CAPTURE_COMPLETE)

        // Let's stick to the existing flow but ensure we don't use CDP
        chrome.tabs.sendMessage(tabId, {
          type: "START_CAPTURE",
          allowNavigation,
          mode,
        });

        sendResponse({ ok: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        chrome.runtime.sendMessage(
          {
            type: "CAPTURE_ERROR",
            error: errorMessage,
          },
          () => void chrome.runtime.lastError
        );
        sendResponse({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === "REMOTE_CAPTURE_REQUEST") {
    (async () => {
      try {
        const targetUrl = message.targetUrl;
        if (!targetUrl) {
          throw new Error("Missing target URL");
        }
        const captureHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Add API key for cloud service
        if (CLOUD_CAPTURE_URL && CLOUD_API_KEY) {
          captureHeaders["x-api-key"] = CLOUD_API_KEY;
        }

        const response = await fetch(handoffEndpoint("/api/capture"), {
          method: "POST",
          headers: captureHeaders,
          body: JSON.stringify({ url: targetUrl }),
        });
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const body = await response.json();
        if (!body?.ok || !body.data) {
          throw new Error(body?.error || "Capture service failed");
        }
        updateLastCapturedPayload(body.data);
        chrome.runtime.sendMessage(
          {
            type: "CAPTURE_COMPLETE",
            data: body.data,
            validationReport: body.validationReport,
            previewWithOverlay: body.previewWithOverlay,
            dataSize: JSON.stringify(body.data).length,
            dataSizeKB: (JSON.stringify(body.data).length / 1024).toFixed(1),
          },
          () => void chrome.runtime.lastError
        );
        sendResponse({ ok: true, data: body.data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Remote capture failed";
        console.error("Remote capture failed:", message);
        sendResponse({ ok: false, error: message });
      }
    })();
    return true;
  }
  if (message.type === "CAPTURE_COMPLETE") {
    const { data } = message as { data?: any };
    if (!data) {
      sendResponse?.({ ok: false, error: "No capture payload received" });
      return false;
    }

    const shouldDownloadOnly = captureDeliveryMode === "download";
    updateLastCapturedPayload(data);
    if (shouldDownloadOnly) {
      captureDeliveryMode = "send";
      chrome.runtime.sendMessage(
        {
          type: "CAPTURE_DOWNLOAD_READY",
          data,
          dataSize: JSON.stringify(data).length,
          dataSizeKB: (JSON.stringify(data).length / 1024).toFixed(1),
        },
        () => void chrome.runtime.lastError
      );
      sendResponse?.({ ok: true, mode: "download" });
      return false;
    }
    enqueueHandoffJob(data, "auto");
    captureDeliveryMode = "send";
    sendResponse?.({ ok: true, queued: pendingJobs.length });
    return false;
  }

  if (message.type === "SET_VIEWPORT") {
    (async () => {
      try {
        if (
          !sender.tab?.id ||
          typeof message.width !== "number" ||
          typeof message.height !== "number"
        ) {
          sendResponse?.({
            ok: false,
            error: "Missing tab or viewport dimensions",
          });
          return;
        }

        const tabId = sender.tab.id;
        const tabInfo = await chrome.tabs.get(tabId);
        if (!tabInfo.windowId) {
          sendResponse?.({ ok: false, error: "Tab has no associated window" });
          return;
        }

        const windowInfo = await chrome.windows.get(tabInfo.windowId);
        captureTabState[tabId] = captureTabState[tabId] || {
          windowId: tabInfo.windowId,
        };

        if (!captureTabState[tabId].originalBounds) {
          captureTabState[tabId].originalBounds = {
            width: windowInfo.width,
            height: windowInfo.height,
            left: windowInfo.left,
            top: windowInfo.top,
          };
        }

        const desiredWidth = Math.max(
          320,
          Math.round(message.width + WINDOW_FRAME_FUDGE.width)
        );
        const desiredHeight = Math.max(
          200,
          Math.round(message.height + WINDOW_FRAME_FUDGE.height)
        );

        await chrome.windows.update(tabInfo.windowId, {
          width: desiredWidth,
          height: desiredHeight,
        });

        captureTabState[tabId].appliedViewport = {
          width: message.width,
          height: message.height,
        };
        sendResponse?.({ ok: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to resize viewport";
        console.error("Viewport resize failed:", errorMessage);
        sendResponse?.({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === "RESET_VIEWPORT") {
    (async () => {
      try {
        if (!sender.tab?.id) {
          sendResponse?.({
            ok: false,
            error: "Missing tab context to reset viewport",
          });
          return;
        }
        const tabId = sender.tab.id;
        const state = captureTabState[tabId];
        if (!state || !state.originalBounds) {
          sendResponse?.({ ok: true });
          return;
        }

        const updateInfo: chrome.windows.UpdateInfo = {};
        if (typeof state.originalBounds.width === "number") {
          updateInfo.width = Math.round(state.originalBounds.width);
        }
        if (typeof state.originalBounds.height === "number") {
          updateInfo.height = Math.round(state.originalBounds.height);
        }
        if (typeof state.originalBounds.left === "number") {
          updateInfo.left = Math.round(state.originalBounds.left);
        }
        if (typeof state.originalBounds.top === "number") {
          updateInfo.top = Math.round(state.originalBounds.top);
        }

        await chrome.windows.update(state.windowId, updateInfo);
        delete captureTabState[tabId];
        sendResponse?.({ ok: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to reset viewport";
        console.error("Viewport reset failed:", errorMessage);
        sendResponse?.({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  // Manual send to handoff (triggered by popup "Send to Figma" button)
  if (message.type === "SEND_TO_HANDOFF") {
    const { data } = message as { data?: any };
    // Use provided data or fall back to cached payload (critical for chunked transfers)
    const payload = data || lastCapturedPayload;

    if (!payload) {
      console.error(
        "❌ SEND_TO_HANDOFF failed: No capture data available (neither in message nor cache)"
      );
      sendResponse({ ok: false, error: "No capture data available" });
      return false;
    }

    (async () => {
      try {
        // If we're using cached payload, make sure we update it if new data came in (though unlikely here)
        if (data) updateLastCapturedPayload(data);

        enqueueHandoffJob(payload, "manual");
        sendResponse({ ok: true, queued: pendingJobs.length });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Failed to send to handoff:", errorMessage);
        sendResponse({ ok: false, error: errorMessage });
      }
    })();

    return true;
  }

  // Trigger download of cached payload (for chunked transfers where content script doesn't have data)
  if (message.type === "TRIGGER_DOWNLOAD") {
    if (!lastCapturedPayload) {
      sendResponse({ ok: false, error: "No captured data to download" });
      return false;
    }

    (async () => {
      try {
        console.log("💾 Triggering background download of cached payload...");

        // Prepare data for download
        let jsonString: string;

        // Check if it's a raw wrapper from chunked reassembly
        if (lastCapturedPayload.rawSchemaJson) {
          console.log("⚡ Using raw JSON string for download");
          jsonString = lastCapturedPayload.rawSchemaJson;
        } else {
          console.log("📦 Stringifying payload for download");
          jsonString = JSON.stringify(lastCapturedPayload, null, 2);
        }

        const dataUrl = `data:application/json;base64,${btoa(
          unescape(encodeURIComponent(jsonString))
        )}`;

        await chrome.downloads.download({
          url: dataUrl,
          filename: `page-capture-${Date.now()}.json`,
          saveAs: true,
        });

        sendResponse({ ok: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Download failed";
        console.error("❌ Background download failed:", errorMessage);
        sendResponse({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  // CORS-free image fetching via background script
  if (message.type === "FETCH_IMAGE") {
    const { url } = message as { url?: string };
    if (!url) {
      sendResponse({ ok: false, error: "Missing URL" });
      return false;
    }

    (async () => {
      try {
        console.log(`🖼️ Attempting to fetch image: ${url}`);

        // Add timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, {
          signal: controller.signal,
          mode: "cors",
          headers: {
            Accept: "image/*,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; WebToFigma/1.0)",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          throw new Error(`Not an image: ${contentType}`);
        }

        const blob = await response.blob();

        // Check blob size
        if (blob.size > 5 * 1024 * 1024) {
          // 5MB limit
          throw new Error(
            `Image too large: ${(blob.size / 1024 / 1024).toFixed(1)}MB`
          );
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1];
          console.log(
            `✅ Image fetched successfully: ${url} (${(
              blob.size / 1024
            ).toFixed(1)}KB)`
          );
          sendResponse({ ok: true, base64, mimeType: blob.type });
        };
        reader.onerror = () => {
          console.error(`❌ FileReader failed for: ${url}`);
          sendResponse({ ok: false, error: "FileReader failed" });
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fetch failed";
        const domain = extractDomainFromImageUrl(url);
        const isKnownProblematic = isKnownProblematicDomain(domain);

        if (isKnownProblematic) {
          console.log(
            `🚫 Expected failure from known blocked domain: ${domain}`
          );
        } else {
          console.error(`❌ Failed to fetch image asset ${url}`, errorMessage);
        }

        // Provide domain-specific error information
        let detailedError = errorMessage;
        if (isKnownProblematic) {
          detailedError = `${domain} blocks cross-origin requests (known restriction)`;
        } else if (errorMessage.includes("CORS")) {
          detailedError =
            "CORS blocked - server does not allow cross-origin requests";
        } else if (errorMessage.includes("NetworkError")) {
          detailedError = "Network error - image server may be unreachable";
        } else if (errorMessage.includes("AbortError")) {
          detailedError = "Request timeout - image took too long to load";
        }

        sendResponse({
          ok: false,
          error: detailedError,
          knownBlocked: isKnownProblematic,
        });
      }
    })();
    return true;
  }

  // CDP-based capture removed in favor of Direct DOM Extraction
  if (message.type === "CAPTURE_CDP") {
    sendResponse({
      ok: false,
      error: "CDP capture is deprecated. Please use Direct DOM Extraction.",
    });
    return false;
  }

  if (message.type === "CAPTURE_SCREENSHOT") {
    // Fallback to visible tab capture if needed, or deprecate
    chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          screenshot: "",
          error: chrome.runtime.lastError.message,
        });
      } else {
        sendResponse({ screenshot: dataUrl });
      }
    });
    return true;
  }

  if (message.type === "HANDOFF_HEALTH_CHECK") {
    (async () => {
      try {
        const healthHeaders: Record<string, string> = {
          "cache-control": "no-cache",
        };

        // Add API key for cloud service
        if (CLOUD_CAPTURE_URL && CLOUD_API_KEY) {
          healthHeaders["x-api-key"] = CLOUD_API_KEY;
        }

        const response = await fetch(handoffEndpoint("/api/status"), {
          headers: healthHeaders,
        });
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const body = await response.json();
        sendResponse({ ok: true, health: body });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Health check failed";
        sendResponse({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === "GET_HANDOFF_STATE") {
    sendResponse({
      ok: true,
      state: handoffState,
      hasCapture: Boolean(lastCapturedPayload),
    });
    return false;
  }

  // Handle chunked capture data
  if (message.type === "CAPTURE_CHUNKED_START") {
    const { totalChunks, totalSize, totalSizeKB } = message;
    console.log(
      `📦 Starting chunked capture: ${totalChunks} chunks, ${totalSizeKB}KB total`
    );

    // Reset buffer for new chunked transfer
    chunkedDataBuffer = new Array(totalChunks);
    expectedChunks = totalChunks;
    receivedChunks = 0;

    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "CAPTURE_CHUNKED_DATA") {
    const { chunkIndex, chunkData, totalChunks } = message;

    if (chunkIndex >= 0 && chunkIndex < expectedChunks) {
      // Only count this chunk if we haven't received it before
      const isNewChunk = !chunkedDataBuffer[chunkIndex];
      chunkedDataBuffer[chunkIndex] = chunkData;
      if (isNewChunk) {
        receivedChunks++;
      }

      console.log(
        `📦 Received chunk ${
          chunkIndex + 1
        }/${totalChunks} (${receivedChunks}/${expectedChunks} total)${
          isNewChunk ? "" : " [DUPLICATE]"
        }`
      );
      sendResponse({
        ok: true,
        received: receivedChunks,
        expected: expectedChunks,
      });
    } else {
      sendResponse({ ok: false, error: `Invalid chunk index: ${chunkIndex}` });
    }
    return false;
  }

  if (message.type === "CAPTURE_CHUNKED_COMPLETE") {
    const { totalChunks } = message;

    if (receivedChunks !== expectedChunks) {
      const error = `Incomplete chunked transfer: received ${receivedChunks}/${expectedChunks} chunks`;
      console.error("❌", error);
      sendResponse({ ok: false, error });
      return false;
    }

    try {
      // Reassemble the complete JSON string
      console.log(`🧩 Reassembling ${totalChunks} chunks...`);
      const completeJsonString = chunkedDataBuffer.join("");

      console.log(
        `⚡ Zero-Parse Optimization: Skipping JSON.parse for ${totalChunks} chunks`
      );
      // Create a wrapper object to signal raw JSON handling
      const reassembledData = { rawSchemaJson: completeJsonString };

      console.log(`✅ Successfully reassembled capture data (Raw String Mode)`);

      // Notify any open extension UI (popup) that capture completed
      chrome.runtime.sendMessage(
        {
          type: "CAPTURE_COMPLETE",
          data: reassembledData,
          dataSize: completeJsonString.length,
          dataSizeKB: (completeJsonString.length / 1024).toFixed(1),
          chunked: true,
        },
        () => {
          // ignore errors if popup isn't open
          void chrome.runtime.lastError;
        }
      );

      // Clean up
      chunkedDataBuffer = [];
      expectedChunks = 0;
      receivedChunks = 0;

      // Store and queue for handoff
      const shouldDownloadOnly = captureDeliveryMode === "download";

      // For download mode, we might need to parse it if the UI expects an object,
      // but for now let's assume send mode is the priority.
      if (shouldDownloadOnly) {
        // If downloading, we MUST parse it because the UI expects an object to save as JSON file
        console.log("💾 Parsing for download...");
        const parsedData = JSON.parse(completeJsonString);
        updateLastCapturedPayload(parsedData);

        captureDeliveryMode = "send";
        chrome.runtime.sendMessage(
          {
            type: "CAPTURE_DOWNLOAD_READY",
            data: parsedData,
            dataSize: completeJsonString.length,
            dataSizeKB: (completeJsonString.length / 1024).toFixed(1),
            chunked: true,
          },
          () => void chrome.runtime.lastError
        );
      } else {
        console.log("🚀 Enqueuing raw job for handoff...");
        lastCapturedPayload = reassembledData; // Store raw wrapper

        // Don't await the upload here, just enqueue it.
        // The queue processor will pick it up.
        // We return success immediately so the content script doesn't time out waiting for the upload.
        enqueueHandoffJob(reassembledData, "auto");

        // Send response immediately
        sendResponse({ ok: true });
        return false; // We already sent the response
      }

      sendResponse({
        ok: true,
        queued: pendingJobs.length,
        mode: shouldDownloadOnly ? "download" : "send",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to reassemble chunked data";
      console.error("❌ Chunked reassembly failed:", errorMessage);
      sendResponse({ ok: false, error: errorMessage });
    }
    return false;
  }

  // Default: no special handling, allow other listeners to run
  return false;
});

// Lightweight heartbeat so the handoff server and Figma plugin see the extension as connected.
// Use alarms so the MV3 service worker wakes up periodically.
const HEARTBEAT_ALARM = "handoff-heartbeat";

async function pingHandoffHealth() {
  const baseBefore = currentHandoffBase();
  try {
    // Use 127.0.0.1 to avoid localhost resolution issues
    const heartbeatEndpoint = `${currentHandoffBase()}/api/extension/heartbeat`;

    console.log("[EXT_HEARTBEAT] Sending heartbeat to", heartbeatEndpoint);

    const response = await fetch(heartbeatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cache-control": "no-cache",
      },
      body: JSON.stringify({
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      console.warn(
        "[EXT_HEARTBEAT] Heartbeat failed with status",
        response.status
      );
    } else {
      console.log("[EXT_HEARTBEAT] Heartbeat success");
    }
  } catch (error) {
    console.error(
      "[EXT_HEARTBEAT] Heartbeat failed:",
      error instanceof Error ? error.message : String(error)
    );
    // Rotate to the next handoff base so we eventually try fallbacks (e.g. 3000 if 5511 is down)
    rotateHandoffBase();
    console.warn(
      "[EXT_HEARTBEAT] Switching handoff base from",
      baseBefore,
      "to",
      currentHandoffBase()
    );
  }
}

function scheduleHeartbeat() {
  console.log("[EXT_HEARTBEAT] Scheduling heartbeat alarm");
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.25 }); // ~15s cadence
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[EXT_HEARTBEAT] Installed, scheduling heartbeat");
  void ensureSidePanelBehavior();
  scheduleHeartbeat();
  void pingHandoffHealth();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[EXT_HEARTBEAT] Startup, scheduling heartbeat");
  void ensureSidePanelBehavior();
  scheduleHeartbeat();
  void pingHandoffHealth();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    console.log("[EXT_HEARTBEAT] Alarm fired");
    void pingHandoffHealth();
  }
});

// Also start heartbeat when service worker loads
console.log(
  "[EXT_HEARTBEAT] Service worker loaded, starting heartbeat sequence"
);
void ensureSidePanelBehavior();
scheduleHeartbeat();
void pingHandoffHealth();

// Fallback interval for when the service worker is kept alive
setInterval(() => {
  console.log("[EXT_HEARTBEAT] Interval fired");
  void pingHandoffHealth();
}, 15000);

// Lightweight size estimator - avoids blocking JSON.stringify
function estimatePayloadSize(payload: any): number {
  if (!payload) return 0;

  let bytes = 0;

  // Check for raw JSON string
  if (typeof payload.rawSchemaJson === "string") {
    return payload.rawSchemaJson.length;
  }

  // Estimate screenshot
  const screenshot = payload.screenshot || payload.schema?.screenshot;
  if (typeof screenshot === "string") {
    bytes += screenshot.length;
  }

  // Estimate images
  const images = payload.schema?.assets?.images || payload.assets?.images;
  if (images && typeof images === "object") {
    const entries = Object.values(images).slice(0, 50); // Sample
    for (const entry of entries) {
      const data = (entry as any)?.data || (entry as any)?.base64;
      if (typeof data === "string") {
        bytes += data.length;
      }
    }
    const totalImages = Object.keys(images).length;
    if (totalImages > 50) {
      bytes = bytes * (totalImages / 50);
    }
  }

  // Base estimate for tree and metadata
  bytes += 500 * 1024; // ~500KB baseline

  return bytes;
}

function optimizePayloadForTransfer(payload: any): any {
  // For large payloads or raw JSON strings, skip optimization to avoid blocking
  if (payload?.rawSchemaJson) {
    console.log(
      "⚡ Skipping optimization for raw JSON payload (already serialized)"
    );
    return payload;
  }

  // Quick size estimate to avoid expensive stringify
  const estimatedSize = estimatePayloadSize(payload);
  if (estimatedSize > 10 * 1024 * 1024) {
    // > 10MB
    console.log(
      `⚡ Skipping optimization for large payload (~${(
        estimatedSize /
        1024 /
        1024
      ).toFixed(1)}MB)`
    );
    return payload;
  }

  console.log("🔧 Optimizing payload for transfer...");

  // Create a deep copy to avoid mutating original
  const optimized = JSON.parse(JSON.stringify(payload ?? {}));

  const originalSize = JSON.stringify(optimized).length;
  const originalSizeMB = originalSize / (1024 * 1024);

  console.log(`📊 Original payload size: ${originalSizeMB.toFixed(2)}MB`);

  const sourceUrl = optimized.schema?.metadata?.url || "";
  const sourceDomain = extractDomainFromImageUrl(sourceUrl);
  const isComplexSite = isComplexMediaSite(sourceDomain);

  if (originalSizeMB < (isComplexSite ? 0.5 : 1)) {
    console.log(
      `✅ Payload is ${
        isComplexSite ? "acceptable for complex site" : "small"
      }, no optimization needed`
    );
    return optimized;
  }

  let optimizationCount = 0;

  // Optimize top-level screenshot if present
  if (optimized.screenshot) {
    optimized.screenshot = optimizeScreenshotDataUrl(optimized.screenshot);
    optimizationCount++;
  }

  // Optimize nested schema screenshot if present
  if (optimized.schema?.screenshot) {
    optimized.schema.screenshot = optimizeScreenshotDataUrl(
      optimized.schema.screenshot
    );
    optimizationCount++;
  }

  const strategy = getDomainSpecificOptimizationStrategy(sourceDomain);
  console.log(`📋 Using optimization strategy for ${sourceDomain}:`, strategy);

  if (optimized.schema?.assets) {
    optimizeAssets(optimized.schema.assets, strategy.assetThresholdKB);
    optimizationCount++;
  }

  if (optimized.schema?.styles) {
    optimizeStyles(
      optimized.schema.styles,
      strategy.maxColors,
      strategy.maxTextStyles
    );
    optimizationCount++;
  }

  const finalSize = JSON.stringify(optimized).length;
  const finalSizeMB = finalSize / (1024 * 1024);
  const reduction = ((originalSize - finalSize) / originalSize) * 100;

  console.log("🎯 Payload optimization complete:", {
    optimizations: optimizationCount,
    finalSizeMB: finalSizeMB.toFixed(2),
    reduction: reduction.toFixed(1) + "%",
  });

  return optimized;
}

function normalizeSchemaAndScreenshot(payload: any): {
  schema: any;
  screenshot?: string;
} {
  if (!payload || typeof payload !== "object") {
    return { schema: payload, screenshot: undefined };
  }

  // Case 1: Already { schema, screenshot }
  if ("schema" in payload && payload.schema) {
    const schema = payload.schema;
    const screenshot = payload.screenshot || schema?.screenshot;
    return { schema, screenshot };
  }

  // Case 2: Multi-viewport wrapper from content script
  if (
    payload.multiViewport &&
    Array.isArray(payload.captures) &&
    payload.captures.length > 0
  ) {
    const captures = payload as {
      captures: Array<{ data: any; previewWithOverlay?: string }>;
    };
    const primary =
      captures.captures.find((c) => c?.data && c.data.tree) ||
      captures.captures[0];

    const schema = primary?.data || payload;
    const screenshot = primary?.previewWithOverlay || schema?.screenshot;
    return { schema, screenshot };
  }

  // Case 3: Direct schema
  if (payload.tree || payload.assets || payload.metadata) {
    const schema = payload;
    const screenshot = schema.screenshot;
    return { schema, screenshot };
  }

  // Fallback
  return { schema: payload, screenshot: payload.screenshot };
}

function optimizeScreenshotDataUrl(dataUrl: string): string {
  if (!dataUrl || dataUrl.length < 1000) return dataUrl;

  try {
    // Compress JPEG further if it's very large
    if (dataUrl.startsWith("data:image/jpeg") && dataUrl.length > 500000) {
      // 500KB
      // Extract base64 part and calculate rough compression ratio needed
      const base64Part = dataUrl.split(",")[1];
      if (base64Part && base64Part.length > 400000) {
        // ~300KB of base64
        // For very large screenshots, we can reduce quality more aggressively
        console.log(
          "🖼️ Large screenshot detected, applying aggressive compression"
        );
        // REMOVED: Truncation logic that was corrupting images.
        // We now rely on chunking to handle large payloads.
      }
    }
    return dataUrl;
  } catch (error) {
    console.warn("⚠️ Screenshot optimization failed, using original:", error);
    return dataUrl;
  }
}

function optimizeAssets(assets: any, thresholdKB: number = 200) {
  if (!assets || typeof assets !== "object") return;

  let optimizedCount = 0;
  const thresholdBytes = thresholdKB * 1000; // Convert to bytes

  // Optimize images in asset registry
  Object.keys(assets).forEach((key) => {
    const asset = assets[key];
    if (asset && typeof asset === "object") {
      if (
        asset.data &&
        typeof asset.data === "string" &&
        asset.data.startsWith("data:image/")
      ) {
        const originalLength = asset.data.length;
        if (originalLength > thresholdBytes) {
          asset.data = optimizeScreenshotDataUrl(asset.data);
          if (asset.data.length < originalLength) {
            optimizedCount++;
          }
        }
      }
    }
  });

  if (optimizedCount > 0) {
    console.log(
      `🖼️ Optimized ${optimizedCount} large assets (threshold: ${thresholdKB}KB)`
    );
  }
}

function optimizeStyles(
  styles: any,
  maxColors: number = 500,
  maxTextStyles: number = 200
) {
  if (!styles || typeof styles !== "object") return;

  // Remove redundant or oversized style data
  if (styles.colors && Object.keys(styles.colors).length > maxColors) {
    console.log(
      `🎨 Large color palette detected, limiting to top ${maxColors} colors`
    );
    const colorEntries = Object.entries(styles.colors);
    const topColors = colorEntries
      .sort((a: any, b: any) => (b[1].count || 0) - (a[1].count || 0))
      .slice(0, maxColors);
    styles.colors = Object.fromEntries(topColors);
  }

  // Limit text styles if excessive
  if (
    styles.textStyles &&
    Object.keys(styles.textStyles).length > maxTextStyles
  ) {
    console.log(
      `📝 Large text style registry detected, limiting to top ${maxTextStyles}`
    );
    const textStyleEntries = Object.entries(styles.textStyles);
    const topTextStyles = textStyleEntries.slice(0, maxTextStyles);
    styles.textStyles = Object.fromEntries(topTextStyles);
  }
}

async function postToHandoffServer(payload: any): Promise<void> {
  let jsonPayload: string;
  let payloadSizeMB: number;

  // OPTIMIZATION: If payload is already a serialized JSON string (from chunked transfer),
  // use it directly to avoid expensive JSON.parse/stringify cycles.
  if (payload && typeof payload === "object" && payload.rawSchemaJson) {
    console.log("⚡ Using Zero-Parse forwarding for large payload");
    // Construct the body manually: {"schema": <raw_json>, "screenshot": ""}
    // We assume the raw JSON represents the schema.
    jsonPayload = `{"schema":${payload.rawSchemaJson},"screenshot":""}`;
    payloadSizeMB =
      new TextEncoder().encode(jsonPayload).length / (1024 * 1024);
  } else {
    // Standard processing for small/normal payloads
    const optimizedPayload = optimizePayloadForTransfer(payload);
    const { schema, screenshot } = normalizeSchemaAndScreenshot(
      optimizedPayload as any
    );

    // DIAGNOSTIC: Log a concise view of the schema so users can inspect images/layout
    try {
      const imageRegistry = schema?.assets?.images || {};
      const imageKeys = Object.keys(imageRegistry);
      const firstImageKey = imageKeys[0];
      const firstImage = firstImageKey
        ? imageRegistry[firstImageKey]
        : undefined;

      const rootNode = schema?.tree;
      const firstChild =
        rootNode?.children && rootNode.children.length > 0
          ? rootNode.children[0]
          : undefined;

      console.log("SCHEMA_DEBUG", {
        viewport: schema?.metadata?.viewport,
        imageCount: imageKeys.length,
        sampleImageKey: firstImageKey,
        sampleImage: firstImage
          ? {
              id: firstImage.id,
              url: firstImage.url,
              width: firstImage.width,
              height: firstImage.height,
              hasData:
                typeof firstImage.data === "string" &&
                firstImage.data.length > 0,
            }
          : null,
        rootType: rootNode?.type,
        rootName: rootNode?.name,
        sampleNode: firstChild
          ? {
              id: firstChild.id,
              type: firstChild.type,
              name: firstChild.name,
              layout: firstChild.layout,
              imageHash: firstChild.imageHash,
              imageAssetId: firstChild.imageAssetId,
              backgroundImageAssetId: firstChild.backgroundImageAssetId,
            }
          : null,
      });
    } catch (e) {
      console.warn("SCHEMA_DEBUG logging failed", e);
    }

    // Ensure screenshot is attached to schema if not already
    if (screenshot && !schema.screenshot) {
      schema.screenshot = screenshot;
    }

    // Send schema directly, not wrapped in requestBody
    jsonPayload = JSON.stringify(schema);
    payloadSizeMB =
      new TextEncoder().encode(jsonPayload).length / (1024 * 1024);
  }

  // If mode is 'download', save to file instead of uploading
  if (captureMode === "download") {
    console.log("[capture] Mode is DOWNLOAD - saving to file...");

    try {
      // Create a blob-compatible data URI
      const jsonString = jsonPayload; // Use the already prepared jsonPayload
      const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
      const dataUrl = `data:application/json;base64,${base64Data}`;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `capture-${timestamp}.json`;

      await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true,
      });

      console.log(`[capture] Download triggered: ${filename}`);

      // Notify popup of success
      chrome.runtime.sendMessage({
        type: "CAPTURE_COMPLETE",
        data: JSON.parse(jsonString), // Parse back for stats if needed, or send raw string
        dataSize: jsonString.length,
        dataSizeKB: (jsonString.length / 1024).toFixed(2),
      });

      return;
    } catch (err) {
      console.error("[capture] Download failed:", err);
      chrome.runtime.sendMessage({
        type: "CAPTURE_ERROR",
        error:
          "Failed to download capture file: " +
          (err instanceof Error ? err.message : String(err)),
      });
      return;
    }
  }

  // Otherwise, proceed with upload to server (existing logic)
  console.log("[capture] Mode is SEND - uploading to server...");

  // Helper for remote logging
  const remoteLog = (msg: string, data?: any) => {
    fetch(handoffEndpoint("/api/log"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, data }),
    }).catch(() => {});
  };

  remoteLog("Starting postToHandoffServer", { sizeMB: payloadSizeMB });

  // COMPRESSION: Compress the payload using pako (zlib)
  console.log(`📦 Compressing payload (${payloadSizeMB.toFixed(2)}MB)...`);
  remoteLog("Compressing payload...");

  let compressedBase64: string;
  try {
    const compressed = pako.deflate(jsonPayload);

    // Safe Uint8Array to Base64 conversion (avoids stack overflow)
    const CHUNK_SIZE = 0x8000; // 32k chunks
    const chunks = [];
    for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
      chunks.push(
        String.fromCharCode.apply(
          null,
          Array.from(compressed.subarray(i, i + CHUNK_SIZE))
        )
      );
    }
    compressedBase64 = btoa(chunks.join(""));
  } catch (err) {
    console.error("Compression failed:", err);
    remoteLog("Compression failed", String(err));
    throw new Error("Failed to compress payload: " + String(err));
  }

  const finalPayload = {
    compressed: true,
    data: compressedBase64,
  };

  const compressedSizeMB = compressedBase64.length / (1024 * 1024);
  console.log(
    `📦 Compression complete: ${payloadSizeMB.toFixed(
      2
    )}MB -> ${compressedSizeMB.toFixed(2)}MB`
  );
  remoteLog("Compression complete", { compressedSizeMB });

  console.log(`🚀 Sending payload to ${handoffEndpoint("/api/jobs")}...`);
  remoteLog("Sending payload to server...");

  if (payloadSizeMB > 50) {
    console.warn(`⚠️ Large payload detected: ${payloadSizeMB.toFixed(2)}MB`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (CLOUD_CAPTURE_URL && CLOUD_API_KEY) {
    headers["x-api-key"] = CLOUD_API_KEY;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < HANDOFF_BASES.length; attempt++) {
    const target = handoffEndpoint("/api/jobs");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s per attempt
    try {
      const response = await fetch(target, {
        method: "POST",
        headers,
        body: JSON.stringify(finalPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(
            `Payload too large (${payloadSizeMB.toFixed(
              2
            )}MB). Try capturing a smaller page or fewer viewport sizes.`
          );
        }
        const errorText = await response.text();
        throw new Error(
          `Server responded with ${response.status}: ${errorText}`
        );
      }

      // Success
      return;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[HANDOFF] Attempt ${attempt + 1} failed for ${target}:`,
        lastError.message
      );
      rotateHandoffBase();
    }
  }

  if (lastError) {
    throw lastError;
  }
}

function extractDomainFromImageUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (error) {
    return "unknown";
  }
}

function isKnownProblematicDomain(domain: string): boolean {
  const problematicDomains = [
    "img.cdno.my.id",
    "images.ctfassets.net",
    "ctfassets.net",
    "i.ytimg.com",
    "yt3.ggpht.com",
    "static.cdno.my.id",
    "secure.gravatar.com",
    "photos.google.com",
    "lh3.googleusercontent.com",
    "fbcdn.net",
    "instagramstatic-a.akamaihd.net",
    "cdno.my.id",
    // Financial and trading platforms
    "login-assets.tradestation.com",
    "cdn.tradestation.com",
    "assets.tradestation.com",
    "static.tradestation.com",
    // Advertising networks
    "secure.adnxs.com",
    "cdn.adnxs.com",
    "ib.adnxs.com",
    "static.adsystem.com",
    "securepubads.g.doubleclick.net",
    "googleads.g.doubleclick.net",
    // Additional CDNs and secure domains
    "assets.adobedtm.com",
    "secure.quantserve.com",
    "sb.scorecardresearch.com",
    "connect.facebook.net",
    "platform.twitter.com",
  ];

  return problematicDomains.some((problematic) =>
    domain.toLowerCase().includes(problematic.toLowerCase())
  );
}

function isComplexMediaSite(domain: string): boolean {
  const complexMediaSites = [
    "youtube.com",
    "netflix.com",
    "hulu.com",
    "disney.com",
    "amazon.com",
    "twitch.tv",
    "vimeo.com",
    "dailymotion.com",
    "cdno.my.id",
    "imgur.com",
    "flickr.com",
    "instagram.com",
    "facebook.com",
    "tiktok.com",
    // Financial and trading platforms (complex UIs with many assets)
    "tradestation.com",
    "robinhood.com",
    "etrade.com",
    "schwab.com",
    "fidelity.com",
    "tdameritrade.com",
    "interactive brokers.com",
    "tradingview.com",
  ];

  return complexMediaSites.some((complex) =>
    domain.toLowerCase().includes(complex.toLowerCase())
  );
}

function getDomainSpecificOptimizationStrategy(domain: string): {
  maxColors: number;
  maxTextStyles: number;
  screenshotQuality: number;
  assetThresholdKB: number;
} {
  // Default strategy
  let strategy = {
    maxColors: 500,
    maxTextStyles: 200,
    screenshotQuality: 0.75,
    assetThresholdKB: 200,
  };

  // More aggressive for complex media sites
  if (isComplexMediaSite(domain)) {
    strategy = {
      maxColors: 300,
      maxTextStyles: 100,
      screenshotQuality: 0.6,
      assetThresholdKB: 100,
    };
    console.log(
      `🎯 Using aggressive optimization for complex media site: ${domain}`
    );
  }

  // Special handling for known problematic domains
  if (isKnownProblematicDomain(domain)) {
    strategy = {
      maxColors: 200,
      maxTextStyles: 50,
      screenshotQuality: 0.5,
      assetThresholdKB: 50,
    };
    console.log(
      `⚡ Using ultra-aggressive optimization for problematic domain: ${domain}`
    );
  }

  return strategy;
}

function broadcastHandoffState() {
  try {
    chrome.runtime.sendMessage(
      {
        type: "HANDOFF_STATUS_UPDATE",
        state: handoffState,
        hasCapture: Boolean(lastCapturedPayload),
      },
      () => {
        // Ignore missing listeners
        void chrome.runtime.lastError;
      }
    );
  } catch (error) {
    console.warn("Failed to broadcast handoff state", error);
  }
}

function enqueueHandoffJob(payload: any, trigger: HandoffTrigger) {
  const job: PendingJob = {
    id: crypto?.randomUUID?.() ?? `job-${Date.now()}-${Math.random()}`,
    payload,
    trigger,
    enqueuedAt: Date.now(),
    retries: 0,
    nextRetryAt: null,
  };

  pendingJobs.push(job);
  updateStateForQueue(trigger);
  scheduleQueueProcessing(0);
}

function updateStateForQueue(trigger?: HandoffTrigger | null) {
  const nextRetry = getNextRetryTimestamp();
  const status = hasInFlightJob
    ? "sending"
    : pendingJobs.length > 0
    ? "queued"
    : "idle";
  handoffState = {
    status,
    trigger: trigger ?? handoffState.trigger ?? null,
    lastAttemptAt: handoffState.lastAttemptAt || null,
    lastSuccessAt: handoffState.lastSuccessAt || null,
    error: status === "queued" ? null : handoffState.error || null,
    pendingCount: pendingJobs.length,
    nextRetryAt: nextRetry,
  };
  broadcastHandoffState();
}

function scheduleQueueProcessing(delayMs: number) {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processPendingJobs();
  }, Math.max(0, delayMs));
}

async function processPendingJobs(): Promise<void> {
  if (hasInFlightJob) return;

  const readyJob = findReadyJob();
  if (!readyJob) {
    if (pendingJobs.length === 0) {
      handoffState = {
        status: "idle",
        trigger: null,
        lastAttemptAt: handoffState.lastAttemptAt || null,
        lastSuccessAt: handoffState.lastSuccessAt || null,
        error: null,
        pendingCount: 0,
        nextRetryAt: null,
      };
      broadcastHandoffState();
      return;
    }

    updateStateForQueue(handoffState.trigger ?? null);
    const nextDelay = getNextRunnableDelay();
    if (nextDelay !== null) {
      scheduleQueueProcessing(nextDelay);
    }
    return;
  }

  hasInFlightJob = true;
  handoffState = {
    status: "sending",
    trigger: readyJob.trigger,
    lastAttemptAt: Date.now(),
    lastSuccessAt: handoffState.lastSuccessAt || null,
    error: null,
    pendingCount: pendingJobs.length,
    nextRetryAt: null,
  };
  broadcastHandoffState();

  try {
    console.log(
      `📤 ${
        readyJob.trigger === "auto" ? "Auto" : "Manual"
      } handoff starting...`
    );
    await postToHandoffServer(readyJob.payload);
    console.log("✅ Handoff delivered to server");
    const index = pendingJobs.indexOf(readyJob);
    if (index !== -1) {
      pendingJobs.splice(index, 1);
    }
    handoffState = {
      status: pendingJobs.length > 0 ? "queued" : "success",
      trigger: readyJob.trigger,
      lastAttemptAt: handoffState.lastAttemptAt,
      lastSuccessAt: Date.now(),
      error: null,
      pendingCount: pendingJobs.length,
      nextRetryAt: getNextRetryTimestamp(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Handoff failed:", message);
    readyJob.retries += 1;
    const delay = Math.min(30000, 2000 * readyJob.retries);
    readyJob.nextRetryAt = Date.now() + delay;
    handoffState = {
      status: "error",
      trigger: readyJob.trigger,
      lastAttemptAt: handoffState.lastAttemptAt,
      lastSuccessAt: handoffState.lastSuccessAt || null,
      error: message,
      pendingCount: pendingJobs.length,
      nextRetryAt: readyJob.nextRetryAt,
    };
  } finally {
    hasInFlightJob = false;
    broadcastHandoffState();
    if (pendingJobs.length > 0) {
      const nextDelay = getNextRunnableDelay();
      if (nextDelay !== null && nextDelay > 0) {
        scheduleQueueProcessing(nextDelay);
      } else {
        scheduleQueueProcessing(0);
      }
    }
  }
}

function findReadyJob(): PendingJob | null {
  const now = Date.now();
  return (
    pendingJobs.find((job) => !job.nextRetryAt || job.nextRetryAt <= now) ||
    null
  );
}

function getNextRetryTimestamp(): number | null {
  const upcoming = pendingJobs
    .map((job) => job.nextRetryAt)
    .filter((value): value is number => typeof value === "number");
  if (upcoming.length === 0) return null;
  return Math.min(...upcoming);
}

function getNextRunnableDelay(): number | null {
  const nextRetry = getNextRetryTimestamp();
  if (nextRetry === null) return 0;
  const delay = nextRetry - Date.now();
  return delay > 0 ? delay : 0;
}
