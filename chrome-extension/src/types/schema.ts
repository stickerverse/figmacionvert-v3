export interface WebToFigmaSchema {
  version: string;
  metadata: PageMetadata;
  tree: ElementNode;
  assets: AssetRegistry;
  styles: StyleRegistry;
  components?: ComponentRegistry;
  designTokens?: DesignTokenRegistry;
  cssVariables?: Record<string, string>;
  screenshot?: string;
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

  gridLayout?: {
    isGrid: boolean;
    templateColumns: string;
    templateRows: string;
    columnGap: number;
    rowGap: number;
    autoFlow?: string;
    justifyItems?: string;
    alignItems?: string;
    justifyContent?: string;
    alignContent?: string;
  };

  gridChild?: {
    columnStart?: string | number;
    columnEnd?: string | number;
    rowStart?: string | number;
    rowEnd?: string | number;
    columnSpan?: number;
    rowSpan?: number;
    justifySelf?: string;
    alignSelf?: string;
  };

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

export interface TransformData {
  matrix: number[];
  translate?: { x: number; y: number; z?: number };
  scale?: { x: number; y: number; z?: number };
  rotate?: { x: number; y: number; z: number; angle: number };
  skew?: { x: number; y: number };
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
