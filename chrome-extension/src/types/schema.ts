export interface WebToFigmaSchema {
  version: string;
  metadata: PageMetadata;
  tree: ElementNode;
  assets: AssetRegistry;
  styles: StyleRegistry;
  components?: ComponentRegistry;
  variants?: VariantsRegistry;
  designTokens?: DesignTokenRegistry; // Legacy design tokens for backward compatibility
  designTokensRegistry?: DesignTokensRegistry; // Enhanced design tokens with variables
  cssVariables?: Record<string, string>;
  screenshot?: string;
  validation?: ValidationReport;
  assetOptimization?: AssetOptimizationReport;
  coordinateMetrics?: CoordinateMetrics;
  comprehensiveStates?: ComprehensiveStatesRegistry; // New: Comprehensive interactive state capture
}

export interface AssetOptimizationReport {
  applied: boolean;
  originalPayloadSizeMB?: number;
  optimizedPayloadSizeMB?: number;
  compressionRatio?: number;
  assetsProcessed?: number;
  assetsRemoved?: number;
  optimizationRounds?: number;
  preservedAssets?: string[];
  aggressivelyOptimized?: string[];
  removedAssets?: string[];
  error?: string;
  fallbackToEmergencyCompression?: boolean;
}

export interface CoordinateMetrics {
  enhancedCoordinateSystem: boolean;
  pixelPerfectAccuracy: number;
  coordinateAccuracy: number;
  transformStability: number;
  totalElements: number;
  coordinateIssues: number;
  precision: string;
}

export interface PageMetadata {
  url: string;
  title: string;
  timestamp: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  fonts: FontDefinition[];
  breakpoint?: 'mobile' | 'tablet' | 'desktop';
  captureOptions?: CaptureOptions;
  extractionSummary?: {
    scrollComplete: boolean;
    tokensExtracted: boolean;
    totalElements: number;
    visibleElements: number;
    enhancedComponentDetection?: boolean;
    componentDetectionMethod?: string;
  };
}

export interface CaptureOptions {
  captureHoverStates: boolean;
  captureFocusStates: boolean;
  detectComponents: boolean;
  extractSVGs: boolean;
  captureDepth: 'shallow' | 'medium' | 'deep';
  viewports: ViewportConfig[];
}

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export interface ElementNode {
  id: string;
  type: 'FRAME' | 'TEXT' | 'RECTANGLE' | 'VECTOR' | 'IMAGE' | 'COMPONENT' | 'INSTANCE';
  name: string;

  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    boxSizing?: 'border-box' | 'content-box';
  };

  absoluteLayout?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };

  viewportLayout?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };

  stackingContext?: {
    zIndex: number;
    isStackingContext: boolean;
    stackingParent?: string;
  };

  hasOverlappingElements?: boolean;

  autoLayout?: {
    layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
    primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
    primaryAxisSizingMode?: 'FIXED' | 'AUTO';
    counterAxisSizingMode?: 'FIXED' | 'AUTO';
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    itemSpacing: number;
    layoutGrow?: number;
    layoutAlign?: 'STRETCH' | 'INHERIT';
  };

  layoutContext?: {
    display?: string;
    position?: string;
    float?: string;
    clear?: string;
    overflow?: string;
    overflowX?: string;
    overflowY?: string;
    transform?: string;
    transformOrigin?: string;
    zIndex?: string;
    // Flexbox properties
    flexDirection?: string;
    flexWrap?: string;
    justifyContent?: string;
    alignItems?: string;
    alignContent?: string;
    gap?: string;
    rowGap?: string;
    columnGap?: string;
    // Grid properties
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
    gridAutoFlow?: string;
    gridAutoColumns?: string;
    gridAutoRows?: string;
    // Child properties
    flex?: string;
    flexGrow?: string;
    flexShrink?: string;
    flexBasis?: string;
    alignSelf?: string;
    justifySelf?: string;
    gridColumn?: string;
    gridRow?: string;
    gridArea?: string;
    // Box model
    width?: string;
    height?: string;
    minWidth?: string;
    minHeight?: string;
    maxWidth?: string;
    maxHeight?: string;
    margin?: string;
    padding?: string;
  };

  gridLayout?: GridLayoutData;

  gridChild?: GridChildData;

  fills?: Fill[];
  strokes?: Stroke[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  effects?: Effect[];
  cornerRadius?: CornerRadius | number;
  opacity?: number;
  blendMode?: BlendMode;
  mixBlendMode?: BlendMode;

  characters?: string;
  textStyle?: TextStyle;

  vectorData?: {
    svgPath: string;
    svgCode: string;
    fills: Fill[];
  };

  imageHash?: string;

  isComponent?: boolean;
  componentId?: string;
  componentKey?: string;
  componentSimilarity?: number;
  variants?: VariantData[];

  pseudoElements?: {
    before?: ElementNode;
    after?: ElementNode;
  };

  htmlTag: string;
  cssClasses: string[];
  cssId?: string;
  dataAttributes?: Record<string, string>;
  ariaLabel?: string;
  cssCustomProperties?: Record<string, string>;

  children: ElementNode[];

  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };

  interactions?: InteractionData[];

  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  positionValues?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  display?: string;
  visibility?: 'visible' | 'hidden' | 'collapse';
  pointerEvents?: string;
  overflow?: {
    horizontal: 'visible' | 'hidden' | 'scroll' | 'auto' | 'clip';
    vertical: 'visible' | 'hidden' | 'scroll' | 'auto' | 'clip';
  };
  zIndex?: number;
  order?: number;
  isStackingContext?: boolean;

  transform?: TransformData;
  transformOrigin?: { x: number; y: number; z?: number };
  perspective?: number;

  filters?: FilterData[];
  backdropFilters?: FilterData[];
  clipPath?: ClipPathData;
  mask?: MaskData;

  backgrounds?: BackgroundLayer[];
  outline?: OutlineData;

  scrollData?: ScrollData;
  contentHash?: string;
  componentSignature?: string;

  inlineTextSegments?: InlineTextSegment[];
}

