// Shared types between Chrome extension and Figma plugin

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface ComputedStyle {
  // Basic box model
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  
  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  
  // Background
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  
  // Border & Effects
  borderRadius: string;
  borderWidth: string;
  borderColor: string;
  boxShadow: string;
  opacity: number;
  
  // Layout
  display: string;
  position: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  flexDirection: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent: string;
  alignItems: string;
  gap: string;
  
  // Transforms
  transform: string;
  transformOrigin: string;
  
  // Special flags
  isVisible: boolean;
  isPositioned: boolean;
  isFlexContainer: boolean;
  isTextNode: boolean;
  isImageNode: boolean;
  isSvgNode: boolean;
}

export interface LayoutNodeMetadata {
  tagName: string;
  className: string;
  textContent?: string;
  src?: string;
  alt?: string;
  href?: string;
  role?: string;
  ariaLabel?: string;
}

export interface LayoutNode {
  id: string;
  type: 'FRAME' | 'TEXT' | 'IMAGE' | 'SVG' | 'COMPONENT' | 'INSTANCE';
  name: string;
  style: ComputedStyle;
  children: LayoutNode[];
  
  // Raw element reference (for debugging)
  _element?: Element;
  
  // Additional metadata
  metadata: LayoutNodeMetadata;
}

export interface CaptureResult {
  rootNode: LayoutNode;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  url: string;
  timestamp: string;
}
