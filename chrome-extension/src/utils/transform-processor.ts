/**
 * Advanced CSS Transform Matrix Processor
 * Handles complex CSS transforms with precision and Figma compatibility
 */

export interface Transform2D {
  a: number; b: number; c: number;
  d: number; e: number; f: number;
}

export interface Transform3D extends Transform2D {
  a1: number; b1: number; c1: number; d1: number;
  a2: number; b2: number; c2: number; d2: number;
  a3: number; b3: number; c3: number; d3: number;
  a4: number; b4: number; c4: number; d4: number;
}

export interface TransformComponents {
  translate: { x: number; y: number; z?: number };
  scale: { x: number; y: number; z?: number };
  rotate: { angle: number; x?: number; y?: number; z?: number };
  skew: { x: number; y: number };
}

export interface TransformValidation {
  isValid: boolean;
  isDegenerate: boolean;
  determinant: number;
  conditionNumber: number;
  warnings: string[];
}

export class TransformMatrixProcessor {
  private static readonly EPSILON = 1e-10;
  private static readonly MAX_CONDITION_NUMBER = 1e12;

  /**
   * Parse CSS transform string into matrix
   */
  static parseTransform(transformString: string): Transform2D {
    if (!transformString || transformString === 'none') {
      return this.createIdentityMatrix();
    }

    let resultMatrix = this.createIdentityMatrix();
    const functions = this.parseTransformFunctions(transformString);

    for (const func of functions) {
      const matrix = this.functionToMatrix(func);
      resultMatrix = this.multiplyMatrices(resultMatrix, matrix);
    }

    return resultMatrix;
  }

  /**
   * Parse individual transform functions from CSS string
   */
  private static parseTransformFunctions(transformString: string): TransformFunction[] {
    const functions: TransformFunction[] = [];
    const regex = /(\w+)\(([^)]+)\)/g;
    let match;

    while ((match = regex.exec(transformString)) !== null) {
      const [, funcName, argsString] = match;
      const args = argsString.split(',').map(arg => {
        const trimmed = arg.trim();
        if (trimmed.endsWith('deg')) {
          return parseFloat(trimmed) * Math.PI / 180; // Convert to radians
        } else if (trimmed.endsWith('px') || trimmed.endsWith('%')) {
          return parseFloat(trimmed);
        } else {
          return parseFloat(trimmed);
        }
      });

      functions.push({
        name: funcName as TransformFunctionName,
        args
      });
    }

