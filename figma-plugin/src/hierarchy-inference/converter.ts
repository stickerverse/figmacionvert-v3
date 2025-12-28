/**
 * Converter: Transform InferredNodeTree back to ElementNode format
 *
 * This allows the inferred tree to be consumed by the existing NodeBuilder
 * while preserving all style/paint data from the original nodes.
 */

import { InferredNode } from "./types";

/**
 * Convert InferredNode back to ElementNode format
 */
export function convertInferredTreeToElementNodes(
  inferredNode: InferredNode
): any {
  // CRITICAL FIX: Spread originalData first, then override only non-null values
  const originalData = inferredNode.originalData || {};

  const elementNode: any = {
    ...originalData, // Preserve all original data including htmlTag
    id: inferredNode.id,
    // Only override if we have a value, otherwise preserve from originalData
    name: inferredNode.name || originalData.name || "Node",
    // CRITICAL: Ensure type is always a string - required by validateNodeData
    type: inferredNode.type || originalData.type || "FRAME",
  };

  // CRITICAL FIX: Explicitly preserve htmlTag if it exists in originalData
  if (originalData.htmlTag && !elementNode.htmlTag) {
    elementNode.htmlTag = originalData.htmlTag;
  }

  // Update layout from inferred rect
  if (!elementNode.layout) {
    elementNode.layout = {};
  }
  elementNode.layout.x = inferredNode.rect.x;
  elementNode.layout.y = inferredNode.rect.y;
  elementNode.layout.width = inferredNode.rect.width;
  elementNode.layout.height = inferredNode.rect.height;

  // Update absoluteLayout if it exists
  if (!elementNode.absoluteLayout) {
    elementNode.absoluteLayout = {};
  }
  elementNode.absoluteLayout.left = inferredNode.rect.x;
  elementNode.absoluteLayout.top = inferredNode.rect.y;
  elementNode.absoluteLayout.width = inferredNode.rect.width;
  elementNode.absoluteLayout.height = inferredNode.rect.height;

  // Apply inferred auto-layout if present
  if (inferredNode.autoLayout) {
    elementNode.autoLayout = {
      ...inferredNode.autoLayout,
      // Merge with existing autoLayout if present
      ...(elementNode.autoLayout || {}),
    };
  }

  // Apply inferred type hints
  if (inferredNode.inferredType) {
    elementNode._inferredType = inferredNode.inferredType;
    elementNode._isSynthetic = inferredNode.isSynthetic || false;
  }

  // Convert children
  if (inferredNode.children && inferredNode.children.length > 0) {
    elementNode.children = inferredNode.children.map((child) =>
      convertInferredTreeToElementNodes(child)
    );
  } else {
    elementNode.children = [];
  }

  return elementNode;
}