export interface InteractionData {
  type: 'HOVER' | 'FOCUS' | 'ACTIVE' | 'CLICK';
  targetId?: string;
  description?: string;
}

export interface InlineTextSegment {
  id: string;
  characters: string;
  textStyle: TextStyle;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Fill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: RGBA;
  gradientStops?: GradientStop[];
  gradientTransform?: Transform2D;
  imageHash?: string;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageTransform?: Transform2D;
  rotation?: number;
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  objectPosition?: string;
}

export interface GradientStop {
  position: number;
  color: RGBA;
}

export interface Stroke {
  type: 'SOLID' | 'GRADIENT_LINEAR';
  color?: RGBA;
  opacity?: number;
  thickness: number;
  strokeAlign: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  dashPattern?: number[];
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: RGBA;
  offset?: { x: number; y: number };
  spread?: number;
  blendMode?: BlendMode;
}

export interface TextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  letterSpacing: { value: number; unit: 'PIXELS' | 'PERCENT' };
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  lineHeightPx?: number;
  paragraphSpacing?: number;
  paragraphIndent?: number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textTransform?: string;
  whiteSpace?: string;
  wordWrap?: string;
  textOverflow?: string;
  listStyleType?: string;
  listStylePosition?: string;
  fills: Fill[];
  effects?: Effect[];
  fontVariant?: string;
  fontStretch?: string;
  textRendering?: string;
  wordSpacing?: number;
  textIndent?: number;
}