    return functions;
  }

  /**
   * Convert transform function to matrix
   */
  private static functionToMatrix(func: TransformFunction): Transform2D {
    const { name, args } = func;

    switch (name) {
      case 'matrix3d': {
        // Gracefully degrade 3D transforms to 2D by sampling the top-left 2x2 and translation
        // matrix3d(a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3, a4, b4, c4)
        // We treat a4, b4 as x/y translation and ignore z to avoid warnings.
        const [
          a1 = 1, b1 = 0, _c1 = 0, _d1 = 0,
          a2 = 0, b2 = 1, _c2 = 0, _d2 = 0,
          _a3 = 0, _b3 = 0, _c3 = 1, _d3 = 0,
          tx = 0, ty = 0
        ] = args;
        return { a: a1, b: b1, c: a2, d: b2, e: tx, f: ty };
      }
      
      case 'translate':
        return this.createTranslateMatrix(args[0] || 0, args[1] || 0);
      
      case 'translateX':
        return this.createTranslateMatrix(args[0] || 0, 0);
      
      case 'translateY':
        return this.createTranslateMatrix(0, args[0] || 0);
      
      case 'scale':
        return this.createScaleMatrix(args[0] || 1, (args[1] ?? args[0]) || 1);
      
      case 'scaleX':
        return this.createScaleMatrix(args[0] || 1, 1);
      
      case 'scaleY':
        return this.createScaleMatrix(1, args[0] || 1);
      
      case 'rotate':
        return this.createRotateMatrix(args[0] || 0);
      
      case 'skew':
        return this.createSkewMatrix(args[0] || 0, args[1] || 0);
      
      case 'skewX':
        return this.createSkewMatrix(args[0] || 0, 0);
      
      case 'skewY':
        return this.createSkewMatrix(0, args[0] || 0);
      
      case 'matrix':
        return {
          a: args[0] || 1, b: args[1] || 0, c: args[2] || 0,
          d: args[3] || 1, e: args[4] || 0, f: args[5] || 0
        };
      
      default:
        console.warn(`Unknown transform function: ${name}`);
        return this.createIdentityMatrix();
    }
  }

  /**
   * Create identity matrix
   */
  static createIdentityMatrix(): Transform2D {
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }

  /**
   * Create translation matrix
   */
  static createTranslateMatrix(x: number, y: number): Transform2D {
    return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
  }

  /**
   * Create scale matrix
   */
  static createScaleMatrix(x: number, y: number): Transform2D {
    return { a: x, b: 0, c: 0, d: y, e: 0, f: 0 };
  }

  /**
   * Create rotation matrix
   */
  static createRotateMatrix(angle: number): Transform2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
  }

  /**
   * Create skew matrix
   */
  static createSkewMatrix(x: number, y: number): Transform2D {
    return { a: 1, b: Math.tan(y), c: Math.tan(x), d: 1, e: 0, f: 0 };
  }

  /**
   * Multiply two transformation matrices
   */
  static multiplyMatrices(m1: Transform2D, m2: Transform2D): Transform2D {
    return {
      a: m1.a * m2.a + m1.b * m2.c,
      b: m1.a * m2.b + m1.b * m2.d,
      c: m1.c * m2.a + m1.d * m2.c,
      d: m1.c * m2.b + m1.d * m2.d,
      e: m1.e * m2.a + m1.f * m2.c + m2.e,
      f: m1.e * m2.b + m1.f * m2.d + m2.f
    };
  }

  /**
   * Apply transform matrix to point
   */
  static transformPoint(point: { x: number; y: number }, matrix: Transform2D): { x: number; y: number } {
    return {
      x: matrix.a * point.x + matrix.c * point.y + matrix.e,
      y: matrix.b * point.x + matrix.d * point.y + matrix.f
    };
  }

  /**
   * Invert transformation matrix
   */
  static invertMatrix(matrix: Transform2D): Transform2D | null {
    const { a, b, c, d, e, f } = matrix;
    const determinant = a * d - b * c;

    if (Math.abs(determinant) < this.EPSILON) {
      return null; // Matrix is not invertible
    }

    const invDet = 1 / determinant;
    return {
      a: d * invDet,
      b: -b * invDet,
      c: -c * invDet,
      d: a * invDet,
      e: (c * f - d * e) * invDet,
      f: (b * e - a * f) * invDet
    };
  }

  /**
   * Decompose matrix into transform components
   */
  static decompose(matrix: Transform2D): TransformComponents {
    const { a, b, c, d, e, f } = matrix;

    // Translation is straightforward
    const translate = { x: e, y: f };

    // Extract scale and rotation
    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);

    // Determine if there's a reflection
    const determinant = a * d - b * c;
    const scale = {
      x: determinant < 0 ? -scaleX : scaleX,
      y: scaleY
    };

    // Calculate rotation angle
    const rotation = Math.atan2(b, a);

    // Calculate skew
    const skewX = Math.atan2(a * c + b * d, scaleX * scaleX);
    const skewY = 0; // CSS 2D transforms don't support skewY in decomposition

    return {
      translate,
      scale,
      rotate: { angle: rotation },
      skew: { x: skewX, y: skewY }
    };
  }

  /**
   * Validate transformation matrix
   */
  static validateMatrix(matrix: Transform2D): TransformValidation {
    const { a, b, c, d } = matrix;
    const determinant = a * d - b * c;
    const warnings: string[] = [];

    // Check for degeneracy
    const isDegenerate = Math.abs(determinant) < this.EPSILON;
    if (isDegenerate) {
      warnings.push('Degenerate matrix (determinant ≈ 0)');
    }

    // Calculate condition number for numerical stability
    const norm = Math.sqrt(a * a + b * b + c * c + d * d);
    const invMatrix = this.invertMatrix(matrix);
    let conditionNumber = 1;
    
    if (invMatrix) {
      const invNorm = Math.sqrt(
        invMatrix.a * invMatrix.a + invMatrix.b * invMatrix.b +
        invMatrix.c * invMatrix.c + invMatrix.d * invMatrix.d
      );
      conditionNumber = norm * invNorm;
    }

    if (conditionNumber > this.MAX_CONDITION_NUMBER) {
      warnings.push('High condition number (numerically unstable)');
    }

    // Check for extreme scaling
    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);
    
    if (scaleX > 100 || scaleY > 100) {
      warnings.push('Extreme scaling detected');
    }
    
    if (scaleX < 0.01 || scaleY < 0.01) {
      warnings.push('Very small scaling detected');
    }

    // Check for invalid values
    const isValid = [a, b, c, d].every(val => Number.isFinite(val));
    if (!isValid) {
      warnings.push('Invalid matrix values (NaN or Infinity)');
    }

    return {
      isValid,
      isDegenerate,
      determinant,
      conditionNumber,
      warnings
    };
  }

  /**
   * Apply transform-origin to transformation
   */
  static applyTransformOrigin(
    matrix: Transform2D,
    origin: { x: number; y: number },
    elementSize: { width: number; height: number }
  ): Transform2D {
    // Convert origin from relative (0-1) or pixel values to actual coordinates
    const originX = origin.x * elementSize.width;
    const originY = origin.y * elementSize.height;

    // Create transform sequence: translate to origin, apply transform, translate back
    const toOrigin = this.createTranslateMatrix(-originX, -originY);
    const fromOrigin = this.createTranslateMatrix(originX, originY);

    return this.multiplyMatrices(fromOrigin, this.multiplyMatrices(matrix, toOrigin));
  }

  /**
   * Convert to Figma-compatible transform (limited to what Figma supports)
   */
  static toFigmaTransform(matrix: Transform2D): {
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    translateX?: number;
    translateY?: number;
    supported: boolean;
  } {
    const components = this.decompose(matrix);
    
    // Check if transform is Figma-compatible
    const hasSkew = Math.abs(components.skew.x) > 0.01 || Math.abs(components.skew.y) > 0.01;
    const supported = !hasSkew; // Figma doesn't support skew

    return {
      rotation: components.rotate.angle,
      scaleX: components.scale.x,
      scaleY: components.scale.y,
      translateX: components.translate.x,
      translateY: components.translate.y,
      supported
    };
  }
}

interface TransformFunction {
  name: TransformFunctionName;
  args: number[];
}

type TransformFunctionName = 
  | 'translate' | 'translateX' | 'translateY' | 'translate3d'
  | 'scale' | 'scaleX' | 'scaleY' | 'scale3d' 
  | 'rotate' | 'rotateX' | 'rotateY' | 'rotateZ' | 'rotate3d'
  | 'skew' | 'skewX' | 'skewY'
  | 'matrix' | 'matrix3d'
  | 'perspective';

export { TransformFunction, TransformFunctionName };
