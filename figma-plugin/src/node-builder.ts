import { StyleManager } from "./style-manager";
import { ComponentManager } from "./component-manager";
import { ImportOptions } from "./importer";
import { DesignTokensManager } from "./design-tokens-manager";
import { requestWebpTranscode } from "./ui-bridge";

type SceneNodeWithGeometry = SceneNode & GeometryMixin;

export class NodeBuilder {
  private imageFetchCache = new Map<string, Uint8Array>();
  private imagePaintCache = new Map<string, string>();
  private assets: any;
  private fontCache = new Map<string, { family: string; style: string }>();

  constructor(
    private styleManager: StyleManager,
    private componentManager: ComponentManager,
    private options: ImportOptions,
    assets?: any,
    private designTokensManager?: DesignTokensManager
  ) {
    this.assets = assets;
  }

  setAssets(assets: any): void {
    this.assets = assets;
  }

  preloadImageHash(hash: string, figmaImageHash: string): void {
    this.imagePaintCache.set(hash, figmaImageHash);
  }

  /**
   * Find a matching design token for a color value
   */
  private findColorToken(color: {
    r: number;
    g: number;
    b: number;
    a?: number;
  }): string | undefined {
    if (!this.designTokensManager) return undefined;

    const tolerance = 0.01;

    for (const [tokenId, token] of Object.entries(
      (this.designTokensManager as any).tokensRegistry.variables
    )) {
      const typedToken = token as any;
      if (typedToken.type === "COLOR" && typedToken.resolvedValue) {
        const tokenColor = typedToken.resolvedValue;
        if (
          Math.abs(tokenColor.r - color.r) < tolerance &&
          Math.abs(tokenColor.g - color.g) < tolerance &&
          Math.abs(tokenColor.b - color.b) < tolerance
        ) {
          return tokenId;
        }
      }
    }

    return undefined;
  }

  private async loadFontWithFallbacks(
    requestedFamily: string,
    requestedStyle: string
  ): Promise<{ family: string; style: string } | null> {
    const cacheKey = `${requestedFamily}:${requestedStyle}`;
    if (this.fontCache.has(cacheKey)) {
      return this.fontCache.get(cacheKey)!;
    }

    const cleanFamily = requestedFamily.replace(/['"]/g, "").trim();

    const fontFallbacks = new Map<string, string[]>([
      ["Times", ["Times New Roman", "Times", "serif"]],
      ["Times New Roman", ["Times New Roman", "Times", "serif"]],
      ["Georgia", ["Georgia", "Times New Roman", "serif"]],

      ["Arial", ["Arial", "Helvetica", "sans-serif"]],
      ["Helvetica", ["Helvetica", "Arial", "sans-serif"]],
      [
        "Helvetica Neue",
        ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      ],
      ["Roboto", ["Roboto", "Arial", "sans-serif"]],
      ["Open Sans", ["Open Sans", "Arial", "sans-serif"]],
      ["Lato", ["Lato", "Arial", "sans-serif"]],
      ["Montserrat", ["Montserrat", "Arial", "sans-serif"]],
      ["Source Sans Pro", ["Source Sans Pro", "Arial", "sans-serif"]],

      ["Monaco", ["Monaco", "Menlo", "monospace"]],
      ["Menlo", ["Menlo", "Monaco", "monospace"]],
      ["Courier", ["Courier", "Courier New", "monospace"]],
      ["Courier New", ["Courier New", "Courier", "monospace"]],
      ["SF Mono", ["SF Mono", "Monaco", "Menlo", "monospace"]],

      ["-apple-system", ["Inter", "Arial", "sans-serif"]],
      ["system-ui", ["Inter", "Arial", "sans-serif"]],
      ["BlinkMacSystemFont", ["Inter", "Arial", "sans-serif"]],

      ["sohne-var", ["Inter", "Helvetica Neue", "Arial", "sans-serif"]],
      ["Sohne", ["Inter", "Helvetica Neue", "Arial", "sans-serif"]],
      ["Stripe Sans", ["Inter", "Helvetica Neue", "Arial", "sans-serif"]],
    ]);

    const fallbackChain = fontFallbacks.get(cleanFamily) || [
      cleanFamily,
      "Arial",
      "Inter",
    ];

    for (const fontFamily of fallbackChain) {
      const stylesToTry = Array.from(
        new Set([
          requestedStyle,
          "Regular",
          "Normal",
          "Medium",
          "Bold",
          "Light",
        ])
      );

      for (const style of stylesToTry) {
        try {
          await figma.loadFontAsync({ family: fontFamily, style });
          const result = { family: fontFamily, style };
          this.fontCache.set(cacheKey, result);
          console.log(
            `✅ Loaded font: ${fontFamily} ${style} (requested: ${cleanFamily} ${requestedStyle})`
          );
          return result;
        } catch {
          console.log(`⚠️ Failed to load: ${fontFamily} ${style}`);
        }
      }
    }

    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      const result = { family: "Inter", style: "Regular" };
      this.fontCache.set(cacheKey, result);
      console.warn(
        `❌ Using last resort font Inter Regular for: ${cleanFamily} ${requestedStyle}`
      );
      return result;
    } catch (error) {
      console.error(
        `❌ Critical: Cannot load Inter Regular. Trying system fallback.`,
        error
      );
      const systemFonts = [
        { family: "Arial", style: "Regular" },
        { family: "Helvetica", style: "Regular" },
        { family: "San Francisco", style: "Regular" },
        { family: "Roboto", style: "Regular" },
      ];

      for (const font of systemFonts) {
        try {
          await figma.loadFontAsync(font);
          console.warn(`✅ Using system fallback font: ${font.family}`);
          return font;
        } catch {
          continue;
        }
      }

      console.error(
        `❌ Critical: No fonts available - will create rectangle placeholders`
      );
      return null;
    }
  }

  async createNode(nodeData: any): Promise<SceneNode | null> {
    if (!nodeData) return null;

    if (nodeData.embed?.type) {
      const embedNode = await this.createEmbedPlaceholder(nodeData);
      await this.afterCreate(embedNode, nodeData, { reuseComponent: false });
      return embedNode;
    }

    if (nodeData.componentSignature) {
      const registered = this.componentManager.getComponentBySignature(
        nodeData.componentSignature
      );
      if (registered && nodeData.type !== "COMPONENT") {
        const instance = registered.createInstance();
        await this.afterCreate(instance, nodeData, { reuseComponent: true });
        return instance;
      }
    }

    let node: SceneNode | null = null;

    switch (nodeData.type) {
      case "TEXT":
        node = await this.createText(nodeData);
        break;
      case "IMAGE":
        node = await this.createImage(nodeData);
        break;
      case "VECTOR":
        node = await this.createVector(nodeData);
        break;
      case "RECTANGLE":
        node = await this.createRectangle(nodeData);
        break;
      case "COMPONENT":
        node = await this.createComponent(nodeData);
        break;
      case "INSTANCE":
        node = await this.createInstance(nodeData);
        break;
      case "FRAME":
      default:
        node = await this.createFrame(nodeData);
        break;
    }

    if (!node) {
      return null;
    }

    await this.afterCreate(node, nodeData, { reuseComponent: false });

    if (nodeData.type === "COMPONENT") {
      const component = node as ComponentNode;
      const componentId = nodeData.componentId || nodeData.id || component.id;
      this.componentManager.registerComponent(componentId, component);
      if (nodeData.componentSignature) {
        this.componentManager.registerSignature(
          nodeData.componentSignature,
          component
        );
      }
    } else if (nodeData.componentSignature) {
      this.safeSetPluginData(
        node,
        "componentSignature",
        nodeData.componentSignature
      );
    }

    return node;
  }

  private async createFrame(data: any): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = data.name || "Frame";
    frame.resize(
      Math.max(data.layout.width || 1, 1),
      Math.max(data.layout.height || 1, 1)
    );
    return frame;
  }

  private async createRectangle(data: any): Promise<RectangleNode> {
    const rect = figma.createRectangle();
    rect.name = data.name || "Rectangle";
    rect.resize(
      Math.max(data.layout.width || 1, 1),
      Math.max(data.layout.height || 1, 1)
    );
    rect.strokes = [];
    rect.effects = [];
    return rect;
  }

  private async createEmbedPlaceholder(data: any): Promise<FrameNode> {
    if (!data.autoLayout) {
      data.autoLayout = {
        layoutMode: "VERTICAL",
        primaryAxisAlignItems: "CENTER",
        counterAxisAlignItems: "CENTER",
        itemSpacing: 6,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 12,
        paddingRight: 12,
      };
    }

    const frame = figma.createFrame();
    frame.name = `${data.name || "Embed"} (${data.embed?.type || "embed"})`;
    frame.resize(
      Math.max(data.layout?.width || 160, 40),
      Math.max(data.layout?.height || 90, 40)
    );
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.itemSpacing = 6;
    frame.paddingTop = 12;
    frame.paddingBottom = 12;
    frame.paddingLeft = 12;
    frame.paddingRight = 12;
    frame.strokes = [
      { type: "SOLID", color: { r: 0.36, g: 0.43, b: 0.64 }, opacity: 0.4 },
    ];
    frame.fills = [
      {
        type: "SOLID",
        color: { r: 0.93, g: 0.95, b: 0.99 },
        opacity: 1,
      },
    ];
    frame.cornerRadius = 10;

    try {
      await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    } catch (e) {
      console.warn("Font load failed for embed placeholder", e);
    }

    const title = figma.createText();
    title.characters = (data.embed?.type || "Embed").toUpperCase();
    title.fontSize = 12;
    title.fontName = { family: "Inter", style: "Semi Bold" };
    title.fills = [
      { type: "SOLID", color: { r: 0.24, g: 0.29, b: 0.46 }, opacity: 1 },
    ];

    const subtitle = figma.createText();
    const srcLabel = data.embed?.src
      ? data.embed.src.slice(0, 60)
      : "External content";
    subtitle.characters = srcLabel;
    subtitle.fontSize = 11;
    subtitle.fontName = { family: "Inter", style: "Regular" };
    subtitle.fills = [
      { type: "SOLID", color: { r: 0.35, g: 0.41, b: 0.55 }, opacity: 1 },
    ];

    frame.appendChild(title);
    frame.appendChild(subtitle);

    this.safeSetPluginData(
      frame,
      "embed",
      JSON.stringify({
        ...data.embed,
        htmlTag: data.htmlTag,
        id: data.id,
        sourceUrl: data.embed?.src,
      })
    );

    return frame;
  }

  private async createText(data: any): Promise<TextNode> {
    const text = figma.createText();
    text.name = data.name || "Text";

    const characters = data.characters || data.textContent || "";

    if (data.textStyle) {
      const fontStyle = this.mapFontWeight(data.textStyle.fontWeight);
      const isItalic = (data.textStyle.fontStyle || "")
        .toLowerCase()
        .includes("italic");
      let fontFamily = data.textStyle.fontFamily;
      let finalFontStyle = isItalic ? "Italic" : fontStyle;

      const originalFontFamily = fontFamily;
      const fontLoadResult = await this.loadFontWithFallbacks(
        fontFamily,
        finalFontStyle
      );

      if (!fontLoadResult) {
        console.error(
          `❌ Font loading failed completely for ${originalFontFamily}. Creating rectangle placeholder.`
        );
        const placeholder = figma.createRectangle();
        placeholder.name = `${data.name || "Text"} (font failed)`;
        placeholder.resize(
          Math.max(data.layout.width || 100, 1),
          Math.max(data.layout.height || 20, 1)
        );
        placeholder.fills = [
          { type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } },
        ];
        placeholder.strokes = [
          { type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7 } },
        ];
        placeholder.strokeWeight = 1;
        return placeholder as any;
      }

      fontFamily = fontLoadResult.family;
      finalFontStyle = fontLoadResult.style;

      let fontMetricsRatio = 1.0;
      if (fontFamily !== originalFontFamily) {
        fontMetricsRatio = this.getFontMetricsRatio(
          fontFamily,
          originalFontFamily
        );
        console.log(
          `📝 Font fallback: ${originalFontFamily} → ${fontFamily} (ratio: ${fontMetricsRatio.toFixed(
            3
          )})`
        );
      }

      text.fontName = { family: fontFamily, style: finalFontStyle };

      const adjustedFontSize = data.textStyle.fontSize * fontMetricsRatio;
      text.fontSize = adjustedFontSize;
      text.textAlignHorizontal = data.textStyle.textAlignHorizontal;
      text.textAlignVertical = data.textStyle.textAlignVertical;

