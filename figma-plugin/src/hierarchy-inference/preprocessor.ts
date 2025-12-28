/**
 * Preprocessor: Convert ElementNode tree to RenderNode list
 */

import { RenderNode, Rect, ComputedStyleLite } from "./types";

export function preprocess(elementNode: any): RenderNode[] {
  const renderNodes: RenderNode[] = [];
  const visited = new Set<string>();
  const MAX_NODES = 50000; // Safety limit for very large pages

  function traverse(node: any, parent?: RenderNode): void {
    if (!node || !node.id || visited.has(node.id)) {
      return;
    }

    // Safety check: prevent processing extremely large trees
    if (visited.size >= MAX_NODES) {
      console.warn(
        `⚠️ [HIERARCHY] Preprocessing stopped at ${MAX_NODES} nodes to prevent performance issues`
      );
      return;
    }

    visited.add(node.id);

    // Extract rect from layout or absoluteLayout
    const rect: Rect = extractRect(node);

    // CRITICAL FIX: Don't skip body/html nodes - they are essential for tree structure
    const htmlTag = (node.htmlTag || "").toLowerCase();
    const isRootElement = htmlTag === "body" || htmlTag === "html";

    if (rect.width <= 0 || rect.height <= 0) {
      // For body/html, use viewport dimensions as fallback
      if (isRootElement && node.children && node.children.length > 0) {
        // Calculate bounds from children
        let maxWidth = 0;
        let maxHeight = 0;
        for (const child of node.children) {
          const childRect = extractRect(child);
          maxWidth = Math.max(maxWidth, childRect.x + childRect.width);
          maxHeight = Math.max(maxHeight, childRect.y + childRect.height);
        }
        rect.width = Math.max(maxWidth, 1);
        rect.height = Math.max(maxHeight, 1);
        console.log(
          `🔧 [HIERARCHY] Fixed body/html dimensions from children: ${rect.width}x${rect.height}`
        );
      } else {
        // Skip zero-size nodes (but still process children)
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            traverse(child, parent);
          }
        }
        return;
      }
    }

    // Extract computed style
    const style: ComputedStyleLite = extractComputedStyle(node);

    const renderNode: RenderNode = {
      id: node.id,
      rect,
      style,
      children: [],
      parent,
      originalData: node,
      name: node.name || node.htmlTag || node.type || "Node",
      type: node.type,
      isOverlay: isOverlayNode(node, style),
    };

    renderNodes.push(renderNode);

    // Process children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child, renderNode);
      }
    }

    // Link children to parent
    if (parent) {
      parent.children.push(renderNode);
    }
  }

  traverse(elementNode);
  return renderNodes;
}

function extractRect(node: any): Rect {
  // Prefer absoluteLayout for page coordinates
  if (node.absoluteLayout) {
    return {
      x: node.absoluteLayout.left ?? 0,
      y: node.absoluteLayout.top ?? 0,
      width: node.absoluteLayout.width ?? 0,
      height: node.absoluteLayout.height ?? 0,
    };
  }

  if (node.layout) {
    return {
      x: node.layout.x ?? 0,
      y: node.layout.y ?? 0,
      width: node.layout.width ?? 0,
      height: node.layout.height ?? 0,
    };
  }

  return { x: 0, y: 0, width: 0, height: 0 };
}

function extractComputedStyle(node: any): ComputedStyleLite {
  const layoutContext = node.layoutContext || {};
  const style: ComputedStyleLite = {};

  // Basic properties
  style.display = layoutContext.display || node.display || "block";
  style.position = layoutContext.position || node.position || "static";
  style.overflow = layoutContext.overflow || node.overflow;
  style.zIndex = layoutContext.zIndex
    ? parseFloat(String(layoutContext.zIndex))
    : node.zIndex;

  // Visual properties (best-effort extraction)
  if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    const firstFill = node.fills[0];
    if (firstFill.type === "SOLID" && firstFill.color) {
      const { r, g, b } = firstFill.color;
      style.backgroundColor = `rgb(${Math.round(r * 255)}, ${Math.round(
        g * 255
      )}, ${Math.round(b * 255)})`;
    }
  }

  // Border radius
  if (node.cornerRadius !== undefined) {
    style.borderRadius = `${node.cornerRadius}px`;
  }

  // Opacity
  if (node.opacity !== undefined) {
    style.opacity = node.opacity;
  }

  // Transform
  if (layoutContext.transform) {
    style.transform = layoutContext.transform;
  }

  // Type detection
  style.isText = node.type === "TEXT" || !!node.characters;
  style.isImageLike =
    node.type === "IMAGE" ||
    !!node.imageHash ||
    (node.htmlTag &&
      ["img", "svg", "canvas"].includes(node.htmlTag.toLowerCase()));
  style.isSvg = node.type === "VECTOR" || node.htmlTag?.toLowerCase() === "svg";
  style.isCanvas = node.htmlTag?.toLowerCase() === "canvas";

  // Flexbox detection
  style.isFlexContainer =
    layoutContext.display === "flex" ||
    layoutContext.display === "inline-flex" ||
    !!node.autoLayout;
  if (style.isFlexContainer) {
    style.flexDirection =
      layoutContext.flexDirection ||
      node.autoLayout?.layoutMode?.toLowerCase() ||
      "row";
    style.justifyContent = layoutContext.justifyContent || "flex-start";
    style.alignItems = layoutContext.alignItems || "stretch";
    style.gap = layoutContext.gap || `${node.autoLayout?.itemSpacing || 0}px`;
  }

  // Grid detection (best-effort)
  style.isGridContainer =
    layoutContext.display === "grid" || layoutContext.display === "inline-grid";
  if (style.isGridContainer) {
    style.rowGap = layoutContext.rowGap || "0px";
    style.columnGap = layoutContext.columnGap || "0px";
  }

  return style;
}

function isOverlayNode(node: any, style: ComputedStyleLite): boolean {
  const position = style.position;
  return (
    position === "absolute" || position === "fixed" || position === "sticky"
  );
}
