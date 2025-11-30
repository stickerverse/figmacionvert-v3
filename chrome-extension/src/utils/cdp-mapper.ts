/**
 * Utilities for mapping CDP computed styles to Figma schema properties
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(colorString: string): RGBA | null {
  if (
    !colorString ||
    colorString === "transparent" ||
    colorString === "rgba(0, 0, 0, 0)"
  ) {
    return null;
  }

  // Handle rgb(r, g, b)
  const rgbMatch = colorString.match(
    /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10) / 255,
      g: parseInt(rgbMatch[2], 10) / 255,
      b: parseInt(rgbMatch[3], 10) / 255,
      a: 1,
    };
  }

  // Handle rgba(r, g, b, a)
  const rgbaMatch = colorString.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/
  );
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10) / 255,
      g: parseInt(rgbaMatch[2], 10) / 255,
      b: parseInt(rgbaMatch[3], 10) / 255,
      a: parseFloat(rgbaMatch[4]),
    };
  }

  // Handle hex #RRGGBB
  const hexMatch = colorString.match(
    /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
  );
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16) / 255,
      g: parseInt(hexMatch[2], 16) / 255,
      b: parseInt(hexMatch[3], 16) / 255,
      a: 1,
    };
  }

  return null;
}

export function parsePixelValue(value: string): number {
  if (!value) return 0;
  return parseFloat(value) || 0;
}

export function mapFontWeight(weight: string): number {
  const w = parseInt(weight, 10);
  if (isNaN(w)) {
    if (weight === "bold") return 700;
    if (weight === "normal") return 400;
    return 400;
  }
  return w;
}

export function mapTextAlign(
  align: string
): "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED" {
  switch (align) {
    case "center":
      return "CENTER";
    case "right":
      return "RIGHT";
    case "justify":
      return "JUSTIFIED";
    default:
      return "LEFT";
  }
}

export function mapTextDecoration(
  decoration: string
): "NONE" | "UNDERLINE" | "STRIKETHROUGH" {
  if (decoration.includes("underline")) return "UNDERLINE";
  if (decoration.includes("line-through")) return "STRIKETHROUGH";
  return "NONE";
}

export function mapTextTransform(
  transform: string
): "ORIGINAL" | "UPPER" | "LOWER" | "TITLE" {
  switch (transform) {
    case "uppercase":
      return "UPPER";
    case "lowercase":
      return "LOWER";
    case "capitalize":
      return "TITLE";
    default:
      return "ORIGINAL";
  }
}

export function mapVerticalAlign(align: string): "TOP" | "CENTER" | "BOTTOM" {
  switch (align) {
    case "middle":
      return "CENTER";
    case "bottom":
    case "text-bottom":
    case "sub":
      return "BOTTOM";
    case "top":
    case "text-top":
    case "super":
      return "TOP";
    default:
      return "TOP";
  }
}
