/**
 * Hierarchy Inference Module
 *
 * Main entry point for hierarchy inference pipeline
 */

import { preprocess } from "./preprocessor";
import { HierarchyInferenceEngine } from "./inference-engine";
import { InferredNodeTree, InferredNode } from "./types";
import { convertInferredTreeToElementNodes } from "./converter";

/**
 * Infer hierarchy from ElementNode tree
 */
export function inferHierarchy(elementNode: any): InferredNodeTree {
  // Step 1: Preprocess - convert to RenderNode list
  const renderNodes = preprocess(elementNode);

  // Step 2: Run inference engine
  const engine = new HierarchyInferenceEngine();
  const inferredTree = engine.inferHierarchy(renderNodes);

  return inferredTree;
}

/**
 * Convert inferred tree back to ElementNode format for NodeBuilder
 */
export function convertInferredTreeToElementNode(
  inferredTree: InferredNodeTree
): any {
  return convertInferredTreeToElementNodes(inferredTree.root);
}

export { InferredNodeTree, InferredNode } from "./types";
export { InferenceMetrics } from "./types";
