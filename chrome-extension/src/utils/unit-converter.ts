/**
 * Unit Converter - Normalizes CSS units to pixel values
 * Handles rem, em, vh, vw, vmin, vmax, and percentage conversions
 */

export class UnitConverter {
  private rootFontSize: number;
  private viewportWidth: number;
  private viewportHeight: number;
  private cssVariables: Map<string, string> = new Map();

  constructor(options?: {
    rootFontSize?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  }) {
    // Get root font size from computed style if not provided
    this.rootFontSize = options?.rootFontSize || this.getRootFontSize();
    this.viewportWidth = options?.viewportWidth || window.innerWidth;
    this.viewportHeight = options?.viewportHeight || window.innerHeight;

    // Extract CSS variables from root
    this.extractCSSVariables();
  }

  /**
   * Get the root font size from document element
   */
  private getRootFontSize(): number {
    const rootStyle = getComputedStyle(document.documentElement);
    const fontSize = rootStyle.fontSize;
    return parseFloat(fontSize) || 16; // Default to 16px
  }

  /**
   * Extract all CSS custom properties from :root
   */
  private extractCSSVariables() {
    const rootStyle = getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyle.length; i++) {
      const prop = rootStyle[i];
      if (prop.startsWith('--')) {
        const value = rootStyle.getPropertyValue(prop).trim();
        this.cssVariables.set(prop, value);
      }
    }
  }

  /**
   * Convert any CSS length value to pixels
   * Handles: px, rem, em, vh, vw, vmin, vmax, %, pt, cm, mm, in, pc
   */
  toPx(value: string, contextFontSize?: number): number {
    if (!value || value === 'auto' || value === 'none') {
      return 0;
    }

    const trimmed = value.trim().toLowerCase();

    // Already in pixels
    if (trimmed.endsWith('px')) {
      return parseFloat(trimmed);
    }

    // rem - relative to root font size
    if (trimmed.endsWith('rem')) {
      return parseFloat(trimmed) * this.rootFontSize;
    }

    // em - relative to context font size (or root if not provided)
    if (trimmed.endsWith('em')) {
      const fontSize = contextFontSize || this.rootFontSize;
      return parseFloat(trimmed) * fontSize;
    }

    // vh - 1% of viewport height
    if (trimmed.endsWith('vh')) {
      return (parseFloat(trimmed) / 100) * this.viewportHeight;
    }

    // vw - 1% of viewport width
    if (trimmed.endsWith('vw')) {
      return (parseFloat(trimmed) / 100) * this.viewportWidth;
    }

    // vmin - 1% of smaller viewport dimension
    if (trimmed.endsWith('vmin')) {
      const minDimension = Math.min(this.viewportWidth, this.viewportHeight);
      return (parseFloat(trimmed) / 100) * minDimension;
    }

    // vmax - 1% of larger viewport dimension
    if (trimmed.endsWith('vmax')) {
      const maxDimension = Math.max(this.viewportWidth, this.viewportHeight);
      return (parseFloat(trimmed) / 100) * maxDimension;
    }

    // pt - points (1pt = 1/72 inch = 1.333px)
    if (trimmed.endsWith('pt')) {
      return parseFloat(trimmed) * (4 / 3);
    }

    // cm - centimeters (1cm = 37.8px)
    if (trimmed.endsWith('cm')) {
      return parseFloat(trimmed) * 37.8;
    }

    // mm - millimeters (1mm = 3.78px)
    if (trimmed.endsWith('mm')) {
      return parseFloat(trimmed) * 3.78;
    }

    // in - inches (1in = 96px)
    if (trimmed.endsWith('in')) {
      return parseFloat(trimmed) * 96;
    }

    // pc - picas (1pc = 16px)
    if (trimmed.endsWith('pc')) {
      return parseFloat(trimmed) * 16;
    }

    // Unitless number - assume pixels
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num;
    }

    return 0;
  }

  /**
   * Resolve CSS variable references (var(--name, fallback))
   * Returns resolved value or original if not a variable
   */
  resolveVariable(value: string): string {
    if (!value || !value.includes('var(')) {
      return value;
    }

    // Match var(--name) or var(--name, fallback)
    const varRegex = /var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/g;

    return value.replace(varRegex, (match, varName, fallback) => {
      const resolved = this.cssVariables.get(varName);
      if (resolved) {
        // Recursively resolve in case variable contains another variable
        return this.resolveVariable(resolved);
      }
      // Use fallback if provided, otherwise keep original
      return fallback ? fallback.trim() : match;
    });
  }

  /**
   * Normalize color to rgba format
   * Handles: hex, rgb, rgba, hsl, hsla, hwb, named colors
   */
  normalizeColor(color: string): { r: number; g: number; b: number; a: number } | null {
    if (!color) return null;

    const trimmed = color.trim().toLowerCase();

    // Let browser parse the color by creating a temporary element
    const div = document.createElement('div');
    div.style.color = trimmed;
    document.body.appendChild(div);
    const computed = getComputedStyle(div).color;
    document.body.removeChild(div);

    // Parse rgb/rgba format (browser always returns this format)
    const rgbaMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]) / 255,
        g: parseInt(rgbaMatch[2]) / 255,
        b: parseInt(rgbaMatch[3]) / 255,
        a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
      };
    }

    return null;
  }

  /**
   * Resolve font stack to best available font
   * Returns the first available font or fallback
   */
  resolveFontStack(fontFamily: string): string {
    if (!fontFamily) return 'Inter';

    // Split font stack by commas
    const fonts = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));

    // Check which fonts are available
    for (const font of fonts) {
      if (this.isFontAvailable(font)) {
        return font;
      }
    }

    // Fallback to generic font family
    const genericFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'];
    const lastFont = fonts[fonts.length - 1]?.toLowerCase();

    if (lastFont && genericFonts.includes(lastFont)) {
      // Map generic families to common fonts
      const genericMap: Record<string, string> = {
        'serif': 'Georgia',
        'sans-serif': 'Inter',
        'monospace': 'Monaco',
        'cursive': 'Comic Sans MS',
        'fantasy': 'Impact'
      };
      return genericMap[lastFont] || 'Inter';
    }

    return 'Inter'; // Ultimate fallback
  }

  /**
   * Check if a font is available in the browser
   */
  private isFontAvailable(fontName: string): boolean {
    // Use a canvas to test font availability
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return false;

    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    // Measure with default font
    context.font = `${testSize} monospace`;
    const baselineWidth = context.measureText(testString).width;

    // Measure with test font + fallback
    context.font = `${testSize} "${fontName}", monospace`;
    const testWidth = context.measureText(testString).width;

    // If widths differ, the font is available
    return testWidth !== baselineWidth;
  }

  /**
   * Convert percentage to pixels based on container size
   */
  percentToPx(percentage: string, containerSize: number): number {
    const value = parseFloat(percentage);
    if (isNaN(value)) return 0;
    return (value / 100) * containerSize;
  }

  /**
   * Update viewport dimensions (useful for multi-viewport captures)
   */
  updateViewport(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Update root font size
   */
  updateRootFontSize(fontSize: number) {
    this.rootFontSize = fontSize;
  }
}
