import { ElementNode, WebToFigmaSchema } from "../types/schema";
import { extractGridLayoutData } from "./grid-layout-converter";

export class DOMExtractor {
  private nodeId = 0;
  private extractionStartTime = 0;
  private lastYieldTime = 0;
  private computedStyleCache = new Map<Element, CSSStyleDeclaration>(); // Performance: cache computed styles
  // CRITICAL FIX: Store schema in progress for timeout recovery
  private schemaInProgress: WebToFigmaSchema | null = null;
  private assets = {
    images: new Map<
      string,
      {
        originalUrl: string;
        absoluteUrl: string;
        url: string;
        base64: string | null;
        mimeType: string;
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

  constructor() {}

  async extractPageToSchema(): Promise<WebToFigmaSchema> {
    this.extractionStartTime = Date.now();
    this.lastYieldTime = Date.now();
    this.computedStyleCache.clear(); // Clear cache at start

    console.log("🎯 [EXTRACTION START] Starting DOM extraction...");
    console.log("📍 Location:", window.location.href);
    console.log("🛠️ VERSION: ENHANCED_V2 (Full Feature Set)");
    console.log("📏 Body children:", document.body.children.length);

    window.postMessage(
      {
        type: "EXTRACTION_PROGRESS",
        message: "Initializing DOM traversal...",
        percent: 30,
      },
      "*"
    );

    // Capture media queries and responsive breakpoints
    const mediaQueries = this.extractMediaQueries();

    const schema: WebToFigmaSchema = {
      version: "1.0.0",
      metadata: {
        url: window.location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          ),
          devicePixelRatio: window.devicePixelRatio || 1,
        },
        timestamp: new Date().toISOString(),
        fonts: [],
        mediaQueries: mediaQueries,
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

    // CRITICAL FIX: Store schema in progress for timeout recovery
    this.schemaInProgress = schema;

    // CRITICAL FIX: Store schema in progress for timeout recovery
    this.schemaInProgress = schema;

    console.log("✓ Checkpoint 1: Extracting root node");
    window.postMessage(
      {
        type: "EXTRACTION_PROGRESS",
        message: "Traversing DOM tree...",
        percent: 40,
      },
      "*"
    );

    const rootNode = this.extractNode(document.body, null);
    if (rootNode) {
      // CRITICAL FIX: Ensure body/html root node never has fills or backgrounds in the schema
      // Body/html backgrounds should be handled by the main frame, not the body node
      // This prevents blue background from appearing in the imported Figma design
      if (rootNode.htmlTag === "body" || rootNode.htmlTag === "html") {
        console.log(
          "🔄 [SCHEMA] Clearing body/html root node fills and backgrounds to prevent blue background issue"
        );
        rootNode.fills = [];
        // Also clear any background layers that might have been added
        if ((rootNode as any).backgrounds) {
          (rootNode as any).backgrounds = [];
        }
        // Ensure no background images are in fills array
        rootNode.fills = rootNode.fills.filter(
          (fill: any) => fill.type !== "IMAGE"
        );
      }
      schema.tree = rootNode;
    } else {
      schema.tree = {
        id: "root-fallback",
        type: "FRAME",
        name: "Page (Fallback)",
        htmlTag: "body",
        cssClasses: [],
        layout: {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        },
        fills: [], // CRITICAL: No fills for fallback body node either
        children: [],
      };
    }

    await this.collectFontFaces();

    console.log("✓ Checkpoint 2: Processing assets");
    window.postMessage(
      {
        type: "EXTRACTION_PROGRESS",
        message: "Processing images...",
        percent: 60,
      },
      "*"
    );

    const imageUrls = Array.from(this.assets.images.keys());
    const BATCH_SIZE = 5;

    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          const asset = this.assets.images.get(url);
          if (asset && !asset.base64 && !asset.error) {
            try {
              const result = await this.urlToBase64(asset.absoluteUrl);
              if (result.base64) {
                (asset as any).base64 = result.base64;
                (asset as any).data = result.base64;
                (asset as any).width = result.width;
                (asset as any).height = result.height;
                if (result.svgCode) {
                  (asset as any).svgCode = result.svgCode;
                  (asset as any).mimeType = "image/svg+xml";
                }
              } else {
                asset.error = "Failed to convert to base64";
              }
            } catch (e) {
              // CRITICAL FIX: Continue extraction even if image fails
              asset.error = e instanceof Error ? e.message : String(e);
              console.warn(
                `⚠️ Image processing failed for ${url.substring(0, 50)}: ${
                  asset.error
                }`
              );
              // Don't throw - continue with other images
            }
          }
        })
      );

