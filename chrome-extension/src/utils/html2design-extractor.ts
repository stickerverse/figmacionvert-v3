/**
 * HTML2Design-Style DOM Extractor
 * Implements advanced techniques for pixel-perfect extraction
 */

export interface StackingContext {
  zIndex: number;
  position: string;
  opacity: number;
  transform: string;
  filter: string;
  perspective: string;
  clipPath: string;
  mask: string;
  mixBlendMode: string;
  isolation: string;
}

export interface BoxModel {
  contentBox: { width: number; height: number };
  paddingBox: { width: number; height: number };
  borderBox: { width: number; height: number };
  marginBox: { width: number; height: number };
  padding: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface AutoLayoutData {
  layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  primaryAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'MAX' | 'CENTER';
  itemSpacing: number;
  padding: { top: number; right: number; bottom: number; left: number };
  layoutWrap: 'NO_WRAP' | 'WRAP';
  flexGrow: number;
  flexShrink: number;
}

export interface FontMetrics {
  ascent: number;
  descent: number;
  lineGap: number;
  capHeight: number;
  xHeight: number;
}

export interface ExtractedElementData {
  // Core identification
  id: string;
  name: string;
  type: string;
  tagName: string;
  classList: string[];
  
  // Enhanced positioning
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Detailed box model
  boxModel: BoxModel;
  
  // Stacking context data
  stackingContext: StackingContext;
  
  // Auto Layout from flexbox
  autoLayout?: AutoLayoutData;
  
  // Visual properties
  visual: {
    fills: any[];
    strokes: any[];
    effects: any[];
    cornerRadius: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
    opacity: number;
    blendMode: string;
    backdropFilter: string;
  };
  
  // Text properties
  textContent?: string;
  textStyle?: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    lineHeight: { unit: string; value: number };
    letterSpacing: { unit: string; value: number };
    textAlign: string;
    textDecoration: string;
    textTransform: string;
    color: string;
    fontMetrics: FontMetrics;
  };
  
  // Component signature for detection
  componentSignature?: string;
  
  // Asset references
  assets: {
    images: { src: string; hash: string; naturalWidth: number; naturalHeight: number }[];
    backgrounds: { url: string; size: string; position: string; repeat: string }[];
    svgs: { content: string; hash: string }[];
  };
  
  // Child elements
  children: ExtractedElementData[];
}

export class HTML2DesignExtractor {
  private processedElements = new Set<Element>();
  private componentSignatures = new Map<string, Element[]>();
  private colorRegistry = new Map<string, number>();
  private fontCache = new Map<string, FontMetrics>();
  
  /**
   * Extract element data using html2design techniques
   */
  extractElementData(element: Element, documentOrigin = { x: 0, y: 0 }): ExtractedElementData {
    // Prevent circular references
    if (this.processedElements.has(element)) {
      return null!;
    }
    this.processedElements.add(element);
    
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // Generate unique ID
    const id = this.generateElementId(element);
    
    // Extract box model with accurate calculations
    const boxModel = this.extractBoxModel(element, computedStyle);
    
    // Extract stacking context
    const stackingContext = this.extractStackingContext(computedStyle);
    
    // Determine element type and name
    const { type, name } = this.determineElementType(element, computedStyle);
    
    // Extract bounds with document offset
    const bounds = {
      x: rect.left + window.scrollX - documentOrigin.x,
      y: rect.top + window.scrollY - documentOrigin.y,
      width: rect.width,
      height: rect.height
    };
    
    const data: ExtractedElementData = {
      id,
      name,
      type,
      tagName: element.tagName.toLowerCase(),
      classList: Array.from(element.classList),
      bounds,
      boxModel,
      stackingContext,
      visual: this.extractVisualProperties(computedStyle),
      assets: this.extractAssets(element, computedStyle),
      children: []
    };
    
    // Extract Auto Layout from flexbox
    if (this.isFlexContainer(computedStyle)) {
      data.autoLayout = this.extractAutoLayoutFromFlexbox(computedStyle);
    }
    
    // Extract text properties
    if (this.hasTextContent(element)) {
      data.textContent = this.extractTextContent(element);
      data.textStyle = this.extractTextStyle(computedStyle);
    }
    
    // Generate component signature
    data.componentSignature = this.generateComponentSignature(data);
    
    // Process children (including shadow DOM)
    this.extractChildren(element, data, documentOrigin);
    
    // Register for component detection
    this.registerForComponentDetection(data, element);
    
    return data;
  }
  
