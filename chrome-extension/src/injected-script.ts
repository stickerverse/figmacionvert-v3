import { DOMExtractor } from "./utils/dom-extractor";

console.log("🎯 Direct DOM Extraction script loaded (v2 - reloaded)");

// Cleanup previous listener if exists to prevent duplicates
if ((window as any).__DOM_EXTRACTOR_LISTENER__) {
  try {
    window.removeEventListener(
      "message",
      (window as any).__DOM_EXTRACTOR_LISTENER__
    );
    console.log("♻️ Removed previous message listener");
  } catch (e) {
    console.warn("Failed to remove previous listener:", e);
  }
}

(window as any).__DOM_EXTRACTOR_LOADED__ = true;
if (!(window as any).__EXTRACTION_COUNT__) {
  (window as any).__EXTRACTION_COUNT__ = 0;
}

// Global error handlers
// Global error handlers
function shouldIgnoreGlobalError(message: any, source?: string): boolean {
  const msg = String(message || "");

  // Common benign ResizeObserver noise
  if (
    msg.includes("ResizeObserver loop completed with undelivered notifications")
  ) {
    return true;
  }
  if (msg.includes("ResizeObserver loop limit exceeded")) {
    return true;
  }

  // You can also ignore stuff that clearly comes from YouTube, etc.
  if (source && /youtube\.com/.test(source)) {
    return true;
  }

  return false;
}

window.onerror = (message, source, lineno, colno, error) => {
  if (shouldIgnoreGlobalError(message, source)) {
    console.warn("[INJECTED_ERROR] Ignored benign global error:", message);
    return; // Do NOT post EXTRACTION_ERROR
  }

  console.error("[INJECTED_ERROR] Global error:", message, error);
  window.postMessage(
    {
      type: "EXTRACTION_ERROR",
      error: `Global error: ${message} at ${source}:${lineno}:${colno}`,
      details: error ? error.stack : undefined,
    },
    "*"
  );
};

// Expose the extractor globally
(window as any).extractPageToSchema = async function () {
  const extractor = new DOMExtractor();
  return await extractor.extractPageToSchema();
};

// Define listener
const messageListener = async (event: MessageEvent) => {
  if (event.data.type === "PING") {
    window.postMessage({ type: "PONG" }, "*");
    return;
  }

  if (event.data.type === "START_EXTRACTION") {
    (window as any).__EXTRACTION_COUNT__++;
    console.log(
      `📨 [INJECT] START_EXTRACTION received! (run #${
        (window as any).__EXTRACTION_COUNT__
      })`
    );
    console.log("📨 [INJECT] Event data:", event.data);

    // Send immediate acknowledgment
    window.postMessage(
      {
        type: "EXTRACTION_PROGRESS",
        phase: "starting",
        message: "Extraction acknowledged, starting...",
        percent: 28,
      },
      "*"
    );

    try {
      console.log("🔍 [INJECT] Creating DOMExtractor instance...");
      const extractor = new DOMExtractor();

      // Set up a heartbeat to keep the watchdog alive during long extractions
      let heartbeatCount = 0;
      const heartbeatInterval = setInterval(() => {
        heartbeatCount++;
        console.log(
          `💓 [INJECT] Heartbeat ${heartbeatCount} - extraction still running...`
        );
        window.postMessage(
          {
            type: "EXTRACTION_PROGRESS",
            phase: "processing",
            message: `Still processing... (${heartbeatCount * 10}s)`,
            percent: Math.min(30 + heartbeatCount * 5, 95),
          },
          "*"
        );
      }, 10000); // Send heartbeat every 10 seconds

      try {
        console.log("🔍 [INJECT] Calling extractPageToSchema()...");
        const schema = await extractor.extractPageToSchema();
        console.log("✅ [INJECT] extractPageToSchema() returned successfully");
        console.log("✅ [INJECT] Schema structure:", {
          nodes: schema.tree ? "present" : "missing",
          assets: Object.keys(schema.assets.images).length,
        });

        console.log("📤 [INJECT] Posting EXTRACTION_COMPLETE message...");
        window.postMessage(
          {
            type: "EXTRACTION_COMPLETE",
            data: schema,
          },
          "*"
        );
        console.log("✅ [INJECT] EXTRACTION_COMPLETE message posted!");
      } finally {
        // Always clear the heartbeat interval
        clearInterval(heartbeatInterval);
      }
    } catch (error) {
      console.error("❌ [INJECT] Extraction failed:", error);
      console.error(
        "❌ [INJECT] Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );
      window.postMessage(
        {
          type: "EXTRACTION_ERROR",
          error: error instanceof Error ? error.message : String(error),
        },
        "*"
      );
    }
  }
};

// Store and register listener
(window as any).__DOM_EXTRACTOR_LISTENER__ = messageListener;
window.addEventListener("message", messageListener);

console.log("✅ [INJECT] Message listener installed for START_EXTRACTION");