      if (data.renderedMetrics?.lineHeightPx) {
        text.lineHeight = {
          unit: "PIXELS",
          value: data.renderedMetrics.lineHeightPx,
        };
      } else if (data.textStyle.lineHeight?.unit === "PIXELS") {
        text.lineHeight = {
          unit: "PIXELS",
          value: data.textStyle.lineHeight.value,
        };
      } else if (data.textStyle.lineHeight?.unit === "PERCENT") {
        text.lineHeight = {
          unit: "PERCENT",
          value: data.textStyle.lineHeight.value,
        };
      } else {
        text.lineHeight = { unit: "AUTO" };
      }

      if (data.textStyle.letterSpacing?.unit === "PIXELS") {
        text.letterSpacing = {
          unit: "PIXELS",
          value: data.textStyle.letterSpacing.value,
        };
      } else {
        text.letterSpacing = {
          unit: data.textStyle.letterSpacing?.unit || "PIXELS",
          value: data.textStyle.letterSpacing?.value || 0,
        };
      }

      if (data.textStyle?.fills?.length) {
        text.fills = await this.convertFillsAsync(data.textStyle.fills);
      }

      if (data.textStyle.textDecoration) {
        const deco = (data.textStyle.textDecoration || "").toLowerCase();
        if (deco.includes("line-through")) {
          text.textDecoration = "STRIKETHROUGH";
        } else if (deco.includes("underline")) {
          text.textDecoration = "UNDERLINE";
        } else {
          text.textDecoration = "NONE";
        }
      }

      if (data.textStyle.textTransform) {
        const tf = (data.textStyle.textTransform || "").toLowerCase();
        if (tf === "uppercase") text.textCase = "UPPER";
        else if (tf === "lowercase") text.textCase = "LOWER";
        else if (tf === "capitalize") text.textCase = "TITLE";
        else text.textCase = "ORIGINAL";
      } else if (data.textStyle.textCase) {
        text.textCase = data.textStyle.textCase;
      }

      if (data.textStyle.fontStyle) {
        this.safeSetPluginData(text, "fontStyle", data.textStyle.fontStyle);
      }
      if (data.textStyle.paragraphSpacing !== undefined) {
        this.safeSetPluginData(
          text,
          "paragraphSpacing",
          String(data.textStyle.paragraphSpacing)
        );
      }
      if (data.textStyle.paragraphIndent !== undefined) {
        this.safeSetPluginData(
          text,
          "paragraphIndent",
          String(data.textStyle.paragraphIndent)
        );
      }
      if (data.textStyle.whiteSpace) {
        this.safeSetPluginData(text, "whiteSpace", data.textStyle.whiteSpace);
        if (data.textStyle.whiteSpace === "nowrap") {
          text.textAutoResize = "WIDTH_AND_HEIGHT";
        } else if (
          data.textStyle.whiteSpace === "pre" ||
          data.textStyle.whiteSpace === "pre-wrap"
        ) {
          text.textAutoResize = "HEIGHT";
        }
      }
      if (data.textStyle.wordWrap) {
        this.safeSetPluginData(text, "wordWrap", data.textStyle.wordWrap);
      }
      if (data.textStyle.textOverflow) {
        this.safeSetPluginData(
          text,
          "textOverflow",
          data.textStyle.textOverflow
        );
        if (data.textStyle.textOverflow === "ellipsis") {
          text.textTruncation = "ENDING";
        }
      }
      if (data.textStyle.listStyleType) {
        this.safeSetPluginData(
          text,
          "listStyleType",
          data.textStyle.listStyleType
        );
      }

