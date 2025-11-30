/**
 * CSP-Safe Image Handler for Restricted Sites (Facebook, Instagram, etc.)
 *
 * Handles CSP violations gracefully by:
 * 1. Detecting and skipping data URL fetch attempts
 * 2. Generating placeholder content when fetches fail
 * 3. Validating extension context before all communications
 * 4. Maintaining heartbeat to prevent context loss
 */

export class CSPHandler {
  private isExtensionContextValid: boolean = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeatTime: number = Date.now();

  constructor() {
    this.validateContext();
    this.startHeartbeat();
  }

  /**
   * Validate that extension context is still valid
   */
  private validateContext(): boolean {
    try {
      if (!chrome?.runtime?.id) {
        console.warn("❌ Extension runtime ID missing");
        this.isExtensionContextValid = false;
        return false;
      }

      if (chrome.runtime.lastError) {
        console.warn(
          "⚠️ Chrome runtime error detected:",
          chrome.runtime.lastError
        );
        this.isExtensionContextValid = false;
        return false;
      }

      this.isExtensionContextValid = true;
      return true;
    } catch (e) {
      console.error("❌ Context validation threw:", e);
      this.isExtensionContextValid = false;
      return false;
    }
  }

  /**
   * Check if extension context is valid (safe to use)
   */
  isValid(): boolean {
    return this.validateContext();
  }

  /**
   * Start heartbeat to maintain service worker connection
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.isValid()) {
        console.warn("⚠️ Heartbeat detected context loss");
        this.stopHeartbeat();
        return;
      }

      try {
        this.lastHeartbeatTime = Date.now();
        // Just a no-op message to keep connection alive
        chrome.runtime.sendMessage(
          {
            type: "EXTRACTION_HEARTBEAT",
            timestamp: this.lastHeartbeatTime,
          },
          () => {
            // Ignore response or errors
            if (chrome.runtime.lastError) {
              console.warn(
                "⚠️ Heartbeat failed:",
                chrome.runtime.lastError.message
              );
            }
          }
        );
      } catch (e) {
        console.warn("⚠️ Heartbeat send failed:", e);
        this.stopHeartbeat();
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle data URLs safely without triggering CSP violations
   */
  handleDataURL(url: string): {
    isDataURL: boolean;
    base64?: string;
    error?: string;
  } {
    if (!url.startsWith("data:")) {
      return { isDataURL: false };
    }

    try {
      // Extract the base64 part from data:image/png;base64,xxxxx
      const matches = url.match(/^data:[^;]*;base64,(.+)$/);
      if (!matches || !matches[1]) {
        return {
          isDataURL: true,
          error: "Invalid data URL format",
        };
      }

      console.log(
        `✅ [CSP] Using data URL directly (avoiding fetch): ${url.substring(
          0,
          60
        )}...`
      );
      return {
        isDataURL: true,
        base64: matches[1],
      };
    } catch (e) {
      console.error("❌ Failed to parse data URL:", e);
      return {
        isDataURL: true,
        error: String(e),
      };
    }
  }

  /**
   * Wrap a fetch call with CSP error handling
   */
  async fetchWithCSPFallback<T>(
    fetchFn: () => Promise<T>,
    fallbackFn: () => T,
    label: string = "resource"
  ): Promise<T> {
    try {
      console.log(`🔄 Attempting to fetch ${label}...`);
      const result = await Promise.race([
        fetchFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Fetch timeout")), 10000)
        ),
      ]);
      console.log(`✅ Successfully fetched ${label}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check if it's a CSP-related error
      if (
        errorMsg.includes("CSP") ||
        errorMsg.includes("violates") ||
        errorMsg.includes("Refused") ||
        errorMsg.includes("ERR_BLOCKED_BY_CLIENT")
      ) {
        console.warn(
          `📋 [CSP] Fetch blocked for ${label} - using fallback. Error: ${errorMsg}`
        );
      } else {
        console.warn(`⚠️ Fetch failed for ${label}: ${errorMsg}`);
      }

      try {
        const fallbackResult = fallbackFn();
        console.log(`✅ Fallback succeeded for ${label}`);
        return fallbackResult;
      } catch (fallbackError) {
        console.error(
          `❌ Both fetch and fallback failed for ${label}:`,
          fallbackError
        );
        throw fallbackError;
      }
    }
  }

  /**
   * Generate a CSP-safe placeholder image
   */
  generatePlaceholder(
    width: number = 100,
    height: number = 100,
    label: string = "img"
  ): {
    base64: string;
    width: number;
    height: number;
    isPlaceholder: true;
  } {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Fill with light gray
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add border
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Add text
      ctx.fillStyle = "#64748b";
      const fontSize = Math.max(8, Math.min(Math.round(height / 4), 16));
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Truncate label if needed
      const maxLabelLength = Math.max(3, Math.floor(width / (fontSize * 0.6)));
      const displayLabel =
        label.length > maxLabelLength
          ? label.substring(0, maxLabelLength - 1) + "…"
          : label;

      ctx.fillText(displayLabel, canvas.width / 2, canvas.height / 2);

      // Convert to base64
      const base64 = canvas.toDataURL("image/png").split(",")[1];

      return {
        base64,
        width: canvas.width,
        height: canvas.height,
        isPlaceholder: true,
      };
    } catch (e) {
      console.error("Failed to generate placeholder:", e);
      // Return a minimal base64 PNG (1x1 transparent)
      return {
        base64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        width: 1,
        height: 1,
        isPlaceholder: true,
      };
    }
  }

  /**
   * Validate chunk transfer is safe
   */
  validateChunkTransfer(
    chunkIndex: number,
    totalChunks: number
  ): { valid: boolean; error?: string } {
    if (!this.isValid()) {
      return {
        valid: false,
        error: `Extension context lost during chunk ${chunkIndex}/${totalChunks}`,
      };
    }

    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return {
        valid: false,
        error: `Invalid chunk index: ${chunkIndex} (total: ${totalChunks})`,
      };
    }

    return { valid: true };
  }

  /**
   * Send message with automatic fallback
   */
  async sendMessage(message: any, timeout: number = 5000): Promise<any> {
    if (!this.isValid()) {
      throw new Error("Extension context invalid - cannot send message");
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Message send timeout after ${timeout}ms`));
      }, timeout);

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeoutId);

          if (chrome.runtime.lastError) {
            reject(
              new Error(
                `Chrome runtime error: ${chrome.runtime.lastError.message}`
              )
            );
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHeartbeat();
    this.isExtensionContextValid = false;
  }
}

// Export singleton
let cspHandler: CSPHandler | null = null;

export function getCSSPHandler(): CSPHandler {
  if (!cspHandler) {
    cspHandler = new CSPHandler();
  }
  return cspHandler;
}

export function resetCSPHandler(): void {
  if (cspHandler) {
    cspHandler.destroy();
    cspHandler = null;
  }
}