      const progress = 60 + Math.floor((i / imageUrls.length) * 30);
      window.postMessage(
        {
          type: "EXTRACTION_PROGRESS",
          message: `Processing images (${i + batch.length}/${
            imageUrls.length
          })...`,
          percent: progress,
        },
        "*"
      );
    }

    const imagesObj: Record<string, any> = {};
    this.assets.images.forEach((data, url) => {
      const key = this.hashString(url);
      imagesObj[key] = {
        id: key,
        url: data.url ?? url,
        originalUrl: data.originalUrl,
        absoluteUrl: data.absoluteUrl,
        mimeType: data.mimeType,
        width: (data as any).width ?? 0,
        height: (data as any).height ?? 0,
        data: (data as any).data ?? data.base64 ?? null,
        base64: data.base64 ?? null,
        svgCode: (data as any).svgCode,
        error: data.error,
      };
    });
    schema.assets.images = imagesObj;

    const fontObj: Record<string, any> = {};
    this.assets.fontFiles.forEach((data, url) => {
      const key = this.hashString(`${data.family}-${data.weight}-${url}`);
      fontObj[key] = { ...data, id: key };
    });
    schema.assets.fonts = fontObj;

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

    // Create full DesignTokensRegistry for Figma Variables API
    (schema as any).designTokensRegistry =
      this.buildDesignTokensRegistry(designTokens);

    console.log("✅ Extraction complete!", {
      totalNodes: this.nodeId,
      images: this.assets.images.size,
      fonts: this.assets.fonts.size,
      designTokens: {
        colors: designTokens.colors.size,
        spacing: designTokens.spacing.size,
        typography: designTokens.typography.size,
      },
    });

    // Clear in-progress schema on completion
    this.schemaInProgress = null;
    return schema;
  }

  // CRITICAL FIX: Get partial schema for timeout recovery
  getPartialSchema(): WebToFigmaSchema | null {
    if (!this.schemaInProgress) {
      return null;
    }

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
        width: (data as any).width ?? 0,
        height: (data as any).height ?? 0,
        data: (data as any).data ?? data.base64 ?? null,
        base64: data.base64 ?? null,
        svgCode: (data as any).svgCode,
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
  }

  private extractNode(
    element: Element,
    parentId: string | null,
    depth: number = 0,
    parentAbsoluteLayout: { x: number; y: number } = { x: 0, y: 0 }
  ): ElementNode | null {
    const MAX_DEPTH = 500;
    if (depth > MAX_DEPTH) {
      console.warn("⚠️ Max depth reached, skipping children");
      return null;
    }

    if (this.nodeId % 100 === 0 && this.nodeId > 0) {
      console.log(`📊 Extracted ${this.nodeId} nodes...`);
    }

    const nodeId = `node_${this.nodeId++}`;

    // Performance: Cache computed styles
    let computed = this.computedStyleCache.get(element);
    if (!computed) {
      computed = window.getComputedStyle(element);
      this.computedStyleCache.set(element, computed);
    }

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    if (computed.display === "none" || computed.visibility === "hidden") {
      return null;
    }

    // Relaxed Zero-Size Check
    // If element is 0x0, we generally want to skip it, UNLESS:
    // 1. It is the BODY (always keep)
    // 2. It has visible overflow AND content (children/text) - e.g. a 0-height wrapper
    // 3. It has children (important containers might be 0x0 but contain visible content)
    // 4. It has meaningful computed styles (background, border, etc.) indicating it's a container
    if (rect.width === 0 && rect.height === 0 && element.tagName !== "BODY") {
      const isOverflowVisible =
        computed.overflow === "visible" ||
        computed.overflowX === "visible" ||
        computed.overflowY === "visible";

      const hasContent =
        element.children.length > 0 ||
        (element.textContent && element.textContent.trim().length > 0);

      // Check if element has meaningful styles that indicate it's a container
      const hasMeaningfulStyles =
        (computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          computed.backgroundColor !== "transparent" &&
          computed.backgroundColor !== "") ||
        computed.borderWidth !== "0px" ||
        computed.boxShadow !== "none";

      // Keep if it has children OR has meaningful styles (likely a container)
      if (hasContent || hasMeaningfulStyles) {
        // Keep this element - it's likely important
      } else if (!isOverflowVisible) {
        return null;
      }
    }

    const tagName = element.tagName.toLowerCase();
    const isSpecialElement = [
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

    // Determine if this is a "Leaf Text Node" (simple case)
    // We consider it a leaf text node ONLY if it has no element children.
    // If it has element children, it MUST be a FRAME to contain them.
    const hasChildElements = element.children.length > 0;
    const textContent = this.extractTextContent(element); // Gets visible text

    // Strict TEXT type: NO children allowed. Mixed content -> FRAME with synthetic text children.
    const isText = !!textContent && !hasChildElements && !isSpecialElement;

    // Robust sizing: DOM rects for BODY/HTML and some app-shell elements can report 0 height
    // or only viewport height even when the document is much taller. This causes severe
    // clipping in Figma when overflow is hidden.
    const tagUpper = element.tagName.toUpperCase();
    const isDocumentRoot = tagUpper === "BODY" || tagUpper === "HTML";
    const htmlEl = element as HTMLElement;
    const elementScrollHeight =
      typeof (htmlEl as any)?.scrollHeight === "number"
        ? (htmlEl as any).scrollHeight
        : 0;
    const elementScrollWidth =
      typeof (htmlEl as any)?.scrollWidth === "number"
        ? (htmlEl as any).scrollWidth
        : 0;
    const docScrollHeight = Math.max(
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0
    );
    const docScrollWidth = Math.max(
      document.documentElement?.scrollWidth || 0,
      document.body?.scrollWidth || 0
    );

    // Base layout from rect
    let layoutWidth = rect.width;
    let layoutHeight = rect.height;

    // Fix BODY/HTML and 0-height wrappers: use scrollHeight so children are not clipped away
    if (isDocumentRoot || (layoutHeight === 0 && element.children.length > 0)) {
      layoutHeight = Math.max(
        layoutHeight,
        docScrollHeight,
        elementScrollHeight
      );
      layoutWidth = Math.max(layoutWidth, docScrollWidth, elementScrollWidth);
    } else {
      // If overflow is hidden/clip and the element has more content than its rect,
      // expand to scrollHeight to avoid incorrect clipping in Figma.
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

      if (element.children.length > 0) {
        if (isHiddenY && elementScrollHeight > layoutHeight + 1) {
          layoutHeight = Math.max(layoutHeight, elementScrollHeight);
        }
        if (isHiddenX && elementScrollWidth > layoutWidth + 1) {
          layoutWidth = Math.max(layoutWidth, elementScrollWidth);
        }
      }
    }

    // CRITICAL FIX: Calculate absolute and relative positions correctly
    const absoluteX = rect.left + scrollLeft;
    const absoluteY = rect.top + scrollTop;

    // If it's a root node (no parentId), relative is same as absolute (or 0,0 relative to page)
    const relativeX = parentId ? absoluteX - parentAbsoluteLayout.x : absoluteX;
    const relativeY = parentId ? absoluteY - parentAbsoluteLayout.y : absoluteY;

    // CRITICAL FIX: Always create absoluteLayout for consistent coordinate system
    // This ensures the importer can always use absoluteLayout instead of falling back to layout.x/y
    const absoluteLayout = {
      left: absoluteX,
      top: absoluteY,
      right: absoluteX + layoutWidth,
      bottom: absoluteY + layoutHeight,
      width: layoutWidth,
      height: layoutHeight,
    };

    const node: any = {
      id: nodeId,
      parentId: parentId,
      type: isText ? "TEXT" : "FRAME",
      name: isText
        ? textContent?.substring(0, 20) || "Text"
        : element.tagName.toLowerCase(),
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList),
      layout: {
        x: absoluteX,
        y: absoluteY,
        width: layoutWidth,
        height: layoutHeight,
        relativeX: relativeX,
        relativeY: relativeY,
      },
      absoluteLayout: absoluteLayout, // CRITICAL: Always provide absoluteLayout
      fills: [],
      strokes: [],
      effects: [],
      attributes: this.extractAttributes(element),
      children: [],
    };

    if (isText && textContent) {
      node.characters = textContent;
    }

    // Extract styles once (it is expensive and it mutates node.fills/textStyle/etc)
    this.extractStyles(computed, element, node);
    this.extractSpecialProperties(element, node, computed);

    // Recurse children (Mixed Content Support)
    // Performance: Process children in batches with yielding
    if (!isText && !isSpecialElement) {
      const childNodes = Array.from(element.childNodes);

      const currentAbsoluteLayout = {
        x: rect.left + scrollLeft,
        y: rect.top + scrollTop,
      };

      // For small numbers of children, process synchronously
      // For large numbers, use batching with yielding
      if (childNodes.length > 100) {
        const BATCH_SIZE = 50; // Process 50 children at a time

        // Process in batches (note: extractNode is synchronous, so we yield between batches)
        for (let i = 0; i < childNodes.length; i += BATCH_SIZE) {
          const batch = childNodes.slice(i, i + BATCH_SIZE);

          // Process batch synchronously
          for (const child of batch) {
            if (child.nodeType === Node.ELEMENT_NODE) {
              const childNode = this.extractNode(
                child as Element,
                nodeId,
                depth + 1,
                currentAbsoluteLayout
              );
              if (childNode) {
                node.children.push(childNode);
              }
            } else if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent?.trim();
              if (text && text.length > 0) {
                // Synthetic Text Node
                const range = document.createRange();
                range.selectNode(child);
                const textRect = range.getBoundingClientRect();

                // CRITICAL FIX: Don't skip text nodes with zero dimensions
                const parentComputed = window.getComputedStyle(element);
                const isTextVisible =
                  parentComputed.display !== "none" &&
                  parentComputed.visibility !== "hidden" &&
                  parentComputed.opacity !== "0";

                if (
                  textRect.width > 0 ||
                  textRect.height > 0 ||
                  isTextVisible
                ) {
                  const textNodeId = `node_${this.nodeId++}_text`;
                  // CRITICAL FIX: Create absoluteLayout for synthetic text nodes
                  const textAbsoluteX = textRect.left + scrollLeft;
                  const textAbsoluteY = textRect.top + scrollTop;
                  const textAbsoluteLayout = {
                    left: textAbsoluteX,
                    top: textAbsoluteY,
                    right: textAbsoluteX + textRect.width,
                    bottom: textAbsoluteY + textRect.height,
                    width: textRect.width,
                    height: textRect.height,
                  };

                  const syntheticNode: any = {
                    id: textNodeId,
                    parentId: nodeId,
                    type: "TEXT",
                    name: text.substring(0, 20),
                    characters: text,
                    htmlTag: "span",
                    cssClasses: [],
                    layout: {
                      x: textAbsoluteX,
                      y: textAbsoluteY,
                      width: textRect.width,
                      height: textRect.height,
                      relativeX: textRect.left - rect.left,
                      relativeY: textRect.top - rect.top,
                    },
                    absoluteLayout: textAbsoluteLayout, // CRITICAL: Always provide absoluteLayout
                    fills: [],
                    strokes: [],
                    effects: [],
                    children: [],
                  };

                  this.extractTypography(computed, element, syntheticNode);
                  if (computed.opacity && computed.opacity !== "1") {
                    syntheticNode.opacity = parseFloat(computed.opacity);
                  }
                  node.children.push(syntheticNode);
                }
              }
            }
          }

          // Yield after each batch (if not last batch)
          if (i + BATCH_SIZE < childNodes.length) {
            // Update progress for large extractions
            const progress = 40 + Math.floor((i / childNodes.length) * 20);
            window.postMessage(
              {
                type: "EXTRACTION_PROGRESS",
                message: `Processing children (${Math.min(
                  i + batch.length,
                  childNodes.length
                )}/${childNodes.length})...`,
                percent: progress,
              },
              "*"
            );
            // Note: We can't use await here since extractNode is synchronous
            // The yielding happens naturally through the event loop when we post messages
          }
        }
      } else {
        // Small number of children - process synchronously (no batching needed)
        for (const child of childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childNode = this.extractNode(
              child as Element,
              nodeId,
              depth + 1,
              currentAbsoluteLayout
            );
            if (childNode) {
              node.children.push(childNode);
            }
          } else if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text && text.length > 0) {
              const range = document.createRange();
              range.selectNode(child);
              const textRect = range.getBoundingClientRect();
              const parentComputed = window.getComputedStyle(element);
              const isTextVisible =
                parentComputed.display !== "none" &&
                parentComputed.visibility !== "hidden" &&
                parentComputed.opacity !== "0";

              if (textRect.width > 0 || textRect.height > 0 || isTextVisible) {
                // CRITICAL FIX: Create absoluteLayout for synthetic text nodes
                const textAbsoluteX = textRect.left + scrollLeft;
                const textAbsoluteY = textRect.top + scrollTop;
                const textAbsoluteLayout = {
                  left: textAbsoluteX,
                  top: textAbsoluteY,
                  right: textAbsoluteX + textRect.width,
                  bottom: textAbsoluteY + textRect.height,
                  width: textRect.width,
                  height: textRect.height,
                };

                const textNodeId = `node_${this.nodeId++}_text`;
                const syntheticNode: any = {
                  id: textNodeId,
                  parentId: nodeId,
                  type: "TEXT",
                  name: text.substring(0, 20),
                  characters: text,
                  htmlTag: "span",
                  cssClasses: [],
                  layout: {
                    x: textAbsoluteX,
                    y: textAbsoluteY,
                    width: textRect.width,
                    height: textRect.height,
                    relativeX: textRect.left - rect.left,
                    relativeY: textRect.top - rect.top,
                  },
                  absoluteLayout: textAbsoluteLayout, // CRITICAL: Always provide absoluteLayout
                  fills: [],
                  strokes: [],
                  effects: [],
                  children: [],
                };

                this.extractTypography(computed, element, syntheticNode);
                if (computed.opacity && computed.opacity !== "1") {
                  syntheticNode.opacity = parseFloat(computed.opacity);
                }
                node.children.push(syntheticNode);
              }
            }
          }
        }
      }

      // Handle Shadow DOM
      const shadowRoot = (element as any).shadowRoot;
      if (shadowRoot && shadowRoot.children) {
        Array.from(shadowRoot.children as any as Element[]).forEach(
          (child: Element) => {
            const childNode = this.extractNode(child, nodeId, depth + 1, {
              x: rect.left + scrollLeft,
              y: rect.top + scrollTop,
            });
            if (childNode) {
              node.children.push(childNode);
            }
          }
        );
      }
    }

    // Process pseudo-elements (::before, ::after) - Call LAST to ensure correct order if we used push/unshift
    // Actually, extractPseudoElements adds to children array directly.
    // If we call it here:
    // ::before unshifts to 0. (Correct, before content)
    // ::after pushes to end. (Correct, after content)
    this.extractPseudoElements(element, node);

    // Z-Index Sorting for Absolute Children
    // We separate absolute/fixed children from flow children.
    // Flow children MUST remain in DOM order for Auto Layout.
    // Absolute children can be reordered for correct stacking (Z-Index).
    if (node.children.length > 0) {
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

      // Sort absolute children by Z-Index
      absChildren.sort((a, b) => {
        const za = a.zIndex || 0;
        const zb = b.zIndex || 0;
        return za - zb;
      });

      const negAbs = absChildren.filter((c) => (c.zIndex || 0) < 0);
      const posAbs = absChildren.filter((c) => (c.zIndex || 0) >= 0);

      // Reassemble: NegAbs -> Flow -> PosAbs
      node.children = [...negAbs, ...flowChildren, ...posAbs];
    }

    return node as ElementNode;
  }

  private extractMediaQueries(): Array<{
    query: string;
    type: string;
    features: Record<string, string>;
  }> {
    const mediaQueries: Array<{
      query: string;
      type: string;
      features: Record<string, string>;
    }> = [];

    try {
      // Get all stylesheets
      const stylesheets = Array.from(document.styleSheets);

      for (const sheet of stylesheets) {
        try {
          // CRITICAL FIX: Handle CORS errors when accessing cssRules for cross-origin stylesheets
          // Cross-origin stylesheets will throw DOMException when accessing cssRules
          // This is a CORS restriction that we need to handle gracefully
          let rules: CSSRuleList | null = null;
          try {
            rules = sheet.cssRules || sheet.rules || null;
          } catch (cssRulesError) {
            // Expected for cross-origin stylesheets due to CORS - silently skip
            // DOMException with name "SecurityError" or "NotAllowedError" indicates CORS restriction
            if (
              cssRulesError instanceof DOMException &&
              (cssRulesError.name === "SecurityError" ||
                cssRulesError.name === "NotAllowedError")
            ) {
              // This is normal for cross-origin stylesheets - don't log as error
              continue;
            }
            // For other errors, log and continue
            console.warn(
              `⚠️ Could not access stylesheet rules:`,
              cssRulesError instanceof Error
                ? cssRulesError.message
                : String(cssRulesError)
            );
            continue;
          }

          if (!rules) continue;

          const rulesArray = Array.from(rules);
          for (const rule of rulesArray) {
            if (rule instanceof CSSMediaRule) {
              const mediaQuery = rule.media.mediaText;
              const features: Record<string, string> = {};

              // Parse media features
              if (rule.media.length > 0) {
                for (let i = 0; i < rule.media.length; i++) {
                  const mediaQueryList = rule.media;
                  // Extract features from media query string
                  const matches = mediaQuery.match(/(\w+):\s*([^)]+)/g);
                  if (matches) {
                    matches.forEach((match) => {
                      const [key, value] = match
                        .split(":")
                        .map((s) => s.trim());
                      features[key] = value;
                    });
                  }
                }
              }

              mediaQueries.push({
                query: mediaQuery,
                type: rule.media.mediaText.includes("print")
                  ? "print"
                  : "screen",
                features,
              });
            }
          }
        } catch (error) {
          // Handle any other unexpected errors (not CORS-related)
          if (
            !(
              error instanceof DOMException &&
              (error.name === "SecurityError" ||
                error.name === "NotAllowedError")
            )
          ) {
            console.warn(
              `⚠️ Error processing stylesheet for media queries:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }
      }
    } catch (e) {
      console.warn("Could not extract media queries", e);
    }

    return mediaQueries;
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
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Add common breakpoints
    breakpoints.push(...commonBreakpoints);

    return breakpoints;
  }

  private extractPseudoElements(element: Element, parentNode: any) {
    const processPseudo = (type: "::before" | "::after") => {
      const computed = window.getComputedStyle(element, type);
      const content = computed.content;

      // Only extract if there is content (and it's not "none" or "normal")
      if (
        !content ||
        content === "none" ||
        content === "normal" ||
        content === '""' ||
        content === "''"
      ) {
        // Special case: empty string content is valid if display is not none
        if (
          (content === '""' || content === "''") &&
          computed.display !== "none"
        ) {
          // Allowed (e.g. clearfix or icon)
        } else {
          return;
        }
      }

      if (computed.display === "none") return;

      const nodeId = `node_${this.nodeId++}_${type.replace("::", "")}`;
      const isText =
        content !== '""' && content !== "''" && !content.startsWith("url");

      // Approximate geometry since pseudo-elements don't support getBoundingClientRect
      const parentRect = parentNode.layout;
      let width = parseFloat(computed.width);
      let height = parseFloat(computed.height);
      const top = parseFloat(computed.top);
      const left = parseFloat(computed.left);

      // If dimensions are auto/invalid, try to infer from content or assume 0
      if (isNaN(width)) width = isText ? content.length * 8 : 0;
      if (isNaN(height)) height = isText ? 14 : 0;

      // Calculate absolute position relative to document
      // Note: This is an approximation. Real position depends on nearest positioned ancestor.
      // For simplicity, we assume if absolute, it's relative to the parent we represent.
      let x = parentRect.x;
      let y = parentRect.y;

      if (computed.position === "absolute" || computed.position === "fixed") {
        if (!isNaN(left)) x += left;
        if (!isNaN(top)) y += top;
      } else {
        // Static/Relative: Just prepend/append to flow?
        // Figma doesn't do flow well for mixed real/pseudo.
        // We will default to placing it at the start/end of parent rect.
        if (type === "::after") {
          x += parentRect.width - width; // Just a guess for now
        }
      }

      // CRITICAL FIX: Create absoluteLayout for pseudo-element nodes
      // x and y are already calculated as absolute positions
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
        absoluteLayout: pseudoAbsoluteLayout, // CRITICAL: Always provide absoluteLayout
        fills: [],
        strokes: [],
        effects: [],
        attributes: {},
        children: [],
      };

      if (isText) {
        node.characters = content.replace(/^['"]|['"]$/g, ""); // Strip quotes
      }

      this.extractStyles(computed, element, node);

      // Add to parent children
      if (type === "::before") {
        parentNode.children.unshift(node);
      } else {
        parentNode.children.push(node);
      }
    };

    processPseudo("::before");
    processPseudo("::after");

    // ::first-letter and ::first-line for text nodes
    if (parentNode.type === "TEXT" && parentNode.characters) {
      this.extractFirstLetterAndLine(element, parentNode);
    }

    // ::selection (capture selection styles)
    this.extractSelectionStyles(element, parentNode);
  }

  private extractFirstLetterAndLine(element: Element, textNode: any) {
    // ::first-letter
    try {
      const firstLetterStyles = window.getComputedStyle(
        element,
        "::first-letter"
      );
      if (firstLetterStyles && firstLetterStyles.content !== "none") {
        // CRITICAL FIX: Create absoluteLayout for first-letter node
        const firstLetterWidth = textNode.layout.width * 0.1;
        const firstLetterAbsoluteLayout = {
          left: textNode.layout.x,
          top: textNode.layout.y,
          right: textNode.layout.x + firstLetterWidth,
          bottom: textNode.layout.y + textNode.layout.height,
          width: firstLetterWidth,
          height: textNode.layout.height,
        };

        const firstLetterNode: any = {
          id: `${textNode.id}_first-letter`,
          parentId: textNode.id,
          type: "TEXT",
          name: "::first-letter",
          htmlTag: "pseudo",
          cssClasses: [],
          characters: textNode.characters.charAt(0),
          layout: {
            ...textNode.layout,
            width: firstLetterWidth,
            height: textNode.layout.height,
          },
          absoluteLayout: firstLetterAbsoluteLayout, // CRITICAL: Always provide absoluteLayout
          fills: [],
          strokes: [],
          effects: [],
          children: [],
        };

        this.extractStyles(firstLetterStyles, element, firstLetterNode);
        this.extractTypography(firstLetterStyles, element, firstLetterNode);

        // Insert as first child
        textNode.children.unshift(firstLetterNode);
      }
    } catch (e) {
      // ::first-letter may not be available for all elements
    }

    // ::first-line
    try {
      const firstLineStyles = window.getComputedStyle(element, "::first-line");
      if (firstLineStyles && firstLineStyles.content !== "none") {
        // CRITICAL FIX: Create absoluteLayout for first-line node
        const firstLineHeight = textNode.layout.height * 0.5;
        const firstLineAbsoluteLayout = {
          left: textNode.layout.x,
          top: textNode.layout.y,
          right: textNode.layout.x + textNode.layout.width,
          bottom: textNode.layout.y + firstLineHeight,
          width: textNode.layout.width,
          height: firstLineHeight,
        };

        const firstLineNode: any = {
          id: `${textNode.id}_first-line`,
          parentId: textNode.id,
          type: "TEXT",
          name: "::first-line",
          htmlTag: "pseudo",
          cssClasses: [],
          characters: textNode.characters.split("\n")[0] || textNode.characters,
          layout: {
            ...textNode.layout,
            height: firstLineHeight,
          },
          absoluteLayout: firstLineAbsoluteLayout, // CRITICAL: Always provide absoluteLayout
          fills: [],
          strokes: [],
          effects: [],
          children: [],
        };

        this.extractStyles(firstLineStyles, element, firstLineNode);
        this.extractTypography(firstLineStyles, element, firstLineNode);

        // Insert as second child (after first-letter if exists)
        const insertIndex =
          textNode.children.length > 0 &&
          textNode.children[0].name === "::first-letter"
            ? 1
            : 0;
        textNode.children.splice(insertIndex, 0, firstLineNode);
      }
    } catch (e) {
      // ::first-line may not be available for all elements
    }
  }

  private extractSelectionStyles(element: Element, node: any) {
    try {
      const selectionStyles = window.getComputedStyle(element, "::selection");
      if (selectionStyles) {
        node.selectionStyles = {
          backgroundColor: selectionStyles.backgroundColor,
          color: selectionStyles.color,
          textShadow: selectionStyles.textShadow,
        };
      }
    } catch (e) {
      // ::selection may not be available
    }
  }

  private extractStyles(
    computed: CSSStyleDeclaration,
    element: Element,
    node: any
  ) {
    // Layout Mode Detection (Flexbox & Grid)
    if (computed.display === "flex" || computed.display === "inline-flex") {
      node.layoutMode =
        computed.flexDirection === "row" ||
        computed.flexDirection === "row-reverse"
          ? "HORIZONTAL"
          : "VERTICAL";

      const gap = parseFloat(computed.gap);
      if (!isNaN(gap)) {
        node.itemSpacing = gap;
      }

      const paddingTop = parseFloat(computed.paddingTop);
      const paddingRight = parseFloat(computed.paddingRight);
      const paddingBottom = parseFloat(computed.paddingBottom);
      const paddingLeft = parseFloat(computed.paddingLeft);

      if (paddingTop || paddingRight || paddingBottom || paddingLeft) {
        node.paddingTop = paddingTop;
        node.paddingRight = paddingRight;
        node.paddingBottom = paddingBottom;
        node.paddingLeft = paddingLeft;
      }

      const justifyContent = computed.justifyContent;
      const alignItems = computed.alignItems;

      if (justifyContent.includes("center"))
        node.primaryAxisAlignItems = "CENTER";
      else if (
        justifyContent.includes("flex-end") ||
        justifyContent.includes("right")
      )
        node.primaryAxisAlignItems = "MAX";
      else if (justifyContent.includes("space-between"))
        node.primaryAxisAlignItems = "SPACE_BETWEEN";
      else node.primaryAxisAlignItems = "MIN";

      if (alignItems.includes("center")) node.counterAxisAlignItems = "CENTER";
      else if (alignItems.includes("flex-end") || alignItems.includes("bottom"))
        node.counterAxisAlignItems = "MAX";
      else if (alignItems.includes("baseline"))
        node.counterAxisAlignItems = "BASELINE";
      else node.counterAxisAlignItems = "MIN";

      // Wrapping
      if (
        computed.flexWrap === "wrap" ||
        computed.flexWrap === "wrap-reverse"
      ) {
        node.layoutWrap = "WRAP";
        // Counter axis spacing for wrapped items (row-gap)
        const rowGap = parseFloat(computed.rowGap);
        if (!isNaN(rowGap)) {
          node.counterAxisSpacing = rowGap;
        }
      }

      // === NEW: Sizing Mode Detection ===
      // Detect if container has explicit dimensions (FIXED) vs content-based (AUTO)
      const width = computed.width;
      const height = computed.height;
      const isRowLayout = node.layoutMode === "HORIZONTAL";

      // Primary axis sizing: FIXED if explicit dimension, AUTO if min-content/max-content/fit-content/auto
      const primaryDimension = isRowLayout ? width : height;
      const counterDimension = isRowLayout ? height : width;

      if (
        primaryDimension &&
        !primaryDimension.includes("auto") &&
        !primaryDimension.includes("content") &&
        primaryDimension !== "0px"
      ) {
        node.primaryAxisSizingMode = "FIXED";
      } else {
        node.primaryAxisSizingMode = "AUTO";
      }

      if (
        counterDimension &&
        !counterDimension.includes("auto") &&
        !counterDimension.includes("content") &&
        counterDimension !== "0px"
      ) {
        node.counterAxisSizingMode = "FIXED";
      } else {
        node.counterAxisSizingMode = "AUTO";
      }
    } else if (
      computed.display === "grid" ||
      computed.display === "inline-grid"
    ) {
      // Grid Layout Support - Use GridLayoutConverter
      const rect = element.getBoundingClientRect();
      const gridData = extractGridLayoutData(element, computed, rect);

      if (gridData.gridLayout) {
        node.layoutMode = "GRID";
        node.gridLayout = gridData.gridLayout;
        node.gridTemplateColumns = computed.gridTemplateColumns;
        node.gridTemplateRows = computed.gridTemplateRows;
        node.gridGap = computed.gap || computed.gridGap;
        node.gridColumnGap = computed.columnGap || computed.gridColumnGap;
        node.gridRowGap = computed.rowGap || computed.gridRowGap;
        node.gridAutoFlow = computed.gridAutoFlow;
        node.gridAutoColumns = computed.gridAutoColumns;
        node.gridAutoRows = computed.gridAutoRows;
        node.justifyItems = computed.justifyItems;
        node.alignItems = computed.alignItems;
        node.justifyContent = computed.justifyContent;
        node.alignContent = computed.alignContent;
      }
    }

    // Check if element is a grid child
    if (element.parentElement) {
      const parentStyles = window.getComputedStyle(element.parentElement);
      if (
        parentStyles.display === "grid" ||
        parentStyles.display === "inline-grid"
      ) {
        const rect = element.getBoundingClientRect();
        const gridData = extractGridLayoutData(element, computed, rect);

        if (gridData.gridChild) {
          node.gridChild = gridData.gridChild;
        }
      }
    }

    // Position Metadata (for sticky, fixed, absolute)
    const position = computed.position;
    if (position !== "static") {
      const toNumOrNull = (v: string): number | null => {
        if (!v || v === "auto") return null;
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
      };
      const clampExtreme = (n: number | null): number | null => {
        if (n === null) return null;
        // Guard against pathological computed values (e.g. large negative bottoms from app shells)
        const threshold = Math.max(window.innerHeight * 2, 2000);
        if (n < -threshold || n > threshold * 10) return null;
        return n;
      };
      const top = clampExtreme(toNumOrNull(computed.top));
      const left = clampExtreme(toNumOrNull(computed.left));
      const right = clampExtreme(toNumOrNull(computed.right));
      const bottom = clampExtreme(toNumOrNull(computed.bottom));

      node.positioning = {
        type: position,
        top,
        right: top !== null || left !== null ? right : right,
        bottom: top !== null || left !== null ? bottom : bottom,
        left,
      };

      // For absolute positioning, calculate containing block
      if (position === "absolute") {
        const containingBlock = this.calculateContainingBlock(element);
        if (containingBlock) {
          node.positioning.containingBlock = containingBlock;
        }
      }

      // For sticky positioning, capture sticky offsets
      if (position === "sticky") {
        node.positioning.sticky = {
          top: top,
          left: left,
          right: right,
          bottom: bottom,
        };
      }
    }

    // === Flex Child Properties (for elements inside flex containers) ===
    // flex-grow → layoutGrow (0 = fixed size, 1 = fill available space)
    const flexGrow = parseFloat(computed.flexGrow);
    if (!isNaN(flexGrow) && flexGrow > 0) {
      node.layoutGrow = flexGrow;
    }

    // flex-shrink (for reference, not directly used in Figma)
    const flexShrink = parseFloat(computed.flexShrink);
    if (!isNaN(flexShrink) && flexShrink !== 1) {
      node.flexShrink = flexShrink;
    }

    // align-self → layoutAlign (override parent's counterAxisAlignItems)
    const alignSelf = computed.alignSelf;
    if (alignSelf && alignSelf !== "auto") {
      if (alignSelf === "flex-start" || alignSelf === "start") {
        node.layoutAlign = "MIN";
      } else if (alignSelf === "flex-end" || alignSelf === "end") {
        node.layoutAlign = "MAX";
      } else if (alignSelf === "center") {
        node.layoutAlign = "CENTER";
      } else if (alignSelf === "stretch") {
        node.layoutAlign = "STRETCH";
      } else if (alignSelf === "baseline") {
        node.layoutAlign = "BASELINE";
      }
    }

    // flex-basis (for reference)
    const flexBasis = computed.flexBasis;
    if (flexBasis && flexBasis !== "auto" && flexBasis !== "0px") {
      node.flexBasis = flexBasis;
    }

    // Z-Index
    const zIndex = computed.zIndex;
    if (zIndex !== "auto") {
      node.zIndex = parseInt(zIndex, 10);
    }

    // Overflow & Clipping
    const overflow = computed.overflow;
    const overflowX = computed.overflowX;
    const overflowY = computed.overflowY;
    if (
      overflow !== "visible" ||
      overflowX !== "visible" ||
      overflowY !== "visible"
    ) {
      node.clipsContent =
        overflow === "hidden" ||
        overflowX === "hidden" ||
        overflowY === "hidden";
      node.overflow = {
        x: overflowX,
        y: overflowY,
      };
    }

    // Transform
    const transform = computed.transform;
    if (transform && transform !== "none") {
      node.transform = transform;
      node.transformOrigin = computed.transformOrigin;
    }

    // Blend Mode
    const mixBlendMode = computed.mixBlendMode;
    if (mixBlendMode && mixBlendMode !== "normal") {
      node.blendMode = this.mapBlendMode(mixBlendMode);
    }

    // Backdrop Filter
    const backdropFilter = computed.backdropFilter;
    if (backdropFilter && backdropFilter !== "none") {
      node.backdropFilter = backdropFilter;
    }

    // CSS Filter (blur, brightness, contrast, etc.)
    const filter = computed.filter;
    if (filter && filter !== "none") {
      node.filter = filter;
      // Parse filter into structured format for Figma effects
      const filterEffects = this.parseFilter(filter);
      if (filterEffects.length > 0) {
        node.filterEffects = filterEffects;
      }
    }

    // Clip Path
    const clipPath = computed.clipPath;
    if (clipPath && clipPath !== "none") {
      node.clipPath = clipPath;
    }

    // Mask Image
    const maskImage = computed.maskImage;
    if (maskImage && maskImage !== "none") {
      node.maskImage = maskImage;
      node.maskPosition = computed.maskPosition || "center";
      node.maskSize = computed.maskSize || "cover";
      node.maskRepeat = computed.maskRepeat || "no-repeat";
    }

    // Transform Origin (already captured but ensure it's applied)
    if (computed.transformOrigin && computed.transformOrigin !== "50% 50%") {
      node.transformOrigin = computed.transformOrigin;
    }

    // Perspective (3D transforms)
    const perspective = computed.perspective;
    if (perspective && perspective !== "none") {
      node.perspective = perspective;
    }

    // Isolation (stacking context)
    const isolation = computed.isolation;
    if (isolation && isolation !== "auto") {
      node.isolation = isolation;
    }

    // Contain (layout containment)
    const contain = computed.contain;
    if (contain && contain !== "none") {
      node.contain = contain;
    }

    // CSS Variables (Custom Properties)
    const cssVariables: Record<string, string> = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith("--")) {
        const value = computed.getPropertyValue(prop).trim();
        if (value) {
          cssVariables[prop] = value;
          // Track as potential design token
          this.collectDesignToken(prop, value);
        }
      }
    }
    if (Object.keys(cssVariables).length > 0) {
      node.cssVariables = cssVariables;
    }

    // CRITICAL FIX: Check if this is a body/html element early
    // Body/html backgrounds should be handled by the main frame, not the body node
    // This prevents blue background from appearing in the imported Figma design
    const isDocumentRoot =
      element.tagName.toLowerCase() === "body" ||
      element.tagName.toLowerCase() === "html";

    // Background Color
    // CRITICAL FIX: Skip body/html background colors
    // This prevents body background from overriding the main frame's white background
    const bgColor = computed.backgroundColor || "";

    // CRITICAL FIX: ALWAYS store backgroundColor in node.style for fallback use in Figma plugin
    // Even if transparent/empty, store it so the plugin can make decisions
    // This ensures the plugin can derive colors even if fills weren't extracted properly
    if (!node.style) {
      node.style = {};
    }
    // ALWAYS store backgroundColor - even if empty/transparent, the plugin needs to know
    node.style.backgroundColor = bgColor;
    node.backgroundColor = bgColor; // Also store directly for easier access

    if (bgColor && bgColor.trim() !== "") {
      // CRITICAL FIX: Check for transparent/zero-opacity colors before parsing
      // Skip "transparent", "rgba(0,0,0,0)", and empty strings
      const bgColorLower = bgColor.trim().toLowerCase();
      const isTransparent =
        bgColorLower === "transparent" ||
        bgColorLower === "rgba(0, 0, 0, 0)" ||
        bgColorLower === "rgba(0,0,0,0)" ||
        bgColorLower === "";

      if (!isTransparent) {
        const color = this.parseColor(bgColor);
        if (color) {
          // CRITICAL FIX: Apply fills even for very low opacity colors (but not zero)
          // Some designs use very low opacity backgrounds that should still be visible
          // Only skip if alpha is exactly 0 or very close to 0 (less than 0.001)
          const shouldApplyFill = color.a > 0.001;

          // For body/html, always skip background color fills
          // Body/html backgrounds are full-page backgrounds that should be handled by the main frame
          // The main frame will have a white background, and body fills would override it incorrectly
          if (isDocumentRoot) {
            // Always skip body/html background colors - main frame handles the background
            // Still track the color for design tokens, but don't apply as a fill
            this.assets.colors.add(bgColor);
            // Don't add fill - let main frame use white background
          } else if (shouldApplyFill) {
            // Non-root elements: apply background normally
            // CRITICAL FIX: Ensure fills array exists before pushing
            if (!node.fills) {
              node.fills = [];
            }
            node.fills.push({
              type: "SOLID",
              color: { r: color.r, g: color.g, b: color.b, a: color.a },
              opacity: color.a ?? 1,
              visible: true,
            });
            this.assets.colors.add(bgColor);
            console.log(
              `🎨 Added background color fill for ${
                node.htmlTag || node.type
              }: rgba(${Math.round(color.r * 255)}, ${Math.round(
                color.g * 255
              )}, ${Math.round(color.b * 255)}, ${color.a.toFixed(2)})`
            );
          } else {
            console.log(
              `⚪ Skipped transparent background color for ${
                node.htmlTag || node.type
              }: ${bgColor}`
            );
          }
        } else {
          console.warn(
            `⚠️ Failed to parse background color for ${
              node.htmlTag || node.type
            }: ${bgColor}`
          );
        }
      }
    }

    // Background Images & Gradients (Multi-layer support)
    // We want images to be ON TOP of color.
    // Figma: fills[0] is top.
    // CSS: background-image lists top-first.
    // So we collect images and PREPEND them to existing fills (which might contain the background color).

    // CRITICAL FIX: Skip background images for body/html nodes
    // Body/html backgrounds should be handled by the main frame, not the body node
    if (
      computed.backgroundImage &&
      computed.backgroundImage !== "none" &&
      !isDocumentRoot
    ) {
      // Split by comma, but careful with url(...) content possibly containing commas (base64)
      // Simple split might fail for advanced cases, but standard regex-split is safer.
      // For now we assume standard url() quoting.
      // Better regex for splitting CSS comma lists: /,(?![^(]*\))/
      const bgImages = computed.backgroundImage
        .split(/,(?![^(]*\))/)
        .map((s) => s.trim());
      const bgSizes = (computed.backgroundSize || "auto")
        .split(/,(?![^(]*\))/)
        .map((s) => s.trim());
      const bgPosX = (computed.backgroundPositionX || "0%")
        .split(/,(?![^(]*\))/)
        .map((s) => s.trim());
      const bgPosY = (computed.backgroundPositionY || "0%")
        .split(/,(?![^(]*\))/)
        .map((s) => s.trim());
      const bgRepeat = (computed.backgroundRepeat || "repeat")
        .split(/,(?![^(]*\))/)
        .map((s) => s.trim());

      const imageFills: any[] = [];
      const backgroundLayers: any[] = [];

      bgImages.forEach((bgImage, i) => {
        // Check for Gridient
        if (bgImage.includes("gradient")) {
          const gradient = this.parseGradient(bgImage);
          if (gradient) {
            imageFills.push(gradient);
          }
          return;
        }

        const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (urlMatch) {
          const url = urlMatch[1];
          this.captureImage(url);
          const key = this.hashString(url);

          const rawSize = bgSizes[i] || bgSizes[0] || "auto";
          const rawPosX = bgPosX[i] || bgPosX[0] || "0%";
          const rawPosY = bgPosY[i] || bgPosY[0] || "0%";
          const rawRepeat = bgRepeat[i] || bgRepeat[0] || "repeat";

          const sizeParts = rawSize.split(/\s+/).filter(Boolean);
          const size = {
            width:
              rawSize === "cover" || rawSize === "contain" || rawSize === "auto"
                ? rawSize
                : sizeParts[0] || "auto",
            height:
              rawSize === "cover" || rawSize === "contain" || rawSize === "auto"
                ? rawSize
                : sizeParts[1] || sizeParts[0] || "auto",
          };

          const position = { x: rawPosX, y: rawPosY };

          imageFills.push({
            type: "IMAGE",
            imageHash: key,
            scaleMode:
              rawSize === "cover"
                ? "CROP"
                : rawSize === "contain"
                ? "FIT"
                : "FILL",
            // Defaulting to FILL (Center Crop) for Cover, FIT for Contain.
            // For others, Figma doesn't support 'auto/tile' perfectly without TILE mode (which is buggy in API sometimes).
            // We use FILL/FIT mapping.
            visible: true,
          });

          backgroundLayers.push({
            type: "image",
            size,
            position,
            repeat: rawRepeat,
          });
        }
      });

      // Insert images at the start of fills array to ensure they render ON TOP of background colors
      if (imageFills.length > 0) {
        node.fills = [...imageFills, ...node.fills];
        if (backgroundLayers.length > 0) {
          node.backgrounds = backgroundLayers;
        }
      }
    }

    // Borders
    if (
      computed.borderWidth &&
      computed.borderWidth !== "0px" &&
      computed.borderStyle !== "none" &&
      computed.borderColor
    ) {
      const color = this.parseColor(computed.borderColor);
      if (color) {
        node.strokes.push({
          type: "SOLID",
          color: { r: color.r, g: color.g, b: color.b, a: color.a },
          opacity: color.a,
          visible: true,
        });
        node.strokeWeight = parseFloat(computed.borderWidth);
      }
    }

    // Border Radius
    if (computed.borderRadius && computed.borderRadius !== "0px") {
      node.cornerRadius = parseFloat(computed.borderRadius);
    }

    // Typography (TEXT nodes)
    if (node.type === "TEXT") {
      this.extractTypography(computed, element, node);
    }

    // Effects (Box Shadow) - Enhanced parsing
    if (computed.boxShadow && computed.boxShadow !== "none") {
      const shadows = this.parseBoxShadow(computed.boxShadow);
      if (shadows.length > 0) {
        console.log(
          `🔲 Extracted ${shadows.length} shadow(s) for ${element.tagName}`
        );
      }
      shadows.forEach((shadow) => {
        node.effects.push(shadow);
      });
    }

    // Text Shadow (for TEXT nodes)
    if (
      node.type === "TEXT" &&
      computed.textShadow &&
      computed.textShadow !== "none"
    ) {
      const textShadows = this.parseTextShadow(computed.textShadow);
      textShadows.forEach((shadow) => {
        node.effects.push(shadow);
      });
    }

    // Outline (different from border)
    const outlineWidth = computed.outlineWidth;
    const outlineStyle = computed.outlineStyle;
    const outlineColor = computed.outlineColor;
    if (
      outlineWidth &&
      outlineWidth !== "0px" &&
      outlineStyle !== "none" &&
      outlineColor
    ) {
      const outlineColorParsed = this.parseColor(outlineColor);
      if (outlineColorParsed) {
        node.outline = {
          type: "SOLID",
          color: {
            r: outlineColorParsed.r,
            g: outlineColorParsed.g,
            b: outlineColorParsed.b,
            a: outlineColorParsed.a,
          },
          width: parseFloat(outlineWidth),
          style: outlineStyle,
          visible: true,
        };
      }
    }

    // Opacity
    if (computed.opacity && computed.opacity !== "1") {
      node.opacity = parseFloat(computed.opacity);
    }

    // Animation & Transitions
    const transition = computed.transition;
    if (transition && transition !== "none") {
      node.transition = transition;
      const transitions = this.parseTransition(transition);
      if (transitions.length > 0) {
        node.transitions = transitions;
      }
    }

    const animation = computed.animation;
    if (animation && animation !== "none") {
      node.animation = animation;
      const animations = this.parseAnimation(animation);
      if (animations.length > 0) {
        node.animations = animations;
      }
    }
  }

  private extractAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    Array.from(element.attributes).forEach((attr) => {
      attrs[attr.name] = attr.value;
    });
    return attrs;
  }

  private extractTextContent(element: Element): string | null {
    const textNodes = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim())
      .filter((text) => text && text.length > 0);

    return textNodes.length > 0 ? textNodes.join(" ") : null;
  }

  private extractSpecialProperties(
    element: Element,
    node: any,
    computed: CSSStyleDeclaration
  ) {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case "img":
        const img = element as HTMLImageElement;
        node.type = "IMAGE";
        node.name = "Image";

        // Handle srcset for responsive images
        let imageUrl = img.src;
        if (img.srcset) {
          const srcset = this.parseSrcset(img.srcset);
          // Select the best image based on device pixel ratio
          const bestSrc = this.selectBestSrcset(
            srcset,
            window.devicePixelRatio || 1
          );
          if (bestSrc) {
            imageUrl = bestSrc.url;
          }
        }

        // Handle lazy-loaded images
        if (!imageUrl || imageUrl === window.location.href) {
          const dataSrc =
            img.getAttribute("data-src") || img.getAttribute("data-lazy-src");
          if (dataSrc) {
            imageUrl = dataSrc;
          }
        }

        if (imageUrl) {
          // CRITICAL FIX: Pass the img element to captureImage so it can get natural dimensions
          this.captureImage(imageUrl, img);
          const key = this.hashString(imageUrl);

          // CRITICAL FIX: Store natural dimensions for proper aspect ratio calculation
          const naturalWidth = img.naturalWidth || img.width || 0;
          const naturalHeight = img.naturalHeight || img.height || 0;

          // Store natural dimensions in the asset if not already set
          const asset = this.assets.images.get(imageUrl);
          if (asset && (asset as any).width === 0 && naturalWidth > 0) {
            (asset as any).width = naturalWidth;
            (asset as any).height = naturalHeight;
          }

          const objectFit = computed.objectFit || "fill";
          // CRITICAL FIX: Map object-fit to Figma scaleMode correctly
          // Figma supports: FILL, FIT, CROP, TILE
          // object-fit: fill -> FILL (stretch to fill, may distort)
          // object-fit: contain -> FIT (fit within, maintain aspect ratio)
          // object-fit: cover -> CROP (fill, maintain aspect ratio, crop overflow)
          // object-fit: none -> CROP (use natural size, crop if needed)
          // object-fit: scale-down -> FIT (like contain)
          const scaleMode =
            objectFit === "cover"
              ? "CROP"
              : objectFit === "contain"
              ? "FIT"
              : objectFit === "fill"
              ? "FILL"
              : objectFit === "none"
              ? "CROP"
              : objectFit === "scale-down"
              ? "FIT"
              : "FILL";

          // Object Position (for image positioning)
          // CRITICAL FIX: Use natural dimensions for transform calculation, not rendered dimensions
          const objectPosition = computed.objectPosition || "50% 50%";
          const imageTransform = this.calculateImageTransform(
            objectPosition,
            naturalWidth,
            naturalHeight,
            node.layout.width,
            node.layout.height
          );

          node.fills = [
            {
              type: "IMAGE",
              imageHash: key,
              scaleMode: scaleMode,
              imageTransform: imageTransform,
              visible: true,
            },
          ];
          node.imageHash = key;

          // Image rendering (pixelated vs smooth)
          const imageRendering = computed.imageRendering;
          if (imageRendering && imageRendering !== "auto") {
            node.imageRendering = imageRendering; // "pixelated" or "smooth"
          }

          // Image orientation (EXIF)
          const imageOrientation = img.getAttribute("data-orientation") || "1";
          if (imageOrientation !== "1") {
            node.imageOrientation = imageOrientation;
          }

          // Check if it's an SVG image
          if (
            imageUrl.endsWith(".svg") ||
            imageUrl.includes("data:image/svg+xml")
          ) {
            node.isSvgImage = true;
          }

          // Clip-path on images
          const clipPath = computed.clipPath;
          if (clipPath && clipPath !== "none") {
            node.clipPath = clipPath;
          }
        }
        break;

      case "svg":
        node.type = "VECTOR";
        node.name = "SVG";
        node.vectorData = node.vectorData || {};
        node.vectorData.svgCode = this.inlineSvgUses(element as SVGElement);
        break;

      case "canvas": {
        const canvasEl = element as HTMLCanvasElement;
        node.type = "RECTANGLE";
        node.name = "Canvas";
        node.embed = {
          type: "canvas",
          width: canvasEl.width,
          height: canvasEl.height,
        };

        try {
          const dataUrl = canvasEl.toDataURL("image/png");
          if (dataUrl && dataUrl.startsWith("data:image")) {
            this.captureImage(dataUrl);
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
            node.embed.snapshotHash = key;
          }
        } catch (e) {
          console.warn("Canvas toDataURL failed (tainted or blocked)", e);
        }
        break;
      }

      case "video": {
        const video = element as HTMLVideoElement;
        node.type = "FRAME";
        node.name = "Video";
        node.embed = {
          type: "video",
          src: video.currentSrc || video.src || null,
          poster: video.poster || null,
          autoplay: video.autoplay,
          controls: video.controls,
          muted: video.muted,
          loop: video.loop,
          duration: isFinite(video.duration) ? video.duration : null,
          currentTime: video.currentTime,
        };

        if (video.poster) {
          this.captureImage(video.poster);
          const key = this.hashString(video.poster);
          node.fills = [
            {
              type: "IMAGE",
              imageHash: key,
              scaleMode: "FILL",
              visible: true,
            },
          ];
          node.imageHash = key;
          node.embed.posterHash = key;
        }

        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || Math.max(node.layout.width, 1);
          canvas.height = video.videoHeight || Math.max(node.layout.height, 1);
          const ctx = canvas.getContext("2d");
          if (ctx && canvas.width && canvas.height) {
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameData = canvas.toDataURL("image/png");
              if (frameData && frameData !== "data:,") {
                this.captureImage(frameData);
                const key = this.hashString(frameData);
                node.embed.framePreviewHash = key;

                // Fallback: Use frame as fill if no poster
                if (!node.fills || node.fills.length === 0) {
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
              }
            } catch (drawError) {
              // Context might be tainted if video is cross-origin
              console.warn("Could not draw video frame (tainted?)", drawError);
            }
          }
        } catch (e) {
          console.warn("Video frame capture failed", e);
        }
        break;
      }

      case "iframe":
      case "embed":
      case "object": {
        const src =
          (element as HTMLIFrameElement).src ||
          (element as any).data ||
          (element as any).getAttribute?.("srcdoc") ||
          null;
        node.type = "FRAME";
        node.name = "Embed";
        node.embed = { type: "embed", src };
        break;
      }

      case "lottie-player": {
        const src =
          (element as any).getAttribute?.("src") ||
          (element as any).getAttribute?.("data-src") ||
          null;
        node.type = "FRAME";
        node.name = "Lottie";
        node.embed = { type: "lottie", src };
        if (src) {
          fetch(src)
            .then((resp) => resp.text())
            .then((json) => {
              node.embed!.lottieJson = json;
            })
            .catch((e) => {
              console.warn("Failed to fetch lottie JSON", e);
            });
        }
        break;
      }

      case "input":
        const input = element as HTMLInputElement;
        node.name = "Input";
        if (input.placeholder) {
          // CRITICAL FIX: Create absoluteLayout for placeholder text nodes
          // Placeholder text is positioned within the input element
          const placeholderLayout = {
            left: node.layout.x,
            top: node.layout.y,
            right: node.layout.x + node.layout.width,
            bottom: node.layout.y + node.layout.height,
            width: node.layout.width,
            height: node.layout.height,
          };

          node.children.push({
            id: node.id + "-placeholder",
            type: "TEXT",
            name: input.placeholder,
            characters: input.placeholder,
            htmlTag: "span", // CRITICAL: Set htmlTag
            layout: {
              x: node.layout.x,
              y: node.layout.y,
              width: node.layout.width,
              height: node.layout.height,
            },
            absoluteLayout: placeholderLayout, // CRITICAL: Always provide absoluteLayout
            fills: [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6, a: 1 } }],
          });
        }
        break;
    }
  }

  private async captureImage(url: string, element?: HTMLImageElement) {
    try {
      const absoluteUrl = new URL(url, window.location.href).href;

      if (!this.assets.images.has(url)) {
        // CRITICAL FIX: Try to get dimensions from the element if it's an img tag
        let width = 0;
        let height = 0;
        if (element && element instanceof HTMLImageElement) {
          width = element.naturalWidth || element.width || 0;
          height = element.naturalHeight || element.height || 0;
        }

        this.assets.images.set(url, {
          originalUrl: url,
          absoluteUrl,
          url: absoluteUrl,
          base64: null,
          mimeType: this.getMimeType(url),
          width: width,
          height: height,
          data: null,
          svgCode: undefined as string | undefined,
          error: undefined as string | undefined,
        } as any);
        console.log(
          `📸 Captured image URL: ${url.substring(0, 80)}...${
            width > 0 && height > 0 ? ` (${width}×${height})` : ""
          }`
        );
      } else {
        // CRITICAL FIX: Update dimensions if we have them from the element
        const asset = this.assets.images.get(url);
        if (asset && element && element instanceof HTMLImageElement) {
          const naturalWidth = element.naturalWidth || element.width || 0;
          const naturalHeight = element.naturalHeight || element.height || 0;
          if (
            naturalWidth > 0 &&
            naturalHeight > 0 &&
            ((asset as any).width === 0 || (asset as any).height === 0)
          ) {
            (asset as any).width = naturalWidth;
            (asset as any).height = naturalHeight;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to process image URL:", url, error);
    }
  }

  private async urlToBase64(
    url: string,
    timeout = 10000, // CRITICAL FIX: Increased from 5s to 10s for large images
    retries = 2 // CRITICAL FIX: Add retry logic for failed images
  ): Promise<{
    base64: string;
    width: number;
    height: number;
    svgCode?: string;
  }> {
    const isSvg =
      url.toLowerCase().includes(".svg") ||
      this.getMimeType(url) === "image/svg+xml";

    // Helper to fetch via proxy with retries
    const fetchViaProxy = async (
      targetUrl: string,
      retryCount = 0
    ): Promise<string | null> => {
      const MAX_RETRIES = 2;
      try {
        const proxyUrl = `http://localhost:4411/api/proxy?url=${encodeURIComponent(
          targetUrl
        )}`;
        const resp = await fetch(proxyUrl, {
          signal: AbortSignal.timeout(8000), // 8 second timeout per attempt
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json.ok && json.data) {
            return json.data; // data:image/png;base64,...
          }
        }
      } catch (e) {
        if (retryCount < MAX_RETRIES) {
          console.warn(
            `Proxy fetch failed (attempt ${retryCount + 1}/${
              MAX_RETRIES + 1
            }), retrying...`,
            targetUrl
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (retryCount + 1))
          ); // Exponential backoff
          return fetchViaProxy(targetUrl, retryCount + 1);
        }
        console.warn("Proxy fetch failed after retries for", targetUrl, e);
      }
      return null;
    };

    if (isSvg) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const text = await resp.text();
          const base64 = btoa(unescape(encodeURIComponent(text)));
          return { base64, width: 0, height: 0, svgCode: text };
        }
      } catch (error) {
        // Fallback to proxy for SVG
        console.warn(`Direct SVG fetch failed, trying proxy for ${url}`);
        const proxyData = await fetchViaProxy(url);
        if (proxyData) {
          const base64 = proxyData.split(",")[1];
          // Try to decode base64 to get SVG text? Or just return base64.
          // For SVGs we generally want the code.
          try {
            const decoded = decodeURIComponent(escape(atob(base64)));
            if (decoded.includes("<svg")) {
              return { base64, width: 0, height: 0, svgCode: decoded };
            }
          } catch (e) {}
          return { base64, width: 0, height: 0 };
        }
      } finally {
        clearTimeout(timeoutId);
      }
      return { base64: "", width: 0, height: 0 };
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";

      const timeoutId = setTimeout(async () => {
        console.warn(`⏱️ Image timeout, trying proxy: ${url}`);
        const proxyData = await fetchViaProxy(url);
        if (proxyData) {
          const base64 = proxyData.split(",")[1];
          // CRITICAL FIX: Try to get dimensions from DOM if image is already loaded
          let width = 0;
          let height = 0;
          try {
            // Check if there's an img element with this URL already in the DOM
            const existingImg = Array.from(
              document.querySelectorAll("img")
            ).find(
              (el: HTMLImageElement) => el.src === url || el.currentSrc === url
            ) as HTMLImageElement | undefined;
            if (existingImg) {
              width = existingImg.naturalWidth || existingImg.width || 0;
              height = existingImg.naturalHeight || existingImg.height || 0;
            }
          } catch (e) {
            // Ignore errors
          }
          resolve({ base64, width, height });
        } else {
          resolve({ base64: "", width: 0, height: 0 });
        }
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ base64: "", width: 0, height: 0 });
          return;
        }
        ctx.drawImage(img, 0, 0);

        try {
          const base64 = canvas.toDataURL(this.getMimeType(url));
          const data = base64.split(",")[1];
          resolve({
            base64: data,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          });
        } catch (error) {
          console.warn("Canvas tainted, trying proxy for", url);
          fetchViaProxy(url).then((proxyData) => {
            if (proxyData) {
              const base64 = proxyData.split(",")[1];
              resolve({
                base64,
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
              });
            } else {
              resolve({ base64: "", width: 0, height: 0 });
            }
          });
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        console.warn("Failed to load image directly, trying proxy", url);
        fetchViaProxy(url).then((proxyData) => {
          if (proxyData) {
            const base64 = proxyData.split(",")[1];
            // CRITICAL FIX: Try to get dimensions from the failed img element
            let width = img.naturalWidth || img.width || 0;
            let height = img.naturalHeight || img.height || 0;
            // If img element doesn't have dimensions, try to find it in DOM
            if (width === 0 || height === 0) {
              try {
                const existingImg = Array.from(
                  document.querySelectorAll("img")
                ).find(
                  (el: HTMLImageElement) =>
                    el.src === url || el.currentSrc === url
                ) as HTMLImageElement | undefined;
                if (existingImg) {
                  width = existingImg.naturalWidth || existingImg.width || 0;
                  height = existingImg.naturalHeight || existingImg.height || 0;
                }
              } catch (e) {
                // Ignore errors
              }
            }
            resolve({ base64, width, height });
          } else {
            // CRITICAL FIX: Return placeholder instead of empty - extraction continues
            console.warn(
              `⚠️ Image failed to load after retries: ${url.substring(
                0,
                50
              )}...`
            );
            // Try to get dimensions from DOM before giving up
            let width = img.naturalWidth || img.width || 0;
            let height = img.naturalHeight || img.height || 0;
            if (width === 0 || height === 0) {
              try {
                const existingImg = Array.from(
                  document.querySelectorAll("img")
                ).find(
                  (el: HTMLImageElement) =>
                    el.src === url || el.currentSrc === url
                ) as HTMLImageElement | undefined;
                if (existingImg) {
                  width = existingImg.naturalWidth || existingImg.width || 0;
                  height = existingImg.naturalHeight || existingImg.height || 0;
                }
              } catch (e) {
                // Ignore errors
              }
            }
            resolve({ base64: "", width, height }); // Will be marked with error in asset
          }
        });
      };
      img.src = url;
    });
  }

  private getMimeType(url: string): string {
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
  }

  private parseColor(
    color: string
  ): { r: number; g: number; b: number; a: number } | null {
    if (!color) return null;
    const raw = color.trim().toLowerCase();
    if (raw === "transparent") return null;

    // Direct rgba()/rgb()
    const rgbaMatch = raw.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10) / 255;
      const g = parseInt(rgbaMatch[2], 10) / 255;
      const b = parseInt(rgbaMatch[3], 10) / 255;
      const a =
        rgbaMatch[4] !== undefined && rgbaMatch[4] !== null
          ? parseFloat(rgbaMatch[4])
          : 1;
      return { r, g, b, a };
    }

    // Hex #rgb, #rrggbb, #rrggbbaa
    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      const r255 = parseInt(hex.substring(0, 2), 16);
      const g255 = parseInt(hex.substring(2, 4), 16);
      const b255 = parseInt(hex.substring(4, 6), 16);
      let a = 1;
      if (hex.length === 8) {
        const a255 = parseInt(hex.substring(6, 8), 16);
        a = a255 / 255;
      }
      return { r: r255 / 255, g: g255 / 255, b: b255 / 255, a };
    }

    // Fallback: let canvas normalize and re-parse (handles named colors)
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    try {
      ctx.fillStyle = raw;
      const normalized = ctx.fillStyle.toString().toLowerCase();
      const rgbaMatch2 = normalized.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
      );
      if (rgbaMatch2) {
        const r = parseInt(rgbaMatch2[1], 10) / 255;
        const g = parseInt(rgbaMatch2[2], 10) / 255;
        const b = parseInt(rgbaMatch2[3], 10) / 255;
        const a =
          rgbaMatch2[4] !== undefined && rgbaMatch2[4] !== null
            ? parseFloat(rgbaMatch2[4])
            : 1;
        return { r, g, b, a };
      }
      const hexMatch2 = normalized.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);
      if (hexMatch2) {
        const hex = hexMatch2[1];
        const r255 = parseInt(hex.substring(0, 2), 16);
        const g255 = parseInt(hex.substring(2, 4), 16);
        const b255 = parseInt(hex.substring(4, 6), 16);
        let a = 1;
        if (hex.length === 8) {
          const a255 = parseInt(hex.substring(6, 8), 16);
          a = a255 / 255;
        }
        return { r: r255 / 255, g: g255 / 255, b: b255 / 255, a };
      }
    } catch {
      // ignore and fall through
    }

    return null;
  }

  private async collectFontFaces(timeout = 4000): Promise<void> {
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        // CRITICAL FIX: Handle CORS errors when accessing cssRules for cross-origin stylesheets
        let cssRules: CSSRuleList | null = null;
        try {
          cssRules = sheet.cssRules || sheet.rules || null;
        } catch (cssRulesError) {
          // Expected for cross-origin stylesheets due to CORS - silently skip
          if (cssRulesError instanceof DOMException) {
            continue;
          }
          // For other errors, log and continue
          console.warn(
            `⚠️ Could not access stylesheet rules for font collection:`,
            cssRulesError instanceof Error
              ? cssRulesError.message
              : String(cssRulesError)
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
        // Handle any other unexpected errors
        if (
          !(error instanceof DOMException && error.name === "SecurityError")
        ) {
          console.warn(
            `⚠️ Error processing stylesheet for font collection:`,
            error instanceof Error ? error.message : String(error)
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
      const family = (rule.style.getPropertyValue("font-family") || "")
        .replace(/["']/g, "")
        .trim();
      const weight = rule.style.getPropertyValue("font-weight") || "400";
      const style = rule.style.getPropertyValue("font-style") || "normal";
      const src = rule.style.getPropertyValue("src") || "";
      const match = src.match(/url\(([^)]+)\)/);
      if (!match) continue;
      const rawUrl = match[1].replace(/["']/g, "").trim();
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
          : parseInt(String(weight), 10) || 400;
      this.assets.fonts.get(family)?.add(parsedWeight);
    }
  }

  private parseGradient(css: string): any | null {
    if (!css || css === "none") return null;

    // Linear Gradient
    const linearMatch = css.match(/linear-gradient\((.*)\)/);
    if (linearMatch) {
      const content = linearMatch[1];
      const parts = content.split(/,(?![^(]*\))/).map((p) => p.trim());

      let angle = 180;
      let stopsStartIndex = 0;

      const firstPart = parts[0];
      if (firstPart.includes("deg")) {
        angle = parseFloat(firstPart);
        stopsStartIndex = 1;
      } else if (firstPart.startsWith("to ")) {
        const direction = firstPart.replace("to ", "").trim();
        switch (direction) {
          case "top":
            angle = 0;
            break;
          case "bottom":
            angle = 180;
            break;
          case "left":
            angle = 270;
            break;
          case "right":
            angle = 90;
            break;
          case "top right":
          case "right top":
            angle = 45;
            break;
          case "bottom right":
          case "right bottom":
            angle = 135;
            break;
          case "bottom left":
          case "left bottom":
            angle = 225;
            break;
          case "top left":
          case "left top":
            angle = 315;
            break;
        }
        stopsStartIndex = 1;
      }

      const stops: any[] = [];
      for (let i = stopsStartIndex; i < parts.length; i++) {
        const stopStr = parts[i];
        const lastSpaceIndex = stopStr.lastIndexOf(" ");
        let colorStr = stopStr;
        let position =
          (i - stopsStartIndex) / (parts.length - stopsStartIndex - 1);

        if (lastSpaceIndex > -1) {
          const potentialPos = stopStr.substring(lastSpaceIndex + 1);
          if (potentialPos.includes("%")) {
            position = parseFloat(potentialPos) / 100;
            colorStr = stopStr.substring(0, lastSpaceIndex).trim();
          }
        }

        const color = this.parseColor(colorStr);
        if (color) {
          stops.push({
            position: Math.max(0, Math.min(1, position)),
            color: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
          });
        }
      }

      if (stops.length < 2) return null;

      return {
        type: "GRADIENT_LINEAR",
        gradientStops: stops,
        gradientTransform: this.calculateGradientTransform(angle),
        visible: true,
      };
    }

    // Radial Gradient
    const radialMatch = css.match(/radial-gradient\((.*)\)/);
    if (radialMatch) {
      const content = radialMatch[1];
      const parts = content.split(/,(?![^(]*\))/).map((p) => p.trim());

      let stopsStartIndex = 0;
      let shape = "circle";
      let position = { x: 0.5, y: 0.5 };

      // Parse shape and position if present
      const firstPart = parts[0];
      if (
        firstPart.includes("circle") ||
        firstPart.includes("ellipse") ||
        firstPart.includes("at ")
      ) {
        if (firstPart.includes("ellipse")) shape = "ellipse";
        const atMatch = firstPart.match(/at\s+(\S+)\s+(\S+)/);
        if (atMatch) {
          position.x = this.parsePercentOrKeyword(atMatch[1]);
          position.y = this.parsePercentOrKeyword(atMatch[2]);
        }
        stopsStartIndex = 1;
      }

      const stops: any[] = [];
      for (let i = stopsStartIndex; i < parts.length; i++) {
        const stopStr = parts[i];
        const lastSpaceIndex = stopStr.lastIndexOf(" ");
        let colorStr = stopStr;
        let stopPosition =
          (i - stopsStartIndex) / (parts.length - stopsStartIndex - 1);

        if (lastSpaceIndex > -1) {
          const potentialPos = stopStr.substring(lastSpaceIndex + 1);
          if (potentialPos.includes("%")) {
            stopPosition = parseFloat(potentialPos) / 100;
            colorStr = stopStr.substring(0, lastSpaceIndex).trim();
          }
        }

        const color = this.parseColor(colorStr);
        if (color) {
          stops.push({
            position: Math.max(0, Math.min(1, stopPosition)),
            color: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
          });
        }
      }

      if (stops.length < 2) return null;

      return {
        type: "GRADIENT_RADIAL",
        gradientStops: stops,
        gradientHandlePositions: [
          { x: position.x, y: position.y },
          { x: position.x + 0.5, y: position.y },
          { x: position.x, y: position.y + 0.5 },
        ],
        visible: true,
      };
    }

    // Conic Gradient
    const conicMatch = css.match(/conic-gradient\((.*)\)/);
    if (conicMatch) {
      const content = conicMatch[1];
      const parts = content.split(/,(?![^(]*\))/).map((p) => p.trim());

      let stopsStartIndex = 0;
      let angle = 0;
      let position = { x: 0.5, y: 0.5 };

      const firstPart = parts[0];
      if (firstPart.includes("from") || firstPart.includes("at")) {
        const fromMatch = firstPart.match(/from\s+(\S+)/);
        if (fromMatch) {
          angle = parseFloat(fromMatch[1]);
        }
        const atMatch = firstPart.match(/at\s+(\S+)\s+(\S+)/);
        if (atMatch) {
          position.x = this.parsePercentOrKeyword(atMatch[1]);
          position.y = this.parsePercentOrKeyword(atMatch[2]);
        }
        stopsStartIndex = 1;
      }

      const stops: any[] = [];
      for (let i = stopsStartIndex; i < parts.length; i++) {
        const stopStr = parts[i];
        const lastSpaceIndex = stopStr.lastIndexOf(" ");
        let colorStr = stopStr;
        let stopPosition =
          (i - stopsStartIndex) / (parts.length - stopsStartIndex - 1);

        if (lastSpaceIndex > -1) {
          const potentialPos = stopStr.substring(lastSpaceIndex + 1);
          if (potentialPos.includes("deg")) {
            stopPosition = parseFloat(potentialPos) / 360;
            colorStr = stopStr.substring(0, lastSpaceIndex).trim();
          }
        }

        const color = this.parseColor(colorStr);
        if (color) {
          stops.push({
            position: Math.max(0, Math.min(1, stopPosition)),
            color: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
          });
        }
      }

      if (stops.length < 2) return null;

      return {
        type: "GRADIENT_ANGULAR",
        gradientStops: stops,
        gradientHandlePositions: [
          { x: position.x, y: position.y },
          {
            x: position.x + 0.5 * Math.cos((angle * Math.PI) / 180),
            y: position.y + 0.5 * Math.sin((angle * Math.PI) / 180),
          },
        ],
        visible: true,
      };
    }

    return null;
  }

  private parsePercentOrKeyword(value: string): number {
    if (value.includes("%")) {
      return parseFloat(value) / 100;
    }
    switch (value) {
      case "left":
      case "top":
        return 0;
      case "center":
        return 0.5;
      case "right":
      case "bottom":
        return 1;
      default:
        return 0.5;
    }
  }

  private calculateGradientTransform(
    angleDeg: number
  ): [[number, number, number], [number, number, number]] {
    // Convert angle to radians
    const angleRad = (angleDeg * Math.PI) / 180;

    // Calculate transform matrix for arbitrary angle
    // This creates a rotation matrix for the gradient
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // Transform matrix: [[a, b, tx], [c, d, ty]]
    // For gradient rotation around center
    return [
      [cos, sin, 0.5 - 0.5 * cos - 0.5 * sin],
      [-sin, cos, 0.5 + 0.5 * sin - 0.5 * cos],
    ];
  }

  private parseBoxShadow(boxShadow: string): any[] {
    const shadows: any[] = [];

    // Split multiple shadows (separated by commas outside of rgb/rgba)
    const shadowStrings = boxShadow.split(/,(?![^(]*\))/);

    for (const shadowStr of shadowStrings) {
      const trimmed = shadowStr.trim();
      if (!trimmed || trimmed === "none") continue;

      // Parse: [inset] <offset-x> <offset-y> <blur-radius> <spread-radius> <color>
      const isInset = trimmed.startsWith("inset");
      const working = isInset ? trimmed.substring(5).trim() : trimmed;

      // Extract color (rgba/rgb/hex/named at start or end)
      let colorStr = "";
      let remaining = working;

      const rgbaMatch = working.match(/rgba?\([^)]+\)/);
      if (rgbaMatch) {
        colorStr = rgbaMatch[0];
        remaining = working.replace(rgbaMatch[0], "").trim();
      } else {
        // Try to find hex or named color
        const parts = working.split(/\s+/);
        const colorPart = parts.find(
          (p) => p.startsWith("#") || /^[a-z]+$/i.test(p)
        );
        if (colorPart) {
          colorStr = colorPart;
          remaining = working.replace(colorPart, "").trim();
        }
      }

      // Parse dimensions
      const dimensions = remaining.split(/\s+/).filter((s) => s.length > 0);
      const offsetX = parseFloat(dimensions[0] || "0");
      const offsetY = parseFloat(dimensions[1] || "0");
      const blurRadius = parseFloat(dimensions[2] || "0");
      const spreadRadius = parseFloat(dimensions[3] || "0");

      const color = this.parseColor(colorStr) || { r: 0, g: 0, b: 0, a: 0.25 };

      shadows.push({
        type: isInset ? "INNER_SHADOW" : "DROP_SHADOW",
        color: { r: color.r, g: color.g, b: color.b, a: color.a },
        offset: { x: offsetX, y: offsetY },
        radius: blurRadius,
        spread: spreadRadius,
        visible: true,
      });
    }

    return shadows;
  }

  private parseTextShadow(textShadow: string): any[] {
    const shadows: any[] = [];

    // Split multiple shadows (separated by commas)
    const shadowStrings = textShadow.split(/,(?![^(]*\))/);

    for (const shadowStr of shadowStrings) {
      const trimmed = shadowStr.trim();
      if (!trimmed || trimmed === "none") continue;

      // Parse: <offset-x> <offset-y> <blur-radius> <color>
      let remaining = trimmed;

      // Extract color (rgba/rgb/hex/named at start or end)
      let colorStr = "";
      const rgbaMatch = remaining.match(/rgba?\([^)]+\)/);
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

      // Parse dimensions
      const dimensions = remaining.split(/\s+/).filter((s) => s.length > 0);
      const offsetX = parseFloat(dimensions[0] || "0");
      const offsetY = parseFloat(dimensions[1] || "0");
      const blurRadius = parseFloat(dimensions[2] || "0");

      const color = this.parseColor(colorStr) || { r: 0, g: 0, b: 0, a: 0.5 };

      shadows.push({
        type: "DROP_SHADOW",
        color: { r: color.r, g: color.g, b: color.b, a: color.a },
        offset: { x: offsetX, y: offsetY },
        radius: blurRadius,
        spread: 0,
        visible: true,
      });
    }

    return shadows;
  }

  private parseFilter(filter: string): any[] {
    const effects: any[] = [];

    if (!filter || filter === "none") return effects;

    // Parse filter functions: blur(), brightness(), contrast(), grayscale(), hue-rotate(), invert(), opacity(), saturate(), sepia()
    const filterFunctions = filter.match(/(\w+)\([^)]*\)/g) || [];

    for (const func of filterFunctions) {
      const match = func.match(/(\w+)\(([^)]*)\)/);
      if (!match) continue;

      const name = match[1];
      const value = match[2].trim();

      switch (name) {
        case "blur":
          const blurValue = parseFloat(value) || 0;
          effects.push({
            type: "LAYER_BLUR",
            radius: blurValue,
            visible: true,
          });
          break;

        case "brightness":
        case "contrast":
        case "grayscale":
        case "invert":
        case "opacity":
        case "saturate":
        case "sepia":
          // These don't have direct Figma equivalents, store as metadata
          effects.push({
            type: "FILTER",
            filterType: name,
            value: parseFloat(value) || 0,
            visible: true,
          });
          break;

        case "hue-rotate":
          effects.push({
            type: "FILTER",
            filterType: "hue-rotate",
            value: parseFloat(value) || 0,
            visible: true,
          });
          break;

        case "drop-shadow":
          // Parse drop-shadow similar to box-shadow
          const dropShadow = this.parseBoxShadow(func);
          effects.push(...dropShadow);
          break;
      }
    }

    return effects;
  }

  private parseSrcset(
    srcset: string
  ): Array<{ url: string; width?: number; density?: number }> {
    const sources: Array<{ url: string; width?: number; density?: number }> =
      [];

    if (!srcset) return sources;

    // Parse srcset: "image1.jpg 1x, image2.jpg 2x" or "image1.jpg 300w, image2.jpg 600w"
    const entries = srcset.split(",").map((s) => s.trim());

    for (const entry of entries) {
      const parts = entry.trim().split(/\s+/);
      if (parts.length === 0) continue;

      const url = parts[0];
      const descriptor = parts[1];

      if (descriptor) {
        if (descriptor.endsWith("w")) {
          // Width descriptor
          const width = parseFloat(descriptor);
          if (!isNaN(width)) {
            sources.push({ url, width });
          }
        } else if (descriptor.endsWith("x")) {
          // Density descriptor
          const density = parseFloat(descriptor);
          if (!isNaN(density)) {
            sources.push({ url, density });
          }
        }
      } else {
        sources.push({ url });
      }
    }

    return sources;
  }

  private selectBestSrcset(
    sources: Array<{ url: string; width?: number; density?: number }>,
    devicePixelRatio: number
  ): { url: string; width?: number; density?: number } | null {
    if (sources.length === 0) return null;
    if (sources.length === 1) return sources[0];

    // Prefer density-based selection
    const densitySources = sources.filter((s) => s.density !== undefined);
    if (densitySources.length > 0) {
      // Find closest density match
      const sorted = densitySources.sort((a, b) => {
        const diffA = Math.abs((a.density || 0) - devicePixelRatio);
        const diffB = Math.abs((b.density || 0) - devicePixelRatio);
        return diffA - diffB;
      });
      return sorted[0];
    }

    // Fallback to width-based or first source
    return sources[0];
  }

  private calculateImageTransform(
    objectPosition: string,
    imageWidth: number,
    imageHeight: number,
    containerWidth: number,
    containerHeight: number
  ): [[number, number, number], [number, number, number]] | undefined {
    if (!objectPosition || objectPosition === "50% 50%") {
      return undefined; // Default center, no transform needed
    }

    const parts = objectPosition.split(/\s+/);
    const x = this.parsePositionValue(parts[0] || "50%", containerWidth);
    const y = this.parsePositionValue(parts[1] || "50%", containerHeight);

    // Calculate transform to position image
    // Transform origin is relative to image (0-1)
    const tx = x / containerWidth - 0.5;
    const ty = y / containerHeight - 0.5;

    // Return transform matrix: [[a, b, tx], [c, d, ty]]
    return [
      [1, 0, tx],
      [0, 1, ty],
    ];
  }

  private parsePositionValue(value: string, containerSize: number): number {
    if (value.includes("%")) {
      const percent = parseFloat(value) / 100;
      return containerSize * percent;
    }

    if (value === "left" || value === "top") return 0;
    if (value === "right" || value === "bottom") return containerSize;
    if (value === "center") return containerSize / 2;

    const px = parseFloat(value);
    return isNaN(px) ? containerSize / 2 : px;
  }

  private parseTransition(transition: string): Array<{
    property: string;
    duration: string;
    timingFunction: string;
    delay: string;
  }> {
    const transitions: Array<{
      property: string;
      duration: string;
      timingFunction: string;
      delay: string;
    }> = [];

    if (!transition || transition === "none") return transitions;

    // Split multiple transitions
    const transitionStrings = transition.split(/,(?![^(]*\))/);

    for (const transStr of transitionStrings) {
      const parts = transStr.trim().split(/\s+/);
      if (parts.length === 0) continue;

      const property = parts[0] || "all";
      let duration = "0s";
      let timingFunction = "ease";
      let delay = "0s";

      // Parse duration, timing-function, delay
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.match(/^\d+(\.\d+)?(ms|s)$/)) {
          if (duration === "0s") {
            duration = part;
          } else {
            delay = part;
          }
        } else if (
          part.includes("(") ||
          [
            "ease",
            "linear",
            "ease-in",
            "ease-out",
            "ease-in-out",
            "step-start",
            "step-end",
          ].includes(part)
        ) {
          timingFunction = part;
        }
      }

      transitions.push({
        property,
        duration,
        timingFunction,
        delay,
      });
    }

    return transitions;
  }

  private parseAnimation(animation: string): Array<{
    name: string;
    duration: string;
    timingFunction: string;
    delay: string;
    iterationCount: string;
    direction: string;
    fillMode: string;
    playState: string;
  }> {
    const animations: Array<{
      name: string;
      duration: string;
      timingFunction: string;
      delay: string;
      iterationCount: string;
      direction: string;
      fillMode: string;
      playState: string;
    }> = [];

    if (!animation || animation === "none") return animations;

    // Split multiple animations
    const animationStrings = animation.split(/,(?![^(]*\))/);

    for (const animStr of animationStrings) {
      const parts = animStr.trim().split(/\s+/);
      if (parts.length === 0) continue;

      let name = parts[0] || "none";
      let duration = "0s";
      let timingFunction = "ease";
      let delay = "0s";
      let iterationCount = "1";
      let direction = "normal";
      let fillMode = "none";
      let playState = "running";

      // Parse animation properties
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.match(/^\d+(\.\d+)?(ms|s)$/)) {
          if (duration === "0s") {
            duration = part;
          } else {
            delay = part;
          }
        } else if (
          part.includes("(") ||
          [
            "ease",
            "linear",
            "ease-in",
            "ease-out",
            "ease-in-out",
            "step-start",
            "step-end",
          ].includes(part)
        ) {
          timingFunction = part;
        } else if (part === "infinite" || part.match(/^\d+$/)) {
          iterationCount = part;
        } else if (
          ["normal", "reverse", "alternate", "alternate-reverse"].includes(part)
        ) {
          direction = part;
        } else if (["none", "forwards", "backwards", "both"].includes(part)) {
          fillMode = part;
        } else if (["running", "paused"].includes(part)) {
          playState = part;
        }
      }

      animations.push({
        name,
        duration,
        timingFunction,
        delay,
        iterationCount,
        direction,
        fillMode,
        playState,
      });
    }

    return animations;
  }

  private calculateContainingBlock(
    element: Element
  ): { x: number; y: number; width: number; height: number } | null {
    // Find the nearest positioned ancestor (position: relative, absolute, fixed, or sticky)
    let parent = element.parentElement;
    while (parent) {
      const parentStyles = window.getComputedStyle(parent);
      const position = parentStyles.position;

      if (
        position === "relative" ||
        position === "absolute" ||
        position === "fixed" ||
        position === "sticky"
      ) {
        const rect = parent.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }

      // Also check for transform, which creates a containing block
      if (parentStyles.transform && parentStyles.transform !== "none") {
        const rect = parent.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }

      parent = parent.parentElement;
    }

    // If no positioned ancestor, use viewport
    return {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  private mapBlendMode(cssBlendMode: string): string {
    const blendModeMap: Record<string, string> = {
      normal: "NORMAL",
      multiply: "MULTIPLY",
      screen: "SCREEN",
      overlay: "OVERLAY",
      darken: "DARKEN",
      lighten: "LIGHTEN",
      "color-dodge": "COLOR_DODGE",
      "color-burn": "COLOR_BURN",
      "hard-light": "HARD_LIGHT",
      "soft-light": "SOFT_LIGHT",
      difference: "DIFFERENCE",
      exclusion: "EXCLUSION",
      hue: "HUE",
      saturation: "SATURATION",
      color: "COLOR",
      luminosity: "LUMINOSITY",
    };
    return blendModeMap[cssBlendMode] || "NORMAL";
  }

  private collectDesignToken(varName: string, value: string): void {
    const tokens = this.assets.designTokens;

    // Detect color tokens
    if (
      value.startsWith("#") ||
      value.startsWith("rgb") ||
      value.startsWith("hsl") ||
      varName.includes("color") ||
      varName.includes("bg") ||
      varName.includes("background")
    ) {
      const existing = tokens.colors.get(varName);
      if (existing) {
        existing.count++;
      } else {
        tokens.colors.set(varName, { value, count: 1 });
      }
      return;
    }

    // Detect spacing tokens
    if (
      value.endsWith("px") ||
      value.endsWith("rem") ||
      value.endsWith("em") ||
      varName.includes("spacing") ||
      varName.includes("gap") ||
      varName.includes("padding") ||
      varName.includes("margin")
    ) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const existing = tokens.spacing.get(varName);
        if (existing) {
          existing.count++;
        } else {
          tokens.spacing.set(varName, { value: numValue, count: 1 });
        }
      }
      return;
    }

    // Detect typography tokens
    if (
      varName.includes("font") ||
      varName.includes("text") ||
      varName.includes("size") ||
      varName.includes("weight") ||
      varName.includes("line-height")
    ) {
      const existing = tokens.typography.get(varName);
      if (existing) {
        existing.count++;
      } else {
        tokens.typography.set(varName, { value, count: 1 });
      }
    }
  }
  hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return "img_" + Math.abs(hash).toString(16);
  }

  private inlineSvgUses(svg: SVGElement): string {
    const clone = svg.cloneNode(true) as SVGElement;
    const uses = clone.querySelectorAll("use");
    uses.forEach((useEl) => {
      const href =
        useEl.getAttribute("href") || useEl.getAttribute("xlink:href") || "";
      if (!href) return;

      const fragment = href.split("#")[1];
      if (!fragment) return;

      const symbol =
        document.getElementById(fragment) ||
        document.querySelector(`symbol#${fragment}`) ||
        document.querySelector(`#${fragment}`);
      if (!symbol) return;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const symbolClone = symbol.cloneNode(true) as SVGElement;
      while (symbolClone.firstChild) {
        g.appendChild(symbolClone.firstChild);
      }

      const x = useEl.getAttribute("x");
      const y = useEl.getAttribute("y");
      if (x) g.setAttribute("x", x);
      if (y) g.setAttribute("y", y);

      useEl.parentNode?.replaceChild(g, useEl);
    });

    return clone.outerHTML;
  }

  private extractMotion(computed: CSSStyleDeclaration) {
    const animationName = computed.animationName;
    const transitionProperty = computed.transitionProperty;

    if (
      (!animationName || animationName === "none") &&
      (!transitionProperty ||
        transitionProperty === "all" ||
        transitionProperty === "none")
    ) {
      return null;
    }

    const animation: any = {};
    if (animationName && animationName !== "none") {
      animation.name = animationName;
      animation.duration = computed.animationDuration;
      animation.timingFunction = computed.animationTimingFunction;
      animation.delay = computed.animationDelay;
      animation.iterationCount = computed.animationIterationCount;
      animation.direction = computed.animationDirection;
      animation.fillMode = computed.animationFillMode;
      animation.playState = computed.animationPlayState;
    }

    const transition: any = {};
    if (transitionProperty && transitionProperty !== "none") {
      transition.property = transitionProperty;
      transition.duration = computed.transitionDuration;
      transition.timingFunction = computed.transitionTimingFunction;
      transition.delay = computed.transitionDelay;
    }

    return {
      animation: Object.keys(animation).length ? animation : null,
      transition: Object.keys(transition).length ? transition : null,
    };
  }

  /**
   * Build DesignTokensRegistry for Figma Variables API
   */
  private buildDesignTokensRegistry(designTokens: {
    colors: Map<string, { value: string; count: number }>;
    spacing: Map<string, { value: number; count: number }>;
    typography: Map<string, { value: string; count: number }>;
  }): any {
    const variables: Record<string, any> = {};
    const collections: Record<string, any> = {};
    const aliases: Record<string, any> = {};

    // Create color collection
    const colorCollectionId = "colors";
    const colorVariables: string[] = [];

    let colorIndex = 0;
    for (const [name, data] of designTokens.colors.entries()) {
      if (colorIndex >= 20) break; // Limit to top 20 colors

      const tokenId = `color-${colorIndex}`;
      const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 30);

      variables[tokenId] = {
        id: tokenId,
        name: `Color/${cleanName}`,
        type: "COLOR",
        collection: colorCollectionId,
        scopes: ["ALL_FILLS", "STROKE_COLOR"],
        value: { type: "SOLID", value: this.parseColorToRgba(data.value) },
        description: `Used ${data.count} times`,
        references: [],
      };
      colorVariables.push(tokenId);
      colorIndex++;
    }

    // Create spacing collection
    const spacingCollectionId = "spacing";
    const spacingVariables: string[] = [];

    let spacingIndex = 0;
    for (const [name, data] of designTokens.spacing.entries()) {
      if (spacingIndex >= 10) break; // Limit to top 10 spacing values

      const tokenId = `spacing-${spacingIndex}`;

      variables[tokenId] = {
        id: tokenId,
        name: `Spacing/${data.value}px`,
        type: "FLOAT",
        collection: spacingCollectionId,
        scopes: ["GAP", "WIDTH_HEIGHT"],
        value: { type: "SOLID", value: data.value },
        description: `Used ${data.count} times`,
        references: [],
      };
      spacingVariables.push(tokenId);
      spacingIndex++;
    }

    // Create typography collection
    const typographyCollectionId = "typography";
    const typographyVariables: string[] = [];

    let typographyIndex = 0;
    for (const [name, data] of designTokens.typography.entries()) {
      if (typographyIndex >= 10) break;

      const tokenId = `typography-${typographyIndex}`;
      const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 30);

      variables[tokenId] = {
        id: tokenId,
        name: `Typography/${cleanName}`,
        type: "STRING",
        collection: typographyCollectionId,
        scopes: ["TEXT_CONTENT"],
        value: { type: "SOLID", value: data.value },
        description: `Used ${data.count} times`,
        references: [],
      };
      typographyVariables.push(tokenId);
      typographyIndex++;
    }

    // Build collections
    collections[colorCollectionId] = {
      id: colorCollectionId,
      name: "Colors",
      variables: colorVariables,
      description: "Extracted color tokens from page",
    };

    collections[spacingCollectionId] = {
      id: spacingCollectionId,
      name: "Spacing",
      variables: spacingVariables,
      description: "Extracted spacing tokens from page",
    };

    collections[typographyCollectionId] = {
      id: typographyCollectionId,
      name: "Typography",
      variables: typographyVariables,
      description: "Extracted typography tokens from page",
    };

    console.log(
      `🎨 Built designTokensRegistry: ${
        Object.keys(variables).length
      } variables in ${Object.keys(collections).length} collections`
    );

    return { variables, collections, aliases };
  }

  /**
   * Parse color string to RGBA object
   */
  private parseColorToRgba(color: string): {
    r: number;
    g: number;
    b: number;
    a: number;
  } {
    // Handle rgba
    const rgbaMatch = color.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]) / 255,
        g: parseInt(rgbaMatch[2]) / 255,
        b: parseInt(rgbaMatch[3]) / 255,
        a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
      };
    }

    // Handle hex
    const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
        a: 1,
      };
    }

    // Fallback
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  private extractTypography(
    computed: CSSStyleDeclaration,
    element: Element,
    node: any
  ) {
    const rawFontFamily = computed.fontFamily || "";
    // Extract full font-family stack for better font matching
    const fontFamilyStack = rawFontFamily
      .split(",")
      .map((f) => f.replace(/['"]/g, "").trim())
      .filter((f) => f.length > 0);
    const fontFamily = fontFamilyStack[0] || "Inter";
    const fontWeightRaw = computed.fontWeight || "400";
    const fontWeight = parseInt(fontWeightRaw, 10) || 400;
    const fontStyleValue = (computed.fontStyle || "").toLowerCase();
    const fontStyle =
      fontStyleValue.includes("italic") || fontStyleValue.includes("oblique")
        ? "Italic"
        : "Regular";
    const fontSize = parseFloat(computed.fontSize) || 16;

    const parseLineHeight = (value: string): number => {
      if (!value || value === "normal") return fontSize * 1.2;
      if (value.endsWith("%")) {
        const pct = parseFloat(value);
        if (!isNaN(pct)) return (pct / 100) * fontSize;
      }
      if (value.endsWith("em")) {
        const em = parseFloat(value);
        if (!isNaN(em)) return em * fontSize;
      }
      const px = parseFloat(value);
      return isNaN(px) ? fontSize * 1.2 : px;
    };

    const parseLetterSpacing = (value: string): number => {
      if (!value || value === "normal") return 0;
      if (value.endsWith("em")) {
        const em = parseFloat(value);
        if (!isNaN(em)) return em * fontSize;
      }
      const px = parseFloat(value);
      return isNaN(px) ? 0 : px;
    };

    node.fontName = {
      family: fontFamily,
      style: fontStyle,
    };
    node.fontSize = fontSize;
    node.lineHeight =
      !computed.lineHeight || computed.lineHeight === "normal"
        ? { unit: "AUTO" }
        : {
            value: parseLineHeight(computed.lineHeight),
            unit: "PIXELS",
          };
    node.letterSpacing = {
      value: parseLetterSpacing(computed.letterSpacing),
      unit: "PIXELS",
    };
    node.textAlignHorizontal =
      (computed.textAlign?.toUpperCase() as any) || "LEFT";
    node.textDecoration = computed.textDecorationLine || "none";
    node.textTransform = computed.textTransform || "none";

    // Text Overflow (ellipsis, clip, etc.)
    const textOverflow = computed.textOverflow;
    if (textOverflow && textOverflow !== "clip") {
      node.textOverflow = textOverflow;
    }

    // Hyphens
    const hyphens = computed.hyphens;
    if (hyphens && hyphens !== "manual") {
      node.hyphens = hyphens;
    }

    // Font Variant
    const fontVariant = computed.fontVariant;
    if (fontVariant && fontVariant !== "normal") {
      node.fontVariant = fontVariant;
    }

    // Font Stretch
    const fontStretch = computed.fontStretch;
    if (fontStretch && fontStretch !== "normal") {
      node.fontStretch = fontStretch;
    }

    // Font Feature Settings (OpenType features)
    const fontFeatureSettings = computed.fontFeatureSettings;
    if (fontFeatureSettings && fontFeatureSettings !== "normal") {
      node.fontFeatureSettings = fontFeatureSettings;
    }

    node.textStyle = {
      fontFamily,
      fontFamilyStack: fontFamilyStack.length > 1 ? fontFamilyStack : undefined, // Only store if multiple fonts
      fontWeight,
      fontStyle,
      fontSize,
      lineHeight: node.lineHeight,
      letterSpacing: node.letterSpacing,
      textAlignHorizontal: node.textAlignHorizontal,
      textAlignVertical: "TOP",
      textDecoration: node.textDecoration,
      textTransform: node.textTransform,
      whiteSpace: computed.whiteSpace,
      wordBreak: computed.wordBreak || computed.overflowWrap,
      textOverflow: node.textOverflow,
      hyphens: node.hyphens,
      fontVariant: node.fontVariant,
      fontStretch: node.fontStretch,
      fontFeatureSettings: node.fontFeatureSettings,
    };

    const textRect = element.getBoundingClientRect();
    node.renderedMetrics = {
      width: textRect.width,
      height: textRect.height,
      lineHeightPx:
        node.lineHeight?.unit === "PIXELS" ? node.lineHeight.value : undefined,
    };

    // Text Color
    const textColor = this.parseColor(computed.color);
    if (textColor) {
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
      // Fallback only for TEXT nodes with no fills
      if (node.type === "TEXT" && (!node.fills || node.fills.length === 0)) {
        if (!node.fills) {
          node.fills = [];
        }
        node.fills.push({
          type: "SOLID",
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
        });
        console.warn(
          `⚠️ Could not parse text color for TEXT node, using black fallback`
        );
      }
    }

    // Track font usage with weight
    if (!this.assets.fonts.has(fontFamily)) {
      this.assets.fonts.set(fontFamily, new Set());
    }
    this.assets.fonts.get(fontFamily)?.add(fontWeight);

    // Heuristic for Text Auto Resize
    // WIDTH_AND_HEIGHT = Auto Width (grows horizontally, no wrapping)
    // HEIGHT = Auto Height (wraps to width)
    // NONE = Fixed Size
    const isFixedWidth =
      computed.width &&
      computed.width !== "auto" &&
      !computed.width.includes("content") &&
      computed.display !== "inline"; // Inline elements (spans) usually auto-width
    const isNoWrap =
      computed.whiteSpace === "nowrap" || computed.whiteSpace === "pre";

    if (isFixedWidth) {
      node.textAutoResize = "HEIGHT"; // Default to Auto-Height for fixed-width containers so text wraps
    } else if (isNoWrap) {
      node.textAutoResize = "WIDTH_AND_HEIGHT";
    } else {
      node.textAutoResize = "HEIGHT"; // Default to Auto Height
    }
  }
}
