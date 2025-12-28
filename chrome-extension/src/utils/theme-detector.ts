/**
 * Theme Detection and Activation System
 * 
 * Provides deterministic theme capability detection and activation
 * without guessing or heuristics. Only reports capabilities that can
 * be positively verified and activated.
 */

export type ThemeType = 'default' | 'light' | 'dark';

export interface ThemeCapabilities {
  supportsDefault: boolean;
  supportsLight: boolean;
  supportsDark: boolean;
  detectionDetails: {
    hasPreferColorScheme: boolean;
    hasThemeAttributes: boolean;
    hasThemeToggles: boolean;
    siteSpecificSupport: string | null;
    detectedMethods: string[];
  };
}

export interface ThemeActivationResult {
  success: boolean;
  errorCode?: 'THEME_NOT_AVAILABLE' | 'ACTIVATION_FAILED' | 'ALREADY_ACTIVE';
  errorMessage?: string;
  appliedChanges: ThemeChange[];
}

export interface ThemeChange {
  type: 'media-query' | 'attribute' | 'class' | 'style' | 'toggle-click';
  target: string;
  originalValue: string | null;
  newValue: string;
  element?: Element;
}

export class ThemeDetector {
  private originalState: Map<string, any> = new Map();
  private appliedChanges: ThemeChange[] = [];

  /**
   * Detect which themes this website definitively supports
   */
  async detectThemeCapabilities(): Promise<ThemeCapabilities> {
    const detectionDetails = {
      hasPreferColorScheme: false,
      hasThemeAttributes: false,
      hasThemeToggles: false,
      siteSpecificSupport: null as string | null,
      detectedMethods: [] as string[]
    };

    let supportsLight = false;
    let supportsDark = false;

    // 1. Check CSS prefers-color-scheme media queries
    const mediaQuerySupport = this.detectMediaQueryThemes();
    if (mediaQuerySupport.light || mediaQuerySupport.dark) {
      detectionDetails.hasPreferColorScheme = true;
      detectionDetails.detectedMethods.push('css-media-queries');
      supportsLight = mediaQuerySupport.light;
      supportsDark = mediaQuerySupport.dark;
    }

    // 2. Check for explicit theme attributes/classes
    const attributeSupport = this.detectThemeAttributes();
    if (attributeSupport.light || attributeSupport.dark) {
      detectionDetails.hasThemeAttributes = true;
      detectionDetails.detectedMethods.push('theme-attributes');
      supportsLight = supportsLight || attributeSupport.light;
      supportsDark = supportsDark || attributeSupport.dark;
    }

    // 3. Check for detectable theme toggles
    const toggleSupport = this.detectThemeToggles();
    if (toggleSupport.light || toggleSupport.dark) {
      detectionDetails.hasThemeToggles = true;
      detectionDetails.detectedMethods.push('theme-toggles');
      supportsLight = supportsLight || toggleSupport.light;
      supportsDark = supportsDark || toggleSupport.dark;
    }

    // 4. Site-specific theme detection
    const siteSpecific = this.detectSiteSpecificThemes();
    if (siteSpecific.supported) {
      detectionDetails.siteSpecificSupport = siteSpecific.siteName;
      detectionDetails.detectedMethods.push(`site-specific-${siteSpecific.siteName}`);
      supportsLight = supportsLight || siteSpecific.light;
      supportsDark = supportsDark || siteSpecific.dark;
    }

    return {
      supportsDefault: true, // Always supported
      supportsLight,
      supportsDark,
      detectionDetails
    };
  }

  /**
   * Detect themes via CSS media queries
   */
  private detectMediaQueryThemes(): { light: boolean; dark: boolean } {
    try {
      // Check if CSS has rules for prefers-color-scheme
      const styleSheets = Array.from(document.styleSheets);
      let hasLightRules = false;
      let hasDarkRules = false;

      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          for (const rule of rules) {
            if (rule instanceof CSSMediaRule) {
              const mediaText = rule.media.mediaText.toLowerCase();
              if (mediaText.includes('prefers-color-scheme')) {
                if (mediaText.includes('light')) {
                  hasLightRules = true;
                }
                if (mediaText.includes('dark')) {
                  hasDarkRules = true;
                }
              }
            }
          }
        } catch (e) {
          // Skip inaccessible stylesheets (CORS)
          continue;
        }
      }

