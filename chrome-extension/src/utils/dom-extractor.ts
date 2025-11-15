import {
  AssetRegistry,
  BackgroundLayer,
  ClipPathData,
  ColorStyle,
  Effect,
  ElementNode,
  Fill,
  FilterData,
  FontDefinition,
  GradientAsset,
  GridLayoutData,
  GridChildData,
  InlineTextSegment,
  MaskData,
  OutlineData,
  RGBA,
  ScrollData,
  Stroke,
  StyleRegistry,
  TextStyle,
  Transform2D,
  TransformData,
  TransformFunction,
  WebToFigmaSchema
} from '../types/schema';
import { UnitConverter } from './unit-converter';
import { 
  EnhancedDOMExtractor, 
  EnhancedExtractionContext, 
  EnhancedElementData 
} from './enhanced-dom-extractor';
import { CoordinateSpace } from './core-coordinate-system';
import { ComponentDetector } from './component-detector';
import { GridLayoutConverter, extractGridLayoutData, isGridContainer } from './grid-layout-converter';
import { ProgressiveAssetOptimizer, ProgressiveOptimizationResult } from './progressive-asset-optimizer';

interface FontUsage {
  fontFamily: string;
  weights: Set<number>;
}

interface GradientDefinition {
  type: 'linear' | 'radial';
  stops: Array<{ position: number; color: RGBA }>;
  transform: [[number, number, number], [number, number, number]];
}

export interface ExtractionProgress {
  phase: 'initializing' | 'extracting-dom' | 'processing-assets' | 'building-schema' | 'complete';
  message: string;
  percent: number;
  stats?: {
    elementsProcessed?: number;
    figmaNodesCreated?: number;
    imagesExtracted?: number;
    svgsExtracted?: number;
    stylesCollected?: number;
    fontsDetected?: number;
  };
}

type ProgressCallback = (progress: ExtractionProgress) => void;

export class DOMExtractor {
  private elementCounter = 0;
  private assetRegistry: AssetRegistry = { images: {}, svgs: {}, gradients: {} };
  private styleRegistry: StyleRegistry = {
    colors: {},
    textStyles: {},
    effects: {}
  };
  private cssVariablesRegistry: Record<string, string> = {};
  private fontUsage = new Map<string, FontUsage>();
  private unitConverter!: UnitConverter;
  private progressCallback?: ProgressCallback;
  private extractionStartTime = 0;
  
  // Enhanced coordinate system
  private enhancedExtractor?: EnhancedDOMExtractor;
  private useEnhancedCoordinates = true; // Feature flag for enhanced system
  
  // Enhanced component detection
  private componentDetector!: ComponentDetector;
  private useEnhancedComponentDetection = true; // Feature flag for enhanced component detection
  
