/**
 * Core Coordinate System for Pixel-Perfect HTML to Figma Conversion
 * Implements unified coordinate transformation pipeline with precision validation
 */

export enum CoordinateSpace {
  VIEWPORT = 'viewport',     // Browser viewport coordinates
  DOCUMENT = 'document',     // Document coordinates (viewport + scroll)
  ELEMENT = 'element',       // Element-relative coordinates
  PARENT = 'parent',         // Parent element coordinates
  FIGMA = 'figma',          // Figma canvas coordinates
  TRANSFORMED = 'transformed' // Transform-adjusted coordinates
}

export interface CoordinatePoint {
  x: number;
  y: number;
  space: CoordinateSpace;
  precision: number; // Estimated precision/error
}

export interface CoordinateBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  space: CoordinateSpace;
}

export interface TransformationResult {
  point: CoordinatePoint;
  success: boolean;
  error?: string;
  intermediateSteps?: CoordinatePoint[];
}

export interface AccuracyMetrics {
  averageError: number;
  maxError: number;
  confidence: number;
  transformationCount: number;
}

export class CoreCoordinateTransformer {
  private transformationCount = 0;
  private errorAccumulation = 0;
  private precision = 0.01; // Default 0.01px precision

  constructor(precision = 0.01) {
    this.precision = precision;
  }

  /**
   * Transform point between coordinate spaces
   */
  transform(
    point: CoordinatePoint,
    targetSpace: CoordinateSpace,
    context: TransformationContext
  ): TransformationResult {
    this.transformationCount++;
    const intermediateSteps: CoordinatePoint[] = [point];

    try {
      let currentPoint = { ...point };

      // Find transformation path
      const transformationPath = this.findTransformationPath(point.space, targetSpace);
      
      for (const step of transformationPath) {
        const transformed = this.applyTransformation(currentPoint, step, context);
        if (!transformed.success) {
          return transformed;
        }
        currentPoint = transformed.point;
        intermediateSteps.push(currentPoint);
      }

      // Update accuracy metrics
      const errorEstimate = this.estimateTransformationError(transformationPath.length);
      currentPoint.precision = Math.max(currentPoint.precision, errorEstimate);
      this.errorAccumulation += errorEstimate;

      return {
        point: currentPoint,
        success: true,
        intermediateSteps
      };

    } catch (error) {
      return {
        point,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      };
    }
  }

  /**
   * Find optimal transformation path between coordinate spaces
   */
  private findTransformationPath(from: CoordinateSpace, to: CoordinateSpace): string[] {
    const transformationPaths: Record<string, string[]> = {
      [`${CoordinateSpace.VIEWPORT}-${CoordinateSpace.DOCUMENT}`]: ['addScroll'],
      [`${CoordinateSpace.DOCUMENT}-${CoordinateSpace.VIEWPORT}`]: ['subtractScroll'],
      [`${CoordinateSpace.DOCUMENT}-${CoordinateSpace.FIGMA}`]: ['applyDocumentOrigin'],
      [`${CoordinateSpace.FIGMA}-${CoordinateSpace.DOCUMENT}`]: ['subtractDocumentOrigin'],
      [`${CoordinateSpace.ELEMENT}-${CoordinateSpace.PARENT}`]: ['addElementOffset'],
      [`${CoordinateSpace.PARENT}-${CoordinateSpace.ELEMENT}`]: ['subtractElementOffset'],
      [`${CoordinateSpace.VIEWPORT}-${CoordinateSpace.FIGMA}`]: ['addScroll', 'applyDocumentOrigin'],
      [`${CoordinateSpace.FIGMA}-${CoordinateSpace.VIEWPORT}`]: ['subtractDocumentOrigin', 'subtractScroll']
    };

    const key = `${from}-${to}`;
    return transformationPaths[key] || [];
  }

  /**
   * Apply individual transformation step
   */
  private applyTransformation(
    point: CoordinatePoint,
    transformation: string,
    context: TransformationContext
  ): TransformationResult {
    const { x, y } = point;
    let newX = x;
    let newY = y;
    let newSpace = point.space;
    let errorEstimate = 0;

    switch (transformation) {
      case 'addScroll':
        newX = x + (context.scrollX || 0);
        newY = y + (context.scrollY || 0);
        newSpace = CoordinateSpace.DOCUMENT;
        errorEstimate = 0.1; // Scroll position precision
        break;

      case 'subtractScroll':
        newX = x - (context.scrollX || 0);
        newY = y - (context.scrollY || 0);
        newSpace = CoordinateSpace.VIEWPORT;
        errorEstimate = 0.1;
        break;

      case 'applyDocumentOrigin':
        newX = x - (context.documentOrigin?.x || 0);
        newY = y - (context.documentOrigin?.y || 0);
        newSpace = CoordinateSpace.FIGMA;
        errorEstimate = 0.05; // Origin calculation precision
        break;

      case 'subtractDocumentOrigin':
        newX = x + (context.documentOrigin?.x || 0);
        newY = y + (context.documentOrigin?.y || 0);
        newSpace = CoordinateSpace.DOCUMENT;
        errorEstimate = 0.05;
        break;

      case 'addElementOffset':
        if (context.elementBounds) {
          newX = x + context.elementBounds.left;
          newY = y + context.elementBounds.top;
        }
        newSpace = CoordinateSpace.PARENT;
        errorEstimate = 0.02;
        break;

      case 'subtractElementOffset':
        if (context.elementBounds) {
          newX = x - context.elementBounds.left;
          newY = y - context.elementBounds.top;
        }
        newSpace = CoordinateSpace.ELEMENT;
        errorEstimate = 0.02;
        break;

      default:
        return {
          point,
          success: false,
          error: `Unknown transformation: ${transformation}`
        };
    }

    // Validate transformation result
    if (!Number.isFinite(newX) || !Number.isFinite(newY)) {
      return {
        point,
        success: false,
        error: `Invalid transformation result: (${newX}, ${newY})`
      };
    }

    return {
      point: {
        x: newX,
        y: newY,
        space: newSpace,
        precision: point.precision + errorEstimate
      },
      success: true
    };
  }

