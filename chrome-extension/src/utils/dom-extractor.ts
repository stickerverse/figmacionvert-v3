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
    if (trimmed === "transparent" || trimmed.length === 0) return null;
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
    if (this.errors.length >= this.MAX_ERRORS) {
      this.errors.shift(); // Remove oldest
    }

    this.errors.push({
      location,
      message,
      element: element?.tagName || undefined,
      timestamp: Date.now(),
      severity,
    });

    if (severity === "critical") {
      console.error(`[CRITICAL] ${location}: ${message}`);
    } else if (severity === "error") {
      console.error(`[ERROR] ${location}: ${message}`);
    } else {
      console.warn(`[WARNING] ${location}: ${message}`);
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
// MAIN EXTRACTOR CLASS
// ============================================================================

export class DOMExtractor {
  private nodeId = 0;
  private extractionStartTime = 0;
  private lastYieldTime = 0;
  private computedStyleCache = new Map<Element, CSSStyleDeclaration>();
  private schemaInProgress: WebToFigmaSchema | null = null;
  private errorTracker = new ErrorTracker();

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
    this.errorTracker = new ErrorTracker();

    console.log("🎯 [EXTRACTION START] Starting DOM extraction...");
    console.log("📍 Location:", window.location.href);
    console.log("🛠️ VERSION: PRODUCTION_V2 (Enhanced Robustness)");

    this.postProgress("Initializing DOM traversal...", 30);

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
      },
      tree: null as any,
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
    };

    this.schemaInProgress = schema;

    try {
      // Extract root node
      this.postProgress("Traversing DOM tree...", 40);
      const rootNode = await this.extractNodeSafe(document.body, null);

      if (rootNode) {
        // Clean body/html backgrounds
        if (rootNode.htmlTag === "body" || rootNode.htmlTag === "html") {
          console.log("🔄 [SCHEMA] Clearing body/html backgrounds");
          rootNode.fills = [];
          if ((rootNode as any).backgrounds) {
            (rootNode as any).backgrounds = [];
          }
        }
        schema.tree = rootNode;
      } else {
        schema.tree = this.createFallbackRootNode();
      }

      // Collect fonts
      await this.collectFontFacesSafe();

      // Process images in batches
      await this.processImagesBatch();

      // Finalize assets
      this.finalizeAssets(schema);

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

      return schema;
    } catch (error) {
      this.errorTracker.recordError(
        "extractPageToSchema",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "critical"
      );

      // Return partial schema
      return this.getPartialSchema() || schema;
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

    try {
      return await this.extractNode(
        element,
        parentId,
        depth,
        parentAbsoluteLayout
      );
    } catch (error) {
      this.errorTracker.recordError(
        "extractNodeSafe",
        error instanceof Error ? error.message : "Unknown error",
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
    if (this.nodeId % 100 === 0 && this.nodeId > 0) {
      console.log(`📊 Extracted ${this.nodeId} nodes...`);
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

    // Check visibility
    if (computed.display === "none" || computed.visibility === "hidden") {
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

    const scrollTop = ExtractionValidation.safeParseFloat(
      window.pageYOffset || document.documentElement.scrollTop,
      0
    );
    const scrollLeft = ExtractionValidation.safeParseFloat(
      window.pageXOffset || document.documentElement.scrollLeft,
      0
    );

    // Zero-size check with exceptions
    if (rect.width === 0 && rect.height === 0 && element.tagName !== "BODY") {
      const hasContent =
        element.children.length > 0 ||
        (element.textContent && element.textContent.trim().length > 0);

      const hasMeaningfulStyles = this.hasMeaningfulStyles(computed);

      if (!hasContent && !hasMeaningfulStyles) {
        return null;
      }
    }

    const tagName = element.tagName.toLowerCase();
    const isSpecialElement = this.isSpecialElement(tagName);
    const hasChildElements = element.children.length > 0;
    const textContent = this.extractTextContentSafe(element);
    const isText = !!textContent && !hasChildElements && !isSpecialElement;

    // Calculate dimensions safely
    const dimensions = this.calculateDimensionsSafe(element, rect, computed);

    // Calculate positions safely
    const absoluteX = ExtractionValidation.safeParseFloat(
      rect.left + scrollLeft,
      0
    );
    const absoluteY = ExtractionValidation.safeParseFloat(
      rect.top + scrollTop,
      0
    );

    const relativeX = parentId ? absoluteX - parentAbsoluteLayout.x : absoluteX;
    const relativeY = parentId ? absoluteY - parentAbsoluteLayout.y : absoluteY;

    // Create absolute layout
    const absoluteLayout = {
      left: absoluteX,
      top: absoluteY,
      right: absoluteX + dimensions.width,
      bottom: absoluteY + dimensions.height,
      width: dimensions.width,
      height: dimensions.height,
    };

    // Create node
    const node: any = {
      id: nodeId,
      parentId: parentId,
      type: isText ? "TEXT" : "FRAME",
      name: isText ? textContent?.substring(0, 20) || "Text" : tagName,
      htmlTag: tagName,
      cssClasses: Array.from(element.classList),
      layout: {
        x: absoluteX,
        y: absoluteY,
        width: dimensions.width,
        height: dimensions.height,
        relativeX: relativeX,
        relativeY: relativeY,
      },
      absoluteLayout: absoluteLayout,
      fills: [],
      strokes: [],
      effects: [],
      attributes: this.extractAttributesSafe(element),
      children: [],
    };

    if (isText && textContent) {
      node.characters = textContent;
    }

    // Extract styles
    await this.extractStylesSafe(computed, element, node);
    await this.extractSpecialPropertiesSafe(element, node, computed);

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

    return node as ElementNode;
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
      return (
        (computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          computed.backgroundColor !== "transparent" &&
          computed.backgroundColor !== "") ||
        computed.borderWidth !== "0px" ||
        computed.boxShadow !== "none"
      );
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
      "button",
    ].includes(tagName);
  }

  private calculateDimensionsSafe(
    element: Element,
    rect: DOMRect,
    computed: CSSStyleDeclaration
  ): { width: number; height: number } {
    const tagUpper = element.tagName.toUpperCase();
    const isDocumentRoot = tagUpper === "BODY" || tagUpper === "HTML";
    const htmlEl = element as HTMLElement;

    let width = ExtractionValidation.safeParseFloat(rect.width, 0);
    let height = ExtractionValidation.safeParseFloat(rect.height, 0);

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

    // Clamp to reasonable bounds
    width = ExtractionValidation.clampNumber(width, 0, 32000);
    height = ExtractionValidation.clampNumber(height, 0, 32000);

    return { width, height };
  }

  private extractTextContentSafe(element: Element): string | null {
    try {
      const textNodes = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim())
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
      const childNodes = Array.from(element.childNodes);
      const currentAbsoluteLayout = {
        x: rect.left + scrollLeft,
        y: rect.top + scrollTop,
      };

      const BATCH_SIZE = 50;

      if (childNodes.length > BATCH_SIZE) {
        // Process in batches
        for (let i = 0; i < childNodes.length; i += BATCH_SIZE) {
          const batch = childNodes.slice(i, i + BATCH_SIZE);

          for (const child of batch) {
            if (child.nodeType === Node.ELEMENT_NODE) {
              const childNode = await this.extractNodeSafe(
                child as Element,
                node.id,
                depth + 1,
                currentAbsoluteLayout
              );
              if (childNode) {
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
        // Process synchronously
        for (const child of childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childNode = await this.extractNodeSafe(
              child as Element,
              node.id,
              depth + 1,
              currentAbsoluteLayout
            );
            if (childNode) {
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
        }
      }

      // Handle Shadow DOM
      const shadowRoot = (element as any).shadowRoot;
      if (shadowRoot && shadowRoot.children) {
        Array.from(shadowRoot.children as any as Element[]).forEach(
          async (child: Element) => {
            const childNode = await this.extractNodeSafe(
              child,
              node.id,
              depth + 1,
              {
                x: rect.left + scrollLeft,
                y: rect.top + scrollTop,
              }
            );
            if (childNode) {
              node.children.push(childNode);
            }
          }
        );
      }
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

      const rawText = child.textContent || "";
      const text = shouldPreserveWhitespace ? rawText : rawText.trim();

      if (!text || text.length === 0) return;

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

        if (computed.opacity && computed.opacity !== "1") {
          const opacity = ExtractionValidation.safeParseFloat(
            computed.opacity,
            1
          );
          syntheticNode.opacity = ExtractionValidation.clampNumber(
            opacity,
            0,
            1
          );
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
      const flowChildren: any[] = [];
      const absChildren: any[] = [];

      node.children.forEach((child: any) => {
        const type = child.positioning?.type;
        if (type === "absolute" || type === "fixed") {
          absChildren.push(child);
        } else {
          flowChildren.push(child);
        }
      });

      absChildren.sort((a, b) => {
        const za = ExtractionValidation.safeParseFloat(a.zIndex, 0);
        const zb = ExtractionValidation.safeParseFloat(b.zIndex, 0);
        return za - zb;
      });

      const negAbs = absChildren.filter((c) => (c.zIndex || 0) < 0);
      const posAbs = absChildren.filter((c) => (c.zIndex || 0) >= 0);

      node.children = [...negAbs, ...flowChildren, ...posAbs];
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
  // STYLE EXTRACTION
  // ============================================================================

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
        if (color && color.a > 0.001) {
          const isDocumentRoot =
            element.tagName.toLowerCase() === "body" ||
            element.tagName.toLowerCase() === "html";

          if (!isDocumentRoot) {
            if (!node.fills) node.fills = [];
            node.fills.push({
              type: "SOLID",
              color: { r: color.r, g: color.g, b: color.b, a: color.a },
              opacity: color.a,
              visible: true,
            });
            this.assets.colors.add(bgColor);
          }
        }
      }

      // Store backgroundColor for reference
      if (!node.style) node.style = {};
      node.style.backgroundColor = computed.backgroundColor || "";
      node.backgroundColor = computed.backgroundColor || "";

      // Borders with validation
      if (
        computed.borderWidth &&
        computed.borderWidth !== "0px" &&
        computed.borderStyle !== "none" &&
        computed.borderColor
      ) {
        const borderColor = this.parseColorSafe(computed.borderColor);
        if (borderColor) {
          const borderWidthValues = (computed.borderWidth || "0")
            .trim()
            .split(/\s+/)
            .map((v) => ExtractionValidation.safeParseFloat(v, 0));

          const strokeWeight = Math.max(
            ...borderWidthValues.filter((v) => v > 0),
            0
          );

          if (strokeWeight > 0) {
            node.strokes.push({
              type: "SOLID",
              color: {
                r: borderColor.r,
                g: borderColor.g,
                b: borderColor.b,
                a: borderColor.a,
              },
              opacity: borderColor.a,
              visible: true,
            });
            node.strokeWeight = strokeWeight;
          }
        }
      }

      // Border radius
      if (computed.borderRadius && computed.borderRadius !== "0px") {
        const radius = ExtractionValidation.safeParseFloat(
          computed.borderRadius,
          0
        );
        if (radius > 0) {
          node.cornerRadius = radius;
        }
      }

      // Typography for TEXT nodes
      if (node.type === "TEXT") {
        await this.extractTypographySafe(computed, element, node);
      }

      // Box shadow
      if (computed.boxShadow && computed.boxShadow !== "none") {
        const shadows = this.parseBoxShadowSafe(computed.boxShadow);
        shadows.forEach((shadow) => node.effects.push(shadow));
      }

      // Opacity
      if (computed.opacity && computed.opacity !== "1") {
        const opacity = ExtractionValidation.safeParseFloat(
          computed.opacity,
          1
        );
        node.opacity = ExtractionValidation.clampNumber(opacity, 0, 1);
      }
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
      const rawFontFamily = computed.fontFamily || "Inter";
      const fontFamilyStack = rawFontFamily
        .split(",")
        .map((f) => f.replace(/['"]/g, "").trim())
        .filter((f) => f.length > 0);
      const fontFamily = fontFamilyStack[0] || "Inter";

      // Font weight with validation
      const fontWeightRaw = computed.fontWeight || "400";
      const fontWeight = ExtractionValidation.clampNumber(
        parseInt(fontWeightRaw, 10) || 400,
        100,
        900
      );

      // Font size with validation
      const fontSize = ExtractionValidation.clampNumber(
        ExtractionValidation.safeParseFloat(computed.fontSize, 16),
        1,
        500
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
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
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
      node.lineHeight =
        !computed.lineHeight || computed.lineHeight === "normal"
          ? { unit: "AUTO" }
          : {
              value: lineHeightValue,
              unit: "PIXELS",
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
        wordBreak: computed.wordBreak || computed.overflowWrap,
      };

      // Store rendered metrics
      const textRect = element.getBoundingClientRect();
      node.renderedMetrics = {
        width: canvasMetrics?.width ?? textRect.width,
        height: canvasMetrics
          ? canvasMetrics.actualBoundingBoxAscent +
            canvasMetrics.actualBoundingBoxDescent
          : textRect.height,
        lineHeightPx:
          node.lineHeight?.unit === "PIXELS"
            ? node.lineHeight.value
            : undefined,
        actualBoundingBoxAscent: canvasMetrics?.actualBoundingBoxAscent,
        actualBoundingBoxDescent: canvasMetrics?.actualBoundingBoxDescent,
        fontBoundingBoxAscent: canvasMetrics?.fontBoundingBoxAscent,
        fontBoundingBoxDescent: canvasMetrics?.fontBoundingBoxDescent,
        domRectWidth: textRect.width,
        domRectHeight: textRect.height,
      };

      // Text color extraction
      const textColor = this.parseColorSafe(computed.color);
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

      if (isNoWrap) {
        node.textAutoResize = "WIDTH_AND_HEIGHT";
      } else if (isFixedWidth) {
        node.textAutoResize = "HEIGHT";
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

  // ============================================================================
  // COLOR PARSING WITH VALIDATION
  // ============================================================================

  private parseColorSafe(
    color: string
  ): { r: number; g: number; b: number; a: number } | null {
    if (!color) return null;

    try {
      const raw = ExtractionValidation.sanitizeColorString(color);
      if (!raw) return null;

      // RGBA/RGB
      const rgbaMatch = raw.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
      );
      if (rgbaMatch) {
        const r = ExtractionValidation.clampNumber(
          parseInt(rgbaMatch[1], 10) / 255,
          0,
          1
        );
        const g = ExtractionValidation.clampNumber(
          parseInt(rgbaMatch[2], 10) / 255,
          0,
          1
        );
        const b = ExtractionValidation.clampNumber(
          parseInt(rgbaMatch[3], 10) / 255,
          0,
          1
        );
        const a = rgbaMatch[4]
          ? ExtractionValidation.clampNumber(parseFloat(rgbaMatch[4]), 0, 1)
          : 1;
        return { r, g, b, a };
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
        return { r, g, b, a };
      }

      // Canvas fallback for named colors
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = raw;
      const normalized = ctx.fillStyle.toString().toLowerCase();
      return this.parseColorSafe(normalized);
    } catch (error) {
      this.errorTracker.recordError(
        "parseColorSafe",
        `Failed to parse color: ${color}`,
        undefined,
        "warning"
      );
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

        const isInset = trimmed.startsWith("inset");
        const working = isInset ? trimmed.substring(5).trim() : trimmed;

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
    type: "::before" | "::after"
  ): Promise<void> {
    try {
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

      if (isNaN(width)) width = isText ? content.length * 8 : 0;
      if (isNaN(height)) height = isText ? 14 : 0;

      const top = ExtractionValidation.safeParseFloat(computed.top, 0);
      const left = ExtractionValidation.safeParseFloat(computed.left, 0);

      let x = parentRect.x;
      let y = parentRect.y;

      if (computed.position === "absolute" || computed.position === "fixed") {
        if (!isNaN(left)) x += left;
        if (!isNaN(top)) y += top;
      } else {
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
          break;
        case "canvas":
          await this.handleCanvasElement(element as HTMLCanvasElement, node);
          break;
        case "video":
          await this.handleVideoElement(element as HTMLVideoElement, node);
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

  private async handleImageElement(
    img: HTMLImageElement,
    node: any,
    computed: CSSStyleDeclaration
  ): Promise<void> {
    node.type = "IMAGE";
    node.name = "Image";

    let imageUrl = img.src;
    if (!ExtractionValidation.isValidUrl(imageUrl)) {
      const dataSrc =
        img.getAttribute("data-src") || img.getAttribute("data-lazy-src");
      if (dataSrc && ExtractionValidation.isValidUrl(dataSrc)) {
        imageUrl = dataSrc;
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
        objectFit === "cover"
          ? "CROP"
          : objectFit === "contain"
          ? "FIT"
          : "FILL";

      node.fills = [
        {
          type: "IMAGE",
          imageHash: key,
          scaleMode: scaleMode,
          visible: true,
        },
      ];
      node.imageHash = key;
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
      this.errorTracker.recordError(
        "handleCanvasElement",
        "Canvas toDataURL failed (tainted)",
        undefined,
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

  // ============================================================================
  // IMAGE CAPTURE & PROCESSING
  // ============================================================================

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

      const absoluteUrl = new URL(url, window.location.href).href;

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
          base64: null,
          mimeType: this.getMimeTypeSafe(url),
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

  private async processImagesBatch(): Promise<void> {
    this.postProgress("Processing images...", 60);

    const imageUrls = Array.from(this.assets.images.keys());
    const BATCH_SIZE = 5;

    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (url) => {
          const asset = this.assets.images.get(url);
          if (asset && !asset.base64 && !asset.error) {
            try {
              const result = await this.urlToBase64Safe(asset.absoluteUrl);
              if (result.base64) {
                asset.base64 = result.base64;
                asset.width = result.width || asset.width;
                asset.height = result.height || asset.height;
              } else {
                asset.error = "Failed to convert to base64";
              }
            } catch (error) {
              asset.error =
                error instanceof Error ? error.message : "Unknown error";
            }
          }
        })
      );

      const progress = 60 + Math.floor((i / imageUrls.length) * 30);
      this.postProgress(
        `Processing images (${i + batch.length}/${imageUrls.length})...`,
        progress
      );
    }
  }

  private async urlToBase64Safe(
    url: string
  ): Promise<{ base64: string; width: number; height: number }> {
    try {
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        const timeout = setTimeout(() => {
          resolve({ base64: "", width: 0, height: 0 });
        }, 10000);

        img.onload = () => {
          clearTimeout(timeout);
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve({ base64: "", width: 0, height: 0 });
            return;
          }

          try {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL("image/png");
            const data = base64.split(",")[1];
            resolve({
              base64: data,
              width: img.naturalWidth || img.width,
              height: img.naturalHeight || img.height,
            });
          } catch {
            resolve({ base64: "", width: 0, height: 0 });
          }
        };

        img.onerror = () => {
          clearTimeout(timeout);
          resolve({ base64: "", width: 0, height: 0 });
        };

        img.src = url;
      });
    } catch (error) {
      this.errorTracker.recordError(
        "urlToBase64Safe",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "warning"
      );
      return { base64: "", width: 0, height: 0 };
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

  private finalizeAssets(schema: WebToFigmaSchema): void {
    try {
      // Finalize images
      const imagesObj: Record<string, any> = {};
      this.assets.images.forEach((data, url) => {
        const key = this.hashString(url);
        imagesObj[key] = {
          id: key,
          url: data.url ?? url,
          originalUrl: data.originalUrl,
          absoluteUrl: data.absoluteUrl,
          mimeType: data.mimeType,
          width: data.width ?? 0,
          height: data.height ?? 0,
          data: data.base64 ?? null,
          base64: data.base64 ?? null,
          error: data.error,
        };
      });
      schema.assets.images = imagesObj;

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
  // PARTIAL SCHEMA & FALLBACKS
  // ============================================================================

  public getPartialSchema(): WebToFigmaSchema | null {
    if (!this.schemaInProgress) {
      return null;
    }

    try {
      // Finalize whatever we have so far
      const partial = { ...this.schemaInProgress };

      // Process images that were captured but not yet converted
      const imagesObj: Record<string, any> = {};
      this.assets.images.forEach((data, url) => {
        const key = this.hashString(url);
        imagesObj[key] = {
          id: key,
          url: data.url ?? url,
          originalUrl: data.originalUrl,
          absoluteUrl: data.absoluteUrl,
          mimeType: data.mimeType,
          width: data.width ?? 0,
          height: data.height ?? 0,
          data: data.base64 ?? null,
          base64: data.base64 ?? null,
          error: data.error,
        };
      });
      partial.assets.images = imagesObj;

      // Mark as partial in metadata
      if (partial.metadata) {
        (partial.metadata as any).extractionStatus = "partial";
        (partial.metadata as any).extractionTimeout = true;
        (partial.metadata as any).extractedNodes = this.nodeId;
      }

      return partial;
    } catch (error) {
      this.errorTracker.recordError(
        "getPartialSchema",
        error instanceof Error ? error.message : "Unknown error",
        undefined,
        "error"
      );
      return null;
    }
  }

  private createFallbackRootNode(): ElementNode {
    const viewport = this.extractViewportData();
    const nodeId = `node_${this.nodeId++}`;

    const node: any = {
      id: nodeId,
      parentId: null,
      type: "FRAME",
      name: "Page",
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
      fills: [],
      strokes: [],
      effects: [],
      attributes: {},
      children: [],
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
  // UTILITIES
  // ============================================================================

  private hashString(str: string): string {
    if (!str || typeof str !== "string") {
      return "img_0";
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return "img_" + Math.abs(hash).toString(16);
  }
}
