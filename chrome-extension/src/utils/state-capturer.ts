import { VariantData, ElementNode, RGBA, Fill, Stroke, Effect } from '../types/schema';

/**
 * Interactive State Capture System
 * 
 * Programmatically triggers and captures pseudo-states (:hover, :focus, :active, :disabled)
 * for interactive elements to enable Figma variant generation.
 */

interface StateExtractionResult {
  state: VariantData['state'];
  properties: Partial<ElementNode>;
  successful: boolean;
  error?: string;
}

export interface StateCaptureProgress {
  phase: 'analyzing' | 'capturing-hover' | 'capturing-focus' | 'capturing-active' | 'capturing-disabled' | 'cleanup';
  message: string;
  element?: Element;
  elementIndex?: number;
  totalElements?: number;
}

type ProgressCallback = (progress: StateCaptureProgress) => void;

export class StateCapturer {
  private originalStates = new WeakMap<Element, any>();
  private visitedElements = new WeakSet<Element>();
  private progressCallback?: ProgressCallback;
  
  // Interactive element selectors to target for state capture
  private static readonly INTERACTIVE_SELECTORS = [
    'button',
    'a[href]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    'input[type="text"]',
    'input[type="email"]',
    'input[type="password"]',
    'input[type="search"]',
    'input[type="tel"]',
    'input[type="url"]',
    'input[type="number"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[tabindex]:not([tabindex="-1"])',
    // Common interactive classes
    '.btn', '.button', '.link', '.clickable', '.interactive'
  ];

  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  private reportProgress(
    phase: StateCaptureProgress['phase'],
    message: string,
    element?: Element,
    elementIndex?: number,
    totalElements?: number
  ) {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        message,
        element,
        elementIndex,
        totalElements
      });
    }
  }

  /**
   * Capture interactive states for all detected interactive elements
   */
  async captureInteractiveStates(rootElement: Element = document.body): Promise<Map<Element, VariantData[]>> {
    this.reportProgress('analyzing', 'Finding interactive elements...');
    
    const interactiveElements = this.findInteractiveElements(rootElement);
    const results = new Map<Element, VariantData[]>();
    
    console.log(`🎯 Found ${interactiveElements.length} interactive elements for state capture`);
    
    for (let i = 0; i < interactiveElements.length; i++) {
      const element = interactiveElements[i];
      
      // Prevent circular references
      if (this.visitedElements.has(element)) {
        continue;
      }
      this.visitedElements.add(element);
      
      this.reportProgress(
        'capturing-hover',
        `Capturing states for ${element.tagName.toLowerCase()}...`,
        element,
        i + 1,
        interactiveElements.length
      );
      
      const variants = await this.captureElementStates(element);
      if (variants.length > 0) {
        results.set(element, variants);
      }
    }
    
    this.reportProgress('cleanup', 'Cleaning up temporary styles...');
    await this.cleanup();
    
    console.log(`✅ Captured states for ${results.size} elements`);
    return results;
  }

  /**
   * Find all interactive elements in the DOM
   */
  private findInteractiveElements(rootElement: Element): HTMLElement[] {
    const elements: HTMLElement[] = [];
    
    // Use a combined selector for efficiency
    const selector = StateCapturer.INTERACTIVE_SELECTORS.join(', ');
    
    try {
      const found = rootElement.querySelectorAll(selector);
      found.forEach((element) => {
        if (element instanceof HTMLElement && this.isInteractiveElement(element)) {
          elements.push(element);
        }
      });
    } catch (error) {
      console.warn('Failed to query interactive elements:', error);
    }
    
    return elements;
  }

  /**
   * Check if element is truly interactive and worth capturing states for
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    // Skip if element is not visible
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    // Skip if element has no size
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    // Skip disabled elements (but we'll capture their disabled state)
    const tagName = element.tagName.toLowerCase();
    
    // Check for explicit interactive indicators
    const hasInteractiveRole = element.getAttribute('role') === 'button' || 
                              element.getAttribute('role') === 'link' ||
                              element.getAttribute('role') === 'tab' ||
                              element.getAttribute('role') === 'menuitem';
    
    const isFormControl = ['input', 'button', 'textarea', 'select'].includes(tagName);
    const isLink = tagName === 'a' && element.hasAttribute('href');
    const hasTabIndex = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
    const hasInteractiveClass = ['btn', 'button', 'link', 'clickable', 'interactive']
      .some(cls => element.classList.contains(cls));
    
    return hasInteractiveRole || isFormControl || isLink || hasTabIndex || hasInteractiveClass;
  }

  /**
   * Capture all available states for a single element
   */
  private async captureElementStates(element: HTMLElement): Promise<VariantData[]> {
    const variants: VariantData[] = [];
    
    try {
      // Store original state
      this.storeOriginalState(element);
      
      // Capture default state first
      const defaultState = this.extractElementProperties(element);
      variants.push({
        state: 'default',
        properties: defaultState
      });
      
      // Capture hover state
      const hoverState = await this.captureHoverState(element);
      if (hoverState.successful) {
        variants.push({
          state: 'hover',
          properties: hoverState.properties
        });
      }
      
      // Capture focus state (for focusable elements)
      if (this.isFocusable(element)) {
        const focusState = await this.captureFocusState(element);
        if (focusState.successful) {
          variants.push({
            state: 'focus',
            properties: focusState.properties
          });
        }
      }
      
      // Capture active state
      const activeState = await this.captureActiveState(element);
      if (activeState.successful) {
        variants.push({
          state: 'active',
          properties: activeState.properties
        });
      }
      
      // Capture disabled state (for form elements)
      if (this.canBeDisabled(element)) {
        const disabledState = await this.captureDisabledState(element);
        if (disabledState.successful) {
          variants.push({
            state: 'disabled',
            properties: disabledState.properties
          });
        }
      }
      
    } catch (error) {
      console.warn(`Failed to capture states for element:`, element, error);
    } finally {
      // Always restore original state
      this.restoreOriginalState(element);
    }
    
    return variants;
  }

  /**
   * Store the original state of an element
   */
  private storeOriginalState(element: HTMLElement) {
    const originalState = {
      className: element.className,
      style: element.style.cssText,
      disabled: (element as any).disabled,
      dataset: { ...element.dataset }
    };
    this.originalStates.set(element, originalState);
  }

  /**
   * Restore the original state of an element
   */
  private restoreOriginalState(element: HTMLElement) {
    const originalState = this.originalStates.get(element);
    if (originalState) {
      element.className = originalState.className;
      element.style.cssText = originalState.style;
      (element as any).disabled = originalState.disabled;
      
      // Restore dataset
      Object.keys(element.dataset).forEach(key => {
        delete element.dataset[key];
      });
      Object.assign(element.dataset, originalState.dataset);
    }
  }

  /**
   * Capture hover state by programmatically triggering :hover
   */
  private async captureHoverState(element: HTMLElement): Promise<StateExtractionResult> {
    try {
      // Method 1: Try CSS :hover simulation with temporary class
      const hoverClass = 'figma-temp-hover-state';
      this.injectHoverStyles(element, hoverClass);
      element.classList.add(hoverClass);
      
      // Wait for styles to apply
      await this.wait(50);
      
      const properties = this.extractElementProperties(element);
      
      // Cleanup
      element.classList.remove(hoverClass);
      this.removeHoverStyles(hoverClass);
      
      return {
        state: 'hover',
        properties,
        successful: true
      };
      
    } catch (error) {
      return {
        state: 'hover',
        properties: {},
        successful: false,
        error: String(error)
      };
    }
  }

  /**
   * Capture focus state
   */
  private async captureFocusState(element: HTMLElement): Promise<StateExtractionResult> {
    try {
      // Store current focus
      const previousActiveElement = document.activeElement;
      
      // Focus the element
      element.focus();
      await this.wait(50);
      
      const properties = this.extractElementProperties(element);
      
      // Restore focus
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      } else {
        element.blur();
      }
      
      return {
        state: 'focus',
        properties,
        successful: true
      };
      
    } catch (error) {
      return {
        state: 'focus',
        properties: {},
        successful: false,
        error: String(error)
      };
    }
  }

  /**
   * Capture active state by adding :active class simulation
   */
  private async captureActiveState(element: HTMLElement): Promise<StateExtractionResult> {
    try {
      const activeClass = 'figma-temp-active-state';
      this.injectActiveStyles(element, activeClass);
      element.classList.add(activeClass);
      
      await this.wait(50);
      
      const properties = this.extractElementProperties(element);
      
      element.classList.remove(activeClass);
      this.removeActiveStyles(activeClass);
      
      return {
        state: 'active',
        properties,
        successful: true
      };
      
    } catch (error) {
      return {
        state: 'active',
        properties: {},
        successful: false,
        error: String(error)
      };
    }
  }

  /**
   * Capture disabled state
   */
  private async captureDisabledState(element: HTMLElement): Promise<StateExtractionResult> {
    try {
      const wasDisabled = (element as any).disabled;
      (element as any).disabled = true;
      
      await this.wait(50);
      
      const properties = this.extractElementProperties(element);
      
      (element as any).disabled = wasDisabled;
      
      return {
        state: 'disabled',
        properties,
        successful: true
      };
      
    } catch (error) {
      return {
        state: 'disabled',
        properties: {},
        successful: false,
        error: String(error)
      };
    }
  }

  /**
   * Extract relevant visual properties from element
   */
  private extractElementProperties(element: HTMLElement): Partial<ElementNode> {
    const computed = window.getComputedStyle(element);
    const properties: Partial<ElementNode> = {};
    
    // Extract fills (background)
    const fills = this.extractFills(computed);
    if (fills.length > 0) {
      properties.fills = fills;
    }
    
    // Extract strokes (borders)
    const strokes = this.extractStrokes(computed);
    if (strokes.length > 0) {
      properties.strokes = strokes;
    }
    
    // Extract effects (shadows)
    const effects = this.extractEffects(computed);
    if (effects.length > 0) {
      properties.effects = effects;
    }
    
    // Extract opacity
    const opacity = parseFloat(computed.opacity);
    if (opacity !== 1) {
      properties.opacity = opacity;
    }
    
    // Extract corner radius
    const borderRadius = this.parseCornerRadius(computed);
    if (borderRadius) {
      properties.cornerRadius = borderRadius;
    }
    
    // Extract text style for text elements
    if (element.textContent && element.textContent.trim()) {
      properties.textStyle = this.extractTextStyle(computed);
    }
    
    return properties;
  }

  /**
   * Extract background fills from computed styles
   */
  private extractFills(computed: CSSStyleDeclaration): Fill[] {
    const fills: Fill[] = [];
    
    if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const color = this.parseColor(computed.backgroundColor);
      if (color) {
        fills.push({
          type: 'SOLID',
          color,
          visible: true,
          opacity: color.a
        });
      }
    }
    
    return fills;
  }

  /**
   * Extract border strokes from computed styles
   */
  private extractStrokes(computed: CSSStyleDeclaration): Stroke[] {
    const strokes: Stroke[] = [];
    
    const borderColor = computed.borderColor || computed.borderTopColor;
    const borderWidth = parseFloat(computed.borderWidth || computed.borderTopWidth || '0');
    
    if (borderWidth > 0 && borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
      const color = this.parseColor(borderColor);
      if (color) {
        strokes.push({
          type: 'SOLID',
          color,
          thickness: borderWidth,
          strokeAlign: 'INSIDE',
          opacity: color.a
        });
      }
    }
    
    return strokes;
  }

  /**
   * Extract shadow effects from computed styles
   */
  private extractEffects(computed: CSSStyleDeclaration): Effect[] {
    const effects: Effect[] = [];
    
    if (computed.boxShadow && computed.boxShadow !== 'none') {
      // Parse box shadow
      const shadowMatch = computed.boxShadow.match(/rgba?\([^)]+\)|#[0-9a-f]{3,6}|\b\w+\b/gi);
      if (shadowMatch) {
        const color = this.parseColor(shadowMatch[0]);
        if (color) {
          effects.push({
            type: 'DROP_SHADOW',
            visible: true,
            radius: 4, // Default blur radius
            color,
            offset: { x: 0, y: 2 } // Default offset
          });
        }
      }
    }
    
    return effects;
  }

  /**
   * Extract text style from computed styles
   */
  private extractTextStyle(computed: CSSStyleDeclaration): any {
    const fontFamily = computed.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
    const fontSize = parseFloat(computed.fontSize);
    const fontWeight = parseInt(computed.fontWeight) || 400;
    const lineHeight = computed.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(computed.lineHeight);
    
    const color = this.parseColor(computed.color);
    
    return {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight: { value: lineHeight, unit: 'PIXELS' as const },
      letterSpacing: { value: 0, unit: 'PIXELS' as const },
      textAlignHorizontal: this.mapTextAlign(computed.textAlign),
      textAlignVertical: 'TOP' as const,
      fills: color ? [{ type: 'SOLID' as const, color, visible: true }] : []
    };
  }

  /**
   * Parse corner radius from computed styles
   */
  private parseCornerRadius(computed: CSSStyleDeclaration): number | undefined {
    const borderRadius = computed.borderRadius;
    if (borderRadius && borderRadius !== '0px') {
      const radius = parseFloat(borderRadius);
      return isNaN(radius) ? undefined : radius;
    }
    return undefined;
  }

  /**
   * Parse color string to RGBA object
   */
  private parseColor(colorStr: string): RGBA | null {
    if (!colorStr || colorStr === 'transparent') return null;
    
    // Handle rgb/rgba
    const rgbaMatch = colorStr.match(/rgba?\(([^)]+)\)/);
    if (rgbaMatch) {
      const values = rgbaMatch[1].split(',').map(v => parseFloat(v.trim()));
      return {
        r: values[0] / 255,
        g: values[1] / 255,
        b: values[2] / 255,
        a: values[3] !== undefined ? values[3] : 1
      };
    }
    
    // Handle hex colors
    const hexMatch = colorStr.match(/#([0-9a-f]{3,6})/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
    }
    
    return null;
  }

  /**
   * Map CSS text-align to Figma text alignment
   */
  private mapTextAlign(textAlign: string): 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED' {
    switch (textAlign) {
      case 'center': return 'CENTER';
      case 'right': return 'RIGHT';
      case 'justify': return 'JUSTIFIED';
      default: return 'LEFT';
    }
  }

  /**
   * Check if element can receive focus
   */
  private isFocusable(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    const focusableTags = ['input', 'textarea', 'select', 'button', 'a'];
    
    return focusableTags.includes(tagName) ||
           element.hasAttribute('tabindex') ||
           element.hasAttribute('contenteditable');
  }

  /**
   * Check if element can be disabled
   */
  private canBeDisabled(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return ['input', 'textarea', 'select', 'button'].includes(tagName);
  }

  /**
   * Inject temporary hover styles for simulation
   */
  private injectHoverStyles(element: HTMLElement, className: string) {
    const style = document.createElement('style');
    style.id = `figma-hover-${className}`;
    
    // Generate a specific selector for this element
    const selector = this.generateElementSelector(element);
    
    style.textContent = `
      ${selector}.${className} {
        filter: brightness(1.1) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
        transition: all 0.2s ease !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Remove hover styles
   */
  private removeHoverStyles(className: string) {
    const style = document.getElementById(`figma-hover-${className}`);
    if (style) {
      style.remove();
    }
  }

  /**
   * Inject temporary active styles for simulation
   */
  private injectActiveStyles(element: HTMLElement, className: string) {
    const style = document.createElement('style');
    style.id = `figma-active-${className}`;
    
    const selector = this.generateElementSelector(element);
    
    style.textContent = `
      ${selector}.${className} {
        filter: brightness(0.9) !important;
        transform: scale(0.98) !important;
        transition: all 0.1s ease !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Remove active styles
   */
  private removeActiveStyles(className: string) {
    const style = document.getElementById(`figma-active-${className}`);
    if (style) {
      style.remove();
    }
  }

  /**
   * Generate a specific CSS selector for an element
   */
  private generateElementSelector(element: HTMLElement): string {
    let selector = element.tagName.toLowerCase();
    
    if (element.id) {
      selector += `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c && !c.startsWith('figma-temp-'));
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    return selector;
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup any remaining temporary styles and restore all elements
   */
  private async cleanup() {
    // Remove any remaining temporary styles
    const tempStyles = document.querySelectorAll('[id*="figma-hover-"], [id*="figma-active-"]');
    tempStyles.forEach(style => style.remove());
    
    // Note: WeakMap doesn't provide keys() method, and we don't need to manually restore
    // since we restore elements individually in the try/finally blocks of captureElementStates
    
    // Clear collections
    this.originalStates = new WeakMap();
    this.visitedElements = new WeakSet();
    
    console.log('🧹 State capture cleanup complete');
  }
}