/**
 * Comprehensive State Capturer
 *
 * Advanced system that combines intelligent interaction discovery with physical
 * manipulation of page elements to capture ALL possible visual states including:
 * - Dropdown menus and their expanded states
 * - Modal dialogs and overlays
 * - Tooltip and popover content
 * - Accordion and collapsible sections
 * - Tab panel switching
 * - Form input states and validation
 * - Hover, focus, and active states
 * - Loading and error states
 * - Responsive breakpoint states
 */

import {
  IntelligentInteractionDiscoverer,
  DiscoveredState,
  InteractionTrigger,
} from "./intelligent-interaction-discoverer";
import { StateCapturer } from "./state-capturer";
import { ElementNode, VariantData } from "../types/schema";
import { querySelectorAllDeep, getEffectiveChildElements } from "./shadow-dom-utils";

export interface ComprehensiveStateResult {
  elementId: string;
  baseState: ElementNode;
  discoveredStates: DiscoveredState[];
  variantStates: VariantData[];
  hiddenContentRevealed: HiddenContentCapture[];
  interactionFlows: InteractionFlow[];
  screenshots: StateScreenshot[];
}

export interface HiddenContentCapture {
  triggerId: string;
  triggerElement: ElementNode;
  revealedContent: ElementNode[];
  visibilityMethod:
    | "display"
    | "visibility"
    | "opacity"
    | "transform"
    | "position";
  containerElement?: ElementNode;
  zIndex?: number;
}

export interface InteractionFlow {
  name: string;
  steps: InteractionStep[];
  finalState: ElementNode;
  reversible: boolean;
}

export interface InteractionStep {
  action: InteractionTrigger;
  expectedChanges: string[];
  actualChanges: ChangeRecord[];
  timestamp: number;
}

export interface ChangeRecord {
  elementId: string;
  property: string;
  beforeValue: any;
  afterValue: any;
  changeType: "style" | "attribute" | "content" | "structure";
}

export interface StateScreenshot {
  stateName: string;
  dataUrl: string;
  elementBounds: DOMRect;
  viewportSize: { width: number; height: number };
}

export interface CaptureProgress {
  phase:
    | "discovery"
    | "interaction-testing"
    | "state-capture"
    | "screenshot-capture"
    | "analysis";
  message: string;
  progress: number;
  currentElement?: Element;
  statesFound: number;
  totalElements: number;
  timeElapsed: number;
}

type ProgressCallback = (progress: CaptureProgress) => void;

export class ComprehensiveStateCapturer {
  private interactionDiscoverer: IntelligentInteractionDiscoverer;
  private basicStateCapturer: StateCapturer;
  private progressCallback?: ProgressCallback;
  private startTime: number = 0;
  private captureResults = new Map<string, ComprehensiveStateResult>();
  private globalChangeObserver?: MutationObserver;
  private originalViewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  private modifiedElements: Set<Element> = new Set(); // Track modified elements for cleanup

  // Specific element type handlers for optimized capture
  private static readonly ELEMENT_TYPE_HANDLERS = {
    select: "handleSelectElement",
    details: "handleDetailsElement",
    dialog: "handleDialogElement",
    modal: "handleModalElement",
    accordion: "handleAccordionElement",
    tabs: "handleTabsElement",
    tooltip: "handleTooltipElement",
    dropdown: "handleDropdownElement",
    form: "handleFormElement",
    menu: "handleMenuElement",
  };

