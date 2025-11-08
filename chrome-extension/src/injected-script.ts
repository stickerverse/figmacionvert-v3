import { DOMExtractor } from './utils/dom-extractor';
import { WebToFigmaSchema } from './types/schema';
import { LayoutValidator } from './utils/layout-validator';
import { PreviewGenerator } from './utils/preview-generator';

console.log('🎯 Enhanced injected script loaded - with page scrolling and design tokens');

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

  async performCompleteExtraction(viewport?: { width?: number; height?: number; deviceScaleFactor?: number }) {
    const heartbeatId = window.setInterval(() => {
      window.postMessage({ type: 'EXTRACTION_HEARTBEAT' }, '*');
    }, 10000);

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

    // Step 4: Extract design tokens from all visible elements
    console.log('🎨 Extracting design tokens...');
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'processing-assets',
      message: 'Analyzing design tokens (colors, typography, spacing)...',
      percent: 88
    }, '*');

    const allElements = document.querySelectorAll('*');
    let tokenCount = 0;

    allElements.forEach((element, index) => {
      if ((element as HTMLElement).offsetParent !== null) { // Only visible elements
        this.designTokens.extractFromElement(element);
        tokenCount++;

        // Progress update every 200 elements
        if (index % 200 === 0) {
          const tokenProgress = 88 + ((index / allElements.length) * 5);
          window.postMessage({
            type: 'EXTRACTION_PROGRESS',
            phase: 'processing-assets',
            message: `Analyzing design tokens (${tokenCount} elements)...`,
            percent: tokenProgress
          }, '*');
        }
      }
    });

    const generatedTokens = this.designTokens.generateTokens();

    console.log('✅ Design token extraction complete:', {
      colors: Object.keys(generatedTokens.colors).length,
      typography: Object.keys(generatedTokens.typography).length,
      spacing: Object.keys(generatedTokens.spacing).length,
      shadows: Object.keys(generatedTokens.shadows).length,
      borderRadius: Object.keys(generatedTokens.borderRadius).length
    });

    schema.designTokens = generatedTokens;
    schema.metadata.extractionSummary = {
      scrollComplete: true,
      tokensExtracted: true,
      totalElements: allElements.length,
      visibleElements: tokenCount
    };

    // Step 5: Detect and group components
    console.log('🔍 Detecting repeated components...');
    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'building-schema',
      message: 'Detecting reusable component patterns...',
      percent: 94
    }, '*');

    const detectedComponents = this.detectComponents(schema.tree);
    schema.components = detectedComponents;
    console.log(`✅ Found ${Object.keys(detectedComponents.definitions).length} component patterns`);

    window.postMessage({
      type: 'EXTRACTION_PROGRESS',
      phase: 'complete',
      message: `Extraction complete! Found ${Object.keys(detectedComponents.definitions).length} components`,
      percent: 100
    }, '*');

      return schema;
    } finally {
      window.clearInterval(heartbeatId);
    }
  }

  private detectComponents(tree: any): any {
    const componentRegistry: any = { definitions: {} };
    const signatureMap = new Map<string, any[]>();
    const visitedNodes = new WeakSet<any>(); // Prevent circular reference issues

    // Traverse tree and collect nodes by signature with circular reference protection
    const traverse = (node: any) => {
      // Prevent infinite loops from circular references
      if (visitedNodes.has(node)) {
        console.warn('Circular reference detected in component detection, skipping node');
        return;
      }
      visitedNodes.add(node);
      
      if (node?.componentSignature) {
        if (!signatureMap.has(node.componentSignature)) {
          signatureMap.set(node.componentSignature, []);
        }
        signatureMap.get(node.componentSignature)!.push(node);
      }
      
      if (Array.isArray(node?.children)) {
        node.children.forEach((child: any) => {
          if (child && typeof child === 'object') {
            traverse(child);
          }
        });
      }
    };

    if (tree && typeof tree === 'object') {
      traverse(tree);
    }

    // Create component definitions for signatures with multiple instances
    let componentCounter = 0;
    for (const [signature, nodes] of signatureMap.entries()) {
      // Validate signature and nodes before processing
      if (!signature || !Array.isArray(nodes) || nodes.length < 2) {
        continue;
      }
      
      // Ensure we have valid nodes with required properties
      const validNodes = nodes.filter(node => 
        node && 
        typeof node === 'object' && 
        node.htmlTag && 
        typeof node.htmlTag === 'string'
      );
      
      if (validNodes.length >= 2) { // At least 2 valid instances to be a component
        const firstNode = validNodes[0];
        const componentId = `component-${componentCounter++}`;

        componentRegistry.definitions[componentId] = {
          id: componentId,
          name: `${firstNode.htmlTag} (${validNodes.length}x)`,
          description: `Repeated ${firstNode.htmlTag} element`,
          signature: signature.substring(0, 100), // Limit signature length
          instanceCount: validNodes.length,
          properties: {
            tag: firstNode.htmlTag,
            classes: Array.isArray(firstNode.cssClasses) ? firstNode.cssClasses : []
          }
        };

        // Mark all instances with component ID
        validNodes.forEach((node: any, index: number) => {
          if (node && typeof node === 'object') {
            node.componentId = componentId;
            node.isComponent = index === 0; // First instance is the main component
          }
        });
      }
    }

    return componentRegistry;
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
    let schema = await enhancedExtractor.performCompleteExtraction(event.data.viewport);
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

    // Monitor payload size before sending with aggressive early compression
    let payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
    let payloadSizeMB = payloadSizeBytes / (1024 * 1024);
    
    console.log(`📦 Initial payload size: ${payloadSizeMB.toFixed(2)}MB`);
    
    // EXTREME AGGRESSIVE: Start compression at 25MB to ensure under 200MB limit
    if (payloadSizeMB > 25) {
      console.log(`🚨 EXTREME compression activated at ${payloadSizeMB.toFixed(2)}MB...`);
      schema = await enhancedExtractor.emergencyCompression(schema);
      
      // Re-measure after compression
      payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
      payloadSizeMB = payloadSizeBytes / (1024 * 1024);
      console.log(`📦 After emergency compression: ${payloadSizeMB.toFixed(2)}MB`);
      
      // If still over 50MB, apply ultra-aggressive compression immediately
      if (payloadSizeMB > 50) {
        console.log(`🔥 ULTRA-EXTREME compression activated at ${payloadSizeMB.toFixed(2)}MB...`);
        schema = await enhancedExtractor.ultraAggressiveCompression(schema);
        payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
        payloadSizeMB = payloadSizeBytes / (1024 * 1024);
        console.log(`📦 After ultra-extreme compression: ${payloadSizeMB.toFixed(2)}MB`);
        
        // If STILL over 100MB, apply final emergency measures
        if (payloadSizeMB > 100) {
          console.log(`💀 FINAL EMERGENCY compression - removing more assets...`);
          // Apply emergency compression again with even lower limits
          schema = await enhancedExtractor.emergencyCompression(schema);
          payloadSizeBytes = new TextEncoder().encode(JSON.stringify(schema)).length;
          payloadSizeMB = payloadSizeBytes / (1024 * 1024);
          console.log(`📦 After final emergency: ${payloadSizeMB.toFixed(2)}MB`);
        }
      }
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