  /**
   * Estimate transformation error based on complexity
   */
  private estimateTransformationError(pathLength: number): number {
    return pathLength * 0.05; // 0.05px error per transformation step
  }

  /**
   * Get accuracy metrics
   */
  getAccuracyMetrics(): AccuracyMetrics {
    return {
      averageError: this.transformationCount > 0 ? this.errorAccumulation / this.transformationCount : 0,
      maxError: this.errorAccumulation,
      confidence: Math.max(0, 1 - (this.errorAccumulation / 10)), // Confidence decreases with error
      transformationCount: this.transformationCount
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.transformationCount = 0;
    this.errorAccumulation = 0;
  }
}

export interface TransformationContext {
  scrollX?: number;
  scrollY?: number;
  zoom?: number;
  documentOrigin?: { x: number; y: number };
  elementBounds?: CoordinateBounds;
  viewport?: { width: number; height: number };
  transforms?: CSSTransform[];
}

export interface CSSTransform {
  type: 'translate' | 'scale' | 'rotate' | 'matrix';
  values: number[];
  origin?: { x: number; y: number };
}

/**
 * Enhanced coordinate validation
 */
export class CoordinateValidator {
  private tolerances = {
    position: 1.0,     // 1px position tolerance
    size: 0.5,         // 0.5px size tolerance
    precision: 0.01,   // 0.01px precision tolerance
    bounds: 50000      // Maximum coordinate bounds
  };

  validatePoint(point: CoordinatePoint): ValidationResult {
    const issues: string[] = [];
    let score = 1.0;

    // Check for invalid values
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      issues.push('Invalid coordinate values (NaN or Infinity)');
      score = 0;
    }

    // Check bounds
    if (Math.abs(point.x) > this.tolerances.bounds || Math.abs(point.y) > this.tolerances.bounds) {
      issues.push(`Coordinates exceed bounds: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`);
      score *= 0.5;
    }

    // Check precision
    if (point.precision > this.tolerances.precision * 10) {
      issues.push(`Low precision: ${point.precision.toFixed(4)}px`);
      score *= 0.8;
    }

    return {
      score,
      withinTolerance: score >= 0.7,
      issues
    };
  }

  validateBounds(bounds: CoordinateBounds): ValidationResult {
    const issues: string[] = [];
    let score = 1.0;

    // Check for negative dimensions
    if (bounds.width < 0 || bounds.height < 0) {
      issues.push('Negative dimensions detected');
      score *= 0.3;
    }

    // Check for zero dimensions
    if (bounds.width === 0 || bounds.height === 0) {
      issues.push('Zero dimensions detected');
      score *= 0.7;
    }

    // Check coordinate consistency
    const calculatedWidth = bounds.right - bounds.left;
    const calculatedHeight = bounds.bottom - bounds.top;
    
    if (Math.abs(calculatedWidth - bounds.width) > this.tolerances.size) {
      issues.push('Width calculation inconsistency');
      score *= 0.8;
    }

    if (Math.abs(calculatedHeight - bounds.height) > this.tolerances.size) {
      issues.push('Height calculation inconsistency');
      score *= 0.8;
    }

    return {
      score,
      withinTolerance: score >= 0.7,
      issues
    };
  }
}

export interface ValidationResult {
  score: number;
  withinTolerance: boolean;
  issues: string[];
}

/**
 * Utility functions for coordinate operations
 */
export class CoordinateUtils {
  static roundToPrecision(value: number, precision = 0.01): number {
    return Math.round(value / precision) * precision;
  }

  static roundPoint(point: CoordinatePoint, precision = 0.01): CoordinatePoint {
    return {
      ...point,
      x: this.roundToPrecision(point.x, precision),
      y: this.roundToPrecision(point.y, precision)
    };
  }

  static roundBounds(bounds: CoordinateBounds, precision = 0.01): CoordinateBounds {
    return {
      ...bounds,
      left: this.roundToPrecision(bounds.left, precision),
      top: this.roundToPrecision(bounds.top, precision),
      right: this.roundToPrecision(bounds.right, precision),
      bottom: this.roundToPrecision(bounds.bottom, precision),
      width: this.roundToPrecision(bounds.width, precision),
      height: this.roundToPrecision(bounds.height, precision)
    };
  }

  static distance(p1: CoordinatePoint, p2: CoordinatePoint): number {
    if (p1.space !== p2.space) {
      throw new Error('Cannot calculate distance between points in different coordinate spaces');
    }
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  static clampToBounds(point: CoordinatePoint, bounds: { minX: number; minY: number; maxX: number; maxY: number }): CoordinatePoint {
    return {
      ...point,
      x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y))
    };
  }
}