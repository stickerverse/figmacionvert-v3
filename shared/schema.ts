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

// ============================================================================
// DIAGNOSTIC EXPORT TYPES (For Pixel-Perfect Fidelity Debugging)
// ============================================================================

export type PipelinePhase =
  | "CREATED"
  | "PARENTED"
  | "RESIZED"
  | "TRANSFORM_APPLIED"
  | "FILTERS_APPLIED"
  | "FILLS_APPLIED"
  | "STROKES_APPLIED"
  | "EFFECTS_APPLIED"
  | "CHILDREN_PROCESSED"
  | "COMPLETE";

export type FailureType =
  | "EARLY_RETURN"
  | "WHITE_BLANK_FRAME"
  | "DIMENSION_MISMATCH"
  | "TRANSFORM_FAILED"
  | "RASTERIZATION_FAILED"
  | "MISSING_FILLS"
  | "MISSING_CHILDREN"
  | "UNKNOWN";

export type RasterizationReason =
  | "FILTER"
  | "BLEND_MODE"
  | "UNSUPPORTED_VISUAL"
  | "COMPLEX_TRANSFORM"
  | "USER_OVERRIDE";

export type CaptureMethod =
  | "NATIVE_TAB_CAPTURE"
  | "FOREIGN_OBJECT_SVG"
  | "FAILED";

export interface RasterizationAttempt {
  method: CaptureMethod;
  success: boolean;
  timestamp: number;
  errorMessage?: string;
  captureSize?: { width: number; height: number };
  validation?: {
    passed: boolean;
    issues: string[];
  };
}

export interface RasterizationAudit {
  nodeId: string;
  reason: RasterizationReason;
  cssFeatures: string[]; // Specific CSS properties that triggered rasterization
  attempts: RasterizationAttempt[];
  finalMethod: CaptureMethod | null;
  fallbackChain: CaptureMethod[];
}

export interface NodePipelineStatus {
  schemaNodeId: string;
  figmaNodeId: string | null;
  completedPhases: PipelinePhase[];
  failedAt?: PipelinePhase;
  earlyReturnDetected: boolean;
  completionTimestamp?: number;
  errorMessages: string[];
}

export interface SchemaMappingVerification {
  schemaNodeId: string;
  figmaNodeId: string | null;
  schemaType: string; // tagName from AnalyzedNode
  figmaType: string | null; // "FRAME", "RECTANGLE", "TEXT", etc.
  expectedDimensions: { width: number; height: number };
  actualDimensions?: { width: number; height: number };
  transformApplied: boolean;
  fillsCount: { expected: number; actual: number };
  strokesCount: { expected: number; actual: number };
  effectsCount: { expected: number; actual: number };
  childrenCount: { expected: number; actual: number };
  dimensionMismatch: boolean;
  countMismatches: string[]; // ["fills", "children", etc.]
}

export interface LayoutSolverDecision {
  nodeId: string;
  cssLayoutMode: string; // "flex", "grid", "block", "inline", etc.
  cssFlexDirection?: string; // "row", "column", etc.
  inferredLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE";
  autoLayoutApplied: boolean;
  autoLayoutProperties?: {
    layoutMode: "HORIZONTAL" | "VERTICAL";
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    itemSpacing?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
  fallbackReason?: string; // Why it fell back to absolute positioning
}

export interface VisualDiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelDiffResult {
  nodeId: string;
  pixelDiffPercentage: number;
  diffRegions: VisualDiffRegion[];
  diffType: "color" | "position" | "size" | "missing" | "multiple";
  severity: "critical" | "major" | "minor";
  expectedHash?: string;
  actualHash?: string;
}

export interface NodeDiagnostic {
  nodeId: string;
  pipelineStatus: NodePipelineStatus;
  mappingVerification?: SchemaMappingVerification;
  rasterizationAudit?: RasterizationAudit;
  layoutDecision?: LayoutSolverDecision;
  visualDiff?: PixelDiffResult;
  warnings: string[];
  errors: string[];
}

export interface ImportDiagnosticSummary {
  totalNodes: number;
  successfulNodes: number;
  failedNodes: string[]; // Node IDs
  whiteBlankFrames: string[]; // Node IDs with no fills
  rasterizedNodes: number;
  autoLayoutNodes: number;
  transformedNodes: number;
  earlyReturns: string[]; // Node IDs with detected early returns
  criticalFailures: number; // Count of critical severity issues
}

export interface ImportDiagnosticExport {
  importId: string;
  timestamp: string; // ISO 8601
  schemaVersion: string;
  sourceUrl: string;
  summary: ImportDiagnosticSummary;
  nodeDetails: NodeDiagnostic[];
  performanceMetrics?: {
    totalImportDurationMs: number;
    averageNodeBuildTimeMs: number;
    rasterizationTimeMs: number;
    layoutSolverTimeMs: number;
  };
  visualDiffs?: PixelDiffResult[]; // Optional: from pixel-diff validation
  systemInfo?: {
    figmaVersion: string;
    pluginVersion: string;
    platform: string;
  };
}
