/**
 * Intelligent Interaction Discoverer
 *
 * Advanced system that physically interacts with page elements to discover and capture
 * all possible states and hidden content (dropdowns, modals, tooltips, accordions, etc.)
 * for maximum visual accuracy in Figma conversion.
 */

import { ElementNode } from "../types/schema";
import { generateNodeId } from "./node-identity";
import { CircuitBreaker } from "./circuit-breaker";
import { ResourceMonitor } from "./resource-monitor";

export interface InteractionDiscoveryResult {
  originalNode: ElementNode;
  discoveredStates: DiscoveredState[];
  hiddenContent: HiddenContentNode[];
  interactionMap: InteractionMap;
}

export interface DiscoveredState {
  trigger: InteractionTrigger;
  stateName: string;
  capturedNode: ElementNode;
  screenshot?: string;
  parentPath: string[];
}

export interface HiddenContentNode extends ElementNode {
  triggerElement: Element;
  triggerType: "click" | "hover" | "focus" | "scroll" | "touch" | "keyboard";
  visibilityCondition: string;
  parentContainer?: Element;
}

export interface InteractionTrigger {
  type:
    | "click"
    | "hover"
    | "focus"
    | "scroll"
    | "touch"
    | "keyboard"
    | "form-input";
  element: Element;
  config?: {
    keys?: string[];
    scrollDirection?: "up" | "down" | "left" | "right";
    touchGesture?: "tap" | "swipe" | "pinch";
    inputValue?: string | boolean | number;
  };
}

export interface InteractionMap {
  [elementId: string]: {
    triggers: InteractionTrigger[];
    reveals: string[]; // IDs of elements that become visible
    modifies: string[]; // IDs of elements that change state
  };
}

export interface DiscoveryProgress {
  phase:
    | "scanning"
    | "testing-interactions"
    | "capturing-states"
    | "analyzing-scripts"
    | "completing";
  message: string;
  progress: number;
  currentElement?: Element;
  discoveredCount: number;
  totalElements: number;
}

type ProgressCallback = (progress: DiscoveryProgress) => void;

export class IntelligentInteractionDiscoverer {
  private originalDocumentState: string = "";
  private mutationObserver?: MutationObserver;
  private discoveredElements = new Set<Element>();
  private interactionResults = new Map<Element, InteractionDiscoveryResult>();
  private progressCallback?: ProgressCallback;
  private abortController = new AbortController();

  // Guardrails
  private circuitBreaker = new CircuitBreaker({
    maxOperations: 5000, // Limit interaction attempts
    maxDurationMs: 30000, // 30 seconds max discovery time
    name: "InteractionDiscoverer",
  });

  // Strict interaction check based on ARIA, computed styles, and semantics
  private isStrictlyInteractive(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false;

    // 1. Check ARIA Roles
    const role = element.getAttribute("role");
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
    ];
    if (role && interactiveRoles.includes(role)) return true;

    // 2. Check Semantic Tags
    const tagName = element.tagName.toLowerCase();
    const interactiveTags = [
      "button",
      "a",
      "input",
      "select",
      "textarea",
      "details",
      "summary",
    ];
    if (interactiveTags.includes(tagName)) {
      // Filter out disabled inputs/buttons
      if ((element as any).disabled) return false;
      // Filter out anchors without href (unless they have onclick)
      if (
        tagName === "a" &&
        !element.hasAttribute("href") &&
        !element.hasAttribute("onclick")
      )
        return false;
      return true;
    }

    // 3. Check Computed Styles (Cursor: Pointer)
    // This is a strong signal for custom interactive elements
    const style = window.getComputedStyle(element);
    if (style.cursor === "pointer") return true;

    // 4. Check Explicit Event Handlers
    if (
      element.hasAttribute("onclick") ||
      element.hasAttribute("ng-click") ||
      element.hasAttribute("@click")
    )
      return true;

    // 5. Check Tabindex
    // Elements in the tab order are usually interactive
    if (
      element.hasAttribute("tabindex") &&
      parseInt(element.getAttribute("tabindex") || "-1") >= 0
    )
      return true;

