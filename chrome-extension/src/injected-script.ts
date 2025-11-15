import { DOMExtractor } from './utils/dom-extractor';
import { WebToFigmaSchema } from './types/schema';
import { LayoutValidator } from './utils/layout-validator';
import { PreviewGenerator } from './utils/preview-generator';
import { StateCapturer } from './utils/state-capturer';
import { VariantsCollector } from './utils/variants-collector';
import { ComponentDetector } from './utils/component-detector';
import { DesignTokenExtractor } from './utils/design-token-extractor';
import { ComprehensiveStateCapturer } from './utils/comprehensive-state-capturer';
import { IntelligentInteractionDiscoverer } from './utils/intelligent-interaction-discoverer';

console.log('🎯 Enhanced injected script loaded - with page scrolling and design tokens');

class NavigationGuard {
  private allowNavigation: boolean;
  private cleanupFns: Array<() => void> = [];
  private originalUrl: string = window.location.href;
  private originalPushState = history.pushState;
  private originalReplaceState = history.replaceState;

  constructor(allowNavigation: boolean = false) {
    this.allowNavigation = allowNavigation;
  }

  enable() {
    if (this.allowNavigation) return;

    const blockNavigationAttempt = (reason: string) => {
      console.log(`🛑 Navigation blocked during capture (${reason})`);
    };

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href], area[href]') as HTMLAnchorElement | HTMLAreaElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      try {
        const destination = new URL(href, window.location.href);
        const isSameDocument =
          destination.origin === window.location.origin &&
          destination.pathname === window.location.pathname &&
          destination.search === window.location.search;

        if (!isSameDocument || (destination.hash && destination.hash !== window.location.hash)) {
          event.preventDefault();
          event.stopPropagation();
          blockNavigationAttempt(destination.href);
        }
      } catch {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const submitHandler = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      blockNavigationAttempt('form submission');
    };

    const originalOpen = window.open;
    // Block new windows/tabs that could take us away from the captured page
    window.open = ((...args: any[]) => {
      blockNavigationAttempt(`window.open ${args[0]}`);
      return null;
    }) as typeof window.open;

    // Block SPA navigations via History API
    history.pushState = ((...args: any) => {
      blockNavigationAttempt('history.pushState');
      return undefined as any;
    }) as typeof history.pushState;
    history.replaceState = ((...args: any) => {
      blockNavigationAttempt('history.replaceState');
      return undefined as any;
    }) as typeof history.replaceState;

    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      blockNavigationAttempt('beforeunload');
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnloadHandler, { capture: true });

    document.addEventListener('click', clickHandler, true);
    document.addEventListener('submit', submitHandler, true);

    this.cleanupFns.push(() => document.removeEventListener('click', clickHandler, true));
    this.cleanupFns.push(() => document.removeEventListener('submit', submitHandler, true));
    this.cleanupFns.push(() => window.removeEventListener('beforeunload', beforeUnloadHandler, { capture: true } as any));
    this.cleanupFns.push(() => {
      window.open = originalOpen;
    });
    this.cleanupFns.push(() => {
      history.pushState = this.originalPushState;
      history.replaceState = this.originalReplaceState;
    });
  }

  restoreIfNavigated() {
    if (this.allowNavigation) return;
    if (window.location.href !== this.originalUrl) {
      try {
        // Use replaceState instead of location.href to avoid page reload
        // This preserves the URL without triggering navigation that closes the extension popup
        history.replaceState(history.state, '', this.originalUrl);
        console.log('🔄 URL restored without page reload:', this.originalUrl);
      } catch (error) {
        console.warn('⚠️ Failed to restore URL:', error);
        // Ignore if navigation fails; the guard prevented most redirects already
      }
    }
  }

  disable() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}

// Enhanced extraction with page scrolling and design token generation
class EnhancedExtractor {
  private pageScroller: any;
  private designTokens: any = {};

  constructor() {
    this.initializePageScroller();
    this.initializeDesignTokens();
  }