  /**
   * Extract accurate box model dimensions
   */
  private extractBoxModel(element: Element, style: CSSStyleDeclaration): BoxModel {
    const rect = element.getBoundingClientRect();
    
    // Parse padding
    const paddingTop = parseFloat(style.paddingTop);
    const paddingRight = parseFloat(style.paddingRight);
    const paddingBottom = parseFloat(style.paddingBottom);
    const paddingLeft = parseFloat(style.paddingLeft);
    
    // Parse border
    const borderTopWidth = parseFloat(style.borderTopWidth);
    const borderRightWidth = parseFloat(style.borderRightWidth);
    const borderBottomWidth = parseFloat(style.borderBottomWidth);
    const borderLeftWidth = parseFloat(style.borderLeftWidth);
    
    // Parse margin
    const marginTop = parseFloat(style.marginTop);
    const marginRight = parseFloat(style.marginRight);
    const marginBottom = parseFloat(style.marginBottom);
    const marginLeft = parseFloat(style.marginLeft);
    
    return {
      contentBox: {
        width: rect.width - paddingLeft - paddingRight - borderLeftWidth - borderRightWidth,
        height: rect.height - paddingTop - paddingBottom - borderTopWidth - borderBottomWidth
      },
      paddingBox: {
        width: rect.width - borderLeftWidth - borderRightWidth,
        height: rect.height - borderTopWidth - borderBottomWidth
      },
      borderBox: {
        width: rect.width,
        height: rect.height
      },
      marginBox: {
        width: rect.width + marginLeft + marginRight,
        height: rect.height + marginTop + marginBottom
      },
      padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft },
      border: { top: borderTopWidth, right: borderRightWidth, bottom: borderBottomWidth, left: borderLeftWidth },
      margin: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft }
    };
  }
  
  /**
   * Extract stacking context properties
   */
  private extractStackingContext(style: CSSStyleDeclaration): StackingContext {
    return {
      zIndex: parseInt(style.zIndex) || 0,
      position: style.position,
      opacity: parseFloat(style.opacity),
      transform: style.transform,
      filter: style.filter,
      perspective: style.perspective,
      clipPath: style.clipPath,
      mask: style.mask,
      mixBlendMode: style.mixBlendMode,
      isolation: style.isolation
    };
  }
  
  /**
   * Extract Auto Layout data from CSS flexbox
   */
  private extractAutoLayoutFromFlexbox(style: CSSStyleDeclaration): AutoLayoutData {
    const flexDirection = style.flexDirection;
    const justifyContent = style.justifyContent;
    const alignItems = style.alignItems;
    const gap = parseFloat(style.gap) || 0;
    const flexWrap = style.flexWrap;
    
    return {
      layoutMode: flexDirection === 'row' || flexDirection === 'row-reverse' ? 'HORIZONTAL' : 'VERTICAL',
      primaryAxisAlignItems: this.mapJustifyContent(justifyContent),
      counterAxisAlignItems: this.mapAlignItems(alignItems),
      itemSpacing: gap,
      padding: {
        top: parseFloat(style.paddingTop),
        right: parseFloat(style.paddingRight),
        bottom: parseFloat(style.paddingBottom),
        left: parseFloat(style.paddingLeft)
      },
      layoutWrap: flexWrap === 'wrap' ? 'WRAP' : 'NO_WRAP',
      flexGrow: parseFloat(style.flexGrow) || 0,
      flexShrink: parseFloat(style.flexShrink) || 1
    };
  }
  
  /**
   * Map CSS justify-content to Figma alignment
   */
  private mapJustifyContent(justifyContent: string): 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN' {
    const mapping: Record<string, 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN'> = {
      'flex-start': 'MIN',
      'start': 'MIN',
      'flex-end': 'MAX',
      'end': 'MAX',
      'center': 'CENTER',
      'space-between': 'SPACE_BETWEEN'
    };
    return mapping[justifyContent] || 'MIN';
  }
  
  /**
   * Map CSS align-items to Figma alignment
   */
  private mapAlignItems(alignItems: string): 'MIN' | 'MAX' | 'CENTER' {
    const mapping: Record<string, 'MIN' | 'MAX' | 'CENTER'> = {
      'flex-start': 'MIN',
      'start': 'MIN',
      'flex-end': 'MAX',
      'end': 'MAX',
      'center': 'CENTER'
    };
    return mapping[alignItems] || 'MIN';
  }
  
  /**
   * Extract visual properties with color registration
   */
  private extractVisualProperties(style: CSSStyleDeclaration): any {
    const fills = [];
    const strokes = [];
    const effects = [];
    
    // Background fills
    const backgroundColor = style.backgroundColor;
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
      const color = this.parseColor(backgroundColor);
      if (color) {
        fills.push({ type: 'SOLID', color });
        this.registerColor(backgroundColor);
      }
    }
    
    // Background gradients
    const backgroundImage = style.backgroundImage;
    if (backgroundImage && backgroundImage.includes('gradient')) {
      const gradient = this.parseGradient(backgroundImage);
      if (gradient) {
        fills.push(gradient);
      }
    }
    
    // Border strokes
    const borderColor = style.borderColor;
    const borderWidth = parseFloat(style.borderWidth);
    if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderWidth > 0) {
      const color = this.parseColor(borderColor);
      if (color) {
        strokes.push({ type: 'SOLID', color });
      }
    }
    
    // Box shadow effects
    const boxShadow = style.boxShadow;
    if (boxShadow && boxShadow !== 'none') {
      const shadowEffects = this.parseBoxShadow(boxShadow);
      effects.push(...shadowEffects);
    }
    
    // Corner radius
    const cornerRadius = this.extractCornerRadius(style);
    
    return {
      fills,
      strokes,
      effects,
      cornerRadius,
      opacity: parseFloat(style.opacity),
      blendMode: style.mixBlendMode || 'normal',
      backdropFilter: style.backdropFilter
    };
  }
  
  /**
   * Extract corner radius (individual or uniform)
   */
  private extractCornerRadius(style: CSSStyleDeclaration): number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } {
    const borderRadius = style.borderRadius;
    
    if (!borderRadius || borderRadius === '0px') {
      return 0;
    }
    
    // Check individual corner properties
    const topLeft = parseFloat(style.borderTopLeftRadius);
    const topRight = parseFloat(style.borderTopRightRadius);
    const bottomRight = parseFloat(style.borderBottomRightRadius);
    const bottomLeft = parseFloat(style.borderBottomLeftRadius);
    
    // If all corners are the same, return single value
    if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
      return topLeft;
    }
    
    // Return individual corner values
    return { topLeft, topRight, bottomRight, bottomLeft };
  }
  
  /**
   * Extract text style with font metrics
   */
  private extractTextStyle(style: CSSStyleDeclaration): any {
    const fontFamily = style.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const lineHeight = this.parseLineHeight(style.lineHeight, fontSize);
    const letterSpacing = this.parseLetterSpacing(style.letterSpacing);
    
    return {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      textAlign: style.textAlign,
      textDecoration: style.textDecoration,
      textTransform: style.textTransform,
      color: style.color,
      fontMetrics: this.getFontMetrics(fontFamily)
    };
  }
  
  /**
   * Parse line height into Figma format
   */
  private parseLineHeight(lineHeight: string, fontSize: number): { unit: string; value: number } {
    if (lineHeight === 'normal') {
      return { unit: 'AUTO', value: 0 };
    }
    
    if (lineHeight.includes('px')) {
      return { unit: 'PIXELS', value: parseFloat(lineHeight) };
    }
    
    // Assume relative value
    const ratio = parseFloat(lineHeight) || 1.2;
    return { unit: 'PERCENT', value: ratio * 100 };
  }
  
  /**
   * Parse letter spacing into Figma format
   */
  private parseLetterSpacing(letterSpacing: string): { unit: string; value: number } {
    if (letterSpacing === 'normal') {
      return { unit: 'PIXELS', value: 0 };
    }
    
    return {
      unit: 'PIXELS',
      value: parseFloat(letterSpacing) || 0
    };
  }
  
  /**
   * Get font metrics for accurate rendering
   */
  private getFontMetrics(fontFamily: string): FontMetrics {
    if (this.fontCache.has(fontFamily)) {
      return this.fontCache.get(fontFamily)!;
    }
    
    // Default metrics (would be enhanced with actual font loading)
    const metrics = {
      ascent: 0.9,
      descent: 0.25,
      lineGap: 0,
      capHeight: 0.7,
      xHeight: 0.5
    };
    
    this.fontCache.set(fontFamily, metrics);
    return metrics;
  }
  
  /**
   * Extract assets (images, backgrounds, SVGs)
   */
  private extractAssets(element: Element, style: CSSStyleDeclaration): {
    images: { src: string; hash: string; naturalWidth: number; naturalHeight: number }[];
    backgrounds: { url: string; size: string; position: string; repeat: string }[];
    svgs: { content: string; hash: string }[];
  } {
    const assets: {
      images: { src: string; hash: string; naturalWidth: number; naturalHeight: number }[];
      backgrounds: { url: string; size: string; position: string; repeat: string }[];
      svgs: { content: string; hash: string }[];
    } = {
      images: [],
      backgrounds: [],
      svgs: []
    };
    
    // Extract images
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      assets.images.push({
        src: img.src,
        hash: this.generateContentHash(img.src),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    }
    
    // Extract background images
    const backgroundImage = style.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none' && !backgroundImage.includes('gradient')) {
      const url = backgroundImage.match(/url\\(['"]?([^'"]*?)['"]?\\)/)?.[1];
      if (url) {
        assets.backgrounds.push({
          url,
          size: style.backgroundSize,
          position: style.backgroundPosition,
          repeat: style.backgroundRepeat
        });
      }
    }
    
    // Extract SVG content
    if (element.tagName === 'SVG') {
      assets.svgs.push({
        content: element.outerHTML,
        hash: this.generateContentHash(element.outerHTML)
      });
    }
    
    return assets;
  }
  
  /**
   * Generate component signature for detection
   */
  private generateComponentSignature(data: ExtractedElementData): string {
    const signature = {
      tagName: data.tagName,
      classList: data.classList.sort(),
      dimensions: {
        width: Math.round(data.bounds.width),
        height: Math.round(data.bounds.height)
      },
      childCount: data.children.length,
      hasText: !!data.textContent,
      visualHash: this.hashVisualProperties(data.visual)
    };
    
    return btoa(JSON.stringify(signature)).substring(0, 16);
  }
  
  /**
   * Register element for component detection
   */
  private registerForComponentDetection(data: ExtractedElementData, element: Element): void {
    const signature = data.componentSignature;
    if (!signature) return;
    
    if (!this.componentSignatures.has(signature)) {
      this.componentSignatures.set(signature, []);
    }
    
    this.componentSignatures.get(signature)!.push(element);
  }
  
  /**
   * Process children including shadow DOM piercing
   */
  private extractChildren(element: Element, data: ExtractedElementData, documentOrigin: { x: number; y: number }): void {
    // Regular children
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      const childData = this.extractElementData(child, documentOrigin);
      if (childData) {
        data.children.push(childData);
      }
    }
    
    // Shadow DOM piercing
    if ((element as any).shadowRoot) {
      const shadowRoot = (element as any).shadowRoot;
      for (let i = 0; i < shadowRoot.children.length; i++) {
        const child = shadowRoot.children[i];
        const childData = this.extractElementData(child, documentOrigin);
        if (childData) {
          data.children.push(childData);
        }
      }
    }
  }
  
  /**
   * Utility functions
   */
  
  private isFlexContainer(style: CSSStyleDeclaration): boolean {
    return style.display === 'flex' || style.display === 'inline-flex';
  }
  
  private hasTextContent(element: Element): boolean {
    return !!(element.textContent && element.textContent.trim().length > 0);
  }
  
  private extractTextContent(element: Element): string {
    return element.textContent?.trim() || '';
  }
  
  private determineElementType(element: Element, style: CSSStyleDeclaration): { type: string; name: string } {
    // Determine optimal Figma node type
    if (this.hasTextContent(element) && !element.children.length) {
      return { type: 'TEXT', name: element.textContent?.slice(0, 50) || 'Text' };
    }
    
    if (element.tagName === 'IMG') {
      return { type: 'IMAGE', name: 'Image' };
    }
    
    if (element.tagName === 'SVG') {
      return { type: 'VECTOR', name: 'Vector' };
    }
    
    if (this.isFlexContainer(style) || element.children.length > 0) {
      return { type: 'FRAME', name: element.tagName.toLowerCase() };
    }
    
    return { type: 'RECTANGLE', name: element.tagName.toLowerCase() };
  }
  
  private generateElementId(element: Element): string {
    return element.id || `${element.tagName.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateContentHash(content: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  private registerColor(color: string): void {
    this.colorRegistry.set(color, (this.colorRegistry.get(color) || 0) + 1);
  }
  
  private parseColor(colorString: string): { r: number; g: number; b: number; a?: number } | null {
    // Parse RGB/RGBA color strings to Figma color format
    const rgbaMatch = colorString.match(/rgba?\\((.*?)\\)/);
    if (rgbaMatch) {
      const values = rgbaMatch[1].split(',').map(v => parseFloat(v.trim()));
      return {
        r: values[0] / 255,
        g: values[1] / 255,
        b: values[2] / 255,
        a: values[3] !== undefined ? values[3] : 1
      };
    }
    
    // Handle hex colors, named colors, etc.
    // This would be expanded for full color parsing
    return null;
  }
  
  private parseGradient(gradient: string): any {
    // Parse CSS gradient strings into Figma gradient format
    // This would be implemented for linear/radial gradients
    return null;
  }
  
  private parseBoxShadow(boxShadow: string): any[] {
    // Parse CSS box-shadow into Figma effects
    // This would handle multiple shadows, inset shadows, etc.
    return [];
  }
  
  private hashVisualProperties(visual: any): string {
    return this.generateContentHash(JSON.stringify(visual));
  }
}