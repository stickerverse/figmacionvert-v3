import { getEffectiveChildElements, getEffectiveChildren } from './utils/shadow-dom-utils';

export interface ComputedStyle {
  // Basic box model
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  
  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing: string;
  textAlign: 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';
  color: string;
  textShadow?: string;
  
  // Background
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  
  // Border & Effects
  borderRadius: string;
  borderWidth: string;
  borderColor: string;
  boxShadow?: string;
  opacity: number;
  
  // Layout
  display: string;
  position: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  
  // Transforms
  transform?: string;
  transformOrigin?: string;
  
  // Special flags
  isVisible: boolean;
  isPositioned: boolean;
  isFlexContainer: boolean;
  isTextNode: boolean;
  isImageNode: boolean;
  isSvgNode: boolean;
}

interface NodeMetadata {
  tagName: string;
  className: string;
  textContent?: string;
  src?: string;
  alt?: string;
  href?: string;
  role?: string;
  ariaLabel?: string;
  computedStyles?: Record<string, any>;
}

export interface LayoutNode {
  id: string;
  type: 'FRAME' | 'TEXT' | 'IMAGE' | 'SVG' | 'COMPONENT' | 'INSTANCE';
  name: string;
  style: ComputedStyle;
  children: LayoutNode[];
  
  // Raw element reference (for debugging)
  _element?: Element;
  
  // Additional metadata
  metadata: NodeMetadata;
}

export class HighFidelityCapture {
  private static IGNORED_TAGS = new Set([
    'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'SVG'
  ]);

  private static VISIBILITY_HIDDEN = [
    'hidden',
    'collapse',
    'display: none',
    'visibility: hidden',
    'opacity: 0',
    'width: 0',
    'height: 0',
    'position: absolute; left: -9999px',
    'position: fixed; top: -9999px',
  ];

  static async capturePage(options: {
    captureBoxShadow?: boolean;
    captureTextShadow?: boolean;
    captureTransforms?: boolean;
    capturePseudoElements?: boolean;
    captureComputedStyles?: boolean;
  } = {}): Promise<LayoutNode | null> {
    try {
      // Prefer <body> (actual page content) with a fallback to <html>
      const primaryRoot = document.body || document.documentElement;
      let rootNode = await this.analyzeElement(primaryRoot, options);

      // Fallback: try the other root if the first pass got filtered out
      if (!rootNode && primaryRoot !== document.documentElement) {
        rootNode = await this.analyzeElement(document.documentElement, options);
      }

      // Final guard: ensure we always return a root frame with viewport bounds
      if (!rootNode) {
        const width = window.innerWidth;
        const height = Math.max(window.innerHeight, document.documentElement?.scrollHeight || 0);
        rootNode = {
          id: this.generateId(),
          type: 'FRAME',
          name: 'Page',
          style: {
            width,
            height,
            top: 0,
            left: 0,
            right: width,
            bottom: height,
            fontFamily: '',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: 'normal',
            letterSpacing: '0px',
            textAlign: 'left',
            color: 'rgb(0, 0, 0)',
            backgroundColor: 'transparent',
            backgroundImage: '',
            backgroundSize: '',
            backgroundPosition: '',
            backgroundRepeat: '',
            borderRadius: '',
            borderWidth: '',
            borderColor: '',
            opacity: 1,
            display: 'block',
            position: 'static',
            isVisible: true,
            isPositioned: false,
            isFlexContainer: false,
            isTextNode: false,
            isImageNode: false,
            isSvgNode: false,
          },
          children: [],
          metadata: {
            tagName: primaryRoot?.tagName?.toLowerCase() || 'body',
            className: primaryRoot?.className || ''
          }
        } as LayoutNode;
      }

      return rootNode;
    } catch (error) {
      console.error('Error in capturePage:', error);
      return null;
    }
  }