  private initializePageScroller() {
    this.pageScroller = {
      scrollToRevealContent: async () => {
        console.log('🔄 Starting page scroll to reveal all content...');
        
        const originalScrollY = window.scrollY;
        const documentHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        
        // Scroll in increments to trigger lazy loading
        const scrollStep = window.innerHeight * 0.8;
        let currentPosition = 0;
        
        while (currentPosition < documentHeight) {
          window.scrollTo(0, currentPosition);
          await this.wait(500); // Wait for content to load
          
          // Check for new content that may have loaded
          const newHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          
          if (newHeight > documentHeight) {
            console.log('📈 New content detected, extending scroll range');
          }
          
          currentPosition += scrollStep;
          
          // Send progress update
          window.postMessage({
            type: 'SCROLL_PROGRESS',
            progress: Math.min((currentPosition / documentHeight) * 100, 100)
          }, '*');
        }
        
        // Scroll back to top
        window.scrollTo(0, originalScrollY);
        console.log('✅ Page scroll complete - all content revealed');
      }
    };
  }

  private initializeDesignTokens() {
    this.designTokens = {
      colors: new Map(),
      typography: new Map(),
      spacing: new Map(),
      shadows: new Map(),
      borderRadius: new Map(),
      extractFromElement: (element: Element) => {
        const computed = window.getComputedStyle(element);
        
        // Extract color tokens
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          this.designTokens.colors.set(computed.backgroundColor, {
            value: computed.backgroundColor,
            usage: (this.designTokens.colors.get(computed.backgroundColor)?.usage || 0) + 1,
            elements: [...(this.designTokens.colors.get(computed.backgroundColor)?.elements || []), element.tagName]
          });
        }
        
        if (computed.color && computed.color !== 'rgba(0, 0, 0, 0)') {
          this.designTokens.colors.set(computed.color, {
            value: computed.color,
            usage: (this.designTokens.colors.get(computed.color)?.usage || 0) + 1,
            elements: [...(this.designTokens.colors.get(computed.color)?.elements || []), element.tagName]
          });
        }
        
        // Extract typography tokens
        const fontFamily = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        const fontSize = computed.fontSize;
        const fontWeight = computed.fontWeight;
        const lineHeight = computed.lineHeight;
        
        const typographyKey = `${fontFamily}-${fontSize}-${fontWeight}`;
        this.designTokens.typography.set(typographyKey, {
          fontFamily,
          fontSize,
          fontWeight,
          lineHeight,
          usage: (this.designTokens.typography.get(typographyKey)?.usage || 0) + 1
        });
        
        // Extract spacing tokens
        ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 
         'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
          const value = computed[prop as keyof CSSStyleDeclaration] as string;
          if (value && value !== '0px') {
            this.designTokens.spacing.set(value, {
              value,
              property: prop,
              usage: (this.designTokens.spacing.get(value)?.usage || 0) + 1
            });
          }
        });
        
        // Extract shadow tokens
        if (computed.boxShadow && computed.boxShadow !== 'none') {
          this.designTokens.shadows.set(computed.boxShadow, {
            value: computed.boxShadow,
            usage: (this.designTokens.shadows.get(computed.boxShadow)?.usage || 0) + 1
          });
        }
        
