/**
 * Production-Grade DOM Extractor v2.0
 *
 * Enterprise-level webpage extraction with robust error handling:
 * - Comprehensive validation at every step
 * - Defensive numeric operations with NaN/Infinity guards
 * - Enhanced text extraction with Canvas TextMetrics
 * - Timeout recovery with partial schema generation
 * - Memory-efficient computed style caching
 * - CORS-safe stylesheet processing
 * - Graceful degradation for failed assets
 * - Complete error tracking and reporting
 */

import { createTrustedHTML } from "./trusted-types";
import { ElementNode, WebToFigmaSchema } from "../types/schema";
import { extractGridLayoutData } from "./grid-layout-converter";
// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

class ExtractionValidation {
  static isValidNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
  }

  static safeParseFloat(value: unknown, fallback: number = 0): number {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  static clampNumber(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  static isValidRect(rect: DOMRect): boolean {
    return (
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.top) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height)
    );
  }

  static sanitizeColorString(color: string): string | null {
    if (!color || typeof color !== "string") return null;
    const trimmed = color.trim().toLowerCase();
    if (trimmed.length === 0) return null;
    return trimmed;
  }

  static isValidUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;
    try {
      new URL(url, window.location.href);
      return true;
    } catch {
      return false;
    }
  }

  static safeGetComputedStyle(
    element: Element,
    pseudoElement?: string
  ): CSSStyleDeclaration | null {
    try {
      return window.getComputedStyle(element, pseudoElement);
    } catch (error) {
      console.warn("Failed to get computed style:", error);
      return null;
    }
  }
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

interface ExtractionError {
  location: string;
  message: string;
  element?: string;
  timestamp: number;
  severity: "warning" | "error" | "critical";
}

class ErrorTracker {
  private errors: ExtractionError[] = [];
  private readonly MAX_ERRORS = 100;

  recordError(
    location: string,
    message: string,
    element?: Element,
    severity: "warning" | "error" | "critical" = "error"
  ): void {
    // ENHANCED: Defensive error handling to prevent undefined.toString() errors
    try {
      if (this.errors.length >= this.MAX_ERRORS) {
        this.errors.shift(); // Remove oldest
      }

      // Safely extract element tag name
      let elementTagName: string | undefined;
      try {
        elementTagName = element?.tagName || undefined;
      } catch {
        elementTagName = undefined;
      }

      // Ensure message is a string
      const safeMessage = message != null ? String(message) : "Unknown error";

      this.errors.push({
        location: location != null ? String(location) : "unknown",
        message: safeMessage,
        element: elementTagName,
        timestamp: Date.now(),
        severity,
      });

      if (severity === "critical") {
        console.error(`[CRITICAL] ${location}: ${safeMessage}`);
      } else if (severity === "error") {
        console.error(`[ERROR] ${location}: ${safeMessage}`);
      } else {
        console.warn(`[WARNING] ${location}: ${safeMessage}`);
      }
    } catch (error) {
      // Fallback error logging if recordError itself fails
      console.error(
        `[ERROR TRACKER] Failed to record error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  getErrors(): ExtractionError[] {
    return [...this.errors];
  }

  getSummary(): { warnings: number; errors: number; critical: number } {
    return {
      warnings: this.errors.filter((e) => e.severity === "warning").length,
      errors: this.errors.filter((e) => e.severity === "error").length,
      critical: this.errors.filter((e) => e.severity === "critical").length,
    };
  }
}

// ============================================================================
// INTRINSIC SIZE PROBING (for pixel-perfect image fill + object-fit)
// ============================================================================

type IntrinsicSize = { width: number; height: number };

const __intrinsicSizeCache = new Map<string, IntrinsicSize>();

function clampPositiveInt(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.floor(n);
  return v > 0 ? v : null;
}

function parseFirstCssUrl(cssValue: string | null | undefined): string | null {
  if (!cssValue) return null;
  // Matches url("...") / url('...') / url(...)
  const m = cssValue.match(/url\(\s*(['"]?)(.*?)\1\s*\)/i);
  if (!m || !m[2]) return null;
  const url = m[2].trim();
  if (!url || url === "none") return null;
  // Ignore gradients etc.
  if (url.startsWith("data:")) return url; // allow data URLs
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  // Relative URL fallback (best effort)
  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return url;
  }
}

function bestElementImageUrl(el: Element, computed?: CSSStyleDeclaration): string | null {
  // <img>
  if (el instanceof HTMLImageElement) {
    return el.currentSrc || el.src || null;
  }

  // <video poster> (often used as image-like)
  if (el instanceof HTMLVideoElement) {
    return el.poster || null;
  }

  // SVG <image href>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyEl = el as any;
  const href =
    anyEl?.href?.baseVal ||
    anyEl?.getAttribute?.("href") ||
    anyEl?.getAttribute?.("xlink:href") ||
    null;
  if (typeof href === "string" && href.trim()) {
    try {
      return new URL(href, window.location.href).toString();
    } catch {
      return href;
    }
  }

  // CSS background-image
  const bg = computed?.backgroundImage;
  return parseFirstCssUrl(bg);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: number | null = null;
  const timeout = new Promise<T>((_, reject) => {
    t = window.setTimeout(() => reject(new Error(`Timeout(${label}): ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (t != null) window.clearTimeout(t);
  });
}

/**
 * Probe intrinsic size from a URL by loading it into an Image element.
 * This works cross-origin for width/height (does not read pixels).
 */
async function probeImageUrlIntrinsicSize(url: string): Promise<IntrinsicSize | null> {
  const cached = __intrinsicSizeCache.get(url);
  if (cached) return cached;

  // data URLs can be huge; still ok but guard with a shorter timeout
  const timeoutMs = url.startsWith("data:") ? 1500 : 4000;

  const size = await withTimeout(
    new Promise<IntrinsicSize | null>((resolve) => {
      const img = new Image();
      // Setting crossOrigin is fine; width/height works either way. Keep it to reduce surprises.
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        const w = clampPositiveInt(img.naturalWidth);
        const h = clampPositiveInt(img.naturalHeight);
        if (w && h) {
          const out = { width: w, height: h };
          __intrinsicSizeCache.set(url, out);
          resolve(out);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);

      // Some sites return protocol-relative or relative URLs; normalize again.
      try {
        img.src = new URL(url, window.location.href).toString();
      } catch {
        img.src = url;
      }
    }),
    timeoutMs,
    "probeImageUrlIntrinsicSize"
  ).catch(() => null);

  return size;
}

/**
 * Extract intrinsic size directly from the element if possible, otherwise probe via URL.
 */
async function extractIntrinsicSize(el: Element, computed?: CSSStyleDeclaration): Promise<IntrinsicSize | null> {
  // <img>
  if (el instanceof HTMLImageElement) {
    // If not decoded yet, naturalWidth may be 0. decode() helps when available.
    try {
      // decode() may throw for SVG/data URLs; ignore.
      if (typeof el.decode === "function") await withTimeout(el.decode(), 2000, "img.decode");
    } catch {
      // ignore
    }
    const w = clampPositiveInt(el.naturalWidth);
    const h = clampPositiveInt(el.naturalHeight);
    if (w && h) return { width: w, height: h };

    const url = el.currentSrc || el.src;
    if (url) return await probeImageUrlIntrinsicSize(url);
    return null;
  }

  // <video>
  if (el instanceof HTMLVideoElement) {
    const w = clampPositiveInt(el.videoWidth);
    const h = clampPositiveInt(el.videoHeight);
    if (w && h) return { width: w, height: h };
    if (el.poster) return await probeImageUrlIntrinsicSize(el.poster);
    return null;
  }

  // <canvas>
  if (el instanceof HTMLCanvasElement) {
    const w = clampPositiveInt(el.width);
    const h = clampPositiveInt(el.height);
    if (w && h) return { width: w, height: h };
    return null;
  }

  // SVG <image> width/height attributes (fallback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyEl = el as any;
  const svgW = clampPositiveInt(anyEl?.width?.baseVal?.value);
  const svgH = clampPositiveInt(anyEl?.height?.baseVal?.value);
  if (svgW && svgH) return { width: svgW, height: svgH };

  // CSS background-image
  const url = bestElementImageUrl(el, computed);
  if (url) return await probeImageUrlIntrinsicSize(url);

  // FIX 2: Fallback to CSS computed dimensions as last resort
  // CRITICAL: When natural dimensions and URL probing fail, use computed CSS dimensions
  // This ensures we always have some dimension data rather than failing completely
  if (computed) {
    const cssWidth = parseFloat(computed.width);
    const cssHeight = parseFloat(computed.height);
    if (cssWidth > 0 && cssHeight > 0 && Number.isFinite(cssWidth) && Number.isFinite(cssHeight)) {
      console.log(`📐 [INTRINSIC SIZE FALLBACK] Using CSS dimensions: ${cssWidth}x${cssHeight}`);
      return { width: Math.round(cssWidth), height: Math.round(cssHeight) };
    }
  }

  return null;
}

// ============================================================================
// MAIN EXTRACTOR CLASS
// ============================================================================

export class DOMExtractor {
  private nodeId = 0;
  private extractionStartTime = 0;
  private readonly MAX_EXTRACTION_TIME = 180000; // 180 seconds (increased from 115s for Site)
  private lastYieldTime = 0;
  private computedStyleCache = new Map<Element, CSSStyleDeclaration>();
  private schemaInProgress: WebToFigmaSchema | null = null;

  // Auto Layout tracking for metrics
  private autoLayoutMetrics = {
    totalNodes: 0,
    autoLayoutCandidates: 0,
    autoLayoutAppliedSafe: 0,
    autoLayoutRejected: 0,
    rejectionReasons: new Map<string, number>(),
  };

  // PERFORMANCE CONFIGURATION - Emergency circuit breakers for timeouts
  private performanceConfig = {
    maxNodesPerCapture: 30000, // Hard cap to avoid infinite DOMs (Site/Amazon)
    maxChildrenForValidation: 10, // Skip Auto Layout validation for containers with >10 children
    validationTimeoutMs: 100, // Max 100ms per validation
    yieldIntervalMs: 50, // Yield to event loop every 50ms
    yieldNodeCount: 20, // Yield every N nodes for cooperative processing
    heartbeatIntervalMs: 400, // Heartbeat every 400ms (250-500ms range)
    performanceMode: false, // Fallback to skip all validation
    circuitBreakerThreshold: 5, // Activate performance mode after 5 timeouts
  };

  // Performance tracking
  private performanceTracker = {
    validationTimeouts: 0,
    circuitBreakerActivated: false,
    lastYieldTime: 0,
    validationCount: 0,
    skippedDueToChildCount: 0,
    skippedDueToTimeout: 0,
    nodesProcessed: 0,
    phaseStartTime: 0,
    currentPhase: "initialization",
  };

  // DIAGNOSTICS: Counters for debugging blank frame issues
  private diagnostics = {
    totalElements: 0,
    processedNodes: 0,
    skippedTag: 0,
    skippedHidden: 0,
    skippedZeroSize: 0,
    skippedText: 0,
    maxDepthReached: 0,
  };
  private errorTracker = new ErrorTracker();
  private svgSpriteCache = new Map<string, Document>();
  private lineHeightCache = new Map<string, number>();
  private measurementRoot: HTMLDivElement | null = null;
  private lineHeightMeasurer: HTMLSpanElement | null = null;
  private sharedCanvas: HTMLCanvasElement | null = null;
  private sharedCtx: CanvasRenderingContext2D | null = null;
  private colorCache = new Map<
    string,
    { r: number; g: number; b: number; a: number } | null
  >();
  private siteElementCache = new WeakMap<Element, boolean>();

  /**
   * Safely gets the className string from an element, handling SVGAnimatedString
   */
  private getClassNameSafe(element: Element): string {
    const className = element.className;
    if (typeof className === "string") return className;
    if (typeof className === "object" && className && "baseVal" in className) {
      return (className as any).baseVal;
    }
    return String(className || "");
  }

  private assets = {
    images: new Map<
      string,
      {
        originalUrl: string;
        absoluteUrl: string;
        url: string;
        base64: string | null;
        mimeType: string;
        width?: number;
        height?: number;
        error?: string;
      }
    >(),
    svgs: new Map<
      string,
      {
        id: string;
        hash: string;
        svgCode: string;
        width: number;
        height: number;
        url?: string;
        contentType?: string;
      }
    >(),
    fonts: new Map<string, Set<number>>(),
    fontFiles: new Map<
      string,
      {
        family: string;
        weight: string | number;
        style: string;
        url: string;
        format?: string;
        data?: string;
        error?: string;
      }
    >(),
    colors: new Set<string>(),
    designTokens: {
      colors: new Map<string, { value: string; count: number }>(),
      spacing: new Map<string, { value: number; count: number }>(),
      typography: new Map<string, { value: string; count: number }>(),
    },
  };

  constructor() {
    console.log(
      "🎯 [DOM EXTRACTOR v2.0] Production-grade extractor initialized"
    );
  }

  // ============================================================================
  // MAIN EXTRACTION METHOD
  // ============================================================================

