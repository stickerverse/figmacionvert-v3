export class PageScroller {
  private originalY = 0;
  private interactedElements = new Set<Element>();

  async scrollPage(
    maxScrollDepthScreens: number = 120,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this.originalY = window.scrollY;
    console.log("📜 Starting page scroll...");

    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const viewportHeight = window.innerHeight;
    let steps = Math.ceil(height / viewportHeight);

    // Cap excessive scroll steps
    if (steps > maxScrollDepthScreens) {
      console.warn(
        `⚠️ Page height very large (${height}px). Capping scroll steps from ${steps} to ${maxScrollDepthScreens} to avoid stalls.`
      );
      steps = maxScrollDepthScreens;
    }

    console.log(
      `📜 Will scroll ${steps} times (max depth: ${maxScrollDepthScreens})`
    );

    for (let i = 0; i <= steps; i++) {
      const scrollTo = i * viewportHeight;
      // console.log(`📜 Scrolling to ${scrollTo}px`); // Reduce noise

      window.scrollTo({
        top: scrollTo,
        behavior: "smooth",
      });

      if (onProgress) {
        onProgress((i / steps) * 100);
      }

      await this.wait(300); // Fast scroll - 300ms between scrolls
    }

    console.log("📜 Scrolling back to top");
    window.scrollTo({ top: 0, behavior: "smooth" });
    await this.wait(200);
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
    // 1. Check if element is inside a navigation container
    const navClosest = element.closest(
      'nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]'
    );
    if (navClosest) return true;

    // 2. Check for specific roles that often cause issues (menus, dialogs)
    const role = element.getAttribute("role");
    if (
      role === "menu" ||
      role === "menubar" ||
      role === "dialog" ||
      role === "alertdialog"
    )
      return true;

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
