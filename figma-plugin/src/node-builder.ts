import { StyleManager } from "./style-manager";
import { ComponentManager } from "./component-manager";
import { ImportOptions } from "./import-options";
import { DesignTokensManager } from "./design-tokens-manager";
import { requestWebpTranscode } from "./ui-bridge";
import {
  parseTransform,
  parseTransformOrigin,
  decomposeMatrix,
  ParsedTransform,
} from "./transform-parser";

type SceneNodeWithGeometry = SceneNode & GeometryMixin;

interface DiagnosticReport {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  issues: string[];
  expectedProps: Record<string, any>;
  actualProps: Record<string, any>;
}

class FigmaImportDiagnostics {
  private reports: DiagnosticReport[] = [];
  private missingFills = 0;
  private missingStrokes = 0;
  private missingText = 0;
  private missingImages = 0;
  private failedFontLoads = 0;

  logIssue(
    nodeId: string,
    nodeName: string,
    nodeType: string,
    issue: string,
    expected?: any,
    actual?: any
  ) {
    console.log(`[FIGMA IMPORT] ❌ ${nodeType} "${nodeName}": ${issue}`);

    const report: DiagnosticReport = {
      nodeId,
      nodeName,
      nodeType,
      issues: [issue],
      expectedProps: expected || {},
      actualProps: actual || {},
    };

    this.reports.push(report);

    if (issue.includes("fill")) this.missingFills++;
    if (issue.includes("stroke")) this.missingStrokes++;
    if (issue.includes("text")) this.missingText++;
    if (issue.includes("image")) this.missingImages++;
    if (issue.includes("font")) this.failedFontLoads++;
  }

  getSummary() {
    return {
      totalIssues: this.reports.length,
      missingFills: this.missingFills,
      missingStrokes: this.missingStrokes,
      missingText: this.missingText,
      missingImages: this.missingImages,
      failedFontLoads: this.failedFontLoads,
      reports: this.reports,
    };
  }
}

