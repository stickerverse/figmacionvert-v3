/**
 * CSS Transform Parser and Applicator
 *
 * Parses CSS transform strings and applies them to Figma nodes.
 * Handles: rotate, scale, translate, skew, matrix
 */

export interface ParsedTransform {
  rotate?: number; // degrees
  scaleX?: number;
  scaleY?: number;
  translateX?: number; // pixels
  translateY?: number; // pixels
  skewX?: number; // degrees
  skewY?: number; // degrees
  matrix?: [number, number, number, number, number, number]; // CSS matrix(a, b, c, d, tx, ty)
  transformOrigin?: { x: number; y: number }; // 0-1 relative to element
}

/**
 * Parse CSS transform string into structured format
 */
export function parseTransform(
  transformString: string
): ParsedTransform | null {
  if (
    !transformString ||
    transformString === "none" ||
    transformString.trim() === ""
  ) {
    return null;
  }

  const result: ParsedTransform = {};
  const trimmed = transformString.trim();

  // Parse transform-origin if provided separately
  // (This will be passed separately, but we handle it here for completeness)

  // Match individual transform functions
  // Examples:
  // - rotate(45deg)
  // - scale(2) or scale(2, 3)
  // - translate(10px, 20px)
  // - skew(10deg, 20deg)
  // - matrix(1, 0, 0, 1, 0, 0)
  const functionRegex = /(\w+)\(([^)]+)\)/g;
  let match;

  while ((match = functionRegex.exec(trimmed)) !== null) {
    const funcName = match[1].toLowerCase();
    const params = match[2].split(",").map((p) => p.trim());

    switch (funcName) {
      case "rotate":
        if (params[0]) {
          result.rotate = parseAngle(params[0]);
        }
        break;

      case "scale":
        if (params[0]) {
          const scaleX = parseFloat(params[0]);
          const scaleY = params[1] ? parseFloat(params[1]) : scaleX;
          result.scaleX = scaleX;
          result.scaleY = scaleY;
        }
        break;

      case "scalex":
        if (params[0]) {
          result.scaleX = parseFloat(params[0]);
        }
        break;

      case "scaley":
        if (params[0]) {
          result.scaleY = parseFloat(params[0]);
        }
        break;

      case "translate":
        if (params[0]) {
          result.translateX = parseLength(params[0]);
        }
        if (params[1]) {
          result.translateY = parseLength(params[1]);
        }
        break;

      case "translatex":
        if (params[0]) {
          result.translateX = parseLength(params[0]);
        }
        break;

      case "translatey":
        if (params[0]) {
          result.translateY = parseLength(params[0]);
        }
        break;

      case "skew":
        if (params[0]) {
          result.skewX = parseAngle(params[0]);
        }
        if (params[1]) {
          result.skewY = parseAngle(params[1]);
        }
        break;

      case "skewx":
        if (params[0]) {
          result.skewX = parseAngle(params[0]);
        }
        break;

      case "skewy":
        if (params[0]) {
          result.skewY = parseAngle(params[0]);
        }
        break;

      case "matrix":
        if (params.length >= 6) {
          result.matrix = [
            parseFloat(params[0]),
            parseFloat(params[1]),
            parseFloat(params[2]),
            parseFloat(params[3]),
            parseFloat(params[4]),
            parseFloat(params[5]),
          ] as [number, number, number, number, number, number];
        }
        break;

      case "matrix3d":
        // 3D transforms - extract 2D equivalent if possible
        if (params.length >= 16) {
          // matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1)
          // Extract 2D matrix: [a, b, c, d, tx, ty]
          result.matrix = [
            parseFloat(params[0]),
            parseFloat(params[1]),
            parseFloat(params[4]),
            parseFloat(params[5]),
            parseFloat(params[12]),
            parseFloat(params[13]),
          ] as [number, number, number, number, number, number];
        }
        break;
    }
  }

  // If no transforms found, return null
  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

/**
 * Parse angle value (deg, rad, grad, turn)
 */
function parseAngle(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const num = parseFloat(trimmed);

  if (trimmed.endsWith("deg")) {
    return num;
  } else if (trimmed.endsWith("rad")) {
    return (num * 180) / Math.PI;
  } else if (trimmed.endsWith("grad")) {
    return (num * 180) / 200;
  } else if (trimmed.endsWith("turn")) {
    return num * 360;
  } else {
    // Assume degrees if no unit
    return num;
  }
}

/**
 * Parse length value (px, em, rem, %, etc.)
 * Returns pixels (assumes 1em = 16px, 1rem = 16px for simplicity)
 */
function parseLength(value: string): number {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.endsWith("px")) {
    return parseFloat(trimmed);
  } else if (trimmed.endsWith("em")) {
    return parseFloat(trimmed) * 16; // Approximate
  } else if (trimmed.endsWith("rem")) {
    return parseFloat(trimmed) * 16; // Approximate
  } else if (trimmed.endsWith("%")) {
    // Percentage - would need container size, return 0 for now
    // This should be handled by the caller with context
    return 0;
  } else {
    // Assume pixels if no unit
    return parseFloat(trimmed);
  }
}

/**
 * Parse transform-origin string
 * Returns {x, y} as 0-1 relative values
 */
export function parseTransformOrigin(
  originString: string,
  elementWidth: number,
  elementHeight: number
): { x: number; y: number } {
  if (!originString || originString === "50% 50%") {
    return { x: 0.5, y: 0.5 }; // Default center
  }

  const parts = originString.trim().split(/\s+/);
  const xStr = parts[0] || "50%";
  const yStr = parts[1] || parts[0] || "50%";

  const parseOriginValue = (value: string, size: number): number => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.endsWith("%")) {
      return parseFloat(trimmed) / 100;
    } else if (trimmed === "left" || trimmed === "top") {
      return 0;
    } else if (trimmed === "right" || trimmed === "bottom") {
      return 1;
    } else if (trimmed === "center") {
      return 0.5;
    } else {
      // Assume pixels
      const px = parseFloat(trimmed);
      return px / size;
    }
  };

  return {
    x: parseOriginValue(xStr, elementWidth),
    y: parseOriginValue(yStr, elementHeight),
  };
}

/**
 * Decompose matrix into rotate, scale, translate, skew
 * This is useful when we have a matrix but need individual components
 */
export function decomposeMatrix(
  matrix: [number, number, number, number, number, number]
): {
  rotate: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  translateX: number;
  translateY: number;
} {
  const [a, b, c, d, tx, ty] = matrix;

  // Calculate scale
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);

  // Calculate rotation (in radians)
  const rotation = Math.atan2(b, a);

  // Calculate skew
  const skewX = Math.atan2(a * c + b * d, scaleX * scaleX);
  const skewY = 0; // Simplified

  return {
    rotate: (rotation * 180) / Math.PI,
    scaleX,
    scaleY,
    skewX: (skewX * 180) / Math.PI,
    skewY,
    translateX: tx,
    translateY: ty,
  };
}

