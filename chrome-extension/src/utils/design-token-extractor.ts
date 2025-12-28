import {
  DesignToken,
  DesignTokensRegistry,
  TokenCollection,
  TokenAlias,
  TokenUsage,
  TokenType,
  TokenScope,
  TokenValue,
  RGBA,
} from "../types/schema";
import { querySelectorAllDeep } from "./shadow-dom-utils";

/**
 * Advanced design token extraction from CSS variables and computed styles
 * Maintains design system relationships for Figma Variables API integration
 */
export class DesignTokenExtractor {
  private variables = new Map<string, DesignToken>();
  private collections = new Map<string, TokenCollection>();
  private aliases = new Map<string, TokenAlias>();
  private usage = new Map<string, TokenUsage>();
  private elementCounter = 0;

  /**
   * Extract comprehensive design tokens from the document
   */
  /**
   * Extract comprehensive design tokens from the document
   */
  async extractTokens(): Promise<DesignTokensRegistry> {
    console.log("🎨 Starting enhanced design token extraction...");

    // Extract from :root first
    this.extractFromElement(document.documentElement, "root");

    // Process all elements in chunks to prevent freezing (including shadow DOM)
    const allElements = querySelectorAllDeep(document, "*");
    const CHUNK_SIZE = 500;

    for (let i = 0; i < allElements.length; i += CHUNK_SIZE) {
      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));