        // Extract border radius tokens
        if (computed.borderRadius && computed.borderRadius !== '0px') {
          this.designTokens.borderRadius.set(computed.borderRadius, {
            value: computed.borderRadius,
            usage: (this.designTokens.borderRadius.get(computed.borderRadius)?.usage || 0) + 1
          });
        }
      },
      
      generateTokens: () => {
        return {
          colors: Object.fromEntries(this.designTokens.colors),
          typography: Object.fromEntries(this.designTokens.typography),
          spacing: Object.fromEntries(this.designTokens.spacing),
          shadows: Object.fromEntries(this.designTokens.shadows),
          borderRadius: Object.fromEntries(this.designTokens.borderRadius)
        };
      }
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async performCompleteExtraction(
    viewport?: { width?: number; height?: number; deviceScaleFactor?: number },
    options?: { allowNavigation?: boolean }
  ) {
    const heartbeatId = window.setInterval(() => {
      window.postMessage({ type: 'EXTRACTION_HEARTBEAT' }, '*');
    }, 10000);
    const navigationGuard = new NavigationGuard(options?.allowNavigation ?? false);
    navigationGuard.enable();

    try {
      console.log('🚀 Starting complete extraction with scrolling and design tokens...');

    // Step 1: Scroll page to reveal all content
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'scrolling',
      message: 'Scrolling page to reveal lazy-loaded content...',
      percent: 0
    }, '*');

    await this.pageScroller.scrollToRevealContent();

    // Step 2: Extract DOM tree with enhanced data
    console.log('🔍 Extracting DOM tree with design tokens...');

    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'initializing',
      message: 'Initializing DOM extractor with unit converter...',
      percent: 2
    }, '*');

    const extractor = new DOMExtractor();

    // Set up progress callback to forward progress to popup
    extractor.setProgressCallback((progress) => {
      window.postMessage({
        type: 'EXTRACTION_PROGRESS',
        ...progress
      }, '*');
    });

    // Step 3: Start main extraction (this will call extractPage with progress updates)
    const schema = await extractor.extractPage();
    if (viewport?.width && viewport?.height) {
      schema.metadata.viewport.width = viewport.width;
      schema.metadata.viewport.height = viewport.height;
    }
    if (viewport?.deviceScaleFactor) {
      schema.metadata.viewport.devicePixelRatio = viewport.deviceScaleFactor;
    }

    // Step 4: Extract enhanced design tokens with CSS variables
    console.log('🎨 Extracting enhanced design tokens with CSS variables...');
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'processing-assets',
      message: 'Analyzing design tokens and CSS variables...',
      percent: 88
    }, '*');

    // Enhanced design token extraction
    const designTokenExtractor = new DesignTokenExtractor();
    const designTokensRegistry = await designTokenExtractor.extractTokens();

    // Legacy design token extraction for backward compatibility
    const allElements = document.querySelectorAll('*');
    let tokenCount = 0;

    allElements.forEach((element, index) => {
      if ((element as HTMLElement).offsetParent !== null) { // Only visible elements
        this.designTokens.extractFromElement(element);
        tokenCount++;

        // Progress update every 200 elements
        if (index % 200 === 0) {
          const tokenProgress = 88 + ((index / allElements.length) * 3);
          window.postMessage({
            type: 'EXTRACTION_PROGRESS',
            phase: 'processing-assets',
            message: `Analyzing design tokens (${tokenCount} elements)...`,
            percent: tokenProgress
          }, '*');
        }
      }
    });

    const legacyTokens = this.designTokens.generateTokens();

    console.log('✅ Enhanced design token extraction complete:', {
      variables: Object.keys(designTokensRegistry.variables).length,
      collections: Object.keys(designTokensRegistry.collections).length,
      aliases: Object.keys(designTokensRegistry.aliases).length,
      legacy: {
        colors: Object.keys(legacyTokens.colors).length,
        typography: Object.keys(legacyTokens.typography).length,
        spacing: Object.keys(legacyTokens.spacing).length,
        shadows: Object.keys(legacyTokens.shadows).length,
        borderRadius: Object.keys(legacyTokens.borderRadius).length
      }
    });

    // Store both legacy and enhanced design tokens
    schema.designTokens = legacyTokens;
    schema.designTokensRegistry = designTokensRegistry;
    schema.metadata.extractionSummary = {
      scrollComplete: true,
      tokensExtracted: true,
      totalElements: allElements.length,
      visibleElements: tokenCount,
      enhancedComponentDetection: true, // Flag for enhanced visual similarity detection
      componentDetectionMethod: 'visual-similarity' // Track detection method used
    };

    // Step 5: Comprehensive interaction state capture
    console.log('🎯 Capturing all interactive states and hidden content...');
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'state-capture',
      message: 'Discovering and capturing interactive states...',
      percent: 85
    }, '*');

    const comprehensiveStateCapturer = new ComprehensiveStateCapturer();
    comprehensiveStateCapturer.setProgressCallback((progress) => {
      window.postMessage({
        type: 'EXTRACTION_PROGRESS',
        phase: 'state-capture',
        message: progress.message,
        percent: 85 + (progress.progress * 0.08) // 8% of total progress for state capture
      }, '*');
    });

    const allInteractiveStates = await comprehensiveStateCapturer.captureAllStates(document.body);
    console.log(`🎉 Captured ${allInteractiveStates.size} interactive elements with full state variations!`);
    
    // Convert comprehensive states to schema format
    schema.comprehensiveStates = {
      totalElements: allInteractiveStates.size,
      capturedStates: Array.from(allInteractiveStates.entries()).map(([elementId, result]) => ({
        elementId: result.elementId,
        baseStateId: result.baseState.id,
        discoveredStatesCount: result.discoveredStates.length,
        variantStatesCount: result.variantStates.length,
        hiddenContentCount: result.hiddenContentRevealed.length,
        interactionFlowsCount: result.interactionFlows.length,
        states: [
          // Base state
          result.baseState,
          // All discovered states as additional nodes
          ...result.discoveredStates.map(state => state.capturedNode),
          // Variant states converted to nodes
          ...result.variantStates.map(variant => ({
            ...result.baseState,
            id: `${result.baseState.id}-${variant.state}`,
            name: `${result.baseState.name} (${variant.state})`,
            ...variant.properties
          }))
        ],
        hiddenContent: result.hiddenContentRevealed.map(hidden => ({
          triggerElementId: hidden.triggerElement.id,
          revealedContent: hidden.revealedContent,
          visibilityMethod: hidden.visibilityMethod
        }))
      }))
    };

    // Step 6: Detect and group components
    console.log('🔍 Detecting repeated components...');
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'building-schema',
      message: 'Detecting reusable component patterns...',
      percent: 94
    }, '*');

    const componentDetector = new ComponentDetector();
    const detectedComponents = componentDetector.detectComponents(schema.tree);
    schema.components = detectedComponents;
    console.log(`✅ Found ${Object.keys(detectedComponents.definitions).length} component patterns with enhanced visual similarity`);

    // Step 5.5: Capture interactive states if enabled
    const captureOptions = schema.metadata.captureOptions;
    if (captureOptions?.captureHoverStates || captureOptions?.captureFocusStates) {
      console.log('🎭 Capturing interactive states...');
      window.postMessage({
        type: 'EXTRACTION_PROGRESS',
        phase: 'building-schema',
        message: 'Capturing interactive states (hover, focus, active)...',
        percent: 95
      }, '*');

      const stateCapturer = new StateCapturer();
      
      // Set up progress callback for state capture
      stateCapturer.setProgressCallback((progress) => {
        window.postMessage({
          type: 'EXTRACTION_PROGRESS',
          phase: 'building-schema',
          message: progress.message,
          percent: 95 + (progress.elementIndex || 0) / (progress.totalElements || 1) * 2 // 95-97%
        }, '*');
      });

      // Capture states and collect into variants
      const stateCaptures = await stateCapturer.captureInteractiveStates();
      
      // Build element map for variants collector
      const elementNodes = new Map<Element, any>();
      this.buildElementMap(schema.tree, elementNodes);
      
      const variantsCollector = new VariantsCollector();
      variantsCollector.setProgressCallback((progress) => {
        window.postMessage({
          type: 'EXTRACTION_PROGRESS',
          phase: 'building-schema',
          message: progress.message,
          percent: 96.5
        }, '*');
      });

      const variantsRegistry = await variantsCollector.collectVariants(
        stateCaptures,
        elementNodes,
        schema.components
      );

      schema.variants = variantsRegistry;
      
      console.log('✅ Interactive state capture complete:', {
        elementsWithVariants: variantsRegistry.statistics.elementsWithVariants,
        totalVariants: variantsRegistry.statistics.totalVariants,
        states: variantsRegistry.statistics.statesPerElement
      });

      // Log variants summary
      console.log(VariantsCollector.generateVariantsSummary(variantsRegistry));
    }

    // Step 6: Validate positioning accuracy and layout structure
    console.log('🔍 Validating positioning accuracy and layout structure...');
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'building-schema',
      message: 'Validating positioning accuracy and detecting layout issues...',
      percent: 97
    }, '*');

    const validator = new LayoutValidator(
      schema.metadata.viewport.width,
      schema.metadata.viewport.height,
      {
        positionTolerance: 1.0, // 1px tolerance
        confidenceThreshold: 0.8, // 80% confidence threshold
        transformDeterminantThreshold: 0.001
      }
    );

    const validationReport = validator.validate(schema);
    schema.validation = validationReport;

    console.log('✅ Validation complete:', {
      valid: validationReport.valid,
      issues: validationReport.issuesCount,
      accuracy: `${validationReport.accuracyMetrics.averagePositionAccuracy.toFixed(2)}px avg`,
      confidence: `${(validationReport.accuracyMetrics.averageConfidence * 100).toFixed(1)}%`,
      errors: validationReport.issues.filter(i => i.severity === 'error').length,
      warnings: validationReport.issues.filter(i => i.severity === 'warning').length
    });

    // Log validation summary for debugging
    if (validationReport.issuesCount > 0) {
      console.log('📋 Validation summary:\n' + LayoutValidator.generateSummary(validationReport));
    }

    const variantCount = schema.variants?.statistics.elementsWithVariants || 0;
    const componentCount = Object.keys(detectedComponents.definitions).length;
    
    let completionMessage = `Extraction complete! Found ${componentCount} components`;
    if (variantCount > 0) {
      completionMessage += ` and ${variantCount} interactive elements`;
    }

    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'complete',
      message: completionMessage,
      percent: 100
    }, '*');

      return schema;
    } finally {
      navigationGuard.restoreIfNavigated();
      navigationGuard.disable();
      window.clearInterval(heartbeatId);
    }
  }

  // Legacy component detection method - replaced by ComponentDetector class
  // private detectComponents(tree: any): any {
  //   console.log('⚠️ Legacy component detection method - now using enhanced ComponentDetector');
  //   return { definitions: {} };
  // }

  /**
   * Build a map of DOM elements to their extracted ElementNode data
   * This is needed for the variants collector to associate captured states with schema nodes
   */
  private buildElementMap(tree: any, elementMap: Map<Element, any>) {
    const visitedNodes = new WeakSet<any>();

    const traverse = (node: any) => {
      // Prevent circular references
      if (visitedNodes.has(node)) {
        return;
      }
      visitedNodes.add(node);

      // Try to find the original DOM element for this node
      // The DOM extractor should have stored element references or selectors
      if (node.id && typeof node.id === 'string') {
        // Try to find element by various means
        let element: Element | null = null;

        // Method 1: Try by CSS selector if available
        if (node.cssId) {
          element = document.getElementById(node.cssId);
        }

        // Method 2: Try by data attribute if available
        if (!element && node.dataAttributes) {
          const dataSelector = Object.entries(node.dataAttributes)
            .map(([key, value]) => `[data-${key}="${value}"]`)
            .join('');
          if (dataSelector) {
            try {
              element = document.querySelector(dataSelector);
            } catch (e) {
              // Invalid selector, continue
            }
          }
        }

        // Method 3: Try by tag + classes combination
        if (!element && node.htmlTag && node.cssClasses) {
          const classSelector = node.cssClasses.length > 0 
            ? '.' + node.cssClasses.slice(0, 3).join('.') // Limit to first 3 classes
            : '';
          try {
            const selector = node.htmlTag + classSelector;
            const candidates = document.querySelectorAll(selector);
            
            // If we have a unique match, use it
            if (candidates.length === 1) {
              element = candidates[0];
            }
            // TODO: For multiple matches, we could use additional heuristics like position, content, etc.
          } catch (e) {
            // Invalid selector, continue
          }
        }

        if (element) {
          elementMap.set(element, node);
        }
      }

      // Recursively process children
      if (Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
          if (child && typeof child === 'object') {
            traverse(child);
          }
        });
      }

      // Process pseudo-elements
      if (node.pseudoElements) {
        if (node.pseudoElements.before) {
          traverse(node.pseudoElements.before);
        }
        if (node.pseudoElements.after) {
          traverse(node.pseudoElements.after);
        }
      }
    };

    if (tree && typeof tree === 'object') {
      traverse(tree);
    }
  }

  public async emergencyCompression(schema: any): Promise<any> {
    console.log('🚨 Starting emergency compression...');
    
    // Clone schema to avoid modifying original
    const compressed = JSON.parse(JSON.stringify(schema));
    
    let assetsRemoved = 0;
    let totalAssetSize = 0;
    
    // EXTREME asset removal - remove all images over 2KB (ultra-aggressive)
    if (compressed.assets?.images) {
      const imagesToRemove: string[] = [];
      
      for (const [hash, asset] of Object.entries(compressed.assets.images as any)) {
        if (asset && typeof asset === 'object' && 'base64' in asset) {
          const assetSizeKB = ((asset.base64 as string).length * 0.75) / 1024;
          totalAssetSize += assetSizeKB;
          
          if (assetSizeKB > 2) { // EXTREME: Remove images over 2KB
            imagesToRemove.push(hash);
            assetsRemoved++;
          }
        }
      }
      
      // Remove large images
      imagesToRemove.forEach(hash => {
        delete compressed.assets.images[hash];
      });
      
      console.log(`🗑️ EXTREME: Removed ${assetsRemoved} images over 2KB (total was ${totalAssetSize.toFixed(1)}KB)`);
    }
    
    // Remove non-essential metadata
    if (compressed.metadata) {
      delete compressed.metadata.extractionSummary;
      delete compressed.metadata.userAgent;
      delete compressed.metadata.timestamp;
    }
    
    // Simplify design tokens (keep only most used)
    if (compressed.designTokens) {
      // Keep only top 50 most common colors
      if (compressed.designTokens.colors) {
        const colorEntries = Object.entries(compressed.designTokens.colors as any)
          .sort(([,a]: any, [,b]: any) => (b.usage || 0) - (a.usage || 0))
          .slice(0, 50);
        compressed.designTokens.colors = Object.fromEntries(colorEntries);
      }
      
      // Limit typography tokens
      if (compressed.designTokens.typography) {
        const typographyEntries = Object.entries(compressed.designTokens.typography as any).slice(0, 30);
        compressed.designTokens.typography = Object.fromEntries(typographyEntries);
      }
    }
    
    // Remove plugin data and metadata from elements recursively
    const stripElementMetadata = (element: any) => {
      if (element && typeof element === 'object') {
        delete element.htmlMetadata;
        delete element.debugInfo;
        delete element.sourceSelector;
        
        if (Array.isArray(element.children)) {
          element.children.forEach(stripElementMetadata);
        }
      }
    };
    
    if (compressed.tree) {
      stripElementMetadata(compressed.tree);
    }
    
    console.log('✅ Emergency compression complete');
    return compressed;
  }

  public async ultraAggressiveCompression(schema: any): Promise<any> {
    console.log('🔥 Starting ultra-aggressive compression...');
    
    const compressed = JSON.parse(JSON.stringify(schema));
    
    // Remove ALL images over 1KB (ULTRA-EXTREME)
    if (compressed.assets?.images) {
      const imagesToRemove: string[] = [];
      for (const [hash, asset] of Object.entries(compressed.assets.images as any)) {
        if (asset && typeof asset === 'object' && 'base64' in asset) {
          const assetSizeKB = ((asset.base64 as string).length * 0.75) / 1024;
          if (assetSizeKB > 1) { // ULTRA-EXTREME: 1KB limit
            imagesToRemove.push(hash);
          }
        }
      }
      imagesToRemove.forEach(hash => {
        delete compressed.assets.images[hash];
      });
      console.log(`🗑️ ULTRA-EXTREME: Removed ${imagesToRemove.length} images over 1KB`);
    }

    // Remove ALL SVGs over 2KB (ULTRA-EXTREME)
    if (compressed.assets?.svgs) {
      const svgsToRemove: string[] = [];
      for (const [hash, asset] of Object.entries(compressed.assets.svgs as any)) {
        if (asset && typeof asset === 'object' && 'svgCode' in asset) {
          const svgSizeKB = (asset.svgCode as string).length / 1024;
          if (svgSizeKB > 2) { // ULTRA-EXTREME: 2KB limit for SVGs
            svgsToRemove.push(hash);
          }
        }
      }
      svgsToRemove.forEach(hash => {
        delete compressed.assets.svgs[hash];
      });
      console.log(`🗑️ ULTRA-EXTREME: Removed ${svgsToRemove.length} SVGs over 2KB`);
    }

    // Drastically reduce design tokens to top 20
    if (compressed.designTokens) {
      if (compressed.designTokens.colors) {
        const colorEntries = Object.entries(compressed.designTokens.colors as any)
          .sort(([,a]: any, [,b]: any) => (b.usage || 0) - (a.usage || 0))
          .slice(0, 20);
        compressed.designTokens.colors = Object.fromEntries(colorEntries);
      }
      if (compressed.designTokens.typography) {
        const typographyEntries = Object.entries(compressed.designTokens.typography as any).slice(0, 10);
        compressed.designTokens.typography = Object.fromEntries(typographyEntries);
      }
      if (compressed.designTokens.spacing) {
        const spacingEntries = Object.entries(compressed.designTokens.spacing as any).slice(0, 15);
        compressed.designTokens.spacing = Object.fromEntries(spacingEntries);
      }
    }

    // Remove screenshot if present (can be large)
    if (compressed.screenshot) {
      console.log('🗑️ Ultra: Removing screenshot to save space');
      delete compressed.screenshot;
    }

    // Remove complex nested data
    if (compressed.components) {
      compressed.components = { definitions: {} }; // Keep structure but remove data
    }

    // Simplify element tree by removing deep nesting beyond 5 levels
    const simplifyTree = (node: any, depth: number = 0) => {
      if (depth > 5 && node.children) {
        console.log(`🗑️ Ultra: Truncating tree at depth ${depth}`);
        node.children = [];
        return;
      }
      
      // Remove detailed metadata from elements
      delete node.htmlMetadata;
      delete node.debugInfo;
      delete node.sourceSelector;
      delete node.componentSignature;
      delete node.contentHash;
      
      if (node.children) {
        node.children.forEach((child: any) => simplifyTree(child, depth + 1));
      }
    };

    if (compressed.tree) {
      simplifyTree(compressed.tree);
    }

    console.log('✅ Ultra-aggressive compression complete');
    return compressed;
  }
}