    return false;
  }

  // Selectors for elements that might contain hidden content
  private static readonly HIDDEN_CONTENT_SELECTORS = [
    '[style*="display: none"]',
    '[style*="visibility: hidden"]',
    "[hidden]",
    ".hidden",
    ".invisible",
    '[aria-hidden="true"]',
    ".sr-only",
    ".dropdown-menu",
    ".dropdown-content",
    ".modal",
    ".dialog",
    ".popup",
    ".overlay",
    ".tooltip",
    ".popover",
    ".accordion-content",
    ".collapsible-content",
    ".tab-content",
    ".tab-panel",
    ".menu",
    ".submenu",
    ".off-canvas",
    ".sidebar",
  ];

  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  private reportProgress(
    phase: DiscoveryProgress["phase"],
    message: string,
    progress: number,
    currentElement?: Element
  ) {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        message,
        progress,
        currentElement,
        discoveredCount: this.discoveredElements.size,
        totalElements: 0, // Will be set later when we know total
      });
    }
  }

  /**
   * Main discovery method - comprehensively discovers all interactive states and hidden content
   */
  async discoverAllInteractions(
    rootElement: Element = document.body
  ): Promise<Map<Element, InteractionDiscoveryResult>> {
    try {
      this.reportProgress(
        "scanning",
        "Starting comprehensive interaction discovery...",
        0
      );

      this.circuitBreaker.reset(); // Reset for new discovery session

      // Store original document state for restoration
      this.storeOriginalState();

      // Set up mutation observer to track dynamic changes
      this.setupMutationObserver();

      // Phase 1: Scan for interactive elements
      this.reportProgress(
        "scanning",
        "Scanning for interactive elements...",
        10
      );
      const interactiveElements = await this.findAllInteractiveElements(
        rootElement
      );

      // Phase 2: Analyze JavaScript event listeners
      this.reportProgress(
        "analyzing-scripts",
        "Analyzing JavaScript interactions...",
        20
      );
      const scriptAnalyzedElements = await this.analyzeJavaScriptInteractions(
        rootElement
      );

      // Combine all discovered elements
      const allElements = [...interactiveElements, ...scriptAnalyzedElements];
      this.reportProgress(
        "scanning",
        `Found ${allElements.length} potentially interactive elements`,
        30
      );

      // Phase 2.5: Deterministic Nav Hover
      this.reportProgress(
        "testing-interactions",
        "Discovering navigation states...",
        35
      );
      await this.discoverNavHoverStates(rootElement);

      // Phase 3: Test each interaction type
      this.reportProgress(
        "testing-interactions",
        "Testing interactions and discovering states...",
        40
      );

      let processed = 0;
      for (const element of allElements) {
        if (this.abortController.signal.aborted) break;

        // Guardrails
        try {
          this.circuitBreaker.tick();
          if (processed % 50 === 0) {
            ResourceMonitor.checkHealth();
          }
        } catch (error) {
          console.warn("🚨 Interaction discovery stopped by guardrail:", error);
          break; // Stop processing but return what we found so far
        }

        processed++;
        const progressPercent = 40 + (processed / allElements.length) * 50;

        this.reportProgress(
          "testing-interactions",
          `Testing interactions on ${element.tagName.toLowerCase()}... (${processed}/${
            allElements.length
          })`,
          progressPercent,
          element
        );

        const result = await this.discoverElementInteractions(element);
        if (
          result.discoveredStates.length > 0 ||
          result.hiddenContent.length > 0
        ) {
          this.interactionResults.set(element, result);
          this.discoveredElements.add(element);
        }

        // Add small delay to prevent overwhelming the DOM
        await this.wait(10);
      }

      // Phase 4: Completion
      this.reportProgress("completing", "Finalizing discovery results...", 95);

      // Clean up and restore original state
      await this.cleanup();

      this.reportProgress(
        "completing",
        `Discovery complete! Found ${this.discoveredElements.size} interactive elements`,
        100
      );

      return this.interactionResults;
    } catch (error) {
      console.error("❌ Interaction discovery failed:", error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Find all potentially interactive elements using strict logic
   */
  private async findAllInteractiveElements(
    rootElement: Element
  ): Promise<Element[]> {
    const elements = new Set<Element>();
    const allElements = rootElement.querySelectorAll("*");

    // Iterate through all elements and check strict criteria
    allElements.forEach((el) => {
      if (this.isStrictlyInteractive(el)) {
        elements.add(el);
      }
    });

    // Method 2: Find elements with event listeners attached (still useful)
    const elementsWithListeners = await this.findElementsWithEventListeners(
      rootElement
    );
    elementsWithListeners.forEach((el) => elements.add(el));

    // Method 3: Find elements with interactive CSS (cursor: pointer) - now integrated into isStrictlyInteractive
    // but we keep findElementsWithInteractiveCss for legacy support if needed, or remove it.
    // Actually, isStrictlyInteractive covers cursor: pointer, so we can skip the separate call.

    return Array.from(elements).filter((el) =>
      this.isValidInteractiveElement(el)
    );
  }

  /**
   * Analyze JavaScript to find programmatically interactive elements
   */
  private async analyzeJavaScriptInteractions(
    rootElement: Element
  ): Promise<Element[]> {
    const elements: Element[] = [];

    try {
      // Look for elements referenced in window event handlers
      const scripts = document.querySelectorAll("script");
      const scriptContents: string[] = [];

      scripts.forEach((script) => {
        if (script.textContent) {
          scriptContents.push(script.textContent);
        }
      });

      // Analyze inline script content for interaction patterns
      const combinedScript = scriptContents.join("\n");
      const interactionPatterns = [
        /addEventListener\s*\(\s*['"]([^'"]+)['"]/g,
        /on(click|hover|focus|blur|change|input|submit)\s*=/g,
        /\$\([^)]+\)\.(click|hover|focus|blur|change|on)\(/g,
        /document\.getElementById\(['"]([^'"]+)['"]\)/g,
        /querySelector\(['"]([^'"]+)['"]\)/g,
      ];

      const referencedSelectors = new Set<string>();

      interactionPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(combinedScript)) !== null) {
          if (match[1]) {
            referencedSelectors.add(match[1]);
          }
        }
      });

      // Try to find elements using the discovered selectors
      referencedSelectors.forEach((selector) => {
        try {
          const found = rootElement.querySelectorAll(selector);
          found.forEach((el) => elements.push(el));
        } catch {
          // Invalid selector, skip
        }
      });
    } catch (error) {
      console.warn("JavaScript analysis failed:", error);
    }

    return elements;
  }

  /**
   * Find elements with event listeners using getEventListeners (if available)
   */
  private async findElementsWithEventListeners(
    rootElement: Element
  ): Promise<Element[]> {
    const elements: Element[] = [];

    try {
      // This only works in DevTools context, but let's try
      const allElements = rootElement.querySelectorAll("*");

      allElements.forEach((element) => {
        // Check for inline event handlers
        const attributes = element.attributes;
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          if (attr.name.startsWith("on") && attr.value.trim()) {
            elements.push(element);
            break;
          }
        }
      });
    } catch (error) {
      console.warn("Event listener detection failed:", error);
    }

    return elements;
  }

  /**
   * Find elements with interactive CSS properties
   */
  private findElementsWithInteractiveCss(rootElement: Element): Element[] {
    const elements: Element[] = [];
    const allElements = rootElement.querySelectorAll("*");

    allElements.forEach((element) => {
      const computed = window.getComputedStyle(element);

      // Check for interactive cursor styles
      if (computed.cursor === "pointer" || computed.cursor === "grab") {
        elements.push(element);
      }

      // Check for hover effects in CSS (by temporarily applying hover class)
      if (this.hasHoverEffects(element)) {
        elements.push(element);
      }
    });

    return elements;
  }

  /**
   * Find custom interactive elements using heuristics
   */
  private findCustomInteractiveElements(rootElement: Element): Element[] {
    const elements: Element[] = [];
    const allElements = rootElement.querySelectorAll("*");

    allElements.forEach((element) => {
      // Look for elements with class names suggesting interactivity
      const className = element.className.toString().toLowerCase();
      const interactiveKeywords = [
        "click",
        "hover",
        "active",
        "toggle",
        "expand",
        "collapse",
        "open",
        "close",
        "show",
        "hide",
        "trigger",
        "action",
        "interactive",
        "selectable",
        "draggable",
      ];

      if (interactiveKeywords.some((keyword) => className.includes(keyword))) {
        elements.push(element);
      }

      // Look for data attributes suggesting interactivity
      const dataAttributes = Array.from(element.attributes)
        .filter((attr) => attr.name.startsWith("data-"))
        .map((attr) => attr.name.toLowerCase());

      if (
        dataAttributes.some((attr) =>
          interactiveKeywords.some((keyword) => attr.includes(keyword))
        )
      ) {
        elements.push(element);
      }
    });

    return elements;
  }

  /**
   * Test all possible interactions for a single element
   */
  private async discoverElementInteractions(
    element: Element
  ): Promise<InteractionDiscoveryResult> {
    const result: InteractionDiscoveryResult = {
      originalNode: this.captureElementState(element),
      discoveredStates: [],
      hiddenContent: [],
      interactionMap: {},
    };

    try {
      // Test different interaction types
      const interactions: InteractionTrigger[] = [
        { type: "click", element },
        { type: "hover", element },
        { type: "focus", element },
      ];

      // Add specific interactions based on element type
      if (element.tagName.toLowerCase() === "select") {
        interactions.push({ type: "click", element }); // For opening dropdown
      }

      if (element.hasAttribute("aria-expanded")) {
        interactions.push({ type: "click", element }); // For toggle elements
      }

      for (const interaction of interactions) {
        if (this.abortController.signal.aborted) break;

        try {
          const discoveredState = await this.testInteraction(interaction);
          if (discoveredState) {
            result.discoveredStates.push(discoveredState);
          }
        } catch (error) {
          console.warn(
            `Interaction test failed for ${element.tagName}:`,
            error
          );
        }

        // Small delay between interactions
        await this.wait(50);
      }
    } catch (error) {
      console.warn("Element interaction discovery failed:", error);
    }

    return result;
  }

  /**
   * Test a specific interaction and capture the resulting state
   */
  private async testInteraction(
    trigger: InteractionTrigger
  ): Promise<DiscoveredState | null> {
    const element = trigger.element;
    const originalVisibility = this.getElementVisibility(element);

    // Store current state of nearby elements that might change
    const nearbyElements = this.findNearbyElements(element);
    const originalStates = nearbyElements.map((el) => ({
      element: el,
      visibility: this.getElementVisibility(el),
      computedStyle: window.getComputedStyle(el).cssText,
    }));

    try {
      // Perform the interaction
      await this.performInteraction(trigger);

      // Wait for any animations or async changes
      await this.wait(200);

      // Check if anything changed
      const changedElements = originalStates.filter((state) => {
        const currentVisibility = this.getElementVisibility(state.element);
        const currentStyle = window.getComputedStyle(state.element).cssText;

        return (
          currentVisibility !== state.visibility ||
          currentStyle !== state.computedStyle
        );
      });

      if (changedElements.length > 0) {
        // Something changed! Capture the new state
        const capturedNode = this.captureElementState(element);
        const stateName = this.generateStateName(trigger, changedElements);

        return {
          trigger,
          stateName,
          capturedNode,
          parentPath: this.generateElementPath(element),
        };
      }
    } finally {
      // Always try to restore original state
      await this.restoreInteractionState(trigger);
    }

    return null;
  }

  /**
   * Physically perform the interaction (click, hover, etc.)
   */
  private async performInteraction(trigger: InteractionTrigger): Promise<void> {
    const { type, element, config } = trigger;

    switch (type) {
      case "click":
        if (element instanceof HTMLElement) {
          // Scroll element into view first
          element.scrollIntoView({ behavior: "instant", block: "center" });
          await this.wait(50);

          // Perform click
          element.click();
        }
        break;

      case "hover":
        if (element instanceof HTMLElement) {
          // Simulate hover using mouse events
          const rect = element.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const hoverEvent = new MouseEvent("mouseover", {
            bubbles: true,
            clientX: centerX,
            clientY: centerY,
          });
          element.dispatchEvent(hoverEvent);
        }
        break;

      case "focus":
        if (element instanceof HTMLElement) {
          element.focus();
        }
        break;

      case "form-input":
        if (
          element instanceof HTMLInputElement &&
          config?.inputValue !== undefined
        ) {
          element.value = String(config.inputValue);
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
    }
  }

  /**
   * Attempt to restore state after interaction
   */
  private async restoreInteractionState(
    trigger: InteractionTrigger
  ): Promise<void> {
    const { type, element } = trigger;

    try {
      switch (type) {
        case "click":
          // Try clicking again to toggle back, or press Escape
          if (element instanceof HTMLElement) {
            // First try clicking again
            element.click();
            await this.wait(100);

            // If that doesn't work, try pressing Escape
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape" })
            );
            await this.wait(100);
          }
          break;

        case "hover":
          // Move mouse away
          if (element instanceof HTMLElement) {
            const mouseLeaveEvent = new MouseEvent("mouseleave", {
              bubbles: true,
            });
            element.dispatchEvent(mouseLeaveEvent);
          }
          break;

        case "focus":
          if (element instanceof HTMLElement) {
            element.blur();
          }
          break;
      }
    } catch (error) {
      console.warn("Failed to restore interaction state:", error);
    }
  }

  // Helper methods

  private storeOriginalState(): void {
    this.originalDocumentState = document.documentElement.outerHTML;
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      // Track dynamic changes for analysis
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              // New content appeared - might be dynamic
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "aria-expanded", "aria-hidden"],
    });
  }

  private isValidInteractiveElement(element: Element): boolean {
    // Basic visibility check
    if (element instanceof HTMLElement) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      // Safety filters
      // 1. Explicit opt-out
      if (element.closest("[data-no-auto-click]")) {
        return false;
      }

      // 2. External links or new tabs
      if (element instanceof HTMLAnchorElement) {
        const href = element.getAttribute("href");
        const target = element.getAttribute("target");

        if (target === "_blank") return false;
        if (
          href &&
          (href.startsWith("http") || href.startsWith("//")) &&
          !href.includes(window.location.hostname)
        ) {
          // Allow if explicitly whitelisted (future proofing)
          if (!element.hasAttribute("data-allow-external-capture")) {
            return false;
          }
        }
        if (href && (href.startsWith("mailto:") || href.startsWith("tel:"))) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Deterministically discover hover states for navigation menus
   */
  private async discoverNavHoverStates(rootElement: Element): Promise<void> {
    const navSelectors = [
      "nav",
      ".navbar",
      '[role="navigation"]',
      ".header-nav",
      "#main-nav",
    ];
    const navElements = new Set<Element>();

    for (const selector of navSelectors) {
      rootElement
        .querySelectorAll(selector)
        .forEach((el) => navElements.add(el));
    }

    for (const nav of navElements) {
      // Find top-level interactive items in this nav
      const items = Array.from(
        nav.querySelectorAll('a, button, [role="menuitem"], .nav-item')
      );

      // Limit to first 5 items to avoid explosion
      const limit = 5;
      const targetItems = items.slice(0, limit);

      for (const item of targetItems) {
        if (this.isValidInteractiveElement(item)) {
          await this.testInteraction({ type: "hover", element: item });
        }
      }
    }
  }

  private hasHoverEffects(element: Element): boolean {
    // This is a simplified check - in reality, we'd need to analyze CSS rules
    const className = element.className.toString();
    return className.includes("hover") || className.includes("transition");
  }

  private getElementVisibility(
    element: Element
  ): "visible" | "hidden" | "partial" {
    if (!(element instanceof HTMLElement)) return "hidden";

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return "hidden";
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return "hidden";
    }

    // Check if element is in viewport
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth;

    return isInViewport ? "visible" : "partial";
  }

  private findNearbyElements(element: Element): Element[] {
    const elements: Element[] = [];

    // Add parent and children
    if (element.parentElement) {
      elements.push(element.parentElement);
    }
    Array.from(element.children).forEach((child) => elements.push(child));

    // Add siblings
    if (element.parentElement) {
      Array.from(element.parentElement.children).forEach((sibling) => {
        if (sibling !== element) {
          elements.push(sibling);
        }
      });
    }

    return elements;
  }

  private captureElementState(element: Element): ElementNode {
    // This would integrate with your existing DOM extraction logic
    // For now, return a basic structure
    return {
      id: this.generateElementId(element),
      name: this.generateElementName(element),
      type: "FRAME", // This would be determined by your existing logic
      bounds: element.getBoundingClientRect(),
      visible: true,
      children: [],
      layout: {
        x: element.getBoundingClientRect().left,
        y: element.getBoundingClientRect().top,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      },
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: element.className
        .toString()
        .split(" ")
        .filter((c) => c.trim()),
    } as ElementNode;
  }

  private generateStateName(
    trigger: InteractionTrigger,
    changedElements: any[]
  ): string {
    const triggerType = trigger.type;
    const elementType = trigger.element.tagName.toLowerCase();
    return `${elementType}-${triggerType}-state`;
  }

  private generateElementPath(element: Element): string[] {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      path.unshift(this.generateElementId(current));
      current = current.parentElement;
    }

    return path;
  }

  private generateElementId(element: Element): string {
    return generateNodeId(element);
  }

  private generateElementName(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toString().trim();
    const id = element.id;

    if (id) return `${tagName}#${id}`;
    if (className) return `${tagName}.${className.split(" ")[0]}`;
    return tagName;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cleanup(): void {
    // Stop mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Clear any temporary state
    this.discoveredElements.clear();

    // Try to restore any modified elements
    // Note: Full restoration might not be possible for complex interactions
    console.log("🧹 Interaction discovery cleanup complete");
  }

  /**
   * Abort ongoing discovery process
   */
  abort(): void {
    this.abortController.abort();
    this.cleanup();
  }
}