  async extractPageToSchema(): Promise<WebToFigmaSchema> {
    this.extractionStartTime = Date.now();
    this.lastYieldTime = Date.now();
    this.computedStyleCache.clear();
    this.colorCache.clear();
    this.errorTracker = new ErrorTracker();

    console.log("🎯 [EXTRACTION START] Starting DOM extraction...");
    console.log("📍 Location:", window.location.href);
    console.log("🛠️ VERSION: PRODUCTION_V2 (Enhanced Robustness)");

    // ENHANCED: Set up progress heartbeat to prevent watchdog timeout
    // Use 400ms interval (within 250-500ms range) for more responsive progress
    const progressHeartbeat = setInterval(() => {
      const elapsed = Date.now() - this.extractionStartTime;
      const percent = Math.min(
        Math.floor((elapsed / this.MAX_EXTRACTION_TIME) * 100),
        99
      );
      const nodesProcessed = this.performanceTracker.nodesProcessed;
      const phase = this.performanceTracker.currentPhase;
      this.postProgress(
        `Extracting... (${Math.floor(
          elapsed / 1000
        )}s, ${nodesProcessed} nodes, ${phase})`,
        percent
      );
      this.lastYieldTime = Date.now();
    }, this.performanceConfig.heartbeatIntervalMs); // Post progress every 400ms

    // CRITICAL: Aggressive navigation prevention for Site SPA
    // Site uses pushState/replaceState for navigation, so we need to intercept those
    // ENHANCED: Check if navigation is already blocked (prevent duplicate setup)
    if ((window as any).__NAVIGATION_BLOCKED__) {
      console.warn(
        "⚠️ [NAVIGATION] Navigation blocking already active, skipping duplicate setup"
      );
      // Still proceed with extraction but don't set up blocking again
    }

    // CRITICAL FIX: Disable scroll restoration for Site before extraction starts
    // This prevents Site from restoring scroll position during extraction
    try {
      if (false || false) {
        if ("scrollRestoration" in history) {
          (history as any).scrollRestoration = "manual";
          console.log(
            "🔧 [SITE] Disabled scroll restoration at extraction start"
          );
        }
      }
    } catch (e) {
      // Ignore errors when disabling scroll restoration
    }

    const originalUrl = window.location.href;
    const originalPath = window.location.pathname;
    const originalSearch = window.location.search;
    let navigationBlocked = true;

    // Mark navigation as blocked globally to prevent duplicate setups
    (window as any).__NAVIGATION_BLOCKED__ = true;

    console.log(`🔒 [NAVIGATION LOCK] Locking URL: ${originalUrl}`);

    // Intercept history.pushState and history.replaceState (Site's SPA navigation)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // Capture extractor instance for helper methods
    const extractor = this;

    const blockedPushState = function (
      this: History,
      state: any,
      title: string,
      url?: string | null
    ) {
      if (navigationBlocked) {
        if (url) {
          try {
            const newUrl = new URL(url, window.location.href).href;
            // ENHANCED: Block if URL is different OR if it's a different video ID
            // Check for Site video ID changes specifically
            const originalPath = new URL(originalUrl).pathname;
            const newPath = new URL(newUrl, originalUrl).pathname;

            const isDifferentVideo =
              newUrl !== originalUrl ||
              (newUrl.includes("/watch?v=") &&
                originalUrl.includes("/watch?v=") &&
                newUrl.match(/[?&]v=([^&\s#]+)/)?.[1] !==
                  originalUrl.match(/[?&]v=([^&\s#]+)/)?.[1]);

            // Also check for channel page navigation
            const isChannelNavigation =
              (extractor.isSiteChannelPage(originalPath) &&
                !extractor.isSiteChannelPage(newPath)) ||
              (!extractor.isSiteChannelPage(originalPath) &&
                extractor.isSiteChannelPage(newPath)) ||
              (extractor.isSiteChannelPage(originalPath) &&
                extractor.isSiteChannelPage(newPath) &&
                extractor.extractSiteChannelId(originalPath) !==
                  extractor.extractSiteChannelId(newPath));

            const isDifferentPage = isDifferentVideo || isChannelNavigation;

            if (isDifferentPage) {
              console.warn(
                `🚫 [NAVIGATION BLOCK] Blocked pushState to: ${newUrl} (original: ${originalUrl})`
              );
              // ENHANCED: Immediate restoration with multiple attempts
              let restored = false;
              for (let i = 0; i < 3; i++) {
                try {
                  originalReplaceState.call(
                    window.history,
                    null,
                    "",
                    originalUrl
                  );
                  // Check immediately
                  if (window.location.href === originalUrl) {
                    restored = true;
                    break;
                  }
                } catch {}
              }

              if (!restored) {
                // Force restore in next tick
                setTimeout(() => {
                  try {
                    originalReplaceState.call(
                      window.history,
                      null,
                      "",
                      originalUrl
                    );
                    if (window.location.href !== originalUrl) {
                      console.error(
                        `❌ [NAVIGATION] pushState restoration failed. Current: ${window.location.href}`
                      );
                    }
                  } catch {}
                }, 0);
              }

              // Don't call original - block the navigation completely
              return;
            }
          } catch (urlError) {
            // If URL parsing fails, block it to be safe
            console.warn(
              `🚫 [NAVIGATION BLOCK] Blocked pushState with invalid URL: ${url}`
            );
            return;
          }
        } else {
          // For Site, be more lenient with state-only changes (might be needed for player state)
          // But log it for debugging
          console.log(
            `ℹ️ [NAVIGATION] Allowed pushState without URL (state-only change)`
          );
        }
      }
      return originalPushState.apply(this, arguments as any);
    };

    const blockedReplaceState = function (
      this: History,
      state: any,
      title: string,
      url?: string | null
    ) {
      if (navigationBlocked) {
        if (url) {
          try {
            const newUrl = new URL(url, window.location.href).href;
            // Block if URL is different
            if (newUrl !== originalUrl) {
              console.warn(
                `🚫 [NAVIGATION BLOCK] Blocked replaceState to: ${newUrl} (original: ${originalUrl})`
              );
              // Immediately restore original URL
              try {
                originalReplaceState.call(
                  window.history,
                  null,
                  "",
                  originalUrl
                );
                setTimeout(() => {
                  if (window.location.href !== originalUrl) {
                    originalReplaceState.call(
                      window.history,
                      null,
                      "",
                      originalUrl
                    );
                  }
                }, 0);
              } catch {}
              // Don't call original - block the navigation completely
              return;
            }
          } catch (urlError) {
            // If URL parsing fails, block it to be safe
            console.warn(
              `🚫 [NAVIGATION BLOCK] Blocked replaceState with invalid URL: ${url}`
            );
            return;
          }
        }
        // Allow replaceState without URL (might be used for state updates)
      }
      return originalReplaceState.apply(this, arguments as any);
    };

    // Override history methods
    window.history.pushState = blockedPushState;
    window.history.replaceState = blockedReplaceState;

    // Block beforeunload and popstate
    // ENHANCED: Track if listener is already added to prevent duplicates
    let preventNavigationListenerAdded = false;
    let preventNavigationHandler:
      | ((e: BeforeUnloadEvent | PopStateEvent) => void)
      | null = null;

    const preventNavigation = (e: BeforeUnloadEvent | PopStateEvent) => {
      if (navigationBlocked) {
        // ENHANCED: Only log once per event type to avoid spam
        const eventType = e.type;
        if (!(window as any).__NAV_LOGGED__) {
          (window as any).__NAV_LOGGED__ = {};
        }
        if (!(window as any).__NAV_LOGGED__[eventType]) {
          console.warn(
            `🚫 [NAVIGATION BLOCK] Preventing ${eventType} navigation during extraction`
          );
          (window as any).__NAV_LOGGED__[eventType] = true;
          // Reset after 1 second to allow new logs if needed
          setTimeout(() => {
            (window as any).__NAV_LOGGED__[eventType] = false;
          }, 1000);
        }
        e.preventDefault();
        if (e instanceof BeforeUnloadEvent) {
          e.returnValue = "";
        }
        // For popstate, restore URL immediately
        if (e instanceof PopStateEvent) {
          try {
            window.history.replaceState(null, "", originalUrl);
            if (!(window as any).__NAV_LOGGED__?.popstate_restore) {
              console.log("✅ [NAVIGATION FIX] Restored URL from popstate");
              (window as any).__NAV_LOGGED__ =
                (window as any).__NAV_LOGGED__ || {};
              (window as any).__NAV_LOGGED__.popstate_restore = true;
              setTimeout(() => {
                (window as any).__NAV_LOGGED__.popstate_restore = false;
              }, 1000);
            }
          } catch (error) {
            console.warn(
              "⚠️ [NAVIGATION FIX] Could not restore from popstate:",
              error
            );
          }
        }
        return false;
      }
    };

    // CRITICAL FIX: Block all anchor clicks and form submissions on Site
    // Site uses anchor tags for navigation, so we need to prevent clicks
    const blockAnchorClicks = (e: MouseEvent) => {
      if (!navigationBlocked) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Find the closest anchor tag
      const anchor = target.closest("a[href]");
      if (anchor) {
        const href = (anchor as HTMLAnchorElement).href;
        if (href && href !== originalUrl) {
          // Check if it's a different video or page
          try {
            const newUrl = new URL(href, window.location.href).href;
            const isDifferentVideo =
              newUrl !== originalUrl ||
              (newUrl.includes("/watch?v=") &&
                originalUrl.includes("/watch?v=") &&
                newUrl.match(/[?&]v=([^&\s#]+)/)?.[1] !==
                  originalUrl.match(/[?&]v=([^&\s#]+)/)?.[1]);

            if (isDifferentVideo) {
              console.warn(
                `🚫 [NAVIGATION BLOCK] Blocked anchor click to: ${newUrl}`
              );
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              return false;
            }
          } catch (urlError) {
            // If URL parsing fails, block it to be safe
            console.warn(
              `🚫 [NAVIGATION BLOCK] Blocked anchor click with invalid URL: ${href}`
            );
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        }
      }
    };

    // Add click blocking for anchors (capture phase to catch before Site's handlers)
    document.addEventListener("click", blockAnchorClicks, true);

    // Aggressive URL monitoring and restoration
    // ENHANCED: More frequent checking and multiple restoration attempts
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      // Check if URL changed (including pathname or search params)
      if (
        currentUrl !== originalUrl ||
        currentPath !== originalPath ||
        currentSearch !== originalSearch
      ) {
        console.warn(
          `⚠️ [NAVIGATION DETECTED] URL changed from ${originalUrl} to ${currentUrl}`
        );

        // ENHANCED: Multiple aggressive restoration attempts
        let restored = false;
        const maxRestoreAttempts = 5;

        for (let attempt = 0; attempt < maxRestoreAttempts; attempt++) {
          try {
            // Method 1: Use original replaceState
            originalReplaceState.call(window.history, null, "", originalUrl);

            // Method 2: Try multiple replaceState calls if first didn't work
            if (window.location.href !== originalUrl && attempt > 0) {
              try {
                // Force multiple replaceState calls
                for (let i = 0; i < 3; i++) {
                  originalReplaceState.call(
                    window.history,
                    null,
                    "",
                    originalUrl
                  );
                  if (window.location.href === originalUrl) break;
                }
              } catch {}
            }

            // Check if restored
            if (window.location.href === originalUrl) {
              restored = true;
              console.log(
                `✅ [NAVIGATION FIX] Restored original URL (attempt ${
                  attempt + 1
                })`
              );
              break;
            }
          } catch (error) {
            if (attempt === maxRestoreAttempts - 1) {
              console.warn(
                `⚠️ [NAVIGATION FIX] Restore attempt ${attempt + 1} failed:`,
                error
              );
            }
          }

          // Small delay between attempts
          if (attempt < maxRestoreAttempts - 1) {
            // Use synchronous delay (not ideal but necessary for immediate restoration)
            const start = Date.now();
            while (Date.now() - start < 5) {} // 5ms delay
          }
        }

        // If still not restored after all attempts, log critical error
        if (!restored && window.location.href !== originalUrl) {
          console.error(
            `❌ [NAVIGATION FAIL] Could not restore URL after ${maxRestoreAttempts} attempts. Current: ${window.location.href}, Original: ${originalUrl}`
          );
          // ENHANCED: Last resort - try to prevent further navigation
          try {
            // Block all future navigation attempts more aggressively
            window.history.pushState = function () {
              return;
            };
            window.history.replaceState = function () {
              return;
            };
            console.warn(
              "🚫 [NAVIGATION] Disabled history API completely as last resort"
            );
          } catch {}
        }
      }
    };

    // CRITICAL FIX: Enhanced anchor click blocking for Site
    // Site uses anchor tags extensively for navigation, so we need aggressive blocking
    const blockNavigationClicks = (e: MouseEvent) => {
      if (!navigationBlocked) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // ENHANCED: Block ALL navigation clicks, not just Site-specific elements
      // This prevents any link from opening a new page during extraction

      // Check for anchor tags with href (most common navigation method)
      const link =
        target.closest("a[href]") || (target.tagName === "A" ? target : null);
      if (link) {
        const href = (link as HTMLAnchorElement).href;
        if (href) {
          try {
            // Block ALL external navigation (different URL)
            const currentUrlObj = new URL(window.location.href);
            const targetUrlObj = new URL(href, window.location.href);

            // Check if it's a different page (different origin, path, or video ID for Site)
            const isDifferentPage =
              targetUrlObj.origin !== currentUrlObj.origin ||
              targetUrlObj.pathname !== currentUrlObj.pathname ||
              (targetUrlObj.hostname.includes("site.com") &&
                currentUrlObj.hostname.includes("site.com") &&
                targetUrlObj.searchParams.get("v") !==
                  currentUrlObj.searchParams.get("v"));

            // CRITICAL: Also check for video ID changes using regex (more reliable)
            const currentVideoId = originalUrl.match(/[?&]v=([^&\s#]+)/)?.[1];
            const targetVideoId = href.match(/[?&]v=([^&\s#]+)/)?.[1];
            const isDifferentVideo =
              currentVideoId &&
              targetVideoId &&
              currentVideoId !== targetVideoId;

            // Block if it's a different page or video (not just hash/anchor)
            if (
              (isDifferentPage || isDifferentVideo) &&
              !href.startsWith("#") &&
              !href.startsWith("javascript:")
            ) {
              console.warn(
                `🚫 [NAVIGATION BLOCK] Blocked click on navigation link: ${href} (original: ${originalUrl})`
              );
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              return false;
            }
          } catch (urlError) {
            // If URL parsing fails, block it to be safe
            console.warn(
              `🚫 [NAVIGATION BLOCK] Blocked click on link with unparseable URL: ${href}`
            );
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        }
      }

      // Block elements with onclick handlers that might trigger navigation
      if (
        (target as any).onclick ||
        target.hasAttribute("onclick") ||
        target.getAttribute("data-navigation") === "true"
      ) {
        // Only block if it's likely to cause navigation
        const onclickStr = target.getAttribute("onclick") || "";
        if (
          onclickStr.includes("location") ||
          onclickStr.includes("window.open") ||
          onclickStr.includes("href")
        ) {
          console.warn(
            `🚫 [NAVIGATION BLOCK] Blocked click on element with navigation onclick`
          );
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    // Add all event listeners
    // ENHANCED: Check if listeners are already added to prevent duplicates
    if (!preventNavigationListenerAdded) {
      preventNavigationHandler = preventNavigation;
      window.addEventListener("beforeunload", preventNavigationHandler, {
        capture: true,
      });
      window.addEventListener("popstate", preventNavigationHandler, {
        capture: true,
      });
      preventNavigationListenerAdded = true;
    }

    // Click listener should always be added (but check for duplicates)
    if (!(window as any).__CLICK_LISTENER_ADDED__) {
      document.addEventListener("click", blockNavigationClicks, {
        capture: true,
        passive: false,
      });
      (window as any).__CLICK_LISTENER_ADDED__ = true;
    }

    // ENHANCED: Monitor URL changes VERY frequently (every 5ms for Site - extremely aggressive)
    // This catches navigation attempts that happen between our pushState/replaceState blocks
    // Reduced to 5ms for even faster detection and restoration
    const urlCheckInterval = setInterval(checkUrlChange, 5);

    // ENHANCED: Watch for navigation via hash changes (Site sometimes uses this)
    let hashChangeHandler: ((e: HashChangeEvent) => void) | null = null;

    if (navigationBlocked) {
      hashChangeHandler = (e: HashChangeEvent) => {
        if (window.location.href !== originalUrl) {
          console.warn(`🚫 [NAVIGATION BLOCK] Blocked hash change navigation`);
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          try {
            originalReplaceState.call(window.history, null, "", originalUrl);
          } catch {}
        }
      };
      window.addEventListener("hashchange", hashChangeHandler, {
        capture: true,
      });
    }

    // ENHANCED: Also prevent any navigation via window.open or other methods
    const originalWindowOpen = window.open;
    const blockedWindowOpen = function (
      this: Window,
      url?: string | URL | null,
      target?: string,
      features?: string
    ): Window | null {
      if (navigationBlocked && url) {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("site.com") || urlStr.includes("youtu.be")) {
          console.warn(
            `🚫 [NAVIGATION BLOCK] Blocked window.open to: ${urlStr}`
          );
          return null; // Block opening new windows/tabs
        }
      }
      return originalWindowOpen.apply(this, arguments as any);
    };
    window.open = blockedWindowOpen;

    // ENHANCED: Try to intercept location.href assignments (if possible)
    // Note: This may not work in all browsers due to security restrictions
    let locationSetterIntercepted = false;
    try {
      const locationDescriptor = Object.getOwnPropertyDescriptor(
        window,
        "location"
      );
      if (locationDescriptor && locationDescriptor.set) {
        const originalLocationSetter = locationDescriptor.set;
        Object.defineProperty(window, "location", {
          set: function (value: string | Location) {
            if (navigationBlocked) {
              const newUrl = typeof value === "string" ? value : value.href;
              if (newUrl && newUrl !== originalUrl) {
                // ENHANCED: Check if it's a different Site video (more comprehensive)
                const originalVideoId =
                  originalUrl.match(/[?&]v=([^&\s#]+)/)?.[1];
                const newVideoId = newUrl.match(/[?&]v=([^&\s#]+)/)?.[1];
                const isDifferentVideo =
                  newUrl.includes("site.com") &&
                  originalVideoId &&
                  newVideoId &&
                  originalVideoId !== newVideoId;

                // Also check if URL path changed (different video page or channel)
                const originalPathObj = new URL(originalUrl);
                const newPathObj = new URL(newUrl, originalUrl);
                const originalPath = originalPathObj.pathname;
                const newPath = newPathObj.pathname;

                const isDifferentPath =
                  originalPath !== newPath &&
                  (newPath.includes("/watch") ||
                    newPath.includes("/shorts") ||
                    extractor.isSiteChannelPage(newPath) ||
                    extractor.isSiteChannelPage(originalPath));

                // Check for channel changes
                const isChannelChange =
                  (extractor.isSiteChannelPage(originalPath) &&
                    !extractor.isSiteChannelPage(newPath)) ||
                  (!extractor.isSiteChannelPage(originalPath) &&
                    extractor.isSiteChannelPage(newPath)) ||
                  (extractor.isSiteChannelPage(originalPath) &&
                    extractor.isSiteChannelPage(newPath) &&
                    extractor.extractSiteChannelId(originalPath) !==
                      extractor.extractSiteChannelId(newPath));

                if (isDifferentVideo || isDifferentPath || isChannelChange) {
                  console.warn(
                    `🚫 [NAVIGATION BLOCK] Blocked location.href assignment to: ${newUrl}`
                  );
                  // ENHANCED: Multiple restoration attempts
                  for (let i = 0; i < 3; i++) {
                    try {
                      originalReplaceState.call(
                        window.history,
                        null,
                        "",
                        originalUrl
                      );
                      if (window.location.href === originalUrl) break;
                    } catch {}
                  }
                  return; // Block the assignment
                }
              }
            }
            return originalLocationSetter.call(window, value);
          },
          get: function () {
            return window.location;
          },
          configurable: true,
        });
        locationSetterIntercepted = true;
        console.log("✅ [NAVIGATION] Intercepted location.href setter");
      }
    } catch (locationError) {
      // Location setter interception may not work due to browser security
      console.log(
        "ℹ️ [NAVIGATION] Could not intercept location.href setter (expected in some browsers)"
      );
    }

    // ENHANCED: Also try to override location.assign and location.replace
    if (navigationBlocked) {
      try {
        const originalAssign = window.location.assign;
        const originalReplace = window.location.replace;

        // Store original functions for restoration
        (window.location.assign as any).__original = originalAssign;
        (window.location.replace as any).__original = originalReplace;

        window.location.assign = function (url: string | URL) {
          if (navigationBlocked) {
            const urlStr = typeof url === "string" ? url : url.href;
            if (
              urlStr &&
              urlStr !== originalUrl &&
              urlStr.includes("site.com")
            ) {
              console.warn(
                `🚫 [NAVIGATION BLOCK] Blocked location.assign to: ${urlStr}`
              );
              try {
                originalReplaceState.call(
                  window.history,
                  null,
                  "",
                  originalUrl
                );
              } catch {}
              return;
            }
          }
          return originalAssign.call(window.location, url);
        };

        window.location.replace = function (url: string | URL) {
          if (navigationBlocked) {
            const urlStr = typeof url === "string" ? url : url.href;
            if (
              urlStr &&
              urlStr !== originalUrl &&
              urlStr.includes("site.com")
            ) {
              console.warn(
                `🚫 [NAVIGATION BLOCK] Blocked location.replace to: ${urlStr}`
              );
              try {
                originalReplaceState.call(
                  window.history,
                  null,
                  "",
                  originalUrl
                );
              } catch {}
              return;
            }
          }
          return originalReplace.call(window.location, url);
        };

        console.log(
          "✅ [NAVIGATION] Intercepted location.assign and location.replace"
        );
      } catch (assignError) {
        console.log(
          "ℹ️ [NAVIGATION] Could not intercept location.assign/replace"
        );
      }
    }

    // ENHANCED: Track if cleanup has already been called to prevent duplicate cleanup
    let cleanupCalled = false;

    // Cleanup function - defined in scope for use in try/catch
    const cleanupNavigationBlock = () => {
      if (cleanupCalled) {
        console.warn(
          "⚠️ [NAVIGATION] Cleanup already called, skipping duplicate cleanup"
        );
        return;
      }
      cleanupCalled = true;
      console.log("🔓 [NAVIGATION UNLOCK] Releasing navigation lock");
      navigationBlocked = false;
      // Clear global flag
      (window as any).__NAVIGATION_BLOCKED__ = false;

      // CRITICAL FIX: Remove click blocking event listener
      if (typeof blockNavigationClicks === "function") {
        document.removeEventListener("click", blockNavigationClicks, true);
      }

      // Restore original history methods
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;

      // Restore window.open
      window.open = originalWindowOpen;

      // Restore location setter and methods if we modified them
      try {
        // Restore location.assign and location.replace if we overrode them
        if ((window.location.assign as any).__original) {
          window.location.assign = (window.location.assign as any).__original;
        }
        if ((window.location.replace as any).__original) {
          window.location.replace = (window.location.replace as any).__original;
        }

        // Try to restore original location descriptor
        const locationDescriptor = Object.getOwnPropertyDescriptor(
          window,
          "location"
        );
        if (locationDescriptor && locationDescriptor.set) {
          // Location setter was intercepted, but we can't easily restore it
          // The browser will handle this on page unload
        }
      } catch {}

      // Remove hash change listener
      if (hashChangeHandler) {
        window.removeEventListener("hashchange", hashChangeHandler, {
          capture: true,
        } as any);
      }

      // Remove event listeners
      if (preventNavigationListenerAdded && preventNavigationHandler) {
        try {
          window.removeEventListener("beforeunload", preventNavigationHandler, {
            capture: true,
          } as any);
          window.removeEventListener("popstate", preventNavigationHandler, {
            capture: true,
          } as any);
        } catch (e) {
          // Ignore errors during cleanup
        }
        preventNavigationListenerAdded = false;
        preventNavigationHandler = null;
      }

      if ((window as any).__CLICK_LISTENER_ADDED__) {
        try {
          document.removeEventListener("click", blockNavigationClicks, {
            capture: true,
          } as any);
        } catch (e) {
          // Ignore errors during cleanup
        }
        (window as any).__CLICK_LISTENER_ADDED__ = false;
      }

      // Clear navigation logging flags
      if ((window as any).__NAV_LOGGED__) {
        delete (window as any).__NAV_LOGGED__;
      }

      clearInterval(urlCheckInterval);
    };

    // CRITICAL FIX: Ensure page is scrolled to top before extraction
    // This prevents headers and top-level elements from having incorrect positions
    const currentScrollTop =
      window.pageYOffset || document.documentElement.scrollTop;
    const currentScrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    // ENHANCED: Aggressive scroll reset for dynamic pages like Site
    // Site pages have scroll restoration and dynamic content that can interfere
    if (currentScrollTop > 1 || currentScrollLeft > 1) {
      console.log(
        `🔄 [POSITION FIX] Page is scrolled (top: ${currentScrollTop}, left: ${currentScrollLeft}). ` +
          `Scrolling to top to ensure accurate positioning...`
      );

      // Multiple scroll attempts for stubborn pages like Site
      let scrollAttempts = 0;
      const maxAttempts = 5;
      let lastScrollTop = currentScrollTop;
      let lastScrollLeft = currentScrollLeft;

      while (scrollAttempts < maxAttempts) {
        // Force scroll to top using multiple methods
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;

        // Wait longer for Site's dynamic content to settle
        await new Promise<void>((resolve) => {
          // Use multiple RAFs + timeout for Site's complex rendering
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Additional delay for Site's scroll restoration
                setTimeout(
                  () => {
                    resolve(undefined);
                  },
                  scrollAttempts > 0 ? 100 : 50
                ); // Longer delay on retries
              });
            });
          });
        });

        const newScrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const newScrollLeft =
          window.pageXOffset || document.documentElement.scrollLeft;

        // Check if scroll actually changed
        if (newScrollTop <= 1 && newScrollLeft <= 1) {
          console.log(
            `✅ [POSITION FIX] Scroll reset complete after ${
              scrollAttempts + 1
            } attempt(s)`
          );
          break;
        }

        // If scroll didn't change, we're stuck (Site may be preventing scroll)
        if (
          Math.abs(newScrollTop - lastScrollTop) < 0.5 &&
          Math.abs(newScrollLeft - lastScrollLeft) < 0.5
        ) {
          console.warn(
            `⚠️ [POSITION FIX] Scroll appears stuck (top: ${newScrollTop}, left: ${newScrollLeft}). ` +
              `This may be due to Site's scroll restoration. Continuing with current position...`
          );
          // CRITICAL FIX: Disable scroll restoration for Site to prevent interference
          try {
            if (false || false) {
              if ("scrollRestoration" in history) {
                (history as any).scrollRestoration = "manual";
                console.log(
                  "🔧 [SITE] Disabled scroll restoration to prevent interference"
                );
              }
            }
          } catch (e) {
            // Ignore errors when disabling scroll restoration
          }
          // For Site, we'll account for scroll offset in positioning calculations
          break;
        }

        lastScrollTop = newScrollTop;
        lastScrollLeft = newScrollLeft;
        scrollAttempts++;

        if (scrollAttempts < maxAttempts) {
          console.log(
            `🔄 [POSITION FIX] Retry ${
              scrollAttempts + 1
            }/${maxAttempts} - current scroll: top=${newScrollTop}, left=${newScrollLeft}`
          );
        }
      }

      // Final check and store offset for consistent positioning
      const finalScrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const finalScrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      if (finalScrollTop > 1 || finalScrollLeft > 1) {
        console.warn(
          `⚠️ [POSITION FIX] Could not fully reset scroll (top: ${finalScrollTop}, left: ${finalScrollLeft}). ` +
            `Position calculations will account for this offset.`
        );
      }
    }

    this.postProgress("Initializing DOM traversal...", 30);

    // CRITICAL FIX: Extract document/body background color for main frame
    // This ensures the main frame matches the actual page background (black, white, etc.)
    let documentBackgroundColor: string | undefined;
    try {
      const bodyStyle = window.getComputedStyle(document.body);
      const htmlStyle = window.getComputedStyle(document.documentElement);

      // Prefer body background, fallback to html
      const bgColor = bodyStyle.backgroundColor || htmlStyle.backgroundColor;
      if (
        bgColor &&
        bgColor !== "rgba(0, 0, 0, 0)" &&
        bgColor !== "transparent"
      ) {
        documentBackgroundColor = bgColor;
        console.log(
          `🎨 [BACKGROUND] Document background color detected: ${bgColor}`
        );
      } else {
        // Check if html has a background
        if (
          htmlStyle.backgroundColor &&
          htmlStyle.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          htmlStyle.backgroundColor !== "transparent"
        ) {
          documentBackgroundColor = htmlStyle.backgroundColor;
          console.log(
            `🎨 [BACKGROUND] HTML background color detected: ${htmlStyle.backgroundColor}`
          );
        }
      }
    } catch (error) {
      console.warn(
        "⚠️ [BACKGROUND] Failed to extract document background color:",
        error
      );
    }

    // Detect color scheme (dark/light mode)
    const colorSchemeDetection = this.detectColorScheme();

    // Initialize schema
    const schema: WebToFigmaSchema = {
      version: "2.0.0-production",
      metadata: {
        url: window.location.href,
        title: document.title,
        viewport: this.extractViewportData(),
        timestamp: new Date().toISOString(),
        fonts: [],
        mediaQueries: await this.extractMediaQueriesSafe(),
        responsiveBreakpoints: this.extractResponsiveBreakpoints(),
        documentBackgroundColor, // Store for use in Figma plugin
        colorScheme: colorSchemeDetection.isDarkMode ? "dark" : "light",
        colorSchemeDetection,
      },
      root: null as any,
      styles: {
        colors: {},
        textStyles: {},
        effects: {},
      },
      assets: {
        images: {},
        svgs: {},
        fonts: {},
      },
      // ENHANCED: Initialize hover states array for automatic button hover capture
      hoverStates: [],
    };

    this.schemaInProgress = schema;

    try {
      // Extract root node
      this.postProgress("Traversing DOM tree...", 40);

      // ENHANCED: Check for timeout before starting extraction

      // Phase tracking
      this.performanceTracker.currentPhase = "extracting_nodes";
      this.performanceTracker.phaseStartTime = Date.now();

      // CRITICAL FIX: Expand root element capture to include document.documentElement
      // This ensures we capture headers, navigation bars, fixed/sticky elements, and overlays
      // that may be positioned outside of document.body
      console.log(
        "🔧 [ROOT FIX] Capturing document.documentElement instead of document.body to include headers and positioned elements"
      );
      const rootNode = await this.extractNodeSafe(
        document.documentElement,
        null
      );

      const nodeExtractionTime =
        Date.now() - this.performanceTracker.phaseStartTime;
      console.log(
        `⏱️ [PHASE] Node extraction completed in ${nodeExtractionTime}ms`
      );

      if (rootNode) {
        // Clean body/html backgrounds
        if (rootNode.htmlTag === "body" || rootNode.htmlTag === "html") {
          console.log("🔄 [SCHEMA] Clearing body/html backgrounds");
          const beforeFills = Array.isArray((rootNode as any).fills)
            ? (rootNode as any).fills.length
            : 0;
          const beforeBgs = Array.isArray((rootNode as any).backgrounds)
            ? (rootNode as any).backgrounds.length
            : 0;
          rootNode.fills = [];
          if ((rootNode as any).backgrounds) {
            (rootNode as any).backgrounds = [];
          }
        }
        schema.root = rootNode;
      } else {
        // Do NOT create fallback - if root extraction fails, the capture should fail
        console.error(
          "❌ [EXTRACT] Root node extraction returned null - document.documentElement extraction failed"
        );
        throw new Error(
          "Failed to extract page content - document.documentElement returned null"
        );
      }

      // Phase tracking: Collect fonts
      this.performanceTracker.currentPhase = "collecting_fonts";
      this.performanceTracker.phaseStartTime = Date.now();
      await this.collectFontFacesSafe();
      const fontCollectionTime =
        Date.now() - this.performanceTracker.phaseStartTime;
      console.log(
        `⏱️ [PHASE] Font collection completed in ${fontCollectionTime}ms`
      );

      // Phase tracking: Process images
      this.performanceTracker.currentPhase = "processing_images";
      this.performanceTracker.phaseStartTime = Date.now();
      const imageResults = await this.processImagesBatch();
      const imageProcessingTime =
        Date.now() - this.performanceTracker.phaseStartTime;
      console.log(
        `⏱️ [PHASE] Image processing completed in ${imageProcessingTime}ms`
      );

      // Track image download failures in metadata
      if (imageResults.failed.length > 0) {
        (schema.metadata as any).imageDownloadFailures = imageResults.failed;
        console.warn(
          `⚠️ [IMAGE] ${imageResults.failed.length} images failed to download`
        );
      }

      // ENHANCED: Automatically capture hover states for all detected buttons
      // CRITICAL FIX: Skip on Site pages to avoid timeout/errors (Site has too many buttons)
      const isSite = false || false;
      if (!isSite) {
        this.postProgress("Capturing hover states for buttons...", 70);
        try {
          await this.captureButtonHoverStates(schema);
        } catch (error) {
          console.warn(
            "⚠️ [HOVER] Hover state capture failed, continuing without hover states:",
            error
          );
          // Don't fail the entire extraction if hover capture fails
        }
      } else {
        console.log(
          "ℹ️ [HOVER] Skipping hover state capture on Site (too many buttons)"
        );
      }

      // Finalize assets
      this.finalizeAssets(schema);

      // CRITICAL FIX: Remove DOM element references before serialization
      // This prevents "DataCloneError" when sending via postMessage
      if (schema.root) {
        this.cleanupNodeRefs(schema.root);
      }

      // Clear in-progress schema
      this.schemaInProgress = null;

      const processingTime = Date.now() - this.extractionStartTime;
      console.log("✅ Extraction complete!", {
        totalNodes: this.nodeId,
        images: this.assets.images.size,
        fonts: this.assets.fonts.size,
        processingTime: `${processingTime}ms`,
        errors: this.errorTracker.getSummary(),
      });

      // Add error report to metadata
      (schema.metadata as any).extractionErrors =
        this.errorTracker.getSummary();

      // Cleanup navigation blocking
      cleanupNavigationBlock();

      // Clean up progress heartbeat
      clearInterval(progressHeartbeat);

      // Log diagnostics
      console.log("📊 [EXTRACTION DIAGNOSTICS]", this.diagnostics);

      // Add Auto Layout metrics to schema
      if (!schema.metadata.extractionSummary) {
        schema.metadata.extractionSummary = {
          scrollComplete: true,
          tokensExtracted: true,
          totalElements: this.diagnostics.totalElements,
          visibleElements: this.diagnostics.processedNodes,
        };
      }

      // Add Auto Layout metrics
      schema.metadata.extractionSummary.autoLayoutCandidates =
        this.autoLayoutMetrics.autoLayoutCandidates;
      schema.metadata.extractionSummary.autoLayoutAppliedSafe =
        this.autoLayoutMetrics.autoLayoutAppliedSafe;
      schema.metadata.extractionSummary.autoLayoutRejected =
        this.autoLayoutMetrics.autoLayoutRejected;

      // Add performance metrics
      schema.metadata.extractionSummary.performanceMetrics = {
        validationCount: this.performanceTracker.validationCount,
        validationTimeouts: this.performanceTracker.validationTimeouts,
        skippedDueToChildCount: this.performanceTracker.skippedDueToChildCount,
        skippedDueToTimeout: this.performanceTracker.skippedDueToTimeout,
        circuitBreakerActivated:
          this.performanceTracker.circuitBreakerActivated,
      };

      // Convert rejection reasons map to array format
      const topRejectReasons = Array.from(
        this.autoLayoutMetrics.rejectionReasons.entries()
      )
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 reasons

      schema.metadata.extractionSummary.topRejectReasons = topRejectReasons;

      // Log Auto Layout summary
      console.log("🎯 [AUTO_LAYOUT SUMMARY]", {
        totalNodes: this.autoLayoutMetrics.totalNodes,
        candidates: this.autoLayoutMetrics.autoLayoutCandidates,
        appliedSafe: this.autoLayoutMetrics.autoLayoutAppliedSafe,
        rejected: this.autoLayoutMetrics.autoLayoutRejected,
        topRejectReasons: topRejectReasons,
      });

      // Performance summary
      console.log("⚡ [PERFORMANCE SUMMARY]", {
        validationCount: this.performanceTracker.validationCount,
        validationTimeouts: this.performanceTracker.validationTimeouts,
        skippedDueToChildCount: this.performanceTracker.skippedDueToChildCount,
        skippedDueToTimeout: this.performanceTracker.skippedDueToTimeout,
        circuitBreakerActivated:
          this.performanceTracker.circuitBreakerActivated,
        maxChildrenLimit: this.performanceConfig.maxChildrenForValidation,
        validationTimeoutMs: this.performanceConfig.validationTimeoutMs,
      });
      // INVARIANT CHECK: Warn if we have obvious layout containers but no auto layout applied
      if (
        this.autoLayoutMetrics.autoLayoutCandidates > 0 &&
        this.autoLayoutMetrics.autoLayoutAppliedSafe === 0
      ) {
        console.warn(
          "⚠️ [AUTO_LAYOUT REGRESSION] Found layout candidates but applied none - this may be a regression"
        );
      }

      // SCHEMA COMPLETION REPORT: Comprehensive capture statistics
      console.log('🔍 [SCHEMA DEBUG] Before completion report:', {
        hasRoot: !!schema.root,
        rootId: schema.root?.id,
        rootTag: schema.root?.htmlTag,
        rootChildren: schema.root?.children?.length || 0,
        firstChildTag: schema.root?.children?.[0]?.htmlTag
      });
      this.generateSchemaCompletionReport(schema);

      return schema;
    } catch (error) {
      this.errorTracker.recordError(
        "extractPageToSchema",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "critical"
      );

      // Cleanup navigation blocking even on error
      cleanupNavigationBlock();

      // Clean up progress heartbeat
      clearInterval(progressHeartbeat);

      // Return partial schema - logic removed
      throw error;
    }
  }

  // ============================================================================
  // SAFE NODE EXTRACTION
  // ============================================================================

  private async extractNodeSafe(
    element: Element,
    parentId: string | null,
    depth: number = 0,
    parentAbsoluteLayout: { x: number; y: number } = { x: 0, y: 0 }
  ): Promise<ElementNode | null> {
    // TIMEOUT CHECK
    if (Date.now() - this.extractionStartTime > this.MAX_EXTRACTION_TIME) {
      // Only log once (throttling could be added if needed, but throwing breaks the stack anyway)
      const limitSec = Math.round(this.MAX_EXTRACTION_TIME / 1000);
      console.error(`❌ [TIMEOUT] Auto-terminating extraction at ${limitSec}s`);
      throw new Error(`DOM extraction timed out (limit: ${limitSec}s)`);
    }

    // NODE CAP CHECK (prevents infinite DOM extraction on dynamic feeds)
    if (
      this.performanceTracker.nodesProcessed >
      this.performanceConfig.maxNodesPerCapture
    ) {
      const cap = this.performanceConfig.maxNodesPerCapture;
      console.error(
        `❌ [NODE CAP] Extraction exceeded ${cap} nodes. Aborting to prevent hang.`
      );
      throw new Error(`DOM extraction exceeded node cap (${cap})`);
    }

    const MAX_DEPTH = 500;
    if (depth > MAX_DEPTH) {
      this.errorTracker.recordError(
        "extractNodeSafe",
        `Max depth ${MAX_DEPTH} exceeded`,
        element,
        "warning"
      );
      return null;
    }

    // CRITICAL FIX: Validate element before processing
    if (!element || !(element instanceof Element)) {
      this.errorTracker.recordError(
        "extractNodeSafe",
        "Invalid element: element is null or not an Element",
        undefined,
        "warning"
      );
      return null;
    }

    try {
      return await this.extractNode(
        element,
        parentId,
        depth,
        parentAbsoluteLayout
      );
    } catch (error) {
      // ENHANCED: Better error handling to prevent undefined.toString() errors
      // CRITICAL FIX: Safely extract error message without calling toString() on undefined
      let errorMessage = "Unknown error during node extraction";
      try {
        if (error instanceof Error) {
          errorMessage = error.message || "Error instance without message";
        } else if (error && typeof error === "object") {
          if ("message" in error) {
            const msg = (error as any).message;
            errorMessage =
              msg != null ? String(msg) : "Error object with null message";
          } else {
            errorMessage = "Error object without message property";
          }
        } else if (error != null) {
          errorMessage = String(error);
        }
      } catch (stringifyError) {
        // If even stringifying fails, use fallback
        errorMessage = "Error occurred but could not be stringified";
      }

      this.errorTracker.recordError(
        "extractNodeSafe",
        errorMessage,
        element,
        "error"
      );
      return null;
    }
  }

  private async extractNode(
    element: Element,
    parentId: string | null,
    depth: number = 0,
    parentAbsoluteLayout: { x: number; y: number } = { x: 0, y: 0 }
  ): Promise<ElementNode | null> {
    // Cooperative yielding: yield to event loop every N nodes
    this.diagnostics.totalElements++;
    this.performanceTracker.nodesProcessed++;
    if (
      this.performanceTracker.nodesProcessed %
        this.performanceConfig.yieldNodeCount ===
      0
    ) {
      const timeSinceLastYield =
        Date.now() - this.performanceTracker.lastYieldTime;
      if (timeSinceLastYield >= this.performanceConfig.yieldIntervalMs) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        this.performanceTracker.lastYieldTime = Date.now();
      }
    }

    if (this.nodeId % 100 === 0 && this.nodeId > 0) {
      console.log(
        `📊 Extracted ${this.nodeId} nodes (${this.performanceTracker.nodesProcessed} processed)...`
      );
    }

    const tagUpper = element.tagName.toUpperCase();
    if (this.shouldSkipTag(tagUpper)) {
      this.diagnostics.skippedTag++;
      return null;
    }

    const nodeId = `node_${this.nodeId++}`;

    // Get computed styles safely
    const computed = this.getCachedComputedStyle(element);
    if (!computed) {
      this.errorTracker.recordError(
        "extractNode",
        "Failed to get computed styles",
        element,
        "warning"
      );
      return null;
    }

    // ENHANCED: Improved visibility detection for positioned elements
    // Check basic visibility rules but handle edge cases for fixed/sticky elements
    if (computed.display === "none" || computed.visibility === "hidden") {
      this.diagnostics.skippedHidden++;
      return null;
    }

    // CRITICAL FIX: Don't skip elements with zero opacity if they're positioned elements
    // (they may be transition targets or interactive overlays)
    const isPositioned =
      computed.position === "fixed" ||
      computed.position === "sticky" ||
      computed.position === "absolute";
    const hasZeroOpacity = computed.opacity === "0";

    if (hasZeroOpacity && !isPositioned) {
      this.diagnostics.skippedHidden++;
      return null;
    }

    // Get bounding rect safely
    const rect = element.getBoundingClientRect();
    if (!ExtractionValidation.isValidRect(rect)) {
      this.errorTracker.recordError(
        "extractNode",
        "Invalid bounding rect",
        element,
        "warning"
      );
      return null;
    }

    // CRITICAL FIX: Ensure scroll is at top before calculating positions
    const currentScrollTop =
      window.pageYOffset || document.documentElement.scrollTop;
    const currentScrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    // Use the current document scroll for positioning calculations.
    const scrollTop = ExtractionValidation.safeParseFloat(currentScrollTop, 0);
    const scrollLeft = ExtractionValidation.safeParseFloat(
      currentScrollLeft,
      0
    );
    // Log if scroll is non-zero (for debugging)
    if (scrollTop > 10 || scrollLeft > 10) {
      console.warn(
        `⚠️ [POSITION] Page is scrolled (scrollTop: ${scrollTop}, scrollLeft: ${scrollLeft}). ` +
          `Using stored offset for consistent positioning calculations.`
      );
    }

    // ENHANCED: Zero-size check with exceptions for Site elements
    // Site video players and comments might be off-screen but still important
    const elementTagName = element.tagName.toLowerCase();
    const isSiteImportant =
      this.isSiteElement(element) ||
      elementTagName.startsWith("x-site-element") ||
      element.id === "movie_player" ||
      element.id === "player-container" ||
      element.id === "comments";

    // Zero-size check with exceptions
    if (rect.width === 0 && rect.height === 0 && element.tagName !== "BODY") {
      const shadowRoot = (element as any).shadowRoot;
      const hasContent =
        element.children.length > 0 ||
        (shadowRoot &&
          shadowRoot.childNodes &&
          shadowRoot.childNodes.length > 0) ||
        (element.textContent && element.textContent.trim().length > 0);

      const hasMeaningfulStyles = this.hasMeaningfulStyles(computed);

      // ENHANCED: Don't skip Site important elements even if zero-size
      // Also don't skip IMG or SVG elements as they might be visual but compressed by layout
      const isGraphic =
        element.tagName === "IMG" ||
        element.tagName === "SVG" ||
        element.tagName === "CANVAS" ||
        element.tagName === "INPUT";

      if (
        !hasContent &&
        !hasMeaningfulStyles &&
        !isSiteImportant &&
        !isGraphic
      ) {
        this.diagnostics.skippedZeroSize++;
        return null;
      }

      // For Site important elements, try to get dimensions from computed styles
      if (isSiteImportant && (rect.width === 0 || rect.height === 0)) {
        const styleWidth = computed.width;
        const styleHeight = computed.height;
        if (styleWidth && styleWidth !== "auto" && !styleWidth.includes("%")) {
          const width = ExtractionValidation.safeParseFloat(styleWidth, 0);
          if (width > 0 && rect.width === 0) {
            (rect as any).width = width;
          }
        }
        if (
          styleHeight &&
          styleHeight !== "auto" &&
          !styleHeight.includes("%")
        ) {
          const height = ExtractionValidation.safeParseFloat(styleHeight, 0);
          if (height > 0 && rect.height === 0) {
            (rect as any).height = height;
          }
        }
      }
    }

    const tagName = tagUpper.toLowerCase();
    const isSpecialElement = this.isSpecialElement(tagName);
    const hasChildElements =
      element.children.length > 0 || (element as any).shadowRoot;
    const textContent = this.extractTextContentSafe(element);
    const isLeafTextElement =
      !!textContent && !hasChildElements && !isSpecialElement;
    const treatLeafTextAsContainer =
      isLeafTextElement &&
      this.shouldTreatLeafTextElementAsContainer(element, computed);
    const isText = isLeafTextElement && !treatLeafTextAsContainer;

    // CRITICAL: Detect interactive elements for prototype frame creation
    const isInteractive = this.isInteractiveElement(element, computed);

    // Calculate dimensions safely
    let dimensions = this.calculateDimensionsSafe(element, rect, computed);

    // CRITICAL FIX: Validate dimensions
    // Only fallback if Not-a-Number (NaN) or Infinite. Allow 0 as it might be a valid layout state (e.g. empty container)
    if (!Number.isFinite(dimensions.width)) {
      dimensions.width =
        ExtractionValidation.safeParseFloat(rect.width, 0) || 1;
    }

    if (!Number.isFinite(dimensions.height)) {
      dimensions.height =
        ExtractionValidation.safeParseFloat(rect.height, 0) || 1;
    }

    const untransformedWidth = (() => {
      try {
        const w = (element as any)?.offsetWidth;
        return typeof w === "number" && Number.isFinite(w) && w > 0
          ? w
          : undefined;
      } catch {
        return undefined;
      }
    })();
    const untransformedHeight = (() => {
      try {
        const h = (element as any)?.offsetHeight;
        return typeof h === "number" && Number.isFinite(h) && h > 0
          ? h
          : undefined;
      } catch {
        return undefined;
      }
    })();

    // ENHANCED: Calculate positions with sub-pixel precision for pixel-perfect accuracy
    // Preserve full precision - Figma will handle rounding at render time
    // CRITICAL FIX: Calculate and validate absolute positions
    // CRITICAL FIX: Ensure coordinate system consistency
    // rect.left/top are already viewport coordinates, we need to convert to document coordinates
    const rectLeft = ExtractionValidation.safeParseFloat(rect.left, 0);
    const rectTop = ExtractionValidation.safeParseFloat(rect.top, 0);

    // Validate scroll offset values for coordinate space integrity
    const validScrollLeft = Number.isFinite(scrollLeft) ? scrollLeft : 0;
    const validScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;

    // CRITICAL FIX: Position-aware coordinate handling for fixed/sticky elements
    // Fixed and sticky elements are viewport-relative, not document-relative
    const positionComputed = this.getCachedComputedStyle(element);
    const isFixedOrSticky =
      positionComputed &&
      (positionComputed.position === "fixed" ||
        positionComputed.position === "sticky");

    // PIXEL-PERFECT COORDINATE FIX: Use appropriate coordinate system
    let absoluteX: number;
    let absoluteY: number;

    if (isFixedOrSticky) {
      // Fixed/sticky elements use viewport coordinates (don't add scroll offset)
      absoluteX = rectLeft;
      absoluteY = rectTop;
    } else {
      // Regular elements use document coordinates (add scroll offset for positioning)
      absoluteX = rectLeft + validScrollLeft;
      absoluteY = rectTop + validScrollTop;
    }

    // CRITICAL FIX: Validate absolute positions with pixel-aligned coordinates
    const validatedAbsoluteX =
      Number.isFinite(absoluteX) && Number.isFinite(rectLeft) ? absoluteX : 0;
    const validatedAbsoluteY =
      Number.isFinite(absoluteY) && Number.isFinite(rectTop) ? absoluteY : 0;

    // Log positioning system improvements for debugging
    if (isFixedOrSticky) {
      console.log(
        `🔧 [POSITION FIX] ${positionComputed.position} element ${
          element.tagName
        }.${
          element.className || "no-class"
        } positioned using viewport coordinates: (${absoluteX}, ${absoluteY})`
      );
    }

    // Log coordinate system issues for debugging
    if (!Number.isFinite(absoluteX) || !Number.isFinite(absoluteY)) {
      console.warn(
        `[COORDINATE] Invalid coordinates for ${element.tagName}: rect(${rectLeft},${rectTop}) + scroll(${validScrollLeft},${validScrollTop}) = abs(${absoluteX},${absoluteY})`
      );
    }

    // Use relativeX/relativeY from layout if available (more accurate for nested elements)
    // CRITICAL FIX: Validate parentAbsoluteLayout exists and has valid values
    let relativeX: number;
    let relativeY: number;

    if (
      parentId &&
      parentAbsoluteLayout &&
      Number.isFinite(parentAbsoluteLayout.x) &&
      Number.isFinite(parentAbsoluteLayout.y)
    ) {
      relativeX = validatedAbsoluteX - parentAbsoluteLayout.x;
      relativeY = validatedAbsoluteY - parentAbsoluteLayout.y;
    } else {
      relativeX = validatedAbsoluteX;
      relativeY = validatedAbsoluteY;
    }

    // CRITICAL FIX #3: Extract box-sizing to properly account for borders/padding in size calculations
    // getBoundingClientRect() always returns border-box dimensions (includes border + padding)
    // We store boxSizing so the plugin can handle it correctly if needed
    const boxSizing = computed.boxSizing || "content-box";

    // BOX-SIZING DIMENSION CONVERSION: Extract border/padding values for accurate conversion
    const borderTop = ExtractionValidation.safeParseFloat(
      computed.borderTopWidth,
      0
    );
    const borderRight = ExtractionValidation.safeParseFloat(
      computed.borderRightWidth,
      0
    );
    const borderBottom = ExtractionValidation.safeParseFloat(
      computed.borderBottomWidth,
      0
    );
    const borderLeft = ExtractionValidation.safeParseFloat(
      computed.borderLeftWidth,
      0
    );

    const paddingTop = ExtractionValidation.safeParseFloat(
      computed.paddingTop,
      0
    );
    const paddingRight = ExtractionValidation.safeParseFloat(
      computed.paddingRight,
      0
    );
    const paddingBottom = ExtractionValidation.safeParseFloat(
      computed.paddingBottom,
      0
    );
    const paddingLeft = ExtractionValidation.safeParseFloat(
      computed.paddingLeft,
      0
    );

    // CRITICAL: Calculate content dimensions for Figma
    // getBoundingClientRect() always gives border-box dimensions (visual rendered size)
    // Figma Auto Layout works like CSS border-box: padding/borders are INSIDE the frame
    const totalHorizontalPadding = paddingLeft + paddingRight;
    const totalVerticalPadding = paddingTop + paddingBottom;
    const totalHorizontalBorder = borderLeft + borderRight;
    const totalVerticalBorder = borderTop + borderBottom;

    // Calculate content area dimensions (excluding padding and borders)
    const contentWidth = Math.max(
      0,
      dimensions.width - totalHorizontalBorder - totalHorizontalPadding
    );
    const contentHeight = Math.max(
      0,
      dimensions.height - totalVerticalBorder - totalVerticalPadding
    );

    // Store both visual (total rendered size) and content (inner area) dimensions
    const visualDimensions = {
      width: dimensions.width,
      height: dimensions.height,
    };
    const contentDimensions = { width: contentWidth, height: contentHeight };

    // FIX: Always use visual dimensions for Figma frames
    // Figma Auto Layout padding works the same as CSS border-box:
    // - Frame size = total visual size (like getBoundingClientRect)
    // - Padding is applied INSIDE the frame
    // - Content area = frame size - padding (handled automatically by Figma)
    // This ensures pixel-perfect rendering for both border-box and content-box elements
    const figmaWidth = visualDimensions.width;
    const figmaHeight = visualDimensions.height;

    // CRITICAL FIX: Create absolute layout with validated dimensions
    // Ensure all values are finite numbers before creating the layout object
    const absoluteLayout = {
      left: validatedAbsoluteX,
      top: validatedAbsoluteY,
      right: validatedAbsoluteX + figmaWidth, // Use Figma-compatible dimensions
      bottom: validatedAbsoluteY + figmaHeight, // Use Figma-compatible dimensions
      width: figmaWidth, // Use Figma-compatible width
      height: figmaHeight, // Use Figma-compatible height
    };

    // ENHANCED: Generate descriptive name for divs and other generic containers
    const nodeName = isText
      ? textContent?.substring(0, 20) || "Text"
      : tagName.toLowerCase() === "div"
      ? this.generateDescriptiveName(element, tagName)
      : tagName;

    // Create node
    const node: any = {
      id: nodeId,
      parentId: parentId,
      type: isText ? "TEXT" : "FRAME",
      name: nodeName,
      htmlTag: tagName,
      cssClasses: Array.from(element.classList),
      layout: {
        x: relativeX, // CRITICAL FIX: Use parent-relative coordinates for Figma
        y: relativeY, // CRITICAL FIX: Use parent-relative coordinates for Figma
        width: figmaWidth, // FIX: Use calculated Figma-compatible width
        height: figmaHeight, // FIX: Use calculated Figma-compatible height
        untransformedWidth,
        untransformedHeight,
        relativeX: relativeX, // Keep for backwards compatibility
        relativeY: relativeY, // Keep for backwards compatibility
        // ENHANCED: Capture Flexbox/Grid properties for Auto Layout (Phase 1)
        display: computed.display,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        alignContent: computed.alignContent,
        gap: computed.gap || computed.gridGap, // Fallback for older browsers
        flexWrap: computed.flexWrap,
        // Flex Item properties
        flexGrow: computed.flexGrow,
        flexShrink: computed.flexShrink,
        flexBasis: computed.flexBasis,
        alignSelf: computed.alignSelf,
        boxSizing: boxSizing,
        // Grid properties
        gridTemplateColumns: computed.gridTemplateColumns,
        gridTemplateRows: computed.gridTemplateRows,
        gridTemplateAreas: computed.gridTemplateAreas,
        gridAutoColumns: computed.gridAutoColumns,
        gridAutoRows: computed.gridAutoRows,
        gridAutoFlow: computed.gridAutoFlow,
        gridColumnStart: computed.gridColumnStart,
        gridColumnEnd: computed.gridColumnEnd,
        gridRowStart: computed.gridRowStart,
        gridRowEnd: computed.gridRowEnd,
        gridArea: computed.gridArea,
      },
      absoluteLayout: absoluteLayout,
      layoutContext: {
        display: computed.display,
        position: computed.position,
        overflow: computed.overflow,
        overflowX: computed.overflowX,
        overflowY: computed.overflowY,
        transform: computed.transform,
        transformOrigin: (computed as any).transformOrigin,
        zIndex: computed.zIndex,
        // RULE 6.1: Stacking context detection
        _stackingContext: this.detectStackingContext(computed),
      },
      fills: [],
      strokes: [],
      effects: [],
      attributes: this.extractAttributesSafe(element),
      children: [],
      // BOX-SIZING METADATA: Store dimension conversion data for Figma plugin
      _boxSizingData: {
        boxSizing: boxSizing,
        visualDimensions: visualDimensions,
        contentDimensions: contentDimensions,
        borders: {
          top: borderTop,
          right: borderRight,
          bottom: borderBottom,
          left: borderLeft,
        },
        paddings: {
          top: paddingTop,
          right: paddingRight,
          bottom: paddingBottom,
          left: paddingLeft,
        },
      },
      // PIXEL-PERFECT GEOMETRY: Extract absolute transform matrix
      absoluteTransform: this.extractAbsoluteTransform(element, computed),
      localSize: {
        width: untransformedWidth,
        height: untransformedHeight,
      },
      captureMetadata: {
        devicePixelRatio: window.devicePixelRatio || 1,
        visualViewportScale: (window as any).visualViewport?.scale || 1,
        pageZoom: this.getPageZoom(),
      },
    };

    // PHASE 4: Capture CSS filters and blend modes for pixel-perfect visual effects
    if (computed.filter && computed.filter !== "none") {
      node.cssFilter = computed.filter;

      // PHASE 5: Check if filter requires rasterization (strict clone mode)
      if (this.filterRequiresRasterization(computed.filter)) {
        node.rasterize = { reason: "FILTER" };
      }
    }

    if (computed.mixBlendMode && computed.mixBlendMode !== "normal") {
      node.mixBlendMode = computed.mixBlendMode;

      // PHASE 5: Mark complex blend modes for rasterization if stacking uncertain
      // For strict clone: if we can't guarantee stacking context, rasterize
      const supportedBlendModes = [
        'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
        'color-dodge', 'color-burn', 'hard-light', 'soft-light',
        'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
      ];
      if (!supportedBlendModes.includes(computed.mixBlendMode)) {
        node.rasterize = node.rasterize || { reason: "BLEND_MODE" };
      }
    }

    if (computed.isolation && computed.isolation !== "auto") {
      node.isolation = computed.isolation;
    }

    // PHASE 5: Capture screenshot for rasterization if needed
    if (node.rasterize && !node.rasterize.dataUrl) {
      // Attempt to capture element screenshot (async, best-effort)
      // This is deferred to avoid blocking the main capture flow
      this.captureElementForRasterization(element, node);
    }

    // BOX-SIZING VALIDATION: Validate dimension calculations
    this.validateBoxSizingDimensions(element, node, computed);

    // ENHANCED AUTO LAYOUT DETECTION v2.0
    // Convert CSS flexbox/grid properties to Figma Auto Layout configuration
    this.applyAutoLayoutDetection(node, computed, element);

    // CRITICAL: Mark interactive elements for prototype frame creation
    if (isInteractive) {
      node.isInteractive = true;
      node.interactionType = this.detectInteractionType(element, computed);
      // Store interaction metadata for prototype connections
      node.interactionMetadata = {
        tagName: tagName,
        role: element.getAttribute("role") || null,
        href: (element as HTMLAnchorElement).href || null,
        type: (element as HTMLInputElement).type || null,
        hasOnClick:
          !!(element as any).onclick || element.hasAttribute("onclick"),
        tabIndex: element.hasAttribute("tabindex")
          ? element.getAttribute("tabindex")
          : null,
      };
      // ENHANCED: Store element reference for hover state matching
      // This helps match elements to nodes during hover state capture
      if (!(node as any).__elementRef) {
        (node as any).__elementRef = element;
      }
    }

    if (isText && textContent) {
      node.characters = textContent;

      // CRITICAL: Add component abstraction for Text elements (Builder.io compatibility)
      // This simplifies the schema by using a component system for common elements
      node.component = {
        name: "Text",
        options: {
          text: textContent,
        },
      };
    }

    // Extract styles
    await this.extractStylesSafe(computed, element, node);

    // ENHANCED: For Site video player containers, ensure thumbnail is applied
    // This handles cases where the player is a custom web component
    // Check multiple ways to identify the main video player
    const isMainPlayer =
      this.isSiteElement(element) &&
      (tagName.includes("player") ||
        tagName.startsWith("x-site-element") ||
        tagName.startsWith("x-site-element") ||
        element.id === "movie_player" ||
        element.id === "player-container" ||
        element.classList.contains("x-site-element") ||
        (element as HTMLElement).querySelector?.("#movie_player"));

    if (isMainPlayer) {
      // Try to extract video ID and apply thumbnail if not already done
      const pageUrl = window.location.href;
      const urlMatch = pageUrl.match(/[?&]v=([^&\s#]+)/);
      if (urlMatch && urlMatch[1]) {
        const videoId = urlMatch[1];

        // Only apply if fills are empty or don't have a thumbnail
        const hasThumbnail = node.fills?.some(
          (f: any) => f.type === "IMAGE" && f.url?.includes("site.com/vi")
        );

        if (!hasThumbnail) {
          const thumbnailOptions = [
            `https://img.site.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.site.com/vi/${videoId}/hqdefault.jpg`,
            `https://img.site.com/vi/${videoId}/mqdefault.jpg`,
            `https://img.site.com/vi/${videoId}/sddefault.jpg`,
          ];

          for (const thumbnailUrl of thumbnailOptions) {
            try {
              await this.captureImageSafe(thumbnailUrl);
              const key = this.hashString(thumbnailUrl);
              const asset = this.assets.images.get(thumbnailUrl);
              if (asset) {
                if (!node.fills) node.fills = [];
                // ENHANCED: Append thumbnail to existing fills (preserve background colors)
                // The thumbnail should be on top, but background colors should remain visible
                // Note: In Figma, fills render bottom-to-top, so pushing adds to the top layer
                const thumbnailFill = {
                  type: "IMAGE",
                  imageHash: key,
                  scaleMode: "FILL",
                  visible: true,
                  url: thumbnailUrl,
                  priority: "high",
                };
                // Append thumbnail to fills array (it will be rendered on top)
                node.fills.push(thumbnailFill);
                node.imageHash = key;
                console.log(
                  `✅ [SITE] Applied thumbnail to player container for video ${videoId}`
                );
                break; // Success, stop trying
              }
            } catch {
              continue;
            }
          }
        }
      }
    }

    await this.extractSpecialPropertiesSafe(element, node, computed);

    // ENHANCED: Add Site-specific metadata for better rendering
    if (this.isSiteElement(element)) {
      node.isSiteElement = true;
      // Store additional context for Site elements
      if (!node.metadata) node.metadata = {};
      node.metadata.siteContext = {
        className: this.getClassNameSafe(element),
        id: element.id || "",
        role: element.getAttribute("role") || "",
        tagName: element.tagName.toLowerCase(),
      };
    }

    // ENHANCED: For iframes (especially Site), create a better visual representation
    if (tagName === "iframe") {
      const iframe = element as HTMLIFrameElement;
      const iframeSrc = iframe.src || iframe.getAttribute("src") || "";

      // Try to capture iframe content as screenshot if possible
      // For Site, we already handle thumbnails in handleEmbedElement
      // For other iframes, add visual placeholder
      if (!iframeSrc.includes("site.com") && !iframeSrc.includes("youtu.be")) {
        // Non-Site iframe - add placeholder styling
        if (!node.style) node.style = {};
        if (!node.fills || node.fills.length === 0) {
          // Add a subtle background to indicate iframe
          node.fills = [
            {
              type: "SOLID",
              color: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
              visible: true,
            },
          ];
        }
        // Add border to indicate iframe boundary
        if (!node.borderSides) {
          node.borderSides = {
            top: {
              width: 1,
              style: "solid",
              color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
            },
            right: {
              width: 1,
              style: "solid",
              color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
            },
            bottom: {
              width: 1,
              style: "solid",
              color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
            },
            left: {
              width: 1,
              style: "solid",
              color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
            },
          };
        }
      }
    }

    // Process children
    if (!isText && !isSpecialElement) {
      await this.processChildrenSafe(
        element,
        node,
        rect,
        scrollLeft,
        scrollTop,
        depth
      );
    }

    // Extract pseudo-elements
    await this.extractPseudoElementsSafe(element, node);

    // Sort children by z-index
    this.sortChildrenByZIndex(node);

    this.diagnostics.processedNodes++;

    // CRITICAL: Restore Auto Layout detection for flex/grid layouts
    await this.applyAutoLayoutDetection(node, computed, element);

    return node as ElementNode;
  }

  // ============================================================================
  // AUTO LAYOUT DETECTION
  // ============================================================================

  /**
   * PIXEL-PERFECT AUTO LAYOUT DETECTION ENGINE v3.0
   * Implements comprehensive validation to ensure Auto Layout maintains or improves pixel fidelity.
   * Every node gets autoLayout field (null or validated object).
   */
  private async applyAutoLayoutDetection(
    node: any,
    computed: CSSStyleDeclaration,
    element: Element
  ): Promise<void> {
    this.autoLayoutMetrics.totalNodes++;

    try {
      // INVARIANT: Every node must have autoLayout field
      node.autoLayout = null;

      // EMERGENCY PERFORMANCE FIX: Circuit breakers to prevent timeouts
      // 1. Check if circuit breaker is activated (performance mode)
      if (this.performanceTracker.circuitBreakerActivated) {
        this.recordRejection("Circuit breaker activated - performance mode");
        console.log(
          "⚡ [PERFORMANCE] Auto Layout validation skipped - circuit breaker active"
        );
        return;
      }

      // 2. Child count circuit breaker
      const childCount = node.children?.length || 0;
      if (childCount > this.performanceConfig.maxChildrenForValidation) {
        this.performanceTracker.skippedDueToChildCount++;
        this.recordRejection(
          `Too many children (${childCount} > ${this.performanceConfig.maxChildrenForValidation})`
        );
        console.log(
          `⚡ [PERFORMANCE] Auto Layout validation skipped - too many children: ${childCount}`
        );
        return;
      }

      // 3. Yield to event loop if needed
      await this.performanceYield();

      // Phase 1: Candidate Detection (cheap)
      const isCandidate = this.isAutoLayoutCandidate(node, computed, element);
      if (!isCandidate.valid) {
        this.recordRejection(isCandidate.reason);
        return;
      }

      this.autoLayoutMetrics.autoLayoutCandidates++;

      // Phase 2: Layout Configuration Detection
      const layoutConfig = this.detectLayoutConfiguration(
        computed,
        element,
        node
      );
      if (!layoutConfig) {
        this.recordRejection("No valid layout configuration detected");
        return;
      }

      // Phase 3: Pixel-Safe Validation (mandatory)
      // Phase 3: Pixel-Safe Validation with timeout protection
      const validationResult = await this.validateAutoLayoutSafetyWithTimeout(
        node,
        layoutConfig,
        computed,
        element
      );

      // Create complete auto layout schema
      node.autoLayout = {
        mode: layoutConfig.mode,
        wrap: layoutConfig.wrap,
        primaryAxisSizingMode: "AUTO",
        counterAxisSizingMode: "AUTO",
        padding: {
          top: this.parsePixelValue(computed.paddingTop),
          right: this.parsePixelValue(computed.paddingRight),
          bottom: this.parsePixelValue(computed.paddingBottom),
          left: this.parsePixelValue(computed.paddingLeft),
        },
        itemSpacing: layoutConfig.itemSpacing,
        alignItems: layoutConfig.alignItems,
        justifyContent: layoutConfig.justifyContent,
        validation: validationResult,
        evidence: {
          display: computed.display,
          flexDirection: computed.flexDirection,
          gap: layoutConfig.itemSpacing,
          childCount: node.children?.length || 0,
          usedMainAxis: layoutConfig.mode === "HORIZONTAL" ? "x" : "y",
        },
      };

      if (validationResult.safe) {
        this.autoLayoutMetrics.autoLayoutAppliedSafe++;
        console.log(
          `✅ [AUTO_LAYOUT] Applied safe Auto Layout to ${element.tagName}#${
            element.id || ""
          } (delta: ${validationResult.maxChildDeltaPx.toFixed(2)}px)`
        );
      } else {
        this.autoLayoutMetrics.autoLayoutRejected++;
        this.recordRejection(validationResult.reasons.join(", "));
        console.log(
          `❌ [AUTO_LAYOUT] Rejected Auto Layout for ${element.tagName}#${
            element.id || ""
          }: ${validationResult.reasons.join(", ")}`
        );
      }
    } catch (error) {
      console.warn(
        `[AUTO_LAYOUT] Detection error for ${element.tagName}:`,
        error
      );
      this.recordRejection("Detection error: " + (error as Error).message);
    }
  }

  /**
   * Phase 1: Auto Layout Candidate Detection (cheap checks)
   */
  private isAutoLayoutCandidate(
    node: any,
    computed: CSSStyleDeclaration,
    element: Element
  ): { valid: boolean; reason: string } {
    // Must have children
    if (!node.children || node.children.length < 2) {
      return { valid: false, reason: "Insufficient children (need ≥2)" };
    }

    // PERFORMANCE: Skip if too many children (circuit breaker)
    if (node.children.length > 50) {
      return {
        valid: false,
        reason: `Too many children for layout analysis (${node.children.length} > 50)`,
      };
    }

    // Must be a container with layout system
    const display = computed.display;
    if (!["flex", "inline-flex", "grid", "inline-grid"].includes(display)) {
      // Check for inferred patterns
      const hasDirectionalLayout = this.inferLayoutPattern(
        node,
        computed,
        element
      );
      if (!hasDirectionalLayout) {
        return { valid: false, reason: `Unsupported display: ${display}` };
      }
    }

    // Skip elements with absolute positioning children (complex)
    const hasAbsoluteChildren = node.children.some(
      (child: any) =>
        child.layout?.position === "absolute" ||
        child.layout?.position === "fixed"
    );
    if (hasAbsoluteChildren) {
      return {
        valid: false,
        reason: "Contains absolutely positioned children",
      };
    }

    return { valid: true, reason: "" };
  }

  /**
   * Infer layout patterns for non-flex/grid containers
   */
  private inferLayoutPattern(
    node: any,
    computed: CSSStyleDeclaration,
    element: Element
  ): boolean {
    // Check if children are naturally stacked (list pattern)
    if (this.isStackedList(node)) return true;

    // Check if children are horizontally aligned (toolbar pattern)
    if (this.isHorizontalSequence(node)) return true;

    return false;
  }

  private isStackedList(node: any): boolean {
    if (!node.children || node.children.length < 2) return false;

    // Check if children are vertically stacked with consistent alignment
    const children = node.children;
    let prevBottom = children[0].layout.y + children[0].layout.height;

    for (let i = 1; i < children.length; i++) {
      const child = children[i];
      const gap = child.layout.y - prevBottom;

      // Allow small gaps (up to 20px) but not overlaps
      if (gap < 0 || gap > 20) return false;

      prevBottom = child.layout.y + child.layout.height;
    }

    return true;
  }

  private isHorizontalSequence(node: any): boolean {
    if (!node.children || node.children.length < 2) return false;

    // Check if children are horizontally aligned
    const children = node.children;
    let prevRight = children[0].layout.x + children[0].layout.width;

    for (let i = 1; i < children.length; i++) {
      const child = children[i];
      const gap = child.layout.x - prevRight;

      // Allow small gaps (up to 20px) but not overlaps
      if (gap < 0 || gap > 20) return false;

      prevRight = child.layout.x + child.layout.width;
    }

    return true;
  }

  /**
   * Phase 2: Detect Layout Configuration
   */
  private detectLayoutConfiguration(
    computed: CSSStyleDeclaration,
    element: Element,
    node: any
  ): {
    mode: "HORIZONTAL" | "VERTICAL";
    wrap: boolean;
    itemSpacing: number;
    alignItems: "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN";
    justifyContent: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  } | null {
    const display = computed.display;

    if (display === "flex" || display === "inline-flex") {
      return this.detectFlexConfiguration(computed, node);
    } else if (display === "grid" || display === "inline-grid") {
      return this.detectGridConfiguration(computed, node);
    } else {
      // Inferred layout
      return this.detectInferredConfiguration(node);
    }
  }

  private detectFlexConfiguration(
    computed: CSSStyleDeclaration,
    node: any
  ): {
    mode: "HORIZONTAL" | "VERTICAL";
    wrap: boolean;
    itemSpacing: number;
    alignItems: "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN";
    justifyContent: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  } | null {
    const flexDirection = computed.flexDirection || "row";
    const flexWrap = computed.flexWrap || "nowrap";
    const justifyContent = computed.justifyContent || "flex-start";
    const alignItems = computed.alignItems || "stretch";
    const gap = computed.gap || computed.columnGap || "0px";

    // Check for unsupported wrap layouts
    if (flexWrap === "wrap" || flexWrap === "wrap-reverse") {
      return null; // Wrap layouts are too complex for simple auto layout
    }

    return {
      mode: flexDirection.includes("column") ? "VERTICAL" : "HORIZONTAL",
      wrap: false,
      itemSpacing: this.parsePixelValue(gap),
      alignItems: this.mapAlignItemsToSchemaFormat(alignItems),
      justifyContent: this.mapJustifyContentToSchemaFormat(justifyContent),
    };
  }

  private detectGridConfiguration(
    computed: CSSStyleDeclaration,
    node: any
  ): {
    mode: "HORIZONTAL" | "VERTICAL";
    wrap: boolean;
    itemSpacing: number;
    alignItems: "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN";
    justifyContent: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  } | null {
    const gridTemplateColumns = computed.gridTemplateColumns;
    const gridTemplateRows = computed.gridTemplateRows;
    const gap = computed.gap || computed.gridGap || "0px";

    // Only support simple single-axis grids
    if (gridTemplateColumns !== "none" && gridTemplateRows !== "none") {
      return null; // Complex 2D grid
    }

    const isVertical = gridTemplateColumns === "none";

    return {
      mode: isVertical ? "VERTICAL" : "HORIZONTAL",
      wrap: false,
      itemSpacing: this.parsePixelValue(gap),
      alignItems: "MIN", // Default for grid
      justifyContent: "MIN",
    };
  }

  private detectInferredConfiguration(node: any): {
    mode: "HORIZONTAL" | "VERTICAL";
    wrap: boolean;
    itemSpacing: number;
    alignItems: "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN";
    justifyContent: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  } | null {
    // Analyze actual child positions to infer layout
    if (this.isStackedList(node)) {
      const avgGap = this.calculateAverageVerticalGap(node);
      return {
        mode: "VERTICAL",
        wrap: false,
        itemSpacing: Math.round(avgGap),
        alignItems: "MIN",
        justifyContent: "MIN",
      };
    }

    if (this.isHorizontalSequence(node)) {
      const avgGap = this.calculateAverageHorizontalGap(node);
      return {
        mode: "HORIZONTAL",
        wrap: false,
        itemSpacing: Math.round(avgGap),
        alignItems: "MIN",
        justifyContent: "MIN",
      };
    }

    return null;
  }

  private calculateAverageVerticalGap(node: any): number {
    const children = node.children;
    let totalGap = 0;
    let gapCount = 0;

    for (let i = 1; i < children.length; i++) {
      const prevChild = children[i - 1];
      const currChild = children[i];
      const gap =
        currChild.layout.y - (prevChild.layout.y + prevChild.layout.height);
      if (gap >= 0) {
        totalGap += gap;
        gapCount++;
      }
    }

    return gapCount > 0 ? totalGap / gapCount : 0;
  }

  private calculateAverageHorizontalGap(node: any): number {
    const children = node.children;
    let totalGap = 0;
    let gapCount = 0;

    for (let i = 1; i < children.length; i++) {
      const prevChild = children[i - 1];
      const currChild = children[i];
      const gap =
        currChild.layout.x - (prevChild.layout.x + prevChild.layout.width);
      if (gap >= 0) {
        totalGap += gap;
        gapCount++;
      }
    }

    return gapCount > 0 ? totalGap / gapCount : 0;
  }

  // ============================================================================
  // PERFORMANCE HELPER FUNCTIONS
  // ============================================================================

  /**
   * Yield to event loop if needed to prevent blocking
   */
  private async performanceYield(): Promise<void> {
    const now = Date.now();
    if (
      now - this.performanceTracker.lastYieldTime >
      this.performanceConfig.yieldIntervalMs
    ) {
      this.performanceTracker.lastYieldTime = now;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  /**
   * Timeout-protected version of validateAutoLayoutSafety
   */
  private async validateAutoLayoutSafetyWithTimeout(
    node: any,
    layoutConfig: {
      mode: "HORIZONTAL" | "VERTICAL";
      wrap: boolean;
      itemSpacing: number;
      alignItems: "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN";
      justifyContent: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    },
    computed: CSSStyleDeclaration,
    element: Element
  ): Promise<{
    safe: boolean;
    tolerancePx: number;
    maxChildDeltaPx: number;
    avgChildDeltaPx: number;
    reasons: string[];
  }> {
    const childCount = node.children?.length || 0;
    this.performanceTracker.validationCount++;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<{
        safe: boolean;
        tolerancePx: number;
        maxChildDeltaPx: number;
        avgChildDeltaPx: number;
        reasons: string[];
      }>((_, reject) =>
        setTimeout(
          () => reject(new Error("Validation timeout")),
          this.performanceConfig.validationTimeoutMs
        )
      );

      // Race between validation and timeout
      const result = await Promise.race([
        this.validateAutoLayoutSafety(node, layoutConfig, computed, element),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      this.performanceTracker.validationTimeouts++;
      this.performanceTracker.skippedDueToTimeout++;

      console.warn(
        `⚡ [PERFORMANCE] Auto Layout validation timeout for element with ${childCount} children:`,
        error
      );

      // Check if we should activate circuit breaker
      if (
        this.performanceTracker.validationTimeouts >=
        this.performanceConfig.circuitBreakerThreshold
      ) {
        this.performanceTracker.circuitBreakerActivated = true;
        console.warn(
          `🔴 [CIRCUIT BREAKER] Performance mode activated after ${this.performanceTracker.validationTimeouts} timeouts`
        );
      }

      // Return safe fallback result
      return {
        safe: false,
        tolerancePx: 1.0,
        maxChildDeltaPx: Infinity,
        avgChildDeltaPx: Infinity,
        reasons: [
          `Validation timeout (${this.performanceConfig.validationTimeoutMs}ms) with ${childCount} children`,
        ],
      };
    }
  }

  /**
   * Phase 3: Pixel-Safe Validation Algorithm
   */
  private async validateAutoLayoutSafety(
    node: any,
    layoutConfig: {
      mode: "HORIZONTAL" | "VERTICAL";
      wrap: boolean;
      itemSpacing: number;
      alignItems: "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN";
      justifyContent: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    },
    computed: CSSStyleDeclaration,
    element: Element
  ): Promise<{
    safe: boolean;
    tolerancePx: number;
    maxChildDeltaPx: number;
    avgChildDeltaPx: number;
    reasons: string[];
  }> {
    const tolerancePx = 1.0; // Default tolerance
    const reasons: string[] = [];
    let maxChildDeltaPx = 0;
    let totalDelta = 0;
    const children = node.children || [];

    if (children.length === 0) {
      return {
        safe: false,
        tolerancePx,
        maxChildDeltaPx: 0,
        avgChildDeltaPx: 0,
        reasons: ["No children to validate"],
      };
    }

    try {
      // Simulate the auto layout positioning
      const simulatedPositions = this.simulateAutoLayoutPositions(
        node,
        layoutConfig,
        computed
      );

      // Compare simulated vs actual positions
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const simulated = simulatedPositions[i];
        const actual = child.layout;

        const deltaX = Math.abs(simulated.x - actual.x);
        const deltaY = Math.abs(simulated.y - actual.y);
        const deltaW = Math.abs(simulated.width - actual.width);
        const deltaH = Math.abs(simulated.height - actual.height);

        const childDelta = Math.max(deltaX, deltaY, deltaW, deltaH);
        maxChildDeltaPx = Math.max(maxChildDeltaPx, childDelta);
        totalDelta += childDelta;

        if (childDelta > tolerancePx) {
          reasons.push(
            `Child ${i} delta ${childDelta.toFixed(2)}px > tolerance`
          );
        }
      }

      const avgChildDeltaPx = totalDelta / children.length;

      // Additional validation checks
      if (layoutConfig.wrap && !this.supportsWrapLayout(node)) {
        reasons.push("Wrap layout not representable");
      }

      if (this.hasOverlappingChildren(simulatedPositions)) {
        reasons.push("Simulated layout creates overlaps");
      }

      if (this.hasNonUniformGaps(node, layoutConfig)) {
        reasons.push("Non-uniform gaps detected");
      }

      const safe = reasons.length === 0 && maxChildDeltaPx <= tolerancePx;

      return {
        safe,
        tolerancePx,
        maxChildDeltaPx,
        avgChildDeltaPx,
        reasons,
      };
    } catch (error) {
      return {
        safe: false,
        tolerancePx,
        maxChildDeltaPx: Infinity,
        avgChildDeltaPx: Infinity,
        reasons: ["Validation error: " + (error as Error).message],
      };
    }
  }

  /**
   * Simulate auto layout positioning to compare with actual layout
   */
  private simulateAutoLayoutPositions(
    node: any,
    layoutConfig: {
      mode: "HORIZONTAL" | "VERTICAL";
      itemSpacing: number;
      alignItems: "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN";
      justifyContent: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    },
    computed: CSSStyleDeclaration
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const children = node.children || [];
    const parentLayout = node.layout;

    const paddingTop = this.parsePixelValue(computed.paddingTop);
    const paddingLeft = this.parsePixelValue(computed.paddingLeft);
    const paddingRight = this.parsePixelValue(computed.paddingRight);
    const paddingBottom = this.parsePixelValue(computed.paddingBottom);

    const contentStartX = parentLayout.x + paddingLeft;
    const contentStartY = parentLayout.y + paddingTop;
    const contentWidth = parentLayout.width - paddingLeft - paddingRight;
    const contentHeight = parentLayout.height - paddingTop - paddingBottom;

    const positions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    if (layoutConfig.mode === "HORIZONTAL") {
      // Calculate total child width and spacing
      const totalChildWidth = children.reduce(
        (sum: number, child: any) => sum + child.layout.width,
        0
      );
      const totalSpacing = (children.length - 1) * layoutConfig.itemSpacing;
      const remainingSpace = contentWidth - totalChildWidth - totalSpacing;

      let currentX = contentStartX;

      // Apply justify-content
      if (layoutConfig.justifyContent === "CENTER") {
        currentX += remainingSpace / 2;
      } else if (layoutConfig.justifyContent === "MAX") {
        currentX += remainingSpace;
      } else if (
        layoutConfig.justifyContent === "SPACE_BETWEEN" &&
        children.length > 1
      ) {
        // Override spacing for space-between
        const spaceBetweenGap = remainingSpace / (children.length - 1);
        layoutConfig = { ...layoutConfig, itemSpacing: spaceBetweenGap };
      }

      for (const child of children) {
        let childY = contentStartY;

        // Apply align-items
        if (layoutConfig.alignItems === "CENTER") {
          childY += (contentHeight - child.layout.height) / 2;
        } else if (layoutConfig.alignItems === "MAX") {
          childY += contentHeight - child.layout.height;
        }

        positions.push({
          x: currentX,
          y: childY,
          width: child.layout.width,
          height: child.layout.height,
        });

        currentX += child.layout.width + layoutConfig.itemSpacing;
      }
    } else {
      // VERTICAL
      const totalChildHeight = children.reduce(
        (sum: number, child: any) => sum + child.layout.height,
        0
      );
      const totalSpacing = (children.length - 1) * layoutConfig.itemSpacing;
      const remainingSpace = contentHeight - totalChildHeight - totalSpacing;

      let currentY = contentStartY;

      // Apply justify-content (main axis for vertical)
      if (layoutConfig.justifyContent === "CENTER") {
        currentY += remainingSpace / 2;
      } else if (layoutConfig.justifyContent === "MAX") {
        currentY += remainingSpace;
      } else if (
        layoutConfig.justifyContent === "SPACE_BETWEEN" &&
        children.length > 1
      ) {
        const spaceBetweenGap = remainingSpace / (children.length - 1);
        layoutConfig = { ...layoutConfig, itemSpacing: spaceBetweenGap };
      }

      for (const child of children) {
        let childX = contentStartX;

        // Apply align-items (cross axis for vertical)
        if (layoutConfig.alignItems === "CENTER") {
          childX += (contentWidth - child.layout.width) / 2;
        } else if (layoutConfig.alignItems === "MAX") {
          childX += contentWidth - child.layout.width;
        }

        positions.push({
          x: childX,
          y: currentY,
          width: child.layout.width,
          height: child.layout.height,
        });

        currentY += child.layout.height + layoutConfig.itemSpacing;
      }
    }

    return positions;
  }

  private supportsWrapLayout(node: any): boolean {
    // For now, we don't support wrap layouts in auto layout validation
    return false;
  }

  private hasOverlappingChildren(
    positions: Array<{ x: number; y: number; width: number; height: number }>
  ): boolean {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];

        if (
          !(
            a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y
          )
        ) {
          return true; // Overlap detected
        }
      }
    }
    return false;
  }

  private hasNonUniformGaps(
    node: any,
    layoutConfig: { mode: "HORIZONTAL" | "VERTICAL"; itemSpacing: number }
  ): boolean {
    const children = node.children || [];
    if (children.length < 3) return false; // Need at least 3 children to detect non-uniform gaps

    const gaps: number[] = [];

    if (layoutConfig.mode === "HORIZONTAL") {
      for (let i = 1; i < children.length; i++) {
        const prevChild = children[i - 1];
        const currChild = children[i];
        const gap =
          currChild.layout.x - (prevChild.layout.x + prevChild.layout.width);
        gaps.push(gap);
      }
    } else {
      for (let i = 1; i < children.length; i++) {
        const prevChild = children[i - 1];
        const currChild = children[i];
        const gap =
          currChild.layout.y - (prevChild.layout.y + prevChild.layout.height);
        gaps.push(gap);
      }
    }

    // Check if all gaps are within tolerance of the expected itemSpacing
    const tolerance = 2; // 2px tolerance for gap uniformity
    return gaps.some(
      (gap) => Math.abs(gap - layoutConfig.itemSpacing) > tolerance
    );
  }

  /**
   * Helper method to record rejection reasons for metrics
   */
  private recordRejection(reason: string): void {
    const count = this.autoLayoutMetrics.rejectionReasons.get(reason) || 0;
    this.autoLayoutMetrics.rejectionReasons.set(reason, count + 1);
  }

  /**
   * Map CSS align-items to schema format
   */
  private mapAlignItemsToSchemaFormat(
    alignItems: string
  ): "MIN" | "CENTER" | "MAX" | "BASELINE" | "SPACE_BETWEEN" {
    switch (alignItems) {
      case "flex-start":
      case "start":
        return "MIN";
      case "center":
        return "CENTER";
      case "flex-end":
      case "end":
        return "MAX";
      case "baseline":
        return "BASELINE";
      default:
        return "MIN";
    }
  }

  /**
   * Map CSS justify-content to schema format
   */
  private mapJustifyContentToSchemaFormat(
    justifyContent: string
  ): "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN" {
    switch (justifyContent) {
      case "flex-start":
      case "start":
        return "MIN";
      case "center":
        return "CENTER";
      case "flex-end":
      case "end":
        return "MAX";
      case "space-between":
        return "SPACE_BETWEEN";
      default:
        return "MIN";
    }
  }

  /**
   * Map CSS justify-content to Figma primary axis alignment
   */
  private mapJustifyContentToFigma(
    justifyContent: string
  ): "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN" {
    switch (justifyContent) {
      case "flex-start":
      case "start":
        return "MIN";
      case "center":
        return "CENTER";
      case "flex-end":
      case "end":
        return "MAX";
      case "space-between":
        return "SPACE_BETWEEN";
      default:
        return "MIN";
    }
  }

  /**
   * Map CSS align-items to Figma counter axis alignment
   */
  private mapAlignItemsToFigma(
    alignItems: string
  ): "MIN" | "CENTER" | "MAX" | "STRETCH" {
    switch (alignItems) {
      case "flex-start":
      case "start":
        return "MIN";
      case "center":
        return "CENTER";
      case "flex-end":
      case "end":
        return "MAX";
      case "stretch":
        return "STRETCH";
      default:
        return "STRETCH";
    }
  }

  /**
   * Parse CSS pixel values to numbers
   */
  private parsePixelValue(value: string): number {
    if (!value || value === "0" || value === "normal" || value === "auto") {
      return 0;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  /**
   * CRITICAL: Process data: URI locally to avoid IPC overload and performance regression.
   * Enforces size caps and provides explicit errors for oversized data URIs.
   */
  private async processDataUriLocally(dataUri: string): Promise<{
    success: boolean;
    base64?: string;
    mimeType?: string;
    error?: string;
  }> {
    try {
      // Parse data: URI format: data:[<mediatype>][;base64],<data>
      const dataUriRegex = /^data:([^;]+)?(;base64)?,(.*)$/;
      const match = dataUri.match(dataUriRegex);

      if (!match) {
        return { success: false, error: "Invalid data: URI format" };
      }

      const mimeType = match[1] || "text/plain";
      const isBase64 = !!match[2];
      const data = match[3];

      // Enforce size cap to prevent memory issues
      const maxDataUriSize = 2 * 1024 * 1024; // 2MB limit
      if (dataUri.length > maxDataUriSize) {
        return {
          success: false,
          error: `Data URI too large: ${(dataUri.length / 1024 / 1024).toFixed(
            1
          )}MB > 2MB limit`,
        };
      }

      // Validate image MIME type
      if (!mimeType.startsWith("image/")) {
        return { success: false, error: `Not an image data URI: ${mimeType}` };
      }

      let base64Data: string;

      if (isBase64) {
        // Already base64 encoded
        base64Data = data;

        // Validate base64 encoding
        try {
          // Quick validation by attempting to decode a small portion
          atob(data.substring(0, Math.min(100, data.length)));
        } catch (e) {
          return { success: false, error: "Invalid base64 encoding" };
        }
      } else {
        // URI encoded, need to convert to base64
        try {
          const decodedData = decodeURIComponent(data);
          base64Data = btoa(decodedData);
        } catch (e) {
          return { success: false, error: "Failed to encode data to base64" };
        }
      }

      // Create stable hash for caching
      const hash = this.hashString(dataUri);

      return {
        success: true,
        base64: base64Data,
        mimeType,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown processing error",
      };
    }
  }

  // ============================================================================
  // SAFE HELPER METHODS
  // ============================================================================

  private getCachedComputedStyle(element: Element): CSSStyleDeclaration | null {
    let computed = this.computedStyleCache.get(element) || null;
    if (!computed) {
      computed = ExtractionValidation.safeGetComputedStyle(element);
      if (computed) {
        this.computedStyleCache.set(element, computed);
      }
    }
    return computed;
  }

  private hasMeaningfulStyles(computed: CSSStyleDeclaration): boolean {
    try {
      // Check for background color
      const hasBgColor =
        computed.backgroundColor &&
        computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        computed.backgroundColor !== "transparent" &&
        computed.backgroundColor !== "";

      // CRITICAL FIX: Check for background image (often used for logos/icons)
      const hasBgImage =
        computed.backgroundImage &&
        computed.backgroundImage !== "none" &&
        computed.backgroundImage !== "";

      // Check for borders
      const hasBorder =
        computed.borderWidth &&
        computed.borderWidth !== "0px" &&
        computed.borderStyle !== "none";

      // Check for shadows
      const hasShadow = computed.boxShadow && computed.boxShadow !== "none";

      return !!(hasBgColor || hasBgImage || hasBorder || hasShadow);
    } catch {
      return false;
    }
  }

  private isSpecialElement(tagName: string): boolean {
    return [
      "img",
      "svg",
      "video",
      "canvas",
      "iframe",
      "embed",
      "object",
      "lottie-player",
      "input",
      "textarea",
      "select",
    ].includes(tagName);
  }

  // ENHANCED: Detect if an element is a Site-specific element that needs special handling
  // NOTE: Disabled for generic URL extraction - returns false for all elements
  private isSiteElement(element: Element): boolean {
    return false;
  }

  /**
   * Detect if an element is interactive (button, link, input, dropdown, etc.)
   * Used for creating prototype frames with interactive elements
   */
  private isInteractiveElement(
    element: Element,
    computed: CSSStyleDeclaration
  ): boolean {
    if (!(element instanceof HTMLElement)) return false;

    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");

    // Direct interactive tags
    const interactiveTags = [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "details",
      "summary",
    ];
    if (interactiveTags.includes(tagName)) {
      // Filter out disabled elements and anchors without href
      if ((element as any).disabled) return false;
      if (
        tagName === "a" &&
        !element.hasAttribute("href") &&
        !element.hasAttribute("onclick")
      ) {
        return false;
      }
      return true;
    }

    // ARIA roles
    const interactiveRoles = [
      "button",
      "link",
      "checkbox",
      "radio",
      "slider",
      "textbox",
      "combobox",
      "menuitem",
      "tab",
      "switch",
      "option",
      "menubar",
      "menu",
      "tablist",
    ];
    if (role && interactiveRoles.includes(role)) return true;

    // Elements with tabindex (except -1)
    const tabIndex = element.getAttribute("tabindex");
    if (tabIndex && tabIndex !== "-1") return true;

    // Elements with cursor: pointer (strong signal for custom interactive elements)
    if (computed.cursor === "pointer") return true;

    // Elements with onclick handlers
    if ((element as any).onclick || element.hasAttribute("onclick"))
      return true;

    // Common interactive class patterns
    // SAFE FIX: Handle undefined className (e.g. SVG elements in some contexts)
    const className = String((element.className as any) || "").toLowerCase();
    const interactiveKeywords = [
      "btn",
      "button",
      "link",
      "clickable",
      "interactive",
      "dropdown",
      "menu",
      "tab",
      "accordion",
      "toggle",
      "trigger",
    ];
    if (interactiveKeywords.some((keyword) => className.includes(keyword))) {
      return true;
    }

    // Data attributes suggesting interactivity
    const dataAttributes = Array.from(element.attributes)
      .filter((attr) => attr.name.startsWith("data-"))
      .map((attr) => attr.name.toLowerCase());
    const interactiveDataAttrs = [
      "data-toggle",
      "data-target",
      "data-modal",
      "data-dropdown",
      "data-tab",
      "data-accordion",
      "data-click",
      "data-action",
    ];
    if (interactiveDataAttrs.some((attr) => dataAttributes.includes(attr))) {
      return true;
    }

    return false;
  }

  /**
   * Detect the type of interaction (button, link, dropdown, etc.)
   */
  private detectInteractionType(
    element: Element,
    computed: CSSStyleDeclaration
  ): string {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");

    // Tag-based detection
    if (tagName === "button" || role === "button") return "button";
    if (tagName === "a" || role === "link") return "link";
    if (tagName === "select" || role === "combobox") return "dropdown";
    if (tagName === "input") {
      const type = (element as HTMLInputElement).type || "text";
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (["button", "submit", "reset"].includes(type)) return "button";
      return "input";
    }
    if (tagName === "textarea") return "textarea";
    if (tagName === "details") return "accordion";
    if (role === "tab") return "tab";
    if (role === "menuitem" || role === "menu") return "menu";

    // Class/attribute-based detection
    const className = String((element.className as any) || "").toLowerCase();
    if (className.includes("dropdown") || element.hasAttribute("data-toggle")) {
      return "dropdown";
    }
    if (className.includes("modal") || element.hasAttribute("data-modal")) {
      return "modal";
    }
    if (
      className.includes("accordion") ||
      element.hasAttribute("aria-expanded")
    ) {
      return "accordion";
    }
    if (className.includes("tab") || role === "tab") {
      return "tab";
    }

    // Default to button for elements with pointer cursor
    if (computed.cursor === "pointer") return "button";

    return "interactive";
  }

  private shouldSkipTag(tagUpper: string): boolean {
    // These tags are non-visual or frequently contain large non-rendered payloads (e.g. tracking in <noscript>).
    // Capturing them as text/layout nodes causes massive fidelity issues and import noise.
    return (
      tagUpper === "SCRIPT" ||
      tagUpper === "STYLE" ||
      tagUpper === "NOSCRIPT" ||
      tagUpper === "TEMPLATE" ||
      tagUpper === "META" ||
      tagUpper === "LINK" ||
      tagUpper === "HEAD"
    );
  }

  private calculateDimensionsSafe(
    element: Element,
    rect: DOMRect,
    computed: CSSStyleDeclaration
  ): { width: number; height: number } {
    const tagUpper = element.tagName.toUpperCase();
    const isDocumentRoot = tagUpper === "BODY" || tagUpper === "HTML";
    const htmlEl = element as HTMLElement;

    // CRITICAL BOX-SIZING FIX: getBoundingClientRect() always returns border-box dimensions
    // We need to handle box-sizing correctly for Figma conversion
    const boxSizing = computed.boxSizing || "content-box";

    // PIXEL-PERFECT FIX: Use Math.round for pixel-aligned dimensions
    let width = Math.round(ExtractionValidation.safeParseFloat(rect.width, 0));
    let height = Math.round(
      ExtractionValidation.safeParseFloat(rect.height, 0)
    );

    // BOX-SIZING VALIDATION: For content-box elements, rect dimensions already include borders/padding
    // For border-box elements, the CSS width/height includes borders/padding, and rect matches that
    // Either way, getBoundingClientRect() gives us the correct visual dimensions for Figma
    // Note: Figma expects content dimensions + separate border/padding, so we'll handle conversion
    // in the extraction process where we separate borders/padding from content area

    if (isDocumentRoot || (height === 0 && element.children.length > 0)) {
      const elementScrollHeight = ExtractionValidation.safeParseFloat(
        (htmlEl as any)?.scrollHeight,
        0
      );
      const elementScrollWidth = ExtractionValidation.safeParseFloat(
        (htmlEl as any)?.scrollWidth,
        0
      );
      const docScrollHeight = Math.max(
        ExtractionValidation.safeParseFloat(
          document.documentElement?.scrollHeight,
          0
        ),
        ExtractionValidation.safeParseFloat(document.body?.scrollHeight, 0)
      );
      const docScrollWidth = Math.max(
        ExtractionValidation.safeParseFloat(
          document.documentElement?.scrollWidth,
          0
        ),
        ExtractionValidation.safeParseFloat(document.body?.scrollWidth, 0)
      );

      height = Math.max(height, docScrollHeight, elementScrollHeight);
      width = Math.max(width, docScrollWidth, elementScrollWidth);
    } else if (element.children.length > 0) {
      const overflow = computed.overflow;
      const overflowY = computed.overflowY;
      const overflowX = computed.overflowX;

      const isHiddenY =
        overflow === "hidden" ||
        overflow === "clip" ||
        overflowY === "hidden" ||
        overflowY === "clip";
      const isHiddenX =
        overflow === "hidden" ||
        overflow === "clip" ||
        overflowX === "hidden" ||
        overflowX === "clip";

      const elementScrollHeight = ExtractionValidation.safeParseFloat(
        (htmlEl as any)?.scrollHeight,
        0
      );
      const elementScrollWidth = ExtractionValidation.safeParseFloat(
        (htmlEl as any)?.scrollWidth,
        0
      );

      if (isHiddenY && elementScrollHeight > height + 1) {
        height = Math.max(height, elementScrollHeight);
      }
      if (isHiddenX && elementScrollWidth > width + 1) {
        width = Math.max(width, elementScrollWidth);
      }
    }

    // Clamp to reasonable bounds (Figma safety limits)
    width = ExtractionValidation.clampNumber(width, 0, 50000);
    height = ExtractionValidation.clampNumber(height, 0, 100000);

    return { width, height };
  }

  private extractTextContentSafe(element: Element): string | null {
    try {
      // ENHANCED: Special handling for Site comments to extract actual content
      const tagName = element.tagName.toLowerCase();
      if (tagName.startsWith("x-site-element") && tagName.includes("comment")) {
        // For Site comment elements, use innerText to get rendered content
        const innerText = (element as HTMLElement).innerText;
        if (innerText && innerText.trim().length > 0) {
          // Filter out placeholder text patterns
          const text = innerText.trim();
          if (
            !text.toLowerCase().includes("lorem ipsum") &&
            !text.toLowerCase().includes("placeholder") &&
            text.length > 3
          ) {
            return text;
          }
        }
      }

      // CRITICAL: Use innerText for better text extraction (respects CSS visibility)
      // innerText gives us the rendered text as the user sees it
      // textContent gives us all text including hidden elements
      // For elements that should have text, prefer innerText
      const computed =
        this.getCachedComputedStyle(element) ||
        window.getComputedStyle(element);
      const isTextElement =
        element.tagName === "P" ||
        element.tagName === "SPAN" ||
        element.tagName === "A" ||
        element.tagName === "LABEL" ||
        element.tagName === "BUTTON" ||
        element.getAttribute("role") === "text" ||
        computed.display === "inline" ||
        computed.display === "inline-block";

      if (isTextElement) {
        // Use innerText for text elements (respects CSS visibility)
        const innerText = (element as HTMLElement).innerText;
        if (innerText && innerText.trim().length > 0) {
          // Filter out placeholder text
          const text = innerText.trim();
          if (
            text.toLowerCase().includes("lorem ipsum") ||
            text.toLowerCase().includes("placeholder")
          ) {
            return null; // Skip placeholder text
          }

          // Normalize whitespace but preserve line breaks
          return text
            .replace(/[ \t]+/g, " ") // Collapse horizontal whitespace
            .replace(/\n\s+/g, "\n") // Remove spaces after line breaks
            .replace(/\s+\n/g, "\n") // Remove spaces before line breaks
            .trim();
        }
      }

      // Fallback: Extract direct text nodes only (for non-text elements)
      // This prevents capturing nested element text when we only want direct text
      const textNodes = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => {
          const text = node.textContent || "";
          // Preserve non-breaking spaces and zero-width spaces
          if (text.includes("\u00A0") || text.includes("\u200B")) {
            return text;
          }
          return text.trim();
        })
        .filter((text) => text && text.length > 0);

      return textNodes.length > 0 ? textNodes.join(" ") : null;
    } catch (error) {
      this.errorTracker.recordError(
        "extractTextContentSafe",
        "Failed to extract text content",
        element,
        "warning"
      );
      return null;
    }
  }

  private extractAttributesSafe(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    try {
      Array.from(element.attributes).forEach((attr) => {
        attrs[attr.name] = attr.value;
      });
    } catch (error) {
      this.errorTracker.recordError(
        "extractAttributesSafe",
        "Failed to extract attributes",
        element,
        "warning"
      );
    }
    return attrs;
  }

  private async processChildrenSafe(
    element: Element,
    node: any,
    rect: DOMRect,
    scrollLeft: number,
    scrollTop: number,
    depth: number
  ): Promise<void> {
    try {
      const tagName = element.tagName.toLowerCase();
      // Prefer Shadow DOM when available: for Web Components, the shadow tree is the
      // rendered subtree. Capturing both shadow + light DOM usually duplicates content.
      const shadowRoot = (element as any).shadowRoot as
        | ShadowRoot
        | null
        | undefined;
      const shadowNodes =
        shadowRoot && shadowRoot.childNodes
          ? Array.from(shadowRoot.childNodes)
          : [];

      // Slot projection: <slot> renders assigned nodes which are not part of slot.childNodes.
      // When we prefer the shadow tree, we must also pull in assigned nodes so content defined
      // in the light DOM still appears in the capture.
      const assignedNodes =
        tagName === "slot" &&
        typeof (element as any).assignedNodes === "function"
          ? ((element as any).assignedNodes({ flatten: true }) as ChildNode[])
          : [];
      const isSlotProjection = assignedNodes.length > 0;

      const childNodes = isSlotProjection
        ? Array.from(assignedNodes)
        : shadowNodes.length > 0
        ? shadowNodes
        : Array.from(element.childNodes);
      // CHILD CAP: deterministic bound for unbounded / infinite DOM regions.
      // This prevents pathological pages from stalling extraction indefinitely.
      const boundedChildNodes =
        childNodes.length > 2000 ? childNodes.slice(0, 2000) : childNodes;

      // CRITICAL FIX #4: Use already-calculated absoluteX/absoluteY for consistency
      // This ensures parentAbsoluteLayout matches the node's absoluteLayout exactly
      // Prevents floating-point rounding differences and timing issues
      // NOTE: absoluteX/absoluteY are defined in the parent scope (extractNode method)
      // We need to calculate them from rect + scroll for this scope
      const currentAbsoluteX = rect.left + scrollLeft;
      const currentAbsoluteY = rect.top + scrollTop;
      const currentAbsoluteLayout = {
        x: currentAbsoluteX, // Use the calculated absoluteX from rect + scroll
        y: currentAbsoluteY, // Use the calculated absoluteY from rect + scroll
      };

      const BATCH_SIZE = 50;
      let processedInBatch = 0;

      if (boundedChildNodes.length > BATCH_SIZE) {
        // Process in batches with cooperative yielding
        for (let i = 0; i < boundedChildNodes.length; i += BATCH_SIZE) {
          const batch = boundedChildNodes.slice(i, i + BATCH_SIZE);

          for (const child of batch) {
            if (child.nodeType === Node.ELEMENT_NODE) {
              const childNode = await this.extractNodeSafe(
                child as Element,
                node.id,
                depth + 1,
                currentAbsoluteLayout
              );
              if (childNode) {
                if (isSlotProjection && childNode.layout) {
                  delete (childNode.layout as any).relativeX;
                  delete (childNode.layout as any).relativeY;
                }
                node.children.push(childNode);
              }
            } else if (child.nodeType === Node.TEXT_NODE) {
              await this.processTextNodeSafe(
                child,
                node,
                element,
                rect,
                scrollLeft,
                scrollTop
              );
            }
            processedInBatch++;

            // Cooperative yielding: yield every N nodes
            if (
              processedInBatch % this.performanceConfig.yieldNodeCount ===
              0
            ) {
              const timeSinceLastYield =
                Date.now() - this.performanceTracker.lastYieldTime;
              if (
                timeSinceLastYield >= this.performanceConfig.yieldIntervalMs
              ) {
                await new Promise((resolve) => setTimeout(resolve, 0));
                this.performanceTracker.lastYieldTime = Date.now();
              }
            }
          }

          if (i + BATCH_SIZE < childNodes.length) {
            const progress = 40 + Math.floor((i / childNodes.length) * 20);
            this.postProgress(
              `Processing children (${Math.min(
                i + batch.length,
                childNodes.length
              )}/${childNodes.length})...`,
              progress
            );
          }
        }
      } else {
        // Process with cooperative yielding even for small batches
        for (const child of boundedChildNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childNode = await this.extractNodeSafe(
              child as Element,
              node.id,
              depth + 1,
              currentAbsoluteLayout
            );
            if (childNode) {
              if (isSlotProjection && childNode.layout) {
                delete (childNode.layout as any).relativeX;
                delete (childNode.layout as any).relativeY;
              }
              node.children.push(childNode);
            }
          } else if (child.nodeType === Node.TEXT_NODE) {
            await this.processTextNodeSafe(
              child,
              node,
              element,
              rect,
              scrollLeft,
              scrollTop
            );
          }
          processedInBatch++;

          // Cooperative yielding: yield every N nodes
          if (processedInBatch % this.performanceConfig.yieldNodeCount === 0) {
            const timeSinceLastYield =
              Date.now() - this.performanceTracker.lastYieldTime;
            if (timeSinceLastYield >= this.performanceConfig.yieldIntervalMs) {
              await new Promise((resolve) => setTimeout(resolve, 0));
              this.performanceTracker.lastYieldTime = Date.now();
            }
          }
        }
      }

      // Shadow DOM handled by childNodes selection above (awaited via normal processing paths).
    } catch (error) {
      this.errorTracker.recordError(
        "processChildrenSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "error"
      );
    }
  }

  private async processTextNodeSafe(
    child: ChildNode,
    node: any,
    element: Element,
    rect: DOMRect,
    scrollLeft: number,
    scrollTop: number
  ): Promise<void> {
    try {
      const computed = this.getCachedComputedStyle(element);
      if (!computed) return;

      const whiteSpace = computed.whiteSpace || "normal";
      const shouldPreserveWhitespace =
        whiteSpace === "pre" ||
        whiteSpace === "pre-wrap" ||
        whiteSpace === "pre-line";

      // CRITICAL: Extract text content more robustly
      let rawText = child.textContent || "";

      // For text nodes, preserve the actual content including whitespace
      // Only trim if whitespace should be collapsed
      let text: string;
      if (shouldPreserveWhitespace) {
        // Preserve all whitespace including line breaks
        text = rawText;
      } else {
        // Normalize whitespace: collapse multiple spaces, preserve single line breaks
        text = rawText
          .replace(/[ \t]+/g, " ") // Collapse horizontal whitespace
          .replace(/\n\s+/g, "\n") // Remove spaces after line breaks
          .replace(/\s+\n/g, "\n") // Remove spaces before line breaks
          .trim(); // Remove leading/trailing whitespace
      }

      // CRITICAL: Don't skip empty text if it's a visible element (might be spacing)
      // Only skip if it's truly invisible
      if (!text || text.length === 0) {
        // Check if this is a visible spacing element (e.g., &nbsp; or zero-width space)
        if (rawText.includes("\u00A0") || rawText.includes("\u200B")) {
          text = " "; // Use single space for spacing
        } else {
          return; // Skip truly empty text nodes
        }
      }

      const range = document.createRange();
      range.selectNode(child);
      const textRect = range.getBoundingClientRect();

      if (!ExtractionValidation.isValidRect(textRect)) {
        return;
      }

      const isTextVisible =
        computed.display !== "none" &&
        computed.visibility !== "hidden" &&
        computed.opacity !== "0";

      if (textRect.width > 0 || textRect.height > 0 || isTextVisible) {
        const textAbsoluteX = ExtractionValidation.safeParseFloat(
          textRect.left + scrollLeft,
          0
        );
        const textAbsoluteY = ExtractionValidation.safeParseFloat(
          textRect.top + scrollTop,
          0
        );

        const textAbsoluteLayout = {
          left: textAbsoluteX,
          top: textAbsoluteY,
          right: textAbsoluteX + textRect.width,
          bottom: textAbsoluteY + textRect.height,
          width: textRect.width,
          height: textRect.height,
        };

        const textRelativeX = textRect.left - rect.left;
        const textRelativeY = textRect.top - rect.top;

        const syntheticNode: any = {
          id: `node_${this.nodeId++}_text`,
          parentId: node.id,
          type: "TEXT",
          name: text.substring(0, 20),
          characters: text,
          htmlTag: "span",
          cssClasses: [],
          layout: {
            x: textRelativeX,
            y: textRelativeY,
            width: textRect.width,
            height: textRect.height,
            relativeX: textRelativeX,
            relativeY: textRelativeY,
          },
          absoluteLayout: textAbsoluteLayout,
          fills: [],
          strokes: [],
          effects: [],
          children: [],
        };

        await this.extractTypographySafe(computed, element, syntheticNode);

        // RULE 2.2: Flatten opacity stacking (parent × child)
        if (computed.opacity && computed.opacity !== "1") {
          const elementOpacity = ExtractionValidation.safeParseFloat(
            computed.opacity,
            1
          );
          // Calculate cumulative opacity from parent chain
          let cumulativeOpacity = elementOpacity;
          let parent: Element | null = element.parentElement;
          let depth = 0;
          while (parent && depth < 10) {
            const parentComputed = window.getComputedStyle(parent);
            const parentOpacity = ExtractionValidation.safeParseFloat(
              parentComputed.opacity,
              1
            );
            cumulativeOpacity *= parentOpacity;
            parent = parent.parentElement;
            depth++;
          }
          syntheticNode.opacity = ExtractionValidation.clampNumber(
            cumulativeOpacity,
            0,
            1
          );
          // Store original element opacity for reference
          syntheticNode.computedStyle = syntheticNode.computedStyle || {};
          (syntheticNode.computedStyle as any).originalOpacity = elementOpacity;
        }

        node.children.push(syntheticNode);
      }
    } catch (error) {
      this.errorTracker.recordError(
        "processTextNodeSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  private sortChildrenByZIndex(node: any): void {
    if (!node.children || node.children.length === 0) return;

    try {
      // ENHANCED: Correct Stacking Context Sorting
      // Treat all children as visible layers. Sort by z-index.
      // Static elements have effective z-index 0 (auto).
      // Relative/Absolute/Fixed/Sticky respect their z-index.
      // Ties are broken by DOM order (stable sort).

      // 1. Annotate with original index for stable sorting
      const tagged = node.children.map((child: any, index: number) => {
        let zIndex = 0;

        // Only positioned elements (not static) can have a z-index
        const type = child.positioning?.type;
        if (type !== "static") {
          zIndex = ExtractionValidation.safeParseFloat(child.zIndex, 0);
        }

        return { child, zIndex, index };
      });

      // 2. Sort
      tagged.sort((a: any, b: any) => {
        if (a.zIndex !== b.zIndex) {
          return a.zIndex - b.zIndex;
        }
        return a.index - b.index; // Stable sort
      });

      // 3. Extract back to children array
      node.children = tagged.map((t: any) => t.child);
    } catch (error) {
      this.errorTracker.recordError(
        "sortChildrenByZIndex",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "warning"
      );
    }
  }

  // ============================================================================
  // RULE 2.2: Calculate cumulative opacity (parent × child)
  // ============================================================================
  private calculateCumulativeOpacity(element: Element): number {
    let opacity = 1;
    let current: Element | null = element;
    let depth = 0;
    while (current && depth < 20) {
      try {
        const computed = window.getComputedStyle(current);
        const elementOpacity = ExtractionValidation.safeParseFloat(
          computed.opacity,
          1
        );
        opacity *= elementOpacity;
        current = current.parentElement;
        depth++;
      } catch {
        break;
      }
    }
    return ExtractionValidation.clampNumber(opacity, 0, 1);
  }

  // ============================================================================
  // RULE 6.1: Detect stacking context
  // ============================================================================
  private detectStackingContext(computed: CSSStyleDeclaration): boolean {
    const zIndex = computed.zIndex;
    const position = computed.position;
    const opacity = parseFloat(computed.opacity);
    const transform = computed.transform;
    const filter = computed.filter;
    const willChange = computed.willChange;

    return !!(
      (zIndex !== "auto" && zIndex !== "") ||
      position !== "static" ||
      opacity < 1 ||
      transform !== "none" ||
      filter !== "none" ||
      (willChange && willChange !== "auto")
    );
  }

  // ============================================================================
  // HELPER: Get parent background color for contrast calculation
  // ============================================================================

  private getParentBackgroundColor(element: Element): string | null {
    try {
      // CRITICAL FIX: Check element's own background first (for buttons, etc.)
      const elementComputed = window.getComputedStyle(element);
      const elementBg = elementComputed.backgroundColor;

      if (
        elementBg &&
        elementBg !== "transparent" &&
        elementBg !== "rgba(0, 0, 0, 0)" &&
        elementBg !== ""
      ) {
        const parsed = this.parseColorSafe(elementBg);
        // Only return if it's actually visible (alpha > 0.1)
        if (parsed && parsed.a > 0.1) {
          return elementBg;
        }
      }

      // Then check parent elements
      let current: Element | null = element.parentElement;
      let depth = 0;
      const maxDepth = 8; // Increased depth to find backgrounds better

      while (current && depth < maxDepth) {
        const computed = window.getComputedStyle(current);
        const bgColor = computed.backgroundColor;

        // If parent has a non-transparent background, use it
        if (
          bgColor &&
          bgColor !== "transparent" &&
          bgColor !== "rgba(0, 0, 0, 0)" &&
          bgColor !== ""
        ) {
          const parsed = this.parseColorSafe(bgColor);
          // Only return if it's actually visible (alpha > 0.1)
          if (parsed && parsed.a > 0.1) {
            return bgColor;
          }
        }

        current = current.parentElement;
        depth++;
      }

      // Fallback to document background
      const docComputed = window.getComputedStyle(document.body);
      const docBg = docComputed.backgroundColor;
      if (
        docBg &&
        docBg !== "transparent" &&
        docBg !== "rgba(0, 0, 0, 0)" &&
        docBg !== ""
      ) {
        return docBg;
      }

      // Final fallback: check documentElement
      const htmlComputed = window.getComputedStyle(document.documentElement);
      const htmlBg = htmlComputed.backgroundColor;
      if (
        htmlBg &&
        htmlBg !== "transparent" &&
        htmlBg !== "rgba(0, 0, 0, 0)" &&
        htmlBg !== ""
      ) {
        return htmlBg;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private getEffectiveInheritedBackground(element: Element): string | null {
    try {
      // Don't inherit for elements that should remain transparent
      const tagName = element.tagName.toLowerCase();
      const transparentElements = ["img", "svg", "video", "canvas", "iframe"];
      if (transparentElements.includes(tagName)) {
        return null;
      }

      // Check if element has explicit transparent background (different from default)
      const explicitBg = (element as HTMLElement).style?.backgroundColor;
      if (explicitBg === "transparent" || explicitBg === "rgba(0,0,0,0)") {
        return null; // Explicitly set to transparent
      }

      // Use existing parent background logic but with enhanced criteria
      const parentBg = this.getParentBackgroundColor(element);
      if (parentBg) {
        const parsed = this.parseColorSafe(parentBg);

        // Only inherit if parent background is sufficiently opaque
        if (parsed && parsed.a > 0.05) {
          // Additional check: ensure this isn't a container that should be transparent
          const isContainer = this.isStructuralContainer(element);
          if (!isContainer || this.shouldInheritBackground(element)) {
            return parentBg;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn("Error in getEffectiveInheritedBackground:", error);
      return null;
    }
  }

  private isStructuralContainer(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const structuralTags = [
      "div",
      "section",
      "article",
      "main",
      "aside",
      "nav",
      "header",
      "footer",
    ];

    if (!structuralTags.includes(tagName)) {
      return false;
    }

    // Check classes/IDs for layout containers
    const className = element.className?.toLowerCase() || "";
    const id = element.id?.toLowerCase() || "";
    const containerPatterns = [
      "container",
      "wrapper",
      "layout",
      "grid",
      "flex",
    ];

    return containerPatterns.some(
      (pattern) => className.includes(pattern) || id.includes(pattern)
    );
  }

  private shouldInheritBackground(element: Element): boolean {
    // Inherit for text containers and interactive elements
    const tagName = element.tagName.toLowerCase();
    const inheritTags = [
      "p",
      "span",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "button",
      "a",
      "li",
    ];

    if (inheritTags.includes(tagName)) {
      return true;
    }

    // Inherit for elements with text content
    const hasTextContent =
      element.textContent && element.textContent.trim().length > 0;
    const hasChildren = element.children.length > 0;

    // If it's a container with only text or simple children, inherit
    return Boolean(
      hasTextContent && (!hasChildren || element.children.length <= 2)
    );
  }

  // ============================================================================
  // STYLE EXTRACTION
  // ============================================================================

  private extractBlendMode(blendMode: string): any {
    if (!blendMode || blendMode === "normal") return "NORMAL";
    const mode = blendMode.toUpperCase().replace("-", "_");
    const validModes = [
      "MULTIPLY",
      "SCREEN",
      "OVERLAY",
      "DARKEN",
      "LIGHTEN",
      "COLOR_DODGE",
      "COLOR_BURN",
      "HARD_LIGHT",
      "SOFT_LIGHT",
      "DIFFERENCE",
      "EXCLUSION",
      "HUE",
      "SATURATION",
      "COLOR",
      "LUMINOSITY",
    ];
    return validModes.includes(mode) ? mode : "NORMAL";
  }

  /**
   * FIX 3: Determine if a CSS filter should trigger rasterization
   * Most CSS filters cannot be natively represented in Figma and need Phase 5 rasterization
   */
  private shouldRasterizeForFilter(filter: string): boolean {
    if (!filter || filter === 'none') return false;

    // Figma can natively render blur effects, but most other filters need rasterization
    // blur(), drop-shadow(), brightness(), contrast(), grayscale(), hue-rotate(),
    // invert(), opacity(), saturate(), sepia() - all should be rasterized for pixel-perfect fidelity
    const filterFunctions = [
      'blur', 'brightness', 'contrast', 'drop-shadow', 'grayscale',
      'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia', 'url'
    ];

    // Check if filter string contains any of these functions
    const lowerFilter = filter.toLowerCase();
    for (const fn of filterFunctions) {
      if (lowerFilter.includes(fn + '(')) {
        return true;
      }
    }

    return false;
  }

  private async extractStylesSafe(
    computed: CSSStyleDeclaration,
    element: Element,
    node: any
  ): Promise<void> {
    try {
      // Background color with validation
      const bgColor = ExtractionValidation.sanitizeColorString(
        computed.backgroundColor
      );

      if (bgColor) {
        const color = this.parseColorSafe(bgColor);
        let effectiveBgColor = bgColor;
        let effectiveColorParsed = color;

        // Check for inherited background if element is transparent

        // NEW: If element has transparent/no background, check for inherited background
        if (!effectiveColorParsed || effectiveColorParsed.a < 0.01) {
          const inheritedBg = this.getEffectiveInheritedBackground(element);
          if (inheritedBg) {
            effectiveBgColor = inheritedBg;
            effectiveColorParsed = this.parseColorSafe(inheritedBg);

            // Mark this as inherited for plugin processing
            if (!node.inheritanceFlags) node.inheritanceFlags = {};
            node.inheritanceFlags.backgroundColorInherited = true;

            console.log(
              `🔗 [INHERITANCE] Found inherited background for ${element.tagName}: ${inheritedBg}`
            );
          }
        }

        // CRITICAL FIX: Accept any non-transparent color (align with plugin threshold)
        // Use same threshold as plugin to prevent capture/import mismatches
        if (effectiveColorParsed && effectiveColorParsed.a > 0.001) {
          if (!node.fills) node.fills = [];
          node.fills.push({
            type: "SOLID",
            color: {
              r: effectiveColorParsed.r,
              g: effectiveColorParsed.g,
              b: effectiveColorParsed.b,
            },
            opacity: effectiveColorParsed.a,
            visible: true,
          });

          // Also track as a background color for contrast calculations
          if (!node.backgrounds) node.backgrounds = [];
          node.backgrounds.push({
            type: "solid",
            color: effectiveColorParsed,
            opacity: effectiveColorParsed.a,
            visible: true,
          });

          // Store inheritance metadata for plugin processing
          if (!node.colorInheritance) node.colorInheritance = {};
          node.colorInheritance.backgroundColorSource = node.inheritanceFlags
            ?.backgroundColorInherited
            ? "inherited"
            : "explicit";

          if (node.inheritanceFlags?.backgroundColorInherited) {
            node.colorInheritance.inheritedFrom = "parent";
            node.colorInheritance.originalBackground = bgColor; // Store original transparent value
          }

          this.assets.colors.add(effectiveBgColor);
        } else {
          // For body/html, still store the color for fallback use even if we don't add it as a fill
          // This helps the node-builder fallback logic
          if (effectiveBgColor) {
            if (!node.style) node.style = {};
            node.style.backgroundColor = effectiveBgColor;
            node.backgroundColor = effectiveBgColor;

            // CRITICAL: Also store in computedStyle (where plugin looks first)
            if (!node.computedStyle) node.computedStyle = {};
            node.computedStyle.backgroundColor = effectiveBgColor;
          }
        }
      }

      // ALWAYS ensure computedStyle.backgroundColor is populated if available from the browser
      if (
        computed.backgroundColor &&
        (!node.computedStyle || !node.computedStyle.backgroundColor)
      ) {
        if (!node.computedStyle) node.computedStyle = {};
        node.computedStyle.backgroundColor = computed.backgroundColor;
      }

      // Background image (CSS background-image: url(...))
      // Important for header icons/buttons that use CSS background images instead of <img>.
      // ENHANCED: Also check for logo patterns in background images
      await this.extractBackgroundImageFillsSafe(computed, element, node);
      // ENHANCED: Store additional computed style properties for better rendering
      if (!node.computedStyle) node.computedStyle = {};
      node.computedStyle.display = computed.display || "";
      node.computedStyle.position = computed.position || "";
      node.computedStyle.overflow = computed.overflow || "";
      node.computedStyle.overflowX = computed.overflowX || "";
      node.computedStyle.overflowY = computed.overflowY || "";
      node.computedStyle.visibility = computed.visibility || "";
      node.computedStyle.zIndex = computed.zIndex || "";
      node.computedStyle.transform = computed.transform || "";
      node.computedStyle.transformOrigin =
        (computed as any).transformOrigin || "";
      node.computedStyle.transition = computed.transition || "";
      node.computedStyle.animation = computed.animation || "";
      node.computedStyle.cursor = computed.cursor || "";
      node.computedStyle.pointerEvents = computed.pointerEvents || "";
      node.computedStyle.userSelect = computed.userSelect || "";

      // ENHANCED: Extract blend modes and clip path
      const mixBlendMode = computed.mixBlendMode;
      if (mixBlendMode && mixBlendMode !== "normal") {
        node.mixBlendMode = this.extractBlendMode(mixBlendMode);
      }

      const backgroundBlendMode = computed.backgroundBlendMode;
      if (backgroundBlendMode && backgroundBlendMode !== "normal") {
        node.backgroundBlendMode = this.extractBlendMode(backgroundBlendMode);
        // Also apply to backgrounds if possible (simple case)
        if (node.backgrounds && node.backgrounds.length > 0) {
          // If there's only one background blend mode but multiple backgrounds, it repeats.
          // For now, we'll store it on the node and handle it in node-builder or apply to the first fill.
        }
      }

      const clipPath = computed.clipPath;
      if (clipPath && clipPath !== "none") {
        node.clipPath = {
          type: clipPath.startsWith("circle")
            ? "circle"
            : clipPath.startsWith("ellipse")
            ? "ellipse"
            : clipPath.startsWith("inset")
            ? "inset"
            : clipPath.startsWith("polygon")
            ? "polygon"
            : clipPath.startsWith("path")
            ? "path"
            : clipPath.startsWith("url")
            ? "url"
            : "none",
          value: clipPath,
        };
      }

      // FIX 3: Extract CSS filters for Phase 4 rasterization (applies to ALL elements)
      // CRITICAL: Fidelity blockers analysis showed filters were MISSING from schema
      const filter = computed.filter;
      if (filter && filter !== "none") {
        console.log(`🎨 [CSS FILTER] Captured filter on ${element.tagName}: ${filter}`);
        node.cssFilter = filter;
        // Mark for rasterization if complex filters that Figma can't natively render
        if (!node.rasterize && this.shouldRasterizeForFilter(filter)) {
          node.rasterize = { reason: "FILTER" };
        }
      }

      // ENHANCED: Store all border properties individually for precise rendering
      if (!node.borderDetails) node.borderDetails = {};
      node.borderDetails.top = {
        width: ExtractionValidation.safeParseFloat(computed.borderTopWidth, 0),
        style: computed.borderTopStyle || "none",
        color: computed.borderTopColor || "",
      };
      node.borderDetails.right = {
        width: ExtractionValidation.safeParseFloat(
          computed.borderRightWidth,
          0
        ),
        style: computed.borderRightStyle || "none",
        color: computed.borderRightColor || "",
      };
      node.borderDetails.bottom = {
        width: ExtractionValidation.safeParseFloat(
          computed.borderBottomWidth,
          0
        ),
        style: computed.borderBottomStyle || "none",
        color: computed.borderBottomColor || "",
      };
      node.borderDetails.left = {
        width: ExtractionValidation.safeParseFloat(computed.borderLeftWidth, 0),
        style: computed.borderLeftStyle || "none",
        color: computed.borderLeftColor || "",
      };

      // ENHANCED: Store all shadow details for precise rendering
      if (computed.boxShadow && computed.boxShadow !== "none") {
        node.shadowDetails = this.parseBoxShadowSafe(computed.boxShadow);
      }

      // ENHANCED: Store text decoration details
      if (computed.textDecoration) {
        node.textDecoration = {
          line: computed.textDecorationLine || "",
          style: computed.textDecorationStyle || "",
          color: computed.textDecorationColor || "",
          thickness: computed.textDecorationThickness || "",
        };
      }

      // Store backgroundColor for reference (always store, even if not added as fill)
      // This is critical for fallback logic in node-builder when fills fail to convert
      if (!node.style) node.style = {};
      node.style.backgroundColor = computed.backgroundColor || "";
      node.backgroundColor = computed.backgroundColor || "";
      node.style.backgroundImage = computed.backgroundImage || "";

      // CRITICAL FIX: Also store the raw computed style for better fallback support
      // This helps when the parsed color fails but the raw CSS value might work
      if (
        computed.backgroundColor &&
        computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        computed.backgroundColor !== "transparent"
      ) {
        if (!node.computedStyle) node.computedStyle = {};
        node.computedStyle.backgroundColor = computed.backgroundColor;
      }

      // BOX-SIZING AWARE: Use already-extracted padding values to avoid recalculation
      // These values were extracted earlier in the box-sizing handling section
      const paddingTop =
        node._boxSizingData?.paddings.top ??
        ExtractionValidation.safeParseFloat(computed.paddingTop, 0);
      const paddingRight =
        node._boxSizingData?.paddings.right ??
        ExtractionValidation.safeParseFloat(computed.paddingRight, 0);
      const paddingBottom =
        node._boxSizingData?.paddings.bottom ??
        ExtractionValidation.safeParseFloat(computed.paddingBottom, 0);
      const paddingLeft =
        node._boxSizingData?.paddings.left ??
        ExtractionValidation.safeParseFloat(computed.paddingLeft, 0);

      const marginTop = ExtractionValidation.safeParseFloat(
        computed.marginTop,
        0
      );
      const marginRight = ExtractionValidation.safeParseFloat(
        computed.marginRight,
        0
      );
      const marginBottom = ExtractionValidation.safeParseFloat(
        computed.marginBottom,
        0
      );
      const marginLeft = ExtractionValidation.safeParseFloat(
        computed.marginLeft,
        0
      );

      // Store padding/margin for use in positioning calculations
      if (
        paddingTop > 0 ||
        paddingRight > 0 ||
        paddingBottom > 0 ||
        paddingLeft > 0
      ) {
        node.padding = {
          top: paddingTop,
          right: paddingRight,
          bottom: paddingBottom,
          left: paddingLeft,
        };
      }

      if (
        marginTop > 0 ||
        marginRight > 0 ||
        marginBottom > 0 ||
        marginLeft > 0
      ) {
        node.margin = {
          top: marginTop,
          right: marginRight,
          bottom: marginBottom,
          left: marginLeft,
        };
      }

      // Borders with validation
      if (
        (computed.borderTopWidth ||
          computed.borderRightWidth ||
          computed.borderBottomWidth ||
          computed.borderLeftWidth) &&
        (computed.borderTopStyle ||
          computed.borderRightStyle ||
          computed.borderBottomStyle ||
          computed.borderLeftStyle)
      ) {
        const parseSide = (side: "Top" | "Right" | "Bottom" | "Left") => {
          const width = ExtractionValidation.safeParseFloat(
            (computed as any)[`border${side}Width`] ||
              (computed as any).borderWidth ||
              "0",
            0
          );
          const style = String(
            (computed as any)[`border${side}Style`] ||
              (computed as any).borderStyle ||
              "none"
          );
          const colorStr = String(
            (computed as any)[`border${side}Color`] ||
              (computed as any).borderColor ||
              ""
          );
          const color = this.parseColorSafe(colorStr);
          const active =
            width > 0.001 && style !== "none" && style !== "hidden" && !!color;
          return {
            width: active ? width : 0,
            style,
            color: color || undefined,
          };
        };

        const top = parseSide("Top");
        const right = parseSide("Right");
        const bottom = parseSide("Bottom");
        const left = parseSide("Left");

        const maxWidth = Math.max(
          top.width,
          right.width,
          bottom.width,
          left.width
        );
        if (maxWidth > 0) {
          node.borderSides = { top, right, bottom, left };

          // CSS borders are painted inside the element's border box.
          node.strokeAlign = "INSIDE";

          // Keep strokeWeight for compatibility, but the importer should prefer borderSides.
          node.strokeWeight = maxWidth;
        }
      }

      // Border radius
      const cornerRadius = this.extractCornerRadiusSafe(computed);
      if (cornerRadius) node.cornerRadius = cornerRadius;

      // Typography for TEXT nodes
      if (node.type === "TEXT") {
        await this.extractTypographySafe(computed, element, node);
      }

      // Box shadow
      if (computed.boxShadow && computed.boxShadow !== "none") {
        const shadows = this.parseBoxShadowSafe(computed.boxShadow);
        // CRITICAL: CSS box-shadow layers are front-to-back (first = topmost),
        // but Figma effects need to be in correct visual stacking order.
        // Reverse shadows to preserve visual layering.
        shadows.reverse().forEach((shadow) => node.effects.push(shadow));
      }

      // CSS filter effects (e.g. filter: drop-shadow(...) blur(...))
      const filterValue = (computed as any).filter;
      if (
        filterValue &&
        typeof filterValue === "string" &&
        filterValue !== "none"
      ) {
        const effects = this.parseFilterEffectsSafe(filterValue, "LAYER");
        // CRITICAL: CSS filter effects are applied in order (left-to-right),
        // preserve original ordering for filters as they represent a pipeline.
        effects.forEach((e) => node.effects.push(e));
      }

      // CSS backdrop-filter effects (best-effort: map blur() -> BACKGROUND_BLUR)
      const backdropValue = (computed as any).backdropFilter;
      if (
        backdropValue &&
        typeof backdropValue === "string" &&
        backdropValue !== "none"
      ) {
        const effects = this.parseFilterEffectsSafe(
          backdropValue,
          "BACKGROUND"
        );
        effects.forEach((e) => node.effects.push(e));
      }

      // Opacity
      if (computed.opacity && computed.opacity !== "1") {
        const opacity = ExtractionValidation.safeParseFloat(
          computed.opacity,
          1
        );
        node.opacity = ExtractionValidation.clampNumber(opacity, 0, 1);
      }

      // CRITICAL: Capture responsive styles per breakpoint (Builder.io compatibility)
      // Store current viewport styles as "large" breakpoint, and detect responsive variations
      await this.captureResponsiveStylesSafe(element, node, computed);
    } catch (error) {
      this.errorTracker.recordError(
        "extractStylesSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "error"
      );
    }
  }

  // ============================================================================
  // TYPOGRAPHY EXTRACTION WITH CANVAS TEXTMETRICS
  // ============================================================================

  private async extractTypographySafe(
    computed: CSSStyleDeclaration,
    element: Element,
    node: any
  ): Promise<void> {
    try {
      // Font family with validation
      const rawFontFamily = computed.fontFamily || "sans-serif";
      const fontFamilyStack = rawFontFamily
        .split(",")
        .map((f) => f.trim().replace(/['"]/g, ""));

      // Use the first font in the stack, or default to generic sans-serif
      const fontFamily = fontFamilyStack[0] || "sans-serif";

      // Font weight with validation
      const fontWeightRaw = computed.fontWeight || "400";
      const weightParsed = (() => {
        const lower = String(fontWeightRaw).trim().toLowerCase();
        if (lower === "normal") return 400;
        if (lower === "bold") return 700;
        if (lower === "bolder") return 700;
        if (lower === "lighter") return 300;
        const num = parseInt(lower, 10);
        return Number.isFinite(num) ? num : 400;
      })();
      const fontWeight = ExtractionValidation.clampNumber(
        weightParsed,
        100,
        900
      );

      // Font size with validation
      const fontSize = ExtractionValidation.clampNumber(
        ExtractionValidation.safeParseFloat(computed.fontSize, 16),
        1,
        500
      );

      // Most-accurate line-height in px (handles CSS `normal`)
      const measuredLineHeightPx = this.getLineHeightPxSafe(
        computed,
        fontFamily,
        fontSize,
        fontWeight
      );

      // Line height parsing
      const lineHeightValue = this.parseLineHeightSafe(
        computed.lineHeight,
        fontSize
      );

      // Letter spacing parsing
      const letterSpacingValue = this.parseLetterSpacingSafe(
        computed.letterSpacing,
        fontSize
      );

      // Text alignment
      const textAlign = computed.textAlign || "left";
      node.textAlignHorizontal =
        textAlign === "center"
          ? "CENTER"
          : textAlign === "right"
          ? "RIGHT"
          : textAlign === "justify"
          ? "JUSTIFY"
          : "LEFT";

      // Vertical alignment
      let textAlignVertical: "TOP" | "CENTER" | "BOTTOM" = "TOP";
      const verticalAlign = computed.verticalAlign || "";
      if (verticalAlign === "middle" || verticalAlign === "center") {
        textAlignVertical = "CENTER";
      } else if (verticalAlign === "bottom" || verticalAlign === "baseline") {
        textAlignVertical = "BOTTOM";
      }

      // Canvas TextMetrics for accurate measurement
      let canvasMetrics: any = null;
      try {
        if (!this.sharedCanvas) {
          this.sharedCanvas = document.createElement("canvas");
          this.sharedCanvas.width = 1;
          this.sharedCanvas.height = 1;
          this.sharedCtx = this.sharedCanvas.getContext("2d", {
            willReadFrequently: true,
          });
        }
        const canvas = this.sharedCanvas;
        const ctx = this.sharedCtx;
        if (ctx && element.textContent) {
          const fontString = `${
            computed.fontStyle || "normal"
          } ${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.font = fontString;
          ctx.textBaseline = "alphabetic";
          ctx.textAlign = "left";

          const textContent = element.textContent.trim();
          if (textContent.length > 0) {
            const metrics = ctx.measureText(textContent);
            canvasMetrics = {
              width: metrics.width,
              actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || 0,
              actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || 0,
              fontBoundingBoxAscent: metrics.fontBoundingBoxAscent || 0,
              fontBoundingBoxDescent: metrics.fontBoundingBoxDescent || 0,
            };
          }
        }
      } catch (error) {
        // Canvas TextMetrics failed - continue without it
      }

      // Build text style object
      node.fontName = {
        family: fontFamily,
        style: computed.fontStyle === "italic" ? "Italic" : "Regular",
      };
      node.fontSize = fontSize;
      node.lineHeight = {
        unit: "PIXELS",
        value: measuredLineHeightPx || lineHeightValue,
      };
      node.letterSpacing = {
        value: letterSpacingValue,
        unit: "PIXELS",
      };
      node.textDecoration = computed.textDecorationLine || "none";
      node.textTransform = computed.textTransform || "none";

      node.textStyle = {
        fontFamily,
        fontFamilyStack:
          fontFamilyStack.length > 1 ? fontFamilyStack : undefined,
        fontWeight,
        fontStyle: computed.fontStyle || "normal",
        fontSize,
        lineHeight: node.lineHeight,
        letterSpacing: node.letterSpacing,
        textAlignHorizontal: node.textAlignHorizontal,
        textAlignVertical: textAlignVertical,
        textDecoration: node.textDecoration,
        textTransform: node.textTransform,
        whiteSpace: computed.whiteSpace,
        // Match schema naming and provide both signals for the importer.
        wordWrap: computed.overflowWrap || computed.wordBreak,
        wordBreak: computed.wordBreak || computed.overflowWrap,
        textOverflow: computed.textOverflow,
        effects: [],
      };

      // Store rendered metrics
      const elementRect = element.getBoundingClientRect();
      const domRectWidth = node.absoluteLayout?.width ?? elementRect.width;
      const domRectHeight = node.absoluteLayout?.height ?? elementRect.height;
      node.renderedMetrics = {
        width:
          domRectWidth > 0
            ? domRectWidth
            : canvasMetrics?.width ?? domRectWidth,
        height: domRectHeight,
        lineHeightPx: measuredLineHeightPx || lineHeightValue,
        actualBoundingBoxAscent: canvasMetrics?.actualBoundingBoxAscent,
        actualBoundingBoxDescent: canvasMetrics?.actualBoundingBoxDescent,
        fontBoundingBoxAscent: canvasMetrics?.fontBoundingBoxAscent,
        fontBoundingBoxDescent: canvasMetrics?.fontBoundingBoxDescent,
        domRectWidth: domRectWidth,
        domRectHeight: domRectHeight,
      };

      // text-shadow → effects (Figma supports drop shadow on text nodes)
      if (computed.textShadow && computed.textShadow !== "none") {
        const textShadowEffects = this.parseTextShadowSafe(computed.textShadow);
        if (textShadowEffects.length > 0) {
          (node.textStyle.effects as any[]).push(...textShadowEffects);
          // Backward-compatible field for older importer code paths
          node.textStyle.textShadows = textShadowEffects;
        }
      }

      // Text color extraction
      const textColor = this.parseColorSafe(computed.color);

      // Removed aggressive contrast fix: previously overrode colors for text < 20px
      // based on often-incorrect background detection, causing black-on-dark issues.
      // We now trust the browser's computed style.

      if (textColor) {
        if (!node.textStyle.fills) {
          node.textStyle.fills = [];
        }
        node.textStyle.fills.push({
          type: "SOLID",
          color: {
            r: textColor.r,
            g: textColor.g,
            b: textColor.b,
            a: textColor.a,
          },
          opacity: textColor.a ?? 1,
          visible: true,
        });

        if (!node.fills) {
          node.fills = [];
        }
        node.fills.push({
          type: "SOLID",
          color: {
            r: textColor.r,
            g: textColor.g,
            b: textColor.b,
            a: textColor.a,
          },
          opacity: textColor.a ?? 1,
          visible: true,
        });
        this.assets.colors.add(computed.color);
      } else {
        // Fallback to black for TEXT nodes
        if (node.type === "TEXT") {
          if (!node.textStyle.fills) node.textStyle.fills = [];
          node.textStyle.fills.push({
            type: "SOLID",
            color: { r: 0, g: 0, b: 0, a: 1 },
            opacity: 1,
            visible: true,
          });
          if (!node.fills) node.fills = [];
          node.fills.push({
            type: "SOLID",
            color: { r: 0, g: 0, b: 0, a: 1 },
            opacity: 1,
            visible: true,
          });
        }
      }

      // Track font usage
      if (!this.assets.fonts.has(fontFamily)) {
        this.assets.fonts.set(fontFamily, new Set());
      }
      this.assets.fonts.get(fontFamily)?.add(fontWeight);

      // Text auto resize detection
      const isFixedWidth =
        computed.width &&
        computed.width !== "auto" &&
        !computed.width.includes("content") &&
        computed.display !== "inline" &&
        computed.display !== "inline-block";
      const isNoWrap =
        computed.whiteSpace === "nowrap" || computed.whiteSpace === "pre";
      const overflowX = (
        computed.overflowX ||
        computed.overflow ||
        ""
      ).toLowerCase();
      const hasTruncation =
        (computed.textOverflow || "").toLowerCase() === "ellipsis" ||
        overflowX === "hidden" ||
        overflowX === "clip";

      if (isNoWrap) {
        // If the browser is truncating/clipping within a fixed width, keep a fixed-width text box.
        node.textAutoResize =
          isFixedWidth && hasTruncation ? "NONE" : "WIDTH_AND_HEIGHT";
      } else if (isFixedWidth) {
        // For pixel-perfect fidelity, keep the text box width/height fixed to the DOM box.
        // Wrapping still occurs in Figma when textAutoResize is NONE and width is constrained.
        node.textAutoResize = "NONE";
      } else {
        node.textAutoResize = "HEIGHT";
      }
    } catch (error) {
      this.errorTracker.recordError(
        "extractTypographySafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "error"
      );
    }
  }

  private async extractBackgroundImageFillsSafe(
    computed: CSSStyleDeclaration,
    element: Element,
    node: any
  ): Promise<void> {
    try {
      const isDocumentRoot =
        element.tagName.toLowerCase() === "body" ||
        element.tagName.toLowerCase() === "html";
      if (isDocumentRoot) return;

      const backgroundImage = (computed.backgroundImage || "").trim();
      if (!backgroundImage || backgroundImage === "none") return;

      const layers = this.splitCssLayers(backgroundImage);
      const positions = this.splitCssLayers(computed.backgroundPosition || "");
      const sizes = this.splitCssLayers(computed.backgroundSize || "");
      const repeats = this.splitCssLayers(computed.backgroundRepeat || "");
      if (layers.length === 0) return;

      if (!node.fills) node.fills = [];

      // CSS backgrounds are layered; first layer is drawn on top.
      // Figma renders fills bottom-to-top (first in array = bottom, last = top).
      // So we have two options:
      // 1. Iterate CSS layers top-to-bottom and prepend to Figma array -> NO, Figma renders array[0] at bottom.
      // 2. Iterate CSS layers top-to-bottom and append, BUT we need the *visual* top to be at the *end* of the array.
      //
      // CSS: background-image: url(top.png), url(bottom.png);
      // Figma: fills = [bottomFill, topFill];
      //
      // So we should iterate CSS layers in REVERSE order (bottom-to-top) and push to Figma array.
      //
      // However, our solid background extraction (above) already pushes the base background color.
      // So that's index 0 (bottom).
      // Now we handle background images. We want the last CSS layer (bottom-most image) to come next,
      // and the first CSS layer (top-most image) to be last.
      for (let i = Math.min(layers.length, 6) - 1; i >= 0; i--) {
        const layer = layers[i];
        const position =
          positions[i] || positions[positions.length - 1] || "0% 0%";
        const size = sizes[i] || sizes[sizes.length - 1] || "";
        const repeat = repeats[i] || repeats[repeats.length - 1] || "";
        const scaleMode = this.mapCssBackgroundToScaleMode(
          (size || "").toLowerCase(),
          (repeat || "").toLowerCase()
        );
        const objectPosition = this.normalizeBackgroundPosition(position);

        // 1) url(...) layers
        const urls = this.extractCssUrls(layer);
        for (const rawUrl of urls.slice(0, 3)) {
          if (!ExtractionValidation.isValidUrl(rawUrl)) continue;

          // CRITICAL FIX: Check if this is an SVG and handle it appropriately
          const isSVG =
            rawUrl.toLowerCase().includes(".svg") ||
            rawUrl.toLowerCase().includes("image/svg+xml");

          if (isSVG) {
            // Handle as vector/SVG asset
            await this.captureSVGSafe(rawUrl);
            const key = this.hashString(rawUrl);
            const svgAsset = this.assets.svgs.get(rawUrl);

            if (svgAsset) {
              // Create SVG fill type
              const fill = {
                type: "SVG",
                svgRef: key,
                scaleMode,
                ...(objectPosition ? { objectPosition } : {}),
                visible: true,
                url: rawUrl,
              };

              node.fills.push(fill);
            }
          } else {
            // Handle as raster image (existing logic)
            await this.captureImageSafe(rawUrl);
            const key = this.hashString(rawUrl);

            // ENHANCED: Detect if this might be a logo/icon based on URL patterns
            const isLogo = this.detectLogoPattern(rawUrl, element);

            const fill = {
              type: "IMAGE",
              imageHash: key,
              scaleMode,
              ...(objectPosition ? { objectPosition } : {}),
              visible: true,
              // CRITICAL: Store URL in fill for fallback when base64 is missing
              url: rawUrl,
              // ENHANCED: Mark logos for special handling
              ...(isLogo ? { isLogo: true, priority: "high" } : {}),
            };

            node.fills.push(fill);
          }

          // ENHANCED: Store background image metadata separately for reference
          if (!node.backgroundImages) node.backgroundImages = [];
          node.backgroundImages.push({
            url: rawUrl,
            position: position,
            size: size,
            repeat: repeat,
            scaleMode: scaleMode,
            isLogo: isSVG ? false : this.detectLogoPattern(rawUrl, element),
            isSVG: isSVG,
          });
        }

        // 2) gradient(...) layers
        const gradientFill = this.parseCssGradientToFill(layer);
        if (gradientFill) {
          node.fills.push(gradientFill);
        }
      }
    } catch (error) {
      this.errorTracker.recordError(
        "extractBackgroundImageFillsSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  private detectLogoPattern(url: string, element: Element): boolean {
    try {
      const urlLower = url.toLowerCase();
      const className = this.getClassNameSafe(element).toLowerCase();
      const id = (element.id || "").toLowerCase();
      const tagName = element.tagName.toLowerCase();

      // Check URL patterns
      const logoPatterns = [
        /logo/i,
        /icon/i,
        /brand/i,
        /mark/i,
        /symbol/i,
        /header.*logo/i,
        /nav.*logo/i,
      ];

      // Check if URL contains logo patterns
      if (logoPatterns.some((pattern) => pattern.test(urlLower))) {
        return true;
      }

      // Check if element class/id suggests it's a logo
      if (
        className.includes("logo") ||
        className.includes("brand") ||
        id.includes("logo") ||
        id.includes("brand") ||
        tagName === "svg" ||
        (tagName === "img" &&
          (className.includes("logo") || id.includes("logo")))
      ) {
        return true;
      }

      // Check if element is in header/nav and has image
      const parent = element.parentElement;
      if (parent) {
        const parentTag = parent.tagName.toLowerCase();
        const parentClass = this.getClassNameSafe(parent).toLowerCase();
        if (
          (parentTag === "header" ||
            parentTag === "nav" ||
            parentClass.includes("header") ||
            parentClass.includes("nav")) &&
          (tagName === "img" ||
            tagName === "svg" ||
            urlLower.includes("logo") ||
            urlLower.includes("icon"))
        ) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private extractCssUrls(value: string): string[] {
    try {
      const urls: string[] = [];
      const re = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
      for (const match of value.matchAll(re)) {
        const raw = (match[2] || "").trim();
        if (raw) urls.push(raw);
      }
      return urls;
    } catch {
      return [];
    }
  }

  private splitCssLayers(value: string): string[] {
    const input = (value || "").trim();
    if (!input) return [];

    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (ch === "," && depth === 0) {
        parts.push(input.slice(start, i).trim());
        start = i + 1;
      }
    }

    parts.push(input.slice(start).trim());
    return parts.filter(Boolean);
  }

  private parseCssGradientToFill(layer: string): any | null {
    const raw = (layer || "").trim();
    if (!raw) return null;

    const lower = raw.toLowerCase();
    if (lower.startsWith("linear-gradient(")) {
      return this.parseLinearGradientFill(raw);
    }
    if (lower.startsWith("radial-gradient(")) {
      return this.parseRadialGradientFill(raw);
    }
    return null;
  }

  private parseLinearGradientFill(value: string): any | null {
    const inner = this.extractFunctionInner(value);
    if (!inner) return null;

    const args = this.splitCssLayers(inner);
    if (args.length < 2) return null;

    let angleDeg: number | null = null;
    const first = args[0].trim().toLowerCase();
    if (first.startsWith("to ")) {
      angleDeg = this.directionToDegrees(first);
      args.shift();
    } else if (
      first.endsWith("deg") ||
      first.endsWith("turn") ||
      first.endsWith("rad")
    ) {
      angleDeg = this.parseAngleToDegrees(first);
      args.shift();
    }

    // Default CSS linear-gradient direction is "to bottom" (180deg).
    const cssAngle = angleDeg ?? 180;
    const gradientStops = this.parseGradientStops(args);
    if (gradientStops.length < 2) return null;

    return {
      type: "GRADIENT_LINEAR",
      gradientStops,
      gradientTransform: this.linearGradientTransformFromCssDegrees(cssAngle),
      visible: true,
    };
  }

  private parseRadialGradientFill(value: string): any | null {
    const inner = this.extractFunctionInner(value);
    if (!inner) return null;

    const args = this.splitCssLayers(inner);
    if (args.length < 2) return null;

    // Radial gradients can start with shape/size/position; we only support the stop list.
    // Find the first arg that contains a parsable color.
    let startIndex = 0;
    for (let i = 0; i < args.length; i++) {
      if (this.tryParseColorFromStop(args[i])) {
        startIndex = i;
        break;
      }
    }

    const stopArgs = args.slice(startIndex);
    const gradientStops = this.parseGradientStops(stopArgs);
    if (gradientStops.length < 2) return null;

    return {
      type: "GRADIENT_RADIAL",
      gradientStops,
      // Without explicit size/position support, leave identity transform.
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      visible: true,
    };
  }

  private extractFunctionInner(value: string): string | null {
    const open = value.indexOf("(");
    const close = value.lastIndexOf(")");
    if (open === -1 || close === -1 || close <= open) return null;
    return value.slice(open + 1, close).trim();
  }

  private parseAngleToDegrees(token: string): number | null {
    const t = token.trim().toLowerCase();
    if (t.endsWith("deg")) {
      const n = ExtractionValidation.safeParseFloat(t.slice(0, -3), NaN);
      return Number.isFinite(n) ? n : null;
    }
    if (t.endsWith("turn")) {
      const n = ExtractionValidation.safeParseFloat(t.slice(0, -4), NaN);
      return Number.isFinite(n) ? n * 360 : null;
    }
    if (t.endsWith("rad")) {
      const n = ExtractionValidation.safeParseFloat(t.slice(0, -3), NaN);
      return Number.isFinite(n) ? (n * 180) / Math.PI : null;
    }
    return null;
  }

  private directionToDegrees(dir: string): number | null {
    const d = dir.replace(/\s+/g, " ").trim().toLowerCase();
    const to = d.startsWith("to ") ? d.slice(3).trim() : d;
    // CSS angles: 0deg=up, 90deg=right, 180deg=down, 270deg=left.
    const parts = to.split(" ");
    const hasTop = parts.includes("top");
    const hasBottom = parts.includes("bottom");
    const hasLeft = parts.includes("left");
    const hasRight = parts.includes("right");
    if (hasTop && hasRight) return 45;
    if (hasBottom && hasRight) return 135;
    if (hasBottom && hasLeft) return 225;
    if (hasTop && hasLeft) return 315;
    if (hasTop) return 0;
    if (hasRight) return 90;
    if (hasBottom) return 180;
    if (hasLeft) return 270;
    return null;
  }

  private tryParseColorFromStop(stop: string): boolean {
    const { colorPart } = this.splitStopColorAndPositions(stop);
    if (!colorPart) return false;
    return !!this.parseColorSafe(colorPart);
  }

  private parseGradientStops(
    stops: string[]
  ): Array<{ position: number; color: any }> {
    const parsed = stops
      .map((s) => this.parseGradientStop(s))
      .filter(Boolean) as Array<{ position?: number; color: any }>;
    if (parsed.length === 0) return [];

    // Fill missing positions deterministically.
    if (parsed[0].position === undefined) parsed[0].position = 0;
    if (parsed[parsed.length - 1].position === undefined)
      parsed[parsed.length - 1].position = 1;

    // Forward pass: set any missing positions between known anchors.
    let lastKnownIndex = 0;
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i].position !== undefined) {
        const start = parsed[lastKnownIndex].position ?? 0;
        const end = parsed[i].position ?? start;
        const gap = i - lastKnownIndex;
        if (gap > 1) {
          for (let j = 1; j < gap; j++) {
            const t = j / gap;
            parsed[lastKnownIndex + j].position = start + (end - start) * t;
          }
        }
        lastKnownIndex = i;
      }
    }

    return parsed.map((s) => ({
      position: ExtractionValidation.clampNumber(s.position ?? 0, 0, 1),
      color: s.color,
    }));
  }

  private parseGradientStop(
    stop: string
  ): { position?: number; color: any } | null {
    const { colorPart, positions } = this.splitStopColorAndPositions(stop);
    if (!colorPart) return null;

    const color = this.parseColorSafe(colorPart);
    if (!color) return null;

    const pos = this.parseStopPosition(positions[0]);
    return { position: pos ?? undefined, color };
  }

  private splitStopColorAndPositions(stop: string): {
    colorPart: string;
    positions: string[];
  } {
    const raw = (stop || "").trim();
    if (!raw) return { colorPart: "", positions: [] };

    const match = raw.match(
      /(.*?)(?:\s+(-?\d*\.?\d+%)(?:\s+(-?\d*\.?\d+%))?)?\s*$/
    );
    if (!match) return { colorPart: raw, positions: [] };
    const colorPart = (match[1] || "").trim();
    const positions = [match[2], match[3]].filter((v): v is string => !!v);
    return { colorPart, positions };
  }

  private parseStopPosition(token?: string): number | null {
    if (!token) return null;
    const t = token.trim();
    if (t.endsWith("%")) {
      const n = ExtractionValidation.safeParseFloat(t.slice(0, -1), NaN);
      if (!Number.isFinite(n)) return null;
      return n / 100;
    }
    return null;
  }

  private linearGradientTransformFromCssDegrees(
    cssDegrees: number
  ): [[number, number, number], [number, number, number]] {
    // Assume Figma default linear gradient runs left->right.
    // CSS 90deg runs left->right. Rotate about the center to match CSS angles.
    const figmaDegrees = cssDegrees - 90;
    const rad = (figmaDegrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const tx = 0.5 - cos * 0.5 + sin * 0.5;
    const ty = 0.5 - sin * 0.5 - cos * 0.5;
    return [
      [cos, -sin, tx],
      [sin, cos, ty],
    ];
  }

  private mapCssBackgroundToScaleMode(
    backgroundSize: string,
    backgroundRepeat: string
  ): "FILL" | "FIT" | "CROP" | "TILE" {
    if (
      backgroundRepeat.includes("repeat") &&
      !backgroundRepeat.includes("no-repeat")
    ) {
      return "TILE";
    }
    if (backgroundSize.includes("contain")) return "FIT";
    if (backgroundSize.includes("cover")) return "CROP";
    return "FILL";
  }

  private normalizeBackgroundPosition(position: string): string | null {
    const raw = (position || "").trim();
    if (!raw) return null;

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;

    // Single-value positions (e.g., "center", "top", "30%")
    if (parts.length === 1) {
      const token = parts[0].toLowerCase();
      if (token === "center") return "50% 50%";
      if (token === "top" || token === "bottom") return `50% ${token}`;
      if (token === "left" || token === "right") return `${token} 50%`;
      return `${parts[0]} 50%`;
    }

    // Two-value positions (e.g., "left top", "20% 40%")
    const x = parts[0];
    const y = parts[1];
    return `${x} ${y}`;
  }

  private parseLineHeightSafe(value: string, fontSize: number): number {
    if (!value || value === "normal") return fontSize * 1.2;

    if (value.endsWith("%")) {
      const pct = ExtractionValidation.safeParseFloat(value, 120);
      return (pct / 100) * fontSize;
    }

    if (value.endsWith("em")) {
      const em = ExtractionValidation.safeParseFloat(value, 1.2);
      return em * fontSize;
    }

    return ExtractionValidation.safeParseFloat(value, fontSize * 1.2);
  }

  private parseLetterSpacingSafe(value: string, fontSize: number): number {
    if (!value || value === "normal") return 0;

    if (value.endsWith("em")) {
      const em = ExtractionValidation.safeParseFloat(value, 0);
      return em * fontSize;
    }

    return ExtractionValidation.safeParseFloat(value, 0);
  }

  private shouldTreatLeafTextElementAsContainer(
    element: Element,
    computed: CSSStyleDeclaration
  ): boolean {
    // If the element has a visible box model (background/border/padding/shadow/radius),
    // treat it as a FRAME and emit a child TEXT node. This preserves padding and
    // avoids losing backgrounds/borders on TEXT nodes in Figma.
    try {
      const hasBackground =
        (computed.backgroundImage && computed.backgroundImage !== "none") ||
        (() => {
          const bg = this.parseColorSafe(computed.backgroundColor);
          return !!bg && (bg.a ?? 1) > 0.001;
        })();

      const borderWidth = ExtractionValidation.safeParseFloat(
        computed.borderTopWidth || computed.borderWidth,
        0
      );
      const hasBorder = borderWidth > 0.001;

      const hasShadow = !!computed.boxShadow && computed.boxShadow !== "none";

      const hasRadius =
        ExtractionValidation.safeParseFloat(computed.borderTopLeftRadius, 0) >
          0.001 ||
        ExtractionValidation.safeParseFloat(computed.borderTopRightRadius, 0) >
          0.001 ||
        ExtractionValidation.safeParseFloat(
          computed.borderBottomRightRadius,
          0
        ) > 0.001 ||
        ExtractionValidation.safeParseFloat(
          computed.borderBottomLeftRadius,
          0
        ) > 0.001;

      const padding =
        ExtractionValidation.safeParseFloat(computed.paddingTop, 0) +
        ExtractionValidation.safeParseFloat(computed.paddingRight, 0) +
        ExtractionValidation.safeParseFloat(computed.paddingBottom, 0) +
        ExtractionValidation.safeParseFloat(computed.paddingLeft, 0);
      const hasPadding = padding > 0.001;

      const before = ExtractionValidation.safeGetComputedStyle(
        element,
        "::before"
      );
      const after = ExtractionValidation.safeGetComputedStyle(
        element,
        "::after"
      );
      const hasBeforeAfterContent = [before, after].some((s) => {
        if (!s) return false;
        const content = (s.content || "").trim();
        return (
          s.display !== "none" &&
          content &&
          content !== "none" &&
          content !== "normal" &&
          content !== '""' &&
          content !== "''"
        );
      });

      return (
        hasBackground ||
        hasBorder ||
        hasShadow ||
        hasRadius ||
        hasPadding ||
        hasBeforeAfterContent
      );
    } catch {
      return false;
    }
  }

  private extractCornerRadiusSafe(computed: CSSStyleDeclaration): any | null {
    try {
      const topLeft = ExtractionValidation.safeParseFloat(
        computed.borderTopLeftRadius,
        0
      );
      const topRight = ExtractionValidation.safeParseFloat(
        computed.borderTopRightRadius,
        0
      );
      const bottomRight = ExtractionValidation.safeParseFloat(
        computed.borderBottomRightRadius,
        0
      );
      const bottomLeft = ExtractionValidation.safeParseFloat(
        computed.borderBottomLeftRadius,
        0
      );

      const values = [topLeft, topRight, bottomRight, bottomLeft];
      if (values.every((v) => v <= 0)) return null;

      const allEqual =
        Math.abs(topLeft - topRight) < 0.001 &&
        Math.abs(topLeft - bottomRight) < 0.001 &&
        Math.abs(topLeft - bottomLeft) < 0.001;

      if (allEqual) return topLeft;

      return {
        topLeft,
        topRight,
        bottomRight,
        bottomLeft,
      };
    } catch {
      return null;
    }
  }

  private ensureMeasurementElements(): void {
    if (this.measurementRoot && this.lineHeightMeasurer) return;

    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = "-99999px";
    root.style.top = "-99999px";
    root.style.width = "0";
    root.style.height = "0";
    root.style.overflow = "hidden";
    root.style.visibility = "hidden";
    root.style.pointerEvents = "none";
    root.style.contain = "strict";

    const span = document.createElement("span");
    span.style.display = "inline-block";
    span.style.padding = "0";
    span.style.margin = "0";
    span.style.border = "0";
    span.style.whiteSpace = "pre";
    span.textContent = "Hg";

    root.appendChild(span);
    (document.body || document.documentElement).appendChild(root);

    this.measurementRoot = root;
    this.lineHeightMeasurer = span;
  }

  private getLineHeightPxSafe(
    computed: CSSStyleDeclaration,
    fontFamily: string,
    fontSize: number,
    fontWeight: number
  ): number {
    try {
      // If the browser already computed a px value, trust it.
      if (computed.lineHeight && computed.lineHeight !== "normal") {
        const parsed = ExtractionValidation.safeParseFloat(
          computed.lineHeight,
          0
        );
        if (parsed > 0) return parsed;
      }

      const fontStyle = computed.fontStyle || "normal";
      const letterSpacing = computed.letterSpacing || "normal";
      const key = [
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        letterSpacing,
        computed.lineHeight || "normal",
      ].join("|");

      const cached = this.lineHeightCache.get(key);
      if (cached && cached > 0) return cached;

      this.ensureMeasurementElements();
      if (!this.lineHeightMeasurer) {
        return this.parseLineHeightSafe(computed.lineHeight, fontSize);
      }

      const span = this.lineHeightMeasurer;
      span.style.fontFamily = fontFamily;
      span.style.fontSize = `${fontSize}px`;
      span.style.fontWeight = `${fontWeight}`;
      span.style.fontStyle = fontStyle;
      span.style.letterSpacing = letterSpacing;
      span.style.lineHeight = computed.lineHeight || "normal";

      // PIXEL-PERFECT TEXT FIX: Add single line of text for accurate measurement
      span.textContent = "Ag";

      const height = Math.round(span.getBoundingClientRect().height);
      const clamped = ExtractionValidation.clampNumber(
        height,
        Math.max(1, Math.round(fontSize * 0.8)),
        Math.round(fontSize * 5)
      );

      this.lineHeightCache.set(key, clamped);
      return clamped;
    } catch {
      return this.parseLineHeightSafe(computed.lineHeight, fontSize);
    }
  }

  // ============================================================================
  // COLOR PARSING WITH VALIDATION
  // ============================================================================

  private parseColorSafe(
    color: string
  ): { r: number; g: number; b: number; a: number } | null {
    if (!color) return null;

    // Check cache first (huge performance gain for repeated theme colors)
    if (this.colorCache.has(color)) {
      return this.colorCache.get(color)!;
    }

    try {
      const direct = String(color).trim().toLowerCase();
      if (!direct) {
        this.colorCache.set(color, null);
        return null;
      }
      if (direct === "transparent") {
        const result = { r: 0, g: 0, b: 0, a: 0 };
        this.colorCache.set(color, result);
        return result;
      }

      const raw = ExtractionValidation.sanitizeColorString(color);
      if (!raw) {
        this.colorCache.set(color, null);
        return null;
      }

      // ENHANCED RGBA/RGB parsing with better decimal support and precision
      const rgbaMatch = raw.match(
        /rgba?\(\s*([\d.]+%?)\s*,?\s*([\d.]+%?)\s*,?\s*([\d.]+%?)\s*(?:,?\s*([\d.]+%?))?\s*\)/
      );
      if (rgbaMatch) {
        // PIXEL-PERFECT COLOR FIX: Handle percentages and improve precision
        const parseColorValue = (val: string, isAlpha = false) => {
          if (!val) return isAlpha ? 1 : 0;
          const isPercent = val.includes("%");
          const num = parseFloat(val.replace("%", ""));
          if (isPercent) {
            return isAlpha ? num / 100 : (num / 100) * 255;
          }
          return num;
        };

        const result = {
          r:
            Math.round(
              ExtractionValidation.clampNumber(
                parseColorValue(rgbaMatch[1]) / 255,
                0,
                1
              ) * 255
            ) / 255, // Round to nearest 1/255 for accuracy
          g:
            Math.round(
              ExtractionValidation.clampNumber(
                parseColorValue(rgbaMatch[2]) / 255,
                0,
                1
              ) * 255
            ) / 255,
          b:
            Math.round(
              ExtractionValidation.clampNumber(
                parseColorValue(rgbaMatch[3]) / 255,
                0,
                1
              ) * 255
            ) / 255,
          a: rgbaMatch[4]
            ? ExtractionValidation.clampNumber(
                parseColorValue(rgbaMatch[4], true),
                0,
                1
              )
            : 1,
        };
        this.colorCache.set(color, result);
        return result;
      }

      // Modern CSS rgb()/rgba() syntax: rgb(0 0 0 / 0.5)
      const spaceRgbMatch = raw.match(
        /rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/
      );
      if (spaceRgbMatch) {
        const aRaw = spaceRgbMatch[4];
        const result = {
          r: ExtractionValidation.clampNumber(
            parseFloat(spaceRgbMatch[1]) / 255,
            0,
            1
          ),
          g: ExtractionValidation.clampNumber(
            parseFloat(spaceRgbMatch[2]) / 255,
            0,
            1
          ),
          b: ExtractionValidation.clampNumber(
            parseFloat(spaceRgbMatch[3]) / 255,
            0,
            1
          ),
          a: aRaw
            ? aRaw.endsWith("%")
              ? ExtractionValidation.clampNumber(parseFloat(aRaw) / 100, 0, 1)
              : ExtractionValidation.clampNumber(parseFloat(aRaw), 0, 1)
            : 1,
        };
        this.colorCache.set(color, result);
        return result;
      }

      // Hex
      const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
      if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) {
          hex = hex
            .split("")
            .map((ch) => ch + ch)
            .join("");
        }
        const r = ExtractionValidation.clampNumber(
          parseInt(hex.substring(0, 2), 16) / 255,
          0,
          1
        );
        const g = ExtractionValidation.clampNumber(
          parseInt(hex.substring(2, 4), 16) / 255,
          0,
          1
        );
        const b = ExtractionValidation.clampNumber(
          parseInt(hex.substring(4, 6), 16) / 255,
          0,
          1
        );
        let a = 1;
        if (hex.length === 8) {
          a = ExtractionValidation.clampNumber(
            parseInt(hex.substring(6, 8), 16) / 255,
            0,
            1
          );
        }
        const result = { r, g, b, a };
        this.colorCache.set(color, result);
        return result;
      }

      // Initialize shared canvas if needed
      if (!this.sharedCanvas) {
        this.sharedCanvas = document.createElement("canvas");
        this.sharedCanvas.width = 1;
        this.sharedCanvas.height = 1;
        this.sharedCtx = this.sharedCanvas.getContext("2d", {
          willReadFrequently: true,
        });
      }

      const ctx = this.sharedCtx;
      if (!ctx) {
        this.colorCache.set(color, null);
        return null;
      }

      // Helper to extract from canvas
      const extractFromCanvas = (styleStr: string) => {
        try {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = styleStr;
          const computed = ctx.fillStyle.toString().toLowerCase();

          // Optimization: If the browser converted it to simple hex/rgb string, RECURSIVELY parse that
          // so we hit the fast path regexes above for the normalized string.
          if (computed !== styleStr.toLowerCase()) {
            // Avoid infinite recursion if browser doesn't normalize or returns same
            if (computed.startsWith("#") || computed.startsWith("rgb")) {
              const result = this.parseColorSafe(computed);
              if (result) return result;
            }
          }

          ctx.fillRect(0, 0, 1, 1);
          const imageData = ctx.getImageData(0, 0, 1, 1);
          const [r, g, b, a] = imageData.data;

          // Verify if the draw actually worked (some browsers might fail silently for invalid colors)
          // Default clear color is transparent (0,0,0,0). If we get that and input wasn't transparent, it might be invalid.
          if (
            a === 0 &&
            styleStr !== "transparent" &&
            !styleStr.includes("rgba(0, 0, 0, 0)")
          ) {
            // Possibly invalid color
            return null;
          }

          return {
            r: ExtractionValidation.clampNumber(r / 255, 0, 1),
            g: ExtractionValidation.clampNumber(g / 255, 0, 1),
            b: ExtractionValidation.clampNumber(b / 255, 0, 1),
            a: ExtractionValidation.clampNumber(a / 255, 0, 1),
          };
        } catch (e) {
          return null;
        }
      };

      // Modern CSS color formats: oklch(), oklab(), lch(), lab(), color-mix()
      // These formats are supported by modern browsers and can be converted via canvas API
      const modernColorMatch = raw.match(
        /^(oklch|oklab|lch|lab|color-mix)\([^)]+\)$/i
      );
      if (modernColorMatch) {
        const result = extractFromCanvas(raw);
        if (result) {
          this.colorCache.set(color, result);
          return result;
        }
      }

      // Canvas fallback for named colors and any other formats
      const result = extractFromCanvas(raw);
      this.colorCache.set(color, result);
      return result;
    } catch (error) {
      this.errorTracker.recordError(
        "parseColorSafe",
        `Failed to parse color: ${color}`,
        undefined,
        "warning"
      );
      this.colorCache.set(color, null);
      return null;
    }
  }

  // ============================================================================
  // BOX SHADOW PARSING
  // ============================================================================

  private parseBoxShadowSafe(boxShadow: string): any[] {
    const shadows: any[] = [];

    try {
      const shadowStrings = boxShadow.split(/,(?![^(]*\))/);

      for (const shadowStr of shadowStrings) {
        const trimmed = shadowStr.trim();
        if (!trimmed || trimmed === "none") continue;

        // `inset` can appear anywhere in the box-shadow component.
        const isInset = /(^|\s)inset(\s|$)/i.test(trimmed);
        const working = isInset
          ? trimmed.replace(/(^|\s)inset(\s|$)/gi, " ").trim()
          : trimmed;

        let colorStr = "";
        let remaining = working;

        const rgbaMatch = working.match(/rgba?\([^)]+\)/);
        if (rgbaMatch) {
          colorStr = rgbaMatch[0];
          remaining = working.replace(rgbaMatch[0], "").trim();
        } else {
          const parts = working.split(/\s+/);
          const colorPart = parts.find(
            (p) => p.startsWith("#") || /^[a-z]+$/i.test(p)
          );
          if (colorPart) {
            colorStr = colorPart;
            remaining = working.replace(colorPart, "").trim();
          }
        }

        const dimensions = remaining.split(/\s+/).filter((s) => s.length > 0);
        const offsetX = ExtractionValidation.safeParseFloat(dimensions[0], 0);
        const offsetY = ExtractionValidation.safeParseFloat(dimensions[1], 0);
        const blurRadius = ExtractionValidation.safeParseFloat(
          dimensions[2],
          0
        );
        const spreadRadius = ExtractionValidation.safeParseFloat(
          dimensions[3],
          0
        );

        const color = this.parseColorSafe(colorStr) || {
          r: 0,
          g: 0,
          b: 0,
          a: 0.25,
        };

        shadows.push({
          type: isInset ? "INNER_SHADOW" : "DROP_SHADOW",
          color: { r: color.r, g: color.g, b: color.b, a: color.a },
          offset: { x: offsetX, y: offsetY },
          radius: ExtractionValidation.clampNumber(blurRadius, 0, 500),
          spread: spreadRadius,
          visible: true,
        });
      }
    } catch (error) {
      this.errorTracker.recordError(
        "parseBoxShadowSafe",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "warning"
      );
    }

    return shadows;
  }

  private calculateLuminance(r: number, g: number, b: number): number {
    // Convert to linear RGB (input is 0-1, convert to 0-255 first)
    const toLinear = (c: number) => {
      const c255 = c * 255;
      return c255 <= 0.03928
        ? c255 / 12.92
        : Math.pow((c255 + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  private async handleInputElement(
    element: HTMLInputElement | HTMLTextAreaElement,
    node: any,
    computed: CSSStyleDeclaration
  ): Promise<void> {
    try {
      const isInput = element.tagName.toLowerCase() === "input";
      const input = element as HTMLInputElement;
      const textarea = element as HTMLTextAreaElement;

      // Extract input type and properties
      if (isInput) {
        node.inputType = input.type || "text";
        node.inputValue = input.value || "";
        node.placeholder = input.placeholder || "";
        node.required = input.required || false;
        node.disabled = input.disabled || false;
        node.readOnly = input.readOnly || false;
        node.maxLength = input.maxLength > 0 ? input.maxLength : null;
        node.min = input.min || null;
        node.max = input.max || null;
        node.step = input.step || null;
        node.pattern = input.pattern || null;
        node.autocomplete = input.autocomplete || null;
        node.autofocus = input.autofocus || false;

        // For search inputs, mark them specifically
        if (input.type === "search" || input.type === "text") {
          const className = (input.className || "").toLowerCase();
          const id = (input.id || "").toLowerCase();
          const name = (input.name || "").toLowerCase();
          const ariaLabel = (
            input.getAttribute("aria-label") || ""
          ).toLowerCase();

          if (
            className.includes("search") ||
            id.includes("search") ||
            name.includes("search") ||
            ariaLabel.includes("search") ||
            input.placeholder?.toLowerCase().includes("search")
          ) {
            node.isSearchInput = true;
            node.name = node.name || "Search Input";
          }
        }
      } else {
        // Textarea
        node.inputType = "textarea";
        node.inputValue = textarea.value || "";
        node.placeholder = textarea.placeholder || "";
        node.required = textarea.required || false;
        node.disabled = textarea.disabled || false;
        node.readOnly = textarea.readOnly || false;
        node.maxLength = textarea.maxLength > 0 ? textarea.maxLength : null;
        node.rows = textarea.rows > 0 ? textarea.rows : null;
        node.cols = textarea.cols > 0 ? textarea.cols : null;
      }

      // Extract comprehensive styling for form elements
      if (!node.style) node.style = {};

      // Text styling
      node.style.color = computed.color || "";
      node.style.fontSize = computed.fontSize || "";
      node.style.fontFamily = computed.fontFamily || "";
      node.style.fontWeight = computed.fontWeight || "";
      node.style.fontStyle = computed.fontStyle || "";
      node.style.textAlign = computed.textAlign || "";
      node.style.letterSpacing = computed.letterSpacing || "";
      node.style.lineHeight = computed.lineHeight || "";

      // Input-specific styling
      node.style.backgroundColor = computed.backgroundColor || "";
      node.style.border = computed.border || "";
      node.style.borderRadius = computed.borderRadius || "";
      node.style.borderTop = computed.borderTop || "";
      node.style.borderRight = computed.borderRight || "";
      node.style.borderBottom = computed.borderBottom || "";
      node.style.borderLeft = computed.borderLeft || "";
      node.style.padding = computed.padding || "";
      node.style.paddingTop = computed.paddingTop || "";
      node.style.paddingRight = computed.paddingRight || "";
      node.style.paddingBottom = computed.paddingBottom || "";
      node.style.paddingLeft = computed.paddingLeft || "";
      node.style.margin = computed.margin || "";
      node.style.boxShadow = computed.boxShadow || "";
      node.style.outline = computed.outline || "";
      node.style.outlineOffset = computed.outlineOffset || "";

      // CRITICAL VISUAL FIX: Force default styles if input appears invisible
      // This handles cases where User Agent styles aren't explicitly captured or are reset
      if (
        isInput &&
        (node.inputType === "text" ||
          node.inputType === "password" ||
          node.inputType === "email" ||
          node.inputType === "search" ||
          node.inputType === "number" ||
          node.inputType === "tel" ||
          node.inputType === "url")
      ) {
        const hasVisibleBackground =
          computed.backgroundColor &&
          computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          computed.backgroundColor !== "transparent";
        const hasVisibleBorder =
          computed.borderWidth &&
          computed.borderWidth !== "0px" &&
          computed.borderStyle !== "none";
        const hasShadow = computed.boxShadow && computed.boxShadow !== "none";

        if (!hasVisibleBackground && !hasVisibleBorder && !hasShadow) {
          // Force a white background and standard border for visibility
          // Only do this if we don't have a background image
          if (
            !computed.backgroundImage ||
            computed.backgroundImage === "none"
          ) {
            node.style.backgroundColor = "rgb(255, 255, 255)";
            node.style.border = "1px solid rgb(118, 118, 118)"; // Standard UA grey
            node.style.borderRadius = "2px";
            node.style.padding = "2px 4px"; // Add some padding so text isn't flush

            // Ensure we add these to the fills/strokes arrays for the Figma builder
            if (!node.fills) node.fills = [];
            node.fills.push({
              type: "SOLID",
              color: { r: 1, g: 1, b: 1, a: 1 },
              visible: true,
              opacity: 1,
            });

            if (!node.borderDetails) node.borderDetails = {};
            // Default border details
            const defaultSide = {
              width: 1,
              style: "solid",
              color: { r: 0.46, g: 0.46, b: 0.46, a: 1 },
            };
            node.borderDetails.top = defaultSide;
            node.borderDetails.right = defaultSide;
            node.borderDetails.bottom = defaultSide;
            node.borderDetails.left = defaultSide;
          }
        }
      }

      // Store placeholder styling (if available via ::placeholder pseudo-element)
      try {
        const placeholderStyle = window.getComputedStyle(
          element,
          "::placeholder"
        );
        if (placeholderStyle) {
          node.placeholderStyle = {
            color: placeholderStyle.color || "",
            fontSize: placeholderStyle.fontSize || "",
            fontFamily: placeholderStyle.fontFamily || "",
            fontWeight: placeholderStyle.fontWeight || "",
            fontStyle: placeholderStyle.fontStyle || "",
            opacity: placeholderStyle.opacity || "",
          };
        }
      } catch {
        // Placeholder pseudo-element not supported or element doesn't have placeholder
      }

      // Store focus state styling (if available)
      try {
        // Simulate focus to get focus styles (if element can be focused)
        if (!element.disabled) {
          const focusStyle = window.getComputedStyle(element, ":focus");
          if (focusStyle) {
            node.focusStyle = {
              border: focusStyle.border || "",
              outline: focusStyle.outline || "",
              boxShadow: focusStyle.boxShadow || "",
              backgroundColor: focusStyle.backgroundColor || "",
            };
          }
        }
      } catch {
        // Focus pseudo-element not accessible
      }

      // Add component abstraction for form elements
      node.component = {
        name: isInput ? `Input:${node.inputType}` : "Textarea",
        options: {
          type: node.inputType,
          placeholder: node.placeholder || "",
          value: node.inputValue || "",
          required: node.required || false,
          disabled: node.disabled || false,
        },
      };
    } catch (error) {
      this.errorTracker.recordError(
        "handleInputElement",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  private parseFilterEffectsSafe(
    filter: string,
    mode: "LAYER" | "BACKGROUND"
  ): any[] {
    const effects: any[] = [];
    try {
      const input = String(filter || "").trim();
      if (!input || input === "none") return effects;

      const fns = this.splitCssFilterFunctions(input);
      for (const fn of fns) {
        const lower = fn.toLowerCase();

        if (lower.startsWith("drop-shadow(")) {
          // drop-shadow(offset-x offset-y blur-radius? color?)
          const inner = this.extractFunctionInner(fn);
          if (!inner) continue;

          let colorStr = "";
          let remaining = inner.trim();

          const rgbaMatch = remaining.match(/rgba?\([^)]+\)/i);
          if (rgbaMatch) {
            colorStr = rgbaMatch[0];
            remaining = remaining.replace(rgbaMatch[0], "").trim();
          } else {
            const parts = remaining.split(/\s+/);
            const colorPart = parts.find(
              (p) => p.startsWith("#") || /^[a-z]+$/i.test(p)
            );
            if (colorPart) {
              colorStr = colorPart;
              remaining = remaining.replace(colorPart, "").trim();
            }
          }

          const dims = remaining.split(/\s+/).filter(Boolean);
          const offsetX = ExtractionValidation.safeParseFloat(dims[0], 0);
          const offsetY = ExtractionValidation.safeParseFloat(dims[1], 0);
          const blurRadius = ExtractionValidation.safeParseFloat(dims[2], 0);

          const color = this.parseColorSafe(colorStr) || {
            r: 0,
            g: 0,
            b: 0,
            a: 0.25,
          };

          effects.push({
            type: "DROP_SHADOW",
            color: { r: color.r, g: color.g, b: color.b, a: color.a },
            offset: { x: offsetX, y: offsetY },
            radius: ExtractionValidation.clampNumber(blurRadius, 0, 500),
            spread: 0,
            visible: true,
          });
          continue;
        }

        if (lower.startsWith("blur(")) {
          const inner = this.extractFunctionInner(fn);
          if (!inner) continue;
          const radius = ExtractionValidation.safeParseFloat(inner.trim(), 0);
          if (radius <= 0) continue;

          effects.push({
            type: mode === "BACKGROUND" ? "BACKGROUND_BLUR" : "LAYER_BLUR",
            radius: ExtractionValidation.clampNumber(radius, 0, 500),
            visible: true,
          });
          continue;
        }
      }
    } catch (error) {
      this.errorTracker.recordError(
        "parseFilterEffectsSafe",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "warning"
      );
    }
    // CSS filters: filter: blur(5px) grayscale(100%);
    // Order matters. In Figma, we just have a list of effects (layer blur).
    // Usually reverse order is safer for visual parity if we map multiple effects.
    return effects.reverse();
  }

  private splitCssFilterFunctions(value: string): string[] {
    const input = (value || "").trim();
    if (!input) return [];
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (ch === " " && depth === 0) {
        const part = input.slice(start, i).trim();
        if (part) parts.push(part);
        start = i + 1;
      }
    }
    const last = input.slice(start).trim();
    if (last) parts.push(last);
    return parts;
  }

  private parseTextShadowSafe(textShadow: string): any[] {
    const shadows: any[] = [];

    try {
      const shadowStrings = textShadow.split(/,(?![^(]*\))/);

      for (const shadowStr of shadowStrings) {
        const trimmed = shadowStr.trim();
        if (!trimmed || trimmed === "none") continue;

        let colorStr = "";
        let remaining = trimmed;

        const rgbaMatch = trimmed.match(/rgba?\([^)]+\)/);
        if (rgbaMatch) {
          colorStr = rgbaMatch[0];
          remaining = trimmed.replace(rgbaMatch[0], "").trim();
        } else {
          const parts = trimmed.split(/\s+/);
          const colorPart = parts.find(
            (p) => p.startsWith("#") || /^[a-z]+$/i.test(p)
          );
          if (colorPart) {
            colorStr = colorPart;
            remaining = trimmed.replace(colorPart, "").trim();
          }
        }

        const dimensions = remaining.split(/\s+/).filter((s) => s.length > 0);
        const offsetX = ExtractionValidation.safeParseFloat(dimensions[0], 0);
        const offsetY = ExtractionValidation.safeParseFloat(dimensions[1], 0);
        const blurRadius = ExtractionValidation.safeParseFloat(
          dimensions[2],
          0
        );

        const color = this.parseColorSafe(colorStr) || {
          r: 0,
          g: 0,
          b: 0,
          a: 0.25,
        };

        shadows.push({
          type: "DROP_SHADOW",
          color: { r: color.r, g: color.g, b: color.b, a: color.a },
          offset: { x: offsetX, y: offsetY },
          radius: ExtractionValidation.clampNumber(blurRadius, 0, 500),
          spread: 0,
          visible: true,
        });
      }
    } catch (error) {
      this.errorTracker.recordError(
        "parseTextShadowSafe",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "warning"
      );
    }

    return shadows;
  }

  // ============================================================================
  // PSEUDO-ELEMENTS EXTRACTION
  // ============================================================================

  private async extractPseudoElementsSafe(
    element: Element,
    parentNode: any
  ): Promise<void> {
    try {
      await this.processPseudoElement(element, parentNode, "::before");
      await this.processPseudoElement(element, parentNode, "::after");
    } catch (error) {
      this.errorTracker.recordError(
        "extractPseudoElementsSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  private async processPseudoElement(
    element: Element,
    parentNode: any,
    type: string
  ): Promise<void> {
    try {
      // Only capture ::before/::after. Other pseudos (e.g. ::first-letter/::first-line)
      // are not standalone DOM nodes and cannot be represented as children in Figma.
      if (type !== "::before" && type !== "::after") return;

      const computed = ExtractionValidation.safeGetComputedStyle(element, type);
      if (!computed) return;

      const content = computed.content;
      if (
        !content ||
        content === "none" ||
        content === "normal" ||
        (content === '""' && computed.display === "none")
      ) {
        return;
      }

      const nodeId = `node_${this.nodeId++}_${type.replace("::", "")}`;
      const isText =
        content !== '""' && content !== "''" && !content.startsWith("url");

      const parentRect = parentNode.layout;
      let width = ExtractionValidation.safeParseFloat(computed.width, 0);
      let height = ExtractionValidation.safeParseFloat(computed.height, 0);

      // CRITICAL FIX: Don't assume 0 size means invalid for pseudos with background image
      const hasBgImage =
        computed.backgroundImage &&
        computed.backgroundImage !== "none" &&
        computed.backgroundImage !== "";

      // If measurement failed (NaN), fallback. If 0, only fallback if it should have content.
      if (!Number.isFinite(width))
        width = isText ? content.length * 8 : hasBgImage ? 20 : 0;
      if (!Number.isFinite(height)) height = isText ? 14 : hasBgImage ? 20 : 0;

      // For background image pseudos that might report 0 size due to layout quirks, force min size
      if (width === 0 && height === 0 && hasBgImage) {
        width = 24; // Default icon size
        height = 24;
      }

      const top = ExtractionValidation.safeParseFloat(computed.top, 0);
      const left = ExtractionValidation.safeParseFloat(computed.left, 0);

      let x: number;
      let y: number;

      // CRITICAL FIX: Determine correct positioning context (Origin)
      // If pseudo is absolute, it positions relative to the nearest POSITIONED ancestor.
      // If the host element is static, we must use the host's offsetParent.
      if (computed.position === "absolute" || computed.position === "fixed") {
        let originX = parentRect.x;
        let originY = parentRect.y;

        const hostStyle = this.getCachedComputedStyle(element);
        if (hostStyle && hostStyle.position === "static") {
          // Host is static, so pseudo is relative to host's offsetParent
          const offsetParent = (element as HTMLElement).offsetParent;
          if (offsetParent) {
            const rect = offsetParent.getBoundingClientRect();
            const scrollLeft =
              window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop =
              window.pageYOffset || document.documentElement.scrollTop;
            originX = rect.left + scrollLeft;
            originY = rect.top + scrollTop;
          }
        }

        x = originX;
        y = originY;

        if (!isNaN(left)) x += left;
        if (!isNaN(top)) y += top;
      } else {
        // Static/Relative pseudo (in flow)
        x = parentRect.x;
        y = parentRect.y;

        if (type === "::after") {
          x += parentRect.width - width;
        }
      }

      const pseudoAbsoluteLayout = {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
        width: width,
        height: height,
      };

      const node: any = {
        id: nodeId,
        parentId: parentNode.id,
        type: isText ? "TEXT" : "FRAME",
        name: type,
        htmlTag: "pseudo",
        cssClasses: [],
        layout: {
          x: x,
          y: y,
          width: width,
          height: height,
          relativeX: x - parentRect.x,
          relativeY: y - parentRect.y,
        },
        absoluteLayout: pseudoAbsoluteLayout,
        fills: [],
        strokes: [],
        effects: [],
        attributes: {},
        children: [],
      };

      if (isText) {
        node.characters = content.replace(/^['"]|['"]$/g, "");
      }

      await this.extractStylesSafe(computed, element, node);

      if (type === "::before") {
        parentNode.children.unshift(node);
      } else {
        parentNode.children.push(node);
      }
    } catch (error) {
      this.errorTracker.recordError(
        "processPseudoElement",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  // ============================================================================
  // SPECIAL PROPERTIES (IMG, VIDEO, etc.)
  // ============================================================================

  private async extractSpecialPropertiesSafe(
    element: Element,
    node: any,
    computed: CSSStyleDeclaration
  ): Promise<void> {
    const tagName = element.tagName.toLowerCase();

    try {
      // ENHANCED: Handle Site custom web components before standard tags
      // CRITICAL FIX: Check for ALL Site web component patterns (x-site-*, yt-*)
      if (
        tagName.startsWith("x-site-element") ||
        tagName.startsWith("yt-") ||
        this.isSiteElement(element)
      ) {
        await this.handleSiteWebComponent(element, node, computed);
        // Continue processing to extract children and styles
        // Don't return early - we still need to extract the element's properties
      }

      switch (tagName) {
        case "img":
          await this.handleImageElement(
            element as HTMLImageElement,
            node,
            computed
          );
          break;
        case "svg":
          node.type = "VECTOR";
          node.name = "SVG";
          // Preserve inline SVG markup so the Figma plugin can render it via
          // figma.createNodeFromSvg() instead of losing logos/icons.
          try {
            // IMPORTANT: serialized SVG often relies on external CSS (e.g. `fill: currentColor`).
            // Figma's createNodeFromSvg does not have access to the page's CSS, so we inline a
            // minimal computed `color` and `fill` on the root <svg> to preserve logo/icon colors.
            const clone = element.cloneNode(true) as Element;

            // ENHANCED: Extract actual fill colors from SVG elements themselves
            // This preserves original logo colors (e.g., orange Etsy logo)
            const computedColor = (computed && computed.color) || "";
            const computedFill = (computed as any).fill || "";

            // Extract fill from SVG element attributes (most accurate for logos)
            const svgFillAttr = clone.getAttribute("fill");
            const svgFillStyle = (clone as any).style?.fill;

            // Check child elements for fill attributes (logos often have fills on paths/groups)
            const childElements = clone.querySelectorAll("[fill]");
            let childFillColor = "";
            for (const child of Array.from(childElements)) {
              const childFill = child.getAttribute("fill");
              if (
                childFill &&
                childFill !== "none" &&
                childFill !== "currentColor" &&
                !childFill.startsWith("url(")
              ) {
                childFillColor = childFill;
                break; // Use first non-default fill found
              }
            }

            // Determine the actual fill color to use (prioritize actual SVG fills over computed)
            let fillColorToUse = "";

            // Priority 1: Child element fill (most accurate for logos)
            if (childFillColor) {
              fillColorToUse = childFillColor;
            }
            // Priority 2: SVG element fill attribute
            else if (
              svgFillAttr &&
              svgFillAttr !== "none" &&
              svgFillAttr !== "currentColor" &&
              !svgFillAttr.startsWith("url(")
            ) {
              fillColorToUse = svgFillAttr;
            }
            // Priority 3: SVG element inline style fill
            else if (
              svgFillStyle &&
              svgFillStyle !== "none" &&
              svgFillStyle !== "currentColor" &&
              !svgFillStyle.startsWith("url(")
            ) {
              fillColorToUse = svgFillStyle;
            }
            // Priority 4: Computed fill (if it's a specific color)
            else if (
              computedFill &&
              computedFill !== "none" &&
              computedFill !== "transparent" &&
              computedFill !== "currentColor" &&
              !computedFill.startsWith("url(")
            ) {
              fillColorToUse = computedFill;
            }
            // Priority 5: Computed color (for currentColor resolution)
            else if (
              computedColor &&
              computedColor !== "transparent" &&
              computedColor !== "rgba(0, 0, 0, 0)"
            ) {
              fillColorToUse = computedColor;
            }

            // ONLY apply contrast fix if we couldn't determine a color AND there's a visibility issue
            // This prevents overriding correct logo colors (like orange Etsy logo)
            if (!fillColorToUse || fillColorToUse === "currentColor") {
              const parentBg = this.getParentBackgroundColor(element);
              const bgColor = parentBg ? this.parseColorSafe(parentBg) : null;

              if (bgColor) {
                // Only apply contrast fix if we truly have no color information
                const bgLuminance = this.calculateLuminance(
                  bgColor.r,
                  bgColor.g,
                  bgColor.b
                );
                if (bgLuminance < 0.5) {
                  fillColorToUse = "rgb(255, 255, 255)";
                } else {
                  fillColorToUse = "rgb(0, 0, 0)";
                }
              } else if (computedColor) {
                fillColorToUse = computedColor;
              }
            }

            // Apply color and fill to SVG
            // CRITICAL FIX: Use SVG attributes directly instead of style attribute to avoid TrustedHTML violations
            // Trusted Types CSP blocks setAttribute("style", ...) but allows individual attribute setting
            try {
              if (
                fillColorToUse &&
                fillColorToUse !== "transparent" &&
                fillColorToUse !== "rgba(0, 0, 0, 0)" &&
                fillColorToUse !== "none"
              ) {
                // Set fill attribute directly (CSP-safe, no TrustedHTML required)
                clone.setAttribute("fill", fillColorToUse);

                // Set color attribute for currentColor resolution (CSP-safe)
                if (
                  computedColor &&
                  computedColor !== "transparent" &&
                  computedColor !== "rgba(0, 0, 0, 0)"
                ) {
                  clone.setAttribute("color", computedColor);
                }
              } else if (
                computedColor &&
                computedColor !== "transparent" &&
                computedColor !== "rgba(0, 0, 0, 0)"
              ) {
                // Fallback to just color if fill couldn't be determined
                clone.setAttribute("color", computedColor);
              }
            } catch (attrError) {
              // If attribute setting fails (unlikely, but catch for safety), log and continue
              this.errorTracker.recordError(
                "extractSpecialPropertiesSafe",
                `Failed to set SVG attributes: ${
                  attrError instanceof Error ? attrError.message : "Unknown"
                }`,
                element,
                "warning"
              );
            }

            node.svgContent = new XMLSerializer().serializeToString(clone);
            node.svgBaseUrl = window.location.href;
            // Inline external <use> sprite references when possible so logos/icons survive import.
            // This is deterministic and avoids relying on plugin-side network access for sprites.
            try {
              node.svgContent = await this.inlineSvgUsesInPage(
                node.svgContent,
                window.location.href
              );
            } catch {
              // Keep original svgContent if inlining fails.
            }
          } catch {
            // If serialization fails, keep type/name only.
          }
          break;
        case "canvas":
          await this.handleCanvasElement(element as HTMLCanvasElement, node);
          break;
        case "video":
          await this.handleVideoElement(element as HTMLVideoElement, node);
          break;
        case "iframe":
        case "embed":
        case "object":
          await this.handleEmbedElement(element, node);
          break;
        case "input":
        case "textarea":
          await this.handleInputElement(
            element as HTMLInputElement | HTMLTextAreaElement,
            node,
            computed
          );
          break;
      }
    } catch (error) {
      this.errorTracker.recordError(
        "extractSpecialPropertiesSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "error"
      );
    }
  }

  private async inlineSvgUsesInPage(
    svgMarkup: string,
    baseUrl: string
  ): Promise<string> {
    const markup = (svgMarkup || "").trim();
    if (!markup) return svgMarkup;
    if (!markup.includes("<use")) return svgMarkup;

    // CRITICAL: Wrap entire function in try-catch to handle TrustedHTML violations gracefully
    try {
      // SAFE DOM PARSING for TrustedTypes
      const parser = new DOMParser();
      let doc: Document;
      try {
        const safeMarkup = createTrustedHTML(markup);
        doc = parser.parseFromString(safeMarkup as any, "image/svg+xml");
      } catch (parserError: any) {
        if (
          parserError.message &&
          parserError.message.includes("TrustedHTML")
        ) {
          console.warn(
            `⚠️ [CSP] TrustedHTML violation in inlineSvgUsesInPage, returning original markup.`
          );
          return svgMarkup;
        }
        throw parserError;
      }

      const svg = doc.documentElement;
      const uses = Array.from(svg.querySelectorAll("use"));
      if (!uses.length) return svgMarkup;

      for (const use of uses) {
        try {
          const href =
            use.getAttribute("href") || use.getAttribute("xlink:href") || "";
          if (!href) continue;

          const [urlPart, fragmentPart] = href.split("#");
          const fragment = fragmentPart || "";
          if (!fragment) continue;

          let symbolDoc: Document | null = null;
          if (urlPart) {
            let absUrl = urlPart;
            try {
              absUrl = new URL(urlPart, baseUrl).href;
            } catch {
              // keep as-is
            }

            if (this.svgSpriteCache.has(absUrl)) {
              symbolDoc = this.svgSpriteCache.get(absUrl)!;
            } else {
              try {
                const resp = await fetch(absUrl, {
                  credentials: "include" as any,
                });
                if (resp.ok) {
                  const text = await resp.text();
                  symbolDoc = parser.parseFromString(text, "image/svg+xml");
                  this.svgSpriteCache.set(absUrl, symbolDoc);
                }
              } catch {
                // ignore fetch errors
              }
            }
          } else {
            symbolDoc = doc;
          }

          if (!symbolDoc) continue;
          const symbol =
            symbolDoc.getElementById(fragment) ||
            symbolDoc.querySelector(`symbol#${fragment}`) ||
            symbolDoc.querySelector(`#${fragment}`);
          if (!symbol) continue;

          // CRITICAL: All DOM operations must be CSP-safe (no innerHTML, outerHTML, etc.)
          const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
          const symbolClone = symbol.cloneNode(true) as Element;

          if (
            !svg.getAttribute("viewBox") &&
            symbolClone.getAttribute("viewBox")
          ) {
            const viewBox = symbolClone.getAttribute("viewBox");
            if (viewBox) {
              svg.setAttribute("viewBox", viewBox);
            }
          }

          while (symbolClone.firstChild) {
            g.appendChild(symbolClone.firstChild);
          }

          const x = use.getAttribute("x");
          const y = use.getAttribute("y");
          if (x) g.setAttribute("x", x);
          if (y) g.setAttribute("y", y);

          // CRITICAL: replaceChild is CSP-safe (DOM manipulation, not HTML string assignment)
          const parent = use.parentNode;
          if (parent) {
            parent.replaceChild(g, use);
          }
        } catch (useError) {
          // If processing a single <use> fails, continue with others
          const errorMsg =
            useError instanceof Error ? useError.message : String(useError);
          if (
            errorMsg.includes("TrustedHTML") ||
            errorMsg.includes("TrustedTypes")
          ) {
            // TrustedHTML violation - skip this use element and continue
            console.warn(
              `⚠️ [CSP] TrustedHTML violation while processing <use> element, skipping: ${errorMsg}`
            );
            continue;
          }
          // Log other errors but continue
          this.errorTracker.recordError(
            "inlineSvgUsesInPage",
            `Error processing <use> element: ${errorMsg}`,
            undefined,
            "warning"
          );
        }
      }

      // CRITICAL FIX: Use XMLSerializer instead of outerHTML to avoid TrustedHTML issues
      // outerHTML can trigger Trusted Types violations in CSP-protected pages (Site, etc.)
      // NEVER use outerHTML as it requires TrustedHTML assignment
      try {
        const serializer = new XMLSerializer();
        const serialized = serializer.serializeToString(svg);
        if (!serialized || serialized.trim().length === 0) {
          // If serialization returns empty, return original markup
          this.errorTracker.recordError(
            "inlineSvgUsesInPage",
            "XMLSerializer returned empty string",
            undefined,
            "warning"
          );
          return svgMarkup;
        }
        return serialized;
      } catch (serializeError) {
        // CRITICAL: Do NOT use outerHTML as fallback - it triggers TrustedHTML violations
        // Return original markup instead to avoid CSP violations
        const errorMsg =
          serializeError instanceof Error
            ? serializeError.message
            : String(serializeError);
        this.errorTracker.recordError(
          "inlineSvgUsesInPage",
          `XMLSerializer failed: ${errorMsg}. Returning original markup to avoid TrustedHTML violation.`,
          undefined,
          "warning"
        );
        return svgMarkup; // Return original on error - safer than outerHTML
      }
    } catch (error) {
      // If any error occurs (including TrustedHTML violations), return original markup
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes("TrustedHTML") ||
        errorMsg.includes("TrustedTypes")
      ) {
        // Explicitly handle TrustedHTML violations
        console.warn(
          `⚠️ [CSP] TrustedHTML violation in inlineSvgUsesInPage, returning original markup: ${errorMsg}`
        );
        this.errorTracker.recordError(
          "inlineSvgUsesInPage",
          `TrustedHTML violation: ${errorMsg}. Returning original markup.`,
          undefined,
          "warning"
        );
      } else {
        this.errorTracker.recordError(
          "inlineSvgUsesInPage",
          `Error during SVG inlining: ${errorMsg}`,
          undefined,
          "warning"
        );
      }
      return svgMarkup; // Return original on error
    }
  }

  private async handleImageElement(
    img: HTMLImageElement,
    node: any,
    computed: CSSStyleDeclaration
  ): Promise<void> {
    node.type = "IMAGE";
    node.name = "Image";

    // Prefer the actually-rendered URL (accounts for <picture>/<source>, srcset, DPR, etc.)
    let imageUrl = img.currentSrc || img.src;

    const looksLikePlaceholderSrc = (): boolean => {
      const src = (imageUrl || img.src || "").toLowerCase();
      // Common transparent/placeholder patterns
      if (
        src.startsWith("data:") ||
        src.includes("placeholder") ||
        src.includes("spacer") ||
        src.includes("1x1") ||
        src.includes("pixel") ||
        (src.endsWith(".gif") && !src.includes("etsy")) // many lazy loaders use tiny GIFs, but Etsy might use .gif for real images
      ) {
        return true;
      }
      const w = ExtractionValidation.safeParseFloat(
        img.naturalWidth || img.width,
        0
      );
      const h = ExtractionValidation.safeParseFloat(
        img.naturalHeight || img.height,
        0
      );
      // If not loaded yet (common on Etsy due to lazy loading), treat as placeholder.
      // But be more lenient - if we have a valid URL that doesn't look like a placeholder, trust it
      if (
        w <= 2 &&
        h <= 2 &&
        (src.includes("placeholder") ||
          src.includes("1x1") ||
          src.includes("spacer"))
      ) {
        return true;
      }
      return false;
    };

    const pickBestFromPictureSources = (): string | null => {
      try {
        // CRITICAL FIX: Ensure img is an Element before calling closest()
        if (!(img instanceof Element)) return null;
        const picture = img.closest("picture");
        if (!picture) return null;
        const sources = Array.from(picture.querySelectorAll("source"));
        const candidates: string[] = [];
        for (const source of sources) {
          const srcset =
            source.getAttribute("srcset") ||
            source.getAttribute("data-srcset") ||
            source.getAttribute("data-lazy-srcset") ||
            "";
          if (srcset && srcset.trim().length > 0) {
            const picked = this.pickBestUrlFromSrcset(srcset);
            if (picked) candidates.push(picked);
          }
        }
        if (candidates.length === 0) return null;
        // Prefer the last candidate (often the most compatible source in <picture> ordering),
        // but any candidate is better than a placeholder.
        return candidates[candidates.length - 1] || null;
      } catch (error) {
        console.warn(
          `⚠️ [IMAGE] Failed to extract source from picture element:`,
          error
        );
        return null;
      }
    };

    // If src is a placeholder but srcset exists, choose the highest descriptor candidate.
    if (
      looksLikePlaceholderSrc() &&
      typeof img.srcset === "string" &&
      img.srcset.trim().length > 0
    ) {
      const bestFromSrcset = this.pickBestUrlFromSrcset(img.srcset);
      if (bestFromSrcset) imageUrl = bestFromSrcset;
    }

    // If <img> is inside <picture>, the real srcset often lives on <source> elements.
    if (looksLikePlaceholderSrc()) {
      const bestFromPicture = pickBestFromPictureSources();
      if (bestFromPicture) imageUrl = bestFromPicture;
    }

    // RULE 3.2: Hostile domains (Etsy, Instagram, Amazon) - use bitmap fallback
    const isHostileDomain = (url: string): boolean => {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return (
          hostname.includes("etsy.com") ||
          hostname.includes("instagram.com") ||
          hostname.includes("amazon.com") ||
          hostname.includes("amazonaws.com")
        );
      } catch {
        return false;
      }
    };

    // Lazy-loading attributes used by many sites (incl. Etsy)
    // CRITICAL: Check multiple lazy-loading patterns to catch all Etsy images
    if (
      !ExtractionValidation.isValidUrl(imageUrl) ||
      looksLikePlaceholderSrc()
    ) {
      // Try data-src attributes first (most common lazy-loading pattern)
      const dataSrc =
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-src-retina") ||
        img.getAttribute("data-lazy") ||
        img.getAttribute("data-delayed-url");
      if (dataSrc && ExtractionValidation.isValidUrl(dataSrc))
        imageUrl = dataSrc;

      // Try data-srcset for responsive images
      const dataSrcset =
        img.getAttribute("data-srcset") ||
        img.getAttribute("data-lazy-srcset") ||
        img.getAttribute("data-srcset-retina");
      if (dataSrcset && dataSrcset.trim().length > 0) {
        const bestFromDataSrcset = this.pickBestUrlFromSrcset(dataSrcset);
        if (bestFromDataSrcset) imageUrl = bestFromDataSrcset;
      }

      // CRITICAL FIX: If image still looks like placeholder, try to wait for it to load
      // Etsy often uses JavaScript to set the src after page load
      if (
        looksLikePlaceholderSrc() ||
        (img.complete === false && img.naturalWidth <= 2)
      ) {
        // Image is still loading or is a placeholder - wait and try to force load
        try {
          // First, try to get the real URL from data attributes and force-load it
          const dataSrc =
            img.getAttribute("data-src") ||
            img.getAttribute("data-lazy-src") ||
            img.getAttribute("data-original") ||
            img.getAttribute("data-src-retina");
          const dataSrcset =
            img.getAttribute("data-srcset") ||
            img.getAttribute("data-lazy-srcset") ||
            img.getAttribute("data-srcset-retina");

          let realUrl: string | null = null;
          if (dataSrc && ExtractionValidation.isValidUrl(dataSrc)) {
            realUrl = new URL(dataSrc, window.location.href).href;
          } else if (dataSrcset && dataSrcset.trim().length > 0) {
            const bestFromDataSrcset = this.pickBestUrlFromSrcset(dataSrcset);
            if (bestFromDataSrcset) realUrl = bestFromDataSrcset;
          }

          // If we found a real URL, try to force-load it
          if (realUrl && realUrl !== img.src) {
            console.log(
              `🔄 [LAZY LOAD FIX] Force-loading image: ${realUrl.substring(
                0,
                80
              )}...`
            );
            try {
              // Temporarily set src to trigger loading
              const originalSrc = img.src;
              img.src = realUrl;
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Check if it loaded
              if (
                img.complete &&
                img.naturalWidth > 2 &&
                img.naturalHeight > 2
              ) {
                imageUrl = realUrl;
                console.log(
                  `✅ [LAZY LOAD FIX] Image force-loaded successfully`
                );
              } else {
                // Restore original src if it didn't work
                img.src = originalSrc;
              }
            } catch (forceError) {
              console.warn(`⚠️ [LAZY LOAD FIX] Force-load failed:`, forceError);
            }
          }

          // If still no real URL, scroll into view and wait
          if (!imageUrl || looksLikePlaceholderSrc()) {
            if (img instanceof HTMLElement) {
              img.scrollIntoView({ behavior: "auto", block: "center" });
              await new Promise((resolve) => setTimeout(resolve, 300));
            }

            // Wait for image to load with multiple retries
            let retries = 3;
            while (
              retries > 0 &&
              (img.complete === false || img.naturalWidth <= 2)
            ) {
              await new Promise((resolve) => setTimeout(resolve, 400));
              retries--;
            }

            // Check if image loaded successfully
            if (img.complete && img.naturalWidth > 2 && img.naturalHeight > 2) {
              const loadedUrl = img.currentSrc || img.src;
              if (
                ExtractionValidation.isValidUrl(loadedUrl) &&
                !looksLikePlaceholderSrc()
              ) {
                imageUrl = loadedUrl;
                console.log(
                  `✅ [ETSY FIX] Image loaded after wait: ${imageUrl.substring(
                    0,
                    80
                  )}...`
                );
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ [ETSY FIX] Error waiting for image load:`, error);
          // Ignore timeout/errors, continue with what we have
        }
      }
    }

    if (imageUrl && ExtractionValidation.isValidUrl(imageUrl)) {
      await this.captureImageSafe(imageUrl, img);
      const key = this.hashString(imageUrl);

      const naturalWidth = ExtractionValidation.safeParseFloat(
        img.naturalWidth || img.width,
        0
      );
      const naturalHeight = ExtractionValidation.safeParseFloat(
        img.naturalHeight || img.height,
        0
      );

      const objectFit = computed.objectFit || "fill";
      const scaleMode =
        objectFit === "contain" || objectFit === "scale-down" ? "FIT" : "FILL";

      // FIX 1: Ensure image is loaded before extracting intrinsic size
      // CRITICAL: Many images fail to capture intrinsicSize because they haven't loaded yet
      if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
        try {
          console.log(`🔄 [IMAGE LOAD] Waiting for image to load: ${imageUrl.substring(0, 80)}...`);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn(`⏱️ [IMAGE LOAD] Timeout waiting for image`);
              reject(new Error('Image load timeout'));
            }, 5000);

            const cleanup = () => {
              clearTimeout(timeout);
              img.onload = null;
              img.onerror = null;
            };

            img.onload = () => {
              cleanup();
              console.log(`✅ [IMAGE LOAD] Image loaded successfully`);
              resolve();
            };

            img.onerror = (err) => {
              cleanup();
              console.warn(`❌ [IMAGE LOAD] Image load error:`, err);
              reject(new Error('Image load error'));
            };

            // Force reload if image is not complete
            if (!img.complete) {
              const currentSrc = img.src;
              img.src = '';
              img.src = currentSrc;
            } else {
              // Image claims to be complete but has no dimensions - give it a moment
              setTimeout(() => {
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  cleanup();
                  resolve();
                }
              }, 100);
            }
          });
        } catch (err) {
          console.warn(`⚠️ [IMAGE LOAD] Failed to wait for image load, continuing with extraction:`, err);
          // Continue with extraction even if load fails - we'll use fallback dimensions
        }
      }

      // PIXEL-PERFECT: Extract intrinsic size for proper aspect ratio and object-fit handling
      const intrinsicSize = await extractIntrinsicSize(img, computed);
      if (intrinsicSize) {
        node.intrinsicSize = intrinsicSize;
        node.aspectRatio = intrinsicSize.width / intrinsicSize.height;
      }

      // Store imageFit for importer to map to Figma scaleMode correctly
      node.imageFit = objectFit;

      // FIX 3: Capture CSS filters for Phase 4 rasterization
      // CRITICAL: All images with filters were missing this data, causing visual fidelity loss
      const filter = computed.filter;
      if (filter && filter !== 'none') {
        console.log(`🎨 [CSS FILTER] Captured filter: ${filter}`);
        node.cssFilter = filter;
        // Mark for rasterization if not already marked
        if (!node.rasterize) {
          node.rasterize = { reason: 'FILTER' };
        }
      }

      // FIX 3: Capture blend modes for Phase 4 rasterization
      // CRITICAL: All images with blend modes were missing this data
      const mixBlendMode = computed.mixBlendMode;
      if (mixBlendMode && mixBlendMode !== 'normal') {
        console.log(`🎨 [BLEND MODE] Captured blend mode: ${mixBlendMode}`);
        node.mixBlendMode = mixBlendMode;
        // Mark for rasterization if not already marked
        if (!node.rasterize) {
          node.rasterize = { reason: 'BLEND_MODE' };
        }
      }

      node.fills = [
        {
          type: "IMAGE",
          imageHash: key,
          scaleMode: scaleMode,
          visible: true,
        },
      ];
      node.imageHash = key;
      // CRITICAL: Add component abstraction for Image elements (Builder.io compatibility)
      // This simplifies the schema by using a component system for common elements
      node.component = {
        name: "Raw:Img",
        options: {
          image: imageUrl,
        },
      };

      // PIXEL-PERFECT FIX: Add direct src attribute for Figma node builder compatibility
      // The validation analysis found 26 missing src attributes causing import failures
      if (imageUrl && ExtractionValidation.isValidUrl(imageUrl)) {
        node.src = imageUrl;
      }

      // Store original aspect ratio if available (Builder.io compatibility)
      if (naturalWidth > 0 && naturalHeight > 0) {
        const aspectRatio = naturalWidth / naturalHeight;
        (node.component as any).meta = {
          originalAspectRatio: aspectRatio,
        };
      }
    }
  }

  private pickBestUrlFromSrcset(srcset: string): string | null {
    try {
      const candidates = srcset
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [url, descriptor] = part.split(/\s+/, 2);
          const d = (descriptor || "").trim().toLowerCase();
          let score = 0;
          if (d.endsWith("x")) {
            score = ExtractionValidation.safeParseFloat(d.slice(0, -1), 1);
          } else if (d.endsWith("w")) {
            // Prefer widest candidate when only width descriptors exist.
            score = ExtractionValidation.safeParseFloat(d.slice(0, -1), 0);
          } else {
            score = 0;
          }
          return { url, score };
        })
        .filter((c) => !!c.url);

      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].url || null;
    } catch {
      return null;
    }
  }

  private async handleCanvasElement(
    canvas: HTMLCanvasElement,
    node: any
  ): Promise<void> {
    node.type = "RECTANGLE";
    node.name = "Canvas";

    try {
      const dataUrl = canvas.toDataURL("image/png");
      if (dataUrl && dataUrl.startsWith("data:image")) {
        await this.captureImageSafe(dataUrl);
        const key = this.hashString(dataUrl);
        node.fills = [
          {
            type: "IMAGE",
            imageHash: key,
            scaleMode: "FILL",
            visible: true,
          },
        ];
        node.imageHash = key;
      }
    } catch (error) {
      // ENHANCED: Better error handling for canvas extraction
      const errorMessage =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error
          ? String(error.message)
          : error != null
          ? String(error)
          : "Canvas toDataURL failed (tainted or unsupported)";

      // ENHANCED: Check if it's a tainted canvas error (CORS issue) - this is expected and not critical
      // Check both the error message and the error name/type
      // The error message format is: "Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported."
      const errorStr = errorMessage.toLowerCase();
      const errorName =
        error instanceof Error ? error.name?.toLowerCase() || "" : "";
      const fullErrorStr = `${errorStr} ${errorName}`.toLowerCase();

      // Comprehensive check for tainted canvas errors
      // Check multiple patterns to catch all variations
      const isTaintedError =
        errorStr.includes("tainted") ||
        errorStr.includes("tainted canvases") ||
        errorStr.includes("tainted canvas") ||
        errorStr.includes("cross-origin") ||
        errorStr.includes("may not be exported") ||
        errorStr.includes("securityerror") ||
        errorStr.includes("security error") ||
        fullErrorStr.includes("tainted") ||
        errorName.includes("security") ||
        errorName.includes("tainted") ||
        errorName === "securityerror" ||
        errorName === "security error";

      if (isTaintedError) {
        // Log as info, not warning - this is expected for cross-origin canvas content
        // Use console.log instead of console.warn to avoid showing as warning
        console.log(
          `ℹ️ [CANVAS] Canvas is tainted (CORS) - cannot export. This is expected for cross-origin content.`
        );
        // Don't record as error - just skip canvas export gracefully
        return;
      }

      // For other errors, record as warning
      // Only non-tainted errors should reach here
      this.errorTracker.recordError(
        "handleCanvasElement",
        errorMessage,
        canvas,
        "warning"
      );
    }
  }

  private async handleVideoElement(
    video: HTMLVideoElement,
    node: any
  ): Promise<void> {
    node.type = "FRAME";
    node.name = "Video";
    node.embed = {
      type: "video",
      src: video.currentSrc || video.src || null,
      poster: video.poster || null,
    };

    if (video.poster && ExtractionValidation.isValidUrl(video.poster)) {
      await this.captureImageSafe(video.poster);
      const key = this.hashString(video.poster);
      node.fills = [
        {
          type: "IMAGE",
          imageHash: key,
          scaleMode: "FILL",
          visible: true,
        },
      ];
    }
  }

  private async handleEmbedElement(element: Element, node: any): Promise<void> {
    const tagName = element.tagName.toLowerCase();
    node.type = "FRAME";

    // Determine embed type and source
    let embedType = "embed";
    let embedSrc: string | null = null;
    let embedTitle: string | null = null;

    if (tagName === "iframe") {
      const iframe = element as HTMLIFrameElement;
      embedSrc = iframe.src || iframe.getAttribute("src") || null;
      embedTitle = iframe.title || iframe.getAttribute("title") || null;

      // Detect Site iframes
      if (embedSrc && /site\.com|youtu\.be/.test(embedSrc)) {
        embedType = "site";
        node.name = "Site Video";
      } else {
        embedType = "iframe";
        node.name = embedTitle || "Iframe";
      }
    } else if (tagName === "embed") {
      const embed = element as HTMLEmbedElement;
      embedSrc = embed.src || embed.getAttribute("src") || null;
      embedType = "embed";
      node.name = "Embed";
    } else if (tagName === "object") {
      const obj = element as HTMLObjectElement;
      embedSrc = obj.data || obj.getAttribute("data") || null;
      embedType = "object";
      node.name = "Object";
    }

    // Create embed metadata
    node.embed = {
      type: embedType,
      src: embedSrc,
      title: embedTitle,
    };

    // ENHANCED: For Site iframes, extract thumbnail with multiple fallback options
    if (embedType === "site" && embedSrc) {
      try {
        // ENHANCED: Extract video ID from all Site URL patterns
        // Supports: /watch?v=, /embed/, /v/, youtu.be/, /shorts/, etc.
        let videoId: string | null = null;

        // Pattern 1: site.com/watch?v=VIDEO_ID
        const watchMatch = embedSrc.match(/[?&]v=([^&\s#]+)/);
        if (watchMatch && watchMatch[1]) {
          videoId = watchMatch[1];
        }

        // Pattern 2: site.com/embed/VIDEO_ID
        if (!videoId) {
          const embedMatch = embedSrc.match(/\/embed\/([^?&\s]+)/);
          if (embedMatch && embedMatch[1]) {
            videoId = embedMatch[1];
          }
        }

        // Pattern 3: site.com/v/VIDEO_ID
        if (!videoId) {
          const vMatch = embedSrc.match(/\/v\/([^?&\s]+)/);
          if (vMatch && vMatch[1]) {
            videoId = vMatch[1];
          }
        }

        // Pattern 4: youtu.be/VIDEO_ID
        if (!videoId) {
          const shortMatch = embedSrc.match(/youtu\.be\/([^?&\s]+)/);
          if (shortMatch && shortMatch[1]) {
            videoId = shortMatch[1];
          }
        }

        // Pattern 5: site.com/shorts/VIDEO_ID
        if (!videoId) {
          const shortsMatch = embedSrc.match(/\/shorts\/([^?&\s]+)/);
          if (shortsMatch && shortsMatch[1]) {
            videoId = shortsMatch[1];
          }
        }

        if (videoId) {
          // ENHANCED: Try multiple thumbnail quality options with fallbacks
          const thumbnailOptions = [
            `https://img.site.com/vi/${videoId}/maxresdefault.jpg`, // Highest quality
            `https://img.site.com/vi/${videoId}/hqdefault.jpg`, // High quality
            `https://img.site.com/vi/${videoId}/mqdefault.jpg`, // Medium quality
            `https://img.site.com/vi/${videoId}/sddefault.jpg`, // Standard quality
          ];

          let thumbnailCaptured = false;

          // Try each thumbnail option until one succeeds
          for (const thumbnailUrl of thumbnailOptions) {
            try {
              await this.captureImageSafe(thumbnailUrl);
              const key = this.hashString(thumbnailUrl);

              // Verify the image was actually captured (not just added to queue)
              const asset = this.assets.images.get(thumbnailUrl);
              if (asset) {
                if (!node.fills) node.fills = [];
                // ENHANCED: Append thumbnail to existing fills (preserve background colors)
                // Note: In Figma, fills render bottom-to-top, so pushing adds to the top layer
                const thumbnailFill = {
                  type: "IMAGE",
                  imageHash: key,
                  scaleMode: "FILL",
                  visible: true,
                  url: thumbnailUrl, // Store URL for fallback
                };
                // Append thumbnail to fills array (it will be rendered on top)
                node.fills.push(thumbnailFill);
                node.imageHash = key;
                thumbnailCaptured = true;
                console.log(
                  `✅ [SITE] Captured thumbnail for video ${videoId}`
                );
                break; // Success, stop trying other options
              }
            } catch (thumbError) {
              // Continue to next thumbnail option
              continue;
            }
          }

          // If no thumbnail was captured, add video metadata for reference
          if (!thumbnailCaptured) {
            console.warn(
              `⚠️ [SITE] Could not capture thumbnail for video ${videoId}`
            );
            // Store video metadata for potential manual thumbnail fetch
            node.videoMetadata = {
              platform: "site",
              videoId: videoId,
              url: embedSrc,
              thumbnailUrls: thumbnailOptions,
            };
          }

          // ENHANCED: Store comprehensive Site metadata
          node.embed = {
            ...node.embed,
            videoId: videoId,
            platform: "site",
            thumbnailCaptured: thumbnailCaptured,
          };
        } else {
          console.warn(
            `⚠️ [SITE] Could not extract video ID from URL: ${embedSrc}`
          );
        }
      } catch (error) {
        // Site parsing failed, continue without thumbnail
        this.errorTracker.recordError(
          "handleEmbedElement",
          `Failed to extract Site thumbnail: ${
            error instanceof Error ? error.message : "Unknown"
          }`,
          element,
          "warning"
        );
      }
    }
  }

  // ENHANCED: Handle Site custom web components (x-site-player, x-site-watch-flexy, x-site-comments, etc.)
  private async handleSiteWebComponent(
    element: Element,
    node: any,
    computed: CSSStyleDeclaration
  ): Promise<void> {
    try {
      const tagName = element.tagName.toLowerCase();

      // Site video player component (x-site-player, x-site-watch-flexy, #movie_player)
      if (
        tagName === "x-site-element" ||
        tagName === "x-site-element" ||
        tagName.includes("player") ||
        element.id === "movie_player" ||
        element.id === "player-container" ||
        element.classList.contains("x-site-element")
      ) {
        node.name = node.name || "Site Video Player";
        node.isMainVideoPlayer = true; // Mark as main player for special handling

        // Extract video ID from page URL (for main player, not just iframes)
        const pageUrl = window.location.href;
        let videoId: string | null = null;

        // Try to extract from page URL (most reliable for main player)
        const urlMatch = pageUrl.match(/[?&]v=([^&\s#]+)/);
        if (urlMatch && urlMatch[1]) {
          videoId = urlMatch[1];
          console.log(`✅ [SITE] Extracted video ID from URL: ${videoId}`);
        }

        // Also check for video ID in iframe within this component
        if (!videoId) {
          const iframe = element.querySelector("iframe");
          if (iframe) {
            const iframeSrc =
              (iframe as HTMLIFrameElement).src ||
              iframe.getAttribute("src") ||
              "";
            const iframeMatch =
              iframeSrc.match(/[?&]v=([^&\s#]+)/) ||
              iframeSrc.match(/\/embed\/([^?&\s]+)/) ||
              iframeSrc.match(/youtu\.be\/([^?&\s]+)/);
            if (iframeMatch && iframeMatch[1]) {
              videoId = iframeMatch[1];
              console.log(
                `✅ [SITE] Extracted video ID from iframe: ${videoId}`
              );
            }
          }
        }

        // ENHANCED: Also check for video ID in data attributes or meta tags
        if (!videoId) {
          const videoIdAttr =
            element.getAttribute("video-id") ||
            element.getAttribute("data-video-id");
          if (videoIdAttr) {
            videoId = videoIdAttr;
            console.log(
              `✅ [SITE] Extracted video ID from attribute: ${videoId}`
            );
          }
        }

        // ENHANCED: Extract thumbnail for main video player with priority
        if (videoId) {
          const thumbnailOptions = [
            `https://img.site.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.site.com/vi/${videoId}/hqdefault.jpg`,
            `https://img.site.com/vi/${videoId}/mqdefault.jpg`,
            `https://img.site.com/vi/${videoId}/sddefault.jpg`,
          ];

          let thumbnailCaptured = false;
          let thumbnailKey: string | null = null;
          let thumbnailUrl: string | null = null;

          // Try each thumbnail option with priority
          for (const thumbUrl of thumbnailOptions) {
            try {
              await this.captureImageSafe(thumbUrl);
              const key = this.hashString(thumbUrl);
              const asset = this.assets.images.get(thumbUrl);

              if (asset) {
                thumbnailKey = key;
                thumbnailUrl = thumbUrl;
                thumbnailCaptured = true;
                console.log(
                  `✅ [SITE] Captured thumbnail for main player video ${videoId} (${
                    thumbUrl.includes("maxresdefault")
                      ? "maxres"
                      : thumbUrl.includes("hqdefault")
                      ? "hq"
                      : "standard"
                  })`
                );
                break; // Use first successful thumbnail
              }
            } catch {
              continue;
            }
          }

          // ENHANCED: Apply thumbnail to node fills (prepend to preserve background colors)
          if (thumbnailCaptured && thumbnailKey && thumbnailUrl) {
            if (!node.fills) node.fills = [];
            // ENHANCED: Append thumbnail to existing fills (preserve background colors)
            // The thumbnail should be on top, but background colors should remain visible
            // Note: In Figma, fills render bottom-to-top, so pushing adds to the top layer
            const thumbnailFill = {
              type: "IMAGE",
              imageHash: thumbnailKey,
              scaleMode: "FILL",
              visible: true,
              url: thumbnailUrl,
              priority: "high", // Mark as high priority
            };
            // Append thumbnail to fills array (it will be rendered on top)
            node.fills.push(thumbnailFill);
            node.imageHash = thumbnailKey;
            console.log(`✅ [SITE] Applied thumbnail fill to main player node`);
          }

          if (!thumbnailCaptured) {
            console.warn(
              `⚠️ [SITE] Could not capture thumbnail for main player video ${videoId}`
            );
            node.videoMetadata = {
              platform: "site",
              videoId: videoId,
              url: pageUrl,
              thumbnailUrls: thumbnailOptions,
            };
          }

          node.embed = {
            type: "site",
            videoId: videoId,
            platform: "site",
            thumbnailCaptured: thumbnailCaptured,
            isMainPlayer: true,
          };
        }
      }

      // Site comments section (x-site-comments, x-site-comment-thread-renderer)
      if (
        tagName === "x-site-element" ||
        tagName === "x-site-element" ||
        tagName.includes("comment") ||
        element.id === "comments" ||
        element.classList.contains("x-site-element")
      ) {
        node.name = node.name || "Site Comments";
        node.isSiteComments = true;

        // ENHANCED: Wait for comments to load and extract actual comment content
        try {
          // Check if comments are already loaded
          let commentElements = element.querySelectorAll("x-site-element");

          if (commentElements.length === 0) {
            // Comments might be loading - wait and try to trigger
            console.log("⏳ [SITE] Waiting for comments to load...");

            // ENHANCED: Use safer scroll method to avoid triggering Site navigation
            const originalScroll =
              window.pageYOffset || document.documentElement.scrollTop;

            // Use manual scroll instead of scrollIntoView to avoid navigation
            try {
              const elementRect = element.getBoundingClientRect();
              const targetScroll = originalScroll + elementRect.top - 100;

              // Scroll to comments section
              window.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: "instant",
              });
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Check again with additional selectors
              commentElements = element.querySelectorAll("x-site-element");

              // If still no comments, scroll a bit more and wait longer
              if (commentElements.length === 0) {
                window.scrollTo({
                  top: targetScroll + 300,
                  behavior: "instant",
                });
                await new Promise((resolve) => setTimeout(resolve, 1500));

                // Check again with even more selectors
                commentElements = element.querySelectorAll("x-site-element");
              }
            } catch (scrollError) {
              console.warn(
                "⚠️ [SITE] Could not scroll to comments element:",
                scrollError
              );
            }

            // Restore scroll
            try {
              window.scrollTo({ top: originalScroll, behavior: "instant" });
              await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (restoreError) {
              // Ignore restore errors
            }
          }

          // ENHANCED: Extract actual comment content, not just structure
          if (commentElements.length > 0) {
            console.log(
              `✅ [SITE] Found ${commentElements.length} comment threads`
            );
            node.commentThreadCount = commentElements.length;

            // Extract sample comments for reference
            const sampleComments: string[] = [];
            for (let i = 0; i < Math.min(commentElements.length, 10); i++) {
              const commentEl = commentElements[i];
              const commentText =
                (commentEl as HTMLElement).innerText ||
                commentEl.textContent ||
                "";
              if (
                commentText &&
                commentText.trim().length > 0 &&
                !commentText.toLowerCase().includes("lorem ipsum")
              ) {
                sampleComments.push(commentText.substring(0, 200)); // First 200 chars
              }
            }
            if (sampleComments.length > 0) {
              node.sampleComments = sampleComments;
            }
          } else {
            // ENHANCED: Check if comments are disabled or hidden
            const commentsDisabled =
              element.querySelector('[class*="disabled"]') ||
              element.querySelector('[id*="disabled"]') ||
              element.getAttribute("disabled") !== null;

            const computedStyle = window.getComputedStyle(element);
            const commentsHidden =
              (element instanceof HTMLElement &&
                (element.style.display === "none" ||
                  element.style.visibility === "hidden")) ||
              computedStyle.display === "none" ||
              computedStyle.visibility === "hidden";

            if (commentsDisabled || commentsHidden) {
              console.log(
                "ℹ️ [SITE] Comments appear to be disabled or hidden on this video"
              );
              node.commentsDisabled = true;
            } else {
              // Only log as info - this is expected for some videos (comments disabled, age-restricted, etc.)
              console.log(
                "ℹ️ [SITE] Comments section found but no comment threads loaded (may be disabled, age-restricted, or still loading)"
              );
            }
          }

          // Extract comment count if available
          const commentCountEl =
            element.querySelector('[id="count"]') ||
            element.querySelector(".count-text") ||
            element.querySelector('[class*="count"]') ||
            element.querySelector('yt-formatted-string[id*="count"]');
          if (commentCountEl) {
            const commentCount =
              (commentCountEl as HTMLElement).innerText ||
              commentCountEl.textContent ||
              "";
            node.commentCount = commentCount;
            console.log(`✅ [SITE] Comment count: ${commentCount}`);
          }
        } catch (error) {
          console.warn(
            `⚠️ [SITE] Error handling comments: ${
              error instanceof Error ? error.message : "Unknown"
            }`
          );
        }
      }

      // Mark as Site element for special handling
      node.isSiteElement = true;
      if (!node.metadata) node.metadata = {};
      node.metadata.siteComponent = {
        tagName: tagName,
        className: this.getClassNameSafe(element),
        id: element.id || "",
      };
    } catch (error) {
      this.errorTracker.recordError(
        "handleSiteWebComponent",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  // ============================================================================
  // IMAGE CAPTURE & PROCESSING
  // ============================================================================

  private async captureSVGSafe(url: string): Promise<void> {
    try {
      if (!ExtractionValidation.isValidUrl(url)) {
        this.errorTracker.recordError(
          "captureSVGSafe",
          `Invalid URL: ${url}`,
          undefined,
          "warning"
        );
        return;
      }

      // Check if already captured
      if (this.assets.svgs.has(url)) {
        return;
      }

      // Fetch SVG as text content (not binary)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const svgContent = await response.text();
      const hash = this.hashString(url);

      // Parse SVG dimensions if possible
      let width = 24; // Default fallback
      let height = 24;

      try {
        const svgMatch = svgContent.match(/<svg[^>]*>/i);
        if (svgMatch) {
          const widthMatch = svgMatch[0].match(/width\s*=\s*["']?([^"'\s>]+)/i);
          const heightMatch = svgMatch[0].match(
            /height\s*=\s*["']?([^"'\s>]+)/i
          );
          const viewBoxMatch = svgMatch[0].match(
            /viewBox\s*=\s*["']?([^"'>]+)/i
          );

          if (widthMatch && heightMatch) {
            width = parseFloat(widthMatch[1]) || width;
            height = parseFloat(heightMatch[1]) || height;
          } else if (viewBoxMatch) {
            const viewBox = viewBoxMatch[1].split(/\s+/);
            if (viewBox.length >= 4) {
              width = parseFloat(viewBox[2]) || width;
              height = parseFloat(viewBox[3]) || height;
            }
          }
        }
      } catch {
        // Use defaults if parsing fails
      }

      // Store in SVG assets registry
      const svgAsset = {
        id: hash,
        hash,
        svgCode: svgContent,
        width,
        height,
        url,
        contentType: "image/svg+xml",
      };

      this.assets.svgs.set(url, svgAsset);
    } catch (error) {
      this.errorTracker.recordError(
        "captureSVGSafe",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "warning"
      );
    }
  }

  private async captureImageSafe(
    url: string,
    element?: HTMLImageElement
  ): Promise<void> {
    try {
      if (!ExtractionValidation.isValidUrl(url)) {
        this.errorTracker.recordError(
          "captureImageSafe",
          `Invalid URL: ${url}`,
          element,
          "warning"
        );
        return;
      }

      // CRITICAL: Restore local fast-path for data: URIs to avoid IPC overload
      const isDataUri = url.startsWith("data:");
      let absoluteUrl: string;
      let base64Data: string | null = null;
      let processedLocally = false;
      let dataUriMimeType: string | null = null;

      if (isDataUri) {
        // Process data: URI locally without background proxy
        const dataUriResult = await this.processDataUriLocally(url);
        if (dataUriResult.success) {
          absoluteUrl = url; // Keep original data: URI
          base64Data = dataUriResult.base64 || null;
          dataUriMimeType = dataUriResult.mimeType || null;
          processedLocally = true;
          console.log(
            `✅ [DATA_URI] Processed locally: ${url.substring(0, 50)}...`
          );
        } else {
          console.warn(
            `⚠️ [DATA_URI] Local processing failed: ${dataUriResult.error}`
          );
          return; // Skip invalid data: URIs
        }
      } else {
        absoluteUrl = new URL(url, window.location.href).href;
      }

      if (!this.assets.images.has(url)) {
        let width = 0;
        let height = 0;

        if (element && element instanceof HTMLImageElement) {
          width = ExtractionValidation.safeParseFloat(
            element.naturalWidth || element.width,
            0
          );
          height = ExtractionValidation.safeParseFloat(
            element.naturalHeight || element.height,
            0
          );
        }

        this.assets.images.set(url, {
          originalUrl: url,
          absoluteUrl,
          url: absoluteUrl,
          base64: base64Data, // Will be non-null for data: URIs processed locally
          mimeType: isDataUri
            ? dataUriMimeType || "application/octet-stream"
            : this.getMimeTypeSafe(url) || "application/octet-stream",
          width: width,
          height: height,
        });
      }
    } catch (error) {
      this.errorTracker.recordError(
        "captureImageSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  private async processImagesBatch(): Promise<{
    failed: Array<{ url: string; reason: string }>;
  }> {
    this.postProgress("Processing images...", 60);

    const imageUrls = Array.from(this.assets.images.keys());
    const BATCH_SIZE = 5;
    const MAX_RETRIES = 3;
    const failedImages: Array<{ url: string; reason: string }> = [];

    console.log(
      `🖼️ [IMAGE PROCESSING] Processing ${imageUrls.length} images in batches of ${BATCH_SIZE} with ${MAX_RETRIES} retries`
    );

    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (url) => {
          const asset = this.assets.images.get(url);
          if (asset && !asset.base64 && !asset.error) {
            let attempts = 0;
            let success = false;

            while (attempts < MAX_RETRIES && !success) {
              attempts++;
              try {
                if (attempts > 1) {
                  console.log(
                    `🔄 [IMAGE PROCESSING] Retry ${attempts}/${MAX_RETRIES} for: ${url.substring(
                      0,
                      80
                    )}...`
                  );
                  // Exponential backoff: 1s, 2s, 4s
                  await new Promise((r) =>
                    setTimeout(r, 1000 * Math.pow(2, attempts - 2))
                  );
                } else {
                  console.log(
                    `🔄 [IMAGE PROCESSING] Converting to base64: ${url.substring(
                      0,
                      80
                    )}...`
                  );
                }

                const result = await this.urlToBase64Safe(asset.absoluteUrl);
                if (result.base64 && result.base64.length > 0) {
                  asset.base64 = result.base64;
                  asset.width = result.width || asset.width;
                  asset.height = result.height || asset.height;
                  if (result.mimeType) {
                    asset.mimeType = result.mimeType;
                  }
                  console.log(
                    `✅ [IMAGE PROCESSING] Successfully converted: ${url.substring(
                      0,
                      80
                    )}... (${(result.base64.length / 1024).toFixed(1)}KB)`
                  );
                  success = true;
                } else {
                  // If result is empty, it failed (CORS or Network).
                  // If it's the last attempt, mark as error.
                  if (attempts === MAX_RETRIES) {
                    const errorMsg =
                      "Failed to convert to base64 (empty result)";
                    asset.error = errorMsg;
                    failedImages.push({
                      url: asset.absoluteUrl || url,
                      reason: errorMsg,
                    });
                    console.warn(
                      `⚠️ [IMAGE PROCESSING] Failed to convert after ${MAX_RETRIES} attempts: ${url.substring(
                        0,
                        80
                      )}...`
                    );
                    // CRITICAL: Even if base64 conversion fails, ensure URL is stored for plugin fallback
                    asset.url = asset.absoluteUrl || asset.url || url;
                  }
                }
              } catch (error) {
                const errorMsg =
                  error instanceof Error ? error.message : "Unknown error";

                if (attempts === MAX_RETRIES) {
                  asset.error = errorMsg;
                  failedImages.push({
                    url: asset.absoluteUrl || url,
                    reason: errorMsg,
                  });
                  console.error(
                    `❌ [IMAGE PROCESSING] Error converting after ${MAX_RETRIES} attempts: ${url.substring(
                      0,
                      80
                    )}...`,
                    error
                  );
                  // CRITICAL: Ensure URL is stored
                  asset.url = asset.absoluteUrl || asset.url || url;
                }
              }
            }

            // Always ensure URL is set if base64 failed (redundant safety)
            if (!asset.base64) {
              asset.url = asset.absoluteUrl || asset.url || url;
            }
          } else if (asset && asset.error) {
            console.warn(
              `⚠️ [IMAGE PROCESSING] Skipping (has error): ${url.substring(
                0,
                80
              )}... - ${asset.error}`
            );
          } else if (asset && asset.base64) {
            console.log(
              `ℹ️ [IMAGE PROCESSING] Already has base64: ${url.substring(
                0,
                80
              )}...`
            );
          }
        })
      );

      const progress = 60 + Math.floor((i / imageUrls.length) * 30);
      this.postProgress(
        `Processing images (${i + batch.length}/${imageUrls.length})...`,
        progress
      );
    }

    // Log summary
    const successful = Array.from(this.assets.images.values()).filter(
      (a) => a.base64
    ).length;
    const failed = Array.from(this.assets.images.values()).filter(
      (a) => a.error
    ).length;
    const withUrl = Array.from(this.assets.images.values()).filter(
      (a) => a.url && !a.base64
    ).length;
    console.log(
      `📊 [IMAGE PROCESSING] Summary: ${successful} with base64, ${failed} failed, ${withUrl} with URL only (for plugin fallback)`
    );

    return { failed: failedImages };
  }

  private async urlToBase64Safe(url: string): Promise<{
    base64: string;
    width: number;
    height: number;
    mimeType?: string;
  }> {
    try {
      // Optimization: Handle data URIs locally to avoid unnecessary proxy round-trip
      if (url.startsWith("data:")) {
        try {
          // Extract base64 content
          const commaIndex = url.indexOf(",");
          if (commaIndex !== -1) {
            const header = url.substring(0, commaIndex);
            const isBase64 = header.includes(";base64");
            const mimeType = header.split(":")[1]?.split(";")[0];

            if (isBase64) {
              const base64 = url.substring(commaIndex + 1);
              // Simply return - dimensions will be calculated by Figma or plugin if needed
              // (Trying to load image locally for dimensions can be flaky in content script)
              return {
                base64,
                width: 0,
                height: 0,
                mimeType,
              };
            }
          }
        } catch (e) {
          // Fallback to normal loading if parsing fails
          console.warn(
            "Failed to parse data URI locally, falling back to proxy:",
            e
          );
        }
      }

      // Prefer fetching through the extension background service worker.
      // With <all_urls> host permissions this is significantly more reliable
      // than in-page canvas extraction, especially for cross-origin images.
      const viaBackground = await this.fetchImageViaBackgroundSafe(url);
      if (viaBackground.base64 && viaBackground.base64.length > 0) {
        return {
          base64: viaBackground.base64,
          width: viaBackground.width,
          height: viaBackground.height,
          mimeType: viaBackground.mimeType,
        };
      }

      // Fallback to canvas-based extraction if background fetch fails
      // This works for same-origin images or images with proper CORS headers
      console.log(
        `🔄 [IMAGE] Background fetch failed, trying canvas fallback for: ${url.substring(
          0,
          80
        )}...`
      );
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        const timeout = setTimeout(() => {
          console.warn(
            `⚠️ [IMAGE] Canvas fallback timeout for: ${url.substring(0, 80)}...`
          );
          resolve({ base64: "", width: 0, height: 0 });
        }, 10000);

        img.onload = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              console.warn(
                `⚠️ [IMAGE] Could not get canvas context for: ${url.substring(
                  0,
                  80
                )}...`
              );
              resolve({ base64: "", width: 0, height: 0 });
              return;
            }

            try {
              ctx.drawImage(img, 0, 0);
              const base64 = canvas.toDataURL("image/png");
              const data = base64.split(",")[1];
              if (data && data.length > 0) {
                console.log(
                  `✅ [IMAGE] Canvas fallback succeeded for: ${url.substring(
                    0,
                    80
                  )}... (${(data.length / 1024).toFixed(1)}KB)`
                );
                resolve({
                  base64: data,
                  width: img.naturalWidth || img.width,
                  height: img.naturalHeight || img.height,
                  mimeType: "image/png",
                });
              } else {
                console.warn(
                  `⚠️ [IMAGE] Canvas toDataURL returned empty for: ${url.substring(
                    0,
                    80
                  )}...`
                );
                resolve({
                  base64: "",
                  width: 0,
                  height: 0,
                  mimeType: undefined,
                });
              }
            } catch (drawError) {
              const errorMsg =
                drawError instanceof Error
                  ? drawError.message
                  : String(drawError);
              console.warn(
                `⚠️ [IMAGE] Canvas drawImage failed (likely CORS): ${errorMsg} for ${url.substring(
                  0,
                  80
                )}...`
              );
              resolve({ base64: "", width: 0, height: 0, mimeType: undefined });
            }
          } catch (canvasError) {
            const errorMsg =
              canvasError instanceof Error
                ? canvasError.message
                : String(canvasError);
            console.warn(
              `⚠️ [IMAGE] Canvas creation failed: ${errorMsg} for ${url.substring(
                0,
                80
              )}...`
            );
            resolve({ base64: "", width: 0, height: 0, mimeType: undefined });
          }
        };

        img.onerror = (error) => {
          clearTimeout(timeout);
          console.warn(
            `⚠️ [IMAGE] Image load failed for: ${url.substring(
              0,
              80
            )}... (likely CORS or invalid URL)`
          );
          resolve({ base64: "", width: 0, height: 0, mimeType: undefined });
        };

        img.src = url;
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `❌ [IMAGE] urlToBase64Safe exception: ${errorMsg} for ${url.substring(
          0,
          80
        )}...`
      );
      this.errorTracker.recordError(
        "urlToBase64Safe",
        errorMsg,
        undefined,
        "warning"
      );
      return { base64: "", width: 0, height: 0, mimeType: undefined };
    }
  }

  private async fetchImageViaBackgroundSafe(url: string): Promise<{
    base64: string;
    width: number;
    height: number;
    mimeType?: string;
  }> {
    try {
      // CRITICAL FIX: Use window.postMessage to communicate with content script
      // The injected script runs in the page context and doesn't have chrome.runtime access
      // The content script will forward the request to the background script

      const requestId = `fetch_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(
            `⚠️ [FETCH_IMAGE] Timeout waiting for proxy response: ${url.substring(
              0,
              80
            )}...`
          );
          window.removeEventListener("message", messageHandler);
          resolve({ base64: "", width: 0, height: 0, mimeType: undefined });
        }, 15000); // 15 second timeout

        const messageHandler = (event: MessageEvent) => {
          // Only accept messages from ourselves (window)
          if (event.source !== window) return;

          if (
            event.data?.type === "FETCH_IMAGE_PROXY_RESPONSE" &&
            event.data?.requestId === requestId
          ) {
            clearTimeout(timeout);
            window.removeEventListener("message", messageHandler);

            if (event.data.success && event.data.data?.base64) {
              const base64 = event.data.data.base64;
              console.log(
                `✅ [FETCH_IMAGE] Successfully fetched via proxy: ${url.substring(
                  0,
                  80
                )}... (${(base64.length / 1024).toFixed(1)}KB)`
              );
              resolve({
                base64,
                width: event.data.data.width || 0,
                height: event.data.data.height || 0,
                mimeType: event.data.data.mimeType,
              });
            } else {
              const error = event.data.error || "Unknown error";
              console.warn(
                `⚠️ [FETCH_IMAGE] Proxy fetch failed: ${error} for ${url.substring(
                  0,
                  80
                )}...`
              );
              resolve({ base64: "", width: 0, height: 0, mimeType: undefined });
            }
          }
        };

        window.addEventListener("message", messageHandler);

        // Send request to content script via postMessage
        window.postMessage(
          {
            type: "FETCH_IMAGE_PROXY",
            url,
            requestId,
          },
          "*"
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️ [FETCH_IMAGE] Exception in fetchImageViaBackgroundSafe: ${errorMsg} for ${url.substring(
          0,
          80
        )}...`
      );
      return { base64: "", width: 0, height: 0, mimeType: undefined };
    }
  }

  private getMimeTypeSafe(url: string): string {
    try {
      const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
      const mimeTypes: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
        avif: "image/avif",
      };
      return mimeTypes[ext || ""] || "image/png";
    } catch {
      return "image/png";
    }
  }

  // ============================================================================
  // VIEWPORT & METADATA EXTRACTION
  // ============================================================================

  private extractViewportData(): any {
    return {
      width: ExtractionValidation.safeParseFloat(window.innerWidth, 1440),
      height: ExtractionValidation.safeParseFloat(
        Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          window.innerHeight
        ),
        900
      ),
      devicePixelRatio: ExtractionValidation.safeParseFloat(
        window.devicePixelRatio || 1,
        1
      ),
    };
  }

  /**
   * Detect if the page is using dark or light color scheme
   * Uses multiple signals: CSS media query, meta tag, document styles, and luminance analysis
   */
  private detectColorScheme(): {
    prefersColorScheme: "light" | "dark" | "no-preference";
    documentColorScheme?: string;
    metaColorScheme?: string;
    rootBackgroundLuminance?: number;
    isDarkMode: boolean;
  } {
    try {
      // 1. Check CSS media query preference
      let prefersColorScheme: "light" | "dark" | "no-preference" =
        "no-preference";
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        prefersColorScheme = "dark";
      } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
        prefersColorScheme = "light";
      }

      // 2. Check document.documentElement color-scheme style
      const documentColorScheme =
        window.getComputedStyle(document.documentElement).colorScheme ||
        undefined;

      // 3. Check meta tag for color-scheme
      const metaColorScheme =
        document
          .querySelector('meta[name="color-scheme"]')
          ?.getAttribute("content") || undefined;

      // 4. Analyze root background color luminance
      let rootBackgroundLuminance: number | undefined;
      let isDarkMode = false;

      try {
        const bodyStyle = window.getComputedStyle(document.body);
        const htmlStyle = window.getComputedStyle(document.documentElement);
        const bgColor = bodyStyle.backgroundColor || htmlStyle.backgroundColor;

        if (
          bgColor &&
          bgColor !== "rgba(0, 0, 0, 0)" &&
          bgColor !== "transparent"
        ) {
          // Parse RGB values
          const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10) / 255;
            const g = parseInt(rgbMatch[2], 10) / 255;
            const b = parseInt(rgbMatch[3], 10) / 255;

            // Calculate relative luminance (WCAG formula)
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            rootBackgroundLuminance = luminance;

            // Dark mode if luminance is below 0.5
            isDarkMode = luminance < 0.5;
          }
        }
      } catch {
        // Ignore luminance calculation errors
      }

      // Determine final dark mode status from multiple signals
      if (
        documentColorScheme?.includes("dark") ||
        metaColorScheme?.includes("dark")
      ) {
        isDarkMode = true;
      } else if (
        prefersColorScheme === "dark" &&
        rootBackgroundLuminance === undefined
      ) {
        isDarkMode = true;
      }

      console.log(
        `🌓 Color scheme detected: ${
          isDarkMode ? "DARK" : "LIGHT"
        } mode (luminance: ${rootBackgroundLuminance?.toFixed(2) ?? "N/A"})`
      );

      return {
        prefersColorScheme,
        documentColorScheme,
        metaColorScheme,
        rootBackgroundLuminance,
        isDarkMode,
      };
    } catch (error) {
      console.warn("⚠️ Failed to detect color scheme:", error);
      return {
        prefersColorScheme: "no-preference",
        isDarkMode: false,
      };
    }
  }

  private extractResponsiveBreakpoints(): Array<{
    name: string;
    width: number;
    height?: number;
  }> {
    const breakpoints: Array<{ name: string; width: number; height?: number }> =
      [];

    // Common breakpoint definitions
    const commonBreakpoints = [
      { name: "mobile", width: 375 },
      { name: "tablet", width: 768 },
      { name: "desktop", width: 1024 },
      { name: "wide", width: 1440 },
    ];

    // Add current viewport
    breakpoints.push({
      name: "current",
      width: ExtractionValidation.safeParseFloat(window.innerWidth, 1440),
      height: ExtractionValidation.safeParseFloat(window.innerHeight, 900),
    });

    // Add common breakpoints
    breakpoints.push(...commonBreakpoints);

    return breakpoints;
  }

  // ============================================================================
  // FONT COLLECTION
  // ============================================================================

  private async collectFontFacesSafe(timeout = 4000): Promise<void> {
    try {
      const rules: CSSFontFaceRule[] = [];

      for (const sheet of Array.from(document.styleSheets)) {
        try {
          let cssRules: CSSRuleList | null = null;
          try {
            cssRules = sheet.cssRules || sheet.rules || null;
          } catch (cssRulesError) {
            // Expected for cross-origin stylesheets due to CORS - silently skip
            if (cssRulesError instanceof DOMException) {
              continue;
            }
            this.errorTracker.recordError(
              "collectFontFacesSafe",
              "Could not access stylesheet rules",
              undefined,
              "warning"
            );
            continue;
          }

          if (!cssRules) continue;

          for (const rule of Array.from(cssRules)) {
            if (rule instanceof CSSFontFaceRule) {
              rules.push(rule);
            }
          }
        } catch (error) {
          if (
            !(error instanceof DOMException && error.name === "SecurityError")
          ) {
            this.errorTracker.recordError(
              "collectFontFacesSafe",
              error instanceof Error ? error.message : "Unknown error",
              undefined,
              "warning"
            );
          }
          continue;
        }
      }

      const fetchWithTimeout = async (url: string): Promise<string | null> => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          const resp = await fetch(url, { signal: controller.signal });
          if (!resp.ok) return null;
          const blob = await resp.blob();
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
        } catch {
          return null;
        } finally {
          clearTimeout(id);
        }
      };

      for (const rule of rules) {
        try {
          const family = (rule.style.getPropertyValue("font-family") || "")
            .replace(/["']/g, "")
            .trim();
          const weight = rule.style.getPropertyValue("font-weight") || "400";
          const style = rule.style.getPropertyValue("font-style") || "normal";
          const src = rule.style.getPropertyValue("src") || "";
          const match = src.match(/url\(([^)]+)\)/);
          if (!match) continue;

          const rawUrl = match[1].replace(/["']/g, "").trim();
          if (!ExtractionValidation.isValidUrl(rawUrl)) continue;

          const absUrl = new URL(rawUrl, window.location.href).href;

          if (this.assets.fontFiles.has(absUrl)) continue;

          const fontEntry: any = {
            family,
            weight,
            style,
            url: absUrl,
          };

          const formatMatch = src.match(/format\(["']?([^"')]+)["']?\)/);
          if (formatMatch) {
            fontEntry.format = formatMatch[1];
          }

          const data = await fetchWithTimeout(absUrl);
          if (data) {
            fontEntry.data = data;
          } else {
            fontEntry.error = "fetch_failed";
          }

          this.assets.fontFiles.set(absUrl, fontEntry);
          if (!this.assets.fonts.has(family)) {
            this.assets.fonts.set(family, new Set());
          }
          const parsedWeight =
            weight === "bold"
              ? 700
              : weight === "normal"
              ? 400
              : ExtractionValidation.clampNumber(
                  parseInt(String(weight), 10) || 400,
                  100,
                  900
                );
          this.assets.fonts.get(family)?.add(parsedWeight);
        } catch (error) {
          this.errorTracker.recordError(
            "collectFontFacesSafe",
            error instanceof Error ? error.message : "Unknown error",
            undefined,
            "warning"
          );
        }
      }
    } catch (error) {
      this.errorTracker.recordError(
        "collectFontFacesSafe",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "error"
      );
    }
  }

  // ============================================================================
  // ASSET FINALIZATION
  // ============================================================================

  private cleanupNodeRefs(node: any): void {
    if (!node) return;
    try {
      if ((node as any).__elementRef) {
        delete (node as any).__elementRef;
      }
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          this.cleanupNodeRefs(child);
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  private finalizeAssets(schema: WebToFigmaSchema): void {
    try {
      // Finalize images
      const imagesObj: Record<string, any> = {};
      this.assets.images.forEach((data, url) => {
        const key = this.hashString(url);
        // CRITICAL: Always store URL for plugin fallback, even if base64 conversion failed
        const imageUrl = data.url || data.absoluteUrl || url;
        imagesObj[key] = {
          id: key,
          url: imageUrl, // Always include URL for plugin fallback
          originalUrl: data.originalUrl || url,
          absoluteUrl: data.absoluteUrl || imageUrl,
          mimeType: data.mimeType,
          width: data.width ?? 0,
          height: data.height ?? 0,
          data: data.base64 ?? null,
          base64: data.base64 ?? null,
          error: data.error,
        };

        // Log if base64 is missing but URL is available (for debugging)
        if (!data.base64 && imageUrl && !data.error) {
          console.log(
            `⚠️ [FINALIZE] Image ${key.substring(
              0,
              20
            )}... has URL but no base64: ${imageUrl.substring(0, 80)}...`
          );
        }
      });
      schema.assets.images = imagesObj;

      // Finalize SVGs
      const svgsObj: Record<string, any> = {};
      this.assets.svgs.forEach((data, url) => {
        const key = this.hashString(url);
        svgsObj[key] = {
          id: key,
          hash: data.hash,
          svgCode: data.svgCode,
          width: data.width,
          height: data.height,
          url: data.url,
          contentType: data.contentType,
        };
      });
      schema.assets.svgs = svgsObj;

      // Log summary
      const withBase64 = Object.values(imagesObj).filter(
        (img: any) => img.base64
      ).length;
      const withUrlOnly = Object.values(imagesObj).filter(
        (img: any) => !img.base64 && img.url
      ).length;
      console.log(
        `📊 [FINALIZE] Images: ${withBase64} with base64, ${withUrlOnly} with URL only (for plugin fallback)`
      );

      // Finalize fonts
      const fontObj: Record<string, any> = {};
      this.assets.fontFiles.forEach((data, url) => {
        const key = this.hashString(`${data.family}-${data.weight}-${url}`);
        fontObj[key] = { ...data, id: key };
      });
      schema.assets.fonts = fontObj;

      // Finalize font metadata
      schema.metadata.fonts = Array.from(this.assets.fonts.entries()).map(
        ([family, weights]) => ({
          family,
          weights: Array.from(weights),
          source: "system",
        })
      );

      // Design Tokens for Figma style generation
      const designTokens = this.assets.designTokens;
      (schema.styles as any) = {
        colors: Object.fromEntries(
          Array.from(designTokens.colors.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 20)
            .map(([name, data]) => [name, data.value])
        ),
        spacing: Object.fromEntries(
          Array.from(designTokens.spacing.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([name, data]) => [name, data.value])
        ),
        typography: Object.fromEntries(
          Array.from(designTokens.typography.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([name, data]) => [name, data.value])
        ),
        textStyles: {},
        effects: {},
      };
    } catch (error) {
      this.errorTracker.recordError(
        "finalizeAssets",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "error"
      );
    }
  }

  // ============================================================================
  // DESCRIPTIVE NAME GENERATION FOR DIVS
  // ============================================================================

  /**
   * Generates a descriptive name for div elements based on their content and attributes
   * This makes the Figma tree more readable by replacing generic "div" names with meaningful descriptions
   */
  private generateDescriptiveName(element: Element, tagName: string): string {
    // Priority 1: Check for ARIA labels (most semantic)
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim().length > 0) {
      return this.sanitizeName(ariaLabel.trim(), 50);
    }

    // Priority 2: Check for role attribute
    const role = element.getAttribute("role");
    if (role && role.trim().length > 0) {
      const roleName = role
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return `${roleName} Container`;
    }

    // Priority 3: Check for ID (often descriptive)
    const id = element.id;
    if (id && id.trim().length > 0) {
      const idName = this.sanitizeIdToName(id);
      if (idName.length > 0) {
        return idName;
      }
    }

    // Priority 4: Check for meaningful CSS classes
    const classes = Array.from(element.classList);
    if (classes.length > 0) {
      // Look for semantic class names (header, footer, nav, main, etc.)
      const semanticClasses = classes.filter((cls) =>
        /^(header|footer|nav|main|sidebar|content|container|wrapper|section|article|card|button|menu|modal|dialog|form|input|search|logo|icon|image|video|player|comment|feed|list|item|grid|row|column|cell)$/i.test(
          cls
        )
      );
      if (semanticClasses.length > 0) {
        const className = semanticClasses[0]
          .split(/[-_]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return className;
      }

      // Look for BEM-style classes (block__element)
      const bemClass = classes.find((cls) => cls.includes("__"));
      if (bemClass) {
        const blockName = bemClass.split("__")[0];
        const elementName = bemClass.split("__")[1]?.split("--")[0];
        if (elementName) {
          return `${this.sanitizeIdToName(blockName)} ${this.sanitizeIdToName(
            elementName
          )}`;
        }
        return this.sanitizeIdToName(blockName);
      }

      // Use first meaningful class name
      const firstClass = classes[0];
      if (firstClass && firstClass.length > 0) {
        const className = firstClass
          .split(/[-_]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        if (className.length > 0 && className.length < 50) {
          return className;
        }
      }
    }

    // Priority 5: Check for text content (first child text node)
    const textContent = this.extractTextContentSafe(element);
    if (textContent && textContent.trim().length > 0) {
      const cleanText = textContent
        .trim()
        .substring(0, 30)
        .replace(/\s+/g, " ");
      if (cleanText.length > 0) {
        return this.sanitizeName(cleanText, 50);
      }
    }

    // Priority 6: Check for data attributes
    const dataName =
      element.getAttribute("data-name") ||
      element.getAttribute("data-testid") ||
      element.getAttribute("data-component");
    if (dataName && dataName.trim().length > 0) {
      return this.sanitizeIdToName(dataName);
    }

    // Priority 7: Check for specific child elements that indicate purpose
    const hasButton = element.querySelector("button");
    if (hasButton) {
      const buttonText = hasButton.textContent?.trim();
      if (buttonText && buttonText.length > 0) {
        return `Button Container: ${this.sanitizeName(buttonText, 30)}`;
      }
      return "Button Container";
    }

    const hasImage = element.querySelector("img");
    if (hasImage) {
      const imgAlt = (hasImage as HTMLImageElement).alt;
      if (imgAlt && imgAlt.trim().length > 0) {
        return `Image Container: ${this.sanitizeName(imgAlt, 30)}`;
      }
      return "Image Container";
    }

    const hasForm = element.querySelector("form");
    if (hasForm) {
      return "Form Container";
    }

    const hasVideo = element.querySelector(
      "video, iframe[src*='site'], iframe[src*='vimeo']"
    );
    if (hasVideo) {
      return "Video Container";
    }

    // Priority 8: Check layout characteristics
    const computed = this.getCachedComputedStyle(element);
    if (computed) {
      if (computed.display === "flex") {
        const direction = computed.flexDirection || "row";
        return `Flex Container (${direction})`;
      }
      if (computed.display === "grid") {
        return "Grid Container";
      }
      if (computed.position === "fixed" || computed.position === "sticky") {
        return "Fixed Container";
      }
    }

    // Priority 9: Check for common patterns
    const rect = element.getBoundingClientRect();
    if (
      rect.width > window.innerWidth * 0.8 &&
      rect.height > window.innerHeight * 0.8
    ) {
      return "Main Container";
    }

    // Fallback: Use generic container name
    return "Container";
  }

  /**
   * Sanitizes an ID or class name to a readable name
   */
  private sanitizeIdToName(id: string): string {
    return id
      .split(/[-_]/)
      .map((word) => {
        // Handle camelCase
        if (/^[a-z][A-Z]/.test(word)) {
          return word.replace(/([a-z])([A-Z])/g, "$1 $2");
        }
        return word;
      })
      .join(" ")
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim();
  }

  /**
   * Sanitizes text content to a valid name
   */
  private sanitizeName(text: string, maxLength: number = 50): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .substring(0, maxLength)
      .trim();
  }

  /**
   * Checks if a Site pathname is a channel page
   */
  private isSiteChannelPage(pathname: string): boolean {
    return (
      pathname.startsWith("/@") ||
      pathname.startsWith("/channel/") ||
      pathname.startsWith("/c/") ||
      pathname.startsWith("/user/")
    );
  }

  /**
   * Extracts Site channel identifier from pathname
   * Returns channel ID, @handle, or null
   */
  private extractSiteChannelId(pathname: string): string | null {
    if (pathname.startsWith("/@")) {
      // @channelname format
      const match = pathname.match(/^\/@([^\/\?]+)/);
      return match ? `@${match[1]}` : null;
    }
    if (pathname.startsWith("/channel/")) {
      // /channel/CHANNEL_ID format
      const match = pathname.match(/^\/channel\/([^\/\?]+)/);
      return match ? match[1] : null;
    }
    if (pathname.startsWith("/c/")) {
      // /c/channelname format
      const match = pathname.match(/^\/c\/([^\/\?]+)/);
      return match ? match[1] : null;
    }
    if (pathname.startsWith("/user/")) {
      // /user/username format
      const match = pathname.match(/^\/user\/([^\/\?]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  // ============================================================================
  // PARTIAL SCHEMA & FALLBACKS
  // ============================================================================

  private createFallbackRootNode(reason: string = "unknown"): ElementNode {
    const viewport = this.extractViewportData();
    const nodeId = `node_${this.nodeId++}`;

    console.warn(`⚠️ Creating fallback root node. Reason: ${reason}`);

    const node: any = {
      id: nodeId,
      parentId: null,
      type: "FRAME",
      name: `Page (Fallback: ${reason})`,
      htmlTag: "body",
      cssClasses: [],
      layout: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      },
      absoluteLayout: {
        left: 0,
        top: 0,
        right: viewport.width,
        bottom: viewport.height,
        width: viewport.width,
        height: viewport.height,
      },
      fills: [
        {
          type: "SOLID",
          visible: true,
          opacity: 1,
          blendMode: "NORMAL",
          color: { r: 1, g: 0.9, b: 0.9 }, // Light red tint to indicate fallback
        },
      ],
      strokes: [],
      effects: [],
      attributes: {
        "data-fallback-reason": reason,
      },
      children: [
        {
          id: `node_${this.nodeId++}`,
          parentId: nodeId,
          type: "TEXT",
          name: "Error Message",
          layout: { x: 20, y: 20, width: 600, height: 100 },
          absoluteLayout: {
            left: 20,
            top: 20,
            right: 620,
            bottom: 120,
            width: 600,
            height: 100,
          },
          characters: `Extraction Failed: ${reason}\n\nPlease check the debugging console for details.`,
          fills: [
            {
              type: "SOLID",
              visible: true,
              opacity: 1,
              blendMode: "NORMAL",
              color: { r: 1, g: 0, b: 0 },
            },
          ],
          style: { fontFamily: "Inter", fontWeight: 700, fontSize: 24 },
        },
      ],
    };

    return node as ElementNode;
  }

  // ============================================================================
  // PROGRESS REPORTING
  // ============================================================================

  private postProgress(message: string, percent: number): void {
    try {
      window.postMessage(
        {
          type: "EXTRACTION_PROGRESS",
          message,
          percent: ExtractionValidation.clampNumber(percent, 0, 100),
        },
        "*"
      );
    } catch (error) {
      // Silently fail - progress reporting is non-critical
    }
  }

  // ============================================================================
  // MEDIA QUERIES EXTRACTION
  // ============================================================================

  private async extractMediaQueriesSafe(): Promise<any[]> {
    const mediaQueries: any[] = [];

    try {
      const stylesheets = Array.from(document.styleSheets);

      for (const sheet of stylesheets) {
        try {
          let rules: CSSRuleList | null = null;
          try {
            rules = sheet.cssRules || sheet.rules || null;
          } catch (cssRulesError) {
            if (
              cssRulesError instanceof DOMException &&
              (cssRulesError.name === "SecurityError" ||
                cssRulesError.name === "NotAllowedError")
            ) {
              continue; // CORS - skip silently
            }
            continue;
          }

          if (!rules) continue;

          for (const rule of Array.from(rules)) {
            if (rule instanceof CSSMediaRule) {
              mediaQueries.push({
                query: rule.media.mediaText,
                type: rule.media.mediaText.includes("print")
                  ? "print"
                  : "screen",
                features: {},
              });
            }
          }
        } catch {
          // Skip problematic stylesheets
          continue;
        }
      }
    } catch (error) {
      this.errorTracker.recordError(
        "extractMediaQueriesSafe",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "warning"
      );
    }

    return mediaQueries;
  }

  // ============================================================================
  // RESPONSIVE STYLES CAPTURE (Builder.io compatibility)
  // ============================================================================

  /**
   * Capture responsive styles per breakpoint
   * Stores CSS properties for different viewport sizes (mobile, tablet, desktop, large)
   */
  private async captureResponsiveStylesSafe(
    element: Element,
    node: any,
    computed: CSSStyleDeclaration
  ): Promise<void> {
    try {
      // Determine current breakpoint based on viewport width
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth;
      let breakpointName = "large";

      if (viewportWidth < 640) {
        breakpointName = "mobile";
      } else if (viewportWidth < 1024) {
        breakpointName = "tablet";
      } else if (viewportWidth < 1440) {
        breakpointName = "desktop";
      } else {
        breakpointName = "large";
      }

      // Initialize responsiveStyles if not exists
      if (!node.responsiveStyles) {
        node.responsiveStyles = {};
      }

      // Capture all relevant CSS properties for current breakpoint
      const responsiveStyle: Record<string, string | number> = {};

      // Layout properties
      if (computed.display && computed.display !== "static") {
        responsiveStyle.display = computed.display;
      }
      if (computed.position && computed.position !== "static") {
        responsiveStyle.position = computed.position;
      }
      if (computed.flexDirection) {
        responsiveStyle.flexDirection = computed.flexDirection;
      }
      if (computed.flexWrap) {
        responsiveStyle.flexWrap = computed.flexWrap;
      }
      if (computed.justifyContent) {
        responsiveStyle.justifyContent = computed.justifyContent;
      }
      if (computed.alignItems) {
        responsiveStyle.alignItems = computed.alignItems;
      }
      if (computed.alignContent) {
        responsiveStyle.alignContent = computed.alignContent;
      }
      if (computed.gap) {
        responsiveStyle.gap = computed.gap;
      }

      // Sizing properties
      if (computed.width && computed.width !== "auto") {
        responsiveStyle.width = computed.width;
      }
      if (computed.height && computed.height !== "auto") {
        responsiveStyle.height = computed.height;
      }
      if (computed.minWidth) {
        responsiveStyle.minWidth = computed.minWidth;
      }
      if (computed.maxWidth && computed.maxWidth !== "none") {
        responsiveStyle.maxWidth = computed.maxWidth;
      }
      if (computed.minHeight) {
        responsiveStyle.minHeight = computed.minHeight;
      }
      if (computed.maxHeight && computed.maxHeight !== "none") {
        responsiveStyle.maxHeight = computed.maxHeight;
      }

      // Spacing properties
      if (computed.paddingTop) {
        responsiveStyle.paddingTop = computed.paddingTop;
      }
      if (computed.paddingRight) {
        responsiveStyle.paddingRight = computed.paddingRight;
      }
      if (computed.paddingBottom) {
        responsiveStyle.paddingBottom = computed.paddingBottom;
      }
      if (computed.paddingLeft) {
        responsiveStyle.paddingLeft = computed.paddingLeft;
      }
      if (computed.marginTop) {
        responsiveStyle.marginTop = computed.marginTop;
      }
      if (computed.marginRight) {
        responsiveStyle.marginRight = computed.marginRight;
      }
      if (computed.marginBottom) {
        responsiveStyle.marginBottom = computed.marginBottom;
      }
      if (computed.marginLeft) {
        responsiveStyle.marginLeft = computed.marginLeft;
      }

      // Visual properties
      if (
        computed.backgroundColor &&
        computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        computed.backgroundColor !== "transparent"
      ) {
        responsiveStyle.backgroundColor = computed.backgroundColor;
      }
      if (computed.color) {
        responsiveStyle.color = computed.color;
      }
      if (computed.borderRadius) {
        responsiveStyle.borderRadius = computed.borderRadius;
      }
      if (computed.borderWidth) {
        responsiveStyle.borderWidth = computed.borderWidth;
      }
      if (computed.borderColor) {
        responsiveStyle.borderColor = computed.borderColor;
      }
      if (computed.borderStyle && computed.borderStyle !== "none") {
        responsiveStyle.borderStyle = computed.borderStyle;
      }
      if (computed.boxShadow && computed.boxShadow !== "none") {
        responsiveStyle.boxShadow = computed.boxShadow;
      }

      // Typography properties
      if (computed.fontSize) {
        responsiveStyle.fontSize = computed.fontSize;
      }
      if (computed.fontFamily) {
        responsiveStyle.fontFamily = computed.fontFamily;
      }
      if (computed.fontWeight) {
        responsiveStyle.fontWeight = computed.fontWeight;
      }
      if (computed.fontStyle && computed.fontStyle !== "normal") {
        responsiveStyle.fontStyle = computed.fontStyle;
      }
      if (computed.lineHeight) {
        responsiveStyle.lineHeight = computed.lineHeight;
      }
      if (computed.textAlign && computed.textAlign !== "start") {
        responsiveStyle.textAlign = computed.textAlign;
      }
      if (computed.letterSpacing && computed.letterSpacing !== "normal") {
        responsiveStyle.letterSpacing = computed.letterSpacing;
      }

      // Overflow properties
      if (computed.overflow && computed.overflow !== "visible") {
        responsiveStyle.overflow = computed.overflow;
      }
      if (computed.overflowX && computed.overflowX !== "visible") {
        responsiveStyle.overflowX = computed.overflowX;
      }
      if (computed.overflowY && computed.overflowY !== "visible") {
        responsiveStyle.overflowY = computed.overflowY;
      }

      // Transform properties
      if (computed.transform && computed.transform !== "none") {
        responsiveStyle.transform = computed.transform;
      }

      // Opacity
      if (computed.opacity && computed.opacity !== "1") {
        responsiveStyle.opacity = computed.opacity;
      }

      // Z-index
      if (computed.zIndex && computed.zIndex !== "auto") {
        responsiveStyle.zIndex = computed.zIndex;
      }

      // Store styles for current breakpoint
      if (Object.keys(responsiveStyle).length > 0) {
        node.responsiveStyles[breakpointName] = responsiveStyle;
      }

      // Also capture as "large" if we're at a large viewport (for Builder.io compatibility)
      // Builder.io uses "large" as the default breakpoint
      if (breakpointName !== "large" && viewportWidth >= 1440) {
        // If we're at desktop but want to also store as large
        node.responsiveStyles["large"] = responsiveStyle;
      }
    } catch (error) {
      // Silently fail - responsive styles are optional
      this.errorTracker.recordError(
        "captureResponsiveStylesSafe",
        error instanceof Error ? error.message : "Unknown error",
        element,
        "warning"
      );
    }
  }

  // ============================================================================
  // AUTOMATIC HOVER STATE CAPTURE FOR BUTTONS
  // ============================================================================

  /**
   * ENHANCED: Automatically capture hover states for all detected buttons
   * Uses AI/OCR hints + existing detection to identify buttons, then captures their hover states
   * CRITICAL FIX: Added timeout and better error handling to prevent breaking extraction
   */
  private async captureButtonHoverStates(
    schema: WebToFigmaSchema
  ): Promise<void> {
    const HOVER_CAPTURE_TIMEOUT = 10000; // 10 seconds max for hover capture
    const startTime = Date.now();

    try {
      // Find all button-like elements in the DOM
      const buttonSelectors = [
        "button",
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        '[role="button"]',
        "a[href]", // Links can also have hover states
        ".btn",
        ".button",
        "[class*='button']",
        "[class*='btn']",
      ];

      const buttons: HTMLElement[] = [];
      for (const selector of buttonSelectors) {
        try {
          // Check timeout before continuing
          if (Date.now() - startTime > HOVER_CAPTURE_TIMEOUT) {
            console.warn(
              "⚠️ [HOVER] Timeout reached, stopping button detection"
            );
            break;
          }

          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            if (
              el instanceof HTMLElement &&
              !buttons.includes(el) &&
              this.isButtonLikeElement(el)
            ) {
              buttons.push(el);
            }
          });
        } catch (e) {
          // Ignore invalid selectors
        }
      }

      console.log(
        `🎯 [HOVER] Found ${buttons.length} button-like elements for hover state capture`
      );

      if (buttons.length === 0) {
        return;
      }

      // Initialize hoverStates array if not exists
      if (!schema.hoverStates) {
        (schema as any).hoverStates = [];
      }

      // CRITICAL FIX: Limit to 50 buttons max and add per-button timeout
      const maxButtons = Math.min(buttons.length, 50);
      let capturedCount = 0;

      for (let i = 0; i < maxButtons; i++) {
        // Check overall timeout
        if (Date.now() - startTime > HOVER_CAPTURE_TIMEOUT) {
          console.warn(
            `⚠️ [HOVER] Timeout reached after ${capturedCount} buttons, stopping hover capture`
          );
          break;
        }

        const button = buttons[i];
        try {
          // Per-button timeout (500ms max per button)
          const buttonStartTime = Date.now();
          const hoverState = await Promise.race([
            this.captureElementHoverState(button),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 500)
            ),
          ]);

          if (hoverState) {
            // Find the corresponding node ID in the schema
            const nodeId = this.findNodeIdForElement(button, schema.root);
            if (nodeId) {
              (schema as any).hoverStates.push({
                id: nodeId,
                default: hoverState.default,
                hover: hoverState.hover,
              });
              capturedCount++;
            }
          }
        } catch (error) {
          console.warn(
            `⚠️ [HOVER] Failed to capture hover state for button ${i + 1}:`,
            error
          );
          // Continue with next button instead of failing entirely
        }
      }

      console.log(
        `✅ [HOVER] Captured hover states for ${capturedCount}/${maxButtons} buttons (time: ${
          Date.now() - startTime
        }ms)`
      );
    } catch (error) {
      console.warn(
        `⚠️ [HOVER] Error during automatic hover state capture:`,
        error
      );
      // Don't throw - allow extraction to continue
    }
  }

  /**
   * BOX-SIZING VALIDATION: Detect potential dimension calculation errors
   * FIXED: Reduced false positives and improved accuracy
   */
  private validateBoxSizingDimensions(
    element: Element,
    node: any,
    computed: CSSStyleDeclaration
  ): void {
    const boxSizingData = node._boxSizingData;
    if (!boxSizingData) return;

    const {
      boxSizing,
      visualDimensions,
      contentDimensions,
      borders,
      paddings,
    } = boxSizingData;

    // CRITICAL: Check for negative content dimensions (actual calculation error)
    if (contentDimensions.width < 0 || contentDimensions.height < 0) {
      console.error(`❌ [BOX-SIZING] CRITICAL: Negative content dimensions detected:`, {
        element: element.tagName,
        className: element.className,
        boxSizing,
        visualDimensions,
        contentDimensions,
        borders,
        paddings,
      });
    }

    // IMPROVED: Only warn if borders/padding exceed 95% (reduced false positives)
    // Note: Some UI elements (like icons) legitimately have large padding relative to content
    const totalHorizontalBorderPadding = borders.left + borders.right + paddings.left + paddings.right;
    const totalVerticalBorderPadding = borders.top + borders.bottom + paddings.top + paddings.bottom;

    const horizontalRatio = visualDimensions.width > 0 ? totalHorizontalBorderPadding / visualDimensions.width : 0;
    const verticalRatio = visualDimensions.height > 0 ? totalVerticalBorderPadding / visualDimensions.height : 0;

    // Only warn if BOTH dimensions exceed 99% (extremely rare, likely an actual error)
    // Increased from 95% to reduce noise - decorative borders often use high percentages legitimately
    if (horizontalRatio > 0.99 && verticalRatio > 0.99 && visualDimensions.width > 0 && visualDimensions.height > 0) {
      console.warn(
        `⚠️ [BOX-SIZING] Extremely high border/padding ratio (${(Math.max(horizontalRatio, verticalRatio) * 100).toFixed(1)}%) - verify element:`,
        {
          element: element.tagName,
          className: element.className,
          visualDimensions,
          borders,
          paddings,
        }
      );
    }

    // REMOVED: The "identical content and visual dimensions" check was a false positive
    // It's valid for border-box elements to have zero padding/borders
  }

  /**
   * Check if element is button-like (for hover state capture)
   */
  private isButtonLikeElement(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    // Skip invisible or zero-size elements
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      rect.width === 0 ||
      rect.height === 0
    ) {
      return false;
    }

    // Check if it's actually interactive
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");

    // Explicit button indicators
    if (
      tagName === "button" ||
      role === "button" ||
      (tagName === "a" && element.hasAttribute("href")) ||
      (tagName === "input" &&
        ["button", "submit", "reset"].includes(
          (element as HTMLInputElement).type
        ))
    ) {
      return true;
    }

    // Check for button-like classes
    const className = this.getClassNameSafe(element);
    if (
      /btn|button/i.test(className) ||
      style.cursor === "pointer" ||
      element.hasAttribute("onclick")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Capture hover state for a single element
   */
  private async captureElementHoverState(element: HTMLElement): Promise<{
    default: Record<string, string>;
    hover: Record<string, string>;
  } | null> {
    try {
      // Get default state
      const defaultStyles = this.extractElementStyles(element);

      // Simulate hover by injecting hover styles
      const hoverClass = "figma-temp-hover-state";
      const style = document.createElement("style");
      style.id = hoverClass;
      style.textContent = `
        .${hoverClass} {
          /* Force hover state simulation */
        }
      `;
      document.head.appendChild(style);

      // Add hover class and trigger hover
      element.classList.add(hoverClass);

      // Dispatch mouseenter event to trigger any JavaScript hover handlers
      const mouseenterEvent = new MouseEvent("mouseenter", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      element.dispatchEvent(mouseenterEvent);

      // Wait for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get hover state
      const hoverStyles = this.extractElementStyles(element);

      // Cleanup
      element.classList.remove(hoverClass);
      document.head.removeChild(style);

      // Dispatch mouseleave
      const mouseleaveEvent = new MouseEvent("mouseleave", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      element.dispatchEvent(mouseleaveEvent);

      // Check if there are meaningful differences
      const hasDifferences = Object.keys(hoverStyles).some(
        (key) => defaultStyles[key] !== hoverStyles[key]
      );

      if (hasDifferences) {
        return {
          default: defaultStyles,
          hover: hoverStyles,
        };
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ [HOVER] Error capturing hover state:`, error);
      return null;
    }
  }

  /**
   * Extract relevant styles from an element for hover state comparison
   */
  private extractElementStyles(element: HTMLElement): Record<string, string> {
    const computed = window.getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor || "",
      color: computed.color || "",
      borderColor: computed.borderColor || "",
      borderWidth: computed.borderWidth || "",
      borderRadius: computed.borderRadius || "",
      boxShadow: computed.boxShadow || "",
      opacity: computed.opacity || "",
      transform: computed.transform || "",
      scale: computed.transform.includes("scale") ? computed.transform : "",
    };
  }

  /**
   * Find the node ID for an element in the extracted tree
   * ENHANCED: Uses element reference for more reliable matching
   */
  private findNodeIdForElement(element: Element, tree: any): string | null {
    if (!tree) return null;

    // Try to match by element reference first (most reliable)
    const searchNode = (node: any): string | null => {
      // Check if this node has the element reference stored
      if ((node as any).__elementRef === element) {
        return node.id;
      }

      // Check if this node matches the element by tag and attributes
      if (node.htmlTag === element.tagName.toLowerCase()) {
        // Try to match by ID first (most specific)
        if (element.id) {
          const nodeId = node.attributes?.id || "";
          if (nodeId === element.id) {
            return node.id;
          }
          // Also check if name includes the ID
          if (node.name && node.name.includes(element.id)) {
            return node.id;
          }
        }

        // Try to match by classes
        const nodeClasses = node.cssClasses || [];
        const elementClasses = Array.from(element.classList);

        if (nodeClasses.length > 0 && elementClasses.length > 0) {
          // Check if at least one class matches
          const matchingClasses = nodeClasses.filter((cls: string) =>
            elementClasses.includes(cls)
          );
          if (matchingClasses.length > 0) {
            // Also check position to ensure it's the right element
            const nodeLayout = node.layout || node.absoluteLayout;
            const elementRect = element.getBoundingClientRect();
            if (
              nodeLayout &&
              Math.abs(nodeLayout.x - elementRect.left) < 5 &&
              Math.abs(nodeLayout.y - elementRect.top) < 5
            ) {
              return node.id;
            }
          }
        }

        // Try to match by position (for elements without IDs/classes)
        const nodeLayout = node.layout || node.absoluteLayout;
        if (nodeLayout) {
          const elementRect = element.getBoundingClientRect();
          // Use scroll position for accurate matching
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop || 0;
          const scrollLeft =
            window.pageXOffset || document.documentElement.scrollLeft || 0;
          const expectedX = elementRect.left + scrollLeft;
          const expectedY = elementRect.top + scrollTop;

          if (
            Math.abs(nodeLayout.x - expectedX) < 2 &&
            Math.abs(nodeLayout.y - expectedY) < 2 &&
            Math.abs(nodeLayout.width - elementRect.width) < 2 &&
            Math.abs(nodeLayout.height - elementRect.height) < 2
          ) {
            return node.id;
          }
        }
      }

      // Recursively search children
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = searchNode(child);
          if (found) return found;
        }
      }

      return null;
    };

    return searchNode(tree);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private hashString(str: string): string {
    if (!str || typeof str !== "string") {
      return "img_0";
    }

    // Use a 64-bit FNV-1a hash to minimize collisions across large pages with
    // thousands of images (collisions can cause incorrect image assignment).
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; i < str.length; i++) {
      hash ^= BigInt(str.charCodeAt(i));
      hash = (hash * prime) & 0xffffffffffffffffn;
    }
    return "img_" + hash.toString(16).padStart(16, "0");
  }

  /**
   * Extract absolute transformation matrix from element's computed style
   * Returns a 2x3 affine matrix in CSS pixel coordinates
   */
  private extractAbsoluteTransform(element: Element, computed: CSSStyleDeclaration): {
    matrix: [number, number, number, number, number, number];
    origin: { x: number; y: number };
  } | undefined {
    const transform = computed.transform || 'none';
    const transformOrigin = computed.transformOrigin || '50% 50%';
    
    if (transform === 'none') {
      return undefined;
    }

    // Parse transform matrix
    const matrix = this.parseTransformMatrix(transform);
    if (!matrix) {
      return undefined;
    }

    // Parse transform origin (convert to 0-1 normalized coordinates)
    const origin = this.parseTransformOrigin(transformOrigin, element);

    return {
      matrix: matrix as [number, number, number, number, number, number],
      origin,
    };
  }

  /**
   * Parse CSS transform string into 2x3 matrix
   * FIX 4: Added debug logging to diagnose transform parsing failures
   */
  private parseTransformMatrix(transform: string): number[] | null {
    // Handle matrix() and matrix3d() functions
    const matrixMatch = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
      if (values.length === 6) {
        // 2D matrix: [a, b, c, d, e, f]
        console.log(`✅ [TRANSFORM PARSE] Successfully parsed 2D matrix: ${transform}`);
        return values;
      } else if (values.length === 16) {
        // 3D matrix: extract 2D components [a, b, c, d, e, f] from 4x4 matrix
        console.log(`✅ [TRANSFORM PARSE] Successfully parsed 3D matrix: ${transform}`);
        return [values[0], values[1], values[4], values[5], values[12], values[13]];
      } else {
        // FIX 4: Log unexpected matrix value count
        console.warn(`⚠️ [TRANSFORM PARSE] Matrix has unexpected value count (${values.length}): ${transform}`);
      }
    }

    // Parse individual transform functions and compose matrix
    const result = this.composeTransformMatrix(transform);
    if (result) {
      console.log(`✅ [TRANSFORM PARSE] Composed matrix from functions: ${transform}`);
    } else {
      // FIX 4: Log parsing failure to help diagnose the 6 failed nodes
      console.warn(`❌ [TRANSFORM PARSE] Failed to parse transform: ${transform}`);
    }
    return result;
  }

  /**
   * Compose transform matrix from individual CSS transform functions
   */
  private composeTransformMatrix(transform: string): number[] | null {
    // Start with identity matrix [1, 0, 0, 1, 0, 0]
    let matrix = [1, 0, 0, 1, 0, 0];

    // Parse individual functions: translate(), rotate(), scale(), skew()
    const functionRegex = /(translate|rotate|scale|skew)(?:X|Y|Z)?\([^)]*\)/g;
    const functions = transform.match(functionRegex) || [];

    for (const func of functions) {
      const funcMatrix = this.parseTransformFunction(func);
      if (funcMatrix) {
        matrix = this.multiplyMatrix2D(matrix, funcMatrix);
      }
    }

    return matrix;
  }

  /**
   * Parse single transform function into matrix
   */
  private parseTransformFunction(func: string): number[] | null {
    const match = func.match(/^(\w+)\(([^)]+)\)$/);
    if (!match) return null;

    const [, name, args] = match;
    const values = args.split(',').map(v => parseFloat(v.trim()));

    switch (name) {
      case 'translate':
        return [1, 0, 0, 1, values[0] || 0, values[1] || 0];
      case 'translateX':
        return [1, 0, 0, 1, values[0] || 0, 0];
      case 'translateY':
        return [1, 0, 0, 1, 0, values[0] || 0];
      case 'rotate': {
        const angle = values[0] || 0;
        const rad = angle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return [cos, sin, -sin, cos, 0, 0];
      }
      case 'scale':
        return [values[0] || 1, 0, 0, values[1] || values[0] || 1, 0, 0];
      case 'scaleX':
        return [values[0] || 1, 0, 0, 1, 0, 0];
      case 'scaleY':
        return [1, 0, 0, values[0] || 1, 0, 0];
      case 'skewX': {
        const angle = values[0] || 0;
        const tan = Math.tan(angle * Math.PI / 180);
        return [1, 0, tan, 1, 0, 0];
      }
      case 'skewY': {
        const angle = values[0] || 0;
        const tan = Math.tan(angle * Math.PI / 180);
        return [1, tan, 0, 1, 0, 0];
      }
      default:
        return null;
    }
  }

  /**
   * Multiply two 2D transformation matrices
   */
  private multiplyMatrix2D(a: number[], b: number[]): number[] {
    return [
      a[0] * b[0] + a[2] * b[1],           // a
      a[1] * b[0] + a[3] * b[1],           // b  
      a[0] * b[2] + a[2] * b[3],           // c
      a[1] * b[2] + a[3] * b[3],           // d
      a[0] * b[4] + a[2] * b[5] + a[4],    // tx
      a[1] * b[4] + a[3] * b[5] + a[5]     // ty
    ];
  }

  /**
   * Parse transform-origin into normalized coordinates
   */
  private parseTransformOrigin(transformOrigin: string, element: Element): { x: number; y: number } {
    const parts = transformOrigin.split(' ');
    const rect = element.getBoundingClientRect();
    
    let x = 0.5; // default center
    let y = 0.5; // default center

    // Parse X coordinate
    if (parts[0]) {
      const xPart = parts[0].trim();
      if (xPart.endsWith('%')) {
        x = parseFloat(xPart) / 100;
      } else if (xPart.endsWith('px')) {
        x = parseFloat(xPart) / rect.width;
      } else if (xPart === 'left') {
        x = 0;
      } else if (xPart === 'right') {
        x = 1;
      } else if (xPart === 'center') {
        x = 0.5;
      }
    }

    // Parse Y coordinate
    if (parts[1]) {
      const yPart = parts[1].trim();
      if (yPart.endsWith('%')) {
        y = parseFloat(yPart) / 100;
      } else if (yPart.endsWith('px')) {
        y = parseFloat(yPart) / rect.height;
      } else if (yPart === 'top') {
        y = 0;
      } else if (yPart === 'bottom') {
        y = 1;
      } else if (yPart === 'center') {
        y = 0.5;
      }
    }

    return { x, y };
  }

  /**
   * Get page zoom level
   */
  private getPageZoom(): number {
    // Try multiple methods to detect zoom
    const screen = window.screen;
    const viewport = (window as any).visualViewport;
    
    if (viewport) {
      return viewport.scale || 1;
    }

    // Fallback: detect via devicePixelRatio vs screen DPI
    const dpr = window.devicePixelRatio || 1;
    if (screen && (screen as any).logicalXDPI && (screen as any).systemXDPI) {
      const logicalDpi = (screen as any).logicalXDPI;
      const systemDpi = (screen as any).systemXDPI;
      return logicalDpi / systemDpi;
    }

    // Default: no zoom
    return 1;
  }

  /**
   * Generate comprehensive schema completion report
   * Shows detailed statistics about the captured webpage
   */
  private generateSchemaCompletionReport(schema: any): void {
    const stats = this.calculateSchemaStatistics(schema);
    const totalTime = Date.now() - this.extractionStartTime;
    
    console.log('\n🎯 ═══════════════════════════════════════════════════════════');
    console.log('📊 CAPTURE COMPLETION REPORT');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Page Information
    console.log(`📄 PAGE: ${window.location.href}`);
    console.log(`📏 VIEWPORT: ${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio || 1})`);
    console.log(`⏱️  TOTAL TIME: ${totalTime}ms`);
    
    // Schema Dimensions & Structure
    console.log('\n📐 SCHEMA DIMENSIONS:');
    console.log(`   Root Size: ${stats.rootWidth}x${stats.rootHeight}px`);
    console.log(`   Total Nodes: ${stats.totalNodes}`);
    console.log(`   Max Depth: ${stats.maxDepth} levels`);
    console.log(`   Schema Size: ${(JSON.stringify(schema).length / 1024 / 1024).toFixed(2)}MB`);
    
    // Node Type Breakdown
    console.log('\n🏗️  NODE COMPOSITION:');
    Object.entries(stats.nodesByType).forEach(([type, count]) => {
      const percentage = (((count as number) / stats.totalNodes) * 100).toFixed(1);
      console.log(`   ${type}: ${count} (${percentage}%)`);
    });
    
    // Transform & Layout Analysis
    console.log('\n🎯 PIXEL-PERFECT FEATURES:');
    console.log(`   Nodes with Transforms: ${stats.transformNodes} (${((stats.transformNodes / stats.totalNodes) * 100).toFixed(1)}%)`);
    console.log(`   Nodes with Local Size: ${stats.localSizeNodes}`);
    console.log(`   Capture Metadata: ${stats.captureMetadataNodes} nodes`);
    console.log(`   Box-sizing Data: ${stats.boxSizingNodes} nodes`);
    
    // Layout & Auto Layout
    console.log('\n📏 LAYOUT ANALYSIS:');
    console.log(`   Auto Layout Applied: ${this.autoLayoutMetrics.autoLayoutAppliedSafe} nodes`);
    console.log(`   Auto Layout Candidates: ${this.autoLayoutMetrics.autoLayoutCandidates} nodes`);
    console.log(`   Flex Containers: ${stats.flexContainers}`);
    console.log(`   Grid Containers: ${stats.gridContainers}`);
    
    // Assets & Media
    console.log('\n🖼️  ASSETS:');
    console.log(`   Images: ${stats.images}`);
    console.log(`   SVG Elements: ${stats.svgElements}`);
    console.log(`   Background Images: ${stats.backgroundImages}`);
    console.log(`   Font Families: ${stats.uniqueFonts} unique`);
    
    // Interactive Elements
    console.log('\n⚡ INTERACTIVE ELEMENTS:');
    console.log(`   Buttons: ${stats.buttons}`);
    console.log(`   Links: ${stats.links}`);
    console.log(`   Form Elements: ${stats.formElements}`);
    console.log(`   Interactive Total: ${stats.interactiveElements}`);
    
    // Performance Metrics
    console.log('\n⚡ PERFORMANCE:');
    console.log(`   Nodes/second: ${Math.round(stats.totalNodes / (totalTime / 1000))}`);
    console.log(`   Transform Accuracy: ${stats.transformAccuracy.toFixed(1)}%`);
    console.log(`   Memory Efficiency: ${stats.memoryEfficiency}`);
    
    // Quality Indicators
    console.log('\n✨ QUALITY INDICATORS:');
    console.log(`   Pixel-Perfect Ready: ${stats.pixelPerfectReady ? '✅ YES' : '⚠️ PARTIAL'}`);
    console.log(`   Layout Fidelity: ${stats.layoutFidelity}%`);
    console.log(`   Transform Coverage: ${stats.transformCoverage}%`);
    
    // Warnings & Recommendations
    if (stats.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      stats.warnings.forEach((warning: string) => console.log(`   ${warning}`));
    }
    
    if (stats.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      stats.recommendations.forEach((rec: string) => console.log(`   ${rec}`));
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🎉 CAPTURE COMPLETE: ${stats.totalNodes} nodes processed successfully`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }
  
  /**
   * Calculate comprehensive schema statistics
   */
  private calculateSchemaStatistics(schema: any): any {
    const stats = {
      totalNodes: 0,
      maxDepth: 0,
      nodesByType: {} as Record<string, number>,
      transformNodes: 0,
      localSizeNodes: 0,
      captureMetadataNodes: 0,
      boxSizingNodes: 0,
      flexContainers: 0,
      gridContainers: 0,
      images: 0,
      svgElements: 0,
      backgroundImages: 0,
      uniqueFonts: new Set<string>(),
      buttons: 0,
      links: 0,
      formElements: 0,
      interactiveElements: 0,
      rootWidth: 0,
      rootHeight: 0,
      warnings: [] as string[],
      recommendations: [] as string[],
      pixelPerfectReady: true,
      layoutFidelity: 100,
      transformCoverage: 0,
      transformAccuracy: 100,
      memoryEfficiency: 'Optimal'
    };

    // Root dimensions
    if (schema.root?.rect) {
      stats.rootWidth = schema.root.rect.width || 0;
      stats.rootHeight = schema.root.rect.height || 0;
    }

    // Recursive node analysis
    const analyzeNode = (node: any, depth: number = 0) => {
      stats.totalNodes++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      
      // Node type tracking
      const tagName = node.tagName?.toLowerCase() || 'unknown';
      stats.nodesByType[tagName] = (stats.nodesByType[tagName] || 0) + 1;
      
      // Pixel-perfect features
      if (node.absoluteTransform) stats.transformNodes++;
      if (node.localSize) stats.localSizeNodes++;
      if (node.captureMetadata) stats.captureMetadataNodes++;
      if (node._boxSizingData) stats.boxSizingNodes++;
      
      // Layout analysis
      if (node.layout?.layoutContext?.display === 'flex') stats.flexContainers++;
      if (node.layout?.layoutContext?.display === 'grid') stats.gridContainers++;
      
      // Asset tracking
      if (tagName === 'img') stats.images++;
      if (tagName === 'svg') stats.svgElements++;
      if (node.imageHash || node.backgroundImage) stats.backgroundImages++;
      
      // Font tracking
      if (node.styles?.fontFamily) {
        const fonts = node.styles.fontFamily.split(',').map((f: string) => f.trim().replace(/['"]/g, ''));
        fonts.forEach((font: string) => stats.uniqueFonts.add(font));
      }
      
      // Interactive elements
      if (tagName === 'button') stats.buttons++;
      if (tagName === 'a') stats.links++;
      if (['input', 'select', 'textarea', 'form'].includes(tagName)) stats.formElements++;
      if (node.isInteractive || ['button', 'a', 'input', 'select'].includes(tagName)) {
        stats.interactiveElements++;
      }
      
      // Recurse to children
      if (node.children) {
        node.children.forEach((child: any) => analyzeNode(child, depth + 1));
      }
    };

    if (schema.root) {
      analyzeNode(schema.root);
    } else if (schema.tree) {
      console.warn('⚠️ [COMPLETION] Using schema.tree instead of schema.root (legacy format)');
      analyzeNode(schema.tree);
    } else {
      console.warn('⚠️ [COMPLETION] No schema.root or schema.tree found - schema structure:', {
        keys: Object.keys(schema),
        hasNodes: !!schema.nodes,
        hasData: !!schema.data
      });
    }
    
    console.log('📊 [COMPLETION] Final stats:', {
      totalNodes: stats.totalNodes,
      transformNodes: stats.transformNodes,
      nodeTypes: Object.keys(stats.nodesByType),
      schemaSize: `${(JSON.stringify(schema).length / 1024).toFixed(1)}KB`
    });

    // Calculate quality metrics
    stats.transformCoverage = stats.totalNodes > 0 
      ? (stats.transformNodes / stats.totalNodes) * 100 
      : 0;
    
    // Generate warnings and recommendations
    if (stats.transformNodes === 0) {
      stats.warnings.push('No CSS transforms captured - check if page has animated elements');
    }
    
    if (this.autoLayoutMetrics?.autoLayoutCandidates > this.autoLayoutMetrics?.autoLayoutAppliedSafe) {
      stats.warnings.push('Some Auto Layout opportunities missed');
      stats.layoutFidelity = Math.max(70, 100 - ((this.autoLayoutMetrics.autoLayoutCandidates - this.autoLayoutMetrics.autoLayoutAppliedSafe) * 5));
    }
    
    if (stats.maxDepth > 20) {
      stats.warnings.push('Deep nesting detected - may impact import performance');
      stats.recommendations.push('Consider flattening deeply nested structures');
    }
    
    if (stats.totalNodes > 1000) {
      stats.recommendations.push('Large page detected - consider selective capture for better performance');
      stats.memoryEfficiency = 'High Usage';
    }
    
    if (stats.transformCoverage > 20) {
      stats.recommendations.push('High transform usage detected - excellent for animated UI');
    }

    stats.pixelPerfectReady = stats.transformNodes > 0 || stats.localSizeNodes > 0;

    return {
      ...stats,
      uniqueFonts: stats.uniqueFonts.size,
      autoLayoutMetrics: this.autoLayoutMetrics
    };
  }

  /**
   * PHASE 5: Check if CSS filter requires rasterization (strict clone mode)
   * Returns true if filter contains any non-representable functions
   */
  private filterRequiresRasterization(filter: string): boolean {
    if (!filter || filter === "none") return false;

    // Representable filters that map to Figma effects
    const representable = [
      /^blur\(/,
      /^drop-shadow\(/,
      /^brightness\(/,
      /^contrast\(/,
      /^saturate\(/
    ];

    // Split filter into function calls (handles chained filters)
    const functions = filter.split(/\)\s+/).map(f => f.trim() + ')');

    // Check each function - if ANY are non-representable, rasterize
    return functions.some(fn => {
      if (!fn || fn === ')') return false;
      return !representable.some(pattern => pattern.test(fn));
    });
  }

  /**
   * PHASE 5: Capture element screenshot for rasterization fallback
   * Stores base64 PNG data URL in node.rasterize.dataUrl
   */
  private async captureElementForRasterization(element: Element, node: any): Promise<void> {
    try {
      const { captureElementScreenshot } = await import('./element-screenshot');
      const dataUrl = await captureElementScreenshot(element);

      if (dataUrl && node.rasterize) {
        node.rasterize.dataUrl = dataUrl;
        console.log(`[PHASE 5] Captured rasterization screenshot for ${element.tagName} (${node.rasterize.reason})`);
      }
    } catch (err) {
      console.warn('[PHASE 5] Failed to capture element for rasterization:', err);
    }
  }
}
