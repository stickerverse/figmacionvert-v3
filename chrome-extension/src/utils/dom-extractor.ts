import { ElementNode, WebToFigmaSchema } from "../types/schema";

export class DOMExtractor {
  private nodeId = 0;
  private assets = {
    images: new Map<
      string,
      {
        originalUrl: string;
        absoluteUrl: string;
        base64: string | null;
        mimeType: string;
        error?: string;
      }
    >(),
    fonts: new Set<string>(),
    colors: new Set<string>(),
  };

  constructor() {}

  async extractPageToSchema(): Promise<WebToFigmaSchema> {
    console.log("🎯 [EXTRACTION START] Starting DOM extraction...");
    console.log("📍 Location:", window.location.href);
    console.log("📏 Body children:", document.body.children.length);

    // Send initial progress
    window.postMessage(
      {
        type: "EXTRACTION_PROGRESS",
        message: "Initializing DOM traversal...",
        percent: 30,
      },
      "*"
    );

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
      },
      tree: null as any, // Will be set below
      assets: {
        images: {},
        svgs: {},
      },
      styles: {
        colors: {},
        textStyles: {},
        effects: {},
      },
    };

    console.log("✓ Checkpoint 1: Extracting root node");
    window.postMessage(
      {
        type: "EXTRACTION_PROGRESS",
        message: "Traversing DOM tree...",
        percent: 40,
      },
      "*"
    );

    // Extract from body
    const rootNode = this.extractNode(document.body, null);
    if (rootNode) {
      schema.tree = rootNode;
    } else {
      // Fallback if body is somehow skipped (shouldn't happen)
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
        fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
        children: [],
      };
    }

    console.log("✓ Checkpoint 2: Processing assets");
    window.postMessage(
      {
        type: "EXTRACTION_PROGRESS",
        message: "Processing images...",
        percent: 60,
      },
      "*"
    );

    // Process images to get Base64 data
    // We do this in batches to avoid freezing the browser
    const imageUrls = Array.from(this.assets.images.keys());
    const BATCH_SIZE = 5;

    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          const asset = this.assets.images.get(url);
          if (asset && !asset.base64 && !asset.error) {
            try {
              const base64 = await this.urlToBase64(asset.absoluteUrl);
              if (base64) {
                asset.base64 = base64;
              } else {
                asset.error = "Failed to convert to base64";
              }
            } catch (e) {
              asset.error = e instanceof Error ? e.message : String(e);
            }
          }
        })
      );

      // Report progress
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

    // Collect all assets into schema
    const imagesObj: Record<string, any> = {};
    this.assets.images.forEach((data, url) => {
      const key = this.hashString(url);
      imagesObj[key] = {
        url,
        ...data,
      };
    });
    schema.assets.images = imagesObj;
    schema.metadata.fonts = Array.from(this.assets.fonts).map((font) => ({
      family: font,
      weights: [400], // Default weight
      source: "system",
    }));

    console.log("✅ Extraction complete!", {
      totalNodes: this.nodeId,
      images: this.assets.images.size,
      fonts: this.assets.fonts.size,
    });

    return schema;
  }

  private extractNode(
    element: Element,
    parentId: string | null,
    depth: number = 0
  ): ElementNode | null {
    // Add depth limit to prevent infinite recursion
    const MAX_DEPTH = 50;
    if (depth > MAX_DEPTH) {
      console.warn("⚠️ Max depth reached, skipping children");
      return null;
    }

    // Log progress every 100 nodes
    if (this.nodeId % 100 === 0 && this.nodeId > 0) {
      console.log(`📊 Extracted ${this.nodeId} nodes...`);
    }

    const nodeId = `node_${this.nodeId++}`;
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    // Skip invisible elements
    if (
      computed.display === "none" ||
      computed.visibility === "hidden" ||
      (rect.width === 0 && rect.height === 0 && element.tagName !== "BODY") // Keep body even if 0 size reported
    ) {
      return null;
    }

    // Determine if this is a text node BEFORE creating the node object
    const textContent = this.extractTextContent(element);
    const isText = !!textContent;

    const node: any = {
      id: nodeId,
      parentId: parentId,
      type: isText ? "TEXT" : "FRAME", // Set type correctly from start
      name: isText
        ? textContent?.substring(0, 20) || "Text"
        : element.tagName.toLowerCase(),
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList),

      // Absolute position on page
      layout: {
        x: rect.left + scrollLeft,
        y: rect.top + scrollTop,
        width: rect.width,
        height: rect.height,
        // Also store relative position for nested elements if needed
        relativeX: rect.left,
        relativeY: rect.top,
      },

      // Styles
      fills: [],
      strokes: [],
      effects: [],

      // Attributes
      attributes: this.extractAttributes(element),

      // Children
      children: [],
    };

    if (isText && textContent) {
      node.characters = textContent;
    }

    // Extract styles (now knows correct node type)
    this.extractStyles(computed, element, node);

    // Special handling for different element types
    this.extractSpecialProperties(element, node);

    // Recursively extract children
    Array.from(element.children).forEach((child) => {
      const childNode = this.extractNode(child, nodeId, depth + 1);
      if (childNode) {
        node.children.push(childNode);
      }
    });

    return node as ElementNode;
  }

  private extractStyles(
    computed: CSSStyleDeclaration,
    element: Element,
    node: any
  ) {
    // --- Auto Layout (Flexbox) ---
    if (computed.display === "flex" || computed.display === "inline-flex") {
      node.layoutMode =
        computed.flexDirection === "row" ||
        computed.flexDirection === "row-reverse"
          ? "HORIZONTAL"
          : "VERTICAL";

      // Gap
      const gap = parseFloat(computed.gap);
      if (!isNaN(gap)) {
        node.itemSpacing = gap;
      }

      // Padding
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

      // Alignment
      const justifyContent = computed.justifyContent;
      const alignItems = computed.alignItems;

      // Map justify-content to primaryAxisAlignItems
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

      // Map align-items to counterAxisAlignItems
      if (alignItems.includes("center")) node.counterAxisAlignItems = "CENTER";
      else if (alignItems.includes("flex-end") || alignItems.includes("bottom"))
        node.counterAxisAlignItems = "MAX";
      else node.counterAxisAlignItems = "MIN";

      // Sizing modes (simplified inference)
      // If width is fixed in pixels, FIXED. If auto/fit-content, AUTO.
      // This is hard to know exactly from computed style, but we can guess.
      // For now, default to FIXED for stability, unless we can detect otherwise.
    }

    // Background color -> Fills
    if (
      computed.backgroundColor &&
      computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
      computed.backgroundColor !== "transparent"
    ) {
      const color = this.parseColor(computed.backgroundColor);
      if (color) {
        node.fills.push({
          type: "SOLID",
          color: { r: color.r, g: color.g, b: color.b, a: color.a },
          opacity: color.a,
          visible: true,
        });
        this.assets.colors.add(computed.backgroundColor);
      }
    }

    // Background Image -> Fills
    if (computed.backgroundImage && computed.backgroundImage !== "none") {
      const urlMatch = computed.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (urlMatch) {
        const url = urlMatch[1];
        this.captureImage(url);
        const key = this.hashString(url);
        node.fills.push({
          type: "IMAGE",
          imageHash: key,
          scaleMode: "FILL", // Default
          visible: true,
        });
      }
    }

    // Borders -> Strokes
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

    // Typography
    if (node.type === "TEXT") {
      node.fontName = {
        family: computed.fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
        style: computed.fontWeight || "Regular",
      };
      node.fontSize = parseFloat(computed.fontSize);
      node.lineHeight = {
        value: parseFloat(computed.lineHeight) || node.fontSize * 1.2,
        unit: "PIXELS",
      };
      node.textAlignHorizontal = computed.textAlign.toUpperCase();

      // Letter spacing
      if (computed.letterSpacing && computed.letterSpacing !== "normal") {
        const spacing = parseFloat(computed.letterSpacing);
        if (!isNaN(spacing)) {
          node.letterSpacing = { value: spacing, unit: "PIXELS" };
        }
      }

      // Text color
      if (computed.color) {
        const color = this.parseColor(computed.color);
        if (color) {
          node.fills = [
            {
              // Text usually has one fill
              type: "SOLID",
              color: { r: color.r, g: color.g, b: color.b, a: color.a },
              opacity: color.a,
              visible: true,
            },
          ];
          this.assets.colors.add(computed.color);
        }
      }

      this.assets.fonts.add(computed.fontFamily);
    }

    // Effects (Shadows)
    if (computed.boxShadow && computed.boxShadow !== "none") {
      // Very basic shadow parsing (improving this would be good)
      node.effects.push({
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: 0, y: 4 },
        radius: 4,
        visible: true,
      });
    }

    // Opacity
    if (computed.opacity && computed.opacity !== "1") {
      node.opacity = parseFloat(computed.opacity);
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
    // Only extract direct text nodes, not nested elements
    const textNodes = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim())
      .filter((text) => text && text.length > 0);

    return textNodes.length > 0 ? textNodes.join(" ") : null;
  }

  private extractSpecialProperties(element: Element, node: any) {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case "img":
        const img = element as HTMLImageElement;
        node.type = "RECTANGLE"; // Images are rectangles with image fills in Figma
        node.name = "Image";
        if (img.src) {
          this.captureImage(img.src);
          const key = this.hashString(img.src);
          node.fills = [
            {
              type: "IMAGE",
              imageHash: key,
              scaleMode: "FIT",
              visible: true,
            },
          ];
          node.imageHash = key; // Direct property for some implementations
        }
        break;

      case "svg":
        node.type = "VECTOR"; // Or handle as SVG code
        node.name = "SVG";
        // For now, maybe capture outerHTML as svgContent
        node.svgContent = element.outerHTML;
        break;

      case "input":
        const input = element as HTMLInputElement;
        node.name = "Input";
        // Capture value/placeholder
        if (input.placeholder) {
          node.children.push({
            id: node.id + "-placeholder",
            type: "TEXT",
            name: input.placeholder,
            characters: input.placeholder,
            fills: [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6, a: 1 } }],
            // ... positioning would be complex
          });
        }
        break;
    }
  }

  private captureImage(url: string) {
    if (this.assets.images.has(url)) return;

    try {
      // Convert to absolute URL
      const absoluteUrl = new URL(url, window.location.href).href;

      // Just store URLs for now, skip base64 conversion (too slow)
      this.assets.images.set(url, {
        originalUrl: url,
        absoluteUrl: absoluteUrl,
        base64: null,
        mimeType: this.getMimeType(url),
      });
    } catch (error) {
      // Silently fail for invalid URLs
      this.assets.images.set(url, {
        originalUrl: url,
        absoluteUrl: url,
        base64: null,
        mimeType: "application/octet-stream",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async urlToBase64(url: string, timeout = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";

      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ Image timeout: ${url}`);
        // Resolve with empty string or null to avoid blocking
        resolve("");
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Don't reject, just resolve empty to keep going
          console.warn("Failed to get canvas context for", url);
          resolve("");
          return;
        }
        ctx.drawImage(img, 0, 0);

        try {
          const base64 = canvas.toDataURL(this.getMimeType(url));
          // Remove data:image/xxx;base64, prefix
          const data = base64.split(",")[1];
          resolve(data);
        } catch (error) {
          console.warn("Canvas toDataURL failed for", url, error);
          resolve("");
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        console.warn("Failed to load image", url);
        resolve("");
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

  private async waitForImages() {
    const images = Array.from(document.images);
    const promises = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Resolve anyway
        setTimeout(resolve, 5000); // Timeout after 5s
      });
    });
    await Promise.all(promises);
  }

  private parseColor(
    colorStr: string
  ): { r: number; g: number; b: number; a: number } | null {
    // Basic parsing for rgb/rgba
    const match = colorStr.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255,
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
    return null;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return "img_" + Math.abs(hash).toString(16);
  }
}
