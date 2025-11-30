import { DOMExtractor } from "./utils/dom-extractor";

console.log("🎯 Direct DOM Extraction script loaded");

// Prevent duplicate injection - check if already loaded
if ((window as any).__DOM_EXTRACTOR_LOADED__) {
  console.warn(
    "⚠️ [INJECT] Script already loaded, skipping duplicate registration"
  );
} else {
  (window as any).__DOM_EXTRACTOR_LOADED__ = true;
  (window as any).__EXTRACTION_COUNT__ = 0; // Track how many times extraction runs

  // Global error handlers
  window.onerror = (message, source, lineno, colno, error) => {
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

  // Listen for messages from content script
  window.addEventListener("message", async (event) => {
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
  });

  console.log("✅ [INJECT] Message listener installed for START_EXTRACTION");
}