      const end = Math.min(i + CHUNK_SIZE, allElements.length);
      for (let j = i; j < end; j++) {
        const element = allElements[j];
        if (element instanceof HTMLElement) {
          const computed = window.getComputedStyle(element);

          // 1. Extract CSS variables (explicit)
          this.extractFromComputed(
            element,
            computed,
            `element-${this.elementCounter++}`
          );

          // 2. Track usage in properties
          this.trackVariableUsage(element, computed);
        }
      }
    }

    // Detect token aliases and relationships
    this.detectTokenAliases();

    // Group tokens into semantic collections
    this.createSemanticCollections();

    // Build final registry
    const registry: DesignTokensRegistry = {
      variables: Object.fromEntries(this.variables),
      collections: Object.fromEntries(this.collections),
      aliases: Object.fromEntries(this.aliases),
      usage: Object.fromEntries(this.usage),
    };

    console.log("✅ Design token extraction complete:", {
      variables: this.variables.size,
      collections: this.collections.size,
      aliases: this.aliases.size,
      usageTracked: this.usage.size,
    });

    return registry;
  }

  /**
   * Extract CSS variables from computed styles
   */
  private extractFromComputed(
    element: HTMLElement,
    computed: CSSStyleDeclaration,
    scope: string
  ): void {
    const inline = element.style;

    // Extract from computed styles (includes inherited variables)
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith("--")) {
        const value = computed.getPropertyValue(prop).trim();
        if (value) {
          this.processVariable(prop, value, scope, false);
        }
      }
    }

    // Extract from inline styles (explicitly declared variables)
    for (let i = 0; i < inline.length; i++) {
      const prop = inline[i];
      if (prop.startsWith("--")) {
        const value = inline.getPropertyValue(prop).trim();
        if (value) {
          this.processVariable(prop, value, scope, true);
        }
      }
    }
  }

  /**
   * Extract CSS variables from a specific element (Legacy wrapper)
   */
  private extractFromElement(element: Element, scope: string): void {
    if (element instanceof HTMLElement) {
      this.extractFromComputed(
        element,
        window.getComputedStyle(element),
        scope
      );
    }
  }

  /**
   * Process a CSS variable and create design token
   */
  private processVariable(
    name: string,
    value: string,
    scope: string,
    isExplicit: boolean
  ): void {
    const tokenId = this.generateTokenId(name);

    // Skip if we already have this token
    if (this.variables.has(tokenId)) {
      this.updateTokenUsage(tokenId, scope);
      return;
    }

    // Parse the variable value
    const parsedValue = this.parseTokenValue(value);
    const tokenType = this.inferTokenType(name, parsedValue);
    const tokenScopes = this.inferTokenScopes(name, tokenType);

    // Create design token
    const token: DesignToken = {
      id: tokenId,
      name: this.generateSemanticName(name),
      originalName: name,
      type: tokenType,
      value: parsedValue,
      scopes: tokenScopes,
      collection: this.inferCollection(name, tokenType),
      resolvedValue: this.resolveTokenValue(value),
      references: this.extractReferences(value),
      referencedBy: [],
    };

    this.variables.set(tokenId, token);

    // Track usage
    const usage: TokenUsage = {
      count: 1,
      elements: [scope],
      properties: [],
      computed: !isExplicit,
    };
    this.usage.set(tokenId, usage);
  }

  /**
   * Track where CSS variables are used in computed styles
   */
  private trackVariableUsage(
    element: Element,
    computed: CSSStyleDeclaration
  ): void {
    const properties = [
      "color",
      "background-color",
      "border-color",
      "fill",
      "stroke",
      "font-size",
      "line-height",
      "letter-spacing",
      "font-weight",
      "margin",
      "padding",
      "gap",
      "border-radius",
      "width",
      "height",
      "box-shadow",
      "filter",
      "opacity",
      "z-index",
    ];

    for (const prop of properties) {
      const value = computed.getPropertyValue(prop);
      if (value && value.includes("var(--")) {
        this.extractVariableReferences(value, prop, element.tagName);
      }
    }
  }

  /**
   * Extract variable references from CSS value
   */
  private extractVariableReferences(
    value: string,
    property: string,
    elementType: string
  ): void {
    const varPattern = /var\((--([\w-]+))(?:,\s*([^)]*))?\)/g;
    let match;

    while ((match = varPattern.exec(value)) !== null) {
      const varName = match[1];
      const fallback = match[3];
      const tokenId = this.generateTokenId(varName);

      // Update usage tracking
      const usage = this.usage.get(tokenId);
      if (usage) {
        usage.count++;
        if (!usage.properties.includes(property)) {
          usage.properties.push(property);
        }
      }

      // Track fallback as potential alias
      if (fallback && fallback.includes("var(--")) {
        this.extractVariableReferences(fallback, property, elementType);
      }
    }
  }

  /**
   * Detect aliases between tokens (one variable references another)
   */
  private detectTokenAliases(): void {
    for (const [tokenId, token] of this.variables) {
      if (token.references && token.references.length > 0) {
        for (const refName of token.references) {
          const refId = this.generateTokenId(refName);

          if (this.variables.has(refId)) {
            // Create alias relationship
            const alias: TokenAlias = {
              from: tokenId,
              to: refId,
              context: token.collection,
            };
            this.aliases.set(`${tokenId}->${refId}`, alias);

            // Update referencedBy relationship
            const referencedToken = this.variables.get(refId);
            if (referencedToken) {
              if (!referencedToken.referencedBy) {
                referencedToken.referencedBy = [];
              }
              referencedToken.referencedBy.push(tokenId);
            }
          }
        }
      }
    }
  }

  /**
   * Group tokens into semantic collections
   */
  private createSemanticCollections(): void {
    const collectionMap = new Map<string, Set<string>>();

    // Group by inferred collection
    for (const [tokenId, token] of this.variables) {
      if (!collectionMap.has(token.collection)) {
        collectionMap.set(token.collection, new Set());
      }
      collectionMap.get(token.collection)!.add(tokenId);
    }

    // Create collection objects
    for (const [collectionName, variableIds] of collectionMap) {
      const firstToken = this.variables.get(Array.from(variableIds)[0]);

      const collection: TokenCollection = {
        id: collectionName.toLowerCase().replace(/\s+/g, "-"),
        name: collectionName,
        type: firstToken?.type || "STRING",
        description: this.generateCollectionDescription(collectionName),
        variables: Array.from(variableIds),
      };

      this.collections.set(collection.id, collection);
    }
  }

  /**
   * Parse CSS value into structured token value
   */
  private parseTokenValue(value: string): TokenValue {
    // Handle variable references
    if (value.includes("var(--")) {
      return {
        type: "VARIABLE_ALIAS",
        value: this.extractVariableReferences(value, "", ""),
        originalValue: value,
      };
    }

    // Handle colors
    if (this.isColor(value)) {
      return {
        type: "SOLID",
        value: this.parseColor(value),
        resolvedType: "COLOR",
        originalValue: value,
      };
    }

    // Handle numbers
    if (this.isNumeric(value)) {
      return {
        type: "SOLID",
        value: parseFloat(value),
        resolvedType: "NUMBER",
        originalValue: value,
      };
    }

    // Handle strings
    return {
      type: "SOLID",
      value: value,
      resolvedType: "STRING",
      originalValue: value,
    };
  }

  /**
   * Resolve token value by following variable references
   */
  private resolveTokenValue(value: string): any {
    // Simple resolution - in practice this would be more sophisticated
    const varPattern = /var\((--([\w-]+))(?:,\s*([^)]*))?\)/;
    const match = varPattern.exec(value);

    if (match) {
      const varName = match[1];
      const fallback = match[3];

      // Try to find the variable
      const rootStyles = getComputedStyle(document.documentElement);
      const resolvedValue = rootStyles.getPropertyValue(varName);

      return resolvedValue || fallback || value;
    }

    return value;
  }

  /**
   * Extract variable references from a value
   */
  private extractReferences(value: string): string[] {
    const references: string[] = [];
    const varPattern = /var\((--([\w-]+))/g;
    let match;

    while ((match = varPattern.exec(value)) !== null) {
      references.push(match[1]);
    }

    return references;
  }

  /**
   * Infer token type from name and value
   */
  private inferTokenType(name: string, value: TokenValue): TokenType {
    const nameStr = name.toLowerCase();

    if (
      value.resolvedType === "COLOR" ||
      nameStr.includes("color") ||
      nameStr.includes("bg") ||
      nameStr.includes("background") ||
      nameStr.includes("border") ||
      nameStr.includes("fill") ||
      nameStr.includes("stroke")
    ) {
      return "COLOR";
    }

    if (
      value.resolvedType === "NUMBER" ||
      nameStr.includes("size") ||
      nameStr.includes("spacing") ||
      nameStr.includes("padding") ||
      nameStr.includes("margin") ||
      nameStr.includes("gap") ||
      nameStr.includes("radius") ||
      nameStr.includes("width") ||
      nameStr.includes("height")
    ) {
      return "FLOAT";
    }

    if (value.resolvedType === "BOOLEAN") {
      return "BOOLEAN";
    }

    return "STRING";
  }

  /**
   * Infer appropriate Figma scopes for a token
   */
  private inferTokenScopes(name: string, type: TokenType): TokenScope[] {
    const nameStr = name.toLowerCase();
    const scopes: TokenScope[] = [];

    if (type === "COLOR") {
      if (nameStr.includes("text") || nameStr.includes("font")) {
        scopes.push("TEXT_FILL");
      } else if (nameStr.includes("stroke") || nameStr.includes("border")) {
        scopes.push("STROKE_COLOR");
      } else if (nameStr.includes("shadow") || nameStr.includes("glow")) {
        scopes.push("EFFECT_COLOR");
      } else if (nameStr.includes("background") || nameStr.includes("bg")) {
        scopes.push("FRAME_FILL");
      } else {
        scopes.push("ALL_FILLS");
      }
    } else if (type === "FLOAT") {
      if (nameStr.includes("radius") || nameStr.includes("rounded")) {
        scopes.push("CORNER_RADIUS");
      } else if (nameStr.includes("gap") || nameStr.includes("spacing")) {
        scopes.push("GAP");
      } else if (
        nameStr.includes("width") ||
        nameStr.includes("height") ||
        nameStr.includes("size")
      ) {
        scopes.push("WIDTH_HEIGHT");
      } else {
        scopes.push("ALL_SCOPES");
      }
    } else {
      scopes.push("ALL_SCOPES");
    }

    return scopes.length > 0 ? scopes : ["ALL_SCOPES"];
  }

  /**
   * Infer collection name from token name
   */
  private inferCollection(name: string, type: TokenType): string {
    const nameStr = name.toLowerCase();

    // Color collections
    if (type === "COLOR") {
      if (nameStr.includes("primary") || nameStr.includes("brand"))
        return "Brand Colors";
      if (nameStr.includes("semantic") || nameStr.includes("status"))
        return "Semantic Colors";
      if (nameStr.includes("neutral") || nameStr.includes("gray"))
        return "Neutral Colors";
      return "Colors";
    }

    // Typography collections
    if (
      nameStr.includes("font") ||
      nameStr.includes("text") ||
      nameStr.includes("typography")
    ) {
      return "Typography";
    }

    // Spacing collections
    if (
      nameStr.includes("spacing") ||
      nameStr.includes("margin") ||
      nameStr.includes("padding") ||
      nameStr.includes("gap")
    ) {
      return "Spacing";
    }

    // Size collections
    if (
      nameStr.includes("size") ||
      nameStr.includes("width") ||
      nameStr.includes("height")
    ) {
      return "Sizing";
    }

    // Radius collections
    if (nameStr.includes("radius") || nameStr.includes("rounded")) {
      return "Corner Radius";
    }

    // Shadow collections
    if (nameStr.includes("shadow") || nameStr.includes("elevation")) {
      return "Shadows";
    }

    return "Other";
  }

  // Utility methods

  private generateTokenId(name: string): string {
    return name.replace(/^--/, "").replace(/[^a-zA-Z0-9-]/g, "-");
  }

  private generateSemanticName(name: string): string {
    return name
      .replace(/^--/, "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^([a-z])/, (letter) => letter.toUpperCase());
  }

  private generateCollectionDescription(name: string): string {
    const descriptions: Record<string, string> = {
      "Brand Colors": "Primary brand colors and variants",
      "Semantic Colors": "Status and feedback colors",
      "Neutral Colors": "Grayscale and neutral tones",
      Colors: "General color palette",
      Typography: "Font sizes, weights, and spacing",
      Spacing: "Layout spacing and padding values",
      Sizing: "Component and element dimensions",
      "Corner Radius": "Border radius values",
      Shadows: "Drop shadows and elevation",
      Other: "Miscellaneous design tokens",
    };
    return descriptions[name] || "Design system tokens";
  }

  private updateTokenUsage(tokenId: string, scope: string): void {
    const usage = this.usage.get(tokenId);
    if (usage) {
      usage.count++;
      if (!usage.elements.includes(scope)) {
        usage.elements.push(scope);
      }
    }
  }

  private isColor(value: string): boolean {
    const colorPatterns = [
      /^#[0-9a-fA-F]{3,8}$/,
      /^rgb\(/,
      /^rgba\(/,
      /^hsl\(/,
      /^hsla\(/,
      /^color\(/,
    ];

    return colorPatterns.some((pattern) => pattern.test(value.trim()));
  }

  private isNumeric(value: string): boolean {
    return /^-?\d*\.?\d+(px|em|rem|%|vh|vw|vmin|vmax|pt|pc|in|cm|mm|ex|ch)?$/.test(
      value.trim()
    );
  }

  private parseColor(colorStr: string): RGBA {
    // Create a temporary element to let the browser parse the color
    const temp = document.createElement("div");
    temp.style.color = colorStr;
    document.body.appendChild(temp);

    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    // Parse rgb/rgba values
    const match = computed.match(/rgba?\(([^)]+)\)/);
    if (match) {
      const values = match[1].split(",").map((v) => parseFloat(v.trim()));
      return {
        r: values[0] / 255,
        g: values[1] / 255,
        b: values[2] / 255,
        a: values[3] !== undefined ? values[3] : 1,
      };
    }

    // Fallback to black
    return { r: 0, g: 0, b: 0, a: 1 };
  }
}