// Main message listener with enhanced extraction
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data.type !== 'START_EXTRACTION') return;

  console.log('🎯 Starting enhanced extraction with page scrolling...');

  try {
    const enhancedExtractor = new EnhancedExtractor();
    let schema = await enhancedExtractor.performCompleteExtraction(
      event.data.viewport,
      { allowNavigation: Boolean(event.data.allowNavigation) }
    );
    if (event.data.screenshot) {
      schema.screenshot = event.data.screenshot;
    }

    // Validate layout accuracy
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'building-schema',
      message: 'Validating layout accuracy...',
      percent: 97
    }, '*');

    const validator = new LayoutValidator(
      schema.metadata.viewport.width,
      schema.metadata.viewport.height
    );
    const validationReport = validator.validate(schema);

    console.log('📊 Validation Report:', validationReport);
    console.log(LayoutValidator.generateSummary(validationReport));

    // Generate preview with overlay if screenshot is available
    let previewWithOverlay = schema.screenshot;
    if (schema.screenshot) {
      window.postMessage({
        type: 'EXTRACTION_PROGRESS',
        phase: 'building-schema',
        message: 'Generating preview with element overlay...',
        percent: 98
      }, '*');

      try {
        previewWithOverlay = await PreviewGenerator.generatePreview(
          schema.screenshot,
          schema.tree,
          {
            showBoundingBoxes: true,
            showLabels: false,
            colorByType: true,
            highlightIssues: true
          }
        );
      } catch (error) {
        console.warn('Failed to generate preview overlay:', error);
      }
    }

    // Monitor payload size and apply intelligent optimization as needed
    let payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
    let payloadSizeMB = payloadSizeBytes / (1024 * 1024);
    
    console.log(`📦 Final payload size: ${payloadSizeMB.toFixed(2)}MB`);
    
    // Check if intelligent optimization was applied and successful
    const optimizationApplied = schema.assetOptimization?.applied;
    const optimizationFailed = schema.assetOptimization?.error;
    const fallbackRequested = schema.assetOptimization?.fallbackToEmergencyCompression;
    
    if (optimizationApplied && !optimizationFailed && schema.assetOptimization) {
      console.log(`🎯 Intelligent asset optimization was successful:`, {
        originalMB: schema.assetOptimization.originalPayloadSizeMB?.toFixed(2),
        optimizedMB: schema.assetOptimization.optimizedPayloadSizeMB?.toFixed(2),
        compressionRatio: schema.assetOptimization.compressionRatio ? (schema.assetOptimization.compressionRatio * 100).toFixed(1) + '%' : 'N/A',
        rounds: schema.assetOptimization.optimizationRounds
      });
    }
    
    // Only fall back to emergency compression if:
    // 1. Intelligent optimization failed or wasn't applied
    // 2. Payload is still too large after intelligent optimization
    // 3. Intelligent optimization explicitly requested fallback
    const needsEmergencyCompression = 
      (!optimizationApplied || optimizationFailed || fallbackRequested || payloadSizeMB > 180);
    
    if (needsEmergencyCompression && payloadSizeMB > 25) {
      console.log(`🚨 Falling back to emergency compression at ${payloadSizeMB.toFixed(2)}MB...`);
      console.log(`   - Reason:`, {
        optimizationApplied,
        optimizationFailed: !!optimizationFailed,
        fallbackRequested,
        payloadTooLarge: payloadSizeMB > 180
      });
      
      schema = await enhancedExtractor.emergencyCompression(schema);
      
      // Re-measure after compression
      payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
      payloadSizeMB = payloadSizeBytes / (1024 * 1024);
      console.log(`📦 After emergency compression: ${payloadSizeMB.toFixed(2)}MB`);
      
      // If still over 50MB, apply ultra-aggressive compression
      if (payloadSizeMB > 50) {
        console.log(`🔥 ULTRA-EXTREME compression activated at ${payloadSizeMB.toFixed(2)}MB...`);
        schema = await enhancedExtractor.ultraAggressiveCompression(schema);
        payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
        payloadSizeMB = payloadSizeBytes / (1024 * 1024);
        console.log(`📦 After ultra-extreme compression: ${payloadSizeMB.toFixed(2)}MB`);
        
        // Final fallback if still too large
        if (payloadSizeMB > 100) {
          console.log(`💀 FINAL EMERGENCY compression - removing more assets...`);
          schema = await enhancedExtractor.emergencyCompression(schema);
          payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
          payloadSizeMB = payloadSizeBytes / (1024 * 1024);
          console.log(`📦 After final emergency: ${payloadSizeMB.toFixed(2)}MB`);
        }
      }
    } else {
      console.log(`✅ No emergency compression needed - payload acceptable at ${payloadSizeMB.toFixed(2)}MB`);
    }

    window.postMessage({
      type: 'EXTRACTION_COMPLETE',
      data: schema,
      validationReport: validationReport,
      previewWithOverlay: previewWithOverlay
    }, '*');

    console.log('✅ Enhanced extraction complete with design tokens and validation');
  } catch (error) {
    console.error('❌ Enhanced extraction failed:', error);
    window.postMessage({
      type: 'EXTRACTION_ERROR',
      error: String(error)
    }, '*');
  }
});

// Expose functions globally for testing and Puppeteer
(window as any).DOMExtractor = DOMExtractor;
(window as any).extractPageToSchema = async (options: any = {}) => {
  console.log('🔧 Starting global extraction with options:', options);
  
  try {
    // Use the same extraction logic as the main script
    const extractor = new DOMExtractor();
    const schema = await extractor.extractPage();
    
    return schema;
  } catch (error) {
    console.error('❌ Global extraction failed:', error);
    throw error;
  }
};
console.log('🔧 DOMExtractor and extractPageToSchema exposed globally for testing');