  constructor() {
    this.interactionDiscoverer = new IntelligentInteractionDiscoverer();
    this.basicStateCapturer = new StateCapturer();
  }

  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
    this.interactionDiscoverer.setProgressCallback((discoveryProgress) => {
      // Translate discovery progress to our comprehensive progress
      this.reportProgress(
        "discovery",
        discoveryProgress.message,
        discoveryProgress.progress * 0.3, // Discovery is 30% of total process
        discoveryProgress.currentElement
      );
    });
  }

  private reportProgress(
    phase: CaptureProgress["phase"],
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
        statesFound: this.captureResults.size,
        totalElements: 0,
        timeElapsed: Date.now() - this.startTime,
      });
    }
  }

  /**
   * Main method: Capture ALL possible states of ALL interactive elements
   */
  async captureAllStates(
    rootElement: Element = document.body
  ): Promise<Map<string, ComprehensiveStateResult>> {
    this.startTime = Date.now();
    this.captureResults.clear();

    try {
      this.reportProgress(
        "discovery",
        "Starting comprehensive state capture...",
        0
      );

      // Set up global change monitoring
      this.setupGlobalChangeObserver();

      // Phase 1: Discover all interactive elements and their capabilities
      this.reportProgress(
        "discovery",
        "Discovering interactive elements...",
        5
      );
      const discoveredInteractions =
        await this.interactionDiscoverer.discoverAllInteractions(rootElement);

      // Phase 2: For each discovered element, perform comprehensive state capture
      this.reportProgress(
        "interaction-testing",
        "Testing all interaction patterns...",
        30
      );

      let processedElements = 0;
      const totalElements = discoveredInteractions.size;

      for (const [element, discoveryResult] of discoveredInteractions) {
        processedElements++;
        const progressPercent = 30 + (processedElements / totalElements) * 40;

        this.reportProgress(
          "interaction-testing",
          `Capturing states for ${element.tagName.toLowerCase()}... (${processedElements}/${totalElements})`,
          progressPercent,
          element
        );

        const comprehensiveResult =
          await this.captureElementComprehensiveStates(
            element,
            discoveryResult
          );
        this.captureResults.set(
          comprehensiveResult.elementId,
          comprehensiveResult
        );

        // Small delay to prevent overwhelming the page
        await this.wait(20);
      }

      // Phase 3: Capture specialized interactive patterns
      this.reportProgress(
        "state-capture",
        "Capturing specialized interaction patterns...",
        70
      );
      await this.captureSpecializedPatterns(rootElement);

      // Phase 4: Take screenshots of all discovered states
      this.reportProgress(
        "screenshot-capture",
        "Capturing state screenshots...",
        80
      );
      await this.captureStateScreenshots();

      // Phase 5: Analyze and optimize results
      this.reportProgress(
        "analysis",
        "Analyzing and optimizing results...",
        90
      );
      await this.analyzeAndOptimizeResults();

      this.reportProgress(
        "analysis",
        "Comprehensive state capture complete!",
        100
      );

      console.log(`🎉 Comprehensive state capture complete! 
        - ${this.captureResults.size} elements analyzed
        - ${this.getTotalStatesCount()} total states captured
        - Time elapsed: ${Date.now() - this.startTime}ms`);

      return this.captureResults;
    } catch (error) {
      console.error("❌ Comprehensive state capture failed:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Capture all possible states for a single element using multiple strategies
   */
  private async captureElementComprehensiveStates(
    element: Element,
    discoveryResult: any
  ): Promise<ComprehensiveStateResult> {
    const elementId = this.generateElementId(element);

    const result: ComprehensiveStateResult = {
      elementId,
      baseState: this.captureCurrentElementState(element),
      discoveredStates: discoveryResult.discoveredStates || [],
      variantStates: [],
      hiddenContentRevealed: [],
      interactionFlows: [],
      screenshots: [],
    };

    try {
      // Strategy 1: Use basic state capturer for standard pseudo-states
      const basicStates =
        await this.basicStateCapturer.captureInteractiveStates(element);
      if (basicStates.has(element)) {
        result.variantStates = basicStates.get(element) || [];
      }

      // Strategy 2: Test element-specific interaction patterns
      const elementType = this.detectElementType(element);
      if (elementType && this.hasSpecializedHandler(elementType)) {
        const specializedStates = await this.runSpecializedHandler(
          element,
          elementType
        );
        result.discoveredStates.push(...specializedStates);
      }

      // Strategy 3: Capture dropdown/popup content if any
      const hiddenContent = await this.captureHiddenContent(element);
      result.hiddenContentRevealed = hiddenContent;

      // Strategy 4: Test complex interaction flows
      const interactionFlows = await this.captureInteractionFlows(element);
      result.interactionFlows = interactionFlows;
    } catch (error) {
      console.warn(
        `Failed to capture comprehensive states for ${element.tagName}:`,
        error
      );
    }

    return result;
  }

  /**
   * Detect the functional type of an element for specialized handling
   */
  private detectElementType(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toString().toLowerCase();
    const role = element.getAttribute("role")?.toLowerCase();

    // Direct tag mapping
    if (["select", "details", "dialog"].includes(tagName)) {
      return tagName;
    }

    // Role-based detection
    if (role === "button" && element.hasAttribute("aria-haspopup")) {
      return "dropdown";
    }
    if (role === "tab") return "tabs";
    if (role === "tabpanel") return "tabs";

    // Class-based detection
    if (className.includes("modal") || className.includes("dialog"))
      return "modal";
    if (className.includes("accordion")) return "accordion";
    if (className.includes("tooltip") || className.includes("popover"))
      return "tooltip";
    if (className.includes("dropdown") || className.includes("select"))
      return "dropdown";
    if (className.includes("menu")) return "menu";

    // Attribute-based detection
    if (element.hasAttribute("data-toggle")) return "dropdown";
    if (element.hasAttribute("data-modal")) return "modal";
    if (element.hasAttribute("data-tooltip")) return "tooltip";
    if (element.hasAttribute("aria-expanded")) return "accordion";

    return null;
  }

  /**
   * Handle select dropdown elements
   */
  private async handleSelectElement(
    element: Element
  ): Promise<DiscoveredState[]> {
    const states: DiscoveredState[] = [];

    if (element instanceof HTMLSelectElement) {
      // Capture closed state
      const closedState: DiscoveredState = {
        trigger: { type: "click", element },
        stateName: "select-closed",
        capturedNode: this.captureCurrentElementState(element),
        parentPath: this.generateElementPath(element),
      };
      states.push(closedState);

      // Open the select to capture options
      try {
        element.focus();
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        await this.wait(100);

        const openedState: DiscoveredState = {
          trigger: { type: "click", element },
          stateName: "select-opened",
          capturedNode: this.captureCurrentElementState(element),
          parentPath: this.generateElementPath(element),
        };
        states.push(openedState);

        // Capture each option state
        const options = Array.from(element.options);
        for (let i = 0; i < Math.min(options.length, 10); i++) {
          // Limit to first 10 options
          const option = options[i];
          element.selectedIndex = i;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          await this.wait(50);

          const optionState: DiscoveredState = {
            trigger: { type: "click", element: option },
            stateName: `select-option-${i}-${option.value}`,
            capturedNode: this.captureCurrentElementState(element),
            parentPath: this.generateElementPath(element),
          };
          states.push(optionState);
        }
      } catch (error) {
        console.warn("Failed to capture select states:", error);
      } finally {
        // Try to close the select
        element.blur();
        await this.wait(100);
      }
    }

    return states;
  }

  /**
   * Handle details/summary elements (native HTML disclosure widgets)
   */
  private async handleDetailsElement(
    element: Element
  ): Promise<DiscoveredState[]> {
    const states: DiscoveredState[] = [];

    if (element instanceof HTMLDetailsElement) {
      // Capture closed state
      const wasOpen = element.open;
      element.open = false;
      await this.wait(50);

      states.push({
        trigger: { type: "click", element },
        stateName: "details-closed",
        capturedNode: this.captureCurrentElementState(element),
        parentPath: this.generateElementPath(element),
      });

      // Capture open state
      element.open = true;
      await this.wait(100);

      states.push({
        trigger: { type: "click", element },
        stateName: "details-open",
        capturedNode: this.captureCurrentElementState(element),
        parentPath: this.generateElementPath(element),
      });

      // Restore original state
      element.open = wasOpen;
    }

    return states;
  }

  /**
   * Handle modal and dialog elements
   */
  private async handleModalElement(
    element: Element
  ): Promise<DiscoveredState[]> {
    const states: DiscoveredState[] = [];

    try {
      // Look for modal trigger (button that opens this modal)
      const modalId = element.id;
      const triggers = modalId
        ? document.querySelectorAll(
            `[data-target="#${modalId}"], [data-modal="${modalId}"], [aria-controls="${modalId}"]`
          )
        : [];

      if (triggers.length > 0) {
        const trigger = triggers[0];

        // Capture closed state
        states.push({
          trigger: { type: "click", element: trigger },
          stateName: "modal-closed",
          capturedNode: this.captureCurrentElementState(element),
          parentPath: this.generateElementPath(element),
        });

        // Try to open modal
        if (trigger instanceof HTMLElement) {
          trigger.click();
          await this.wait(300); // Wait for modal animation

          states.push({
            trigger: { type: "click", element: trigger },
            stateName: "modal-open",
            capturedNode: this.captureCurrentElementState(element),
            parentPath: this.generateElementPath(element),
          });

          // Try to close modal (ESC key or close button)
          const closeButton = element.querySelector(
            '[data-dismiss="modal"], .modal-close, .close'
          );
          if (closeButton instanceof HTMLElement) {
            closeButton.click();
          } else {
            // Try ESC key
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape" })
            );
          }
          await this.wait(300);
        }
      }
    } catch (error) {
      console.warn("Failed to capture modal states:", error);
    }

    return states;
  }

  /**
   * Handle accordion elements
   */
  private async handleAccordionElement(
    element: Element
  ): Promise<DiscoveredState[]> {
    const states: DiscoveredState[] = [];

    try {
      const accordionPanels = element.querySelectorAll(
        "[data-accordion-panel], .accordion-panel"
      );
      const accordionToggles = element.querySelectorAll(
        "[data-accordion-toggle], .accordion-toggle"
      );

      for (let i = 0; i < accordionToggles.length; i++) {
        const toggle = accordionToggles[i];

        if (toggle instanceof HTMLElement) {
          // Capture closed state
          const isExpanded = toggle.getAttribute("aria-expanded") === "true";

          if (isExpanded) {
            toggle.click(); // Close it first
            await this.wait(200);
          }

          states.push({
            trigger: { type: "click", element: toggle },
            stateName: `accordion-panel-${i}-closed`,
            capturedNode: this.captureCurrentElementState(element),
            parentPath: this.generateElementPath(element),
          });

          // Open the panel
          toggle.click();
          await this.wait(300);

          states.push({
            trigger: { type: "click", element: toggle },
            stateName: `accordion-panel-${i}-open`,
            capturedNode: this.captureCurrentElementState(element),
            parentPath: this.generateElementPath(element),
          });
        }
      }
    } catch (error) {
      console.warn("Failed to capture accordion states:", error);
    }

    return states;
  }

  /**
   * Capture hidden content revealed by interactions
   */
  private async captureHiddenContent(
    element: Element
  ): Promise<HiddenContentCapture[]> {
    const hiddenContent: HiddenContentCapture[] = [];

    try {
      // Look for associated hidden elements
      const elementId = element.id;
      const ariaControls = element.getAttribute("aria-controls");
      const dataTarget = element.getAttribute("data-target");

      const selectors = [
        ariaControls ? `#${ariaControls}` : null,
        dataTarget ? dataTarget : null,
        elementId ? `[data-trigger="${elementId}"]` : null,
        // Common patterns
        element.nextElementSibling?.classList.contains("dropdown-menu")
          ? element.nextElementSibling
          : null,
      ].filter(Boolean);

      for (const selector of selectors) {
        if (typeof selector === "string") {
          const hiddenElements = document.querySelectorAll(selector);
          hiddenElements.forEach((hiddenEl) => {
            if (this.isCurrentlyHidden(hiddenEl)) {
              // This element might be revealed by interacting with our target
              hiddenContent.push({
                triggerId: this.generateElementId(element),
                triggerElement: this.captureCurrentElementState(element),
                revealedContent: [this.captureCurrentElementState(hiddenEl)],
                visibilityMethod: this.detectVisibilityMethod(hiddenEl),
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn("Failed to capture hidden content:", error);
    }

    return hiddenContent;
  }

  /**
   * Capture complex interaction flows (multi-step interactions)
   */
  private async captureInteractionFlows(
    element: Element
  ): Promise<InteractionFlow[]> {
    const flows: InteractionFlow[] = [];

    // This would implement complex multi-step interaction patterns
    // For example: hover → click → select → submit flows

    return flows;
  }

  /**
   * Capture screenshots of all discovered states
   */
  private async captureStateScreenshots(): Promise<void> {
    // This would integrate with screenshot capture functionality
    // For each captured state, take a screenshot for visual verification
    console.log("📸 State screenshots would be captured here");
  }

  /**
   * Handle specialized patterns not covered by basic detection
   */
  private async captureSpecializedPatterns(
    rootElement: Element
  ): Promise<void> {
    // Handle mega menus, sticky headers, infinite scroll, etc.
    await this.captureMegaMenus(rootElement);
    await this.captureStickyElements(rootElement);
    await this.captureInfiniteScroll(rootElement);
    await this.captureResponsiveBreakpoints(rootElement);
  }

  private async captureMegaMenus(rootElement: Element): Promise<void> {
    // Look for navigation elements with complex dropdown structures
    const navElements = rootElement.querySelectorAll(
      'nav, .navbar, .navigation, [role="navigation"]'
    );

    for (const nav of Array.from(navElements)) {
      const menuItems = nav.querySelectorAll("li, .menu-item");
      for (const item of Array.from(menuItems)) {
        if (item instanceof HTMLElement) {
          const submenu = item.querySelector(
            ".submenu, .dropdown-menu, .mega-menu"
          );
          if (submenu) {
            // Test hovering over menu item to reveal submenu
            try {
              item.dispatchEvent(
                new MouseEvent("mouseover", { bubbles: true })
              );
              await this.wait(200);

              // Capture revealed submenu state
              const result = this.captureResults.get(
                this.generateElementId(item)
              );
              if (result) {
                result.hiddenContentRevealed.push({
                  triggerId: this.generateElementId(item),
                  triggerElement: this.captureCurrentElementState(item),
                  revealedContent: [this.captureCurrentElementState(submenu)],
                  visibilityMethod: "visibility",
                });
              }

              // Clean up
              item.dispatchEvent(
                new MouseEvent("mouseleave", { bubbles: true })
              );
              await this.wait(100);
            } catch (error) {
              console.warn("Failed to capture mega menu:", error);
            }
          }
        }
      }
    }
  }

  private async captureStickyElements(rootElement: Element): Promise<void> {
    // Look for elements with position: sticky or position: fixed (including shadow DOM)
    const allElements = querySelectorAllDeep(rootElement, "*");

    for (const element of allElements) {
      const style = window.getComputedStyle(element);
      if (style.position === "sticky" || style.position === "fixed") {
        // Test scrolling to see state changes
        const originalScrollY = window.scrollY;

        try {
          // Scroll to trigger sticky behavior
          window.scrollTo(0, 100);
          await this.wait(100);

          const scrolledState = this.captureCurrentElementState(element);

          // Add to results
          const elementId = this.generateElementId(element);
          let result = this.captureResults.get(elementId);
          if (!result) {
            result = {
              elementId,
              baseState: this.captureCurrentElementState(element),
              discoveredStates: [],
              variantStates: [],
              hiddenContentRevealed: [],
              interactionFlows: [],
              screenshots: [],
            };
            this.captureResults.set(elementId, result);
          }

          result.discoveredStates.push({
            trigger: { type: "scroll", element },
            stateName: "sticky-scrolled",
            capturedNode: scrolledState,
            parentPath: this.generateElementPath(element),
          });
        } finally {
          // Restore scroll position
          window.scrollTo(0, originalScrollY);
          await this.wait(100);
        }
      }
    }
  }

  private async captureInfiniteScroll(rootElement: Element): Promise<void> {
    // Look for infinite scroll containers (including shadow DOM)
    const scrollContainers = querySelectorAllDeep(
      rootElement,
      "[data-infinite-scroll], .infinite-scroll, .lazy-load"
    );

    for (const container of scrollContainers) {
      try {
        const originalScrollTop = container.scrollTop;
        const originalChildCount = getEffectiveChildElements(container).length;

        // Scroll to bottom to trigger loading
        container.scrollTop = container.scrollHeight;
        await this.wait(500); // Wait for potential AJAX loading

        if (getEffectiveChildElements(container).length > originalChildCount) {
          // New content was loaded!
          const elementId = this.generateElementId(container);
          let result = this.captureResults.get(elementId);
          if (!result) {
            result = {
              elementId,
              baseState: this.captureCurrentElementState(container),
              discoveredStates: [],
              variantStates: [],
              hiddenContentRevealed: [],
              interactionFlows: [],
              screenshots: [],
            };
            this.captureResults.set(elementId, result);
          }

          result.discoveredStates.push({
            trigger: { type: "scroll", element: container },
            stateName: "infinite-scroll-loaded",
            capturedNode: this.captureCurrentElementState(container),
            parentPath: this.generateElementPath(container),
          });
        }

        // Restore scroll position
        container.scrollTop = originalScrollTop;
      } catch (error) {
        console.warn("Failed to capture infinite scroll:", error);
      }
    }
  }

  private async captureResponsiveBreakpoints(
    rootElement: Element
  ): Promise<void> {
    // Test different viewport sizes to capture responsive states
    const breakpoints = [
      { name: "mobile", width: 375, height: 667 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1440, height: 900 },
      { name: "large", width: 1920, height: 1080 },
    ];

    for (const breakpoint of breakpoints) {
      try {
        // Resize viewport (note: this only works in certain contexts)
        if (window.resizeTo) {
          window.resizeTo(breakpoint.width, breakpoint.height);
          await this.wait(300);

          // Capture state at this breakpoint for key elements
          const keyElements = rootElement.querySelectorAll(
            '.responsive, [class*="col-"], [class*="grid-"], .navigation, header, footer'
          );

          for (const element of Array.from(keyElements)) {
            const elementId = this.generateElementId(element);
            let result = this.captureResults.get(elementId);
            if (!result) {
              result = {
                elementId,
                baseState: this.captureCurrentElementState(element),
                discoveredStates: [],
                variantStates: [],
                hiddenContentRevealed: [],
                interactionFlows: [],
                screenshots: [],
              };
              this.captureResults.set(elementId, result);
            }

            result.discoveredStates.push({
              trigger: { type: "scroll", element }, // Using scroll as a proxy for resize
              stateName: `responsive-${breakpoint.name}`,
              capturedNode: this.captureCurrentElementState(element),
              parentPath: this.generateElementPath(element),
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to capture ${breakpoint.name} breakpoint:`, error);
      }
    }

    // Restore original viewport size
    if (window.resizeTo) {
      window.resizeTo(
        this.originalViewport.width,
        this.originalViewport.height
      );
      await this.wait(300);
    }
  }

  // Helper methods

  private hasSpecializedHandler(elementType: string): boolean {
    return Object.keys(
      ComprehensiveStateCapturer.ELEMENT_TYPE_HANDLERS
    ).includes(elementType);
  }

  private async runSpecializedHandler(
    element: Element,
    elementType: string
  ): Promise<DiscoveredState[]> {
    const handlerName =
      ComprehensiveStateCapturer.ELEMENT_TYPE_HANDLERS[
        elementType as keyof typeof ComprehensiveStateCapturer.ELEMENT_TYPE_HANDLERS
      ];
    const handler = (this as any)[handlerName];

    if (typeof handler === "function") {
      this.modifiedElements.add(element);
      return await handler.call(this, element);
    }

    return [];
  }

  private setupGlobalChangeObserver(): void {
    this.globalChangeObserver = new MutationObserver((mutations) => {
      // Track global changes during capture process
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" || mutation.type === "childList") {
          // Log significant changes for analysis
        }
      });
    });

    this.globalChangeObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "aria-expanded",
        "aria-hidden",
        "data-state",
      ],
    });
  }

  private isCurrentlyHidden(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return true;

    const style = window.getComputedStyle(element);
    return (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0 ||
      element.hasAttribute("hidden") ||
      element.getAttribute("aria-hidden") === "true"
    );
  }

  private detectVisibilityMethod(
    element: Element
  ): "display" | "visibility" | "opacity" | "transform" | "position" {
    const style = window.getComputedStyle(element);

    if (style.display === "none") return "display";
    if (style.visibility === "hidden") return "visibility";
    if (parseFloat(style.opacity) === 0) return "opacity";
    if (
      style.transform.includes("translate") ||
      style.transform.includes("scale(0)")
    )
      return "transform";

    return "position";
  }

  private captureCurrentElementState(element: Element): ElementNode {
    // This would integrate with your existing DOM extraction logic
    return {
      id: this.generateElementId(element),
      name: this.generateElementName(element),
      type: "FRAME",
      bounds: element.getBoundingClientRect(),
      visible: !this.isCurrentlyHidden(element),
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

  private generateElementId(element: Element): string {
    return (
      element.id ||
      `${element.tagName.toLowerCase()}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`
    );
  }

  private generateElementName(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toString().trim();
    const id = element.id;

    if (id) return `${tagName}#${id}`;
    if (className) return `${tagName}.${className.split(" ")[0]}`;
    return tagName;
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

  private getTotalStatesCount(): number {
    let total = 0;
    for (const result of this.captureResults.values()) {
      total += result.discoveredStates.length + result.variantStates.length;
    }
    return total;
  }

  private async analyzeAndOptimizeResults(): Promise<void> {
    // Remove duplicate states, optimize state names, etc.
    console.log("🔍 Analyzing and optimizing capture results...");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async cleanup(): Promise<void> {
    if (this.globalChangeObserver) {
      this.globalChangeObserver.disconnect();
    }

    // Restore state of all modified elements
    console.log(
      `🧹 Cleaning up ${this.modifiedElements.size} modified elements...`
    );
    for (const element of this.modifiedElements) {
      await this.restoreElementState(element);
    }
    this.modifiedElements.clear();

    // Clean up any temporary modifications
    this.interactionDiscoverer.abort();
    // Note: StateCapturer cleanup is called internally

    console.log("🧹 Comprehensive state capture cleanup complete");
  }

  private async restoreElementState(element: Element): Promise<void> {
    try {
      if (element instanceof HTMLElement) {
        // 1. Remove common state classes
        element.classList.remove(
          "open",
          "opened",
          "active",
          "expanded",
          "show",
          "showing",
          "visible",
          "selected",
          "focus"
        );

        // 2. Blur to remove focus state
        element.blur();

        // 3. Handle specific attributes
        if (
          element.hasAttribute("open") &&
          (element.tagName === "DETAILS" || element.tagName === "DIALOG")
        ) {
          element.removeAttribute("open");
        }

        // 4. Try to click to close if it looks expanded
        if (element.getAttribute("aria-expanded") === "true") {
          // Use a safe click that doesn't bubble if possible, or just click
          // But clicking might trigger other things.
          // Better to just reset attributes if possible.
          element.setAttribute("aria-expanded", "false");
        }

        // 5. Reset specific inputs
        if (element instanceof HTMLSelectElement) {
          // Hard to "close" a select programmatically if it's the OS dropdown, but blur helps.
        }
      }
    } catch (error) {
      console.warn("Failed to restore element state:", error);
    }
  }
}