  // Progressive asset optimization
  private progressiveOptimizer?: ProgressiveAssetOptimizer;
  private useProgressiveOptimization = true; // Feature flag for intelligent optimization

  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  private reportProgress(phase: ExtractionProgress['phase'], message: string, percent: number) {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        message,
        percent,
        stats: {
          elementsProcessed: this.elementCounter,
          figmaNodesCreated: this.elementCounter, // Each extracted element becomes a Figma-compatible node
          imagesExtracted: Object.keys(this.assetRegistry.images).length,
          svgsExtracted: Object.keys(this.assetRegistry.svgs).length,
          stylesCollected: Object.keys(this.styleRegistry.colors).length,
          fontsDetected: this.fontUsage.size
        }
      });
    }
  }

  async extractPage(): Promise<WebToFigmaSchema> {
    this.extractionStartTime = Date.now();
    this.elementCounter = 0;
    this.assetRegistry = { images: {}, svgs: {}, gradients: {} };
    this.styleRegistry = { colors: {}, textStyles: {}, effects: {} };
    this.cssVariablesRegistry = {};
    this.fontUsage.clear();

    this.reportProgress('initializing', 'Initializing extraction engine...', 0);

    // Initialize enhanced component detection system
    if (this.useEnhancedComponentDetection) {
      this.componentDetector = new ComponentDetector();
      console.log('🔧 Enhanced component detection initialized');
    }

    // Initialize enhanced coordinate system if enabled
    if (this.useEnhancedCoordinates) {
      const enhancedContext: EnhancedExtractionContext = {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scroll: { x: window.pageXOffset || 0, y: window.pageYOffset || 0 },
        zoom: parseFloat(getComputedStyle(document.documentElement).zoom || '1'),
        devicePixelRatio: window.devicePixelRatio || 1,
        documentOrigin: { x: 0, y: 0 }, // Will be calculated from root element
        iframeOffset: this.getIframeOffset()
      };
      
      this.enhancedExtractor = new EnhancedDOMExtractor(enhancedContext);
      console.log('🎯 Enhanced coordinate system initialized');
    }

    // Initialize unit converter with current viewport
    this.unitConverter = new UnitConverter({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });

    // Initialize progressive asset optimizer
    if (this.useProgressiveOptimization) {
      this.progressiveOptimizer = new ProgressiveAssetOptimizer(
        { width: window.innerWidth, height: window.innerHeight },
        {
          targetPayloadSizeMB: 150, // Conservative target
          maxPayloadSizeMB: 200,    // Hard limit
          enableProgressiveOptimization: true,
          preserveCriticalAssets: true
        }
      );
      console.log('🎯 Progressive asset optimizer initialized');
    }

    this.reportProgress('initializing', 'Extracting CSS variables from document...', 5);

    // Extract root-level CSS variables from :root and documentElement
    this.extractRootCSSVariables();

    this.reportProgress('extracting-dom', 'Traversing DOM tree and extracting styles...', 10);

    const tree = await this.extractElement(document.body);

    this.reportProgress('processing-assets', 'Processing images and assets...', 85);

    const fonts = this.buildFontDefinitions();

    this.reportProgress('building-schema', 'Building final schema...', 95);

    const schema: any = {
      version: '2.0.0',
      metadata: {
        url: window.location.href,
        title: document.title || 'Captured Page',
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        },
        fonts
      },
      tree,
      assets: this.assetRegistry,
      styles: this.styleRegistry,
      cssVariables: Object.keys(this.cssVariablesRegistry).length > 0 ? this.cssVariablesRegistry : undefined
    };

    // Add enhanced coordinate system metrics if available
    if (this.enhancedExtractor) {
      const accuracyMetrics = this.enhancedExtractor.getAccuracyMetrics();
      schema.coordinateMetrics = {
        enhancedCoordinateSystem: true,
        pixelPerfectAccuracy: accuracyMetrics.averageScore,
        coordinateAccuracy: accuracyMetrics.coordinateAccuracy,
        transformStability: accuracyMetrics.transformStability,
        totalElements: accuracyMetrics.totalElements,
        coordinateIssues: accuracyMetrics.issues.length,
        precision: '0.01px'
      };
      
      console.log('🎯 Enhanced coordinate system metrics:', schema.coordinateMetrics);
    }

    // Apply intelligent asset optimization before finalizing
    if (this.progressiveOptimizer && this.useProgressiveOptimization) {
      const currentPayloadSize = this.estimateCurrentPayloadSize();
      const payloadSizeMB = currentPayloadSize / (1024 * 1024);
      
      console.log(`🎯 Checking if asset optimization needed (current: ${payloadSizeMB.toFixed(2)}MB)`);
      
      // Only optimize if we're approaching or exceeding the target size
      if (payloadSizeMB > 100) { // Start optimization at 100MB
        this.reportProgress('processing-assets', 'Applying intelligent asset optimization...', 90);
        
        try {
          const optimizationResult = await this.progressiveOptimizer.optimizeAssets(tree, this.assetRegistry);
          
          // Update the asset registry with optimized assets
          this.assetRegistry = optimizationResult.optimizedAssets;
          
          console.log('🎯 Asset optimization complete:', {
            originalSizeMB: optimizationResult.originalPayloadSizeMB.toFixed(2),
            optimizedSizeMB: optimizationResult.optimizedPayloadSizeMB.toFixed(2),
            compressionRatio: (optimizationResult.totalCompressionRatio * 100).toFixed(1) + '%',
            assetsProcessed: optimizationResult.assetsProcessed,
            assetsRemoved: optimizationResult.assetsRemoved,
            rounds: optimizationResult.optimizationRounds
          });

          // Add optimization metadata to the schema
          schema.assetOptimization = {
            applied: true,
            originalPayloadSizeMB: optimizationResult.originalPayloadSizeMB,
            optimizedPayloadSizeMB: optimizationResult.optimizedPayloadSizeMB,
            compressionRatio: optimizationResult.totalCompressionRatio,
            assetsProcessed: optimizationResult.assetsProcessed,
            assetsRemoved: optimizationResult.assetsRemoved,
            optimizationRounds: optimizationResult.optimizationRounds,
            preservedAssets: optimizationResult.metadata.preservedAssets,
            aggressivelyOptimized: optimizationResult.metadata.aggressivelyOptimized,
            removedAssets: optimizationResult.metadata.removedAssets
          };
          
        } catch (error) {
          console.error('Asset optimization failed:', error);
          schema.assetOptimization = {
            applied: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            fallbackToEmergencyCompression: true
          };
        }
      } else {
        console.log(`✅ No optimization needed - payload under threshold (${payloadSizeMB.toFixed(2)}MB < 100MB)`);
      }
    }

    const duration = Date.now() - this.extractionStartTime;
    this.reportProgress('complete', `Extraction complete in ${(duration / 1000).toFixed(1)}s`, 100);

    // DIAGNOSTIC: Log final asset counts
    console.log(`📊 Final extraction summary:`);
    console.log(`   - Elements: ${this.elementCounter}`);
    console.log(`   - Images: ${Object.keys(schema.assets.images).length}`);
    console.log(`   - SVGs: ${Object.keys(schema.assets.svgs || {}).length}`);
    console.log(`   - Gradients: ${Object.keys(schema.assets.gradients || {}).length}`);

    // Log first few image hashes for verification
    const imageHashes = Object.keys(schema.assets.images);
    if (imageHashes.length > 0) {
      console.log(`   - Sample image hashes:`, imageHashes.slice(0, 3));
      // Log one complete image asset for inspection
      const firstHash = imageHashes[0];
      const firstAsset = schema.assets.images[firstHash];
      console.log(`   - Sample image asset:`, {
        hash: firstHash,
        url: firstAsset.url.substring(0, 60),
        hasBase64: !!firstAsset.base64,
        base64Length: firstAsset.base64?.length || 0,
        dimensions: `${firstAsset.width}×${firstAsset.height}`
      });
    }

    return schema;
  }

  private async extractElement(
    element: Element,
    parentRect?: DOMRect
  ): Promise<ElementNode> {
    // SMART LIMITS: Use payload size as primary constraint, element count as fallback
    // Most modern pages have 2000-10000 elements, so we need a much higher limit
    const MAX_ELEMENTS = 15000; // Increased: Allow large pages like YouTube (was 800)
    const MAX_PAYLOAD_MB = 40;   // Primary limit: 40MB payload (safe for Chrome & server)

    // Check payload size every 100 elements (more important than element count)
    if (this.elementCounter % 100 === 0 && this.elementCounter > 0) {
      const currentPayloadSize = this.estimateCurrentPayloadSize();
      const payloadSizeMB = currentPayloadSize / (1024 * 1024);

      if (payloadSizeMB > MAX_PAYLOAD_MB) {
        console.warn(`🚨 Payload size limit reached: ${payloadSizeMB.toFixed(2)}MB at ${this.elementCounter} elements`);
        console.warn(`📊 Final stats: ${Object.keys(this.assetRegistry.images).length} images, ${this.elementCounter} elements`);
        throw new Error(`Payload too large: ${payloadSizeMB.toFixed(2)}MB (limit: ${MAX_PAYLOAD_MB}MB)`);
      }

      // Log payload size every 500 elements for monitoring
      if (this.elementCounter % 500 === 0) {
        console.log(`📦 Payload: ${payloadSizeMB.toFixed(2)}MB at ${this.elementCounter} elements (${Object.keys(this.assetRegistry.images).length} images)`);
      }
    }

    // Fallback element count limit (should rarely be hit due to payload limit)
    if (this.elementCounter >= MAX_ELEMENTS) {
      console.warn(`⚠️ Reached maximum element limit (${MAX_ELEMENTS}). This is unusual - most pages hit payload limit first.`);
      throw new Error(`Page extremely complex: exceeded ${MAX_ELEMENTS} element limit`);
    }

    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const id = `node-${this.elementCounter++}`;
    
    // Get devicePixelRatio for metadata (coordinates kept in CSS pixels for Figma)
    const dpr = window.devicePixelRatio || 1;
    const scrollX = window.pageXOffset || window.scrollX || 0;
    const scrollY = window.pageYOffset || window.scrollY || 0;

    // Report progress more frequently for better timeout reset
    if (this.elementCounter % 25 === 0) {
      // Estimate progress based on elements processed (10% to 85% range during DOM extraction)
      const estimatedPercent = Math.min(10 + (this.elementCounter / 10), 85);
      const elapsedTime = ((Date.now() - this.extractionStartTime) / 1000).toFixed(1);
      this.reportProgress('extracting-dom', `Processing element ${this.elementCounter}... (${elapsedTime}s elapsed)`, estimatedPercent);
      
      // Warn if approaching limit
      if (this.elementCounter > MAX_ELEMENTS * 0.8) {
        console.warn(`⚠️ Approaching element limit: ${this.elementCounter}/${MAX_ELEMENTS}`);
      }
      
      // Log performance info
      if (this.elementCounter % 100 === 0) {
        const rate = this.elementCounter / (Date.now() - this.extractionStartTime) * 1000;
        console.log(`📊 Extraction rate: ${rate.toFixed(1)} elements/second`);
      }
    }

    const type = this.determineNodeType(element, computed);

    // Handle iframe offsets for nested contexts
    let iframeOffset = { x: 0, y: 0 };
    if (window !== window.parent) {
      try {
        const frameElement = window.frameElement as HTMLElement;
        if (frameElement) {
          const frameRect = frameElement.getBoundingClientRect();
          iframeOffset = { x: frameRect.left, y: frameRect.top };
        }
      } catch (e) {
        // Cross-origin iframe, can't access
      }
    }

    // Handle CSS transforms and zoom
    const transform = this.extractTransform(computed.transform);
    const zoom = parseFloat(computed.zoom || '1');
    
    // Calculate precise coordinates with DPR scaling
    let adjustedX = parentRect ? rect.left - parentRect.left : rect.left;
    let adjustedY = parentRect ? rect.top - parentRect.top : rect.top;
    
    // Apply iframe offsets for root elements
    if (!parentRect) {
      adjustedX += iframeOffset.x;
      adjustedY += iframeOffset.y;
    }
    
    // ENHANCED: Use advanced coordinate system for pixel-perfect positioning
    let preciseX: number, preciseY: number, preciseWidth: number, preciseHeight: number;
    let coordinateValidation: any = null;
    let coordinateAccuracy: number = 1.0;
    
    if (this.enhancedExtractor) {
      // Use enhanced coordinate system
      const enhancedData = this.enhancedExtractor.extractElement(element as HTMLElement, id);

      // CRITICAL FIX: Enhanced extractor returns DOCUMENT coordinates (viewport + scroll)
      // Convert to relative coordinates by subtracting parent's document position
      const documentX = enhancedData.bounds.left;
      const documentY = enhancedData.bounds.top;

      // Calculate parent's document position if we have a parent
      const parentDocX = parentRect ? (parentRect.left + scrollX) : 0;
      const parentDocY = parentRect ? (parentRect.top + scrollY) : 0;

      // Relative position = element's document position - parent's document position
      preciseX = documentX - parentDocX;
      preciseY = documentY - parentDocY;
      preciseWidth = enhancedData.bounds.width;
      preciseHeight = enhancedData.bounds.height;
      
      // Store validation data for reporting
      coordinateValidation = enhancedData.validation;
      coordinateAccuracy = enhancedData.validation.overallScore;
      
      // Log high-precision coordinate processing
      console.log(`🎯 Enhanced coordinates for ${enhancedData.name}:`, {
        viewport: enhancedData.coordinates.viewport,
        figma: enhancedData.coordinates.figma,
        precision: enhancedData.coordinates.precision,
        validation: enhancedData.validation.overallScore,
        transforms: enhancedData.transforms.figmaCompatible ? 'supported' : 'fallback'
      });
      
    } else {
      // Fallback to legacy coordinate calculation
      const documentX = adjustedX; // viewport + scroll + iframe offsets
      const documentY = adjustedY;
      
      // Apply zoom transformation in document space  
      preciseX = documentX * zoom;
      preciseY = documentY * zoom;
      preciseWidth = rect.width * zoom;
      preciseHeight = rect.height * zoom;
      
      // Legacy coordinate validation
      if (Math.abs(preciseX) > 50000 || Math.abs(preciseY) > 50000) {
        console.warn(`⚠️ Suspicious coordinates for ${element.tagName}#${(element as HTMLElement).id || 'unnamed'}:`, {
          viewport: { x: rect.left, y: rect.top },
          scrollOffsets: { x: scrollX, y: scrollY },
          iframeOffset: { x: iframeOffset.x, y: iframeOffset.y },
          document: { x: documentX, y: documentY },
          final: { x: preciseX, y: preciseY },
          zoom
        });
      }
    }

    const node: ElementNode = {
      id,
      type,
      name: this.generateSemanticName(element),
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList || []),
      cssId: (element as HTMLElement).id || undefined,
      layout: {
        x: preciseX,
        y: preciseY,
        width: preciseWidth,
        height: preciseHeight,
        minWidth: this.parseConstraintValue(computed.minWidth, 'width'),
        maxWidth: this.parseConstraintValue(computed.maxWidth, 'width'),
        minHeight: this.parseConstraintValue(computed.minHeight, 'height'),
        maxHeight: this.parseConstraintValue(computed.maxHeight, 'height'),
        boxSizing: computed.boxSizing as 'border-box' | 'content-box' || 'content-box'
      },
      children: []
    };

    if (!parentRect && element === document.body) {
      node.layout.x = 0;
      node.layout.y = 0;
      node.layout.width =
        rect.width || document.documentElement.scrollWidth || window.innerWidth;
      node.layout.height =
        rect.height || document.documentElement.scrollHeight || window.innerHeight;
    }

    // Enhanced coordinate mapping for pixel-perfect positioning
    if (this.enhancedExtractor && coordinateValidation) {
      // Use enhanced coordinate system results
      node.absoluteLayout = {
        left: preciseX,
        top: preciseY,
        right: preciseX + preciseWidth,
        bottom: preciseY + preciseHeight,
        width: preciseWidth,
        height: preciseHeight
      };
      
      // Add coordinate validation metadata
      (node as any).coordinateValidation = {
        accuracy: coordinateAccuracy,
        precision: coordinateValidation.coordinateAccuracy || 1.0,
        transformStability: coordinateValidation.transformStability || 1.0,
        issues: coordinateValidation.issues || []
      };
      
    } else {
      // Fallback to legacy coordinate calculation
      node.absoluteLayout = {
        left: (rect.left + scrollX + iframeOffset.x) * zoom,
        top: (rect.top + scrollY + iframeOffset.y) * zoom,
        right: (rect.right + scrollX + iframeOffset.x) * zoom,
        bottom: (rect.bottom + scrollY + iframeOffset.y) * zoom,
        width: preciseWidth,
        height: preciseHeight
      };
    }

    // NEW: Viewport-relative coordinates for reference
    node.viewportLayout = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };

    // NEW: Precise stacking context and z-index
    node.stackingContext = this.getStackingContext(element);
    node.hasOverlappingElements = this.checkForOverlappingSiblings(element, rect);

    node.position = this.mapPosition(computed.position);
    
    // Extract positioning values for accurate placement
    if (computed.position !== 'static') {
      node.positionValues = {
        top: computed.top !== 'auto' ? computed.top : undefined,
        right: computed.right !== 'auto' ? computed.right : undefined,
        bottom: computed.bottom !== 'auto' ? computed.bottom : undefined,
        left: computed.left !== 'auto' ? computed.left : undefined,
      };
    }
    
    // Extract box-sizing for accurate dimension calculations
    node.layout.boxSizing = computed.boxSizing as 'border-box' | 'content-box' || 'content-box';
    
    node.display = computed.display || undefined;
    node.visibility = this.mapVisibility(computed.visibility);
    node.pointerEvents = computed.pointerEvents || undefined;
    node.overflow = {
      horizontal: this.mapOverflow(computed.overflowX),
      vertical: this.mapOverflow(computed.overflowY)
    };
    node.zIndex = this.parseZIndex(computed.zIndex);
    node.order = this.parseOptionalNumber((computed as any).order);
    node.isStackingContext = this.detectStackingContext(element, computed);

    const rotation = this.extractRotation(computed);
    if (rotation) {
      node.layout.rotation = rotation;
    }

    if (element instanceof HTMLElement) {
      if (computed.display === 'flex' || computed.display === 'inline-flex') {
        node.autoLayout = this.extractEnhancedFlexLayout(element, computed);
        node.layoutContext = this.extractLayoutContext(element, computed);
      } else if (computed.display === 'grid' || computed.display === 'inline-grid') {
        const gridData = this.extractEnhancedGridLayout(element, computed, rect);
        node.gridLayout = gridData.gridLayout;
        node.gridChild = gridData.gridChild;
        node.autoLayout = this.convertGridToAutoLayout(gridData.gridLayout);
        node.layoutContext = this.extractLayoutContext(element, computed);
      } else {
        node.autoLayout = {
          layoutMode: 'NONE',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          paddingTop: parseFloat(computed.paddingTop) || 0,
          paddingRight: parseFloat(computed.paddingRight) || 0,
          paddingBottom: parseFloat(computed.paddingBottom) || 0,
          paddingLeft: parseFloat(computed.paddingLeft) || 0,
          itemSpacing: 0
        };
        // Store layout context even for non-flex/grid elements
        node.layoutContext = this.extractLayoutContext(element, computed);
      }

      // Extract grid child properties if parent is a grid
      const gridChild = this.extractGridChildProps(element, computed);
      if (gridChild) {
        node.gridChild = gridChild;
      }

      const fills = await this.extractFills(computed, element);
      node.fills = fills;
      node.strokes = this.extractStrokes(computed);
      node.strokeWeight = this.extractStrokeWeight(computed);
      node.strokeAlign = this.extractStrokeAlign(computed);
      node.effects = this.extractEffects(computed);
      node.cornerRadius = this.extractCornerRadius(computed);
      node.opacity = parseFloat(computed.opacity) || 1;
      node.blendMode = this.mapBlendMode(computed.mixBlendMode);
      node.mixBlendMode = node.blendMode;
      node.backgrounds = this.extractBackgroundLayers(computed, element, fills);
      node.outline = this.extractOutline(computed);
      node.transform = this.extractTransform(computed.transform);
      node.transformOrigin = this.extractTransformOrigin(computed.transformOrigin);
      node.perspective = this.parseOptionalNumber((computed as any).perspective);
      node.filters = this.parseFilters(computed.filter);
      node.backdropFilters = this.parseFilters(
        (computed as any).backdropFilter || (computed as any).WebkitBackdropFilter
      );
      node.clipPath = this.extractClipPath(computed.clipPath);
      node.mask = this.extractMask(computed.maskImage, computed.maskClip, computed.maskMode);
      node.scrollData = this.extractScrollData(element);
      node.cssCustomProperties = this.collectCustomProperties(computed);

      if (type === 'TEXT') {
        node.characters = element.innerText || '';
        node.textStyle = this.extractTextStyle(computed);
        this.registerFontUsage(node.textStyle);
        const segments = this.buildInlineTextSegments(element, node);
        if (segments.length) {
          node.inlineTextSegments = segments;
        }
      }
    }

    if (type === 'IMAGE') {
      const img = element as HTMLImageElement;
      console.log(`📷 Processing IMG tag: ${img.src} (${img.naturalWidth}×${img.naturalHeight})`);
      node.imageHash = await this.registerImage(
        img.src,
        img.naturalWidth,
        img.naturalHeight
      );
      console.log(`✅ Registered image with hash: ${node.imageHash}`);
    }

    if (type === 'VECTOR' && element instanceof SVGElement) {
      node.vectorData = this.extractVectorData(element as SVGElement);
    }

    node.children = await this.extractChildren(element, rect);

    this.registerStyles(node);

    node.componentSignature = this.createComponentSignature(element, node);
    node.contentHash = this.createContentHash(node);

    return node;
  }

  private async extractChildren(
    element: Element,
    parentRect: DOMRect
  ): Promise<ElementNode[]> {
    const children: ElementNode[] = [];
    const htmlChildren = Array.from(element.children);

    const textNodes = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0
    ) as Text[];

    for (const textNode of textNodes) {
      const textElementNode = await this.extractTextNode(textNode, parentRect);
      if (textElementNode) {
        children.push(textElementNode);
      }
    }

    for (let i = 0; i < htmlChildren.length; i++) {
      const child = htmlChildren[i];
      
      // Yield every 10 elements to prevent blocking
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (!(child instanceof HTMLElement) || child.hidden) continue;
      
      // Enhanced visibility check - exclude truly hidden elements
      const computed = window.getComputedStyle(child);
      if (computed.display === 'none' || 
          computed.visibility === 'hidden' || 
          computed.opacity === '0') {
        continue;
      }
      
      // Allow elements with zero dimensions if they have visible children or content
      const hasVisibleContent = child.innerText?.trim() || 
                                child.querySelector('img, svg, video, canvas, iframe');
      if (child.offsetWidth === 0 && child.offsetHeight === 0 && !hasVisibleContent) {
        continue;
      }

      try {
        const childNode = await this.extractElement(child, parentRect);
        if (childNode) {
          children.push(childNode);
        }
      } catch (error) {
        console.warn(`Failed to extract child element:`, child, error);
        // Continue with next child instead of failing entire extraction
      }
    }

    return children;
  }

  private async extractTextNode(textNode: Text, parentRect: DOMRect): Promise<ElementNode> {
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rect = range.getBoundingClientRect();
    range.detach();

    const parentElement = textNode.parentElement || document.body;
    const computed = window.getComputedStyle(parentElement);

    const id = `node-${this.elementCounter++}`;
    const characters = (textNode.textContent || '').replace(/\s+/g, ' ').trim();

    const node: ElementNode = {
      id,
      type: 'TEXT',
      name: 'text',
      htmlTag: '#text',
      cssClasses: parentElement.classList ? Array.from(parentElement.classList) : [],
      cssId: parentElement.id || undefined,
      dataAttributes: {},
      ariaLabel: undefined,
      layout: {
        x: rect.left - parentRect.left,
        y: rect.top - parentRect.top,
        width: rect.width,
        height: rect.height
      },
      absoluteLayout: {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
        height: rect.height
      },
      children: [],
      position: this.mapPosition(computed.position),
      display: computed.display,
      visibility: this.mapVisibility(computed.visibility),
      pointerEvents: computed.pointerEvents || undefined,
      overflow: {
        horizontal: this.mapOverflow(computed.overflowX),
        vertical: this.mapOverflow(computed.overflowY)
      },
      zIndex: this.parseZIndex(computed.zIndex),
      isStackingContext: false,
      characters,
      textStyle: this.extractTextStyle(computed),
      fills: [],
      strokes: undefined
    };

    // Copy fills from textStyle to main fills array for consistency
    if (node.textStyle && node.textStyle.fills && node.textStyle.fills.length > 0) {
      node.fills = [...node.textStyle.fills];
    } else {
      // Fallback: create fill from computed color
      const colorFill = this.parseColor(computed.color);
      if (colorFill && colorFill.a > 0) {
        node.fills = [{ type: 'SOLID', color: colorFill, opacity: colorFill.a, visible: true }];
      }
    }

    if (node.textStyle) {
      const segment: InlineTextSegment = {
        id: `${id}-segment-0`,
        characters,
        textStyle: node.textStyle,
        layout: {
          x: 0,
          y: 0,
          width: rect.width,
          height: rect.height
        }
      };
      node.inlineTextSegments = [segment];
    }

    node.contentHash = this.createContentHash(node);
    return node;
  }

  private determineNodeType(
    element: Element,
    computed: CSSStyleDeclaration
  ): ElementNode['type'] {
    if (element instanceof HTMLImageElement) {
      console.log(`🎯 Detected IMAGE element: ${element.src}`);
      return 'IMAGE';
    }
    if (element instanceof SVGElement) return 'VECTOR';
    if (
      element instanceof HTMLElement &&
      this.isTextLike(element, computed)
    ) {
      return 'TEXT';
    }

    return 'FRAME';
  }

  private isTextLike(element: HTMLElement, computed: CSSStyleDeclaration): boolean {
    const hasOnlyTextChildren = Array.from(element.childNodes).every((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || '').trim().length > 0;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const childEl = node as HTMLElement;
        return childEl.tagName.toLowerCase() === 'br';
      }
      return false;
    });

    if (hasOnlyTextChildren) return true;

    const display = computed.display;
    const tag = element.tagName.toLowerCase();

    return (
      tag === 'span' ||
      tag === 'label' ||
      tag === 'p' ||
      tag === 'h1' ||
      tag === 'h2' ||
      tag === 'h3' ||
      tag === 'h4' ||
      tag === 'h5' ||
      tag === 'h6' ||
      display === 'inline'
    );
  }

  private extractAutoLayout(
    computed: CSSStyleDeclaration
  ): NonNullable<ElementNode['autoLayout']> {
    const isVertical = computed.flexDirection.includes('column');
    const isReverse = computed.flexDirection.includes('reverse');

    // Enhanced sizing mode detection with better heuristics
    const { primaryAxisSizingMode, counterAxisSizingMode } = this.determineEnhancedSizingModes(
      computed, isVertical
    );

    // More accurate gap calculation with CSS Grid gap support
    const itemSpacing = this.calculateEnhancedGap(computed, isVertical);

    // Enhanced alignment mapping that handles edge cases
    const { primaryAxisAlignItems, counterAxisAlignItems } = this.mapEnhancedAlignment(
      computed, isVertical, isReverse
    );

    // Extract basic flex properties for fallback
    const flexGrow = parseFloat(computed.flexGrow) || 0;

    return {
      layoutMode: isVertical ? 'VERTICAL' : 'HORIZONTAL',
      primaryAxisAlignItems: primaryAxisAlignItems || this.mapJustifyContent(computed.justifyContent),
      counterAxisAlignItems: counterAxisAlignItems || this.mapAlignItems(computed.alignItems),
      primaryAxisSizingMode,
      counterAxisSizingMode,
      paddingTop: parseFloat(computed.paddingTop) || 0,
      paddingRight: parseFloat(computed.paddingRight) || 0,
      paddingBottom: parseFloat(computed.paddingBottom) || 0,
      paddingLeft: parseFloat(computed.paddingLeft) || 0,
      itemSpacing,
      layoutGrow: flexGrow,
      layoutAlign: this.mapAlignSelf(computed.alignSelf)
    };
  }

  private extractEnhancedFlexLayout(
    element: HTMLElement,
    computed: CSSStyleDeclaration
  ): NonNullable<ElementNode['autoLayout']> {
    // Get the base auto layout
    const baseLayout = this.extractAutoLayout(computed);

    // Enhance with CSS property analysis
    const flexDirection = computed.flexDirection || 'row';
    const justifyContent = computed.justifyContent || 'flex-start';
    const alignItems = computed.alignItems || 'stretch';
    const flexWrap = computed.flexWrap || 'nowrap';
    const gap = (computed as any).gap || '0';

    // Analyze children for better layout decisions
    const children = Array.from(element.children) as HTMLElement[];
    const childAnalysis = this.analyzeFlexChildren(children);

    // Use actual CSS gap if available
    const actualGap = this.parseGapValue(gap);
    if (actualGap > 0) {
      baseLayout.itemSpacing = actualGap;
    }

    // Store enhanced flex properties for layout upgrader
    const flexInfo = {
      direction: flexDirection,
      justifyContent,
      alignItems,
      flexWrap,
      gap: actualGap,
      childrenCount: children.length,
      hasFlexChildren: childAnalysis.hasFlexChildren,
      hasAbsoluteChildren: childAnalysis.hasAbsoluteChildren,
      childDirections: childAnalysis.directions
    };

    // Attach flex analysis to the auto layout
    (baseLayout as any).flexAnalysis = flexInfo;

    return baseLayout;
  }

  private extractLayoutContext(
    element: HTMLElement,
    computed: CSSStyleDeclaration
  ): any {
    return {
      display: computed.display,
      position: computed.position,
      float: computed.float,
      clear: computed.clear,
      overflow: computed.overflow,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      transform: computed.transform,
      transformOrigin: computed.transformOrigin,
      zIndex: computed.zIndex,
      // Flexbox properties
      flexDirection: computed.flexDirection,
      flexWrap: computed.flexWrap,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      alignContent: computed.alignContent,
      gap: (computed as any).gap,
      rowGap: (computed as any).rowGap,
      columnGap: (computed as any).columnGap,
      // Grid properties
      gridTemplateColumns: (computed as any).gridTemplateColumns,
      gridTemplateRows: (computed as any).gridTemplateRows,
      gridAutoFlow: (computed as any).gridAutoFlow,
      gridAutoColumns: (computed as any).gridAutoColumns,
      gridAutoRows: (computed as any).gridAutoRows,
      // Child properties
      flex: computed.flex,
      flexGrow: computed.flexGrow,
      flexShrink: computed.flexShrink,
      flexBasis: computed.flexBasis,
      alignSelf: computed.alignSelf,
      justifySelf: (computed as any).justifySelf,
      gridColumn: (computed as any).gridColumn,
      gridRow: (computed as any).gridRow,
      gridArea: (computed as any).gridArea,
      // Box model that affects layout
      width: computed.width,
      height: computed.height,
      minWidth: computed.minWidth,
      minHeight: computed.minHeight,
      maxWidth: computed.maxWidth,
      maxHeight: computed.maxHeight,
      margin: computed.margin,
      padding: computed.padding
    };
  }

  private analyzeFlexChildren(children: HTMLElement[]): {
    hasFlexChildren: boolean;
    hasAbsoluteChildren: boolean;
    directions: string[];
  } {
    let hasFlexChildren = false;
    let hasAbsoluteChildren = false;
    const directions: string[] = [];

    children.forEach(child => {
      const childStyle = getComputedStyle(child);
      
      if (childStyle.flex !== 'none' && childStyle.flex !== '0 1 auto') {
        hasFlexChildren = true;
      }
      
      if (childStyle.position === 'absolute' || childStyle.position === 'fixed') {
        hasAbsoluteChildren = true;
      }

      if (childStyle.display === 'flex' || childStyle.display === 'inline-flex') {
        directions.push(childStyle.flexDirection || 'row');
      }
    });

    return {
      hasFlexChildren,
      hasAbsoluteChildren,
      directions
    };
  }

  private parseGapValue(gap: string): number {
    if (!gap || gap === 'normal' || gap === 'inherit' || gap === 'unset') {
      return 0;
    }

    // Handle px, rem, em, etc.
    const match = gap.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)?/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'px';

    switch (unit) {
      case 'rem':
        return value * 16; // Assume 16px = 1rem
      case 'em':
        return value * 16; // Rough approximation
      case '%':
        return 0; // Can't convert percentage without context
      default:
        return value;
    }
  }

  /**
   * Enhanced grid layout extraction using the GridLayoutConverter
   */
  private extractEnhancedGridLayout(
    element: Element,
    computed: CSSStyleDeclaration,
    rect: DOMRect
  ): { gridLayout?: GridLayoutData; gridChild?: GridChildData } {
    return extractGridLayoutData(element, computed, rect);
  }

  /**
   * Convert grid layout data to Auto Layout approximation for backward compatibility
   */
  private convertGridToAutoLayout(
    gridData?: GridLayoutData
  ): NonNullable<ElementNode['autoLayout']> {
    if (!gridData) {
      return {
        layoutMode: 'NONE',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'MIN',
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        itemSpacing: 0
      };
    }

    // Determine layout direction based on conversion strategy
    const isVertical = gridData.conversionStrategy === 'nested-auto-layout' && 
                      gridData.computedRowSizes.length <= gridData.computedColumnSizes.length;

    const itemSpacing = isVertical ? gridData.rowGap : gridData.columnGap;

    return {
      layoutMode: gridData.conversionStrategy === 'absolute-positioning' ? 'NONE' : 
                 (isVertical ? 'VERTICAL' : 'HORIZONTAL'),
      primaryAxisAlignItems: this.mapGridAlignment(gridData.justifyContent || 'start'),
      counterAxisAlignItems: this.mapGridAlignmentForCounterAxis(gridData.alignItems || 'stretch'),
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      itemSpacing,
      layoutGrow: 0,
      layoutAlign: 'INHERIT'
    };
  }

  /**
   * Map CSS Grid alignment values to Figma Auto Layout alignment
   */
  private mapGridAlignment(value: string): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
    switch (value) {
      case 'start':
      case 'flex-start':
        return 'MIN';
      case 'center':
        return 'CENTER';
      case 'end':
      case 'flex-end':
        return 'MAX';
      case 'space-between':
        return 'SPACE_BETWEEN';
      case 'stretch':
      default:
        return 'MIN';
    }
  }

  private parseGridTracks(templateValue: string): string[] {
    if (templateValue === 'none' || !templateValue) return [];
    
    // Parse grid template values - handle repeat() function and explicit tracks
    const tracks: string[] = [];
    
    // Handle repeat() functions
    const repeatMatch = templateValue.match(/repeat\(\s*(\d+)\s*,\s*([^)]+)\)/g);
    if (repeatMatch) {
      repeatMatch.forEach(repeat => {
        const match = repeat.match(/repeat\(\s*(\d+)\s*,\s*([^)]+)\)/);
        if (match) {
          const count = parseInt(match[1], 10);
          const trackSize = match[2].trim();
          for (let i = 0; i < count; i++) {
            tracks.push(trackSize);
          }
        }
      });
      // Remove repeat() from original string and process remaining
      templateValue = templateValue.replace(/repeat\(\s*\d+\s*,\s*[^)]+\)/g, '').trim();
    }
    
    // Split remaining explicit tracks
    if (templateValue) {
      const explicitTracks = templateValue.split(/\s+/).filter(track => track && track !== 'none');
      tracks.push(...explicitTracks);
    }
    
    return tracks;
  }

  /**
   * Legacy method - replaced by extractEnhancedGridLayout
   * Kept for any remaining backward compatibility needs
   */
  private extractGridLayout(
    computed: CSSStyleDeclaration
  ): GridLayoutData {
    // This is now a simplified wrapper around the enhanced grid converter
    // For a basic fallback when the converter can't be used
    return {
      isGrid: true,
      templateColumns: (computed as any).gridTemplateColumns || 'none',
      templateRows: (computed as any).gridTemplateRows || 'none',
      templateAreas: undefined,
      columnGap: parseFloat((computed as any).columnGap || (computed as any).gap || '0'),
      rowGap: parseFloat((computed as any).rowGap || (computed as any).gap || '0'),
      autoFlow: (computed as any).gridAutoFlow || 'row',
      autoColumns: (computed as any).gridAutoColumns,
      autoRows: (computed as any).gridAutoRows,
      justifyItems: (computed as any).justifyItems || 'start',
      alignItems: (computed as any).alignItems || 'start',
      justifyContent: (computed as any).justifyContent || 'start',
      alignContent: (computed as any).alignContent || 'start',
      computedColumnSizes: [],
      computedRowSizes: [],
      conversionStrategy: 'nested-auto-layout',
      figmaAnnotations: ['Basic grid layout extraction - enhanced converter not available']
    };
  }

  private extractGridChildProps(
    element: HTMLElement,
    computed: CSSStyleDeclaration
  ): NonNullable<ElementNode['gridChild']> | undefined {
    // Check if parent has display: grid
    const parent = element.parentElement;
    if (!parent) return undefined;

    const parentStyle = getComputedStyle(parent);
    const isParentGrid =
      parentStyle.display === 'grid' || parentStyle.display === 'inline-grid';

    if (!isParentGrid) return undefined;

    const gridColumn = (computed as any).gridColumn || 'auto';
    const gridRow = (computed as any).gridRow || 'auto';
    const gridColumnStart = (computed as any).gridColumnStart || 'auto';
    const gridColumnEnd = (computed as any).gridColumnEnd || 'auto';
    const gridRowStart = (computed as any).gridRowStart || 'auto';
    const gridRowEnd = (computed as any).gridRowEnd || 'auto';

    // Calculate span values
    let columnSpan: number | undefined;
    let rowSpan: number | undefined;

    if (gridColumnStart !== 'auto' && gridColumnEnd !== 'auto') {
      const start = parseInt(gridColumnStart);
      const end = parseInt(gridColumnEnd);
      if (!isNaN(start) && !isNaN(end)) {
        columnSpan = end - start;
      }
    }

    if (gridRowStart !== 'auto' && gridRowEnd !== 'auto') {
      const start = parseInt(gridRowStart);
      const end = parseInt(gridRowEnd);
      if (!isNaN(start) && !isNaN(end)) {
        rowSpan = end - start;
      }
    }

    return {
      columnStart: gridColumnStart !== 'auto' ? gridColumnStart : undefined,
      columnEnd: gridColumnEnd !== 'auto' ? gridColumnEnd : undefined,
      rowStart: gridRowStart !== 'auto' ? gridRowStart : undefined,
      rowEnd: gridRowEnd !== 'auto' ? gridRowEnd : undefined,
      columnSpan,
      rowSpan,
      computedColumn: gridColumnStart !== 'auto' ? parseInt(gridColumnStart) || 1 : 1,
      computedRow: gridRowStart !== 'auto' ? parseInt(gridRowStart) || 1 : 1,
      computedColumnSpan: columnSpan || 1,
      computedRowSpan: rowSpan || 1,
      justifySelf: (computed as any).justifySelf || 'auto',
      alignSelf: (computed as any).alignSelf || 'auto'
    };
  }

  private async extractFills(
    computed: CSSStyleDeclaration,
    element: HTMLElement
  ): Promise<Fill[]> {
    const fills: Fill[] = [];

    // CRITICAL FIX: Always extract backgroundColor, even if transparent
    // This ensures elements have at least one fill in the schema
    // Transparent backgrounds are important for maintaining proper layer stacking
    if (computed.backgroundColor) {
      const bgColor = this.parseColor(computed.backgroundColor);
      const isTransparent =
        computed.backgroundColor === 'rgba(0, 0, 0, 0)' ||
        computed.backgroundColor === 'transparent' ||
        bgColor.a === 0;

      fills.push({
        type: 'SOLID',
        color: bgColor,
        visible: !isTransparent, // Mark transparent fills as not visible
        opacity: bgColor.a
      });
    }

    if (computed.backgroundImage && computed.backgroundImage !== 'none') {
      const backgroundImages = this.splitBackgroundList(computed.backgroundImage);
      const backgroundPositions = this.splitBackgroundList(computed.backgroundPosition || '0% 0%');
      const backgroundSizes = this.splitBackgroundList(computed.backgroundSize || 'auto');

      for (let index = 0; index < backgroundImages.length; index++) {
        const backgroundImage = backgroundImages[index];
        const trimmed = backgroundImage.trim();

        if (trimmed.startsWith('linear-gradient')) {
          const gradient = this.parseLinearGradient(trimmed);
          if (gradient) {
            this.registerGradient(gradient);
            fills.push({
              type: 'GRADIENT_LINEAR',
              gradientStops: gradient.stops,
              gradientTransform: gradient.transform,
              visible: true
            });
          }
          continue;
        }

        if (trimmed.startsWith('radial-gradient')) {
          const gradient = this.parseLinearGradient(trimmed, true);
          if (gradient) {
            this.registerGradient(gradient);
            fills.push({
              type: 'GRADIENT_RADIAL',
              gradientStops: gradient.stops,
              gradientTransform: gradient.transform,
              visible: true
            });
          }
          continue;
        }

        if (trimmed.startsWith('url(')) {
          const url = this.extractUrl(trimmed);
          if (!url) continue;

          const hash = this.hashString(url);
          const position = backgroundPositions[index] || backgroundPositions[0] || '0% 0%';
          const size = backgroundSizes[index] || backgroundSizes[0] || 'auto';
          const imageTransform = this.parseBackgroundPositionToTransform(position, size);

          fills.push({
            type: 'IMAGE',
            imageHash: hash,
            scaleMode: this.mapBackgroundSize(size),
            imageTransform,
            visible: true,
            objectFit: (computed.objectFit as any) || 'fill',
            objectPosition: computed.objectPosition || 'center center'
          });

          await this.registerBackgroundImage(url);
        }
      }
    }

    return fills;
  }

  private extractStrokes(computed: CSSStyleDeclaration): Stroke[] | undefined {
    const strokeWidth = parseFloat(computed.borderWidth || '0');
    const outlineWidth = parseFloat(computed.outlineWidth || '0');
    
    // Check for both border and outline properties
    const hasBorder = strokeWidth > 0 && computed.borderStyle && computed.borderStyle !== 'none';
    const hasOutline = outlineWidth > 0 && computed.outlineStyle && computed.outlineStyle !== 'none';
    
    if (!hasBorder && !hasOutline) return undefined;

    const strokes: Stroke[] = [];

    // Add border stroke (INSIDE or CENTER based on box-sizing)
    if (hasBorder) {
      const borderColor =
        computed.borderColor && computed.borderColor !== 'transparent'
          ? this.parseColor(computed.borderColor)
          : undefined;

      const borderStyle = computed.borderStyle || 'solid';
      const borderDashPattern = this.parseBorderStyleToDashPattern(borderStyle, strokeWidth);
      
      // Determine stroke alignment based on box-sizing
      const strokeAlign = computed.boxSizing === 'border-box' ? 'CENTER' : 'INSIDE';

      strokes.push({
        type: 'SOLID',
        color: borderColor,
        opacity: borderColor?.a,
        thickness: strokeWidth,
        strokeAlign,
        dashPattern: borderDashPattern
      });
    }

    // Add outline stroke (OUTSIDE)
    if (hasOutline) {
      const outlineColor =
        computed.outlineColor && computed.outlineColor !== 'transparent'
          ? this.parseColor(computed.outlineColor)
          : undefined;

      const outlineStyle = computed.outlineStyle || 'solid';
      const outlineDashPattern = this.parseBorderStyleToDashPattern(outlineStyle, outlineWidth);

      strokes.push({
        type: 'SOLID',
        color: outlineColor,
        opacity: outlineColor?.a,
        thickness: outlineWidth,
        strokeAlign: 'OUTSIDE',
        dashPattern: outlineDashPattern
      });
    }

    return strokes.length > 0 ? strokes : undefined;
  }

  private parseBorderStyleToDashPattern(borderStyle: string, strokeWidth: number): number[] | undefined {
    switch (borderStyle.toLowerCase()) {
      case 'dashed':
        // Dashed: dash length roughly 3x stroke width, gap 2x stroke width
        return [strokeWidth * 3, strokeWidth * 2];

      case 'dotted':
        // Dotted: dot length equals stroke width, gap also equals stroke width
        return [strokeWidth, strokeWidth];

      case 'solid':
      case 'none':
      case 'hidden':
      default:
        // Solid or other styles don't use dash patterns
        return undefined;
    }
  }

  private extractStrokeWeight(computed: CSSStyleDeclaration): number | undefined {
    const width = parseFloat(computed.borderWidth || '0');
    return width > 0 ? width : undefined;
  }

  private extractStrokeAlign(
    computed: CSSStyleDeclaration
  ): ElementNode['strokeAlign'] | undefined {
    const style = computed.borderStyle;
    if (!style || style === 'none') {
      return undefined;
    }
    
    // In CSS, borders are always rendered inside the element's bounds (equivalent to Figma's INSIDE)
    // However, we can provide better stroke alignment detection based on context:
    
    // Check for outline instead of border (outline renders outside)
    const outlineStyle = computed.outlineStyle;
    const outlineWidth = parseFloat(computed.outlineWidth || '0');
    if (outlineStyle && outlineStyle !== 'none' && outlineWidth > 0) {
      return 'OUTSIDE';
    }
    
    // Check box-sizing to determine if we should prefer CENTER for better visual accuracy
    const boxSizing = computed.boxSizing;
    if (boxSizing === 'border-box') {
      // For border-box, CENTER alignment in Figma often provides better visual fidelity
      // because it balances the stroke expansion inside and outside the element bounds
      return 'CENTER';
    }
    
    // Default to INSIDE for standard CSS borders
    return 'INSIDE';
  }

  private extractEffects(computed: CSSStyleDeclaration) {
    const effects = [];

    if (computed.boxShadow && computed.boxShadow !== 'none') {
      const shadows = this.parseBoxShadow(computed.boxShadow);
      effects.push(...shadows);
    }

    if (computed.filter && computed.filter !== 'none') {
      const blurMatch = computed.filter.match(/blur\(([\d.]+)px\)/);
      if (blurMatch) {
        effects.push({
          type: 'LAYER_BLUR' as const,
          visible: true,
          radius: parseFloat(blurMatch[1])
        });
      }
    }

    return effects.length ? effects : undefined;
  }

  private extractCornerRadius(
    computed: CSSStyleDeclaration
  ): ElementNode['cornerRadius'] | undefined {
    const topLeft = parseFloat(computed.borderTopLeftRadius || '0');
    const topRight = parseFloat(computed.borderTopRightRadius || '0');
    const bottomRight = parseFloat(computed.borderBottomRightRadius || '0');
    const bottomLeft = parseFloat(computed.borderBottomLeftRadius || '0');

    if (topLeft || topRight || bottomRight || bottomLeft) {
      return {
        topLeft,
        topRight,
        bottomRight,
        bottomLeft
      };
    }
    return undefined;
  }

  private extractTextStyle(computed: CSSStyleDeclaration): TextStyle {
    // Resolve font stack to best available font
    const rawFontFamily = computed.fontFamily || 'Inter';
    const resolvedFontFamily = this.unitConverter.resolveFontStack(rawFontFamily);
    const fontFamily = resolvedFontFamily || 'Inter';

    const fontWeight = this.parseFontWeight(computed.fontWeight);

    // Convert fontSize to pixels (handles rem, em, etc.)
    const fontSize = this.unitConverter.toPx(computed.fontSize || '16px');

    // Extract text shadow as effects
    const textEffects = [];
    if (computed.textShadow && computed.textShadow !== 'none') {
      const shadows = this.parseTextShadow(computed.textShadow);
      textEffects.push(...shadows);
    }

    // Resolve CSS variables in color
    const resolvedColor = this.unitConverter.resolveVariable(computed.color || '');
    const normalizedColor = this.unitConverter.normalizeColor(resolvedColor);

    return {
      fontFamily,
      fontWeight,
      fontSize,
      lineHeight: this.parseLineHeight(computed.lineHeight, computed.fontSize),
      letterSpacing: this.parseLetterSpacing(computed.letterSpacing),
      textAlignHorizontal: this.mapTextAlign(computed.textAlign),
      textAlignVertical: this.mapVerticalAlign(computed.verticalAlign, computed.display),
      textCase: this.mapTextTransform(computed.textTransform),
      textDecoration: this.mapTextDecoration(computed.textDecoration),
      whiteSpace: computed.whiteSpace || undefined,
      wordWrap: (computed as any).wordWrap || (computed as any).overflowWrap || undefined,
      textOverflow: (computed as any).textOverflow || undefined,
      fontVariant: computed.fontVariant !== 'normal' ? computed.fontVariant : undefined,
      fontStretch: computed.fontStretch !== 'normal' ? computed.fontStretch : undefined,
      textRendering: (computed as any).textRendering || undefined,
      wordSpacing: parseFloat(computed.wordSpacing) || undefined,
      textIndent: parseFloat(computed.textIndent) || undefined,
      fills:
        normalizedColor
          ? [
              {
                type: 'SOLID',
                color: normalizedColor,
                opacity: normalizedColor.a,
                visible: true
              }
            ]
          : computed.color && computed.color !== 'transparent'
          ? [
              {
                type: 'SOLID',
                color: this.parseColor(computed.color),
                opacity: this.parseColor(computed.color).a,
                visible: true
              }
            ]
          : [],
      effects: textEffects.length > 0 ? textEffects : undefined
    };
  }

  private extractVectorData(svg: SVGElement) {
    const serializer = new XMLSerializer();
    const svgCode = serializer.serializeToString(svg);
    const hash = this.hashString(svgCode);

    this.assetRegistry.svgs[hash] = {
      hash,
      svgCode,
      width: this.getSvgDimension(svg, 'width'),
      height: this.getSvgDimension(svg, 'height')
    };

    return {
      svgPath: svgCode,
      svgCode,
      fills: []
    };
  }

  private getSvgDimension(svg: SVGElement, dimension: 'width' | 'height'): number {
    if (svg instanceof SVGSVGElement && svg.viewBox) {
      const base = svg.viewBox.baseVal;
      return dimension === 'width' ? base.width : base.height;
    }

    const attr = svg.getAttribute(dimension);
    if (attr) {
      const parsed = parseFloat(attr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    if ((svg as SVGGraphicsElement).getBBox) {
      const bbox = (svg as SVGGraphicsElement).getBBox();
      return dimension === 'width' ? bbox.width : bbox.height;
    }

    return dimension === 'width' ? svg.clientWidth : svg.clientHeight;
  }

  private extractRotation(computed: CSSStyleDeclaration): number | undefined {
    const transform = computed.transform;
    if (!transform || transform === 'none') return undefined;

    const match = transform.match(/matrix\(([-\d.,\s]+)\)/);
    if (!match) return undefined;

    const values = match[1].split(',').map((v) => parseFloat(v.trim()));
    if (values.length < 4 || isNaN(values[0]) || isNaN(values[1])) return undefined;

    const angle = Math.round(Math.atan2(values[1], values[0]) * (180 / Math.PI));
    return angle;
  }

  private parseColor(colorString: string): RGBA {
    // Validate input
    if (!colorString || typeof colorString !== 'string') {
      return { r: 0, g: 0, b: 0, a: 1 }; // Default to black
    }
    
    // Prevent CSS variable circular resolution
    const maxResolutionDepth = 5;
    let currentString = colorString;
    let depth = 0;
    
    // Resolve CSS variables with circular reference protection
    while (currentString.includes('var(') && depth < maxResolutionDepth) {
      const resolved = this.unitConverter.resolveVariable(currentString);
      if (resolved === currentString) {
        break; // No change, avoid infinite loop
      }
      currentString = resolved;
      depth++;
    }
    
    if (depth >= maxResolutionDepth) {
      console.warn(`CSS variable resolution depth exceeded for: ${colorString}`);
    }

    // Try unit converter's normalizeColor for better format support
    const normalized = this.unitConverter.normalizeColor(currentString);
    if (normalized) {
      return normalized;
    }

    // Fallback to canvas-based parsing
    try {
      const ctx = DOMExtractor.getCanvasContext();
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = currentString;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
    } catch (error) {
      console.warn(`Failed to parse color: ${colorString}`, error);
      return { r: 0, g: 0, b: 0, a: 1 }; // Default fallback
    }
  }

  private parseLinearGradient(
    gradient: string,
    radial = false
  ): GradientDefinition | null {
    const temp = document.createElement('div');
    temp.style.backgroundImage = gradient;
    document.body.appendChild(temp);
    const styles = window.getComputedStyle(temp);
    const image = styles.backgroundImage;
    document.body.removeChild(temp);
    if (!image || image === 'none') return null;

    // Extract angle from gradient string (e.g., "45deg", "to right", "to bottom right")
    let angleDegrees = 180; // Default: top to bottom in CSS = 180deg

    const angleMatch = gradient.match(/linear-gradient\(\s*(-?\d+(?:\.\d+)?)(deg|rad|grad|turn)/);
    if (angleMatch) {
      const value = parseFloat(angleMatch[1]);
      const unit = angleMatch[2];
      // Convert to degrees
      switch (unit) {
        case 'rad':
          angleDegrees = value * (180 / Math.PI);
          break;
        case 'grad':
          angleDegrees = value * (9 / 10);
          break;
        case 'turn':
          angleDegrees = value * 360;
          break;
        default:
          angleDegrees = value;
      }
    } else {
      // Check for named directions
      if (gradient.includes('to right')) angleDegrees = 90;
      else if (gradient.includes('to left')) angleDegrees = 270;
      else if (gradient.includes('to top')) angleDegrees = 0;
      else if (gradient.includes('to bottom')) angleDegrees = 180;
      else if (gradient.includes('to top right')) angleDegrees = 45;
      else if (gradient.includes('to top left')) angleDegrees = 315;
      else if (gradient.includes('to bottom right')) angleDegrees = 135;
      else if (gradient.includes('to bottom left')) angleDegrees = 225;
    }

    // Normalize angle to 0-360 range
    angleDegrees = ((angleDegrees % 360) + 360) % 360;

    const stopsMatches = gradient.match(/rgba?\([^)]+\)\s*[\d.]*%?/g);
    if (!stopsMatches) return null;

    const stops = stopsMatches.map((stop, index, array) => {
      const [colorPart, positionPart] = stop.split(/\s+(?=[\d.]+%?)/);
      const color = this.parseColor(colorPart.trim());

      let position: number;
      if (positionPart) {
        // Parse percentage value and normalize to 0-1 range
        position = parseFloat(positionPart) / 100;
      } else {
        // No position specified - distribute evenly
        position = array.length > 1 ? index / (array.length - 1) : 0;
      }

      // Clamp position to valid Figma range [0, 1]
      position = Math.max(0, Math.min(1, isNaN(position) ? 0 : position));

      return { color, position };
    });

    // Convert angle to Figma gradient transform matrix
    // CSS angles: 0deg = to top, 90deg = to right, 180deg = to bottom, 270deg = to left
    // Figma transform: rotate around center
    const radians = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    // Create rotation matrix for gradient
    // Figma uses a 2x3 transformation matrix [a, b, c, d, e, f]
    // where [[a, c, e], [b, d, f]] represents the transform
    const transform: [[number, number, number], [number, number, number]] = [
      [cos, -sin, 0.5],
      [sin, cos, 0.5]
    ];

    return {
      type: radial ? 'radial' : 'linear',
      stops,
      transform
    };
  }

  private parseBoxShadow(boxShadow: string) {
    const definitions = boxShadow.split(/,(?![^(]*\))/);
    const effects = [];

    for (const def of definitions) {
      const inset = def.includes('inset');
      const values = def
        .replace('inset', '')
        .trim()
        .split(/\s+/);

      if (values.length < 3) continue;
      const [offsetX, offsetY, blurRadius, spread, color] = values;

      const effect = {
        type: inset ? ('INNER_SHADOW' as const) : ('DROP_SHADOW' as const),
        visible: true,
        radius: parseFloat(blurRadius || '0') || 0,
        color: this.parseColor(color || 'rgba(0,0,0,0.25)'),
        offset: {
          x: parseFloat(offsetX || '0') || 0,
          y: parseFloat(offsetY || '0') || 0
        },
        spread: parseFloat(spread || '0') || 0,
        blendMode: 'NORMAL' as const
      };

      effects.push(effect);
    }

    return effects;
  }

  private parseTextShadow(textShadow: string): Effect[] {
    const definitions = textShadow.split(/,(?![^(]*\))/);
    const effects: Effect[] = [];

    for (const def of definitions) {
      const trimmed = def.trim();
      const values = trimmed.split(/\s+/);
      if (values.length < 3) continue;

      let offsetX = '0';
      let offsetY = '0';
      let blurRadius = '0';
      let colorValue = 'rgba(0,0,0,0.25)';

      // Parse text-shadow: offsetX offsetY blurRadius? color?
      // offsetX and offsetY are required, blur and color are optional
      if (values.length >= 2) {
        offsetX = values[0];
        offsetY = values[1];
      }

      // Check if third value is a blur radius or color
      if (values.length >= 3) {
        if (values[2].match(/^-?\d+(\.\d+)?(px|em|rem|pt)?$/)) {
          blurRadius = values[2];
          // Fourth value would be color
          if (values.length >= 4) {
            colorValue = values.slice(3).join(' ');
          }
        } else {
          // Third value is color
          colorValue = values.slice(2).join(' ');
        }
      }

      const effect: Effect = {
        type: 'DROP_SHADOW',
        visible: true,
        radius: parseFloat(blurRadius || '0') || 0,
        color: this.parseColor(colorValue),
        offset: {
          x: parseFloat(offsetX || '0') || 0,
          y: parseFloat(offsetY || '0') || 0
        },
        spread: 0,
        blendMode: 'NORMAL'
      };

      effects.push(effect);
    }

    return effects;
  }

  private parseFontWeight(weight: string): number {
    if (!weight) return 400;
    const numeric = parseInt(weight, 10);
    if (!isNaN(numeric)) return numeric;
    const map: Record<string, number> = {
      thin: 100,
      'extra-light': 200,
      light: 300,
      normal: 400,
      regular: 400,
      medium: 500,
      'semi-bold': 600,
      bold: 700,
      'extra-bold': 800,
      black: 900
    };
    return map[weight.toLowerCase()] || 400;
  }

  private parseLineHeight(
    lineHeight: string,
    fontSize: string
  ): TextStyle['lineHeight'] {
    if (!lineHeight || lineHeight === 'normal') {
      return { value: 0, unit: 'AUTO' };
    }
    if (lineHeight.endsWith('%')) {
      return { value: parseFloat(lineHeight), unit: 'PERCENT' };
    }
    if (lineHeight.endsWith('px')) {
      return { value: parseFloat(lineHeight), unit: 'PIXELS' };
    }

    const asNumber = parseFloat(lineHeight);
    if (!isNaN(asNumber)) {
      const fontSizeValue = parseFloat(fontSize || '16');
      return { value: asNumber * fontSizeValue, unit: 'PIXELS' };
    }

    return { value: 0, unit: 'AUTO' };
  }

  private parseLetterSpacing(letterSpacing: string): TextStyle['letterSpacing'] {
    if (!letterSpacing || letterSpacing === 'normal') {
      return { value: 0, unit: 'PIXELS' };
    }
    if (letterSpacing.endsWith('%')) {
      return { value: parseFloat(letterSpacing), unit: 'PERCENT' };
    }
    return { value: parseFloat(letterSpacing), unit: 'PIXELS' };
  }

  private mapJustifyContent(
    value: string
  ): NonNullable<ElementNode['autoLayout']>['primaryAxisAlignItems'] {
    const map: Record<string, any> = {
      'flex-start': 'MIN',
      center: 'CENTER',
      'flex-end': 'MAX',
      'space-between': 'SPACE_BETWEEN',
      'space-around': 'CENTER',
      'space-evenly': 'CENTER'
    };
    return map[value] || 'MIN';
  }

  private mapAlignItems(
    value: string
  ): NonNullable<ElementNode['autoLayout']>['counterAxisAlignItems'] {
    const map: Record<string, any> = {
      stretch: 'STRETCH',
      'flex-start': 'MIN',
      center: 'CENTER',
      'flex-end': 'MAX'
    };
    return map[value] || 'MIN';
  }

  private mapAlignSelf(
    value: string
  ): NonNullable<ElementNode['autoLayout']>['layoutAlign'] {
    const map: Record<string, NonNullable<ElementNode['autoLayout']>['layoutAlign']> = {
      stretch: 'STRETCH',
      auto: 'INHERIT'
    };
    return map[value] || 'INHERIT';
  }

  private mapTextAlign(textAlign: string): TextStyle['textAlignHorizontal'] {
    const map: Record<string, TextStyle['textAlignHorizontal']> = {
      left: 'LEFT',
      start: 'LEFT',
      center: 'CENTER',
      right: 'RIGHT',
      end: 'RIGHT',
      justify: 'JUSTIFIED'
    };
    return map[textAlign] || 'LEFT';
  }

  private mapVerticalAlign(verticalAlign: string, display: string): TextStyle['textAlignVertical'] {
    // For flex containers, use align-items logic
    if (display === 'flex' || display === 'inline-flex') {
      // This will be handled by parent's align-items, default to TOP
      return 'TOP';
    }

    // For inline/inline-block elements with vertical-align
    const map: Record<string, TextStyle['textAlignVertical']> = {
      top: 'TOP',
      middle: 'CENTER',
      center: 'CENTER',
      bottom: 'BOTTOM',
      baseline: 'TOP', // Approximate baseline as top
      'text-top': 'TOP',
      'text-bottom': 'BOTTOM'
    };
    return map[verticalAlign?.toLowerCase()] || 'TOP';
  }

  private mapTextTransform(transform: string): TextStyle['textCase'] {
    const map: Record<string, TextStyle['textCase']> = {
      uppercase: 'UPPER',
      lowercase: 'LOWER',
      capitalize: 'TITLE'
    };
    return map[transform] || 'ORIGINAL';
  }

  private mapTextDecoration(decoration: string): TextStyle['textDecoration'] {
    const map: Record<string, TextStyle['textDecoration']> = {
      'line-through': 'STRIKETHROUGH',
      underline: 'UNDERLINE'
    };
    return map[decoration] || 'NONE';
  }

  private mapBlendMode(value: string): ElementNode['blendMode'] {
    const map: Record<string, ElementNode['blendMode']> = {
      normal: 'NORMAL',
      multiply: 'MULTIPLY',
      screen: 'SCREEN',
      overlay: 'OVERLAY',
      darken: 'DARKEN',
      lighten: 'LIGHTEN'
    };
    return map[value] || 'NORMAL';
  }

  private getStackingContext(element: Element): { zIndex: number; isStackingContext: boolean; stackingParent?: string } {
    const computed = window.getComputedStyle(element);
    const zIndex = parseInt(computed.zIndex) || 0;
    
    // Check if element creates a stacking context
    const isStackingContext = this.detectStackingContext(element, computed);
    
    // Find stacking parent
    let stackingParent: string | undefined;
    let parent = element.parentElement;
    while (parent) {
      const parentComputed = window.getComputedStyle(parent);
      if (this.detectStackingContext(parent, parentComputed)) {
        stackingParent = parent.tagName.toLowerCase() + (parent.id ? `#${parent.id}` : '');
        break;
      }
      parent = parent.parentElement;
    }
    
    return {
      zIndex,
      isStackingContext,
      stackingParent
    };
  }

  private checkForOverlappingSiblings(element: Element, rect: DOMRect): boolean {
    const siblings = Array.from(element.parentElement?.children || []);
    
    for (const sibling of siblings) {
      if (sibling === element) continue;
      
      const siblingRect = sibling.getBoundingClientRect();
      
      // Check if rectangles overlap
      const overlaps = !(
        rect.right <= siblingRect.left ||
        rect.left >= siblingRect.right ||
        rect.bottom <= siblingRect.top ||
        rect.top >= siblingRect.bottom
      );
      
      if (overlaps && siblingRect.width > 0 && siblingRect.height > 0) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract all CSS custom properties (variables) from :root / documentElement
   */
  private estimateCurrentPayloadSize(): number {
    // Quick estimate of current data structure size
    const assetEstimate = Object.keys(this.assetRegistry.images).length * 50000 + // ~50KB per image
                         Object.keys(this.assetRegistry.svgs).length * 5000; // ~5KB per SVG
    
    const elementEstimate = this.elementCounter * 2000; // ~2KB per element structure
    
    const styleEstimate = Object.keys(this.styleRegistry.colors).length * 100 + 
                         Object.keys(this.styleRegistry.textStyles).length * 500;
    
    return assetEstimate + elementEstimate + styleEstimate;
  }

  private extractRootCSSVariables() {
    try {
      const rootStyles = getComputedStyle(document.documentElement);
      for (let i = 0; i < rootStyles.length; i++) {
        const prop = rootStyles[i];
        if (prop.startsWith('--')) {
          const value = rootStyles.getPropertyValue(prop).trim();
          if (value) {
            this.cssVariablesRegistry[prop] = value;
          }
        }
      }
    } catch (error) {
      console.warn('[dom-extractor] Failed to extract CSS variables:', error);
    }
  }

  private extractOutline(computed: CSSStyleDeclaration): OutlineData | undefined {
    if (!computed.outlineStyle || computed.outlineStyle === 'none') return undefined;
    const width = parseFloat(computed.outlineWidth || '0');
    if (!width) return undefined;
    return {
      color: this.parseColor(computed.outlineColor || 'rgba(0,0,0,1)'),
      width,
      style: (computed.outlineStyle as OutlineData['style']) || 'solid'
    };
  }

  private mapBackgroundSize(size: string): Fill['scaleMode'] {
    const map: Record<string, Fill['scaleMode']> = {
      contain: 'FIT',
      cover: 'FILL'
    };
    return map[size] || 'FILL';
  }

  private parseBackgroundPositionToTransform(position: string, size: string): Transform2D {
    // Default transform: centered (0.5, 0.5)
    let translateX = 0.5;
    let translateY = 0.5;

    const parts = position.trim().split(/\s+/);

    // Parse X position (first value)
    if (parts[0]) {
      translateX = this.parsePositionValue(parts[0], 'x');
    }

    // Parse Y position (second value)
    if (parts[1]) {
      translateY = this.parsePositionValue(parts[1], 'y');
    } else if (parts[0]) {
      // If only one value provided, it's X and Y defaults to center
      translateY = 0.5;
    }

    // Figma transform matrix: [[scaleX, skewY, translateX], [skewX, scaleY, translateY]]
    // For background-position, we only adjust translation (0-1 range)
    return [
      [1, 0, translateX],
      [0, 1, translateY]
    ];
  }

  private parsePositionValue(value: string, axis: 'x' | 'y'): number {
    const trimmed = value.trim().toLowerCase();

    // Handle keywords
    if (axis === 'x') {
      if (trimmed === 'left') return 0;
      if (trimmed === 'center') return 0.5;
      if (trimmed === 'right') return 1;
    } else {
      if (trimmed === 'top') return 0;
      if (trimmed === 'center') return 0.5;
      if (trimmed === 'bottom') return 1;
    }

    // Handle percentages
    if (trimmed.endsWith('%')) {
      return parseFloat(trimmed) / 100;
    }

    // Handle pixel values (approximate - convert to 0-1 range assuming 100px = 100% for simplicity)
    // In reality, this would need element dimensions for accurate conversion
    if (trimmed.endsWith('px')) {
      const pixels = parseFloat(trimmed);
      // Rough approximation: treat pixels as percentages
      return Math.max(0, Math.min(1, pixels / 100));
    }

    // Default to center
    return 0.5;
  }

  private extractBackgroundLayers(
    computed: CSSStyleDeclaration,
    _element: HTMLElement,
    fills: Fill[] | undefined
  ): BackgroundLayer[] | undefined {
    if (!fills || fills.length === 0) return undefined;

    const repeatValue = computed.backgroundRepeat || undefined;
    const clipValue = (computed as any).backgroundClip || undefined;
    const originValue = (computed as any).backgroundOrigin || undefined;
    const attachmentValue = (computed as any).backgroundAttachment || undefined;
    const positionX = (computed as any).backgroundPositionX || computed.backgroundPosition;
    const positionY = (computed as any).backgroundPositionY || computed.backgroundPosition;
    const sizeValue = computed.backgroundSize;

    const positionXList = this.splitBackgroundList(positionX);
    const positionYList = this.splitBackgroundList(positionY);
    const sizeList = this.splitBackgroundList(sizeValue);
    const repeatList = this.splitBackgroundList(repeatValue);
    const clipList = this.splitBackgroundList(clipValue);
    const originList = this.splitBackgroundList(originValue);
    const attachmentList = this.splitBackgroundList(attachmentValue);

    const layers: BackgroundLayer[] = [];
    fills.forEach((fill, index) => {
      const layer: BackgroundLayer = {
        type: fill.type === 'SOLID' ? 'color' : fill.type === 'IMAGE' ? 'image' : 'gradient',
        fill,
        position:
          positionXList[index] || positionYList[index]
            ? {
                x: positionXList[index] || '0%',
                y: positionYList[index] || '0%'
              }
            : undefined,
        size: sizeList[index] ? this.parseBackgroundSize(sizeList[index]) : undefined,
        repeat: repeatList[index] || repeatValue || undefined,
        clip: clipList[index] || clipValue || undefined,
        origin: originList[index] || originValue || undefined,
        attachment: attachmentList[index] || attachmentValue || undefined
      };
      layers.push(layer);
    });

    return layers.length ? layers : undefined;
  }

  private splitBackgroundList(value: string | undefined): string[] {
    if (!value) return [];
    const result: string[] = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim().length) {
      result.push(current.trim());
    }
    return result;
  }

  private extractUrl(backgroundImage: string): string | null {
    const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : null;
  }

  private registerGradient(definition: GradientDefinition): string {
    const serialized = JSON.stringify(definition);
    const hash = this.hashString(`gradient-${serialized}`);
    if (!this.assetRegistry.gradients) {
      this.assetRegistry.gradients = {};
    }
    if (!this.assetRegistry.gradients[hash]) {
      const asset: GradientAsset = {
        hash,
        type: definition.type,
        stops: definition.stops,
        transform: definition.transform
      };
      this.assetRegistry.gradients[hash] = asset;
    }
    return hash;
  }

  private async registerBackgroundImage(url: string) {
    const hash = this.hashString(url);
    if (this.assetRegistry.images[hash]) return;

    const asset: ImageAssetPartial = {
      hash,
      url,
      width: 0,
      height: 0,
      mimeType: this.getMimeType(url)
    };

    try {
      const data = await this.fetchImageAsBase64(url);
      asset.base64 = data.base64;
      asset.width = data.width;
      asset.height = data.height;
    } catch (error) {
      console.warn('Unable to fetch background image', url, error);
      const placeholder = this.generatePlaceholderImage();
      asset.base64 = placeholder.base64;
      asset.width = placeholder.width;
      asset.height = placeholder.height;
    }

    this.assetRegistry.images[hash] = asset;
  }

  private async registerImage(
    url: string,
    width: number,
    height: number
  ): Promise<string> {
    const hash = this.hashString(url);
    if (!this.assetRegistry.images[hash]) {
      const asset: ImageAssetPartial = {
        hash,
        url,
        width,
        height,
        mimeType: this.getMimeType(url)
      };

      // ENHANCED: Always compress images with size-based targets
      try {
        // Smart target sizing based on image dimensions
        const targetSizeKB = this.calculateSmartTargetSize(width, height);
        console.log(`🖼️ Fetching image ${url.substring(0, 60)}... (${width}×${height}, target: ${targetSizeKB}KB)`);

        const data = await this.fetchImageAsBase64(url, targetSizeKB);
        asset.base64 = data.base64;
        asset.width = data.width || width;
        asset.height = data.height || height;

        const actualSizeKB = (asset.base64.length * 0.75) / 1024;
        console.log(`✅ Compressed to ${actualSizeKB.toFixed(1)}KB (${data.width}×${data.height})`);
      } catch (error) {
        console.warn('Failed to fetch image asset', url, error);
        const placeholder = this.generatePlaceholderImage(Math.min(width, 400), Math.min(height, 300));
        asset.base64 = placeholder.base64;
        asset.width = placeholder.width;
        asset.height = placeholder.height;
      }

      this.assetRegistry.images[hash] = asset;
      console.log(`📦 Registered image in asset registry: ${hash} (Total images: ${Object.keys(this.assetRegistry.images).length})`);
    }
    return hash;
  }

  private async fetchImageAsBase64(url: string, maxSizeKB: number = 100): Promise<{
    base64: string;
    width: number;
    height: number;
  }> {
    // ENHANCED: Default to 100KB target for better quality/size balance
    // Use background script to bypass CORS restrictions when available
    if (this.canUseBackgroundMessaging()) {
      try {
        const response = await this.sendMessageToBackground({ type: 'FETCH_IMAGE', url });
        if (response.ok && response.base64) {
          const dimensions = await this.measureImageFromBase64(response.base64);
          return {
            base64: response.base64,
            width: dimensions.width,
            height: dimensions.height
          };
        }
      } catch (error) {
        console.warn('Background fetch failed, falling back to direct fetch:', error);
      }
    }

    // Fallback to direct fetch (may fail with CORS)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch(url, { 
          mode: 'cors',
          signal: controller.signal 
        });
        clearTimeout(timeout);
        
        const blob = await response.blob();
        
        // Check if compression is needed
        const originalSizeKB = blob.size / 1024;
        if (originalSizeKB > maxSizeKB) {
          console.log(`🗜️ EXTREME: Compressing image ${url} (${originalSizeKB.toFixed(1)}KB → target: ${maxSizeKB}KB)`);
          const compressed = await this.compressImage(blob, maxSizeKB);
          // Log compression results for monitoring
          const compressionRatio = ((originalSizeKB - (compressed.base64.length * 0.75 / 1024)) / originalSizeKB * 100);
          console.log(`📉 Compression ratio: ${compressionRatio.toFixed(1)}% (${originalSizeKB.toFixed(1)}KB → ${(compressed.base64.length * 0.75 / 1024).toFixed(1)}KB)`);
          return compressed;
        }
        
        const base64 = await this.blobToBase64(blob);
        const dimensions = await this.measureImage(blob);
        return {
          base64,
          width: dimensions.width,
          height: dimensions.height
        };
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Image fetch timeout (10s limit exceeded)');
        }
        throw fetchError;
      }
    } catch (error) {
      throw new Error(`Failed to fetch image: ${error}`);
    }
  }

  private sendMessageToBackground(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.canUseBackgroundMessaging()) {
          reject(new Error('Chrome runtime messaging is not available'));
          return;
        }

        // Validate message before sending
        if (!message || typeof message !== 'object') {
          reject(new Error('Invalid message object'));
          return;
        }
        
        try {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`));
            } else {
              resolve(response);
            }
          });
        } catch (runtimeError) {
          reject(new Error(`Failed to send message: ${runtimeError}`));
        }
      } catch (error) {
        reject(new Error(`sendMessageToBackground error: ${error}`));
      }
    });
  }

  private measureImageFromBase64(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = `data:image/png;base64,${base64}`;
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private generatePlaceholderImage(
    width = 32,
    height = 32,
    color: string = '#e2e8f0'
  ): { base64: string; width: number; height: number } {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.max(10, Math.round(canvas.height / 3))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('img', canvas.width / 2, canvas.height / 2);
    }
    const dataUrl = canvas.toDataURL('image/png');
    return {
      base64: dataUrl.split(',')[1],
      width: canvas.width,
      height: canvas.height
    };
  }

  private measureImage(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = URL.createObjectURL(blob);
    });
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml'
    };
    return extension ? map[extension] || 'image/png' : 'image/png';
  }

  private parseBackgroundSize(value: string): { width: string; height: string } | undefined {
    if (!value) return undefined;
    const parts = value.split(/\s+/);
    if (parts.length === 1) {
      return { width: parts[0], height: parts[0] };
    }
    return { width: parts[0], height: parts[1] };
  }

  private mapPosition(value: string): ElementNode['position'] {
    switch ((value || '').toLowerCase()) {
      case 'relative':
      case 'absolute':
      case 'fixed':
      case 'sticky':
        return value as ElementNode['position'];
      default:
        return 'static';
    }
  }

  private mapVisibility(value: string): ElementNode['visibility'] {
    switch ((value || '').toLowerCase()) {
      case 'hidden':
        return 'hidden';
      case 'collapse':
        return 'collapse';
      default:
        return 'visible';
    }
  }

  private mapOverflow(value: string): NonNullable<ElementNode['overflow']>['horizontal'] {
    switch ((value || '').toLowerCase()) {
      case 'hidden':
      case 'scroll':
      case 'auto':
      case 'clip':
        return value as NonNullable<ElementNode['overflow']>['horizontal'];
      default:
        return 'visible';
    }
  }

  private parseZIndex(value: string): number | undefined {
    if (!value || value === 'auto') return undefined;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseOptionalNumber(value: string | null | undefined): number | undefined {
    if (!value || value === 'auto' || value === 'none' || value === '0') {
      return undefined;
    }
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseConstraintValue(value: string | undefined, dimension: 'width' | 'height'): number | undefined {
    if (!value || value === 'none' || value === 'auto' || value === '0px') {
      return undefined;
    }

    // Remove 'px' and parse
    if (value.endsWith('px')) {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    // Handle percentages (would need parent context to resolve, skip for now)
    if (value.endsWith('%')) {
      return undefined;
    }

    // Handle viewport units (vw, vh, vmin, vmax)
    if (value.endsWith('vw') || value.endsWith('vh') || value.endsWith('vmin') || value.endsWith('vmax')) {
      const numValue = parseFloat(value);
      if (!Number.isFinite(numValue)) return undefined;

      // Convert viewport units to pixels
      if (value.endsWith('vw')) {
        return (numValue / 100) * window.innerWidth;
      } else if (value.endsWith('vh')) {
        return (numValue / 100) * window.innerHeight;
      } else if (value.endsWith('vmin')) {
        return (numValue / 100) * Math.min(window.innerWidth, window.innerHeight);
      } else if (value.endsWith('vmax')) {
        return (numValue / 100) * Math.max(window.innerWidth, window.innerHeight);
      }
    }

    // Try to parse as plain number (assumed pixels)
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private detectStackingContext(element: Element, computed: CSSStyleDeclaration): boolean {
    if (!(element instanceof HTMLElement)) return false;
    const position = computed.position;
    const zIndex = this.parseZIndex(computed.zIndex);
    const opacity = parseFloat(computed.opacity || '1');
    const transform = computed.transform;
    const mixBlendMode = computed.mixBlendMode;
    const filter = computed.filter;
    const isolation = (computed as any).isolation;
    const willChange = (computed as any).willChange || '';

    if ((position === 'absolute' || position === 'relative' || position === 'fixed' || position === 'sticky') && zIndex !== undefined) {
      return true;
    }

    if (opacity < 1) return true;
    if (transform && transform !== 'none') return true;
    if (mixBlendMode && mixBlendMode !== 'normal') return true;
    if (filter && filter !== 'none') return true;
    if (isolation === 'isolate') return true;
    if (willChange.includes('transform') || willChange.includes('opacity') || willChange.includes('filter')) return true;

    const parent = element.parentElement;
    if (parent) {
      const parentComputed = window.getComputedStyle(parent);
      if (parentComputed.transform !== 'none' || parentComputed.filter !== 'none') {
        return true;
      }
    }

    return false;
  }

  private extractTransform(transform: string): TransformData | undefined {
    if (!transform || transform === 'none') {
      return undefined;
    }

    // Parse individual transform functions and build composite matrix
    const transformFunctions = this.parseTransformFunctions(transform);
    if (transformFunctions.length === 0) {
      return undefined;
    }

    // Calculate final composite transform matrix
    const finalMatrix = this.calculateCompositeMatrix(transformFunctions);
    
    // Decompose the final matrix for individual transform properties
    const decomposed = this.decomposeMatrix(finalMatrix);
    
    return {
      matrix: finalMatrix,
      translate: decomposed.translate,
      scale: decomposed.scale,
      rotate: decomposed.rotate,
      skew: decomposed.skew,
      originalFunctions: transformFunctions // Store original for debugging
    };
  }

  private extractTransformOrigin(origin: string): { x: number; y: number; z?: number } | undefined {
    if (!origin) return undefined;
    const parts = origin.split(' ');
    const x = this.parseTransformOriginValue(parts[0]);
    const y = this.parseTransformOriginValue(parts[1]);
    const z = parts[2] ? this.parseTransformOriginValue(parts[2]) : undefined;
    if (x === undefined || y === undefined) return undefined;
    return { x, y, z };
  }

  private parseTransformOriginValue(value?: string): number | undefined {
    if (!value) return undefined;
    if (value.endsWith('%')) {
      return parseFloat(value);
    }
    if (value.endsWith('px')) {
      return parseFloat(value);
    }
    const lookup: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
    return lookup[value] ?? parseFloat(value);
  }

  /**
   * Parse CSS transform string into individual transform functions
   */
  private parseTransformFunctions(transform: string): TransformFunction[] {
    const functions: TransformFunction[] = [];
    
    // Handle matrix() and matrix3d() functions
    if (transform.includes('matrix')) {
      const matrix3dMatch = transform.match(/matrix3d\(([^)]+)\)/);
      if (matrix3dMatch) {
        const values = matrix3dMatch[1]
          .split(',')
          .map(v => parseFloat(v.trim()))
          .filter(v => Number.isFinite(v));
        if (values.length === 16) {
          functions.push({ type: 'matrix3d', values });
          return functions; // matrix3d is final, ignore other functions
        }
      }
      
      const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
        const values = matrixMatch[1]
          .split(',')
          .map(v => parseFloat(v.trim()))
          .filter(v => Number.isFinite(v));
        if (values.length === 6) {
          functions.push({ type: 'matrix', values });
          return functions; // matrix is final, ignore other functions
        }
      }
    }

    // Parse individual transform functions
    const functionRegex = /(\w+)\(([^)]+)\)/g;
    let match;
    
    while ((match = functionRegex.exec(transform)) !== null) {
      const [, funcName, params] = match;
      const values = params.split(',').map(v => {
        const trimmed = v.trim();
        // Handle units
        if (trimmed.endsWith('px') || trimmed.endsWith('em') || trimmed.endsWith('rem')) {
          return parseFloat(trimmed);
        }
        if (trimmed.endsWith('deg') || trimmed.endsWith('rad') || trimmed.endsWith('turn')) {
          return this.convertAngleToRadians(trimmed);
        }
        if (trimmed.endsWith('%')) {
          return parseFloat(trimmed) / 100;
        }
        return parseFloat(trimmed) || 0;
      });
      
      if (values.every(v => Number.isFinite(v))) {
        functions.push({ type: funcName as any, values });
      }
    }
    
    return functions;
  }

  /**
   * Convert angle values to radians
   */
  private convertAngleToRadians(value: string): number {
    const num = parseFloat(value);
    if (value.endsWith('deg')) return num * (Math.PI / 180);
    if (value.endsWith('turn')) return num * 2 * Math.PI;
    if (value.endsWith('grad')) return num * (Math.PI / 200);
    return num; // assume radians
  }

  /**
   * Calculate composite transform matrix from individual functions
   */
  private calculateCompositeMatrix(functions: TransformFunction[]): number[] {
    // Start with identity matrix (2D: 6 values, 3D: 16 values)
    let result = this.createIdentityMatrix();
    
    for (const func of functions) {
      const matrix = this.createMatrixFromFunction(func);
      result = this.multiplyMatrices(result, matrix);
    }
    
    return result;
  }

  /**
   * Create identity matrix (2D: 6 values for matrix(), 3D: 16 values for matrix3d())
   */
  private createIdentityMatrix(is3D = false): number[] {
    if (is3D) {
      return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
    }
    return [1, 0, 0, 1, 0, 0]; // 2D matrix: [a, b, c, d, tx, ty]
  }

  /**
   * Create matrix from individual transform function
   */
  private createMatrixFromFunction(func: TransformFunction): number[] {
    const { type, values } = func;
    
    switch (type) {
      case 'matrix':
        return values.slice(0, 6);
        
      case 'matrix3d':
        return values.slice(0, 16);
        
      case 'translate':
      case 'translateX':
      case 'translateY':
        return this.createTranslationMatrix(
          type === 'translateX' ? values[0] : (type === 'translateY' ? 0 : values[0] || 0),
          type === 'translateY' ? values[0] : (type === 'translateX' ? 0 : values[1] || 0)
        );
        
      case 'translate3d':
      case 'translateZ':
        return this.createTranslation3DMatrix(
          values[0] || 0,
          values[1] || 0, 
          type === 'translateZ' ? values[0] : (values[2] || 0)
        );
        
      case 'scale':
      case 'scaleX':
      case 'scaleY':
        return this.createScaleMatrix(
          type === 'scaleX' ? values[0] : (type === 'scaleY' ? 1 : values[0] || 1),
          type === 'scaleY' ? values[0] : (type === 'scaleX' ? 1 : values[1] || values[0] || 1)
        );
        
      case 'scale3d':
      case 'scaleZ':
        return this.createScale3DMatrix(
          values[0] || 1,
          values[1] || 1,
          type === 'scaleZ' ? values[0] : (values[2] || 1)
        );
        
      case 'rotate':
      case 'rotateZ':
        return this.createRotationMatrix(values[0] || 0);
        
      case 'rotateX':
      case 'rotateY':
      case 'rotate3d':
        return this.createRotation3DMatrix(type, values);
        
      case 'skew':
      case 'skewX':
      case 'skewY':
        return this.createSkewMatrix(
          type === 'skewX' ? values[0] : (type === 'skewY' ? 0 : values[0] || 0),
          type === 'skewY' ? values[0] : (type === 'skewX' ? 0 : values[1] || 0)
        );
        
      default:
        return this.createIdentityMatrix();
    }
  }

  /**
   * Create 2D translation matrix
   */
  private createTranslationMatrix(tx: number, ty: number): number[] {
    return [1, 0, 0, 1, tx, ty];
  }

  /**
   * Create 3D translation matrix
   */
  private createTranslation3DMatrix(tx: number, ty: number, tz: number): number[] {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  }

  /**
   * Create 2D scale matrix
   */
  private createScaleMatrix(sx: number, sy: number): number[] {
    return [sx, 0, 0, sy, 0, 0];
  }

  /**
   * Create 3D scale matrix
   */
  private createScale3DMatrix(sx: number, sy: number, sz: number): number[] {
    return [
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1
    ];
  }

  /**
   * Create 2D rotation matrix
   */
  private createRotationMatrix(angle: number): number[] {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [cos, sin, -sin, cos, 0, 0];
  }

  /**
   * Create 3D rotation matrix
   */
  private createRotation3DMatrix(type: string, values: number[]): number[] {
    const angle = values[0] || 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    switch (type) {
      case 'rotateX':
        return [
          1, 0, 0, 0,
          0, cos, sin, 0,
          0, -sin, cos, 0,
          0, 0, 0, 1
        ];
        
      case 'rotateY':
        return [
          cos, 0, -sin, 0,
          0, 1, 0, 0,
          sin, 0, cos, 0,
          0, 0, 0, 1
        ];
        
      case 'rotate3d':
        const [x = 0, y = 0, z = 1, a = 0] = values;
        const len = Math.hypot(x, y, z);
        if (len === 0) return this.createIdentityMatrix(true);
        
        const ux = x / len;
        const uy = y / len;
        const uz = z / len;
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        const oneMinusCos = 1 - cosA;
        
        return [
          cosA + ux * ux * oneMinusCos,
          uy * ux * oneMinusCos + uz * sinA,
          uz * ux * oneMinusCos - uy * sinA,
          0,
          ux * uy * oneMinusCos - uz * sinA,
          cosA + uy * uy * oneMinusCos,
          uz * uy * oneMinusCos + ux * sinA,
          0,
          ux * uz * oneMinusCos + uy * sinA,
          uy * uz * oneMinusCos - ux * sinA,
          cosA + uz * uz * oneMinusCos,
          0,
          0, 0, 0, 1
        ];
        
      default:
        return this.createIdentityMatrix(true);
    }
  }

  /**
   * Create 2D skew matrix
   */
  private createSkewMatrix(angleX: number, angleY: number): number[] {
    return [1, Math.tan(angleY), Math.tan(angleX), 1, 0, 0];
  }

  /**
   * Multiply two matrices (supports both 2D and 3D)
   */
  private multiplyMatrices(a: number[], b: number[]): number[] {
    // Handle 2D matrix multiplication (6 values)
    if (a.length === 6 && b.length === 6) {
      const [a11, a12, a21, a22, a31, a32] = a;
      const [b11, b12, b21, b22, b31, b32] = b;
      
      return [
        a11 * b11 + a12 * b21,
        a11 * b12 + a12 * b22,
        a21 * b11 + a22 * b21,
        a21 * b12 + a22 * b22,
        a31 * b11 + a32 * b21 + b31,
        a31 * b12 + a32 * b22 + b32
      ];
    }
    
    // Handle 3D matrix multiplication (16 values)
    if (a.length === 16 && b.length === 16) {
      const result = new Array(16);
      
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          let sum = 0;
          for (let k = 0; k < 4; k++) {
            sum += a[i * 4 + k] * b[k * 4 + j];
          }
          result[i * 4 + j] = sum;
        }
      }
      
      return result;
    }
    
    // Mixed or unsupported matrix sizes
    return a.length >= b.length ? a : b;
  }

  /**
   * Decompose final matrix into transform components
   */
  private decomposeMatrix(matrix: number[]): {
    translate: { x: number; y: number; z?: number };
    scale: { x: number; y: number; z?: number };
    rotate: { x: number; y: number; z: number; angle: number };
    skew: { x: number; y: number };
  } {
    if (matrix.length === 16) {
      // 3D matrix decomposition
      const [m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44] = matrix;
      
      const translateX = m41;
      const translateY = m42;
      const translateZ = m43;
      
      // Extract scaling factors
      const scaleX = Math.hypot(m11, m12, m13);
      const scaleY = Math.hypot(m21, m22, m23);
      const scaleZ = Math.hypot(m31, m32, m33);
      
      // Basic rotation extraction (simplified)
      const rotationZ = Math.atan2(m12 / scaleX, m11 / scaleX);
      
      return {
        translate: { x: translateX, y: translateY, z: translateZ },
        scale: { x: scaleX, y: scaleY, z: scaleZ },
        rotate: { x: 0, y: 0, z: 1, angle: rotationZ * (180 / Math.PI) },
        skew: { x: 0, y: 0 }
      };
    }
    
    // 2D matrix decomposition
    const [a, b, c, d, tx, ty] = matrix;
    
    const scaleX = Math.hypot(a, b);
    const scaleY = Math.hypot(c, d);
    const rotation = Math.atan2(b, a) * (180 / Math.PI);
    const skewX = Math.atan2(a * c + b * d, scaleX * scaleX) * (180 / Math.PI);
    
    return {
      translate: { x: tx, y: ty },
      scale: { x: scaleX, y: scaleY },
      rotate: { x: 0, y: 0, z: 1, angle: rotation },
      skew: { x: skewX, y: 0 }
    };
  }

  private parseFilters(value: string): FilterData[] | undefined {
    if (!value || value === 'none') return undefined;
    const filters: FilterData[] = [];
    const regex = /(\w+-?\w*)\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value))) {
      const type = match[1];
      const raw = match[2].trim();
      switch (type) {
        case 'drop-shadow': {
          const parts = raw.split(/\s+/);
          const offsetX = parseFloat(parts[0] || '0');
          const offsetY = parseFloat(parts[1] || '0');
          const blur = parseFloat(parts[2] || '0');
          const colorString = parts.slice(3).join(' ') || 'rgba(0,0,0,0.5)';
          filters.push({
            type: 'dropShadow',
            value: blur,
            unit: 'px',
            offset: { x: offsetX, y: offsetY },
            color: this.parseColor(colorString)
          });
          break;
        }
        case 'blur':
          filters.push({ type: 'blur', value: parseFloat(raw), unit: raw.endsWith('px') ? 'px' : undefined });
          break;
        case 'brightness':
        case 'contrast':
        case 'grayscale':
        case 'invert':
        case 'opacity':
        case 'saturate':
        case 'sepia':
          filters.push({ type: type as FilterData['type'], value: parseFloat(raw), unit: raw.endsWith('%') ? '%' : undefined });
          break;
        case 'hue-rotate':
          filters.push({ type: 'hueRotate', value: parseFloat(raw), unit: 'deg' });
          break;
      }
    }

    return filters.length ? filters : undefined;
  }

  private extractClipPath(value: string): ClipPathData | undefined {
    if (!value || value === 'none') return undefined;
    const typeMatch = value.split('(')[0].trim();
    const allowed: ClipPathData['type'][] = ['circle', 'ellipse', 'inset', 'polygon', 'path', 'url'];
    const type = (allowed.includes(typeMatch as ClipPathData['type']) ? typeMatch : 'path') as ClipPathData['type'];
    return { type, value };
  }

  private extractMask(image: string, clip: string, mode: string): MaskData | undefined {
    if ((!image || image === 'none') && (!clip || clip === 'auto')) return undefined;
    let type: MaskData['type'] = 'none';
    if (image && image.startsWith('url(')) {
      type = 'url';
    } else if (mode === 'luminance') {
      type = 'luminance';
    } else if (mode === 'alpha') {
      type = 'alpha';
    }
    return {
      type,
      value: image && image !== 'none' ? image : clip
    };
  }

  private extractScrollData(element: HTMLElement): ScrollData | undefined {
    const scrollWidth = element.scrollWidth;
    const scrollHeight = element.scrollHeight;
    const scrollTop = element.scrollTop;
    const scrollLeft = element.scrollLeft;

    if (scrollWidth <= element.clientWidth && scrollHeight <= element.clientHeight && scrollTop === 0 && scrollLeft === 0) {
      return undefined;
    }

    return {
      scrollWidth,
      scrollHeight,
      scrollTop,
      scrollLeft,
      overscrollBehaviorX: (element as any).style?.overscrollBehaviorX,
      overscrollBehaviorY: (element as any).style?.overscrollBehaviorY
    };
  }

  private collectCustomProperties(computed: CSSStyleDeclaration): Record<string, string> | undefined {
    const custom: Record<string, string> = {};
    for (let i = 0; i < computed.length; i++) {
      const name = computed[i];
      if (name && name.startsWith('--')) {
        custom[name] = computed.getPropertyValue(name);
      }
    }
    return Object.keys(custom).length ? custom : undefined;
  }

  private buildInlineTextSegments(element: HTMLElement, node: ElementNode): InlineTextSegment[] {
    if (!node.textStyle) return [];
    const segments: InlineTextSegment[] = [];

    // Recursively process all child nodes to build styled text segments
    let segmentIndex = 0;
    let currentX = 0;

    const processNode = (childNode: Node, baseStyle: TextStyle): void => {
      if (childNode.nodeType === Node.TEXT_NODE) {
        const text = childNode.textContent || '';
        if (text.trim().length > 0) {
          segments.push({
            id: `${node.id}-segment-${segmentIndex++}`,
            characters: text,
            textStyle: baseStyle,
            layout: {
              x: currentX,
              y: 0,
              width: text.length * (baseStyle.fontSize * 0.6), // Approximate width
              height: baseStyle.fontSize
            }
          });
          currentX += text.length * (baseStyle.fontSize * 0.6);
        }
      } else if (childNode.nodeType === Node.ELEMENT_NODE) {
        const el = childNode as HTMLElement;
        const computed = window.getComputedStyle(el);

        // Extract text style for this specific element
        const styledTextStyle = this.extractTextStyle(computed);

        // Handle common inline styling elements
        const tag = el.tagName.toLowerCase();
        if (tag === 'strong' || tag === 'b') {
          styledTextStyle.fontWeight = Math.max(styledTextStyle.fontWeight, 700);
        }
        if (tag === 'em' || tag === 'i') {
          styledTextStyle.fontStyle = 'italic';
        }
        if (tag === 'u') {
          styledTextStyle.textDecoration = 'UNDERLINE';
        }
        if (tag === 's' || tag === 'strike' || tag === 'del') {
          styledTextStyle.textDecoration = 'STRIKETHROUGH';
        }

        // Recursively process children with the new style
        Array.from(el.childNodes).forEach(child => processNode(child, styledTextStyle));
      }
    };

    // Check if element has styled children (like <strong>, <em>, <span>)
    const hasStyledChildren = Array.from(element.childNodes).some(child =>
      child.nodeType === Node.ELEMENT_NODE &&
      ['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'span', 'a'].includes(
        (child as HTMLElement).tagName.toLowerCase()
      )
    );

    if (hasStyledChildren && node.textStyle) {
      // Process with rich text support
      Array.from(element.childNodes).forEach(child => processNode(child, node.textStyle!));
    } else {
      // Simple text - return single segment
      const text = element.innerText || '';
      if (text.trim()) {
        segments.push({
          id: `${node.id}-segment-0`,
          characters: text,
          textStyle: node.textStyle,
          layout: {
            x: 0,
            y: 0,
            width: node.layout.width,
            height: node.layout.height
          }
        });
      }
    }

    return segments;
  }

  private createComponentSignature(element: Element, node: ElementNode): string | undefined {
    if (!(element instanceof HTMLElement)) return undefined;
    
    // Enhanced component signature with visual fingerprinting
    if (this.useEnhancedComponentDetection && this.componentDetector) {
      try {
        // Create a visual fingerprint for this element
        const computed = window.getComputedStyle(element);
        
        // Extract key visual properties for signature
        const visualProperties = [
          // Layout properties
          `w:${Math.round(node.layout.width / 10) * 10}`, // Round to 10px
          `h:${Math.round(node.layout.height / 10) * 10}`,
          `display:${computed.display}`,
          
          // Color properties  
          `bg:${this.normalizeColorForSignature(computed.backgroundColor)}`,
          `color:${this.normalizeColorForSignature(computed.color)}`,
          
          // Typography (if text element)
          element.textContent?.trim() ? `font:${computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim()}-${computed.fontSize}` : '',
          
          // Styling properties
          `radius:${Math.round(parseFloat(computed.borderRadius) || 0)}`,
          `border:${Math.round(parseFloat(computed.borderWidth) || 0)}`,
          `shadow:${computed.boxShadow !== 'none' ? '1' : '0'}`,
          
          // Semantic properties
          `tag:${node.htmlTag}`,
          `interactive:${this.isInteractiveElement(element) ? '1' : '0'}`,
          
          // Structure properties
          `children:${node.children.length}`,
          `hasText:${element.textContent?.trim().length ? '1' : '0'}`,
          `hasImage:${element.querySelector('img, svg') ? '1' : '0'}`
        ].filter(Boolean).join('|');
        
        return this.hashString(visualProperties);
      } catch (error) {
        console.warn('Error creating enhanced component signature, falling back to legacy:', error);
      }
    }
    
    // Legacy signature approach as fallback
    const signature = [
      node.htmlTag,
      element.id || '',
      element.className || '',
      Object.keys(element.dataset || {}).sort().join(','),
      node.fills?.length || 0,
      node.children.length
    ].join('|');
    return this.hashString(signature);
  }

  /**
   * Normalize color values for component signature consistency
   */
  private normalizeColorForSignature(color: string): string {
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
      return 'none';
    }
    
    // Convert colors to a consistent format for comparison
    if (color.startsWith('rgb(')) {
      // Extract RGB values and round them
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = Math.round(parseInt(match[1]) / 10) * 10; // Round to nearest 10
        const g = Math.round(parseInt(match[2]) / 10) * 10;
        const b = Math.round(parseInt(match[3]) / 10) * 10;
        return `${r},${g},${b}`;
      }
    }
    
    if (color.startsWith('rgba(')) {
      // Extract RGBA values and round them  
      const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (match) {
        const r = Math.round(parseInt(match[1]) / 10) * 10;
        const g = Math.round(parseInt(match[2]) / 10) * 10;
        const b = Math.round(parseInt(match[3]) / 10) * 10;
        const a = Math.round(parseFloat(match[4]) * 10) / 10;
        return a < 0.1 ? 'none' : `${r},${g},${b},${a}`;
      }
    }
    
    // For named colors or hex, return as-is (simplified)
    return color.substring(0, 10); // Limit length
  }

  /**
   * Check if an element is interactive (for component signature)
   */
  private isInteractiveElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const interactive = ['button', 'a', 'input', 'textarea', 'select', 'form'];
    
    if (interactive.includes(tagName)) return true;
    if (element.hasAttribute('onclick')) return true;
    if (element.getAttribute('role') === 'button') return true;
    if (element.getAttribute('tabindex') !== null) return true;
    
    const style = window.getComputedStyle(element as HTMLElement);
    if (style.cursor === 'pointer') return true;
    
    return false;
  }

  private createContentHash(node: ElementNode): string {
    const payload = {
      type: node.type,
      layout: node.layout,
      fills: node.fills,
      strokes: node.strokes,
      effects: node.effects,
      textStyle: node.textStyle,
      characters: node.characters,
      backgrounds: node.backgrounds,
      transform: node.transform
    };
    return this.hashString(JSON.stringify(payload));
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return 'asset-0';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `asset-${Math.abs(hash).toString(16)}`;
  }

  private generateSemanticName(element: Element): string {
    const ariaLabel = element.getAttribute?.('aria-label');
    if (ariaLabel) return ariaLabel;

    const dataTestId = element.getAttribute?.('data-testid');
    if (dataTestId) return dataTestId;

    const elementId = (element as HTMLElement).id;
    if (elementId) return elementId;

    const mainClass = element.classList?.[0];
    if (mainClass) return mainClass;

    return element.tagName.toLowerCase();
  }

  private registerStyles(node: ElementNode) {
    if (node.fills) {
      node.fills.forEach((fill) => {
        if (fill.type === 'SOLID' && fill.color) {
          const key = `${fill.color.r}-${fill.color.g}-${fill.color.b}-${fill.color.a}`;
          const existing = this.styleRegistry.colors[key];
          if (existing) {
            existing.usageCount += 1;
          } else {
            const style: ColorStyle = {
              id: key,
              name: `Color/${Math.round(fill.color.r * 255)},${Math.round(
                fill.color.g * 255
              )},${Math.round(fill.color.b * 255)}`,
              color: fill.color,
              usageCount: 1
            };
            this.styleRegistry.colors[key] = style;
          }
        }
      });
    }

    if (node.textStyle) {
      const key = `${node.textStyle.fontFamily}-${node.textStyle.fontWeight}-${node.textStyle.fontSize}`;
      if (!this.styleRegistry.textStyles[key]) {
        this.styleRegistry.textStyles[key] = node.textStyle;
      }
    }
  }

  private registerFontUsage(textStyle?: TextStyle) {
    if (!textStyle) return;
    const entry = this.fontUsage.get(textStyle.fontFamily) || {
      fontFamily: textStyle.fontFamily,
      weights: new Set<number>()
    };
    entry.weights.add(textStyle.fontWeight);
    this.fontUsage.set(textStyle.fontFamily, entry);
  }

  private buildFontDefinitions(): FontDefinition[] {
    const fonts: FontDefinition[] = [];
    this.fontUsage.forEach((usage) => {
      fonts.push({
        family: usage.fontFamily,
        weights: Array.from(usage.weights),
        source: 'system'
      });
    });
    return fonts;
  }

  private static getCanvasContext(): CanvasRenderingContext2D {
    if (!(window as any).__webToFigmaCanvas) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      // Use willReadFrequently because we call getImageData many times (reduces warnings/perf hit)
      const contextOptions = { willReadFrequently: true } as CanvasRenderingContext2DSettings;
      (window as any).__webToFigmaCanvas =
        canvas.getContext('2d', contextOptions) || canvas.getContext('2d');

      if (!(window as any).__webToFigmaCanvas) {
        throw new Error('Failed to initialize canvas context');
      }
    }
    return (window as any).__webToFigmaCanvas;
  }

  private canUseBackgroundMessaging(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.runtime &&
      typeof chrome.runtime.sendMessage === 'function'
    );
  }

  private estimateImageSize(width: number, height: number): number {
    // Rough estimation: assume average 0.3 bytes per pixel for compressed image
    const pixelCount = width * height;
    const estimatedSizeKB = (pixelCount * 0.3) / 1024;
    return estimatedSizeKB;
  }

  /**
   * Calculate smart compression target based on image dimensions
   * Larger images get more aggressive compression to keep payload manageable
   */
  private calculateSmartTargetSize(width: number, height: number): number {
    const pixels = width * height;

    // Tiered compression strategy based on total pixels:
    // - Thumbnails/icons (<10K pixels): 30KB max (high quality)
    // - Small images (10K-100K pixels): 50KB max
    // - Medium images (100K-500K pixels): 80KB max
    // - Large images (500K-2M pixels): 120KB max
    // - Very large (>2M pixels): 150KB max

    if (pixels < 10000) {
      return 30; // Tiny images - keep quality
    } else if (pixels < 100000) {
      return 50; // Small images
    } else if (pixels < 500000) {
      return 80; // Medium images
    } else if (pixels < 2000000) {
      return 120; // Large images
    } else {
      return 150; // Very large - aggressive compression
    }
  }

  private determineEnhancedSizingModes(computed: CSSStyleDeclaration, isVertical: boolean): {
    primaryAxisSizingMode: 'AUTO' | 'FIXED';
    counterAxisSizingMode: 'AUTO' | 'FIXED';
  } {
    const width = computed.width;
    const height = computed.height;
    const flexGrow = parseFloat(computed.flexGrow) || 0;
    const flexShrink = parseFloat(computed.flexShrink) || 1;
    const flexBasis = computed.flexBasis || 'auto';

    let primaryAxisSizingMode: 'AUTO' | 'FIXED' = 'FIXED';
    let counterAxisSizingMode: 'AUTO' | 'FIXED' = 'FIXED';

    // Enhanced heuristics for sizing modes
    if (isVertical) {
      // Primary axis (height) detection
      const hasFlexGrow = flexGrow > 0;
      const hasAutoHeight = height === 'auto' || height === 'max-content' || height === 'min-content';
      const hasFlexibleBasis = flexBasis === 'auto' || flexBasis === 'content';
      
      if (hasFlexGrow || hasAutoHeight || hasFlexibleBasis) {
        primaryAxisSizingMode = 'AUTO';
      }
      
      // Counter axis (width) detection
      const hasAutoWidth = width === 'auto' || width === 'max-content' || width === 'min-content';
      const hasPercentageWidth = width.includes('%');
      
      if (hasAutoWidth && !hasPercentageWidth) {
        counterAxisSizingMode = 'AUTO';
      }
    } else {
      // Primary axis (width) detection  
      const hasFlexGrow = flexGrow > 0;
      const hasAutoWidth = width === 'auto' || width === 'max-content' || width === 'min-content';
      const hasFlexibleBasis = flexBasis === 'auto' || flexBasis === 'content';
      
      if (hasFlexGrow || hasAutoWidth || hasFlexibleBasis) {
        primaryAxisSizingMode = 'AUTO';
      }
      
      // Counter axis (height) detection
      const hasAutoHeight = height === 'auto' || height === 'max-content' || height === 'min-content';
      const hasPercentageHeight = height.includes('%');
      
      if (hasAutoHeight && !hasPercentageHeight) {
        counterAxisSizingMode = 'AUTO';
      }
    }

    return { primaryAxisSizingMode, counterAxisSizingMode };
  }

  private calculateEnhancedGap(computed: CSSStyleDeclaration, isVertical: boolean): number {
    // Try modern gap properties first
    const gap = (computed as any).gap || '0';
    const rowGap = (computed as any).rowGap || gap;
    const columnGap = (computed as any).columnGap || gap;
    
    // Handle CSS Grid gap properties too
    const gridGap = (computed as any).gridGap || '0';
    const gridRowGap = (computed as any).gridRowGap || gridGap;
    const gridColumnGap = (computed as any).gridColumnGap || gridGap;
    
    let gapValue: string;
    
    if (isVertical) {
      // For vertical layouts, use row gap
      gapValue = rowGap || gridRowGap || '0';
    } else {
      // For horizontal layouts, use column gap
      gapValue = columnGap || gridColumnGap || '0';
    }
    
    // Convert string value to number, handling units
    let effectiveGap = 0;
    
    if (typeof gapValue === 'string') {
      if (gapValue.includes('rem')) {
        effectiveGap = parseFloat(gapValue) * 16; // Assume 16px = 1rem
      } else if (gapValue.includes('em')) {
        effectiveGap = parseFloat(gapValue) * 16; // Rough approximation
      } else {
        effectiveGap = parseFloat(gapValue) || 0;
      }
    } else {
      effectiveGap = parseFloat(String(gapValue)) || 0;
    }
    
    return Math.max(0, effectiveGap);
  }

  private mapEnhancedAlignment(computed: CSSStyleDeclaration, isVertical: boolean, isReverse: boolean): {
    primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  } {
    // Enhanced justify-content mapping with reverse support
    let primaryAxisAlignItems = this.mapJustifyContent(computed.justifyContent);
    
    // Handle flex-direction: *-reverse by flipping MIN/MAX
    if (isReverse && (primaryAxisAlignItems === 'MIN' || primaryAxisAlignItems === 'MAX')) {
      primaryAxisAlignItems = primaryAxisAlignItems === 'MIN' ? 'MAX' : 'MIN';
    }
    
    // Enhanced align-items mapping
    const counterAxisAlignItems = this.mapAlignItems(computed.alignItems);
    
    return { primaryAxisAlignItems, counterAxisAlignItems };
  }

  private async compressImage(blob: Blob, targetSizeKB: number): Promise<{
    base64: string;
    width: number;
    height: number;
  }> {
    // Try WebCodecs API first for better compression
    if (this.supportsWebCodecs() && blob.size > 100 * 1024) {
      try {
        return await this.compressWithWebCodecs(blob, targetSizeKB);
      } catch (error) {
        console.warn('WebCodecs compression failed, falling back to Canvas:', error);
      }
    }

    return this.compressWithEnhancedCanvas(blob, targetSizeKB);
  }

  private supportsWebCodecs(): boolean {
    return typeof window !== 'undefined' && 
           'VideoFrame' in window && 
           'VideoEncoder' in window &&
           'createImageBitmap' in window;
  }

  private async compressWithWebCodecs(blob: Blob, targetSizeKB: number): Promise<{
    base64: string;
    width: number;
    height: number;
  }> {
    // WebCodecs provides better compression than Canvas
    const bitmap = await createImageBitmap(blob);
    
    // Smart resize based on target size
    const scale = this.calculateOptimalScale(bitmap.width, bitmap.height, targetSizeKB);
    const newWidth = Math.floor(bitmap.width * scale);
    const newHeight = Math.floor(bitmap.height * scale);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Better resize algorithm using image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    
    // Binary search for optimal quality
    return this.binarySearchQuality(canvas, targetSizeKB);
  }

  private calculateOptimalScale(width: number, height: number, targetSizeKB: number): number {
    // EXTREME AGGRESSIVE scaling for payload reduction
    const totalPixels = width * height;
    
    // Ultra-aggressive: assume only 0.05 bytes per pixel after extreme compression
    const targetPixels = (targetSizeKB * 1024) / 0.05;
    
    if (totalPixels <= targetPixels) {
      return 1; // No scaling needed
    }
    
    // Scale down very aggressively - prioritize payload size over image quality
    const scale = Math.sqrt(targetPixels / totalPixels);
    
    // Much smaller minimum dimensions - 100px on longest side for extreme compression
    const minScale = 100 / Math.max(width, height);
    
    return Math.max(minScale, Math.min(1, scale));
  }

  private async binarySearchQuality(canvas: HTMLCanvasElement, targetSizeKB: number): Promise<{
    base64: string;
    width: number;
    height: number;
  }> {
    // EXTREME aggressive quality range for maximum payload reduction
    let minQuality = 0.005; // Ultra-low quality
    let maxQuality = 0.3;   // Much lower maximum
    let bestResult: any = null;

    // Always prefer WebP for better compression, fallback to JPEG
    const format = this.canvasSupportsFormat('image/webp') ? 'image/webp' : 'image/jpeg';
    
    while (maxQuality - minQuality > 0.02) {
      const quality = (minQuality + maxQuality) / 2;
      const dataUrl = canvas.toDataURL(format, quality);
      const base64 = dataUrl.split(',')[1];
      const estimatedSizeKB = (base64.length * 0.75) / 1024;
      
      if (estimatedSizeKB <= targetSizeKB) {
        bestResult = {
          base64,
          width: canvas.width,
          height: canvas.height,
          quality,
          sizeKB: estimatedSizeKB
        };
        minQuality = quality; // Try higher quality
      } else {
        maxQuality = quality; // Reduce quality
      }
    }

    if (bestResult) {
      console.log(`✅ Optimized compression: ${bestResult.sizeKB.toFixed(1)}KB at ${format} quality ${bestResult.quality.toFixed(2)}`);
      return {
        base64: bestResult.base64,
        width: bestResult.width,
        height: bestResult.height
      };
    }

    // Fallback to very low quality if binary search failed
    const dataUrl = canvas.toDataURL(format, 0.05);
    const base64 = dataUrl.split(',')[1];
    console.warn(`⚠️ Used minimal quality compression: ${((base64.length * 0.75) / 1024).toFixed(1)}KB`);
    
    return {
      base64,
      width: canvas.width,
      height: canvas.height
    };
  }

  private canvasSupportsFormat(mimeType: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const dataUrl = canvas.toDataURL(mimeType);
    return !dataUrl.startsWith('data:image/png');
  }

  private async compressWithEnhancedCanvas(blob: Blob, targetSizeKB: number): Promise<{
    base64: string;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      if (!ctx) {
        reject(new Error('Could not get canvas context for image compression'));
        return;
      }

      img.onload = () => {
        try {
          // Smart scaling based on target size
          const scale = this.calculateOptimalScale(img.width, img.height, targetSizeKB);
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          
          // High-quality resize
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Binary search for optimal quality
          this.binarySearchQuality(canvas, targetSizeKB)
            .then(resolve)
            .catch(reject);
          
        } catch (error) {
          reject(new Error(`Image compression failed: ${error}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      // Create object URL from blob to load the image
      const url = URL.createObjectURL(blob);
      
      // Store original onload for cleanup
      const originalOnLoad = img.onload;
      img.onload = function(event: Event) {
        URL.revokeObjectURL(url);
        if (originalOnLoad) originalOnLoad.call(this, event);
      };
      
      img.src = url;
    });
  }

  private getIframeOffset(): { x: number; y: number } {
    if (window === window.parent) {
      return { x: 0, y: 0 };
    }

    try {
      const frameElement = window.frameElement as HTMLElement;
      if (frameElement) {
        const frameRect = frameElement.getBoundingClientRect();
        return { x: frameRect.left, y: frameRect.top };
      }
    } catch (e) {
      // Cross-origin iframe, can't access
    }

    return { x: 0, y: 0 };
  }

  private mapGridAlignmentForCounterAxis(value?: string): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' {
    switch (value) {
      case 'start':
      case 'flex-start':
        return 'MIN';
      case 'center':
        return 'CENTER';
      case 'end':
      case 'flex-end':
        return 'MAX';
      case 'stretch':
      default:
        return 'STRETCH';
    }
  }
}

type ImageAssetPartial = {
  hash: string;
  url: string;
  base64?: string;
  width: number;
  height: number;
  mimeType: string;
};
