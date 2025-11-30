/**
 * Enhanced DOM Extractor with Pixel-Perfect Coordinate System
 * Integrates advanced coordinate transformation and validation
 */

import { 
  CoreCoordinateTransformer, 
  CoordinateSpace, 
  CoordinatePoint, 
  CoordinateBounds,
  CoordinateValidator,
  CoordinateUtils,
  TransformationContext
} from './core-coordinate-system';
import { TransformMatrixProcessor, Transform2D } from './transform-processor';

export interface EnhancedExtractionContext {
  viewport: { width: number; height: number };
  scroll: { x: number; y: number };
  zoom: number;
  devicePixelRatio: number;
  documentOrigin: { x: number; y: number };
  iframeOffset: { x: number; y: number };
}

export interface EnhancedElementData {
  // Standard element data
  id: string;
  name: string;
  type: string;
  bounds: CoordinateBounds;
  
  // Enhanced coordinate data
  coordinates: {
    viewport: CoordinatePoint;
    document: CoordinatePoint;
    figma: CoordinatePoint;
    precision: number;
    zIndex?: number;
  };

  svgContent?: string;
  layout?: {
    gap?: number;
    rowGap?: number;
    columnGap?: number;
  };
  
  // Transform data
  transforms: {
    cssTransform: string;
    matrix: Transform2D;
    components: any;
    figmaCompatible: boolean;
  };
  
  // Validation data
  validation: {
    coordinateAccuracy: number;
    transformStability: number;
    overallScore: number;
    issues: string[];
  };
}

export class EnhancedDOMExtractor {
  private coordinateTransformer: CoreCoordinateTransformer;
  private validator: CoordinateValidator;
  private context: EnhancedExtractionContext;
  private extractedElements: Map<string, EnhancedElementData> = new Map();

  constructor(context: EnhancedExtractionContext) {
    this.coordinateTransformer = new CoreCoordinateTransformer(0.01); // 0.01px precision
    this.validator = new CoordinateValidator();
    this.context = context;
  }