  private static async analyzeElement(
    element: Element | null,
    options: {
      captureBoxShadow?: boolean;
      captureTextShadow?: boolean;
      captureTransforms?: boolean;
      capturePseudoElements?: boolean;
      captureComputedStyles?: boolean;
    } = {}
  ): Promise<LayoutNode | null> {
    // Handle null element case
    if (!element) {
      return null;
    }
    // Skip ignored elements
    if (this.shouldIgnoreElement(element)) {
      return null;
    }

    // Get computed styles
    const computedStyle = await this.getComputedStyles(element, options);
    
    // Skip invisible elements
    if (!computedStyle.isVisible) {
      return null;
    }

    // Create the node with basic properties
    const node: LayoutNode = {
      id: this.generateId(),
      type: this.determineNodeType(element, computedStyle),
      name: this.getElementName(element, computedStyle),
      style: computedStyle,
      children: [],
      metadata: this.extractMetadata(element, computedStyle, options)
    };

    // Process children (including shadow DOM)
    if (node.type !== 'TEXT' && node.type !== 'IMAGE') {
      const effectiveChildren = getEffectiveChildElements(element);
      if (effectiveChildren.length > 0) {
        for (const child of effectiveChildren) {
          const childNode = await this.analyzeElement(child as HTMLElement, options);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }
    }

    // Process pseudo-elements if enabled
    if (options.capturePseudoElements) {
      await this.processPseudoElements(element, node, options);
    }

    // Apply heuristics for simplification
    return this.applyHeuristics(node);
  }

  private static shouldIgnoreElement(element: Element): boolean {
    // Never ignore the document roots
    if (element === document.documentElement || element === document.body) {
      return false;
    }
    // Skip ignored tags
    if (this.IGNORED_TAGS.has(element.tagName)) {
      return true;
    }

    // Skip elements with display: none or visibility: hidden
    const style = window.getComputedStyle(element);
    if (!style) {
      console.warn(`⚠️ [DOM] getComputedStyle returned null for element:`, element.tagName, element.id);
      return true; // Skip elements without styles
    }
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return true;
    }

    // Skip elements with zero size
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return true;
    }