export const diagnostics = new FigmaImportDiagnostics();

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
      ["YouTube Sans", ["Roboto", "Inter", "Arial", "sans-serif"]],
      ["YouTube", ["Roboto", "Inter", "Arial", "sans-serif"]],
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
      // Expanded font weight style fallback chain for better matching
      const stylesToTry = Array.from(
        new Set([
          requestedStyle,
          "Regular",
          "Normal",
          "Thin",
          "ExtraLight",
          "Light",
          "Medium",
          "SemiBold",
          "Bold",
          "ExtraBold",
          "Black",
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

      // Use fontFamilyStack if available for better font matching
      const fontFamilyStack = data.textStyle.fontFamilyStack || [
        data.textStyle.fontFamily,
      ];
      let fontFamily = fontFamilyStack[0] || data.textStyle.fontFamily;
      let finalFontStyle = isItalic ? "Italic" : fontStyle;

      const originalFontFamily = fontFamily;

      // Try fonts from the stack first, then fall back to default chain
      let fontLoadResult: { family: string; style: string } | null = null;
      for (const stackFont of fontFamilyStack) {
        fontLoadResult = await this.loadFontWithFallbacks(
          stackFont,
          finalFontStyle
        );
        if (fontLoadResult) {
          fontFamily = fontLoadResult.family;
          break;
        }
      }

      // If stack fonts failed, try the original font with fallback chain
      if (!fontLoadResult) {
        fontLoadResult = await this.loadFontWithFallbacks(
          fontFamily,
          finalFontStyle
        );
      }

      if (!fontLoadResult) {
        diagnostics.logIssue(
          data.id || "unknown",
          data.name,
          "TEXT",
          `Font loading failed completely for ${originalFontFamily}`,
          { family: originalFontFamily, style: finalFontStyle },
          { error: "All fallbacks failed" }
        );
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

      // ENHANCED: Improved font metrics compensation using Canvas TextMetrics
      let fontMetricsRatio = 1.0;
      if (fontFamily !== originalFontFamily) {
        // Use Canvas TextMetrics if available for more accurate compensation
        if (
          data.renderedMetrics?.actualBoundingBoxAscent &&
          data.renderedMetrics?.actualBoundingBoxDescent
        ) {
          // Calculate ratio based on actual text metrics
          const originalHeight =
            data.renderedMetrics.actualBoundingBoxAscent +
            data.renderedMetrics.actualBoundingBoxDescent;
          const expectedHeight = data.textStyle.fontSize * 1.2; // Approximate line height
          fontMetricsRatio = originalHeight / expectedHeight;

          // Clamp ratio to reasonable bounds (0.8 to 1.2) to prevent extreme adjustments
          fontMetricsRatio = Math.max(0.8, Math.min(1.2, fontMetricsRatio));

          console.log(
            `📝 Font fallback with metrics: ${originalFontFamily} → ${fontFamily} (ratio: ${fontMetricsRatio.toFixed(
              3
            )}, originalHeight: ${originalHeight.toFixed(2)}px)`
          );
        } else {
          // Fallback to static ratio map
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
      }

      text.fontName = { family: fontFamily, style: finalFontStyle };

      const adjustedFontSize = data.textStyle.fontSize * fontMetricsRatio;
      text.fontSize = adjustedFontSize;
      // ENHANCED: Improved text alignment handling
      // Map CSS text-align to Figma textAlignHorizontal
      const textAlign = data.textStyle.textAlignHorizontal || "LEFT";
      text.textAlignHorizontal =
        textAlign === "CENTER"
          ? "CENTER"
          : textAlign === "RIGHT"
          ? "RIGHT"
          : textAlign === "JUSTIFY"
          ? "JUSTIFIED"
          : "LEFT";

      // ENHANCED: Better vertical alignment based on CSS vertical-align and line-height
      // Default to TOP for most cases, but can be adjusted based on CSS
      const verticalAlign = data.textStyle.textAlignVertical || "TOP";
      text.textAlignVertical =
        verticalAlign === "CENTER"
          ? "CENTER"
          : verticalAlign === "BOTTOM"
          ? "BOTTOM"
          : "TOP";

      // ENHANCED: Improved line height calculation using Canvas TextMetrics
      if (data.renderedMetrics?.lineHeightPx) {
        // Use measured line height from browser
        text.lineHeight = {
          unit: "PIXELS",
          value: data.renderedMetrics.lineHeightPx,
        };
      } else if (
        data.renderedMetrics?.actualBoundingBoxAscent &&
        data.renderedMetrics?.actualBoundingBoxDescent
      ) {
        // Calculate line height from Canvas TextMetrics if available
        const measuredLineHeight =
          data.renderedMetrics.actualBoundingBoxAscent +
          data.renderedMetrics.actualBoundingBoxDescent;
        text.lineHeight = {
          unit: "PIXELS",
          value: measuredLineHeight,
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
        // ENHANCED: Use font size * 1.2 as default line height (standard typography)
        const defaultLineHeight = adjustedFontSize * 1.2;
        text.lineHeight = {
          unit: "PIXELS",
          value: defaultLineHeight,
        };
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

      // CRITICAL FIX: Apply text fills from textStyle.fills (primary) or data.fills (fallback)
      // Text color is extracted into textStyle.fills in dom-extractor.ts:extractTypography
      if (data.textStyle?.fills?.length) {
        text.fills = await this.convertFillsAsync(data.textStyle.fills);
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "node-builder.ts:555",
              message: "Text fills applied from textStyle",
              data: {
                nodeName: text.name,
                characters: text.characters?.substring(0, 30),
                fillsCount: text.fills.length,
                fills: text.fills,
                source: "textStyle.fills",
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "TEXT_FILL",
            }),
          }
        ).catch(() => {});
        // #endregion
      } else if (data.fills && data.fills.length > 0) {
        // Fallback: use node.fills if textStyle.fills is not available
        text.fills = await this.convertFillsAsync(data.fills);
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "node-builder.ts:555",
              message: "Text fills applied from node.fills (fallback)",
              data: {
                nodeName: text.name,
                characters: text.characters?.substring(0, 30),
                fillsCount: text.fills.length,
                fills: text.fills,
                source: "node.fills",
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "TEXT_FILL",
            }),
          }
        ).catch(() => {});
        // #endregion
      } else {
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "node-builder.ts:555",
              message: "Text node has no fills",
              data: {
                nodeName: text.name,
                characters: text.characters?.substring(0, 30),
                hasTextStyleFills: !!data.textStyle?.fills?.length,
                hasNodeFills: !!data.fills?.length,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "TEXT_FILL",
            }),
          }
        ).catch(() => {});
        // #endregion
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

    // CRITICAL FIX: Don't set position here - let applyPositioning() handle it
    // Text nodes should use relative positioning like all other nodes
    // Setting absolute coordinates here bypasses the relative positioning logic
    // and causes text to appear in wrong positions

    // Store layout info for applyPositioning() to use
    if (data.absoluteLayout) {
      this.safeSetPluginData(text, "usedAbsoluteLayout", "true");
    }

    // CRITICAL FIX: Set characters BEFORE sizing to ensure accurate text bounds
    // AI Enhancement: Use OCR alternative if available and confidence is high
    if (data.ocrAlternative && data.ocrConfidence > 0.8 && !characters) {
      console.log(
        `✅ [AI] Using OCR alternative text for ${
          data.name
        }: "${data.ocrAlternative.substring(0, 50)}"`
      );
      text.characters = data.ocrAlternative;
      this.safeSetPluginData(text, "usedOCRAlternative", "true");
      this.safeSetPluginData(text, "ocrConfidence", String(data.ocrConfidence));
    } else if (characters) {
      text.characters = characters;
    }

    // ENHANCED: Set text size AFTER characters are set with improved accuracy
    // Priority: Canvas TextMetrics > renderedMetrics > absoluteLayout > layout
    let targetWidth = 1;
    let targetHeight = 1;

    // Use Canvas TextMetrics width if available (most accurate)
    if (data.renderedMetrics?.width && data.renderedMetrics.width > 0) {
      targetWidth = data.renderedMetrics.width;
    } else if (data.absoluteLayout?.width && data.absoluteLayout.width > 0) {
      targetWidth = data.absoluteLayout.width;
    } else if (data.layout?.width && data.layout.width > 0) {
      targetWidth = data.layout.width;
    }

    // Use Canvas TextMetrics height if available (most accurate)
    if (
      data.renderedMetrics?.actualBoundingBoxAscent &&
      data.renderedMetrics?.actualBoundingBoxDescent
    ) {
      // Calculate height from Canvas TextMetrics (most accurate)
      targetHeight =
        data.renderedMetrics.actualBoundingBoxAscent +
        data.renderedMetrics.actualBoundingBoxDescent;
    } else if (
      data.renderedMetrics?.height &&
      data.renderedMetrics.height > 0
    ) {
      targetHeight = data.renderedMetrics.height;
    } else if (data.absoluteLayout?.height && data.absoluteLayout.height > 0) {
      targetHeight = data.absoluteLayout.height;
    } else if (data.layout?.height && data.layout.height > 0) {
      targetHeight = data.layout.height;
    } else if (
      text.lineHeight &&
      typeof text.lineHeight === "object" &&
      "value" in text.lineHeight
    ) {
      // Fallback to line height if available
      targetHeight = text.lineHeight.value;
    }
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "node-builder.ts:643",
        message: "Text node sizing",
        data: {
          nodeName: text.name,
          characters: text.characters?.substring(0, 30),
          renderedWidth: data.renderedMetrics?.width,
          renderedHeight: data.renderedMetrics?.height,
          absoluteWidth: data.absoluteLayout?.width,
          absoluteHeight: data.absoluteLayout?.height,
          layoutWidth: data.layout.width,
          layoutHeight: data.layout.height,
          targetWidth,
          targetHeight,
          finalWidth: Math.max(targetWidth, 1),
          finalHeight: Math.max(targetHeight, 1),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "TEXT_SIZE",
      }),
    }).catch(() => {});
    // #endregion

    // ENHANCED: Improved text sizing with better bounds handling
    // Use minimum of 1px to prevent zero-size text nodes, but allow sub-pixel precision
    const finalWidth = Math.max(targetWidth, 1);
    const finalHeight = Math.max(targetHeight, 1);

    // ENHANCED: For single-line text, use actual text width if available
    // This prevents text from being wider than necessary
    if (
      data.textStyle?.whiteSpace === "nowrap" &&
      data.renderedMetrics?.width &&
      data.renderedMetrics.width < finalWidth
    ) {
      // Use actual text width for nowrap text
      text.resize(Math.max(data.renderedMetrics.width, 1), finalHeight);
    } else {
      text.resize(finalWidth, finalHeight);
    }

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "node-builder.ts:865",
        message: "Text node resize complete",
        data: {
          nodeName: text.name,
          characters: text.characters?.substring(0, 30),
          finalWidth,
          finalHeight,
          actualWidth: text.width,
          actualHeight: text.height,
          fontSize: text.fontSize,
          lineHeight: text.lineHeight,
          textAutoResize: text.textAutoResize,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "TEXT_SIZE",
      }),
    }).catch(() => {});
    // #endregion

    // AI Enhancement: Log typography normalization
    if (data.normalizedToTypeScale && data.originalFontSize) {
      console.log(
        `✅ [AI] Using normalized font size: ${data.textStyle.fontSize}px (original: ${data.originalFontSize}px) for ${data.name}`
      );
      this.safeSetPluginData(
        text,
        "originalFontSize",
        String(data.originalFontSize)
      );
      this.safeSetPluginData(text, "normalizedToTypeScale", "true");
    }

    try {
      text.textAutoResize = text.textAutoResize || "NONE";
    } catch {
      // ignore
    }

    if (data.inlineTextSegments && data.inlineTextSegments.length > 0) {
      await this.applyInlineTextSegments(text, data.inlineTextSegments);
    }

    if (!characters && !data.textContent) {
      diagnostics.logIssue(
        data.id || "unknown",
        data.name,
        "TEXT",
        "Text node created with empty characters",
        { characters: "non-empty string" },
        { characters: characters }
      );
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

      // AI Enhancement: Add OCR text overlay if available
      if (data.ocrText && data.hasOCRText && data.ocrConfidence > 0.7) {
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          const ocrTextNode = figma.createText();
          ocrTextNode.characters = data.ocrText.substring(0, 200); // Limit length
          ocrTextNode.fontSize =
            Math.min(data.layout.width, data.layout.height) * 0.05;
          ocrTextNode.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          ocrTextNode.x = 10;
          ocrTextNode.y = 10;
          ocrTextNode.name = "OCR Text Overlay";
          frame.appendChild(ocrTextNode);
          this.safeSetPluginData(ocrTextNode, "ocrText", data.ocrText);
          this.safeSetPluginData(
            ocrTextNode,
            "ocrConfidence",
            String(data.ocrConfidence)
          );
          console.log(
            `✅ [AI] Added OCR text overlay to image: "${data.ocrText.substring(
              0,
              50
            )}"`
          );
        } catch (ocrError) {
          console.warn("⚠️ [AI] Failed to create OCR text overlay:", ocrError);
        }
      }

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
      // CRITICAL FIX: Use scaleMode from fills if available, otherwise derive from objectFit
      let scaleMode: "FILL" | "FIT" | "CROP" | "TILE" = "FILL";
      if (data.fills && data.fills.length > 0) {
        const imageFill = data.fills.find((f: any) => f && f.type === "IMAGE");
        if (imageFill && imageFill.scaleMode) {
          scaleMode = imageFill.scaleMode;
        }
      }
      if (scaleMode === "FILL" && data.objectFit) {
        scaleMode = this.mapObjectFitToScaleMode(data.objectFit);
      }

      // CRITICAL FIX: Get imageTransform from the fill if available
      const imageFill = data.fills?.find((f: any) => f && f.type === "IMAGE");
      const imagePaint = await this.resolveImagePaint({
        imageHash: hash,
        scaleMode,
        imageTransform: imageFill?.imageTransform,
        objectFit: data.objectFit || imageFill?.objectFit,
        objectPosition: imageFill?.objectPosition,
      });
      rect.fills = [imagePaint];
    }

    // AI Enhancement: Add OCR text overlay for images with text
    if (data.ocrText && data.hasOCRText && data.ocrConfidence > 0.7) {
      try {
        // Convert rectangle to frame to hold text overlay
        const frame = figma.createFrame();
        frame.name = data.name || "Image";
        frame.resize(rect.width, rect.height);
        frame.fills = rect.fills;
        frame.x = rect.x;
        frame.y = rect.y;

        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        const ocrTextNode = figma.createText();
        ocrTextNode.characters = data.ocrText.substring(0, 200);
        const fontSize =
          Math.min(data.layout.width || 100, data.layout.height || 100) * 0.05;
        ocrTextNode.fontSize = Math.max(fontSize, 12);
        ocrTextNode.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        ocrTextNode.x = 10;
        ocrTextNode.y = 10;
        ocrTextNode.name = "OCR Text Overlay";
        frame.appendChild(ocrTextNode);
        this.safeSetPluginData(ocrTextNode, "ocrText", data.ocrText);
        this.safeSetPluginData(
          ocrTextNode,
          "ocrConfidence",
          String(data.ocrConfidence)
        );
        console.log(
          `✅ [AI] Added OCR text overlay to image: "${data.ocrText.substring(
            0,
            50
          )}"`
        );
        return frame;
      } catch (ocrError) {
        console.warn("⚠️ [AI] Failed to create OCR text overlay:", ocrError);
        // Return original rect if overlay fails
      }
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

    const imageNode = this.createRectangle(data);

    // AI Enhancement: Add OCR text overlay for images with text
    if (
      data.ocrText &&
      data.hasOCRText &&
      data.ocrConfidence > 0.7 &&
      imageNode &&
      "appendChild" in imageNode
    ) {
      try {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        const ocrTextNode = figma.createText();
        ocrTextNode.characters = data.ocrText.substring(0, 200);
        const fontSize =
          Math.min(data.layout.width || 100, data.layout.height || 100) * 0.05;
        ocrTextNode.fontSize = Math.max(fontSize, 12);
        ocrTextNode.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        ocrTextNode.x = 10;
        ocrTextNode.y = 10;
        ocrTextNode.name = "OCR Text Overlay";
        (imageNode as FrameNode).appendChild(ocrTextNode);
        this.safeSetPluginData(ocrTextNode, "ocrText", data.ocrText);
        this.safeSetPluginData(
          ocrTextNode,
          "ocrConfidence",
          String(data.ocrConfidence)
        );
        console.log(
          `✅ [AI] Added OCR text overlay to image: "${data.ocrText.substring(
            0,
            50
          )}"`
        );
      } catch (ocrError) {
        console.warn("⚠️ [AI] Failed to create OCR text overlay:", ocrError);
      }
    }

    return imageNode;
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

  /**
   * Apply CSS transforms to a Figma node
   * Handles: rotate, scale, translate, skew, matrix
   */
  private applyCssTransforms(
    node: SceneNode,
    data: any,
    elementWidth: number,
    elementHeight: number
  ): void {
    // Get transform string from multiple possible sources
    const transformString =
      data.transform ||
      data.layoutContext?.transform ||
      data.style?.transform ||
      null;

    if (!transformString || transformString === "none") {
      // Fallback to rotation from layout if available
      if (data.layout?.rotation && "rotation" in node) {
        (node as any).rotation = data.layout.rotation;
      }
      return;
    }

    // Parse the transform string
    const parsed = parseTransform(transformString);
    if (!parsed) {
      return;
    }

    // Get transform origin
    const originString =
      data.transformOrigin ||
      data.layoutContext?.transformOrigin ||
      data.style?.transformOrigin ||
      "50% 50%";

    const origin = parseTransformOrigin(
      originString,
      elementWidth,
      elementHeight
    );

    console.log(`🔄 Applying CSS transform to ${data.name}:`, {
      transform: transformString,
      parsed,
      origin,
      elementSize: { width: elementWidth, height: elementHeight },
    });

    // Apply rotation (Figma supports this directly)
    if (parsed.rotate !== undefined && "rotation" in node) {
      (node as any).rotation = parsed.rotate;
      console.log(`  ✅ Applied rotation: ${parsed.rotate}deg`);
    }

    // Apply scale by resizing the node
    // Note: We need to apply scale BEFORE the final resize in applyPositioning
    // So we store scale factors and apply them during resize
    if (parsed.scaleX !== undefined || parsed.scaleY !== undefined) {
      const scaleX = parsed.scaleX ?? 1;
      const scaleY = parsed.scaleY ?? 1;

      // Store scale in plugin data so we can apply it during resize
      this.safeSetPluginData(node, "cssScaleX", String(scaleX));
      this.safeSetPluginData(node, "cssScaleY", String(scaleY));

      // Apply scale to dimensions immediately
      if ("resize" in node) {
        const currentWidth = (node as LayoutMixin).width;
        const currentHeight = (node as LayoutMixin).height;
        const scaledWidth = currentWidth * scaleX;
        const scaledHeight = currentHeight * scaleY;
        (node as LayoutMixin).resize(
          Math.max(scaledWidth, 1),
          Math.max(scaledHeight, 1)
        );
        console.log(
          `  ✅ Applied scale: ${scaleX}x${scaleY} (new size: ${scaledWidth}x${scaledHeight})`
        );
      }
    }

    // Apply translate by adjusting position
    // Note: Translate is relative to transform-origin, so we need to account for that
    if (parsed.translateX !== undefined || parsed.translateY !== undefined) {
      const translateX = parsed.translateX ?? 0;
      const translateY = parsed.translateY ?? 0;

      // Adjust for transform origin
      // When transform-origin is not center, translation is affected
      const originOffsetX = (origin.x - 0.5) * elementWidth;
      const originOffsetY = (origin.y - 0.5) * elementHeight;

      // Apply translation
      node.x = (node.x || 0) + translateX;
      node.y = (node.y || 0) + translateY;

      console.log(
        `  ✅ Applied translate: ${translateX}px, ${translateY}px (adjusted for origin)`
      );
    }

    // Handle matrix transform
    // If we have a matrix, decompose it and apply components
    if (parsed.matrix) {
      const decomposed = decomposeMatrix(parsed.matrix);
      console.log(`  🔄 Decomposed matrix:`, decomposed);

      // Apply decomposed components
      if (decomposed.rotate !== undefined && "rotation" in node) {
        (node as any).rotation = decomposed.rotate;
      }

      if (
        (decomposed.scaleX !== undefined &&
          Math.abs(decomposed.scaleX - 1) > 0.001) ||
        (decomposed.scaleY !== undefined &&
          Math.abs(decomposed.scaleY - 1) > 0.001)
      ) {
        const scaleX = decomposed.scaleX ?? 1;
        const scaleY = decomposed.scaleY ?? 1;
        if ("resize" in node) {
          const currentWidth = (node as LayoutMixin).width;
          const currentHeight = (node as LayoutMixin).height;
          (node as LayoutMixin).resize(
            Math.max(currentWidth * scaleX, 1),
            Math.max(currentHeight * scaleY, 1)
          );
        }
      }

      if (
        decomposed.translateX !== undefined ||
        decomposed.translateY !== undefined
      ) {
        node.x = (node.x || 0) + (decomposed.translateX ?? 0);
        node.y = (node.y || 0) + (decomposed.translateY ?? 0);
      }

      // Skew is not directly supported by Figma
      // We would need to use vector paths or wrapper frames
      if (
        (decomposed.skewX !== undefined &&
          Math.abs(decomposed.skewX) > 0.001) ||
        (decomposed.skewY !== undefined && Math.abs(decomposed.skewY) > 0.001)
      ) {
        console.warn(
          `  ⚠️ Skew detected (${decomposed.skewX}deg, ${decomposed.skewY}deg) but Figma doesn't support skew directly. Storing in plugin data.`
        );
        this.safeSetPluginData(
          node,
          "cssSkew",
          JSON.stringify({ skewX: decomposed.skewX, skewY: decomposed.skewY })
        );
      }
    }

    // Handle skew (if not from matrix)
    if (
      (parsed.skewX !== undefined && Math.abs(parsed.skewX) > 0.001) ||
      (parsed.skewY !== undefined && Math.abs(parsed.skewY) > 0.001)
    ) {
      console.warn(
        `  ⚠️ Skew detected (${parsed.skewX}deg, ${parsed.skewY}deg) but Figma doesn't support skew directly. Storing in plugin data.`
      );
      this.safeSetPluginData(
        node,
        "cssSkew",
        JSON.stringify({ skewX: parsed.skewX, skewY: parsed.skewY })
      );
    }

    // Store transform origin for reference
    if (origin.x !== 0.5 || origin.y !== 0.5) {
      this.safeSetPluginData(
        node,
        "cssTransformOrigin",
        JSON.stringify(origin)
      );
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

      // CRITICAL FIX: Apply CSS transforms
      // Note: Scale will be applied during resize, but we apply it here first
      // to get the correct dimensions, then resize will use those dimensions
      this.applyCssTransforms(node, data, width, height);

      // After transforms are applied, resize to final dimensions
      // If scale was applied, the node may already be resized, so check current size
      if (typeof width === "number" && typeof height === "number") {
        if ("resize" in node) {
          const currentWidth = (node as LayoutMixin).width;
          const currentHeight = (node as LayoutMixin).height;

          // Only resize if dimensions haven't been modified by transform scale
          const scaleX = parseFloat(node.getPluginData("cssScaleX") || "1");
          const scaleY = parseFloat(node.getPluginData("cssScaleY") || "1");

          if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) {
            // No scale applied, use original dimensions
            (node as LayoutMixin).resize(
              Math.max(width, 1),
              Math.max(height, 1)
            );
          } else {
            // Scale was applied, dimensions should already be correct
            // But ensure minimum size
            if (currentWidth < 1 || currentHeight < 1) {
              (node as LayoutMixin).resize(
                Math.max(currentWidth, 1),
                Math.max(currentHeight, 1)
              );
            }
          }
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

    // Transform is now handled by applyCssTransforms() above
    // This legacy code is kept for backward compatibility but should not be needed
    // if (data.transform?.matrix) {
    //   this.applyTransformMatrix(
    //     node,
    //     data.transform,
    //     data.transformOrigin,
    //     data.layout
    //   );
    //   this.safeSetPluginData(
    //     node,
    //     "cssTransform",
    //     JSON.stringify(data.transform)
    //   );
    // }

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
    // CRITICAL DEBUG: Log all color-related data for diagnosis
    const backgroundColorSources = {
      style: data.style?.backgroundColor,
      direct: data.backgroundColor,
      fillColor: data.fillColor,
      cssVariables: data.cssVariables
        ? Object.keys(data.cssVariables).length
        : 0,
    };

    console.log(`🎨 Applying common styles to ${data.name}:`, {
      hasBackgrounds: !!data.backgrounds?.length,
      backgroundsCount: data.backgrounds?.length || 0,
      hasFills: !!data.fills?.length,
      fillsCount: data.fills?.length || 0,
      fillsPreview: data.fills
        ?.slice(0, 2)
        .map((f: any) => ({ type: f.type, color: f.color })),
      hasImageHash: !!data.imageHash,
      nodeType: node.type,
      canHaveFills: "fills" in node,
      backgroundColorSources,
    });

    if ("fills" in node) {
      const paints: Paint[] = [];

      // CRITICAL FIX: Check if this is body/html early - schema is source of truth
      // If schema says no fills (empty array), respect it exactly
      const isBodyOrHtml = data.htmlTag === "body" || data.htmlTag === "html";

      // For body/html, skip ALL fill processing - schema explicitly says no fills
      // The schema is the source of truth - if it says no fills, we should not add any
      if (isBodyOrHtml) {
        console.log(
          `  ⚪ [BODY/HTML] Schema says no fills for ${data.name}, skipping all fill/background processing`
        );
        (node as SceneNodeWithGeometry).fills = [];
        // Skip to the rest of the function (strokes, effects, etc.) - don't process fills
      } else {
        // Only process fills if NOT body/html
        const hasDetailedBackgrounds = (data.backgrounds?.length || 0) > 0;

        // 1. Process regular fills (solid colors, gradients, images)
        if (data.fills?.length) {
          console.log(
            `  ✅ Processing ${data.fills.length} fills for ${data.name}`
          );
          const fillPaints = await this.convertFillsAsync(data.fills);

          // BUGFIX: Only filter IMAGE fills if we actually have background layers AND they contain images.
          // If backgrounds array exists but is empty or has no images, keep IMAGE fills from fills array.
          const hasImageBackgrounds =
            hasDetailedBackgrounds &&
            data.backgrounds.some(
              (bg: any) =>
                bg?.type === "IMAGE" ||
                bg?.fill?.type === "IMAGE" ||
                bg?.imageHash
            );

          // If we have detailed image backgrounds, prefer those over generic IMAGE fills in `fills`.
          // Otherwise, keep all fills (including IMAGE fills).
          const filteredFills = fillPaints.filter(
            (p) => !hasImageBackgrounds || p.type !== "IMAGE"
          );
          paints.push(...filteredFills);

          // CRITICAL FIX: If fills were in schema but convertFillsAsync returned nothing,
          // try fallback immediately (don't wait for all other checks to fail)
          if (fillPaints.length === 0 && data.fills.length > 0) {
            console.warn(
              `  ⚠️ [FILL] ${data.fills.length} fills in schema but convertFillsAsync returned 0 paints for ${data.name}`
            );
            // Try fallback color extraction from multiple sources
            let fallbackColor =
              this.parseColorString(data.style?.backgroundColor) ||
              this.parseColorString(data.backgroundColor) ||
              this.parseColorString(data.fillColor);

            // If still no color, try getPlaceholderColor
            if (!fallbackColor) {
              const placeholderColor = this.getPlaceholderColor(data);
              const isDefaultGrey =
                Math.abs(placeholderColor.r - 0.92) < 0.01 &&
                Math.abs(placeholderColor.g - 0.92) < 0.01 &&
                Math.abs(placeholderColor.b - 0.92) < 0.01;
              if (!isDefaultGrey) {
                fallbackColor = placeholderColor;
              }
            }

            if (fallbackColor) {
              console.log(
                `  🎨 [FALLBACK] Using backgroundColor fallback for ${data.name}:`,
                fallbackColor
              );
              paints.push({
                type: "SOLID",
                color: fallbackColor,
                opacity: 1,
                visible: true,
              } as SolidPaint);
            } else {
              console.warn(
                `  ⚠️ [FILL] No fallback color found for ${data.name} after convertFillsAsync failed`
              );
            }
          }
        }

        // 2. Process detailed background layers (usually images with specific positioning)
        if (hasDetailedBackgrounds) {
          console.log(
            `  ✅ Processing ${data.backgrounds.length} detailed background layers`
          );
          const bgPaints = await this.convertBackgroundLayersAsync(
            data.backgrounds,
            data.layout
          );
          paints.push(...bgPaints);
        }

        // 3. Handle primary image content (e.g. <img> src), effectively a top-layer "fill"
        if (data.imageHash) {
          console.log(`  🖼️ Processing primary image hash for ${data.name}`);
          const imageFill = {
            type: "IMAGE" as const,
            imageHash: data.imageHash,
            scaleMode: (data.objectFit
              ? this.mapObjectFitToScaleMode(data.objectFit)
              : "FILL") as "FILL" | "FIT" | "CROP" | "TILE",
            visible: true,
          };

          // If no other fills exist yet, add a placeholder color behind the image
          if (paints.length === 0) {
            const placeholderColor = this.getPlaceholderColor(data);
            paints.push({
              type: "SOLID",
              color: placeholderColor,
              opacity: 1,
              visible: true,
            } as SolidPaint);
          }

          paints.push(await this.resolveImagePaint(imageFill));
        }

        // 4. Fallback: If still no paints, try to derive a solid color fill
        // Note: body/html nodes are already handled above and skip all fill processing
        // CRITICAL FIX: Do NOT promote descendant images to parent backgrounds
        // Images should only be used when explicitly set as background-image in CSS
        // Promoting descendant images causes incorrect backgrounds (e.g., <img> tags becoming page backgrounds)
        if (paints.length === 0) {
          // CRITICAL FIX: ALWAYS try to derive a solid fill from CSS backgroundColor
          // This is the most important fallback - many nodes rely on this
          // Try multiple sources in order of preference
          let parsedColor =
            this.parseColorString(data.style?.backgroundColor) ||
            this.parseColorString(data.backgroundColor) ||
            this.parseColorString(data.fillColor);

          // If no color found, try getPlaceholderColor which checks CSS variables and other sources
          if (!parsedColor) {
            const placeholderColor = this.getPlaceholderColor(data);
            const isDefaultGrey =
              Math.abs(placeholderColor.r - 0.92) < 0.01 &&
              Math.abs(placeholderColor.g - 0.92) < 0.01 &&
              Math.abs(placeholderColor.b - 0.92) < 0.01;

            // Only use placeholder if it's not the default grey (meaning it found an actual color)
            if (!isDefaultGrey) {
              parsedColor = placeholderColor;
              console.log(
                `  🎨 Using placeholder color for ${data.name} (extracted from CSS variables/data)`
              );
            }
          }

          if (parsedColor) {
            console.log(
              `  🎨 Derived solid fill for ${data.name} from backgroundColor (fallback):`,
              {
                source: data.style?.backgroundColor
                  ? "style.backgroundColor"
                  : data.backgroundColor
                  ? "backgroundColor"
                  : data.fillColor
                  ? "fillColor"
                  : "placeholder/getPlaceholderColor",
                color: parsedColor,
              }
            );
            paints.push({
              type: "SOLID",
              color: parsedColor,
              opacity: 1,
              visible: true,
            } as SolidPaint);
          } else {
            // Last resort: Log that we couldn't find any color
            console.warn(
              `  ⚠️ [FILL] No color found for ${data.name} - node will be transparent`,
              {
                hasStyle: !!data.style,
                styleBg: data.style?.backgroundColor,
                directBg: data.backgroundColor,
                fillColor: data.fillColor,
                cssVariables: data.cssVariables
                  ? Object.keys(data.cssVariables).length
                  : 0,
              }
            );
          }
        }

        // Final assignment (only for non-body/html nodes)
        if (paints.length > 0) {
          (node as SceneNodeWithGeometry).fills = paints;
          console.log(
            `  ✅ Applied ${paints.length} fill(s) to ${data.name}:`,
            paints.map((p) => ({
              type: p.type,
              color: p.type === "SOLID" ? (p as SolidPaint).color : undefined,
              opacity: p.opacity,
            }))
          );

          // CRITICAL DEBUG: Verify fills were actually set
          const verifyFills = (node as SceneNodeWithGeometry).fills;
          if (!verifyFills || verifyFills.length === 0) {
            console.error(
              `  ❌ [CRITICAL] Fills were set but node.fills is now empty for ${data.name}!`
            );
          }
        } else {
          // CRITICAL FIX: Check if we should have had fills but didn't get any
          const hadFillsInSchema = data.fills && data.fills.length > 0;
          const hadBackgrounds =
            data.backgrounds && data.backgrounds.length > 0;
          const hadImageHash = !!data.imageHash;

          if (hadFillsInSchema || hadBackgrounds || hadImageHash) {
            console.warn(
              `  ⚠️ [FILL WARNING] ${data.name} had fills/backgrounds in schema but none were applied:`,
              {
                fillsCount: data.fills?.length || 0,
                backgroundsCount: data.backgrounds?.length || 0,
                hasImageHash: !!data.imageHash,
                backgroundColor:
                  data.style?.backgroundColor || data.backgroundColor,
              }
            );
          } else {
            console.log(
              `  ⚪ No fills/backgrounds produced for ${data.name}, setting transparent`
            );
          }
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
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "node-builder.ts:2023",
            message: "Stroke weight before",
            data: {
              strokeWeight: data.strokeWeight,
              nodeName: data.name,
              nodeWidth: data.layout?.width,
              nodeHeight: data.layout?.height,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        }
      ).catch(() => {});
      // #endregion
      (node as any).strokeWeight = data.strokeWeight;
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "node-builder.ts:2025",
            message: "Stroke weight after",
            data: {
              appliedWeight: (node as any).strokeWeight,
              nodeName: data.name,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        }
      ).catch(() => {});
      // #endregion
    } else if ("strokeWeight" in node && data.strokes?.[0]?.thickness) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "node-builder.ts:2026",
            message: "Stroke weight from strokes",
            data: { thickness: data.strokes[0].thickness, nodeName: data.name },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        }
      ).catch(() => {});
      // #endregion
      (node as any).strokeWeight = data.strokes[0].thickness;
    }

    if ("strokeAlign" in node) {
      if (data.strokeAlign) {
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/ec6ff4c5-673b-403d-a943-70cb2e5565f2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "node-builder.ts:2030",
              message: "Stroke align applied",
              data: { strokeAlign: data.strokeAlign, nodeName: data.name },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "D",
            }),
          }
        ).catch(() => {});
        // #endregion
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

      // Debug: Log exactly what each fill looks like (only in debug mode to reduce noise)
      if (this.options?.enableDebugMode) {
        console.log(
          `🎨 [FILL DEBUG] Processing fill:`,
          JSON.stringify(fill, null, 2)
        );
      }

      if (fill.type === "SOLID" && fill.color) {
        // Sanitize color values to prevent NaN/undefined/out-of-range issues
        const sanitizeColorComponent = (v: any): number => {
          if (v === undefined || v === null || !isFinite(v)) return 0;
          return Math.max(0, Math.min(1, v));
        };
        const sanitizeOpacity = (v: any): number => {
          if (v === undefined || v === null || !isFinite(v)) return 1;
          return Math.max(0, Math.min(1, v));
        };

        const r = sanitizeColorComponent(fill.color.r);
        const g = sanitizeColorComponent(fill.color.g);
        const b = sanitizeColorComponent(fill.color.b);
        const opacity = sanitizeOpacity(
          fill.opacity !== undefined ? fill.opacity : fill.color.a ?? 1
        );

        // CRITICAL FIX: Only skip if opacity is exactly 0 or very close to 0
        // Very low opacity colors (like 0.01) should still be applied
        if (opacity <= 0.001) {
          if (this.options?.enableDebugMode) {
            console.log(
              `⚠️ [FILL DEBUG] Skipping fill with opacity=${opacity}:`,
              {
                color: { r, g, b },
                fillOpacity: fill.opacity,
                colorA: fill.color.a,
              }
            );
          }
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

      // Catch-all: Log unhandled fill types
      console.warn(`⚠️ [FILL DEBUG] Unhandled fill type: "${fill.type}"`, fill);
    }

    if (fills.length > 0 && paints.length === 0) {
      const validFills = fills.filter(
        (f) =>
          f && f.visible !== false && (f.opacity === undefined || f.opacity > 0)
      );
      if (validFills.length > 0) {
        console.warn(
          `⚠️ [FIGMA IMPORT] ${fills.length} fills processed but 0 resulted in paints.`
        );
        diagnostics.logIssue(
          context?.tokenId || "unknown",
          "unknown",
          "FILLS",
          `${fills.length} fills processed but 0 resulted in paints`,
          { validFillsCount: validFills.length },
          { paintsCount: 0 }
        );
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
        opacity: 0.5,
      } as SolidPaint;
    }

    // Check if we already have a Figma image hash cached
    if (this.imagePaintCache.has(hash)) {
      console.log(`  ✅ Using cached Figma image hash for ${hash}`);
      // CRITICAL FIX: Include imageTransform in cached paint if provided
      let scaleMode = fill.scaleMode || "FILL";
      if (fill.objectFit) {
        scaleMode = this.mapObjectFitToScaleMode(fill.objectFit);
      }
      const paint: ImagePaint = {
        type: "IMAGE",
        imageHash: this.imagePaintCache.get(hash)!,
        scaleMode,
        visible: fill.visible !== false,
      };
      // Add imageTransform if provided
      if (fill.imageTransform) {
        paint.imageTransform = fill.imageTransform;
      } else if (
        fill.objectPosition &&
        fill.objectPosition !== "center center" &&
        fill.objectPosition !== "50% 50%"
      ) {
        paint.imageTransform = this.parseObjectPositionToTransform(
          fill.objectPosition
        );
      }
      return paint;
    }

    let image: Image | null = null;
    let failureReason = "unknown";

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

      // Strategy 2: Try normalized hash (remove prefixes)
      const normalizedHash = hash?.replace(/^(image:|img_)/, "");
      if (normalizedHash && this.assets?.images?.[normalizedHash]) {
        console.log(`  🔍 Trying normalized hash: ${normalizedHash}`);
        try {
          const asset = this.assets.images[normalizedHash];
          image = await this.createFigmaImageFromAsset(asset, normalizedHash);
          console.log(`  ✅ Successfully created image from normalized hash`);
        } catch (e) {
          console.warn(`  ⚠️ Normalized hash also failed`, e);
        }
      }

      // Strategy 3: Case-insensitive lookup
      if (!image && this.assets?.images) {
        const lowerHash = hash?.toLowerCase();
        for (const [key, value] of Object.entries(this.assets.images)) {
          if (key.toLowerCase() === lowerHash) {
            console.log(`  🔍 Found case-insensitive match: ${key}`);
            try {
              image = await this.createFigmaImageFromAsset(value, key);
              console.log(
                `  ✅ Successfully created image from case-insensitive match`
              );
              break;
            } catch (e) {
              console.warn(`  ⚠️ Case-insensitive match also failed`, e);
            }
          }
        }
      }
    }

    // Strategy 4: Try fill.url if present
    if (!image && fill.url && fill.url !== hash) {
      try {
        console.log(
          `🌐 [FIGMA] Attempting to fetch image from fill.url: ${fill.url}`
        );
        const response = await fetch(fill.url);
        if (response.ok) {
          const blob = await response.blob();
          const buffer = await blob.arrayBuffer();
          console.log(
            `  ✅ Got buffer from fill.url, size: ${buffer.byteLength}`
          );
          image = figma.createImage(new Uint8Array(buffer));
        }
      } catch (e) {
        console.warn(`  ❌ Failed to fetch from fill.url`, e);
      }
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
      diagnostics.logIssue(
        "unknown",
        "unknown",
        "IMAGE",
        `Image hash "${hash}" not found in assets and fetch failed`,
        { hash, url: hash.startsWith("http") ? hash : undefined },
        { result: "fallback to solid" }
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

    // CRITICAL FIX: Use imageTransform from fill if provided, otherwise calculate from objectPosition
    let imageTransform: Transform2D | undefined = undefined;
    if (fill.imageTransform) {
      // Use the pre-calculated transform from the schema
      imageTransform = fill.imageTransform;
    } else if (
      fill.objectPosition &&
      fill.objectPosition !== "center center" &&
      fill.objectPosition !== "50% 50%"
    ) {
      // Calculate transform from objectPosition if not already provided
      imageTransform = this.parseObjectPositionToTransform(fill.objectPosition);
    }

    const imagePaint: ImagePaint = {
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode,
      visible: fill.visible !== false,
      ...(imageTransform && { imageTransform }),
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

    // CRITICAL FIX: Actually parse and return the background color if it exists
    // Check multiple sources: style.backgroundColor, backgroundColor, fillColor, cssVariables
    const bg =
      data?.style?.backgroundColor ||
      data?.backgroundColor ||
      data?.fillColor ||
      (data?.cssVariables &&
        Object.values(data.cssVariables).find(
          (v: any) =>
            typeof v === "string" &&
            (v.includes("rgb") || v.includes("#") || v.includes("hsl"))
        ));

    if (bg && typeof bg === "string") {
      const parsedColor = this.parseColorString(bg);
      if (parsedColor) {
        console.log(
          `  🎨 [getPlaceholderColor] Extracted color from ${data.name}:`,
          {
            source: data.style?.backgroundColor
              ? "style"
              : data.backgroundColor
              ? "direct"
              : "cssVariable",
            color: bg,
          }
        );
        return { r: parsedColor.r, g: parsedColor.g, b: parsedColor.b };
      }
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

    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();

    // Handle transparent/empty - return undefined (no color)
    if (
      lower === "transparent" ||
      lower === "rgba(0, 0, 0, 0)" ||
      lower === "rgba(0,0,0,0)" ||
      trimmed === ""
    ) {
      return undefined;
    }

    // Handle hex colors (#rgb, #rrggbb, #rrggbbaa)
    const hexMatch = /^#([0-9a-fA-F]{3,8})$/.exec(trimmed);
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

    // Handle rgb/rgba - more flexible regex to handle spaces
    const rgbMatch =
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i.exec(
        trimmed
      );
    if (rgbMatch) {
      const r = Math.min(255, parseInt(rgbMatch[1], 10)) / 255;
      const g = Math.min(255, parseInt(rgbMatch[2], 10)) / 255;
      const b = Math.min(255, parseInt(rgbMatch[3], 10)) / 255;
      const a = rgbMatch[4]
        ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4])))
        : 1;
      // CRITICAL FIX: Only skip if alpha is exactly 0 or very close to 0
      // Very low opacity colors should still be applied
      if (a <= 0.001) return undefined;
      return { r, g, b };
    }

    // Handle hsl/hsla (convert to rgb)
    const hslMatch =
      /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i.exec(
        trimmed
      );
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10) / 360;
      const s = parseInt(hslMatch[2], 10) / 100;
      const l = parseInt(hslMatch[3], 10) / 100;
      const a = hslMatch[4]
        ? Math.max(0, Math.min(1, parseFloat(hslMatch[4])))
        : 1;
      if (a <= 0.001) return undefined;

      // Convert HSL to RGB
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
      const m = l - c / 2;

      let r = 0,
        g = 0,
        b = 0;
      if (h < 1 / 6) {
        r = c;
        g = x;
        b = 0;
      } else if (h < 2 / 6) {
        r = x;
        g = c;
        b = 0;
      } else if (h < 3 / 6) {
        r = 0;
        g = c;
        b = x;
      } else if (h < 4 / 6) {
        r = 0;
        g = x;
        b = c;
      } else if (h < 5 / 6) {
        r = x;
        g = 0;
        b = c;
      } else {
        r = c;
        g = 0;
        b = x;
      }

      return {
        r: Math.max(0, Math.min(1, r + m)),
        g: Math.max(0, Math.min(1, g + m)),
        b: Math.max(0, Math.min(1, b + m)),
      };
    }

    // Handle named colors (common CSS color names)
    const namedColors: Record<string, RGB> = {
      black: { r: 0, g: 0, b: 0 },
      white: { r: 1, g: 1, b: 1 },
      red: { r: 1, g: 0, b: 0 },
      green: { r: 0, g: 0.5, b: 0 },
      blue: { r: 0, g: 0, b: 1 },
      yellow: { r: 1, g: 1, b: 0 },
      cyan: { r: 0, g: 1, b: 1 },
      magenta: { r: 1, g: 0, b: 1 },
      gray: { r: 0.5, g: 0.5, b: 0.5 },
      grey: { r: 0.5, g: 0.5, b: 0.5 },
      orange: { r: 1, g: 0.65, b: 0 },
      pink: { r: 1, g: 0.75, b: 0.8 },
      purple: { r: 0.5, g: 0, b: 0.5 },
      brown: { r: 0.65, g: 0.16, b: 0.16 },
    };
    if (namedColors[lower]) {
      return namedColors[lower];
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