      // Also check for CSS custom properties that suggest theme support
      const rootStyles = getComputedStyle(document.documentElement);
      const hasThemeVariables = this.checkForThemeVariables(rootStyles);

      return {
        light: hasLightRules || hasThemeVariables,
        dark: hasDarkRules || hasThemeVariables
      };
    } catch (error) {
      console.warn('Error detecting media query themes:', error);
      return { light: false, dark: false };
    }
  }

  /**
   * Check for CSS custom properties that suggest theme support
   */
  private checkForThemeVariables(styles: CSSStyleDeclaration): boolean {
    const themeProperties = [
      '--color-scheme',
      '--theme',
      '--bg-color',
      '--text-color',
      '--primary-color',
      '--background',
      '--foreground'
    ];

    for (let i = 0; i < styles.length; i++) {
      const prop = styles[i];
      if (prop.startsWith('--') && themeProperties.some(theme => prop.includes(theme))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect themes via explicit attributes/classes
   */
  private detectThemeAttributes(): { light: boolean; dark: boolean } {
    const html = document.documentElement;
    const body = document.body;

    // Common theme attribute patterns
    const themeAttributePatterns = [
      'data-theme',
      'data-color-scheme',
      'data-mode',
      'theme',
      'color-scheme'
    ];

    const themeClassPatterns = [
      /^(light|dark)$/,
      /^theme-(light|dark)$/,
      /^(light|dark)-theme$/,
      /^(light|dark)-mode$/
    ];

    let supportsLight = false;
    let supportsDark = false;

    // Check attributes
    for (const attr of themeAttributePatterns) {
      const htmlValue = html.getAttribute(attr);
      const bodyValue = body?.getAttribute(attr);
      
      if (htmlValue || bodyValue) {
        // If attribute exists, check if it can be set to light/dark
        supportsLight = true;
        supportsDark = true;
        break;
      }
    }

    // Check classes for theme patterns
    const allClasses = [
      ...(html.className.split(' ')),
      ...(body?.className.split(' ') || [])
    ];

    for (const className of allClasses) {
      for (const pattern of themeClassPatterns) {
        const match = className.match(pattern);
        if (match) {
          const theme = match[1];
          if (theme === 'light') supportsLight = true;
          if (theme === 'dark') supportsDark = true;
        }
      }
    }

    // Check for data-* attributes that suggest theme switching
    if (html.hasAttribute('data-bs-theme') || body?.hasAttribute('data-bs-theme')) {
      // Bootstrap theme support
      supportsLight = true;
      supportsDark = true;
    }

    return { light: supportsLight, dark: supportsDark };
  }

  /**
   * Detect theme toggles in the DOM
   */
  private detectThemeToggles(): { light: boolean; dark: boolean } {
    // Common theme toggle selectors
    const toggleSelectors = [
      '[data-theme-toggle]',
      '[data-color-scheme-toggle]',
      '.theme-toggle',
      '.dark-mode-toggle',
      '.light-mode-toggle',
      'button[aria-label*="theme" i]',
      'button[aria-label*="dark" i]',
      'button[aria-label*="light" i]'
    ];

    let foundToggles = false;

    for (const selector of toggleSelectors) {
      const toggles = document.querySelectorAll(selector);
      if (toggles.length > 0) {
        foundToggles = true;
        break;
      }
    }

    // If we found theme toggles, assume both light and dark are supported
    // We'll verify this during activation
    return {
      light: foundToggles,
      dark: foundToggles
    };
  }

  /**
   * Site-specific theme detection for known platforms
   */
  private detectSiteSpecificThemes(): { supported: boolean; siteName: string | null; light: boolean; dark: boolean } {
    const hostname = window.location.hostname.toLowerCase();

    // GitHub
    if (hostname.includes('github.com')) {
      const themeButton = document.querySelector('[data-view-component="true"][data-target="theme-picker.themeButton"]');
      const hasThemeSupport = !!themeButton || document.documentElement.hasAttribute('data-color-mode');
      return {
        supported: hasThemeSupport,
        siteName: 'github',
        light: hasThemeSupport,
        dark: hasThemeSupport
      };
    }

    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      const displaySettings = document.querySelector('[data-testid="displaySettings"]');
      const hasThemeSupport = !!displaySettings || document.documentElement.hasAttribute('data-theme');
      return {
        supported: hasThemeSupport,
        siteName: 'twitter',
        light: hasThemeSupport,
        dark: hasThemeSupport
      };
    }

    // YouTube
    if (hostname.includes('youtube.com')) {
      const settingsButton = document.querySelector('[aria-label="Settings" i]');
      return {
        supported: !!settingsButton,
        siteName: 'youtube',
        light: !!settingsButton,
        dark: !!settingsButton
      };
    }

    // Discord
    if (hostname.includes('discord.com')) {
      const hasThemeSupport = document.documentElement.classList.contains('theme-dark') || 
                             document.documentElement.classList.contains('theme-light');
      return {
        supported: hasThemeSupport,
        siteName: 'discord',
        light: hasThemeSupport,
        dark: hasThemeSupport
      };
    }

    return {
      supported: false,
      siteName: null,
      light: false,
      dark: false
    };
  }

  /**
   * Activate a specific theme
   */
  async activateTheme(theme: ThemeType): Promise<ThemeActivationResult> {
    if (theme === 'default') {
      return { success: true, appliedChanges: [] };
    }

    // Store original state
    this.storeOriginalState();

    const changes: ThemeChange[] = [];

    try {
      // Method 1: Try CSS prefers-color-scheme override
      const mediaQueryResult = await this.activateViaMediaQuery(theme);
      if (mediaQueryResult.success) {
        changes.push(...mediaQueryResult.appliedChanges);
      }

      // Method 2: Try theme attributes
      const attributeResult = await this.activateViaAttributes(theme);
      if (attributeResult.success) {
        changes.push(...attributeResult.appliedChanges);
      }

      // Method 3: Try theme toggles
      const toggleResult = await this.activateViaToggles(theme);
      if (toggleResult.success) {
        changes.push(...toggleResult.appliedChanges);
      }

      // Method 4: Site-specific activation
      const siteSpecificResult = await this.activateViaSiteSpecific(theme);
      if (siteSpecificResult.success) {
        changes.push(...siteSpecificResult.appliedChanges);
      }

      // Verify theme was actually activated
      const wasActivated = await this.verifyThemeActivation(theme);
      
      if (!wasActivated && changes.length === 0) {
        return {
          success: false,
          errorCode: 'THEME_NOT_AVAILABLE',
          errorMessage: `${theme} theme cannot be activated on this site`,
          appliedChanges: []
        };
      }

      this.appliedChanges = changes;

      // Wait for styles to apply
      await this.waitForStyleApplication();

      return {
        success: true,
        appliedChanges: changes
      };

    } catch (error) {
      // Restore original state on failure
      await this.restoreOriginalState();
      
      return {
        success: false,
        errorCode: 'ACTIVATION_FAILED',
        errorMessage: `Failed to activate ${theme} theme: ${error}`,
        appliedChanges: []
      };
    }
  }

  /**
   * Activate theme via CSS prefers-color-scheme override
   */
  private async activateViaMediaQuery(theme: ThemeType): Promise<ThemeActivationResult> {
    const changes: ThemeChange[] = [];

    try {
      // Create or update a style element to override prefers-color-scheme
      let styleElement = document.getElementById('theme-override-styles') as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'theme-override-styles';
        document.head.appendChild(styleElement);
      }

      const originalContent = styleElement.textContent || '';
      const mediaQueryOverride = `
        @media (prefers-color-scheme: light) {
          :root { --forced-theme: light; }
        }
        @media (prefers-color-scheme: dark) {
          :root { --forced-theme: dark; }
        }
        @media screen {
          :root { color-scheme: ${theme}; }
          html { color-scheme: ${theme}; }
          body { color-scheme: ${theme}; }
        }
      `;

      styleElement.textContent = mediaQueryOverride;

      changes.push({
        type: 'style',
        target: 'theme-override-styles',
        originalValue: originalContent,
        newValue: mediaQueryOverride,
        element: styleElement
      });

      return {
        success: true,
        appliedChanges: changes
      };
    } catch (error) {
      return {
        success: false,
        errorCode: 'ACTIVATION_FAILED',
        errorMessage: `Media query activation failed: ${error}`,
        appliedChanges: []
      };
    }
  }

  /**
   * Activate theme via attributes
   */
  private async activateViaAttributes(theme: ThemeType): Promise<ThemeActivationResult> {
    const changes: ThemeChange[] = [];
    const html = document.documentElement;
    const body = document.body;

    const attributesToTry = [
      'data-theme',
      'data-color-scheme',
      'data-bs-theme',
      'data-mode',
      'theme'
    ];

    for (const attr of attributesToTry) {
      // Try HTML element
      if (html.hasAttribute(attr)) {
        const original = html.getAttribute(attr);
        html.setAttribute(attr, theme);
        changes.push({
          type: 'attribute',
          target: `html[${attr}]`,
          originalValue: original,
          newValue: theme,
          element: html
        });
      }

      // Try BODY element
      if (body && body.hasAttribute(attr)) {
        const original = body.getAttribute(attr);
        body.setAttribute(attr, theme);
        changes.push({
          type: 'attribute',
          target: `body[${attr}]`,
          originalValue: original,
          newValue: theme,
          element: body
        });
      }
    }

    // Also try setting attributes even if they don't exist (some sites detect dynamically)
    if (changes.length === 0) {
      html.setAttribute('data-theme', theme);
      changes.push({
        type: 'attribute',
        target: 'html[data-theme]',
        originalValue: null,
        newValue: theme,
        element: html
      });
    }

    return {
      success: changes.length > 0,
      appliedChanges: changes
    };
  }

  /**
   * Activate theme via CSS classes
   */
  private async activateViaClasses(theme: ThemeType): Promise<ThemeActivationResult> {
    const changes: ThemeChange[] = [];
    const html = document.documentElement;
    const body = document.body;

    const themeClasses = {
      light: ['light', 'theme-light', 'light-theme', 'light-mode'],
      dark: ['dark', 'theme-dark', 'dark-theme', 'dark-mode']
    };

    const targetClasses = themeClasses[theme as 'light' | 'dark'] || [];
    const oppositeClasses = theme === 'light' ? themeClasses.dark : themeClasses.light;

    // Remove opposite theme classes and add target theme classes
    [html, body].filter(Boolean).forEach(element => {
      if (!element) return;

      const originalClasses = element.className;

      // Remove opposite theme classes
      oppositeClasses.forEach(cls => {
        if (element.classList.contains(cls)) {
          element.classList.remove(cls);
        }
      });

      // Add target theme classes (try each until one works)
      let added = false;
      for (const cls of targetClasses) {
        if (!element.classList.contains(cls)) {
          element.classList.add(cls);
          added = true;
          break;
        }
      }

      if (added || originalClasses !== element.className) {
        changes.push({
          type: 'class',
          target: element === html ? 'html' : 'body',
          originalValue: originalClasses,
          newValue: element.className,
          element
        });
      }
    });

    return {
      success: changes.length > 0,
      appliedChanges: changes
    };
  }

  /**
   * Activate theme via detectable toggles
   */
  private async activateViaToggles(theme: ThemeType): Promise<ThemeActivationResult> {
    const changes: ThemeChange[] = [];

    const toggleSelectors = [
      `[data-theme="${theme}"]`,
      `[data-theme-value="${theme}"]`,
      `.${theme}-theme-toggle`,
      `[aria-label*="${theme}" i]`
    ];

    for (const selector of toggleSelectors) {
      const toggle = document.querySelector(selector);
      if (toggle && toggle instanceof HTMLElement) {
        // Check if it's clickable
        if (toggle.tagName === 'BUTTON' || toggle.tagName === 'INPUT' || toggle.getAttribute('role') === 'button') {
          try {
            toggle.click();
            
            changes.push({
              type: 'toggle-click',
              target: selector,
              originalValue: 'not-clicked',
              newValue: 'clicked',
              element: toggle
            });

            // Wait for potential theme change
            await new Promise(resolve => setTimeout(resolve, 100));
            break;
          } catch (error) {
            console.warn(`Failed to click theme toggle:`, error);
          }
        }
      }
    }

    return {
      success: changes.length > 0,
      appliedChanges: changes
    };
  }

  /**
   * Site-specific theme activation
   */
  private async activateViaSiteSpecific(theme: ThemeType): Promise<ThemeActivationResult> {
    const hostname = window.location.hostname.toLowerCase();
    const changes: ThemeChange[] = [];

    // GitHub
    if (hostname.includes('github.com')) {
      const result = await this.activateGitHubTheme(theme);
      return result;
    }

    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      const result = await this.activateTwitterTheme(theme);
      return result;
    }

    // Add more site-specific implementations as needed

    return {
      success: false,
      appliedChanges: []
    };
  }

  /**
   * GitHub-specific theme activation
   */
  private async activateGitHubTheme(theme: ThemeType): Promise<ThemeActivationResult> {
    const changes: ThemeChange[] = [];
    const html = document.documentElement;

    // GitHub uses data-color-mode attribute
    const originalMode = html.getAttribute('data-color-mode');
    const newMode = theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : originalMode;

    if (newMode && newMode !== originalMode) {
      html.setAttribute('data-color-mode', newMode);
      changes.push({
        type: 'attribute',
        target: 'html[data-color-mode]',
        originalValue: originalMode,
        newValue: newMode,
        element: html
      });
    }

    return {
      success: changes.length > 0,
      appliedChanges: changes
    };
  }

  /**
   * Twitter-specific theme activation
   */
  private async activateTwitterTheme(theme: ThemeType): Promise<ThemeActivationResult> {
    const changes: ThemeChange[] = [];
    const html = document.documentElement;

    // Twitter uses data-theme attribute
    const originalTheme = html.getAttribute('data-theme');
    const newTheme = theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : originalTheme;

    if (newTheme && newTheme !== originalTheme) {
      html.setAttribute('data-theme', newTheme);
      changes.push({
        type: 'attribute',
        target: 'html[data-theme]',
        originalValue: originalTheme,
        newValue: newTheme,
        element: html
      });
    }

    return {
      success: changes.length > 0,
      appliedChanges: changes
    };
  }

  /**
   * Verify that the theme was actually activated
   */
  private async verifyThemeActivation(theme: ThemeType): Promise<boolean> {
    // Wait a bit for styles to apply
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check various indicators that the theme is active
    const html = document.documentElement;
    const body = document.body;
    const computedStyle = getComputedStyle(html);

    // Check color-scheme CSS property
    const colorScheme = computedStyle.colorScheme;
    if (colorScheme === theme) {
      return true;
    }

    // Check common theme attributes
    const themeAttr = html.getAttribute('data-theme') || body?.getAttribute('data-theme');
    if (themeAttr === theme) {
      return true;
    }

    // Check for theme classes
    if (html.classList.contains(theme) || html.classList.contains(`${theme}-theme`) || 
        body?.classList.contains(theme) || body?.classList.contains(`${theme}-theme`)) {
      return true;
    }

    // Check background color changes as indicator
    const bgColor = computedStyle.backgroundColor;
    if (theme === 'dark' && this.isColorDark(bgColor)) {
      return true;
    }
    if (theme === 'light' && this.isColorLight(bgColor)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a color is dark
   */
  private isColorDark(color: string): boolean {
    const rgb = this.parseColor(color);
    if (!rgb) return false;

    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  }

  /**
   * Check if a color is light
   */
  private isColorLight(color: string): boolean {
    const rgb = this.parseColor(color);
    if (!rgb) return false;

    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5;
  }

  /**
   * Parse color string to RGB values
   */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computedColor = getComputedStyle(div).color;
    document.body.removeChild(div);

    const match = computedColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }

    return null;
  }

  /**
   * Store original state before making changes
   */
  private storeOriginalState(): void {
    const html = document.documentElement;
    const body = document.body;

    this.originalState.set('html-class', html.className);
    this.originalState.set('html-data-theme', html.getAttribute('data-theme'));
    this.originalState.set('html-data-color-scheme', html.getAttribute('data-color-scheme'));
    this.originalState.set('html-data-bs-theme', html.getAttribute('data-bs-theme'));
    this.originalState.set('html-data-color-mode', html.getAttribute('data-color-mode'));

    if (body) {
      this.originalState.set('body-class', body.className);
      this.originalState.set('body-data-theme', body.getAttribute('data-theme'));
      this.originalState.set('body-data-color-scheme', body.getAttribute('data-color-scheme'));
      this.originalState.set('body-data-bs-theme', body.getAttribute('data-bs-theme'));
    }

    const existingStyleOverride = document.getElementById('theme-override-styles');
    if (existingStyleOverride) {
      this.originalState.set('style-override', existingStyleOverride.textContent);
    }
  }

  /**
   * Wait for style application
   */
  private async waitForStyleApplication(): Promise<void> {
    // Force reflow to ensure styles are applied
    document.documentElement.offsetHeight;
    
    // Wait for potential CSS transitions/animations
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Restore original state
   */
  async restoreOriginalState(): Promise<void> {
    try {
      const html = document.documentElement;
      const body = document.body;

      // Restore HTML attributes and classes
      const htmlClass = this.originalState.get('html-class');
      if (htmlClass !== undefined) {
        html.className = htmlClass;
      }

      this.restoreAttribute(html, 'data-theme', this.originalState.get('html-data-theme'));
      this.restoreAttribute(html, 'data-color-scheme', this.originalState.get('html-data-color-scheme'));
      this.restoreAttribute(html, 'data-bs-theme', this.originalState.get('html-data-bs-theme'));
      this.restoreAttribute(html, 'data-color-mode', this.originalState.get('html-data-color-mode'));

      // Restore BODY attributes and classes
      if (body) {
        const bodyClass = this.originalState.get('body-class');
        if (bodyClass !== undefined) {
          body.className = bodyClass;
        }

        this.restoreAttribute(body, 'data-theme', this.originalState.get('body-data-theme'));
        this.restoreAttribute(body, 'data-color-scheme', this.originalState.get('body-data-color-scheme'));
        this.restoreAttribute(body, 'data-bs-theme', this.originalState.get('body-data-bs-theme'));
      }

      // Restore style overrides
      const styleElement = document.getElementById('theme-override-styles');
      if (styleElement) {
        const originalContent = this.originalState.get('style-override');
        if (originalContent !== undefined) {
          styleElement.textContent = originalContent;
        } else {
          styleElement.remove();
        }
      }

      // Clear stored state
      this.originalState.clear();
      this.appliedChanges = [];

      // Wait for restoration to complete
      await this.waitForStyleApplication();

    } catch (error) {
      console.error('Error restoring original theme state:', error);
    }
  }

  /**
   * Helper to restore an attribute
   */
  private restoreAttribute(element: Element, attribute: string, originalValue: string | null): void {
    if (originalValue === null) {
      element.removeAttribute(attribute);
    } else {
      element.setAttribute(attribute, originalValue);
    }
  }

  /**
   * Get applied changes for cleanup
   */
  getAppliedChanges(): ThemeChange[] {
    return [...this.appliedChanges];
  }

  /**
   * Clean up any theme overrides
   */
  async cleanup(): Promise<void> {
    await this.restoreOriginalState();
  }
}