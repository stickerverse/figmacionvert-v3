import { logger } from "../logger";
import { UniversalCaptureConfig } from "./universal-capture-engine";

/**
 * DynamicContentHandler - Ensures the page is fully rendered and stable before capture.
 *
 * Handles network idle detection, framework hydration (React/Vue/etc.),
 * lazy-loaded content triggering, and animation settling.
 */
export class DynamicContentHandler {
  /**
   * Wait for all readiness signals based on configuration
   */
  async waitForPageReady(config: UniversalCaptureConfig): Promise<void> {
    logger.info("capture", "Ensuring page readiness", { config });
    const start = performance.now();

    const coreSignals = [
      this.waitForDOMReady(),
      this.waitForNetworkIdle(config.maxWaitTime),
      this.waitForImagesLoaded(),
    ];

    if (config.detectFramework && config.waitForHydration) {
      coreSignals.push(this.waitForFrameworkHydration());
    }

    // Wait for core structural and network signals
    await Promise.all(coreSignals);

    // Trigger lazy loading if requested (requires sequential scrolling)
    if (config.waitForLazyLoad) {
      await this.triggerLazyLoad();
    }

    // Wait for animations to settle if requested
    if (config.waitForAnimations) {
      await this.waitForStability(1000, "animations");
    }

    const duration = performance.now() - start;
    logger.info("capture", `Page ready in ${Math.round(duration)}ms`);
  }

  /**
   * Standard document load completion
   */
  private async waitForDOMReady(): Promise<void> {
    if (document.readyState === "complete") return;
    return new Promise((resolve) => {
      window.addEventListener("load", () => resolve(), { once: true });
    });
  }

  /**
   * Wait for network activity to subside
   */
  private async waitForNetworkIdle(timeout: number): Promise<void> {
    const SCOPE = "capture";
    const inflight = new Set<number>();
    let requestId = 0;

    const originalFetch = window.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    // Instrumentation
    window.fetch = (...args) => {
      const id = ++requestId;
      inflight.add(id);
      return originalFetch(...args).finally(() => inflight.delete(id));
    };

    XMLHttpRequest.prototype.open = function (...args: any[]) {
      (this as any).__trackId = ++requestId;
      return originalOpen.apply(this, args as any);
    };

    XMLHttpRequest.prototype.send = function (...args: any[]) {
      const id = (this as any).__trackId;
      if (id != null) {
        inflight.add(id);
        this.addEventListener("loadend", () => inflight.delete(id));
      }
      return originalSend.apply(this, args as any);
    };

    try {
      await new Promise<void>((resolve) => {
        const idleWindow = 1000;
        const start = performance.now();
        let lastActivity = performance.now();

        const interval = window.setInterval(() => {
          const now = performance.now();
          if (inflight.size === 0) {
            if (now - lastActivity >= idleWindow) {
              clearInterval(interval);
              resolve();
            }
          } else {
            lastActivity = now;
          }

          if (now - start > timeout) {
            logger.warn(SCOPE, "Network idle timed out, proceeding anyway", {
              inflight: inflight.size,
            });
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    } finally {
      // Restore originals
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
      XMLHttpRequest.prototype.send = originalSend;
    }
  }

  /**
   * Ensure all visible images are loaded
   */
  private async waitForImagesLoaded(): Promise<void> {
    const images = Array.from(document.images);
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          // Fail-safe timeout for slow/broken images
          setTimeout(resolve, 5000);
        });
      })
    );
  }

  /**
   * Framework-specific hydration waiting
   */
  private async waitForFrameworkHydration(): Promise<void> {
    const isReact = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const isVue = !!(window as any).__VUE__;
    const isNext = !!(window as any).__NEXT_DATA__;

    if (isReact || isNext) {
      await this.waitForStability(1500, "react-hydration");
    } else if (isVue) {
      await this.waitForStability(1000, "vue-hydration");
    } else {
      await this.waitForStability(500, "generic-hydration");
    }
  }

  /**
   * Wait for DOM stability (no mutations for X ms)
   */
  private async waitForStability(
    windowMs: number,
    context: string
  ): Promise<void> {
    return new Promise((resolve) => {
      let timeoutId: any;

      const observer = new MutationObserver(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, windowMs);
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Initial timeout in case no mutations happen
      timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, windowMs);
    });
  }

  /**
   * Sequentially scroll through the viewport to trigger lazy loading
   */
  private async triggerLazyLoad(): Promise<void> {
    logger.info("capture", "Triggering lazy load scroller");
    const originalScrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const bodyHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );

    // Incrementally scroll down
    for (
      let currentY = 0;
      currentY < bodyHeight;
      currentY += viewportHeight * 0.7
    ) {
      window.scrollTo(0, currentY);
      // Brief pause to allow browser to trigger lazy Load / intersection observers
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // Snap back to original position
    window.scrollTo(0, originalScrollY);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
