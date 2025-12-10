// shared/schema.ts - Single source of truth for all types

export type CaptureEngine = "puppeteer";
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
  fills?: any[];
  strokes?: any[];
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