    return false;
  }

  private static async getComputedStyles(
    element: Element,
    options: {
      captureBoxShadow?: boolean;
      captureTextShadow?: boolean;
      captureTransforms?: boolean;
      captureComputedStyles?: boolean;
    } = {}
  ): Promise<ComputedStyle> {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return {
      // Basic layout
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      
      // Typography
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: this.parseFontWeight(style.fontWeight),
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textAlign: style.textAlign as any,
      color: style.color,
      textShadow: options.captureTextShadow ? style.textShadow : undefined,
      
      // Background and borders
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      backgroundRepeat: style.backgroundRepeat,
      borderRadius: style.borderRadius,
      borderWidth: style.borderWidth,
      borderColor: style.borderColor,
      boxShadow: options.captureBoxShadow ? style.boxShadow : undefined,
      
      // Layout
      display: style.display,
      position: style.position as any,
      flexDirection: style.flexDirection as any,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      gap: style.gap,
      
      // Transforms and effects
      transform: options.captureTransforms ? style.transform : undefined,
      transformOrigin: options.captureTransforms ? style.transformOrigin : undefined,
      opacity: parseFloat(style.opacity) || 1,
      
      // Flags
      isVisible: this.isElementVisible(element, style, rect),
      isPositioned: style.position !== 'static',
      isFlexContainer: style.display === 'flex' || style.display === 'inline-flex',
      isTextNode: (() => {
        const children = getEffectiveChildren(element);
        return children.length === 1 && 
               children[0].nodeType === Node.TEXT_NODE &&
               (children[0].textContent?.trim() || '') !== '';
      })(),
      isImageNode: element.tagName === 'IMG',
      isSvgNode: element.tagName === 'SVG',
    };
  }

  private static isElementVisible(element: Element, style: CSSStyleDeclaration, rect: DOMRect): boolean {
    // Check if element is in viewport
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    // Check common visibility hiders
    const hidden = this.VISIBILITY_HIDDEN.some(h => {
      return element.getAttribute('style')?.includes(h) || 
             element.outerHTML.includes(h);
    });

    if (hidden) return false;

    // Check if any parent is hidden
    let parent = element.parentElement;
    while (parent) {
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || 
          parentStyle.visibility === 'hidden' || 
          parseFloat(parentStyle.opacity) === 0) {
        return false;
      }
      parent = parent.parentElement;
    }

    return true;
  }

  private static determineNodeType(element: Element, style: ComputedStyle): LayoutNode['type'] {
    if (element.tagName === 'IMG') return 'IMAGE';
    if (element.tagName === 'SVG') return 'SVG';
    if (style.isTextNode) return 'TEXT';
    
    // Check for common UI components
    const role = element.getAttribute('role');
    if (role === 'button' || element.tagName === 'BUTTON') return 'COMPONENT';
    if (role === 'link' || element.tagName === 'A') return 'COMPONENT';
    if (role === 'heading' || /^h[1-6]$/i.test(element.tagName)) return 'TEXT';
    
    return 'FRAME';
  }

  private static getElementName(element: Element, style: ComputedStyle): string {
    // Try to get meaningful name from attributes
    const name = 
      element.getAttribute('aria-label') || 
      element.getAttribute('alt') ||
      element.getAttribute('title') ||
      element.getAttribute('name') ||
      element.getAttribute('id') ||
      element.getAttribute('class') ||
      element.tagName.toLowerCase();

    // Clean up the name
    return name.trim().split(/\s+/)[0];
  }

  private static extractMetadata(
    element: Element,
    style: ComputedStyle,
    options: {
      captureComputedStyles?: boolean;
    } = {}
  ): LayoutNode['metadata'] {
    return {
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      textContent: style.isTextNode && element.textContent ? element.textContent.trim() : undefined,
      src: element.getAttribute('src') || undefined,
      alt: element.getAttribute('alt') || undefined,
      href: element.getAttribute('href') || undefined,
      role: element.getAttribute('role') || undefined,
      ariaLabel: element.getAttribute('aria-label') || undefined,
      computedStyles: options.captureComputedStyles ? style : undefined,
    };
  }

  private static applyHeuristics(node: LayoutNode): LayoutNode | null {
    // If node is null after processing, return null
    if (!node) return null;
    // Remove empty containers
    if (node.children.length === 0 && !node.metadata.textContent) {
      return null;
    }

    // Merge single child containers
    if (node.children.length === 1 && node.type === 'FRAME') {
      const child = node.children[0];
      if (child.type === 'FRAME' && !node.style.isFlexContainer) {
        return this.mergeNodes(node, child);
      }
    }

    // Flatten text nodes
    if (node.children.length > 0 && node.type === 'FRAME') {
      node.children = node.children.filter(child => {
        if (child.type === 'TEXT' && child.children.length === 0) {
          node.metadata.textContent = (node.metadata.textContent || '') + ' ' + (child.metadata.textContent || '');
          return false;
        }
        return true;
      });
    }

    return node;
  }

  private static mergeNodes(parent: LayoutNode, child: LayoutNode): LayoutNode {
    // Merge styles
    const mergedStyle: Partial<ComputedStyle> = { ...parent.style };
    
    // Take child's dimensions if parent doesn't have explicit ones
    if (!parent.style.width) mergedStyle.width = child.style.width;
    if (!parent.style.height) mergedStyle.height = child.style.height;
    
    // Create merged node
    return {
      ...child,
      style: { ...child.style, ...mergedStyle },
      metadata: {
        ...parent.metadata,
        ...child.metadata,
        className: [parent.metadata.className, child.metadata.className].filter(Boolean).join(' ')
      },
      // Keep parent's children if any
      children: parent.children.length > 1 ? parent.children : child.children
    };
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private static parseFontWeight(weight: string): number {
    if (!weight) return 400;
    if (weight === 'bold') return 700;
    if (weight === 'normal') return 400;
    return parseInt(weight, 10) || 400;
  }

  private static processPseudoElements(
    element: Element,
    parentNode: LayoutNode,
    options: {
      capturePseudoElements?: boolean;
      captureComputedStyles?: boolean;
    }
  ): Promise<void> {
    // Implementation for processing pseudo-elements
    // This is a placeholder - you'll need to implement the actual logic
    // for capturing ::before and ::after pseudo-elements
    return Promise.resolve();
  }
}
