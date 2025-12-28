/**
 * Hierarchy Inference Types
 *
 * Types for converting DOM-shaped schema into an inferred semantic tree
 * that improves Figma document structure.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedStyleLite {
  display?: string;
  position?: string;
  overflow?: string;
  opacity?: number;
  transform?: string;
  filter?: string;
  backgroundColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  isText?: boolean;
  isImageLike?: boolean;
  isSvg?: boolean;
  isCanvas?: boolean;
  isFlexContainer?: boolean;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  isGridContainer?: boolean;
  rowGap?: string;
  columnGap?: string;
  zIndex?: number;
}

export interface LayoutHints {
  isStack?: boolean;
  isGrid?: boolean;
  stackDirection?: "vertical" | "horizontal";
  gap?: number;
  alignment?: string;
}

export interface RenderNode {
  id: string;
  rect: Rect;
  style: ComputedStyleLite;
  layoutHints?: LayoutHints;
  children: RenderNode[];
  parent?: RenderNode;
  originalData?: any; // Reference to original ElementNode for style/paint data
  name?: string;
  type?: string;
  isOverlay?: boolean;
  isWrapper?: boolean;
  meaningfulScore?: number;
}

export interface InferredNode {
  id: string;
  rect: Rect;
  style: ComputedStyleLite;
  layoutHints?: LayoutHints;
  children: InferredNode[];
  parent?: InferredNode;
  originalData?: any;
  name?: string;
  type?: string;
  inferredType:
    | "section"
    | "container"
    | "stack"
    | "grid"
    | "overlay"
    | "content";
  autoLayout?: {
    layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE";
    primaryAxisAlignItems: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    counterAxisAlignItems: "MIN" | "CENTER" | "MAX" | "STRETCH";
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    itemSpacing: number;
  };
  isSynthetic?: boolean; // True if this frame was created by inference (not in original DOM)
}

export interface InferredNodeTree {
  root: InferredNode;
  metrics: InferenceMetrics;
}

export interface InferenceMetrics {
  nodeCountBefore: number;
  nodeCountAfter: number;
  wrapperEliminationCount: number;
  orphanRate: number; // children under root / total
  autoLayoutCoverage: number; // nodes with auto-layout / total
  maxDepth: number;
  avgDepth: number;
  overlayCount: number;
  syntheticFrameCount: number;
  topWrapperCandidates: Array<{
    id: string;
    name: string;
    score: number;
    reason: string;
  }>;
}

export interface ContainmentScore {
  containTightness: number; // 0-1, how tightly A contains B
  areaRatio: number; // B.area / A.area
  styleBonus: number;
  layoutBonus: number;
  clipBonus: number;
  decorationPenalty: number;
  overlayPenalty: number;
  crossStackingPenalty: number;
  total: number;
}
