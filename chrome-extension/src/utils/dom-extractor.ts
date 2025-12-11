import { ElementNode, WebToFigmaSchema } from "../types/schema";

export class DOMExtractor {
  private nodeId = 0;
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
    fonts: new Set<string>(),
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
        fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
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
              asset.error = e instanceof Error ? e.message : String(e);
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

    schema.metadata.fonts = Array.from(this.assets.fonts).map((font) => ({
      family: font,
      weights: [400],
      source: "system",
    }));

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

    return schema;
  }

  private extractNode(
    element: Element,
    parentId: string | null,
    depth: number = 0
  ): ElementNode | null {
    const MAX_DEPTH = 200;
    if (depth > MAX_DEPTH) {
      console.warn("⚠️ Max depth reached, skipping children");
      return null;
    }

    if (this.nodeId % 100 === 0 && this.nodeId > 0) {
      console.log(`📊 Extracted ${this.nodeId} nodes...`);
    }

    const nodeId = `node_${this.nodeId++}`;
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    if (
      computed.display === "none" ||
      computed.visibility === "hidden" ||
      (rect.width === 0 && rect.height === 0 && element.tagName !== "BODY")
    ) {
      return null;
    }

    const textContent = this.extractTextContent(element);
    const hasChildElements = element.children.length > 0;
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
    const isText = !!textContent && !hasChildElements && !isSpecialElement;

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
        x: rect.left + scrollLeft,
        y: rect.top + scrollTop,
        width: rect.width,
        height: rect.height,
        relativeX: rect.left,
        relativeY: rect.top,
      },
      fills: [],
      strokes: [],
      effects: [],
      attributes: this.extractAttributes(element),
      children: [],
    };

    if (isText && textContent) {
      node.characters = textContent;
    }

    this.extractStyles(computed, element, node);
    this.extractSpecialProperties(element, node);

    const motion = this.extractMotion(computed);
    if (motion) {
      node.motion = motion;
    }

    Array.from(element.children).forEach((child) => {
      const childNode = this.extractNode(child, nodeId, depth + 1);
      if (childNode) {
        node.children.push(childNode);
      }
    });

    const shadowRoot = (element as any).shadowRoot;
    if (shadowRoot && shadowRoot.children) {
      Array.from(shadowRoot.children as any as Element[]).forEach(
        (child: Element) => {
          const childNode = this.extractNode(child, nodeId, depth + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      );
    }

    return node as ElementNode;
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
      else node.counterAxisAlignItems = "MIN";

      // Wrapping
      if (
        computed.flexWrap === "wrap" ||
        computed.flexWrap === "wrap-reverse"
      ) {
        node.layoutWrap = "WRAP";
      }
    } else if (
      computed.display === "grid" ||
      computed.display === "inline-grid"
    ) {
      // Grid Layout Support
      node.layoutMode = "GRID";
      node.gridTemplateColumns = computed.gridTemplateColumns;
      node.gridTemplateRows = computed.gridTemplateRows;
      node.gridGap = computed.gap || computed.gridGap;
      node.gridAutoFlow = computed.gridAutoFlow;
    }

    // Position Metadata (for sticky, fixed, absolute)
    const position = computed.position;
    if (position !== "static") {
      node.positioning = {
        type: position,
        top: computed.top !== "auto" ? parseFloat(computed.top) : null,
        right: computed.right !== "auto" ? parseFloat(computed.right) : null,
        bottom: computed.bottom !== "auto" ? parseFloat(computed.bottom) : null,
        left: computed.left !== "auto" ? parseFloat(computed.left) : null,
      };
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

    // Background Color
    const bgColor = computed.backgroundColor;
    if (bgColor) {
      const color = this.parseColor(bgColor);
      if (color) {
        const isDocumentRoot =
          element.tagName.toLowerCase() === "body" ||
          element.tagName.toLowerCase() === "html";

        const shouldApplyFill = color.a !== 0 || isDocumentRoot;
        if (isDocumentRoot && color.a === 0) {
          color.a = 1;
        }

        if (shouldApplyFill) {
          node.fills.push({
            type: "SOLID",
            color: { r: color.r, g: color.g, b: color.b, a: color.a },
            opacity: color.a ?? 1,
            visible: true,
          });
          this.assets.colors.add(bgColor);
        }
      }
    }

    // CSS Gradients
    if (
      computed.backgroundImage &&
      computed.backgroundImage.includes("gradient")
    ) {
      const gradient = this.parseGradient(computed.backgroundImage);
      if (gradient) {
        console.log(
          `🌈 Extracted gradient for ${element.tagName}:`,
          gradient.type
        );
        node.fills.push(gradient);
      }
    }

    // Background Images
    if (
      computed.backgroundImage &&
      computed.backgroundImage !== "none" &&
      !computed.backgroundImage.includes("gradient")
    ) {
      const bgImages = computed.backgroundImage.split(",").map((s) => s.trim());
      const bgSizes = (computed.backgroundSize || "auto")
        .split(",")
        .map((s) => s.trim());
      const bgPosX = (computed.backgroundPositionX || "0%")
        .split(",")
        .map((s) => s.trim());
      const bgPosY = (computed.backgroundPositionY || "0%")
        .split(",")
        .map((s) => s.trim());
      const bgRepeat = (computed.backgroundRepeat || "repeat")
        .split(",")
        .map((s) => s.trim());

      const firstBg = bgImages[0];
      const urlMatch = firstBg.match(/url\(['"]?(.*?)['"]?\)/);
      if (urlMatch) {
        const url = urlMatch[1];
        this.captureImage(url);
        const key = this.hashString(url);

        const rawSize = bgSizes[0] || "auto";
        const rawPosX = bgPosX[0] || "0%";
        const rawPosY = bgPosY[0] || "0%";
        const rawRepeat = bgRepeat[0] || "repeat";

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

        node.fills.push({
          type: "IMAGE",
          imageHash: key,
          scaleMode: "FILL",
          visible: true,
        });

        node.backgrounds = node.backgrounds || [];
        node.backgrounds.push({
          type: "image",
          fill: {
            type: "IMAGE",
            imageHash: key,
            scaleMode: "FILL",
            visible: true,
          },
          size,
          position,
          repeat: rawRepeat,
        });
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
      const rawFontFamily = computed.fontFamily || "";
      const fontFamily =
        rawFontFamily.split(",")[0].replace(/['"]/g, "").trim() || "Inter";
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
      node.lineHeight = {
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
      node.textStyle = {
        fontFamily,
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
      };

      const textRect = element.getBoundingClientRect();
      node.renderedMetrics = {
        width: textRect.width,
        height: textRect.height,
        lineHeightPx:
          node.lineHeight?.unit === "PIXELS"
            ? node.lineHeight.value
            : undefined,
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

      this.assets.fonts.add(computed.fontFamily);
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
        node.type = "RECTANGLE";
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
          node.imageHash = key;
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
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL("image/png");
            if (frameData) {
              this.captureImage(frameData);
              const key = this.hashString(frameData);
              node.embed.framePreviewHash = key;
            }
          }
        } catch (e) {
          console.warn("Video frame capture failed (likely CORS)", e);
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
          node.children.push({
            id: node.id + "-placeholder",
            type: "TEXT",
            name: input.placeholder,
            characters: input.placeholder,
            fills: [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6, a: 1 } }],
          });
        }
        break;
    }
  }

  private async captureImage(url: string) {
    try {
      const absoluteUrl = new URL(url, window.location.href).href;

      if (!this.assets.images.has(url)) {
        this.assets.images.set(url, {
          originalUrl: url,
          absoluteUrl,
          url: absoluteUrl,
          base64: null,
          mimeType: this.getMimeType(url),
          width: 0,
          height: 0,
          data: null,
          svgCode: undefined as string | undefined,
          error: undefined as string | undefined,
        } as any);
        console.log(`📸 Captured image URL: ${url.substring(0, 80)}...`);
      }
    } catch (error) {
      console.warn("Failed to process image URL:", url, error);
    }
  }

  private async urlToBase64(
    url: string,
    timeout = 5000
  ): Promise<{
    base64: string;
    width: number;
    height: number;
    svgCode?: string;
  }> {
    const isSvg =
      url.toLowerCase().includes(".svg") ||
      this.getMimeType(url) === "image/svg+xml";
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
        console.warn(`SVG fetch failed (${resp.status}) for ${url}`);
      } catch (error) {
        if ((error as any).name === "AbortError") {
          console.warn(`⏱️ SVG fetch timeout (${timeout}ms) for ${url}`);
        } else {
          console.warn(
            `SVG fetch error for ${url} (will try fallback in Figma)`,
            error
          );
        }
        return { base64: "", width: 0, height: 0 };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";

      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ Image timeout: ${url}`);
        resolve({ base64: "", width: 0, height: 0 });
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.warn("Failed to get canvas context for", url);
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
          console.warn("Canvas toDataURL failed for", url, error);
          resolve({ base64: "", width: 0, height: 0 });
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        console.warn("Failed to load image", url);
        resolve({ base64: "", width: 0, height: 0 });
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
    if (!color || color === "transparent") return null;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = color;
    const computed = ctx.fillStyle;
    const match = computed.match(
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

  private async collectFontFaces(timeout = 4000): Promise<void> {
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const cssRules = sheet.cssRules || [];
        for (const rule of Array.from(cssRules)) {
          if (rule instanceof CSSFontFaceRule) {
            rules.push(rule);
          }
        }
      } catch {
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
      this.assets.fonts.add(family);
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
}
