import { CaptureConfig } from "../config/capture-config";
import { logger } from "./logger";

export interface PageReadinessResult {
  domContentLoadedAt: number | null;
  networkIdleAt: number | null;
  fontsReadyAt: number | null;
  stableAt: number | null;
  fontsReadyTimedOut: boolean;
  usedLayoutShiftObserver: boolean;
  timedOut: boolean;
  navigationsDetected: number;
  urlAtStable: string;
}

export async function waitForStablePage(
  config: CaptureConfig
): Promise<PageReadinessResult> {
  const start = performance.now();
  const SCOPE = "capture";

  let domContentLoadedAt: number | null = null;
  let networkIdleAt: number | null = null;
  let fontsReadyAt: number | null = null;
  let stableAt: number | null = null;
  let fontsReadyTimedOut = false;
  let usedLayoutShiftObserver = false;
  let timedOut = false;
  let navigationsDetected = 0;
  let lastUrl = location.href;

  const cleanupCallbacks: Array<() => void> = [];
  const cleanup = () => {
    cleanupCallbacks.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
  };

  logger.info(SCOPE, "Waiting for page stability", { config });

  // DOMContentLoaded
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      const onReady = () => {
        domContentLoadedAt = performance.now() - start;
        document.removeEventListener("DOMContentLoaded", onReady);
        logger.debug(SCOPE, "DOMContentLoaded fired", {
          time: domContentLoadedAt,
        });
        resolve();
      };
      document.addEventListener("DOMContentLoaded", onReady, { once: true });
    });
  } else {
    domContentLoadedAt = performance.now() - start;
    logger.debug(SCOPE, "DOMContentLoaded already fired", {
      time: domContentLoadedAt,
    });
  }

  // Network idle (fetch/XHR)
  const inflight = new Set<number>();
  let requestId = 0;
  const REQUEST_TRACKING_TIMEOUT = 5000; // Ignore requests taking longer than 5s (likely streams/long-polling)

  const trackRequest = (id: number) => {
    inflight.add(id);
    // Auto-remove after timeout to ignore long-lived connections
    setTimeout(() => {
      if (inflight.has(id)) {
        inflight.delete(id);
        logger.debug(SCOPE, "Request tracking timed out (ignoring)", { id });
      }
    }, REQUEST_TRACKING_TIMEOUT);
  };

  const originalFetch = window.fetch;
  window.fetch = (...args) => {
    const id = ++requestId;
    trackRequest(id);
    return originalFetch(...args).finally(() => inflight.delete(id));
  };
  cleanupCallbacks.push(() => {
    window.fetch = originalFetch;
  });

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (...args: any[]) {
    (this as any).__trackId = ++requestId;
    return originalOpen.apply(this, args as any);
  };
  XMLHttpRequest.prototype.send = function (...args: any[]) {
    const id = (this as any).__trackId;
    if (id != null) {
      trackRequest(id);
      this.addEventListener("loadend", () => inflight.delete(id));
    }
    return originalSend.apply(this, args as any);
  };
  cleanupCallbacks.push(() => {
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
  });

  const networkIdlePromise = new Promise<void>((resolve) => {
    const idleWindow = 1000;
    const maxNetworkWait = Math.min(15000, config.maxCaptureDurationMs);
    let lastNonEmpty = performance.now();

    const interval = window.setInterval(() => {
      const now = performance.now();
      if (inflight.size === 0) {
        if (now - lastNonEmpty >= idleWindow) {
          networkIdleAt = now - start;
          clearInterval(interval);
          logger.info(SCOPE, "Network idle detected", { time: networkIdleAt });
          resolve();
        }
      } else {
        lastNonEmpty = now;
      }
      if (now - start > maxNetworkWait) {
        clearInterval(interval);
        logger.warn(SCOPE, "Network idle timed out", {
          inflightCount: inflight.size,
        });
        resolve(); // Proceed anyway
      }
    }, 100);
  });

  // Fonts
  const fontsPromise = (async () => {
    if (!("fonts" in document)) return;
    const timeoutMs = 5000;
    let timeoutId: number | undefined;
    try {
      await Promise.race([
        (document as any).fonts.ready.then(() => {
          fontsReadyAt = performance.now() - start;
          logger.debug(SCOPE, "Fonts ready", { time: fontsReadyAt });
        }),
        new Promise<void>((resolve) => {
          timeoutId = window.setTimeout(() => {
            fontsReadyTimedOut = true;
            logger.warn(SCOPE, "Fonts ready timed out");
            resolve();
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }
  })();

  await Promise.all([networkIdlePromise, fontsPromise]);

  // Layout stability
  const stableWindowMs = config.stableWindowMs;
  const globalTimeoutMs = config.maxCaptureDurationMs;
  let lastChange = performance.now();
  let layoutShiftObserver: PerformanceObserver | null = null;
  const navigationWatchInterval = window.setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      navigationsDetected += 1;
      lastChange = performance.now();
      logger.info(SCOPE, "Navigation detected during readiness wait", {
        url: lastUrl,
        navigationsDetected,
      });
    }
  }, 250);
  cleanupCallbacks.push(() => window.clearInterval(navigationWatchInterval));

  const supportedEntryTypes =
    (PerformanceObserver as any)?.supportedEntryTypes || [];
  if (supportedEntryTypes.includes("layout-shift")) {
    try {
      layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const anyEntry = entry as any;
          if (!anyEntry.hadRecentInput && anyEntry.value > 0) {
            lastChange = performance.now();
            logger.debug(SCOPE, "Layout shift detected", {
              value: anyEntry.value,
            });
          }
        }
      });
      layoutShiftObserver.observe({
        type: "layout-shift",
        buffered: true,
      } as any);
      usedLayoutShiftObserver = true;
      logger.info(SCOPE, "Using PerformanceObserver for layout stability");
    } catch (e) {
      logger.warn(SCOPE, "Failed to create PerformanceObserver", { error: e });
      layoutShiftObserver = null;
    }
  }
  cleanupCallbacks.push(() => {
    if (layoutShiftObserver) {
      try {
        layoutShiftObserver.disconnect();
      } catch {
        // ignore
      }
    }
  });

  const mutationObserver = new MutationObserver((mutations) => {
    lastChange = performance.now();
    // Throttle logging
    if (Math.random() < 0.01) {
      logger.debug(SCOPE, "Mutation detected", { count: mutations.length });
    }
  });

  // If PerformanceObserver is not available, we might want to be more sensitive with MutationObserver
  // or increase the stable window, but for now we use the same window.
  if (!usedLayoutShiftObserver) {
    logger.info(SCOPE, "Fallback to MutationObserver for layout stability");
  }

  const targetNode = document.body || document.documentElement;
  if (targetNode) {
    mutationObserver.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }
  cleanupCallbacks.push(() => mutationObserver.disconnect());

  try {
    await new Promise<void>((resolve, reject) => {
      const checkInterval = 100;
      const MINIMUM_WAIT_MS = 3000; // Wait at least 3 seconds before checking stability
      let hasWaitedMinimum = false;

      // For highly dynamic sites, force proceed after reasonable wait even if not stable
      const FORCE_PROCEED_MS = Math.max(10000, globalTimeoutMs * 0.4); // 40% of timeout or 10s minimum
      let forceProceedTimer: ReturnType<typeof setTimeout> | null = null;

      forceProceedTimer = setTimeout(() => {
        clearInterval(intervalId);
        if (layoutShiftObserver) layoutShiftObserver.disconnect();
        logger.warn(
          SCOPE,
          "Force proceeding after reasonable wait (page never stabilized)",
          {
            elapsed: performance.now() - start,
            lastChangeAgo: performance.now() - lastChange,
          }
        );
        stableAt = performance.now() - start;
        resolve();
      }, FORCE_PROCEED_MS);

      const intervalId = window.setInterval(() => {
        const now = performance.now();
        const elapsed = now - start;

        // Mark that we've waited the minimum time
        if (elapsed >= MINIMUM_WAIT_MS) {
          hasWaitedMinimum = true;
        }

        // Check for global timeout
        if (now - start > globalTimeoutMs) {
          clearInterval(intervalId);
          if (forceProceedTimer) clearTimeout(forceProceedTimer);
          timedOut = true;
          logger.error(SCOPE, "Page stability timed out", {
            phase: "layoutStable",
          });
          if (layoutShiftObserver) layoutShiftObserver.disconnect();
          reject(
            Object.assign(new Error("PAGE_NOT_STABLE"), {
              type: "PAGE_NOT_STABLE",
              phase: "layoutStable",
              url: lastUrl,
              timings: {
                domContentLoadedAt,
                networkIdleAt,
                fontsReadyAt,
                stableAt: null,
                elapsed: now - start,
              },
            })
          );
          return;
        }

        // Check for stability (only after minimum wait)
        if (hasWaitedMinimum && now - lastChange >= stableWindowMs) {
          stableAt = now - start;
          clearInterval(intervalId);
          if (forceProceedTimer) clearTimeout(forceProceedTimer);
          if (layoutShiftObserver) layoutShiftObserver.disconnect();
          logger.info(SCOPE, "Page stable", { time: stableAt });
          resolve();
        }
      }, checkInterval);
    });
  } finally {
    cleanup();
  }

  return {
    domContentLoadedAt,
    networkIdleAt,
    fontsReadyAt,
    stableAt,
    fontsReadyTimedOut,
    usedLayoutShiftObserver,
    timedOut,
    navigationsDetected,
    urlAtStable: lastUrl,
  };
}
