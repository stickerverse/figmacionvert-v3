export class PageScroller {
  private originalY = 0;
  private interactedElements = new Set<Element>();

  async scrollPage(
    maxScrollDepthScreens: number = 120,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this.originalY = window.scrollY;
    console.log(`📜 Starting page scroll (will restore to ${this.originalY}px)...`);

    try {
      const viewportHeight = window.innerHeight;
      let previousHeight = 0;
      let stableHeightCount = 0;
      let currentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      console.log(
        `📜 Will scroll up to ${maxScrollDepthScreens} times (initial height: ${currentHeight}px)`
      );

      for (let i = 0; i <= maxScrollDepthScreens; i++) {
        const scrollTo = i * viewportHeight;

        // Scroll with precise positioning
        window.scrollTo({
          top: scrollTo,
          behavior: "auto", // Always use auto for precision
        });

        // Update progress
        if (onProgress) {
          const dynamicSteps = Math.ceil(currentHeight / viewportHeight);
          onProgress(Math.min(100, (i / Math.max(1, dynamicSteps)) * 100));
        }

        // Wait for content to load and settle
        await this.wait(200);

        // Check for height stability to prevent infinite scroll
        const newHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );

        if (newHeight === previousHeight) {
          stableHeightCount++;
          // If height hasn't changed for 3 consecutive checks, we're likely done
          if (stableHeightCount >= 3) {
            console.log(`📜 Page height stabilized at ${newHeight}px (step ${i})`);
            break;
          }
        } else {
          stableHeightCount = 0;
          currentHeight = newHeight;
        }
        previousHeight = newHeight;

        // Hard stop if we've reached the calculated end
        if (scrollTo + viewportHeight >= newHeight) {
          console.log(`📜 Reached page end at ${newHeight}px (step ${i})`);
          break;
        }
      }
    } finally {
      // CRITICAL FIX: Always restore original scroll position (even if error occurs)
      console.log(`📜 Restoring scroll position to ${this.originalY}px`);
      window.scrollTo({ top: this.originalY, behavior: "auto" });
      await this.wait(300);
    }
  }

  /**
   * Interact with dropdowns, buttons, and expandable elements to capture all states
   * Uses CSP-safe methods to avoid security policy violations
   */
  async captureInteractiveStates(): Promise<void> {
    console.log("🖱️ Capturing interactive element states (CSP-safe mode)...");
    this.interactedElements.clear();

    try {
      // Find and interact with dropdowns
      await this.expandDropdowns();
    } catch (e) {
      console.warn("⚠️ Dropdown expansion encountered errors:", e);
    }

    try {
      // Find and click expandable buttons/accordions
      await this.expandAccordions();
    } catch (e) {
      console.warn("⚠️ Accordion expansion encountered errors:", e);
    }

    try {
      // Hover over hover-triggered elements
      await this.triggerHoverStates();
    } catch (e) {
      console.warn("⚠️ Hover state capture encountered errors:", e);
    }

    console.log(`🖱️ Interacted with ${this.interactedElements.size} elements`);
  }

  /**
   * CSP-safe click that uses MouseEvent dispatch instead of direct click
   */
  private safeClick(element: Element): boolean {
    try {
      // Method 1: Use MouseEvent dispatch (CSP-safe)
      const clickEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(clickEvent);
      return true;
    } catch (e) {
      // Method 2: Try focus + keyboard (for some dropdowns)
      try {
        if (element instanceof HTMLElement) {
          element.focus();
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            bubbles: true,
          });
          element.dispatchEvent(enterEvent);
          return true;
        }
      } catch (e2) {
        // Silently fail - CSP may block this
      }
      return false;
    }
  }

  private shouldIgnoreElement(element: Element): boolean {
    // CRITICAL FIX: Ensure element is valid before calling closest()
    if (!element || !(element instanceof Element)) return false;

    try {
      // 1. Check if element is inside a navigation container
      const navClosest = element.closest(
        'nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]'
      );
      if (navClosest) return true;
    } catch (error) {
      // If closest fails (e.g., element is detached), don't ignore it
      console.warn("⚠️ [SCROLLER] closest() failed on element:", error);
      return false;
    }

    // 2. Check for specific roles that often cause issues (menus, dialogs)
    const role = element.getAttribute("role");
    if (
      role === "menu" ||
      role === "menubar" ||
      role === "dialog" ||
      role === "alertdialog"
    )
      return true;

    // CRITICAL FIX: Ignore links to prevent accidental navigation
    if (element.tagName === "A" || element.closest("a")) return true;

    // CRITICAL FIX: Ignore YouTube interaction/navigation elements
    const tagName = element.tagName.toLowerCase();
    if (
      tagName.startsWith("ytd-thumbnail") ||
      tagName.startsWith("ytd-video-renderer") ||
      tagName.startsWith("ytd-compact-video-renderer") ||
      tagName.startsWith("ytd-menu-renderer") ||
      element.closest("ytd-thumbnail") ||
      element.closest("ytd-video-renderer")
    ) {
      return true;
    }

    // 3. Check for fixed/sticky positioning (often used for sidebars/modals)
    // We need to check the element and its ancestors
    let current: Element | null = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (style.position === "fixed" || style.position === "sticky") {
        // Allow some small fixed elements (like chat bubbles), but ignore large ones (sidebars)
        const rect = current.getBoundingClientRect();
        if (rect.width > 300 || rect.height > 300) {
          return true;
        }
      }
      current = current.parentElement;
    }

    return false;
  }

  private async expandDropdowns(): Promise<void> {
    // Select elements - native HTML selects
    const selects = document.querySelectorAll("select:not([disabled])");
    console.log(`🔽 Found ${selects.length} select dropdowns`);

    for (const select of Array.from(selects)) {
      if (this.interactedElements.has(select)) continue;
      if (this.shouldIgnoreElement(select)) continue;

      try {
        this.scrollIntoViewFast(select);
        await this.wait(50);

        // Focus to show options (CSP-safe)
        if (select instanceof HTMLSelectElement) {
          select.focus();
          // Dispatch mousedown event (CSP-safe)
          const mouseEvent = new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          select.dispatchEvent(mouseEvent);
        }
        await this.wait(100);

        this.interactedElements.add(select);
      } catch (e) {
        // Skip elements that cause CSP violations
      }
    }

    // Custom dropdown triggers (common patterns)
    const dropdownTriggers = document.querySelectorAll(
      [
        '[data-toggle="dropdown"]',
        '[aria-haspopup="true"]',
        '[aria-haspopup="listbox"]',
        '[aria-haspopup="menu"]',
        ".dropdown-toggle",
        ".dropdown-trigger",
        '[role="combobox"]',
      ].join(",")
    );

    console.log(`🔽 Found ${dropdownTriggers.length} custom dropdowns`);

    for (const trigger of Array.from(dropdownTriggers)) {
      if (this.interactedElements.has(trigger)) continue;
      if (this.shouldIgnoreElement(trigger)) continue;

      try {
        this.scrollIntoViewFast(trigger);
        await this.wait(50);

        // Use CSP-safe click
        this.safeClick(trigger);
        await this.wait(150);

        this.interactedElements.add(trigger);
      } catch (e) {
        // Skip elements that cause CSP violations
      }
    }
  }

  private async expandAccordions(): Promise<void> {
    // Accordion/collapsible triggers - use more specific selectors to avoid CSP issues
    const accordionTriggers = document.querySelectorAll(
      [
        '[data-toggle="collapse"]',
        '[aria-expanded="false"]:not([data-action])',
        "details:not([open]) > summary",
      ].join(",")
    );

    console.log(
      `📂 Found ${accordionTriggers.length} accordion/collapsible elements`
    );

    for (const trigger of Array.from(accordionTriggers)) {
      if (this.interactedElements.has(trigger)) continue;
      if (this.shouldIgnoreElement(trigger)) continue;

      try {
        this.scrollIntoViewFast(trigger);
        await this.wait(50);

        // Use CSP-safe click
        this.safeClick(trigger);
        await this.wait(200);

        this.interactedElements.add(trigger);
      } catch (e) {
        // Skip elements that cause CSP violations
      }
    }

    // Open all <details> elements directly (doesn't require JS execution)
    const details = document.querySelectorAll("details:not([open])");
    for (const detail of Array.from(details)) {
      if (this.shouldIgnoreElement(detail)) continue;
      try {
        (detail as HTMLDetailsElement).open = true;
        this.interactedElements.add(detail);
      } catch (e) {
        // Skip if CSP blocks this
      }
    }
  }

  private async triggerHoverStates(): Promise<void> {
    // Find elements that commonly have hover states - be more selective
    const hoverElements = document.querySelectorAll(
      [".tooltip-trigger", "[data-tooltip]", "nav > ul > li > a"].join(",")
    );

    console.log(`👆 Found ${hoverElements.length} potential hover elements`);

    // Only sample first 10 to avoid too much delay
    const sample = Array.from(hoverElements).slice(0, 10);

    for (const el of sample) {
      if (this.interactedElements.has(el)) continue;
      if (this.shouldIgnoreElement(el)) continue;

      try {
        // Trigger mouseenter/mouseover for hover states (CSP-safe)
        const enterEvent = new MouseEvent("mouseenter", {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        const overEvent = new MouseEvent("mouseover", {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        el.dispatchEvent(enterEvent);
        el.dispatchEvent(overEvent);
        await this.wait(30);

        this.interactedElements.add(el);
      } catch (e) {
        // Ignore hover errors - CSP may block some events
      }
    }
  }

  private scrollIntoViewFast(element: Element): void {
    try {
      element.scrollIntoView({ behavior: "auto", block: "center" });
    } catch (e) {
      // Some elements may not support scrollIntoView
    }
  }

  restore(): void {
    window.scrollTo({ top: this.originalY, behavior: "instant" });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
