// shared/schema.ts - Single source of truth for all types

export type CaptureEngine = "puppeteer" | "extension";
export type CaptureSource = "extension" | "cli" | "api";

export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export interface CaptureOptions {
  url: string;
  viewport: Viewport;
  userAgent?: string;
  captureStates?: string[];
}

export interface JobStatus {
  state: "queued" | "processing" | "ready" | "failed";
  reason?: string | null;
}

export interface JobRecord {
  id: string;
  url: string;
  source: CaptureSource;
  viewport: Viewport;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
}

// Design Tokens
export interface ColorToken {
  id: string;
  name: string;
  value: string; // hex or rgba
}

export interface TextStyleToken {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
}

export interface SpacingToken {
  id: string;
  name: string;
  value: number;
}

export interface Tokens {
  colors: ColorToken[];
  textStyles: TextStyleToken[];
  spacing: SpacingToken[];
}

// Layout & Nodes
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutHints {
  isLayoutContainer: boolean;
  axis: "horizontal" | "vertical" | null;
  gap: number | null;
  padding: {
    top: number | null;
    right: number | null;
    bottom: number | null;
    left: number | null;
  };
  alignment: {
    primary: "start" | "center" | "end" | "space-between" | null;
    cross: "start" | "center" | "end" | "stretch" | null;
  };
  inferredPattern: "row" | "column" | "grid" | null;
  componentKey: string | null;
}

export interface AnalyzedNode {
  id: string;
  tagName: string;
  rect: Rect;
  children: AnalyzedNode[];
  layout: LayoutHints;
  // Extended properties
  text?: string;
  styles?: Record<string, string>;
  imageHash?: string;
  // Image-specific properties for pixel-perfect rendering
  intrinsicSize?: { width: number; height: number };
  aspectRatio?: number;
  imageFit?: string; // CSS object-fit value ('fill', 'contain', 'cover', 'none', 'scale-down')
  fills?: any[];
  strokes?: any[];
  // CSS visual effects captured from computed styles (Phase 4)
  cssFilter?: string;      // e.g. "blur(6px) drop-shadow(0px 4px 12px rgba(0,0,0,.3))"
  mixBlendMode?: string;   // e.g. "multiply", "screen", "overlay"
  isolation?: string;      // "auto" | "isolate" (for stacking context correctness)
  // Strict fidelity fallback (for perfect clone mode)
  rasterize?: {
    reason: "FILTER" | "BLEND_MODE" | "UNSUPPORTED_VISUAL";
    dataUrl?: string; // "data:image/png;base64,..." (optional, for element-level raster)
  };
  // SVG-specific fields
  svgContent?: string; // Serialized SVG markup from XMLSerializer
  svgBaseUrl?: string; // Base URL for resolving relative references in SVG
  vectorData?: {
    svgPath: string;
    svgCode: string;
    fills: any[];
  };
  // BOX-SIZING SUPPORT: Dimension calculation metadata for pixel-perfect rendering
  _boxSizingData?: {
    boxSizing: "content-box" | "border-box";
    visualDimensions: { width: number; height: number };
    contentDimensions: { width: number; height: number };
    borders: { top: number; right: number; bottom: number; left: number };
    paddings: { top: number; right: number; bottom: number; left: number };
  };
  // PIXEL-PERFECT GEOMETRY: Absolute transform matrix and local dimensions
  // All values in CSS pixels, single source of truth for positioning
  absoluteTransform?: {
    // 2x3 affine transformation matrix [a, b, c, d, tx, ty]
    // Represents: [scaleX, skewY, skewX, scaleY, translateX, translateY]
    matrix: [number, number, number, number, number, number];
    // Original transform-origin in local coordinate space (0-1 normalized)
    origin: { x: number; y: number };
  };
  // Local size before any transforms (CSS pixels)
  localSize?: { width: number; height: number };
  // Capture metadata for validation
  captureMetadata?: {
    devicePixelRatio: number;
    visualViewportScale: number;
    pageZoom: number;
  };
}

// Main Schema
export interface WebToFigmaSchema {
  version: "v2";
  url: string;
  viewport: Viewport;
  root: AnalyzedNode;
  tokens: Tokens;
  assets?: {
    images: Record<
      string,
      { data: string; width: number; height: number; contentType: string }
    >;
    svgs: Record<
      string,
      { id: string; svgCode: string; width: number; height: number; url?: string; contentType?: string }
    >;
    fonts: string[];
  };
  meta: {
    capturedAt: string;
    captureEngine: CaptureEngine;
    captureSource: CaptureSource;
    diagnostics?: {
      nodeCount: number;
      frameCount: number;
      componentCount: number;
      autoLayoutFrameCount: number;
    };
  };
}

// API Types
export interface CaptureRequestBody {
  url: string;
  viewport?: Viewport;
  source?: CaptureSource;
}

export interface CaptureResponseBody {
  jobId: string;
}

export interface JobWithSchema extends JobRecord {
  schema?: WebToFigmaSchema;
}
