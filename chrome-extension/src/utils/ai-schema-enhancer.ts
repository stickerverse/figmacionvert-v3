/**
 * AI Schema Enhancer
 *
 * Enhances the generated schema using AI model results to improve:
 * - Layout inference
 * - Style reconstruction
 * - Missing CSS properties
 * - Element hierarchy and grouping
 * - Image/SVG/asset classification
 * - Typography inference and normalization
 */

import {
  WebToFigmaSchema,
  ElementNode,
  OCRResult,
  ColorPaletteResult,
  MLComponentDetections,
  ComponentRegistry,
} from "../types/schema";

export interface AIEnhancementContext {
  ocr?: OCRResult;
  colorPalette?: ColorPaletteResult;
  mlComponents?: MLComponentDetections;
  typography?: any;
  spacingScale?: any;
  // Note: All enhancement is now pixel-perfect by default
}

export class AISchemaEnhancer {
  private aiContext: AIEnhancementContext;
  private enhancementsApplied: {
    ocrTextFilled: number;
    colorsFilled: number;
    componentsEnhanced: number;
    typographyNormalized: number;
    layoutImproved: number;
  } = {
    ocrTextFilled: 0,
    colorsFilled: 0,
    componentsEnhanced: 0,
    typographyNormalized: 0,
    layoutImproved: 0,
  };

  constructor(aiContext: AIEnhancementContext) {
    this.aiContext = aiContext;
  }

  /**
   * Enhance the entire schema with AI results
   */
  enhanceSchema(schema: WebToFigmaSchema): WebToFigmaSchema {
    if (!schema.root) {
      console.warn("[AI-Enhancer] Schema has no root, skipping enhancement");
      return schema;
    }

    console.log(
      `[AI-Enhancer] 🤖 Starting pixel-perfect schema enhancement`
    );

    // Enhance the tree recursively
    this.enhanceNode(schema.root, schema);

    // Apply global registry enhancements (always enabled for full fidelity)
    this.enhanceStyles(schema);
    this.enhanceComponents(schema);

    // Log enhancement summary
    console.log("[AI-Enhancer] 📊 Enhancement Summary:");
    console.log(
      `   OCR text filled: ${this.enhancementsApplied.ocrTextFilled}`
    );
    console.log(`   Colors filled: ${this.enhancementsApplied.colorsFilled}`);
    console.log(
      `   Components enhanced: ${this.enhancementsApplied.componentsEnhanced}`
    );
    console.log(
      `   Typography normalized: ${this.enhancementsApplied.typographyNormalized}`
    );
    console.log(
      `   Layout improved: ${this.enhancementsApplied.layoutImproved}`
    );

    return schema;
  }