      if (data.textStyle.textShadows?.length) {
        const existingEffects = text.effects || [];
        const textShadowEffects = this.convertEffects(
          data.textStyle.textShadows
        );
        text.effects = [...existingEffects, ...textShadowEffects];
      }
    }

    if (data.absoluteLayout) {
      text.x = data.absoluteLayout.left;
      text.y = data.absoluteLayout.top;
      const targetWidth =
        data.renderedMetrics?.width || data.absoluteLayout.width || 1;
      const targetHeight =
        data.renderedMetrics?.height || data.absoluteLayout.height || 1;
      text.resize(Math.max(targetWidth, 1), Math.max(targetHeight, 1));
      this.safeSetPluginData(text, "usedAbsoluteLayout", "true");
    } else {
      text.x = data.layout.x || 0;
      text.y = data.layout.y || 0;
      const targetWidth = data.renderedMetrics?.width || data.layout.width || 1;
      const targetHeight =
        data.renderedMetrics?.height || data.layout.height || 1;
      text.resize(Math.max(targetWidth, 1), Math.max(targetHeight, 1));
    }

    text.characters = characters;
    try {
      text.textAutoResize = text.textAutoResize || "NONE";
    } catch {
      // ignore
    }

    if (data.inlineTextSegments && data.inlineTextSegments.length > 0) {
      await this.applyInlineTextSegments(text, data.inlineTextSegments);
    }

    console.log(
      `📝 Created text node: "${characters.substring(0, 50)}${
        characters.length > 50 ? "..." : ""
      }"`
    );
    return text;
  }

  private async applyInlineTextSegments(
    textNode: TextNode,
    segments: any[]
  ): Promise<void> {
    let currentIndex = 0;

    for (const segment of segments) {
      const segmentText = segment.text || "";
      if (!segmentText) continue;

      const start = currentIndex;
      const end = currentIndex + segmentText.length;

      if (end > textNode.characters.length) break;

      if (segment.style) {
        const fontWeight = segment.style.fontWeight || 400;
        const isItalic = segment.style.fontStyle === "italic";
        const currentFont = textNode.fontName;
        const fontFamily =
          segment.style.fontFamily ||
          (currentFont !== figma.mixed ? currentFont.family : "Inter");

        let style = "Regular";
        if (fontWeight >= 700) style = "Bold";
        else if (fontWeight >= 600) style = "SemiBold";
        else if (fontWeight >= 500) style = "Medium";
        else if (fontWeight >= 300) style = "Light";

        if (isItalic) {
          style = style === "Regular" ? "Italic" : `${style} Italic`;
        }

        try {
          const fontName = { family: fontFamily, style };
          await figma.loadFontAsync(fontName);
          textNode.setRangeFontName(start, end, fontName);
        } catch (e) {
          console.warn(
            `Failed to apply inline font style: ${fontFamily} ${style}`,
            e
          );
        }

        if (segment.style.color) {
          const { r, g, b, a } = segment.style.color;
          textNode.setRangeFills(start, end, [
            {
              type: "SOLID",
              color: { r, g, b },
              opacity: a !== undefined ? a : 1,
            },
          ]);
        }

        if (segment.style.textDecoration) {
          textNode.setRangeTextDecoration(
            start,
            end,
            segment.style.textDecoration
          );
        }

        if (
          segment.style.fontSize &&
          segment.style.fontSize !== textNode.fontSize
        ) {
          textNode.setRangeFontSize(start, end, segment.style.fontSize);
        }
      }

      currentIndex = end;
    }
  }

  private async createImage(data: any): Promise<SceneNode> {
    // VIDEO placeholder handling stays the same
    if (data.pluginData?.originalType === "VIDEO") {
      const frame = figma.createFrame();
      frame.name = data.name || "Video";
      frame.resize(
        Math.max(data.layout.width || 1, 1),
        Math.max(data.layout.height || 1, 1)
      );
      frame.fills = [];

      const playIcon = figma.createVector();
      playIcon.vectorPaths = [
        {
          windingRule: "NONZERO",
          data: "M 0 0 L 0 24 L 18 12 L 0 0 Z",
        },
      ];
      playIcon.name = "Play Icon";
      playIcon.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      playIcon.strokes = [
        { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.5 },
      ];
      playIcon.strokeWeight = 1;

      const iconSize = Math.min(data.layout.width, data.layout.height) * 0.2;
      const scale = iconSize / 24;
      playIcon.resize(24 * scale, 24 * scale);
      playIcon.x = (data.layout.width - playIcon.width) / 2;
      playIcon.y = (data.layout.height - playIcon.height) / 2;

      const circle = figma.createEllipse();
      circle.resize(iconSize * 2, iconSize * 2);
      circle.x = (data.layout.width - circle.width) / 2;
      circle.y = (data.layout.height - circle.height) / 2;
      circle.fills = [
        { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.5 },
      ];
      circle.name = "Play Button Background";

      frame.appendChild(circle);
      frame.appendChild(playIcon);

      return frame;
    }

    const rect = figma.createRectangle();
    rect.name = data.name || "Image";
    rect.resize(
      Math.max(data.layout.width || 1, 1),
      Math.max(data.layout.height || 1, 1)
    );

    // 🔥 CRITICAL: schema uses imageHash – prefer that, but still support imageAssetId.
    // Some extractors only set image hashes on fills/backgrounds; fall back to those when needed.
    let hash: string | undefined = data.imageAssetId || data.imageHash;
    const asset =
      hash && this.assets?.images && this.assets.images[hash]
        ? this.assets.images[hash]
        : undefined;

    // Inline SVGs should be turned into vectors instead of rasterized images
    if (asset) {
      const svgMarkup = this.extractSvgMarkup(asset);
      if (svgMarkup) {
        const vectorNode = this.createVectorFromSvgMarkup(svgMarkup, data);
        if (vectorNode) {
          return vectorNode;
        }
      }
    }

    if (!hash && Array.isArray(data.fills)) {
      const imageFill = data.fills.find(
        (f: any) => f && f.type === "IMAGE" && typeof f.imageHash === "string"
      );
      if (imageFill) {
        hash = imageFill.imageHash;
      }
    }

    if (hash) {
      const scaleMode = this.mapObjectFitToScaleMode(data.objectFit || "cover");
      const imagePaint = await this.resolveImagePaint({
        imageHash: hash,
        scaleMode,
      });
      rect.fills = [imagePaint];
    }

    return rect;
  }

  private async createVector(data: any): Promise<SceneNode | null> {
    if (data.svgContent) {
      try {
        const svgPayload = data.svgContent.includes(",")
          ? data.svgContent.split(",")[1]
          : data.svgContent;
        const svgString = svgPayload.trim().startsWith("<")
          ? svgPayload
          : this.base64ToString(svgPayload, { allowSvg: true });

        const vectorRoot = figma.createNodeFromSvg(svgString);
        vectorRoot.name = data.name || "Vector";
        return vectorRoot;
      } catch (error) {
        console.warn("Failed to create node from SVG content", error);
      }
    }

    if (data.vectorData?.svgCode) {
      try {
        const vectorRoot = figma.createNodeFromSvg(data.vectorData.svgCode);
        vectorRoot.name = data.name || "Vector";
        return vectorRoot as SceneNode;
      } catch (error) {
        console.warn(
          "Failed to create vector from SVG, falling back to rectangle.",
          error
        );
      }
    }

    // NEW: Try converting SVG image assets directly to vectors
    if (data.imageHash && this.assets?.images?.[data.imageHash]?.svgCode) {
      try {
        const svgMarkup = this.assets.images[data.imageHash].svgCode;
        const vectorRoot = figma.createNodeFromSvg(svgMarkup);
        vectorRoot.name = data.name || "Vector";
        return vectorRoot as SceneNode;
      } catch (error) {
        console.warn(
          "Failed to create vector from svgCode on asset, continuing as raster",
          error
        );
      }
    }

    return this.createRectangle(data);
  }

  private async createComponent(data: any): Promise<ComponentNode> {
    const component = figma.createComponent();
    component.name = data.name || "Component";
    component.resize(
      Math.max(data.layout.width || 1, 1),
      Math.max(data.layout.height || 1, 1)
    );
    return component;
  }

  private async createInstance(data: any): Promise<SceneNode | null> {
    const componentId = data.componentId || data.componentKey || data.id;
    if (componentId) {
      const existing = this.componentManager.getComponent(componentId);
      if (existing) {
        return existing.createInstance();
      }
    }

    const signature = data.componentSignature;
    if (signature) {
      const registered =
        this.componentManager.getComponentBySignature(signature);
      if (registered) {
        return registered.createInstance();
      }
    }

    return this.createFrame(data);
  }

  private async afterCreate(
    node: SceneNode,
    data: any,
    meta: { reuseComponent: boolean }
  ): Promise<void> {
    node.name = data.name || node.name;

    this.applyPositioning(node, data);
    await this.applyCommonStyles(node, data);

    // Only try to convert CSS Grid → Auto Layout if auto-layout mode is enabled
    if (this.options?.applyAutoLayout) {
      if (data.autoLayout && node.type === "FRAME") {
        this.applyAutoLayout(node as FrameNode, data.autoLayout);
      }
      this.applyGridLayoutMetadata(node, data);
    }

    this.applyOverflow(node, data);
    this.applyVisibility(node, data);
    this.applyFilters(node, data);
    this.applyMetadata(node, data, meta);

    if (data.designTokens && this.designTokensManager) {
      await this.applyDesignTokens(node, data.designTokens);
    }
  }

  private async applyDesignTokens(node: SceneNode, tokens: any): Promise<void> {
    if (!this.designTokensManager) return;

    const getVar = (tokenId: string) =>
      this.designTokensManager!.getVariableByTokenId(tokenId);

    if (tokens.fill && "fills" in node) {
      const variable = getVar(tokens.fill);
      if (variable) {
        const fills = (node as GeometryMixin).fills as Paint[];
        if (fills && fills.length > 0) {
          const newFills = JSON.parse(JSON.stringify(fills));
          const boundFill = figma.variables.setBoundVariableForPaint(
            newFills[0],
            "color",
            variable
          );
          newFills[0] = boundFill;
          (node as GeometryMixin).fills = newFills;
        }
      }
    }

    if (tokens.stroke && "strokes" in node) {
      const variable = getVar(tokens.stroke);
      if (variable) {
        const strokes = (node as GeometryMixin).strokes as Paint[];
        if (strokes && strokes.length > 0) {
          const newStrokes = JSON.parse(JSON.stringify(strokes));
          const boundStroke = figma.variables.setBoundVariableForPaint(
            newStrokes[0],
            "color",
            variable
          );
          newStrokes[0] = boundStroke;
          (node as GeometryMixin).strokes = newStrokes;
        }
      }
    }

    if (tokens.borderRadius && "cornerRadius" in node) {
      const variable = getVar(tokens.borderRadius);
      if (variable) {
        try {
          node.setBoundVariable("topLeftRadius", variable.id);
          node.setBoundVariable("topRightRadius", variable.id);
          node.setBoundVariable("bottomLeftRadius", variable.id);
          node.setBoundVariable("bottomRightRadius", variable.id);
        } catch {}
      }
    }

    if (tokens.width && "resize" in node) {
      const variable = getVar(tokens.width);
      if (variable) {
        try {
          node.setBoundVariable("width", variable.id);
        } catch {}
      }
    }
    if (tokens.height && "resize" in node) {
      const variable = getVar(tokens.height);
      if (variable) {
        try {
          node.setBoundVariable("height", variable.id);
        } catch {}
      }
    }

    if ("layoutMode" in node && (node as FrameNode).layoutMode !== "NONE") {
      if (tokens.gap) {
        const variable = getVar(tokens.gap);
        if (variable) node.setBoundVariable("itemSpacing", variable.id);
      }
      if (tokens.padding) {
        const variable = getVar(tokens.padding);
        if (variable) {
          node.setBoundVariable("paddingTop", variable.id);
          node.setBoundVariable("paddingBottom", variable.id);
          node.setBoundVariable("paddingLeft", variable.id);
          node.setBoundVariable("paddingRight", variable.id);
        }
      }
    }
  }

  private applyPositioning(node: SceneNode, data: any) {
    if (data.layout) {
      let x = data.layout.x || 0;
      let y = data.layout.y || 0;
      let width = data.layout.width || 1;
      let height = data.layout.height || 1;

      if (data.absoluteLayout) {
        x = data.absoluteLayout.left || x;
        y = data.absoluteLayout.top || y;
        width = data.absoluteLayout.width || width;
        height = data.absoluteLayout.height || height;

        this.safeSetPluginData(node, "usedAbsoluteLayout", "true");
      }

      if (data.strokes?.length) {
        let totalWidthCompensation = 0;
        let totalHeightCompensation = 0;
        const compensationDetails: any[] = [];

        for (const stroke of data.strokes) {
          const strokeWeight = stroke.thickness || data.strokeWeight || 0;
          const strokeAlign =
            stroke.strokeAlign || data.strokeAlign || "CENTER";

          let widthCompensation = 0;
          let heightCompensation = 0;

          if (data.layout.boxSizing === "border-box") {
            switch (strokeAlign) {
              case "INSIDE":
                widthCompensation = 0;
                heightCompensation = 0;
                break;
              case "CENTER":
                widthCompensation = strokeWeight / 2;
                heightCompensation = strokeWeight / 2;
                break;
              case "OUTSIDE":
                widthCompensation = 0;
                heightCompensation = 0;
                break;
            }
          } else {
            widthCompensation = 0;
            heightCompensation = 0;
          }

          totalWidthCompensation += widthCompensation;
          totalHeightCompensation += heightCompensation;

          compensationDetails.push({
            strokeWeight,
            strokeAlign,
            widthCompensation,
            heightCompensation,
          });
        }

        width = Math.max(width - totalWidthCompensation, 1);
        height = Math.max(height - totalHeightCompensation, 1);

        this.safeSetPluginData(
          node,
          "strokeCompensationDetails",
          JSON.stringify({
            boxSizing: data.layout.boxSizing,
            totalWidthCompensation,
            totalHeightCompensation,
            originalWidth: data.layout.width,
            originalHeight: data.layout.height,
            strokes: compensationDetails,
          })
        );
      }

      node.x = x;
      node.y = y;

      if ("rotation" in node) {
        (node as any).rotation = data.layout.rotation || 0;
      }

      if (typeof width === "number" && typeof height === "number") {
        if ("resize" in node) {
          (node as LayoutMixin).resize(Math.max(width, 1), Math.max(height, 1));
        }
      }
    }

    if (data.position) {
      this.safeSetPluginData(node, "cssPosition", data.position);
    }

    // 🔥 RESPECT IMPORT OPTIONS: only apply Auto Layout when enabled
    if (
      data.autoLayout &&
      "layoutMode" in node &&
      this.options?.applyAutoLayout
    ) {
      this.applyAutoLayout(node as FrameNode, data.autoLayout);
    } else if ("layoutMode" in node) {
      (node as FrameNode).layoutMode = "NONE";
      this.safeSetPluginData(node, "layoutMode", "ABSOLUTE");
    }

    if (data.layoutContext) {
      this.safeSetPluginData(
        node,
        "cssLayoutContext",
        JSON.stringify(data.layoutContext)
      );

      if (
        data.layoutContext.transform &&
        data.layoutContext.transform !== "none"
      ) {
        this.safeSetPluginData(
          node,
          "cssTransform",
          data.layoutContext.transform
        );
      }

      if (data.layoutContext.position) {
        this.safeSetPluginData(
          node,
          "cssPosition",
          data.layoutContext.position
        );
      }

      if (data.autoLayout && (data.autoLayout as any).flexAnalysis) {
        this.safeSetPluginData(
          node,
          "flexAnalysis",
          JSON.stringify((data.autoLayout as any).flexAnalysis)
        );
      }
    }

    if (
      "layoutGrow" in node &&
      typeof data.autoLayout?.layoutGrow === "number"
    ) {
      try {
        (node as any).layoutGrow = data.autoLayout.layoutGrow;
      } catch (e) {
        console.warn(`Could not set layoutGrow on ${node.name}`, e);
      }
      this.safeSetPluginData(
        node,
        "cssLayoutGrow",
        data.autoLayout.layoutGrow.toString()
      );
    }
    if ("layoutAlign" in node && data.autoLayout?.layoutAlign) {
      try {
        (node as any).layoutAlign = data.autoLayout.layoutAlign;
      } catch (e) {
        console.warn(`Could not set layoutAlign on ${node.name}`, e);
      }
      this.safeSetPluginData(
        node,
        "cssLayoutAlign",
        data.autoLayout.layoutAlign
      );
    }

    if (data.transform?.matrix) {
      this.applyTransformMatrix(
        node,
        data.transform,
        data.transformOrigin,
        data.layout
      );
      this.safeSetPluginData(
        node,
        "cssTransform",
        JSON.stringify(data.transform)
      );
    }

    if (data.layout) {
      this.applyResponsiveConstraints(node, data.layout);
    }
  }

  private applyResponsiveConstraints(node: SceneNode, layout: any) {
    if (!("minWidth" in node)) return;

    const frameNode = node as FrameNode;
    const supportsMinMaxConstraints =
      this.nodeSupportsMinMaxConstraints(frameNode);

    if (typeof layout.minWidth === "number" && layout.minWidth > 0) {
      this.safeSetPluginData(node, "cssMinWidth", layout.minWidth.toString());

      if (supportsMinMaxConstraints) {
        try {
          frameNode.minWidth = layout.minWidth;
        } catch (error) {
          console.warn(
            `Cannot set minWidth on node "${frameNode.name}":`,
            error
          );
        }
      }
    }

    if (typeof layout.maxWidth === "number" && layout.maxWidth > 0) {
      this.safeSetPluginData(node, "cssMaxWidth", layout.maxWidth.toString());

      if (supportsMinMaxConstraints) {
        try {
          frameNode.maxWidth = layout.maxWidth;
        } catch (error) {
          console.warn(
            `Cannot set maxWidth on node "${frameNode.name}":`,
            error
          );
        }
      }
    }

    if (typeof layout.minHeight === "number" && layout.minHeight > 0) {
      this.safeSetPluginData(node, "cssMinHeight", layout.minHeight.toString());

      if (supportsMinMaxConstraints) {
        try {
          frameNode.minHeight = layout.minHeight;
        } catch (error) {
          console.warn(
            `Cannot set minHeight on node "${frameNode.name}":`,
            error
          );
        }
      }
    }

    if (typeof layout.maxHeight === "number" && layout.maxHeight > 0) {
      this.safeSetPluginData(node, "cssMaxHeight", layout.maxHeight.toString());

      if (supportsMinMaxConstraints) {
        try {
          frameNode.maxHeight = layout.maxHeight;
        } catch (error) {
          console.warn(
            `Cannot set maxHeight on node "${frameNode.name}":`,
            error
          );
        }
      }
    }
  }

  private nodeSupportsMinMaxConstraints(node: FrameNode): boolean {
    if ("layoutMode" in node && node.layoutMode !== "NONE") {
      return true;
    }

    if (node.parent && "layoutMode" in node.parent) {
      const parentFrame = node.parent as FrameNode;
      return parentFrame.layoutMode !== "NONE";
    }

    return false;
  }

  private applyAutoLayout(node: FrameNode, layout: any) {
    try {
      node.layoutMode = layout.layoutMode;

      node.primaryAxisAlignItems = layout.primaryAxisAlignItems;
      node.counterAxisAlignItems = layout.counterAxisAlignItems;
      node.itemSpacing = layout.itemSpacing;

      node.paddingTop = layout.paddingTop;
      node.paddingRight = layout.paddingRight;
      node.paddingBottom = layout.paddingBottom;
      node.paddingLeft = layout.paddingLeft;

      if (layout.primaryAxisSizingMode) {
        node.primaryAxisSizingMode = layout.primaryAxisSizingMode;
      }
      if (layout.counterAxisSizingMode) {
        node.counterAxisSizingMode = layout.counterAxisSizingMode;
      }

      if (layout.layoutWrap) {
        node.layoutWrap = layout.layoutWrap;
      }

      console.log(
        `✅ Applied Auto Layout to ${node.name}: ${layout.layoutMode} (Wrap: ${
          layout.layoutWrap || "NO_WRAP"
        })`
      );
    } catch (error) {
      console.warn(`Failed to apply Auto Layout to ${node.name}:`, error);
      node.layoutMode = "NONE";
    }
  }

  private async applyCommonStyles(node: SceneNode, data: any): Promise<void> {
    console.log(`🎨 Applying common styles to ${data.name}:`, {
      hasBackgrounds: !!data.backgrounds?.length,
      backgroundsCount: data.backgrounds?.length || 0,
      hasFills: !!data.fills?.length,
      fillsCount: data.fills?.length || 0,
      hasImageHash: !!data.imageHash,
      nodeType: node.type,
      canHaveFills: "fills" in node,
    });

    if (data.backgrounds?.length && "fills" in node) {
      console.log(
        `  ✅ Applying ${data.backgrounds.length} background layers to ${data.name}`
      );
      const paints = await this.convertBackgroundLayersAsync(
        data.backgrounds,
        data.layout
      );

      if (paints.length === 0) {
        console.log(
          `  ⚪ Backgrounds existed for ${data.name} but produced no paints (likely transparent).`
        );
        (node as SceneNodeWithGeometry).fills = [];
      } else {
        (node as SceneNodeWithGeometry).fills = paints;
      }
    } else if (data.fills && "fills" in node) {
      console.log(`  ✅ Applying ${data.fills.length} fills to ${data.name}`);
      const paints = await this.convertFillsAsync(data.fills);

      if (paints.length === 0) {
        console.log(
          `  ⚪ Fills existed for ${data.name} but produced no paints (likely transparent).`
        );
        (node as SceneNodeWithGeometry).fills = [];
      } else {
        (node as SceneNodeWithGeometry).fills = paints;
      }
    } else if (data.imageHash && "fills" in node) {
      const imageFill = {
        type: "IMAGE" as const,
        imageHash: data.imageHash,
        scaleMode: (data.objectFit
          ? this.mapObjectFitToScaleMode(data.objectFit)
          : "FILL") as "FILL" | "FIT" | "CROP" | "TILE",
        visible: true,
      };

      const fills: Paint[] = [];
      const placeholderColor = this.getPlaceholderColor(data);
      fills.push({
        type: "SOLID",
        color: placeholderColor,
        opacity: 1,
      } as SolidPaint);

      console.log(
        `🖼️ Applying image fill for ${data.name} with hash ${data.imageHash}`
      );
      fills.push(await this.resolveImagePaint(imageFill));

      (node as SceneNodeWithGeometry).fills = fills;
    } else if ("fills" in node) {
      // If this node has no own fills/backgrounds but a descendant carries an IMAGE fill,
      // promote the first image hash so the frame doesn't render empty.
      const descendantImageHash = this.findFirstImageHash(data);
      if (descendantImageHash) {
        const imageFill = {
          type: "IMAGE" as const,
          imageHash: descendantImageHash,
          scaleMode: "FILL" as const,
          visible: true,
        };
        const placeholderColor = this.getPlaceholderColor(data);
        const paints: Paint[] = [
          { type: "SOLID", color: placeholderColor, opacity: 1 } as SolidPaint,
          await this.resolveImagePaint(imageFill),
        ];
        console.log(
          `🪄 Promoting descendant image hash ${descendantImageHash} to ${data.name}`
        );
        (node as SceneNodeWithGeometry).fills = paints;
      } else {
        // Try to derive a solid fill from CSS backgroundColor before giving up.
        const parsedColor =
          this.parseColorString(data.style?.backgroundColor) ||
          this.parseColorString(data.backgroundColor) ||
          this.parseColorString(data.fillColor);

        if (parsedColor) {
          console.log(
            `  🎨 Derived solid fill for ${data.name} from backgroundColor`
          );
          (node as SceneNodeWithGeometry).fills = [
            { type: "SOLID", color: parsedColor, opacity: 1 } as SolidPaint,
          ];
        } else {
          console.log(
            `  ⚪ No fills/backgrounds for ${data.name}, setting transparent`
          );
          (node as SceneNodeWithGeometry).fills = [];
        }
      }
    }

    // Apply placeholder for form controls if provided
    if (
      data.placeholder &&
      node.type === "TEXT" &&
      (data.htmlTag === "input" || data.name === "Input")
    ) {
      // For imports that create a TEXT node directly (rare), set characters + placeholder color
      (node as TextNode).characters = data.placeholder;
      const placeholderColor = this.getPlaceholderColor(data);
      (node as TextNode).fills = [
        {
          type: "SOLID",
          color: placeholderColor,
          opacity: 0.6,
        } as SolidPaint,
      ];
    } else if (
      data.placeholder &&
      "placeholder" in node &&
      (data.htmlTag === "input" || data.name === "Input")
    ) {
      (node as any).placeholder = data.placeholder;
      const placeholderColor = this.getPlaceholderColor(data);
      this.safeSetPluginData(
        node,
        "placeholderColor",
        JSON.stringify(placeholderColor)
      );
    }

    if (data.strokes && "strokes" in node) {
      console.log(`  ✏️ Applying strokes to ${data.name}`);
      (node as SceneNodeWithGeometry).strokes = await this.convertStrokesAsync(
        data.strokes
      );
    }

    if ("strokeWeight" in node && data.strokeWeight !== undefined) {
      (node as any).strokeWeight = data.strokeWeight;
    } else if ("strokeWeight" in node && data.strokes?.[0]?.thickness) {
      (node as any).strokeWeight = data.strokes[0].thickness;
    }

    if ("strokeAlign" in node) {
      if (data.strokeAlign) {
        (node as any).strokeAlign = data.strokeAlign;
      } else if (data.strokes?.[0]?.strokeAlign) {
        (node as any).strokeAlign = data.strokes[0].strokeAlign;
      }
    }

    if ("dashPattern" in node) {
      if (data.strokes?.[0]?.dashPattern) {
        (node as any).dashPattern = data.strokes[0].dashPattern;
      } else if (data.borderStyle) {
        const dashPatterns: Record<string, number[]> = {
          dashed: [10, 5],
          dotted: [2, 3],
          solid: [],
        };
        const pattern = dashPatterns[data.borderStyle] || [];
        if (pattern.length > 0) {
          (node as any).dashPattern = pattern;
        }
      }
    }

    if (this.designTokensManager && "fills" in node) {
      await this.bindVariablesToNode(node as any, data);
    }

    if (data.borderStyle) {
      this.safeSetPluginData(node, "borderStyle", data.borderStyle);
    }

    if (data.cornerRadius && "cornerRadius" in node) {
      console.log(
        `  🔲 Applying corner radius to ${data.name}:`,
        data.cornerRadius
      );
      this.applyCornerRadius(node as any, data.cornerRadius);
    }

    const existingEffects =
      "effects" in node ? [...((node as BlendMixin).effects || [])] : [];
    if (data.effects?.length && "effects" in node) {
      console.log(
        `  ✨ Applying ${data.effects.length} effects to ${data.name}`
      );
      const convertedEffects = this.convertEffects(data.effects);
      console.log(
        `  ✨ Converted effects:`,
        convertedEffects.map((e: any) => ({ type: e.type, visible: e.visible }))
      );
      existingEffects.push(...convertedEffects);
    }

    if (existingEffects.length && "effects" in node) {
      (node as BlendMixin).effects = existingEffects;
      console.log(
        `  ✅ Applied ${existingEffects.length} total effects to ${data.name}`
      );
    }

    if (data.opacity !== undefined && "opacity" in node) {
      (node as any).opacity = data.opacity;
    }

    if (data.blendMode && "blendMode" in node) {
      (node as any).blendMode = data.blendMode;
    }
    if (data.mixBlendMode && "blendMode" in node) {
      (node as any).blendMode = data.mixBlendMode;
    }
  }

  private applyCornerRadius(node: any, radius: any, tokenId?: string) {
    if (typeof radius === "number") {
      if (this.designTokensManager && tokenId) {
        const variable = this.designTokensManager.getVariableByTokenId(tokenId);
        if (
          variable &&
          variable.resolvedType === "FLOAT" &&
          "boundVariables" in node
        ) {
          node.boundVariables = {
            ...(node.boundVariables || {}),
            cornerRadius: { type: "VARIABLE_ALIAS", id: variable.id },
          };
        }
      }
      node.cornerRadius = radius;
    } else {
      node.topLeftRadius = radius.topLeft || 0;
      node.topRightRadius = radius.topRight || 0;
      node.bottomRightRadius = radius.bottomRight || 0;
      node.bottomLeftRadius = radius.bottomLeft || 0;
    }
  }

  private applyGridLayoutMetadata(node: SceneNode, data: any) {
    if (!data.gridLayout) return;

    const grid = data.gridLayout;

    this.applyGridLayoutConversion(node as FrameNode, grid, data);

    this.safeSetPluginData(
      node,
      "enhancedGridLayout",
      JSON.stringify({
        ...grid,
        conversionApplied: true,
        timestamp: Date.now(),
      })
    );

    this.safeSetPluginData(
      node,
      "cssGridLayout",
      JSON.stringify({
        templateColumns: grid.templateColumns,
        templateRows: grid.templateRows,
        columnGap: grid.columnGap,
        rowGap: grid.rowGap,
        autoFlow: grid.autoFlow,
        justifyItems: grid.justifyItems,
        alignItems: grid.alignItems,
        justifyContent: grid.justifyContent,
        alignContent: grid.alignContent,
      })
    );

    if (data.gridChild) {
      this.safeSetPluginData(node, "gridChild", JSON.stringify(data.gridChild));
    }

    if ("name" in node && typeof node.name === "string") {
      const strategy = grid.conversionStrategy || "auto";
      if (!node.name.includes("[Grid")) {
        node.name = `${node.name} [Grid:${strategy}]`;
      }
    }

    if (grid.figmaAnnotations && grid.figmaAnnotations.length > 0) {
      this.safeSetPluginData(
        node,
        "gridAnnotations",
        JSON.stringify(grid.figmaAnnotations)
      );
    }
  }

  private applyGridLayoutConversion(
    node: FrameNode,
    gridData: any,
    elementData: any
  ) {
    switch (gridData.conversionStrategy) {
      case "nested-auto-layout":
        this.applyNestedAutoLayoutConversion(node, gridData);
        break;
      case "absolute-positioning":
        this.applyAbsolutePositioningConversion(node, gridData);
        break;
      case "hybrid":
        this.applyHybridLayoutConversion(node, gridData);
        break;
      default:
        this.applyBasicGridAutoLayout(node, gridData);
    }
  }

  private applyNestedAutoLayoutConversion(node: FrameNode, gridData: any) {
    if (!("layoutMode" in node)) return;

    const isRowMajor =
      gridData.computedRowSizes.length <= gridData.computedColumnSizes.length;

    node.layoutMode = isRowMajor ? "VERTICAL" : "HORIZONTAL";

    const primaryProp = isRowMajor
      ? gridData.alignContent || "start"
      : gridData.justifyContent || "start";
    const counterProp = isRowMajor
      ? gridData.justifyContent || "start"
      : gridData.alignContent || "start";

    node.primaryAxisAlignItems = this.mapGridAlignment(primaryProp);

    const counterAlign = this.mapGridAlignment(counterProp);
    node.counterAxisAlignItems =
      counterAlign === "SPACE_BETWEEN" ? "CENTER" : (counterAlign as any);
    node.itemSpacing = isRowMajor ? gridData.rowGap : gridData.columnGap;

    this.safeSetPluginData(
      node,
      "gridConversionData",
      JSON.stringify({
        strategy: "nested-auto-layout",
        isRowMajor,
        rowCount: gridData.computedRowSizes.length,
        columnCount: gridData.computedColumnSizes.length,
        rowSizes: gridData.computedRowSizes,
        columnSizes: gridData.computedColumnSizes,
        rowGap: gridData.rowGap,
        columnGap: gridData.columnGap,
      })
    );

    console.log(
      `✅ Applied nested Auto Layout to grid: ${gridData.computedColumnSizes.length}x${gridData.computedRowSizes.length}`
    );
  }

  private applyAbsolutePositioningConversion(node: FrameNode, gridData: any) {
    if (!("layoutMode" in node)) return;

    node.layoutMode = "NONE";

    this.safeSetPluginData(
      node,
      "gridConversionData",
      JSON.stringify({
        strategy: "absolute-positioning",
        templateAreas: gridData.templateAreas,
        computedColumnSizes: gridData.computedColumnSizes,
        computedRowSizes: gridData.computedRowSizes,
        positioning: "manual",
      })
    );

    console.log(`⚠️ Applied absolute positioning to complex grid`);
  }

  private applyHybridLayoutConversion(node: FrameNode, gridData: any) {
    this.applyNestedAutoLayoutConversion(node, gridData);

    this.safeSetPluginData(
      node,
      "gridHybridData",
      JSON.stringify({
        strategy: "hybrid",
        complexItems: gridData.templateAreas || [],
        fallbackToAbsolute: true,
      })
    );

    console.log(`🔀 Applied hybrid layout conversion to grid`);
  }

  private applyBasicGridAutoLayout(node: FrameNode, gridData: any) {
    if (!("layoutMode" in node)) return;

    const hasMoreColumns =
      gridData.computedColumnSizes.length > gridData.computedRowSizes.length;

    node.layoutMode = hasMoreColumns ? "HORIZONTAL" : "VERTICAL";
    node.itemSpacing = hasMoreColumns ? gridData.columnGap : gridData.rowGap;
    node.primaryAxisAlignItems = "MIN";
    node.counterAxisAlignItems = "MIN";

    console.log(
      `📐 Applied basic Auto Layout to grid (${gridData.computedColumnSizes.length}x${gridData.computedRowSizes.length})`
    );
  }

  private mapGridAlignment(
    value?: string
  ): "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN" {
    switch (value) {
      case "start":
      case "flex-start":
        return "MIN";
      case "center":
        return "CENTER";
      case "end":
      case "flex-end":
        return "MAX";
      case "space-between":
        return "SPACE_BETWEEN";
      case "stretch":
      default:
        return "MIN";
    }
  }

  private applyOverflow(node: SceneNode, data: any) {
    if (!data.overflow && data.clipsContent === undefined) return;
    if ("clipsContent" in node) {
      // Handle direct clipsContent flag from extractor
      if (data.clipsContent === true) {
        (node as FrameNode).clipsContent = true;
        return;
      }
      if (!data.overflow) return;
      // Handle both overflow.x/y (new) and overflow.horizontal/vertical (old) formats
      const horizontalHidden =
        data.overflow.horizontal === "hidden" ||
        data.overflow.horizontal === "clip" ||
        data.overflow.x === "hidden" ||
        data.overflow.x === "clip";
      const verticalHidden =
        data.overflow.vertical === "hidden" ||
        data.overflow.vertical === "clip" ||
        data.overflow.y === "hidden" ||
        data.overflow.y === "clip";
      (node as FrameNode).clipsContent = horizontalHidden || verticalHidden;
    }
  }

  private applyVisibility(node: SceneNode, data: any) {
    if (
      data.display === "none" ||
      data.visibility === "hidden" ||
      data.visibility === "collapse"
    ) {
      node.visible = false;
    } else {
      node.visible = true;
    }
  }

  private applyFilters(node: SceneNode, data: any) {
    if (!("setPluginData" in node)) return;
    const existingEffects =
      "effects" in node ? [...((node as BlendMixin).effects || [])] : [];

    (data.filters || []).forEach((filter: any) => {
      if (filter.type === "blur" && "effects" in node) {
        existingEffects.push({
          type: "LAYER_BLUR",
          radius: filter.unit === "px" ? filter.value : filter.value || 0,
          visible: true,
        } as BlurEffect);
      }
      if (filter.type === "dropShadow" && "effects" in node) {
        existingEffects.push({
          type: "DROP_SHADOW",
          color: filter.color || { r: 0, g: 0, b: 0, a: 0.5 },
          offset: filter.offset || { x: 0, y: 0 },
          radius: filter.unit === "px" ? filter.value : filter.value || 0,
          spread: 0,
          visible: true,
          blendMode: "NORMAL",
        } as DropShadowEffect);
      }
    });

    (data.backdropFilters || []).forEach((filter: any) => {
      if (filter.type === "blur" && "effects" in node) {
        existingEffects.push({
          type: "BACKGROUND_BLUR",
          radius: filter.unit === "px" ? filter.value : filter.value || 0,
          visible: true,
        } as BlurEffect);
      }
    });

    if (existingEffects.length && "effects" in node) {
      (node as BlendMixin).effects = existingEffects;
    }

    if (data.filters?.length) {
      this.safeSetPluginData(node, "cssFilters", JSON.stringify(data.filters));
    }
    if (data.backdropFilters?.length) {
      this.safeSetPluginData(
        node,
        "cssBackdropFilters",
        JSON.stringify(data.backdropFilters)
      );
    }
  }

  private applyMetadata(
    node: SceneNode,
    data: any,
    meta: { reuseComponent: boolean }
  ) {
    this.applyConstraints(node, data);

    const isTextNode = node.type === "TEXT";
    const canHaveLayoutProperties = !isTextNode && "layoutGrow" in node;

    if (canHaveLayoutProperties && data.autoLayout?.layoutGrow !== undefined) {
      try {
        (node as any).layoutGrow = data.autoLayout.layoutGrow;
      } catch (error) {
        console.warn(
          `Cannot set layoutGrow on node "${node.name}" in metadata:`,
          error
        );
        this.safeSetPluginData(
          node,
          "cssLayoutGrow",
          data.autoLayout.layoutGrow.toString()
        );
      }
    }
    if (canHaveLayoutProperties && data.autoLayout?.layoutAlign) {
      try {
        (node as any).layoutAlign = data.autoLayout.layoutAlign;
      } catch (error) {
        console.warn(
          `Cannot set layoutAlign on node "${node.name}" in metadata:`,
          error
        );
        this.safeSetPluginData(
          node,
          "cssLayoutAlign",
          data.autoLayout.layoutAlign
        );
      }
    }

    this.safeSetPluginData(node, "sourceNodeId", data.id || "");
    this.safeSetPluginData(node, "htmlTag", data.htmlTag || "");

    if (data.cssClasses?.length) {
      this.safeSetPluginData(
        node,
        "cssClasses",
        JSON.stringify(data.cssClasses)
      );
    }

    if (data.dataAttributes && Object.keys(data.dataAttributes).length) {
      this.safeSetPluginData(
        node,
        "dataAttributes",
        JSON.stringify(data.dataAttributes)
      );
    }

    if (data.cssCustomProperties) {
      this.safeSetPluginData(
        node,
        "cssCustomProperties",
        JSON.stringify(data.cssCustomProperties)
      );
    }

    if (data.clipPath) {
      this.safeSetPluginData(
        node,
        "cssClipPath",
        JSON.stringify(data.clipPath)
      );
    }

    if (data.mask) {
      this.safeSetPluginData(node, "cssMask", JSON.stringify(data.mask));
    }

    if (data.pointerEvents) {
      this.safeSetPluginData(node, "pointerEvents", data.pointerEvents);
    }

    if (data.position) {
      this.safeSetPluginData(node, "positioning", data.position);
    }

    if (data.absoluteLayout) {
      this.safeSetPluginData(
        node,
        "absoluteLayout",
        JSON.stringify(data.absoluteLayout)
      );
    }

    if (data.scrollData) {
      this.safeSetPluginData(
        node,
        "scrollData",
        JSON.stringify(data.scrollData)
      );
    }

    if (data.contentHash) {
      this.safeSetPluginData(node, "contentHash", data.contentHash);
    }

    if (meta.reuseComponent) {
      this.safeSetPluginData(node, "componentInstance", "true");
    }

    if (data.computedStyles) {
      this.safeSetPluginData(
        node,
        "computedStyles",
        JSON.stringify(data.computedStyles)
      );
    }
  }

  private applyConstraints(node: SceneNode, data: any) {
    if (!data.constraints) return;
    if ("constraints" in node) {
      (node as ConstraintMixin).constraints = {
        horizontal: data.constraints.horizontal || "MIN",
        vertical: data.constraints.vertical || "MIN",
      };
    }
  }

  private async convertBackgroundLayersAsync(
    backgrounds: any[],
    nodeLayout?: { width: number; height: number }
  ): Promise<Paint[]> {
    const paints: Paint[] = [];

    // Diagnostic logging for background processing
    console.log(
      `🔍 convertBackgroundLayersAsync called with ${
        backgrounds?.length || 0
      } backgrounds`
    );
    backgrounds?.forEach((layer, i) => {
      const fill = layer?.fill || layer;
      console.log(`  Background ${i}:`, {
        layerType: layer?.type,
        hasFill: !!layer?.fill,
        fillType: fill?.type,
        hasImageHash: !!fill?.imageHash,
        imageHash: fill?.imageHash,
      });
    });

    for (const layer of backgrounds) {
      if (!layer) continue;

      const fill = layer.fill || layer;

      if (fill.type === "SOLID" && fill.color) {
        const { r, g, b } = fill.color;
        const opacity =
          fill.opacity !== undefined ? fill.opacity : fill.color.a ?? 1;
        if (opacity <= 0) {
          continue;
        }
        console.log(`  🎨 Converting SOLID background:`, {
          r,
          g,
          b,
          opacity,
        });
        paints.push({
          type: "SOLID",
          color: { r, g, b },
          opacity,
          visible: fill.visible !== false,
        } as SolidPaint);
        continue;
      }

      if (
        (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL") &&
        fill.gradientStops
      ) {
        console.log(
          `  🌈 Converting ${fill.type} gradient with ${fill.gradientStops.length} stops`
        );
        paints.push({
          type: fill.type,
          gradientStops: fill.gradientStops.map((stop: any) => {
            const { r, g, b, a } = stop.color;
            return {
              position: stop.position,
              color: { r, g, b, a },
            };
          }),
          gradientTransform: fill.gradientTransform || [
            [1, 0, 0],
            [0, 1, 0],
          ],
          visible: fill.visible !== false,
        } as GradientPaint);
        continue;
      }

      if (fill.type === "IMAGE") {
        paints.push(
          await this.resolveImagePaintWithBackground(fill, layer, nodeLayout)
        );
        continue;
      }
    }

    console.log(`  ✅ Converted ${paints.length} background layers`);
    return paints;
  }

  private async convertFillsAsync(
    fills: any[],
    context?: { tokenId?: string; property?: string }
  ): Promise<Paint[]> {
    const paints: Paint[] = [];

    for (const fill of fills) {
      if (!fill) continue;

      if (fill.type === "SOLID" && fill.color) {
        const { r, g, b } = fill.color;
        const opacity =
          fill.opacity !== undefined ? fill.opacity : fill.color.a ?? 1;
        if (opacity <= 0) {
          continue;
        }

        const paint: SolidPaint = {
          type: "SOLID",
          color: { r, g, b },
          opacity,
          visible: fill.visible !== false,
        };

        if (this.designTokensManager) {
          let tokenId = context?.tokenId;

          if (!tokenId) {
            tokenId = this.findColorToken({ r, g, b, a: fill.color.a });
          }

          if (tokenId) {
            const variable =
              this.designTokensManager.getVariableByTokenId(tokenId);
            if (variable && variable.resolvedType === "COLOR") {
              (paint as any).boundVariables = {
                color: { type: "VARIABLE_ALIAS", id: variable.id },
              };
            }
          }
        }

        paints.push(paint);
        continue;
      }

      if (
        (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL") &&
        fill.gradientStops
      ) {
        paints.push({
          type: fill.type,
          gradientStops: fill.gradientStops.map((stop: any) => {
            const { r, g, b, a } = stop.color;
            return {
              position: stop.position,
              color: { r, g, b, a },
            };
          }),
          gradientTransform: fill.gradientTransform || [
            [1, 0, 0],
            [0, 1, 0],
          ],
          visible: fill.visible !== false,
        } as GradientPaint);
        continue;
      }

      if (fill.type === "IMAGE") {
        paints.push(await this.resolveImagePaint(fill));
        continue;
      }
    }

    return paints;
  }

  private async resolveImagePaintWithBackground(
    fill: any,
    layer: any,
    nodeLayout?: { width: number; height: number }
  ): Promise<Paint> {
    const hash = fill.imageHash;

    // Diagnostic logging for image resolution
    console.log(`🔍 resolveImagePaintWithBackground called:`, {
      hash,
      hasAssets: !!this.assets,
      hasImages: !!this.assets?.images,
      hashFound: !!this.assets?.images?.[hash],
      availableHashes: this.assets?.images
        ? Object.keys(this.assets.images).slice(0, 5)
        : [],
    });

    if (!hash) {
      console.error(
        `❌ resolveImagePaintWithBackground: No imageHash in fill:`,
        fill
      );
      return {
        type: "SOLID",
        color: { r: 0.9, g: 0.9, b: 0.9 },
        opacity: 1,
      } as SolidPaint;
    }

    if (!this.assets) {
      console.error(
        `❌ resolveImagePaintWithBackground: No assets available! Hash: ${hash}`
      );
      return {
        type: "SOLID",
        color: { r: 1, g: 0.5, b: 0 },
        opacity: 0.5,
      } as SolidPaint;
    }

    if (!this.assets.images) {
      console.error(
        `❌ resolveImagePaintWithBackground: assets.images is undefined! Keys:`,
        Object.keys(this.assets)
      );
      return {
        type: "SOLID",
        color: { r: 1, g: 1, b: 0 },
        opacity: 0.5,
      } as SolidPaint;
    }

    if (!this.assets.images[hash]) {
      console.error(
        `❌ resolveImagePaintWithBackground: Hash "${hash}" not found in assets.images`
      );
      console.error(
        `Available hashes (${Object.keys(this.assets.images).length}):`,
        Object.keys(this.assets.images).slice(0, 10)
      );
      return {
        type: "SOLID",
        color: { r: 0.5, g: 0, b: 1 },
        opacity: 0.5,
      } as SolidPaint;
    }

    let imageHash: string;
    if (this.imagePaintCache.has(hash)) {
      imageHash = this.imagePaintCache.get(hash)!;
    } else {
      try {
        const asset = this.assets.images[hash];
        console.log(`🔍 Creating Figma image from asset:`, {
          hash,
          hasData: !!asset.data,
          hasBase64: !!asset.base64,
          dataLen: (asset.data || asset.base64 || "").length,
        });
        const image = await this.createFigmaImageFromAsset(asset, hash);
        if (!image) {
          throw new Error("No image data available");
        }

        this.imagePaintCache.set(hash, image.hash);
        imageHash = image.hash;
        console.log(`✅ Successfully created Figma image: ${imageHash}`);
      } catch (error) {
        console.error(`❌ Failed to resolve image paint for ${hash}:`, error);
        return {
          type: "SOLID",
          color: { r: 0.9, g: 0.9, b: 0.9 },
          opacity: 1,
        } as SolidPaint;
      }
    }

    const scaleMode = this.getScaleModeFromRepeat(layer.repeat);

    const imageTransform = this.calculateImageTransform(
      layer.position,
      layer.size,
      nodeLayout,
      this.assets.images[hash]
    );

    const paint: ImagePaint = {
      type: "IMAGE",
      imageHash,
      scaleMode,
      visible: fill.visible !== false,
      ...(imageTransform && { imageTransform }),
      ...(fill.rotation !== undefined && { rotation: fill.rotation }),
      ...(fill.scalingFactor !== undefined && {
        scalingFactor: fill.scalingFactor,
      }),
    };

    return paint;
  }

  private async resolveImagePaint(fill: any): Promise<Paint> {
    const hash = fill.imageHash;

    console.log(`🖼️ [FIGMA IMPORT] Resolving image paint for hash: ${hash}`);

    if (!hash) {
      console.error(
        "❌ resolveImagePaint: No imageHash provided in fill:",
        fill
      );
      return {
        type: "SOLID",
        color: { r: 1, g: 0, b: 0 },
        opacity: 0.5,
      } as SolidPaint;
    }

    // Check if we already have a Figma image hash cached
    if (this.imagePaintCache.has(hash)) {
      console.log(`  ✅ Using cached Figma image hash for ${hash}`);
      return {
        type: "IMAGE",
        imageHash: this.imagePaintCache.get(hash)!,
        scaleMode: fill.scaleMode || "FILL",
      };
    }

    let image: Image | null = null;

    // 1. Try to find in assets
    if (this.assets?.images?.[hash]) {
      console.log(
        `  📁 Found asset for hash ${hash}, attempting to create image`
      );
      try {
        const asset = this.assets.images[hash];
        image = await this.createFigmaImageFromAsset(asset, hash);
        console.log(`  ✅ Successfully created image from asset`);
      } catch (e) {
        console.warn(`  ⚠️ Failed to create image from asset ${hash}`, e);
      }
    } else {
      console.log(`  ⚠️ No asset found for hash ${hash}`);
      console.log(
        `  📂 Available image hashes:`,
        Object.keys(this.assets?.images || {}).slice(0, 5)
      );
    }

    // 2. If not in assets, and hash looks like a URL, try to fetch it
    if (!image && (hash.startsWith("http") || hash.startsWith("data:"))) {
      try {
        console.log(`🌐 [FIGMA] Attempting to fetch image from URL: ${hash}`);
        const response = await fetch(hash);
        console.log(`  👉 Fetch response status: ${response.status}`);
        if (response.ok) {
          const blob = await response.blob();
          const buffer = await blob.arrayBuffer();
          console.log(`  ✅ Got buffer, size: ${buffer.byteLength}`);
          image = figma.createImage(new Uint8Array(buffer));
        } else {
          console.warn(`  ❌ Fetch failed with status: ${response.status}`);
        }
      } catch (e) {
        console.warn(`  ❌ Failed to fetch image from URL ${hash}`, e);
      }
    }

    if (!image) {
      console.error(
        `❌ resolveImagePaint: Image hash "${hash}" not found in assets and fetch failed`
      );
      return {
        type: "SOLID",
        color: { r: 0.8, g: 0.8, b: 0.8 },
        opacity: 0.5,
      } as SolidPaint;
    }

    this.imagePaintCache.set(hash, image.hash);
    console.log(`✅ Created Figma image with hash: ${image.hash}`);

    let scaleMode = fill.scaleMode || "FILL";
    if (fill.objectFit) {
      scaleMode = this.mapObjectFitToScaleMode(fill.objectFit);
    }

    const imagePaint: ImagePaint = {
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode,
      visible: fill.visible !== false,
      ...(fill.objectPosition &&
        fill.objectPosition !== "center center" && {
          imageTransform: this.parseObjectPositionToTransform(
            fill.objectPosition
          ),
        }),
    };

    return imagePaint;
  }

  private mapObjectFitToScaleMode(
    objectFit: string
  ): "FILL" | "FIT" | "CROP" | "TILE" {
    const mapping: Record<string, "FILL" | "FIT" | "CROP" | "TILE"> = {
      fill: "FILL",
      contain: "FIT",
      cover: "CROP",
      none: "CROP",
      "scale-down": "FIT",
    };
    return mapping[objectFit] || "FILL";
  }

  private getFontMetricsRatio(
    actualFont: string,
    originalFont: string
  ): number {
    const fontMetricsMap = new Map<string, number>([
      ["Inter:Arial", 0.98],
      ["Inter:Helvetica", 0.97],
      ["Arial:Inter", 1.02],
      ["Helvetica:Inter", 1.03],
      ["Roboto:Inter", 0.99],
      ["Open Sans:Inter", 1.01],
      ["Lato:Inter", 0.99],
      ["Montserrat:Inter", 1.02],
      ["Source Sans Pro:Inter", 0.98],

      ["Times New Roman:Times", 1.0],
      ["Georgia:Times New Roman", 0.95],

      ["Monaco:Menlo", 1.01],
      ["SF Mono:Monaco", 0.99],
      ["Courier New:Courier", 1.0],
    ]);

    const key = `${originalFont}:${actualFont}`;
    return fontMetricsMap.get(key) || 1.0;
  }

  private parseObjectPositionToTransform(
    objectPosition: string
  ): [[number, number, number], [number, number, number]] {
    const parts = objectPosition.trim().split(/\s+/);
    let xOffset = 0;
    let yOffset = 0;

    if (parts[0]) {
      if (parts[0] === "left") xOffset = -0.5;
      else if (parts[0] === "right") xOffset = 0.5;
      else if (parts[0] === "center") xOffset = 0;
      else if (parts[0].endsWith("%")) {
        const percent = parseFloat(parts[0]) / 100;
        xOffset = percent - 0.5;
      }
    }

    if (parts[1]) {
      if (parts[1] === "top") yOffset = -0.5;
      else if (parts[1] === "bottom") yOffset = 0.5;
      else if (parts[1] === "center") yOffset = 0;
      else if (parts[1].endsWith("%")) {
        const percent = parseFloat(parts[1]) / 100;
        yOffset = percent - 0.5;
      }
    }

    return [
      [1, 0, xOffset],
      [0, 1, yOffset],
    ];
  }

  private async convertStrokesAsync(strokes: any[]): Promise<Paint[]> {
    console.log(`  ✏️ Converting ${strokes.length} strokes`);
    return strokes.map((stroke) => {
      const color = stroke.color || { r: 0, g: 0, b: 0 };
      const { r, g, b } = color;
      return {
        type: "SOLID",
        color: { r, g, b },
        opacity: stroke.opacity !== undefined ? stroke.opacity : color.a ?? 1,
        visible: stroke.visible !== false,
      };
    }) as SolidPaint[];
  }

  private convertEffects(effects: any[]): Effect[] {
    return effects.map((effect) => {
      if (effect.type === "DROP_SHADOW") {
        return {
          type: "DROP_SHADOW",
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible !== false,
          blendMode: effect.blendMode || "NORMAL",
        } as DropShadowEffect;
      }

      if (effect.type === "INNER_SHADOW") {
        return {
          type: "INNER_SHADOW",
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible !== false,
          blendMode: effect.blendMode || "NORMAL",
        } as InnerShadowEffect;
      }

      if (effect.type === "LAYER_BLUR") {
        return {
          type: "LAYER_BLUR",
          radius: effect.radius,
          visible: effect.visible !== false,
        } as BlurEffect;
      }

      if (effect.type === "BACKGROUND_BLUR") {
        return {
          type: "BACKGROUND_BLUR",
          radius: effect.radius,
          visible: effect.visible !== false,
        } as BlurEffect;
      }

      return effect;
    });
  }

  private getScaleModeFromRepeat(
    repeat?: string
  ): "FILL" | "FIT" | "CROP" | "TILE" {
    if (!repeat) return "FILL";

    const repeatLower = repeat.toLowerCase().trim();

    if (repeatLower === "repeat" || repeatLower === "repeat repeat") {
      return "TILE";
    }

    if (repeatLower === "repeat-x" || repeatLower === "repeat-y") {
      return "TILE";
    }

    return "FILL";
  }

  private calculateImageTransform(
    position?: { x: string; y: string },
    size?: { width: string; height: string },
    nodeLayout?: { width: number; height: number },
    imageAsset?: { width: number; height: number }
  ): [[number, number, number], [number, number, number]] | undefined {
    if (!position && !size) return undefined;

    let scaleX = 1;
    let scaleY = 1;
    let translateX = 0;
    let translateY = 0;

    if (size && nodeLayout && imageAsset) {
      const { width: sizeWidth, height: sizeHeight } = size;

      if (sizeWidth === "cover") {
        const scaleRatio = Math.max(
          nodeLayout.width / imageAsset.width,
          nodeLayout.height / imageAsset.height
        );
        scaleX = scaleRatio;
        scaleY = scaleRatio;
      } else if (sizeWidth === "contain") {
        const scaleRatio = Math.min(
          nodeLayout.width / imageAsset.width,
          nodeLayout.height / imageAsset.height
        );
        scaleX = scaleRatio;
        scaleY = scaleRatio;
      } else {
        scaleX = this.parseSizeValue(
          sizeWidth,
          nodeLayout.width,
          imageAsset.width
        );
        scaleY = this.parseSizeValue(
          sizeHeight || sizeWidth,
          nodeLayout.height,
          imageAsset.height
        );
      }
    }

    if (position && nodeLayout && imageAsset) {
      const { x: posX, y: posY } = position;

      const scaledImageWidth = imageAsset.width * scaleX;
      const scaledImageHeight = imageAsset.height * scaleY;

      translateX = this.parsePositionValue(
        posX,
        nodeLayout.width,
        scaledImageWidth
      );
      translateY = this.parsePositionValue(
        posY,
        nodeLayout.height,
        scaledImageHeight
      );

      if (imageAsset.width > 0) {
        translateX = translateX / imageAsset.width;
      }
      if (imageAsset.height > 0) {
        translateY = translateY / imageAsset.height;
      }
    }

    return [
      [scaleX, 0, translateX],
      [0, scaleY, translateY],
    ];
  }

  private parseSizeValue(
    value: string,
    containerSize: number,
    imageSize: number
  ): number {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === "auto") {
      return 1;
    }

    if (trimmed.endsWith("%")) {
      const percentage = parseFloat(trimmed);
      return (containerSize * (percentage / 100)) / imageSize;
    }

    if (trimmed.endsWith("px")) {
      const pixels = parseFloat(trimmed);
      return pixels / imageSize;
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num / imageSize;
    }

    return 1;
  }

  private parsePositionValue(
    value: string,
    containerSize: number,
    imageSize: number
  ): number {
    const trimmed = value.trim().toLowerCase();

    const keywordMap: Record<string, number> = {
      left: 0,
      top: 0,
      center: 0.5,
      right: 1,
      bottom: 1,
    };

    if (trimmed in keywordMap) {
      const ratio = keywordMap[trimmed];
      return (containerSize - imageSize) * ratio;
    }

    if (trimmed.endsWith("%")) {
      const percentage = parseFloat(trimmed) / 100;
      return (containerSize - imageSize) * percentage;
    }

    if (trimmed.endsWith("px")) {
      return parseFloat(trimmed);
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num;
    }

    return 0;
  }

  private async fetchImage(url: string): Promise<Uint8Array> {
    if (this.imageFetchCache.has(url)) {
      return this.imageFetchCache.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    this.imageFetchCache.set(url, bytes);
    return bytes;
  }

  private getPlaceholderColor(data: any): RGB {
    const defaultColor: RGB = { r: 0.92, g: 0.92, b: 0.92 };

    if (
      data?.imageHash &&
      this.assets?.images?.[data.imageHash]?.placeholderColor
    ) {
      const c = this.assets.images[data.imageHash].placeholderColor as any;
      if (
        typeof c.r === "number" &&
        typeof c.g === "number" &&
        typeof c.b === "number"
      ) {
        return { r: c.r, g: c.g, b: c.b };
      }
    }

    const bg =
      data?.style?.backgroundColor || data?.backgroundColor || data?.fillColor;
    if (bg && typeof bg === "string") {
      return defaultColor;
    }

    return defaultColor;
  }

  private findFirstImageHash(nodeData: any): string | undefined {
    if (!nodeData) return undefined;

    const fills = nodeData.fills || nodeData.backgrounds;
    if (Array.isArray(fills)) {
      for (const f of fills) {
        const fill = f?.fill || f;
        if (fill?.type === "IMAGE" && typeof fill.imageHash === "string") {
          return fill.imageHash;
        }
      }
    }

    if (nodeData.imageHash && typeof nodeData.imageHash === "string") {
      return nodeData.imageHash;
    }

    if (Array.isArray(nodeData.children)) {
      for (const child of nodeData.children) {
        const hash = this.findFirstImageHash(child);
        if (hash) return hash;
      }
    }

    return undefined;
  }

  private parseColorString(value?: string): RGB | undefined {
    if (!value || typeof value !== "string") return undefined;

    const hex = value.trim();
    const hexMatch = /^#([0-9a-fA-F]{3,8})$/.exec(hex);
    if (hexMatch) {
      const h = hexMatch[1];
      if (h.length === 3) {
        const r = parseInt(h[0] + h[0], 16) / 255;
        const g = parseInt(h[1] + h[1], 16) / 255;
        const b = parseInt(h[2] + h[2], 16) / 255;
        return { r, g, b };
      }
      if (h.length === 6 || h.length === 8) {
        const r = parseInt(h.slice(0, 2), 16) / 255;
        const g = parseInt(h.slice(2, 4), 16) / 255;
        const b = parseInt(h.slice(4, 6), 16) / 255;
        // ignore alpha; opacity handled separately
        return { r, g, b };
      }
    }

    const rgbMatch =
      /^rgba?\\((\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})(?:\\s*,\\s*(\\d*\\.?\\d+))?\\)$/i.exec(
        hex
      );
    if (rgbMatch) {
      const r = Math.min(255, parseInt(rgbMatch[1], 10)) / 255;
      const g = Math.min(255, parseInt(rgbMatch[2], 10)) / 255;
      const b = Math.min(255, parseInt(rgbMatch[3], 10)) / 255;
      const a = rgbMatch[4]
        ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4])))
        : 1;
      if (a <= 0) return undefined;
      return { r, g, b };
    }

    return undefined;
  }

  private async createFigmaImageFromAsset(
    asset: any,
    hash: string
  ): Promise<Image | null> {
    let base64Candidate: string | undefined =
      asset?.data || asset?.base64 || asset?.screenshot;
    const url = asset?.url;
    const isWebpAsset =
      asset?.mimeType === "image/webp" ||
      asset?.contentType === "image/webp" ||
      (typeof url === "string" && url.toLowerCase().includes(".webp"));
    let isSvgAsset =
      asset?.mimeType?.includes("svg") ||
      asset?.contentType?.includes("svg") ||
      (typeof url === "string" && url.toLowerCase().includes(".svg")) ||
      !!asset?.svgCode;

    if (!isSvgAsset && base64Candidate) {
      const { payload, mimeTypeHint } =
        this.extractDataUrlParts(base64Candidate);
      const clean = this.normalizeBase64Payload(payload);
      if (this.isSvgPayload(clean, payload, mimeTypeHint)) {
        isSvgAsset = true;
      }
    }

    // Handle SVG by rasterizing via Figma before falling back to normal image path
    if (isSvgAsset) {
      try {
        let svgMarkup: string | null = asset?.svgCode || null;
        if (!svgMarkup && base64Candidate) {
          try {
            svgMarkup = this.base64ToString(base64Candidate, {
              allowSvg: true,
            });
          } catch (decodeError) {
            console.warn(
              "SVG base64 decode failed, will try fetch",
              decodeError
            );
          }
        }
        if (!svgMarkup && url) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              svgMarkup = await resp.text();
            }
          } catch (fetchError) {
            console.warn("SVG fetch failed", fetchError);
          }
        }

        if (svgMarkup) {
          // Inline external <use> references so sprite-based icons render
          const inlinedMarkup = await this.inlineSvgUsesInPlugin(
            svgMarkup,
            url
          );
          const vectorRoot = figma.createNodeFromSvg(inlinedMarkup);
          // Resize to expected dimensions if provided
          if (
            typeof asset?.width === "number" &&
            typeof asset?.height === "number" &&
            asset.width > 0 &&
            asset.height > 0
          ) {
            vectorRoot.resize(asset.width, asset.height);
          }
          const pngBytes = await vectorRoot.exportAsync({ format: "PNG" });
          vectorRoot.remove();
          return figma.createImage(pngBytes);
        }
      } catch (svgError) {
        console.warn(
          `❌ SVG rasterization failed for ${hash}, falling back to standard flow`,
          svgError
        );
      }
    }

    let imageBytes: Uint8Array | undefined;
    if (base64Candidate) {
      try {
        imageBytes = await this.base64ToImageBytes(
          base64Candidate,
          isWebpAsset
        );
      } catch (error) {
        console.warn(
          `❌ base64 decode failed for ${hash}, will retry/transcode if possible`,
          error
        );
      }
    }

    if (!imageBytes && url) {
      try {
        console.log(
          `  🔄 [FIGMA] Asset has URL fallback, trying fetch: ${url}`
        );
        imageBytes = await this.fetchImage(url);
        console.log(`  ✅ Fetched bytes from URL: ${imageBytes.length}`);
      } catch (error) {
        console.warn(`  ❌ fetchImage failed for ${hash} (${url})`, error);
      }
    }

    if (!imageBytes && base64Candidate) {
      try {
        imageBytes = await this.base64ToImageBytes(base64Candidate, true);
      } catch (error) {
        console.warn(`❌ forced WebP transcode failed for ${hash}`, error);
      }
    }

    if (!imageBytes || !imageBytes.length) {
      console.warn(`❌ No image bytes available for ${hash}`);
      return null;
    }

    try {
      const image = figma.createImage(imageBytes);
      return image;
    } catch (error: any) {
      const message = error?.message || String(error);
      console.warn(
        `❌ createImage failed for ${hash}: ${message} (bytes=${imageBytes.length})`
      );

      if (
        base64Candidate &&
        message.toLowerCase().includes("unsupported") &&
        !url
      ) {
        try {
          const transBytes = await this.base64ToImageBytes(
            base64Candidate,
            true
          );
          if (transBytes?.length) {
            const image = figma.createImage(transBytes);
            console.log(
              `✅ createImage succeeded after WebP transcode for ${hash}`
            );
            return image;
          }
        } catch (fallbackError) {
          console.warn(
            `❌ createImage still failed after transcode for ${hash}`,
            fallbackError
          );
        }
      }
      return null;
    }
  }

  private isLikelyWebpBase64(clean: string): boolean {
    return clean.startsWith("UklG") || clean.includes("WEBP");
  }

  private async transcodeWebpWithRetry(
    base64: string,
    retries: number = 2
  ): Promise<Uint8Array> {
    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const pngBytes = await requestWebpTranscode(base64);
        if (pngBytes && pngBytes.length > 0) {
          return pngBytes;
        }
        lastError = new Error("Empty transcode result");
      } catch (error) {
        lastError = error;
        await new Promise((resolve) =>
          setTimeout(resolve, 200 * (attempt + 1))
        );
      }
    }
    throw lastError || new Error("WebP transcode failed");
  }

  private extractDataUrlParts(value: string): {
    payload: string;
    mimeTypeHint?: string;
    isBase64: boolean;
  } {
    if (typeof value !== "string") {
      return { payload: "", mimeTypeHint: undefined, isBase64: false };
    }

    if (!value.startsWith("data:")) {
      return { payload: value, mimeTypeHint: undefined, isBase64: true };
    }

    const commaIndex = value.indexOf(",");
    const meta = value.substring(5, commaIndex === -1 ? undefined : commaIndex);
    const payload = commaIndex === -1 ? "" : value.substring(commaIndex + 1);
    const parts = meta.split(";");
    const mimeTypeHint = parts[0] || undefined;
    const isBase64 = parts.includes("base64");

    return { payload, mimeTypeHint, isBase64 };
  }

  private safeDecodeUriComponent(value: string): string {
    if (typeof value !== "string") return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private normalizeBase64Payload(payload: string): string {
    if (typeof payload !== "string") return "";
    let normalized = payload.replace(/\s/g, "");
    normalized = this.safeDecodeUriComponent(normalized);
    normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
    normalized = normalized.replace(/[^A-Za-z0-9+/=]/g, "");
    while (normalized.length % 4 !== 0) {
      normalized += "=";
    }
    return normalized;
  }

  private isSvgPayload(
    normalizedBase64: string,
    rawPayload?: string,
    mimeTypeHint?: string
  ): boolean {
    if (mimeTypeHint && mimeTypeHint.toLowerCase().includes("svg")) {
      return true;
    }
    const raw = rawPayload || "";
    const trimmedRaw = raw.trim();
    if (trimmedRaw.startsWith("<svg") || trimmedRaw.startsWith("<?xml")) {
      return true;
    }
    const clean = normalizedBase64.trim();
    return (
      clean.startsWith("PHN2Zy") ||
      clean.startsWith("PD94bW") ||
      clean.startsWith("c3Zn")
    );
  }

  private stringToUint8Array(value: string): Uint8Array {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(value);
    }
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) {
      bytes[i] = value.charCodeAt(i);
    }
    return bytes;
  }

  private extractSvgMarkup(asset: any): string | null {
    const mimeHint = asset?.mimeType || asset?.contentType;
    const rawSource =
      typeof asset?.data === "string"
        ? asset.data
        : typeof asset?.base64 === "string"
        ? asset.base64
        : typeof asset?.screenshot === "string"
        ? asset.screenshot
        : typeof asset?.url === "string" && asset.url.startsWith("data:")
        ? asset.url
        : undefined;

    if (!rawSource) return null;

    const { payload, mimeTypeHint, isBase64 } =
      this.extractDataUrlParts(rawSource);
    const mime = mimeHint || mimeTypeHint;
    const isSvgMime = mime ? mime.toLowerCase().includes("svg") : false;
    const combinedPayload = rawSource.startsWith("data:") ? payload : rawSource;

    if (isSvgMime && combinedPayload) {
      try {
        if (!isBase64 && combinedPayload.trim().startsWith("<")) {
          return combinedPayload;
        }
        return this.base64ToString(combinedPayload, { allowSvg: true });
      } catch (error) {
        console.warn("Failed to decode SVG data URL", error);
      }
    }

    const looksLikeSvg = this.isSvgPayload(
      this.normalizeBase64Payload(combinedPayload),
      combinedPayload,
      mime
    );
    if (!looksLikeSvg) {
      return null;
    }

    if (combinedPayload.trim().startsWith("<")) {
      return combinedPayload;
    }

    try {
      return this.base64ToString(combinedPayload, { allowSvg: true });
    } catch (error) {
      const decoded = this.safeDecodeUriComponent(combinedPayload);
      if (decoded.trim().startsWith("<")) {
        return decoded;
      }
      console.warn("Unable to decode suspected SVG payload", error);
      return null;
    }
  }

  private createVectorFromSvgMarkup(
    svgString: string,
    data: any
  ): SceneNode | null {
    try {
      const vectorRoot = figma.createNodeFromSvg(svgString);
      vectorRoot.name = data?.name || "Vector";

      const targetWidth = data?.layout?.width;
      const targetHeight = data?.layout?.height;
      if (
        typeof targetWidth === "number" &&
        typeof targetHeight === "number" &&
        targetWidth > 0 &&
        targetHeight > 0
      ) {
        const needsResize =
          Math.abs(vectorRoot.width - targetWidth) > 0.1 ||
          Math.abs(vectorRoot.height - targetHeight) > 0.1;
        if (needsResize) {
          vectorRoot.resize(targetWidth, targetHeight);
        }
      }

      return vectorRoot;
    } catch (error) {
      console.warn("Failed to create vector from SVG markup", error);
      return null;
    }
  }

  private async base64ToImageBytes(
    base64: string,
    forceWebp = false
  ): Promise<Uint8Array> {
    const parts = this.extractDataUrlParts(base64);
    const payload = parts.payload;
    const clean = this.normalizeBase64Payload(payload);

    if (this.isSvgPayload(clean, payload, parts.mimeTypeHint) && !forceWebp) {
      throw new Error("SVG payload detected - not a raster image");
    }

    if (forceWebp || this.isLikelyWebpBase64(clean)) {
      try {
        const pngBytes = await this.transcodeWebpWithRetry(clean);
        if (pngBytes && pngBytes.length > 0) {
          return pngBytes;
        }
        console.warn("⚠️ WebP transcode returned empty result");
      } catch (error) {
        console.warn("❌ WebP transcode failed, cannot create image", error);
        if (!forceWebp) {
          return this.base64ToUint8Array(clean);
        }
        throw error;
      }
    }

    return this.base64ToUint8Array(clean);
  }

  private base64ToUint8Array(base64: string, allowSvg = false): Uint8Array {
    try {
      if (typeof base64 !== "string") {
        throw new Error(`Expected string for base64, got ${typeof base64}`);
      }

      const { payload, mimeTypeHint, isBase64 } =
        this.extractDataUrlParts(base64);
      const decodedPayload = this.safeDecodeUriComponent(payload);
      const clean = this.normalizeBase64Payload(decodedPayload);

      if (this.isSvgPayload(clean, decodedPayload, mimeTypeHint)) {
        if (!allowSvg) {
          console.warn(
            "⚠️ Detected SVG content in image asset. Figma createImage does not support SVGs."
          );
          throw new Error(
            "SVG content detected - cannot create raster image from SVG data"
          );
        }
        if (!isBase64 && decodedPayload.trim().startsWith("<")) {
          return this.stringToUint8Array(decodedPayload);
        }
      }

      if (
        typeof figma !== "undefined" &&
        typeof figma.base64Decode === "function"
      ) {
        return figma.base64Decode(clean);
      }

      if (typeof atob === "function") {
        const binary = atob(clean);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }

      const base64Chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      const sanitized = clean.replace(/[^A-Za-z0-9+/=]/g, "");
      const outputLength =
        Math.floor((sanitized.length * 3) / 4) -
        (sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0);
      const bytes = new Uint8Array(outputLength);

      let buffer = 0;
      let bitsCollected = 0;
      let byteIndex = 0;

      for (let i = 0; i < sanitized.length; i++) {
        const char = sanitized.charAt(i);
        if (char === "=") break;

        const value = base64Chars.indexOf(char);
        if (value === -1) continue;
        buffer = (buffer << 6) | value;
        bitsCollected += 6;
        if (bitsCollected >= 8) {
          bitsCollected -= 8;
          bytes[byteIndex++] = (buffer >> bitsCollected) & 0xff;
        }
      }

      return bytes;
    } catch (error) {
      console.error("❌ base64ToUint8Array failed:", error);
      const snippet =
        typeof base64 === "string"
          ? base64.substring(0, 50) + "..."
          : String(base64);
      console.error("Input snippet:", snippet);
      throw error;
    }
  }

  /**
   * Inline <use> references in an SVG by fetching external sprite symbols when needed.
   * This helps logos/icons defined via sprite sheets render correctly.
   */
  private async inlineSvgUsesInPlugin(
    svgMarkup: string,
    baseUrl?: string
  ): Promise<string> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
      const svg = doc.documentElement;
      const uses = Array.from(svg.querySelectorAll("use"));
      if (!uses.length) return svgMarkup;

      const spriteCache = new Map<string, Document>();

      for (const use of uses) {
        const href =
          use.getAttribute("href") || use.getAttribute("xlink:href") || "";
        if (!href) continue;

        const [urlPart, fragmentPart] = href.split("#");
        const fragment = fragmentPart || "";

        let symbolDoc: Document | null = null;
        if (urlPart) {
          try {
            const absUrl = baseUrl ? new URL(urlPart, baseUrl).href : urlPart;
            if (spriteCache.has(absUrl)) {
              symbolDoc = spriteCache.get(absUrl)!;
            } else {
              const resp = await fetch(absUrl);
              if (resp.ok) {
                const text = await resp.text();
                symbolDoc = parser.parseFromString(text, "image/svg+xml");
                spriteCache.set(absUrl, symbolDoc);
              }
            }
          } catch (fetchErr) {
            console.warn("Failed to fetch external SVG sprite", fetchErr);
          }
        } else {
          symbolDoc = doc;
        }

        if (!symbolDoc || !fragment) continue;

        const symbol =
          symbolDoc.getElementById(fragment) ||
          symbolDoc.querySelector(`symbol#${fragment}`) ||
          symbolDoc.querySelector(`#${fragment}`);
        if (!symbol) continue;

        const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        const symbolClone = symbol.cloneNode(true) as Element;
        if (
          !svg.getAttribute("viewBox") &&
          symbolClone.getAttribute("viewBox")
        ) {
          svg.setAttribute(
            "viewBox",
            symbolClone.getAttribute("viewBox") || ""
          );
        }
        while (symbolClone.firstChild) {
          g.appendChild(symbolClone.firstChild);
        }

        const x = use.getAttribute("x");
        const y = use.getAttribute("y");
        if (x) g.setAttribute("x", x);
        if (y) g.setAttribute("y", y);

        use.parentNode?.replaceChild(g, use);
      }

      return svg.outerHTML;
    } catch (error) {
      console.warn(
        "inlineSvgUsesInPlugin failed, returning original SVG",
        error
      );
      return svgMarkup;
    }
  }

  private base64ToString(
    base64: string,
    options?: { allowSvg?: boolean }
  ): string {
    const normalized = base64.includes(",") ? base64.split(",")[1] : base64;
    const clean = normalized.replace(/\s/g, "");

    const bytes = this.base64ToUint8Array(clean, options?.allowSvg === true);

    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(bytes);
    }

    let result = "";
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  }

  private mapFontWeight(weight: number): string {
    const map: Record<number, string> = {
      100: "Thin",
      200: "Extra Light",
      300: "Light",
      400: "Regular",
      500: "Medium",
      600: "Semi Bold",
      700: "Bold",
      800: "Extra Bold",
      900: "Black",
    };
    return map[weight] || "Regular";
  }

  private applyTransformMatrix(
    node: SceneNode,
    transform: any,
    transformOrigin?: { x: number; y: number; z?: number },
    layout?: { width: number; height: number; x: number; y: number }
  ): void {
    if (!transform?.matrix || !layout) {
      return;
    }

    const matrix = transform.matrix;

    if (matrix.length === 6) {
      const [a, b, c, d, tx, ty] = matrix;

      let finalX = layout.x;
      let finalY = layout.y;

      if (transformOrigin) {
        const originX = this.calculateTransformOriginOffset(
          transformOrigin.x,
          layout.width
        );
        const originY = this.calculateTransformOriginOffset(
          transformOrigin.y,
          layout.height
        );

        const offsetTx = tx + originX * (1 - a) - originY * c;
        const offsetTy = ty + originY * (1 - d) - originX * b;

        finalX += offsetTx;
        finalY += offsetTy;
      } else {
        finalX += tx;
        finalY += ty;
      }

      node.x = finalX;
      node.y = finalY;

      if ("rotation" in node && this.shouldApplyRotation(matrix)) {
        const rotation = Math.atan2(b, a);
        (node as any).rotation = rotation;
      }

      if ("resize" in node && this.shouldApplyScale(matrix)) {
        const scaleX = Math.hypot(a, b);
        const scaleY = Math.hypot(c, d);

        if (scaleX > 0.1 && scaleX < 10 && scaleY > 0.1 && scaleY < 10) {
          const newWidth = Math.max(layout.width * scaleX, 1);
          const newHeight = Math.max(layout.height * scaleY, 1);
          (node as LayoutMixin).resize(newWidth, newHeight);

          this.safeSetPluginData(
            node,
            "appliedScale",
            JSON.stringify({
              scaleX,
              scaleY,
              originalWidth: layout.width,
              originalHeight: layout.height,
            })
          );
        }
      }

      if (this.hasComplexTransform(matrix)) {
        this.safeSetPluginData(
          node,
          "complexTransform",
          JSON.stringify({
            matrix,
            skew: transform.skew,
            decomposed: {
              translate: transform.translate,
              scale: transform.scale,
              rotate: transform.rotate,
              skew: transform.skew,
            },
          })
        );
      }
    } else if (matrix.length === 16) {
      const tx = matrix[12] || 0;
      const ty = matrix[13] || 0;
      const tz = matrix[14] || 0;

      node.x = layout.x + tx;
      node.y = layout.y + ty;

      this.safeSetPluginData(
        node,
        "transform3D",
        JSON.stringify({
          matrix,
          translate: { x: tx, y: ty, z: tz },
          originalPosition: { x: layout.x, y: layout.y },
        })
      );

      console.warn(
        `3D transform applied to "${node.name}" - limited Figma support, stored for reference`
      );
    }
  }

  private calculateTransformOriginOffset(
    value: number,
    dimension: number
  ): number {
    if (value >= 0 && value <= 100) {
      return (value / 100) * dimension - dimension / 2;
    }
    return value - dimension / 2;
  }

  private shouldApplyRotation(matrix: number[]): boolean {
    if (matrix.length !== 6) return false;
    const [a, b] = matrix;
    const rotation = Math.atan2(b, a);
    return Math.abs(rotation) > 0.01;
  }

  private shouldApplyScale(matrix: number[]): boolean {
    if (matrix.length !== 6) return false;
    const [a, b, c, d] = matrix;
    const scaleX = Math.hypot(a, b);
    const scaleY = Math.hypot(c, d);
    return Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01;
  }

  private hasComplexTransform(matrix: number[]): boolean {
    if (matrix.length !== 6) return true;
    const [a, b, c, d] = matrix;

    const crossProduct = a * c + b * d;
    const hasSkew = Math.abs(crossProduct) > 0.01;

    const scaleX = Math.hypot(a, b);
    const scaleY = Math.hypot(c, d);
    const hasNonUniformScale = Math.abs(scaleX - scaleY) > 0.01;

    return hasSkew || hasNonUniformScale;
  }

  private async bindVariablesToNode(
    node: GeometryMixin & SceneNode,
    data: any
  ): Promise<void> {
    if (!this.designTokensManager) return;

    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const fills = node.fills as Paint[];
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        if (fill.type === "SOLID" && "color" in fill) {
          const matchingVariable = this.findMatchingColorVariable(
            fill.color as RGB
          );
          if (matchingVariable) {
            try {
              const alias =
                figma.variables.createVariableAlias(matchingVariable);
              node.fills = [{ ...fill, color: alias as any }];
              console.log(
                `🔗 Bound fill on ${node.name} to variable ${matchingVariable.name}`
              );
              break;
            } catch (error) {
              console.warn(
                `Failed to bind fill variable on ${node.name}:`,
                error
              );
            }
          }
        }
      }
    }

    if (
      node.strokes &&
      Array.isArray(node.strokes) &&
      node.strokes.length > 0
    ) {
      const strokes = node.strokes as Paint[];
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        if (stroke.type === "SOLID" && "color" in stroke) {
          const matchingVariable = this.findMatchingColorVariable(
            stroke.color as RGB
          );
          if (matchingVariable) {
            try {
              const alias =
                figma.variables.createVariableAlias(matchingVariable);
              node.strokes = [{ ...stroke, color: alias as any }];
              console.log(
                `🔗 Bound stroke on ${node.name} to variable ${matchingVariable.name}`
              );
              break;
            } catch (error) {
              console.warn(
                `Failed to bind stroke variable on ${node.name}:`,
                error
              );
            }
          }
        }
      }
    }
  }

  private findMatchingColorVariable(color: RGB): Variable | undefined {
    if (!this.designTokensManager) return undefined;

    const allVariables = Array.from(figma.variables.getLocalVariables());

    const tolerance = 0.01;

    for (const variable of allVariables) {
      if (variable.resolvedType === "COLOR") {
        const collection = figma.variables.getVariableCollectionById(
          variable.variableCollectionId
        );
        if (collection && collection.modes.length > 0) {
          const defaultMode = collection.modes[0];
          const value = variable.valuesByMode[defaultMode.modeId];

          if (value && typeof value === "object" && "r" in value) {
            const varColor = value as RGBA;
            if (
              Math.abs(varColor.r - color.r) < tolerance &&
              Math.abs(varColor.g - color.g) < tolerance &&
              Math.abs(varColor.b - color.b) < tolerance
            ) {
              return variable;
            }
          }
        }
      }
    }

    return undefined;
  }

  private safeSetPluginData(node: SceneNode, key: string, value: string) {
    try {
      node.setPluginData(key, value);
    } catch {
      // Some node types can't store plugin data; ignore
    }
  }
}