export interface CornerRadius {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface AssetRegistry {
  images: Record<string, ImageAsset>;
  svgs: Record<string, SVGAsset>;
  fonts?: Record<string, FontDefinition>;
  gradients?: Record<string, GradientAsset>;
}

export interface ImageAsset {
  hash: string;
  url: string;
  base64?: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface SVGAsset {
  hash: string;
  svgCode: string;
  width: number;
  height: number;
}

export interface GradientAsset {
  hash: string;
  type: 'linear' | 'radial';
  stops: GradientStop[];
  transform: Transform2D;
}

export interface StyleRegistry {
  colors: Record<string, ColorStyle>;
  textStyles: Record<string, TextStyle>;
  effects: Record<string, Effect[]>;
}

export interface ColorStyle {
  id: string;
  name: string;
  color: RGBA;
  usageCount: number;
}

export interface ComponentRegistry {
  definitions: Record<string, ComponentDefinition>;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  description?: string;
  variantId?: string;
  properties?: Record<string, any>;
}

export interface VariantsRegistry {
  variants: Record<string, VariantSet>;
  statistics: {
    totalVariants: number;
    elementsWithVariants: number;
    statesPerElement: { [state: string]: number };
  };
}

export interface VariantSet {
  elementId: string;
  componentId?: string;
  variants: VariantData[];
  metadata: {
    tagName: string;
    selector: string;
    interactionTypes: string[];
  };
}

export interface VariantData {
  state: 'default' | 'hover' | 'focus' | 'active' | 'disabled';
  properties: Partial<ElementNode>;
}

export type BlendMode =
  | 'NORMAL'
  | 'MULTIPLY'
  | 'SCREEN'
  | 'OVERLAY'
  | 'DARKEN'
  | 'LIGHTEN'
  | 'COLOR_DODGE'
  | 'COLOR_BURN'
  | 'HARD_LIGHT'
  | 'SOFT_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

export type Transform2D = [[number, number, number], [number, number, number]];

export interface FontDefinition {
  family: string;
  weights: number[];
  source: 'google' | 'system' | 'custom';
  url?: string;
}

export interface DesignTokenRegistry {
  colors: Record<string, any>;
  typography: Record<string, any>;
  spacing: Record<string, any>;
  shadows: Record<string, any>;
  borderRadius: Record<string, any>;
}

// Enhanced design token interfaces for CSS Variables integration
export interface DesignTokensRegistry {
  variables: Record<string, DesignToken>;
  collections: Record<string, TokenCollection>;
  aliases: Record<string, TokenAlias>;
  usage: Record<string, TokenUsage>;
}

export interface DesignToken {
  id: string;
  name: string;
  originalName: string; // Original CSS variable name (--color-primary)
  type: TokenType;
  value: TokenValue;
  scopes: TokenScope[];
  collection: string;
  description?: string;
  resolvedValue?: any; // Computed/resolved value
  references?: string[]; // Other tokens this references
  referencedBy?: string[]; // Tokens that reference this one
}

export interface TokenCollection {
  id: string;
  name: string;
  type: TokenType;
  description?: string;
  variables: string[];
}

export interface TokenAlias {
  from: string; // Token that aliases another
  to: string; // Target token being aliased
  context?: string; // Context where alias applies
}

export interface TokenUsage {
  count: number;
  elements: string[]; // Element IDs that use this token
  properties: string[]; // CSS properties using this token
  computed: boolean; // Whether this was computed or explicitly declared
}

export type TokenType = 
  | 'COLOR' 
  | 'FLOAT' 
  | 'STRING'
  | 'BOOLEAN';

export type TokenScope = 
  | 'ALL_SCOPES'
  | 'TEXT_CONTENT'
  | 'CORNER_RADIUS'
  | 'WIDTH_HEIGHT'
  | 'GAP'
  | 'STROKE_COLOR'
  | 'EFFECT_COLOR'
  | 'ALL_FILLS'
  | 'FRAME_FILL'
  | 'SHAPE_FILL'
  | 'TEXT_FILL';

export interface TokenValue {
  type: 'SOLID' | 'ALIAS' | 'VARIABLE_ALIAS' | 'EXPRESSION';
  value: any;
  resolvedType?: 'COLOR' | 'NUMBER' | 'STRING' | 'BOOLEAN';
  originalValue?: string; // Original CSS value before parsing
}

export interface TransformData {
  matrix: number[];
  translate?: { x: number; y: number; z?: number };
  scale?: { x: number; y: number; z?: number };
  rotate?: { x: number; y: number; z: number; angle: number };
  skew?: { x: number; y: number };
  originalFunctions?: TransformFunction[]; // Store original transform functions
}

export interface TransformFunction {
  type: 'translate' | 'translateX' | 'translateY' | 'translate3d' | 'translateZ' |
        'scale' | 'scaleX' | 'scaleY' | 'scale3d' | 'scaleZ' |
        'rotate' | 'rotateX' | 'rotateY' | 'rotateZ' | 'rotate3d' |
        'skew' | 'skewX' | 'skewY' |
        'matrix' | 'matrix3d' |
        'perspective';
  values: number[];
}

export interface FilterData {
  type:
    | 'blur'
    | 'brightness'
    | 'contrast'
    | 'dropShadow'
    | 'grayscale'
    | 'hueRotate'
    | 'invert'
    | 'opacity'
    | 'saturate'
    | 'sepia';
  value: number;
  unit?: 'px' | '%' | 'deg';
  color?: RGBA;
  offset?: { x: number; y: number };
}

export interface ClipPathData {
  type: 'circle' | 'ellipse' | 'inset' | 'polygon' | 'path' | 'url' | 'none';
  value: string;
}

export interface MaskData {
  type: 'alpha' | 'luminance' | 'url' | 'none';
  value: string;
}

export interface BackgroundLayer {
  type: 'color' | 'gradient' | 'image';
  fill: Fill;
  position?: { x: string; y: string };
  size?: { width: string; height: string };
  repeat?: string;
  clip?: string;
  origin?: string;
  attachment?: string;
}

export interface OutlineData {
  color: RGBA;
  width: number;
  style:
    | 'solid'
    | 'dashed'
    | 'dotted'
    | 'double'
    | 'groove'
    | 'ridge'
    | 'inset'
    | 'outset'
    | 'none';
}

export interface ScrollData {
  scrollWidth: number;
  scrollHeight: number;
  scrollTop: number;
  scrollLeft: number;
  overscrollBehaviorX?: string;
  overscrollBehaviorY?: string;
}

// Validation interfaces
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  type: 'positioning' | 'sizing' | 'layout' | 'structure' | 'transform' | 'coordinate-accuracy';
  nodeId: string;
  nodeName: string;
  message: string;
  suggestion?: string;
  accuracy?: PositionAccuracy;
  delta?: { x: number; y: number };
  confidence?: number;
}

export interface PositionAccuracy {
  isAccurate: boolean;
  deltaX: number;
  deltaY: number;
  confidence: number;
  coordinateSystem: 'viewport' | 'absolute' | 'relative' | 'dual-coordinate';
  validationMethod: 'dual-coordinate' | 'transform-matrix' | 'scroll-adjusted';
}

export interface TransformValidation {
  isValid: boolean;
  isDegenerate: boolean;
  hasUnsupported3D: boolean;
  determinant: number;
  warnings: string[];
}

export interface ValidationThresholds {
  positionTolerance: number; // pixels
  sizeTolerance: number; // pixels
  confidenceThreshold: number; // 0-1
  transformDeterminantThreshold: number;
}

export interface ValidationReport {
  valid: boolean;
  totalNodes: number;
  issuesCount: number;
  issues: ValidationIssue[];
  stats: {
    zeroSizeNodes: number;
    offScreenNodes: number;
    overlappingNodes: number;
    missingLayoutNodes: number;
    negativePositions: number;
    inaccuratePositions: number;
    degenerateTransforms: number;
    unsupported3DTransforms: number;
    layoutStructureIssues: number;
  };
  accuracyMetrics: {
    averagePositionAccuracy: number;
    worstPositionDelta: number;
    averageConfidence: number;
    coordinateSystemsUsed: string[];
  };
  thresholds: ValidationThresholds;
}

// Grid Layout interfaces
export interface GridLayoutData {
  isGrid: boolean;
  templateColumns: string;
  templateRows: string;
  templateAreas?: string[][];
  columnGap: number;
  rowGap: number;
  autoFlow?: string;
  autoColumns?: string;
  autoRows?: string;
  justifyItems?: string;
  alignItems?: string;
  justifyContent?: string;
  alignContent?: string;
  // Track size calculations
  computedColumnSizes: number[];
  computedRowSizes: number[];
  // Conversion metadata
  conversionStrategy: 'nested-auto-layout' | 'absolute-positioning' | 'hybrid';
  figmaAnnotations?: string[];
}

export interface GridChildData {
  columnStart?: string | number;
  columnEnd?: string | number;
  rowStart?: string | number;
  rowEnd?: string | number;
  columnSpan?: number;
  rowSpan?: number;
  gridArea?: string;
  justifySelf?: string;
  alignSelf?: string;
  // Computed positioning
  computedColumn: number;
  computedRow: number;
  computedColumnSpan: number;
  computedRowSpan: number;
}

// Comprehensive Interactive States Registry
export interface ComprehensiveStatesRegistry {
  totalElements: number;
  capturedStates: CapturedElementStates[];
  metadata?: {
    captureTimestamp: number;
    captureTimeElapsed: number;
    discoveryMethod: string[];
    totalStatesFound: number;
  };
}

export interface CapturedElementStates {
  elementId: string;
  baseStateId: string;
  discoveredStatesCount: number;
  variantStatesCount: number;
  hiddenContentCount: number;
  interactionFlowsCount: number;
  states: ElementNode[]; // All states as separate nodes
  hiddenContent: HiddenContentReference[];
  interactionFlows?: InteractionFlowReference[];
}

export interface HiddenContentReference {
  triggerElementId: string;
  revealedContent: ElementNode[];
  visibilityMethod: 'display' | 'visibility' | 'opacity' | 'transform' | 'position';
  containerElementId?: string;
  zIndex?: number;
}

export interface InteractionFlowReference {
  name: string;
  steps: InteractionStepReference[];
  finalStateId: string;
  reversible: boolean;
}

export interface InteractionStepReference {
  actionType: 'click' | 'hover' | 'focus' | 'scroll' | 'touch' | 'keyboard' | 'form-input';
  targetElementId: string;
  expectedChanges: string[];
  actualChanges: ChangeReference[];
  timestamp: number;
}

export interface ChangeReference {
  elementId: string;
  property: string;
  beforeValue: any;
  afterValue: any;
  changeType: 'style' | 'attribute' | 'content' | 'structure';
}