  /**
   * Recursively enhance a node and its children
   */
  private enhanceNode(node: ElementNode, schema: WebToFigmaSchema): void {
    if (!node) return;

    // Apply all enhancements for pixel-perfect capture
    this.enhanceNodeWithOCR(node);
    this.enhanceNodeWithColorPalette(node, schema);
    this.enhanceNodeWithMLDetections(node, schema);
    this.enhanceNodeWithTypography(node);
    this.enhanceNodeLayout(node);

    // Recursively enhance children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child) => this.enhanceNode(child, schema));
    }
  }

  /**
   * Use OCR to fill missing text in images, canvas, or elements without text
   */
  private enhanceNodeWithOCR(node: ElementNode): void {
    if (!this.aiContext.ocr || !this.aiContext.ocr.words) return;

    // Check if node is an image/canvas without text
    const isImage =
      node.type === "IMAGE" ||
      node.htmlTag === "img" ||
      node.htmlTag === "canvas";
    const hasNoText = !node.characters || node.characters.trim().length === 0;
    const isTextNode = node.type === "TEXT";

    if (isImage && hasNoText) {
      // Try to find OCR text near this image's position
      const nodeRect = node.layout;
      if (nodeRect) {
        const nearbyWords = this.findNearbyOCRWords(
          nodeRect,
          this.aiContext.ocr.words
        );
        if (nearbyWords.length > 0) {
          // Add text overlay or store OCR data
          (node as any).ocrText = nearbyWords.map((w) => w.text).join(" ");
          (node as any).ocrConfidence =
            nearbyWords.reduce((sum, w) => sum + (w.confidence || 0), 0) /
            nearbyWords.length;

          // For images, create a text overlay node if significant text found
          if ((node as any).ocrText.length > 3) {
            // Store OCR text for Figma plugin to create overlay
            (node as any).hasOCRText = true;
            this.enhancementsApplied.ocrTextFilled++;
            console.log(
              `[AI-Enhancer] ✅ Filled OCR text for ${node.name}: "${(
                node as any
              ).ocrText.substring(0, 50)}"`
            );
          }
        }
      }
    }

    // Enhance text nodes with OCR verification
    if (isTextNode && node.characters && this.aiContext.ocr.words) {
      const nodeText = node.characters.toLowerCase();
      const ocrText = this.aiContext.ocr.fullText.toLowerCase();

      // If DOM text doesn't match OCR, OCR might be more accurate (e.g., for styled text)
      if (!ocrText.includes(nodeText) && nodeText.length > 3) {
        // Check if OCR found similar text nearby
        const nodeRect = node.layout;
        if (nodeRect) {
          const nearbyWords = this.findNearbyOCRWords(
            nodeRect,
            this.aiContext.ocr.words
          );
          if (nearbyWords.length > 0) {
            const ocrText = nearbyWords.map((w) => w.text).join(" ");
            // If OCR text is significantly different, it might be more accurate
            if (
              ocrText.length > nodeText.length * 0.8 &&
              ocrText.length < nodeText.length * 1.5
            ) {
              (node as any).ocrAlternative = ocrText;
              (node as any).ocrConfidence =
                nearbyWords.reduce((sum, w) => sum + (w.confidence || 0), 0) /
                nearbyWords.length;

              // If OCR confidence is high, consider using OCR text
              if ((node as any).ocrConfidence > 0.8) {
                console.log(
                  `[AI-Enhancer] ⚠️ High-confidence OCR alternative found for ${
                    node.name
                  }: "${ocrText.substring(0, 50)}"`
                );
              }
            }
          }
        }
      }
    }
  }

  /**
   * Find OCR words near a node's position
   */
  private findNearbyOCRWords(
    nodeRect: { x: number; y: number; width: number; height: number },
    words: Array<{
      text: string;
      confidence?: number;
      bbox?: { x: number; y: number; width: number; height: number };
    }>
  ): Array<{ text: string; confidence: number }> {
    if (!words || words.length === 0) return [];

    const nodeCenterX = nodeRect.x + nodeRect.width / 2;
    const nodeCenterY = nodeRect.y + nodeRect.height / 2;
    const searchRadius = Math.max(nodeRect.width, nodeRect.height) * 1.5;

    return words
      .filter((word) => {
        if (!word.bbox) return false;
        const wordCenterX = word.bbox.x + word.bbox.width / 2;
        const wordCenterY = word.bbox.y + word.bbox.height / 2;
        const distance = Math.sqrt(
          Math.pow(wordCenterX - nodeCenterX, 2) +
            Math.pow(wordCenterY - nodeCenterY, 2)
        );
        return distance < searchRadius;
      })
      .map((word) => ({
        text: word.text,
        confidence: word.confidence || 0,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Use color palette to fill missing colors/backgrounds
   */
  private enhanceNodeWithColorPalette(
    node: ElementNode,
    schema: WebToFigmaSchema
  ): void {
    // Disabled: global palette-based background fills are speculative and have
    // caused regressions (incorrect header/button/search bar fills).
    // For pixel-fidelity we only use explicit computed styles from extraction.
    void node;
    void schema;
  }

  /**
   * Use ML detections to enhance component detection and grouping
   */
  private enhanceNodeWithMLDetections(
    node: ElementNode,
    schema: WebToFigmaSchema
  ): void {
    if (!this.aiContext.mlComponents || !this.aiContext.mlComponents.detections)
      return;

    const nodeRect = node.layout;
    if (!nodeRect) return;

    // Find ML detections that overlap with this node
    const overlappingDetections = this.aiContext.mlComponents.detections.filter(
      (detection) => {
        if (!detection.bbox) return false;
        return this.rectsOverlap(nodeRect, detection.bbox);
      }
    );

    if (overlappingDetections.length > 0) {
      // Use highest confidence detection
      const bestDetection = overlappingDetections.reduce((best, current) =>
        (current.score || 0) > (best.score || 0) ? current : best
      );

      // Enhance node with ML classification (store in plugin data or custom field)
      // Store ML data in a way that can be accessed during Figma import
      (node as any).mlClassification = bestDetection.class;
      (node as any).mlConfidence = bestDetection.score || 0;
      (node as any).mlUIType = bestDetection.uiType;

      // Enhance component detection
      if (bestDetection.uiType) {
        // Suggest component type based on ML detection
        const suggestedComponentType = this.mapMLTypeToComponentType(
          bestDetection.uiType
        );

        // If node type is generic, suggest more specific type
        if (node.type === "FRAME" || node.type === "RECTANGLE") {
          // Store suggestion for Figma plugin to use
          (node as any).suggestedComponentType = suggestedComponentType;
        }

        // Add to component registry if not already there
        if (!schema.components) {
          schema.components = { definitions: {} };
        }
        if (!schema.components.definitions[node.id]) {
          schema.components.definitions[node.id] = {
            id: node.id,
            name: node.name || bestDetection.uiType,
            masterElementId: node.id,
            properties: {
              mlType: bestDetection.uiType,
              mlConfidence: bestDetection.score || 0,
            },
          };
        }
      }

      this.enhancementsApplied.componentsEnhanced++;
    }
  }

  /**
   * Use typography analysis to normalize font sizes
   */
  private enhanceNodeWithTypography(node: ElementNode): void {
    if (!this.aiContext.typography || node.type !== "TEXT") return;

    const typography = this.aiContext.typography;

    // Normalize font size to nearest type scale value
    if (node.textStyle && node.textStyle.fontSize && typography.typeScale) {
      const currentSize = node.textStyle.fontSize;
      const baseSize = typography.typeScale.baseSize || 16;
      const ratio = typography.typeScale.ratio || 1.25;

      // Find nearest type scale size
      const scaleSizes = this.generateTypeScale(baseSize, ratio, 10);
      const nearestSize = scaleSizes.reduce((nearest, size) =>
        Math.abs(size - currentSize) < Math.abs(nearest - currentSize)
          ? size
          : nearest
      );

      // If close enough (within 2px), normalize to type scale
      if (Math.abs(nearestSize - currentSize) <= 2) {
        const originalSize = node.textStyle.fontSize;
        node.textStyle.fontSize = nearestSize;

        // Store original for reference
        (node as any).originalFontSize = originalSize;
        (node as any).normalizedToTypeScale = true;

        this.enhancementsApplied.typographyNormalized++;
        console.log(
          `[AI-Enhancer] ✅ Normalized font size for ${node.name}: ${originalSize}px → ${nearestSize}px`
        );
      }
    }
  }

  /**
   * Use ML/vision to improve layout inference
   */
  private enhanceNodeLayout(node: ElementNode): void {
    if (!this.aiContext.mlComponents) return;

    // Use ML detections to infer better grouping
    const nodeRect = node.layout;
    if (!nodeRect) return;

    // Check if ML detected this as part of a component group
    const nearbyDetections = this.aiContext.mlComponents.detections.filter(
      (d) => {
        if (!d.bbox) return false;
        const distance = this.rectDistance(nodeRect, d.bbox);
        return distance < 50; // Within 50px
      }
    );

    if (nearbyDetections.length > 1) {
      // Multiple detections nearby - might be a grouped component
      if (!node.autoLayout) {
        // Suggest auto layout if not already set
        (node as any).suggestedAutoLayout = true;
        (node as any).mlGroupingDetected = true;

        // If node has children and no auto layout, suggest it
        if (node.children && node.children.length > 1) {
          (node as any).suggestedLayoutMode = "HORIZONTAL"; // Default, could be improved with better analysis
          this.enhancementsApplied.layoutImproved++;
          console.log(
            `[AI-Enhancer] ✅ Suggested Auto Layout for ${node.name} (${node.children.length} children, ${nearbyDetections.length} ML detections nearby)`
          );
        }
      }
    }
  }

  /**
   * Enhance styles registry with AI results
   */
  private enhanceStyles(schema: WebToFigmaSchema): void {
    if (!schema.styles) {
      schema.styles = { colors: {}, textStyles: {}, effects: {} };
    }

    // Color palette already integrated in content-script.ts, but ensure it's here too
    if (this.aiContext.colorPalette && this.aiContext.colorPalette.palette) {
      // Colors are already added in content-script.ts, but we can enhance existing ones
      Object.entries(this.aiContext.colorPalette.palette).forEach(
        ([name, color]: [string, any]) => {
          if (color && color.hex && schema.styles.colors) {
            const colorId = `palette-${name
              .toLowerCase()
              .replace(/\s+/g, "-")}`;
            if (!schema.styles.colors[colorId]) {
              schema.styles.colors[colorId] = {
                id: colorId,
                name: name,
                color: color.figma || {
                  r: color.rgb.r / 255,
                  g: color.rgb.g / 255,
                  b: color.rgb.b / 255,
                  a: 1,
                },
                usageCount: color.population || 1,
              };
            }
          }
        }
      );
    }

    // Typography tokens already integrated, but ensure normalization
    if (
      this.aiContext.typography &&
      this.aiContext.typography.tokens &&
      schema.styles.textStyles
    ) {
      Object.entries(this.aiContext.typography.tokens).forEach(
        ([name, token]: [string, any]) => {
          const styleId = `typography-${name
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          if (!schema.styles.textStyles[styleId] && token) {
            schema.styles.textStyles[styleId] = {
              id: styleId,
              name: name,
              ...token,
            };
          }
        }
      );
    }
  }

  /**
   * Enhance component registry with ML detections
   */
  private enhanceComponents(schema: WebToFigmaSchema): void {
    if (!this.aiContext.mlComponents || !schema.components) return;

    // Group ML detections by type
    const detectionsByType = new Map<string, any[]>();
    this.aiContext.mlComponents.detections.forEach((detection) => {
      const type = detection.uiType || detection.class || "UNKNOWN";
      if (!detectionsByType.has(type)) {
        detectionsByType.set(type, []);
      }
      detectionsByType.get(type)!.push(detection);
    });

    // Create component groups from ML detections
    if (!schema.components) {
      schema.components = { definitions: {} };
    }

    detectionsByType.forEach((detections, type) => {
      if (detections.length > 1) {
        // Multiple instances of same component type
        const componentId = `ml-component-${type.toLowerCase()}`;
        if (!schema.components!.definitions[componentId]) {
          schema.components!.definitions[componentId] = {
            id: componentId,
            name: type,
            masterElementId: componentId,
            description: `ML-detected component type with ${detections.length} instances`,
            properties: {
              mlType: type,
              instanceCount: detections.length,
              detections: detections.map((d, i) => ({
                nodeId: `ml-instance-${type}-${i}`,
                bbox: d.bbox,
                confidence: d.score || 0,
              })),
            },
          };
        }
      }
    });
  }

  /**
   * Helper: Check if two rectangles overlap
   */
  private rectsOverlap(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }

  /**
   * Helper: Calculate distance between two rectangles
   */
  private rectDistance(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): number {
    const center1X = rect1.x + rect1.width / 2;
    const center1Y = rect1.y + rect1.height / 2;
    const center2X = rect2.x + rect2.width / 2;
    const center2Y = rect2.y + rect2.height / 2;
    return Math.sqrt(
      Math.pow(center2X - center1X, 2) + Math.pow(center2Y - center1Y, 2)
    );
  }

  /**
   * Helper: Map ML detection type to component type
   */
  private mapMLTypeToComponentType(mlType: string): string {
    const mapping: Record<string, string> = {
      BUTTON: "BUTTON",
      INPUT: "INPUT",
      CARD: "CARD",
      NAV: "NAVIGATION",
      ICON: "ICON",
      AVATAR: "AVATAR",
    };
    return mapping[mlType.toUpperCase()] || "UNKNOWN";
  }

  /**
   * Helper: Generate type scale sizes
   */
  private generateTypeScale(
    base: number,
    ratio: number,
    count: number
  ): number[] {
    const sizes: number[] = [];
    for (let i = 0; i < count; i++) {
      sizes.push(base * Math.pow(ratio, i));
    }
    return sizes;
  }

  /**
   * Get enhancement statistics
   */
  getEnhancementStats() {
    return { ...this.enhancementsApplied };
  }
}

/**
 * Enhance schema with AI results
 */
export function enhanceSchemaWithAI(
  schema: WebToFigmaSchema,
  aiContext: AIEnhancementContext
): WebToFigmaSchema {
  const enhancer = new AISchemaEnhancer(aiContext);
  return enhancer.enhanceSchema(schema);
}