  /**
   * Extract element with enhanced coordinate processing
   */
  extractElement(element: HTMLElement, id: string): EnhancedElementData {
    try {
      // Get basic element bounds
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);

      // Create transformation context
      const transformContext: TransformationContext = {
        scrollX: this.context.scroll.x,
        scrollY: this.context.scroll.y,
        zoom: this.context.zoom,
        documentOrigin: this.context.documentOrigin,
        viewport: this.context.viewport
      };

      // Extract viewport coordinates
      const viewportPoint: CoordinatePoint = {
        x: rect.left,
        y: rect.top,
        space: CoordinateSpace.VIEWPORT,
        precision: 0.1 // getBoundingClientRect precision
      };

      // Transform to document coordinates
      const documentResult = this.coordinateTransformer.transform(
        viewportPoint,
        CoordinateSpace.DOCUMENT,
        transformContext
      );

      if (!documentResult.success) {
        console.error(`Failed to transform to document space: ${documentResult.error}`);
      }

      // Process CSS transforms
      const cssTransform = computedStyle.transform;
      const transformMatrix = TransformMatrixProcessor.parseTransform(cssTransform);
      const transformComponents = TransformMatrixProcessor.decompose(transformMatrix);
      const figmaTransform = TransformMatrixProcessor.toFigmaTransform(transformMatrix);
      const transformValidation = TransformMatrixProcessor.validateMatrix(transformMatrix);

      // CRITICAL FIX: Return DOCUMENT space coordinates, not FIGMA space
      // The main dom-extractor will handle conversion to relative coordinates
      // Don't multiply by zoom - getBoundingClientRect already returns CSS pixels
      const bounds: CoordinateBounds = {
        left: rect.left + this.context.scroll.x,  // Document coordinates = viewport + scroll
        top: rect.top + this.context.scroll.y,
        right: rect.right + this.context.scroll.x,
        bottom: rect.bottom + this.context.scroll.y,
        width: rect.width,   // Keep original CSS pixel dimensions
        height: rect.height,
        space: CoordinateSpace.DOCUMENT  // Document space, not Figma space
      };

      // Validate coordinates
      const documentPoint: CoordinatePoint = {
        x: bounds.left,
        y: bounds.top,
        space: CoordinateSpace.DOCUMENT,
        precision: 0.1
      };
      const coordinateValidation = this.validator.validatePoint(documentPoint);
      const boundsValidation = this.validator.validateBounds(bounds);

      // Calculate overall validation score
      const transformScore = transformValidation.isValid ?
        (transformValidation.isDegenerate ? 0.5 : 1.0) : 0.0;
      const overallScore = (
        coordinateValidation.score * 0.4 +
        boundsValidation.score * 0.3 +
        transformScore * 0.3
      );

      // Compile validation issues
      const allIssues = [
        ...coordinateValidation.issues,
        ...boundsValidation.issues,
        ...transformValidation.warnings
      ];

      // Extract layout gaps
      const gap = computedStyle.gap !== 'normal' ? parseInt(computedStyle.gap, 10) : 0;
      const rowGap = computedStyle.rowGap !== 'normal' ? parseInt(computedStyle.rowGap, 10) : 0;
      const columnGap = computedStyle.columnGap !== 'normal' ? parseInt(computedStyle.columnGap, 10) : 0;

      // Serialize SVG content if applicable
      let svgContent: string | undefined;
      if (element.tagName.toLowerCase() === 'svg') {
        try {
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(element);
          // Use base64 to avoid parsing issues in JSON
          const base64 = window.btoa(unescape(encodeURIComponent(svgString)));
          svgContent = `data:image/svg+xml;base64,${base64}`;
        } catch (e) {
          console.warn(`Failed to serialize SVG: ${id}`, e);
        }
      }

      // Create enhanced element data
      const elementData: EnhancedElementData = {
        id,
        name: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
        type: this.determineElementType(element),
        bounds: CoordinateUtils.roundBounds(bounds, 0.01),
        svgContent, // Include SVG content

        layout: { // Include layout properties
          gap: isNaN(gap) ? 0 : gap,
          rowGap: isNaN(rowGap) ? 0 : rowGap,
          columnGap: isNaN(columnGap) ? 0 : columnGap
        },

        coordinates: {
          viewport: CoordinateUtils.roundPoint(viewportPoint, 0.01),
          document: CoordinateUtils.roundPoint(documentPoint, 0.01),
          figma: CoordinateUtils.roundPoint(documentPoint, 0.01), // Document coords used for Figma conversion
          precision: documentPoint.precision,
          zIndex: computedStyle.zIndex !== 'auto' ? parseInt(computedStyle.zIndex, 10) : 0
        },
        
        transforms: {
          cssTransform,
          matrix: transformMatrix,
          components: transformComponents,
          figmaCompatible: figmaTransform.supported
        },
        
        validation: {
          coordinateAccuracy: coordinateValidation.score,
          transformStability: transformScore,
          overallScore,
          issues: allIssues
        }
      };

      this.extractedElements.set(id, elementData);
      return elementData;

    } catch (error) {
      console.error(`Enhanced extraction failed for ${id}:`, error);
      // Return fallback data to prevent stall
      return {
        id,
        name: element.tagName.toLowerCase(),
        type: 'RECTANGLE',
        bounds: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, space: CoordinateSpace.DOCUMENT },
        coordinates: {
          viewport: { x: 0, y: 0, space: CoordinateSpace.VIEWPORT, precision: 0 },
          document: { x: 0, y: 0, space: CoordinateSpace.DOCUMENT, precision: 0 },
          figma: { x: 0, y: 0, space: CoordinateSpace.DOCUMENT, precision: 0 },
          precision: 0,
          zIndex: 0
        },
        transforms: {
          cssTransform: 'none',
          matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
          components: { scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, rotation: 0, translation: { x: 0, y: 0 } },
          figmaCompatible: true
        },
        validation: {
          coordinateAccuracy: 0,
          transformStability: 0,
          overallScore: 0,
          issues: ['Extraction failed']
        }
      };
    }
  }

  /**
   * Determine Figma-appropriate element type
   */
  private determineElementType(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const computedStyle = window.getComputedStyle(element);

    // Text elements
    if (tagName === 'span' || tagName === 'p' || tagName === 'h1' || 
        tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || 
        tagName === 'h5' || tagName === 'h6' || tagName === 'a') {
      return 'TEXT';
    }

    // Image elements
    if (tagName === 'img') {
      return 'IMAGE';
    }

    // SVG elements
    if (tagName === 'svg') {
      return 'VECTOR';
    }

    // Frame elements (containers)
    if (tagName === 'div' || tagName === 'section' || tagName === 'article' ||
        tagName === 'main' || tagName === 'header' || tagName === 'footer' ||
        tagName === 'aside' || tagName === 'nav') {
      return 'FRAME';
    }

    // Default to rectangle for other elements
    return 'RECTANGLE';
  }

  /**
   * Extract layout context for advanced layout decisions
   */
  extractLayoutContext(element: HTMLElement): any {
    const computedStyle = window.getComputedStyle(element);
    
    return {
      display: computedStyle.display,
      position: computedStyle.position,
      flexDirection: computedStyle.flexDirection,
      justifyContent: computedStyle.justifyContent,
      alignItems: computedStyle.alignItems,
      gridTemplateColumns: computedStyle.gridTemplateColumns,
      gridTemplateRows: computedStyle.gridTemplateRows,
      gap: computedStyle.gap,
      transform: computedStyle.transform,
      transformOrigin: computedStyle.transformOrigin,
      overflow: computedStyle.overflow,
      zIndex: computedStyle.zIndex
    };
  }

  /**
   * Get accuracy metrics for all extracted elements
   */
  getAccuracyMetrics(): {
    averageScore: number;
    coordinateAccuracy: number;
    transformStability: number;
    totalElements: number;
    issues: { element: string; issues: string[] }[];
  } {
    const elements = Array.from(this.extractedElements.values());
    
    if (elements.length === 0) {
      return {
        averageScore: 1.0,
        coordinateAccuracy: 1.0,
        transformStability: 1.0,
        totalElements: 0,
        issues: []
      };
    }

    const avgScore = elements.reduce((sum, el) => sum + el.validation.overallScore, 0) / elements.length;
    const avgCoordAccuracy = elements.reduce((sum, el) => sum + el.validation.coordinateAccuracy, 0) / elements.length;
    const avgTransformStability = elements.reduce((sum, el) => sum + el.validation.transformStability, 0) / elements.length;
    
    const issues = elements
      .filter(el => el.validation.issues.length > 0)
      .map(el => ({ element: el.name, issues: el.validation.issues }));

    return {
      averageScore: avgScore,
      coordinateAccuracy: avgCoordAccuracy,
      transformStability: avgTransformStability,
      totalElements: elements.length,
      issues
    };
  }

  /**
   * Convert enhanced data to standard schema format
   */
  convertToStandardSchema(elementData: EnhancedElementData): any {
    return {
      id: elementData.id,
      type: elementData.type as any,
      name: elementData.name,
      zIndex: elementData.coordinates.zIndex || 0,
      svgContent: elementData.svgContent, // Pass SVG content
      layout: {
        x: elementData.bounds.left,
        y: elementData.bounds.top,
        width: elementData.bounds.width,
        height: elementData.bounds.height,
        boxSizing: 'border-box',
        gap: elementData.layout?.gap, // Pass gap properties
        rowGap: elementData.layout?.rowGap,
        columnGap: elementData.layout?.columnGap
      },
      absoluteLayout: {
        left: elementData.bounds.left,
        top: elementData.bounds.top,
        right: elementData.bounds.right,
        bottom: elementData.bounds.bottom,
        width: elementData.bounds.width,
        height: elementData.bounds.height,
        zIndex: elementData.coordinates.zIndex || 0
      },
      transform: elementData.transforms.figmaCompatible ? {
        matrix: Object.values(elementData.transforms.matrix),
        components: elementData.transforms.components
      } : undefined,
      validation: {
        coordinateAccuracy: elementData.validation.coordinateAccuracy,
        overallScore: elementData.validation.overallScore,
        issues: elementData.validation.issues
      }
    };
  }


  /**
   * Reset extraction state
   */
  reset(): void {
    this.extractedElements.clear();
    this.coordinateTransformer.reset();
  }
}