/**
 * Hierarchy Inference Engine
 *
 * Implements the core algorithms for inferring semantic hierarchy from render data.
 */

import {
  RenderNode,
  InferredNode,
  InferredNodeTree,
  InferenceMetrics,
  ContainmentScore,
  Rect,
} from "./types";

// Performance-optimized confidence thresholds for pixel-perfect positioning
const EPSILON = 2; // Default containment tolerance in pixels
const AREA_RATIO_THRESHOLD = 0.85;

// CRITICAL: Conservative confidence thresholds to prevent over-aggressive grouping
const MIN_CONTAINMENT_CONFIDENCE = 3.0; // Require high confidence for parent-child relationships
const MIN_STACK_CONFIDENCE = 2.5; // Require high confidence for stack grouping
const MIN_GRID_CONFIDENCE = 3.0; // Require high confidence for grid grouping
const MIN_WRAPPER_ELIMINATION_CONFIDENCE = 0.95; // Very conservative for wrapper elimination

// Dynamic tolerance scaling factors
const SIZE_TOLERANCE_FACTOR = 0.001; // 0.1% of element size
const MAX_TOLERANCE = 8; // Maximum tolerance in pixels
const MIN_TOLERANCE = 0.5; // Minimum tolerance in pixels

// Stack/grid detection conservatism
const STACK_ALIGNMENT_BASE_TOLERANCE = 8; // Increased from 5px for better accuracy
const GRID_ALIGNMENT_BASE_TOLERANCE = 12; // Increased from 10px for better accuracy
const STACK_MIN_ELEMENTS = 2; // Unchanged - minimum elements to form stack
const GRID_MIN_ELEMENTS = 4; // Unchanged - minimum elements to form grid

// Section detection conservatism
const SECTION_GAP_THRESHOLD = 75; // Increased from 50px - only create sections for clear gaps


export class HierarchyInferenceEngine {
  private metrics: InferenceMetrics = {
    nodeCountBefore: 0,
    nodeCountAfter: 0,
    wrapperEliminationCount: 0,
    orphanRate: 0,
    autoLayoutCoverage: 0,
    maxDepth: 0,
    avgDepth: 0,
    overlayCount: 0,
    syntheticFrameCount: 0,
    topWrapperCandidates: [],
  };

  /**
   * Main entry point: Infer hierarchy from render nodes
   */
  inferHierarchy(renderNodes: RenderNode[]): InferredNodeTree {
    console.log(
      `🌳 [HIERARCHY] Starting inference on ${renderNodes.length} nodes`
    );

    this.metrics.nodeCountBefore = renderNodes.length;

    // Step 1: Assign parents by containment
    const nodesWithParents = this.assignParentsByContainment(renderNodes);

    // Step 2: Build tree structure
    const tree = this.buildTree(nodesWithParents);

    // Step 3: Eliminate wrappers (iterative)
    const treeWithoutWrappers = this.eliminateWrappers(tree);

    // Step 4: Group siblings into stacks/grids
    const treeWithGroups = this.groupSiblings(treeWithoutWrappers);

    // Step 5: Separate overlays
    const treeWithOverlays = this.separateOverlays(treeWithGroups);

    // Step 6: Sectionize (top-level bands)
    const treeWithSections = this.sectionize(treeWithOverlays);

    // Step 7: Infer auto-layout
    const treeWithAutoLayout = this.inferAutoLayout(treeWithSections);

    // Step 8: Finalize (stable order, naming, metrics)
    const finalized = this.finalizeTree(treeWithAutoLayout);

    this.metrics.nodeCountAfter = this.countNodes(finalized);
    this.calculateMetrics(finalized);

    console.log(
      `✅ [HIERARCHY] Inference complete: ${this.metrics.nodeCountBefore} → ${this.metrics.nodeCountAfter} nodes`
    );

    return {
      root: finalized,
      metrics: this.metrics,
    };
  }

  /**
   * Step 1: Assign parents by containment with scoring
   */
  private assignParentsByContainment(nodes: RenderNode[]): RenderNode[] {
    console.log(`  📐 [HIERARCHY] Assigning parents by containment...`);

    // Store original parent relationships for IMAGE nodes to preserve DOM hierarchy
    const originalImageParents = new Map<string, string>();
    const originalImageChildren = new Map<string, string[]>();

    for (const node of nodes) {
      if (node.type === "IMAGE" && (node as any).parentId) {
        originalImageParents.set(node.id, (node as any).parentId);
      }
      if (node.children) {
        const imageChildren = node.children
          .filter((child) => child.type === "IMAGE")
          .map((child) => child.id);
        if (imageChildren.length > 0) {
          originalImageChildren.set(node.id, imageChildren);
        }
      }
    }

    // Reset parent relationships
    for (const node of nodes) {
      node.parent = undefined;
      node.children = [];
    }

    // For each node, find the best parent - BUT preserve IMAGE node DOM relationships
    for (const child of nodes) {
      // CRITICAL FIX: Skip reparenting for IMAGE nodes to preserve DOM hierarchy
      if (child.type === "IMAGE" && originalImageParents.has(child.id)) {
        const originalParentId = originalImageParents.get(child.id)!;
        const originalParent = nodes.find((n) => n.id === originalParentId);
        if (originalParent) {
          child.parent = originalParent;
          if (!originalParent.children) {
            originalParent.children = [];
          }
          originalParent.children.push(child);
          console.log(
            `🖼️ [HIERARCHY] Preserving DOM parent for IMAGE: ${child.id} → ${originalParentId}`
          );
          continue; // Skip containment-based reparenting for this IMAGE node
        }
      }
      let bestParent: RenderNode | undefined;
      let bestScore = -Infinity;

      for (const candidate of nodes) {
        if (candidate === child) continue;
        if (candidate.id === child.id) continue;

        const score = this.scoreContainment(candidate, child);
        // CRITICAL: Only apply containment if confidence exceeds minimum threshold
        if (score.total > bestScore && score.total >= MIN_CONTAINMENT_CONFIDENCE) {
          bestScore = score.total;
          bestParent = candidate;
        }
      }

      if (bestParent) {
        child.parent = bestParent;
        if (!bestParent.children) {
          bestParent.children = [];
        }
        bestParent.children.push(child);
      }
    }

    return nodes;
  }

  /**
   * Score containment relationship: S_parent(A,B)
   */
  private scoreContainment(
    parent: RenderNode,
    child: RenderNode
  ): ContainmentScore {
    const parentRect = parent.rect;
    const childRect = child.rect;

    // Check if parent contains child (within epsilon)
    const contains = this.containsWithinEpsilon(parentRect, childRect, EPSILON);
    if (!contains) {
      return {
        containTightness: 0,
        areaRatio: 0,
        styleBonus: 0,
        layoutBonus: 0,
        clipBonus: 0,
        decorationPenalty: 0,
        overlayPenalty: 0,
        crossStackingPenalty: 0,
        total: -Infinity,
      };
    }

    // containTightness: how tightly parent contains child
    const containTightness = this.calculateContainTightness(
      parentRect,
      childRect
    );

    // areaRatio: child.area / parent.area
    const parentArea = parentRect.width * parentRect.height;
    const childArea = childRect.width * childRect.height;
    const areaRatio = parentArea > 0 ? childArea / parentArea : 0;

    // styleBonus: bg/border/shadow/background-image
    const styleBonus = this.calculateStyleBonus(parent);

    // layoutBonus: flex/grid containers
    const layoutBonus = this.calculateLayoutBonus(parent);

    // clipBonus: overflow hidden/clip or clip-path
    const clipBonus = this.calculateClipBonus(parent);

    // decorationPenalty: divider-like tiny elements or purely decorative
    const decorationPenalty = this.calculateDecorationPenalty(parent);

    // overlayPenalty: absolute/fixed nodes treated as overlays
    const overlayPenalty = this.calculateOverlayPenalty(child, parent);

    // crossStackingPenalty: mismatch stacking context heuristics
    const crossStackingPenalty = this.calculateCrossStackingPenalty(
      child,
      parent
    );

    // Total score: S_parent(A,B) formula
    const total =
      4.0 * containTightness +
      2.0 * Math.min(1, Math.max(0, areaRatio / AREA_RATIO_THRESHOLD)) +
      1.5 * styleBonus +
      1.0 * layoutBonus +
      1.0 * clipBonus -
      2.5 * decorationPenalty -
      2.0 * overlayPenalty -
      1.0 * crossStackingPenalty;

    return {
      containTightness,
      areaRatio,
      styleBonus,
      layoutBonus,
      clipBonus,
      decorationPenalty,
      overlayPenalty,
      crossStackingPenalty,
      total,
    };
  }

  private containsWithinEpsilon(
    parent: Rect,
    child: Rect,
    epsilon: number
  ): boolean {
    // CRITICAL FIX: Dynamic epsilon based on element size and potential precision loss
    // Account for viewport scaling, transforms, and nested coordinate precision
    const dynamicEpsilon = this.calculateDynamicEpsilon(parent, child, epsilon);

    // Use precise floating-point comparison with proper tolerance
    const parentRight = parent.x + parent.width;
    const parentBottom = parent.y + parent.height;
    const childRight = child.x + child.width;
    const childBottom = child.y + child.height;

    return (
      child.x >= parent.x - dynamicEpsilon &&
      child.y >= parent.y - dynamicEpsilon &&
      childRight <= parentRight + dynamicEpsilon &&
      childBottom <= parentBottom + dynamicEpsilon
    );
  }

  private calculateDynamicEpsilon(
    parent: Rect,
    child: Rect,
    baseEpsilon: number
  ): number {
    // Calculate precision loss factors
    const maxDimension = Math.max(
      parent.width,
      parent.height,
      child.width,
      child.height
    );
    const scaleFactor = this.getViewportScaleFactor();
    // Account for potential transform precision loss (more tolerant for larger elements)
    const sizeBasedTolerance = Math.max(MIN_TOLERANCE, maxDimension * SIZE_TOLERANCE_FACTOR);

    // Account for DPI scaling precision loss
    const dpiTolerance = baseEpsilon / scaleFactor;

    // Use the larger of base epsilon and calculated tolerances, but cap at reasonable maximum
    return Math.min(Math.max(baseEpsilon, sizeBasedTolerance, dpiTolerance), MAX_TOLERANCE);
  }

  private getViewportScaleFactor(): number {
    // Always return 1 as fallback - schema access not available in this context
    return 1;
  }

  private calculateContainTightness(parent: Rect, child: Rect): number {
    const parentArea = parent.width * parent.height;
    const childArea = child.width * child.height;
    if (parentArea === 0) return 0;

    // Tightness based on how much of parent's area is used by child
    const areaRatio = childArea / parentArea;

    // Also consider how close child edges are to parent edges
    const leftGap = child.x - parent.x;
    const topGap = child.y - parent.y;
    const rightGap = parent.x + parent.width - (child.x + child.width);
    const bottomGap = parent.y + parent.height - (child.y + child.height);

    const avgGap = (leftGap + topGap + rightGap + bottomGap) / 4;
    const maxDimension = Math.max(parent.width, parent.height);
    const gapRatio =
      maxDimension > 0 ? 1 - Math.min(1, avgGap / maxDimension) : 0;

    return areaRatio * 0.7 + gapRatio * 0.3;
  }

  private calculateStyleBonus(node: RenderNode): number {
    let bonus = 0;
    const style = node.style;

    if (
      style.backgroundColor &&
      style.backgroundColor !== "transparent" &&
      style.backgroundColor !== "rgba(0,0,0,0)"
    ) {
      bonus += 0.3;
    }
    if (style.borderRadius) {
      bonus += 0.2;
    }
    if (style.boxShadow) {
      bonus += 0.2;
    }

    return Math.min(1, bonus);
  }

  private calculateLayoutBonus(node: RenderNode): number {
    if (node.style.isFlexContainer || node.style.isGridContainer) {
      return 1.0;
    }
    return 0;
  }

  private calculateClipBonus(node: RenderNode): number {
    const overflow = node.style.overflow;
    if (overflow === "hidden" || overflow === "clip") {
      return 1.0;
    }
    return 0;
  }

  private calculateDecorationPenalty(node: RenderNode): number {
    const rect = node.rect;
    const area = rect.width * rect.height;

    // Very small elements are likely decorative
    if (area < 100) {
      return 0.8;
    }

    // Thin horizontal/vertical lines (dividers)
    const aspectRatio = rect.width / Math.max(1, rect.height);
    if ((aspectRatio > 50 || aspectRatio < 0.02) && area < 1000) {
      return 0.6;
    }

    return 0;
  }

  private calculateOverlayPenalty(
    child: RenderNode,
    parent: RenderNode
  ): number {
    if (child.isOverlay && !parent.isOverlay) {
      return 1.0; // Overlay child in non-overlay parent is bad
    }
    return 0;
  }

  private calculateCrossStackingPenalty(
    child: RenderNode,
    parent: RenderNode
  ): number {
    const childZ = child.style.zIndex || 0;
    const parentZ = parent.style.zIndex || 0;

    // Large z-index differences suggest different stacking contexts
    if (Math.abs(childZ - parentZ) > 10) {
      return 0.5;
    }

    return 0;
  }

  /**
   * Step 2: Build tree structure from parent-child relationships
   */
  private buildTree(nodes: RenderNode[]): InferredNode {
    // Find root (node with no parent)
    const rootNode = nodes.find((n) => !n.parent) || nodes[0];
    if (!rootNode) {
      throw new Error("No root node found");
    }

    return this.convertToInferredNode(rootNode);
  }

  private convertToInferredNode(renderNode: RenderNode): InferredNode {
    const inferred: InferredNode = {
      id: renderNode.id,
      rect: { ...renderNode.rect },
      style: { ...renderNode.style },
      children: [],
      originalData: renderNode.originalData,
      name: renderNode.name,
      type: renderNode.type,
      inferredType: "content",
    };

    // Convert children
    if (renderNode.children) {
      inferred.children = renderNode.children.map((child) =>
        this.convertToInferredNode(child)
      );
    }

    return inferred;
  }

  /**
   * Step 3: Eliminate wrappers (iterative)
   */
  private eliminateWrappers(tree: InferredNode): InferredNode {
    console.log(`  🧹 [HIERARCHY] Eliminating wrappers...`);

    let changed = true;
    let iterations = 0;
    const maxIterations = 10;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      const eliminated = this.eliminateWrappersPass(tree, undefined);
      if (eliminated > 0) {
        changed = true;
        this.metrics.wrapperEliminationCount += eliminated;
      }
    }

    return tree;
  }

  private eliminateWrappersPass(
    node: InferredNode,
    parent?: InferredNode
  ): number {
    let eliminated = 0;

    // Guard against missing children
    if (!node.children || !Array.isArray(node.children)) {
      return eliminated;
    }

    // Process children first (bottom-up)
    for (const child of node.children) {
      eliminated += this.eliminateWrappersPass(child, node);
    }

    // Check if this node is a wrapper
    const children = node.children;
    if (children.length === 0 || !parent) {
      return eliminated;
    }

    // Calculate union of children rects
    const childrenUnion = this.calculateChildrenUnion(children);
    if (!childrenUnion) {
      return eliminated;
    }

    const nodeRect = node.rect;
    const unionArea = childrenUnion.width * childrenUnion.height;
    const nodeArea = nodeRect.width * nodeRect.height;

    // CRITICAL: Conservative wrapper elimination with confidence validation
    const areaMatchConfidence = unionArea > 0 ? (Math.min(unionArea, nodeArea) / Math.max(unionArea, nodeArea)) : 0;
    const tolerance = Math.max(5, Math.min(parent.rect.width, parent.rect.height) * 0.02); // Dynamic tolerance
    const rectsMatch =
      Math.abs(nodeRect.x - childrenUnion.x) < tolerance &&
      Math.abs(nodeRect.y - childrenUnion.y) < tolerance &&
      Math.abs(nodeRect.width - childrenUnion.width) < tolerance &&
      Math.abs(nodeRect.height - childrenUnion.height) < tolerance &&
      areaMatchConfidence >= MIN_WRAPPER_ELIMINATION_CONFIDENCE;

    // Check if node has no meaningful responsibilities
    const hasClip =
      node.style.overflow === "hidden" || node.style.overflow === "clip";
    const hasOpacity =
      node.style.opacity !== undefined && node.style.opacity < 1;
    const hasTransform = !!node.style.transform;
    const hasBackground =
      !!node.style.backgroundColor &&
      node.style.backgroundColor !== "transparent";
    const hasBorderRadius = !!node.style.borderRadius;
    const hasBoxShadow = !!node.style.boxShadow;

    const hasResponsibilities =
      hasClip ||
      hasOpacity ||
      hasTransform ||
      hasBackground ||
      hasBorderRadius ||
      hasBoxShadow;

    // Check if node is meaningful container
    const isMeaningful =
      node.style.isFlexContainer ||
      node.style.isGridContainer ||
      node.inferredType === "section" ||
      node.inferredType === "container";

    // CRITICAL FIX: Check if node has IMAGE children - preserve their DOM parent
    const hasImageChildren = children.some((child) => child.type === "IMAGE");

    // Eliminate if: rects match, no responsibilities, not meaningful, not root, and no IMAGE children
    if (
      rectsMatch &&
      !hasResponsibilities &&
      !isMeaningful &&
      !hasImageChildren &&
      node.inferredType !== "section"
    ) {
      // Remove node from parent's children
      const index = parent.children.indexOf(node);
      if (index >= 0) {
        parent.children.splice(index, 1);
      }

      // Add node's children to parent
      for (const child of children) {
        child.parent = parent;
        parent.children.push(child);
      }

      eliminated++;
    }

    return eliminated;
  }

  private calculateChildrenUnion(children: InferredNode[]): Rect | null {
    if (children.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of children) {
      const rect = child.rect;
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Step 4: Group siblings into stacks/grids
   */
  private groupSiblings(tree: InferredNode): InferredNode {
    console.log(`  📦 [HIERARCHY] Grouping siblings into stacks/grids...`);

    this.groupSiblingsRecursive(tree);
    return tree;
  }

  private groupSiblingsRecursive(node: InferredNode): void {
    // Guard against missing children
    if (!node.children || !Array.isArray(node.children)) {
      return;
    }

    // Process children first
    for (const child of node.children) {
      this.groupSiblingsRecursive(child);
    }

    // Group siblings at this level
    const children = node.children;
    if (children.length < 2) return;
    // Apply conservative confidence thresholds for stack creation
    const verticalStacks = this.detectVerticalStacks(children);
    for (const stack of verticalStacks) {
      if (stack.length >= STACK_MIN_ELEMENTS && this.validateStackConfidence(stack, "VERTICAL")) {
        this.createSyntheticStackFrame(node, stack, "VERTICAL");
      }
    }

    // Detect horizontal stacks with confidence validation
    const horizontalStacks = this.detectHorizontalStacks(children);
    for (const stack of horizontalStacks) {
      if (stack.length >= STACK_MIN_ELEMENTS && this.validateStackConfidence(stack, "HORIZONTAL")) {
        this.createSyntheticStackFrame(node, stack, "HORIZONTAL");
      }
    }

    // Detect grids with confidence validation
    const grids = this.detectGrids(children);
    for (const grid of grids) {
      if (grid.length >= GRID_MIN_ELEMENTS && this.validateGridConfidence(grid)) {
        this.createSyntheticGridFrame(node, grid);
      }
    }
  }

  /**
   * Calculate dynamic tolerance for stack detection based on element size
   */
  private calculateDynamicStackTolerance(node: InferredNode, direction: "HORIZONTAL" | "VERTICAL"): number {
    const baseTolerance = direction === "HORIZONTAL" ? STACK_ALIGNMENT_BASE_TOLERANCE : STACK_ALIGNMENT_BASE_TOLERANCE;
    const elementSize = direction === "HORIZONTAL" ? node.rect.height : node.rect.width;
    
    // Scale tolerance based on element size - larger elements can have more variance
    const sizeBasedTolerance = Math.max(baseTolerance, elementSize * 0.1); // 10% of element size
    
    // Cap at reasonable maximum
    return Math.min(sizeBasedTolerance, baseTolerance * 2);
  }

  /**
   * Validate stack formation confidence - prevent over-aggressive grouping
   */
  private validateStackConfidence(stack: InferredNode[], direction: "VERTICAL" | "HORIZONTAL"): boolean {
    if (stack.length < STACK_MIN_ELEMENTS) return false;
    
    // Calculate alignment consistency
    let alignmentScore = 0;
    const tolerance = this.calculateDynamicStackTolerance(stack[0], direction === "VERTICAL" ? "HORIZONTAL" : "VERTICAL");
    
    for (let i = 1; i < stack.length; i++) {
      const prev = stack[i - 1];
      const curr = stack[i];
      
      if (direction === "VERTICAL") {
        // Check X-axis alignment for vertical stacks
        const alignmentDiff = Math.abs(curr.rect.x - prev.rect.x);
        alignmentScore += alignmentDiff <= tolerance ? 1 : 0;
      } else {
        // Check Y-axis alignment for horizontal stacks
        const alignmentDiff = Math.abs(curr.rect.y - prev.rect.y);
        alignmentScore += alignmentDiff <= tolerance ? 1 : 0;
      }
    }
    
    const alignmentRatio = alignmentScore / (stack.length - 1);
    const confidenceScore = alignmentRatio * 3.0; // Base confidence multiplier
    
    console.log(`[HIERARCHY] Stack validation: ${stack.length} elements, alignment: ${alignmentRatio.toFixed(2)}, confidence: ${confidenceScore.toFixed(2)}`);
    
    return confidenceScore >= MIN_STACK_CONFIDENCE;
  }

  /**
   * Validate grid formation confidence - prevent false grid detection
   */
  private validateGridConfidence(grid: InferredNode[]): boolean {
    if (grid.length < GRID_MIN_ELEMENTS) return false;
    
    // Group into rows by Y-overlap
    const rows: InferredNode[][] = [];
    const used = new Set<string>();
    
    for (const node of grid) {
      if (used.has(node.id)) continue;
      
      const row: InferredNode[] = [node];
      used.add(node.id);
      
      for (const other of grid) {
        if (used.has(other.id)) continue;
        if (this.rectsOverlapY(node.rect, other.rect)) {
          row.push(other);
          used.add(other.id);
        }
      }
      
      if (row.length >= 2) rows.push(row);
    }
    
    if (rows.length < 2) return false;
    
    // Validate column alignment across rows
    let alignmentScore = 0;
    for (let i = 0; i < rows.length - 1; i++) {
      const currentRow = rows[i];
      const nextRow = rows[i + 1];
      
      if (currentRow.length === nextRow.length) {
        for (let j = 0; j < currentRow.length; j++) {
          const alignmentDiff = Math.abs(currentRow[j].rect.x - nextRow[j].rect.x);
          alignmentScore += alignmentDiff <= GRID_ALIGNMENT_BASE_TOLERANCE ? 1 : 0;
        }
      }
    }
    
    const totalPairs = rows.reduce((sum, row) => sum + (row.length > 1 ? row.length - 1 : 0), 0);
    const alignmentRatio = totalPairs > 0 ? alignmentScore / totalPairs : 0;
    const confidenceScore = alignmentRatio * 3.0;
    
    console.log(`[HIERARCHY] Grid validation: ${grid.length} elements, ${rows.length} rows, alignment: ${alignmentRatio.toFixed(2)}, confidence: ${confidenceScore.toFixed(2)}`);
    
    return confidenceScore >= MIN_GRID_CONFIDENCE;
  }

  private detectVerticalStacks(children: InferredNode[]): InferredNode[][] {
    const stacks: InferredNode[][] = [];
    const used = new Set<string>();

    for (let i = 0; i < children.length; i++) {
      if (used.has(children[i].id)) continue;

      const stack: InferredNode[] = [children[i]];
      const tolerance = this.calculateDynamicStackTolerance(children[i], "HORIZONTAL");
      const baseX = children[i].rect.x;

      for (let j = i + 1; j < children.length; j++) {
        if (used.has(children[j].id)) continue;

        const childX = children[j].rect.x;
        if (Math.abs(childX - baseX) < tolerance) {
          // Check if y is increasing
          const lastY =
            stack[stack.length - 1].rect.y +
            stack[stack.length - 1].rect.height;
          if (children[j].rect.y >= lastY - tolerance) {
            stack.push(children[j]);
            used.add(children[j].id);
          }
        }
      }

      if (stack.length >= 2) {
        stacks.push(stack);
      }
    }

    return stacks;
  }

  private detectHorizontalStacks(children: InferredNode[]): InferredNode[][] {
    const stacks: InferredNode[][] = [];
    const used = new Set<string>();

    for (let i = 0; i < children.length; i++) {
      if (used.has(children[i].id)) continue;

      const stack: InferredNode[] = [children[i]];
      used.add(children[i].id);
      const baseY = children[i].rect.y;
      const tolerance = this.calculateDynamicStackTolerance(children[i], "VERTICAL");

      for (let j = i + 1; j < children.length; j++) {
        if (used.has(children[j].id)) continue;

        const childY = children[j].rect.y;
        if (Math.abs(childY - baseY) < tolerance) {
          // Check if x is increasing
          const lastX =
            stack[stack.length - 1].rect.x + stack[stack.length - 1].rect.width;
          if (children[j].rect.x >= lastX - tolerance) {
            stack.push(children[j]);
            used.add(children[j].id);
          }
        }
      }

      if (stack.length >= 2) {
        stacks.push(stack);
      }
    }

    return stacks;
  }

  private detectGrids(children: InferredNode[]): InferredNode[][] {
    // Simple grid detection: group by y-overlap (rows), then check column alignment
    const rows: InferredNode[][] = [];
    const used = new Set<string>();

    // Group into rows by y-overlap
    for (const child of children) {
      if (used.has(child.id)) continue;

      const row: InferredNode[] = [child];
      used.add(child.id);

      for (const other of children) {
        if (used.has(other.id)) continue;
        if (this.rectsOverlapY(child.rect, other.rect)) {
          row.push(other);
          used.add(other.id);
        }
      }

      if (row.length >= 2) {
        rows.push(row);
      }
    }

    // Check if rows have consistent column positions (grid-like)
    if (rows.length < 2) return [];

    // For now, return first two rows as a grid if they align
    const grids: InferredNode[][] = [];
    for (let i = 0; i < rows.length - 1; i++) {
      const row1 = rows[i];
      const row2 = rows[i + 1];

      // Check if columns align
      if (this.rowsAlignAsGrid(row1, row2)) {
        grids.push([...row1, ...row2]);
      }
    }

    return grids;
  }

  private rectsOverlapY(rect1: Rect, rect2: Rect): boolean {
    return !(
      rect1.y + rect1.height < rect2.y || rect2.y + rect2.height < rect1.y
    );
  }

  private rowsAlignAsGrid(row1: InferredNode[], row2: InferredNode[]): boolean {
    if (row1.length !== row2.length) return false;

    const tolerance = GRID_ALIGNMENT_BASE_TOLERANCE;
    for (let i = 0; i < row1.length; i++) {
      if (Math.abs(row1[i].rect.x - row2[i].rect.x) > tolerance) {
        return false;
      }

    }
    return true;
  }

  private createSyntheticStackFrame(
    parent: InferredNode,
    children: InferredNode[],
    direction: "VERTICAL" | "HORIZONTAL"
  ): void {
    const union = this.calculateChildrenUnion(children);
    if (!union) return;

    // Remove children from parent
    for (const child of children) {
      const index = parent.children.indexOf(child);
      if (index >= 0) {
        parent.children.splice(index, 1);
      }
    }

    // Create synthetic frame
    const synthetic: InferredNode = {
      id: `synthetic-stack-${Date.now()}-${Math.random()}`,
      rect: union,
      style: { ...children[0].style },
      children,
      parent: parent,
      name: `Stack (${direction})`,
      inferredType: "stack",
      isSynthetic: true,
      autoLayout: {
        layoutMode: direction,
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "STRETCH",
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        itemSpacing: this.calculateGap(children, direction),
      },
    };

    // Update children parent
    for (const child of children) {
      child.parent = synthetic;
    }

    // Add to parent
    parent.children.push(synthetic);
    this.metrics.syntheticFrameCount++;
  }

  private createSyntheticGridFrame(
    parent: InferredNode,
    children: InferredNode[]
  ): void {
    const union = this.calculateChildrenUnion(children);
    if (!union) return;

    // Group into rows
    const rows: InferredNode[][] = [];
    const used = new Set<string>();

    for (const child of children) {
      if (used.has(child.id)) continue;

      const row: InferredNode[] = [child];
      used.add(child.id);

      for (const other of children) {
        if (used.has(other.id)) continue;
        if (this.rectsOverlapY(child.rect, other.rect)) {
          row.push(other);
          used.add(other.id);
        }
      }

      rows.push(row);
    }

    // Remove children from parent
    for (const child of children) {
      const index = parent.children.indexOf(child);
      if (index >= 0) {
        parent.children.splice(index, 1);
      }
    }

    // Create row frames
    const rowFrames: InferredNode[] = [];
    for (const row of rows) {
      const rowUnion = this.calculateChildrenUnion(row);
      if (!rowUnion) continue;

      const rowFrame: InferredNode = {
        id: `synthetic-row-${Date.now()}-${Math.random()}`,
        rect: rowUnion,
        style: { ...row[0].style },
        children: row,
        parent: parent,
        name: "Grid Row",
        inferredType: "stack",
        isSynthetic: true,
        autoLayout: {
          layoutMode: "HORIZONTAL",
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "STRETCH",
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          itemSpacing: this.calculateGap(row, "HORIZONTAL"),
        },
      };

      for (const child of row) {
        child.parent = rowFrame;
      }

      rowFrames.push(rowFrame);
    }

    // Create grid container (vertical stack of rows)
    const gridFrame: InferredNode = {
      id: `synthetic-grid-${Date.now()}-${Math.random()}`,
      rect: union,
      style: { ...children[0].style },
      children: rowFrames,
      parent: parent,
      name: "Grid",
      inferredType: "grid",
      isSynthetic: true,
      autoLayout: {
        layoutMode: "VERTICAL",
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "STRETCH",
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        itemSpacing: this.calculateGap(rowFrames, "VERTICAL"),
      },
    };

    for (const rowFrame of rowFrames) {
      rowFrame.parent = gridFrame;
    }

    parent.children.push(gridFrame);
    this.metrics.syntheticFrameCount += rowFrames.length + 1;
  }

  private calculateGap(
    children: InferredNode[],
    direction: "VERTICAL" | "HORIZONTAL"
  ): number {
    if (!children || !Array.isArray(children) || children.length < 2) return 0;

    const gaps: number[] = [];

    for (let i = 0; i < children.length - 1; i++) {
      const current = children[i];
      const next = children[i + 1];

      if (direction === "VERTICAL") {
        const gap = next.rect.y - (current.rect.y + current.rect.height);
        if (gap >= 0) {
          gaps.push(gap);
        }
      } else {
        const gap = next.rect.x - (current.rect.x + current.rect.width);
        if (gap >= 0) {
          gaps.push(gap);
        }
      }
    }

    if (gaps.length === 0) return 0;

    // Return median gap
    gaps.sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)];
  }

  /**
   * Step 5: Separate overlays
   */
  private separateOverlays(tree: InferredNode): InferredNode {
    console.log(`  🎭 [HIERARCHY] Separating overlays...`);

    this.separateOverlaysRecursive(tree);
    return tree;
  }

  private separateOverlaysRecursive(node: InferredNode): void {
    // Guard against missing children
    if (!node.children || !Array.isArray(node.children)) {
      return;
    }

    // Process children first
    for (const child of node.children) {
      this.separateOverlaysRecursive(child);
    }

    // Separate overlays at this level
    const children = node.children;
    const overlays: InferredNode[] = [];
    const nonOverlays: InferredNode[] = [];

    for (const child of children) {
      if (
        child.style.position === "absolute" ||
        child.style.position === "fixed"
      ) {
        child.inferredType = "overlay";
        overlays.push(child);
        this.metrics.overlayCount++;
      } else {
        nonOverlays.push(child);
      }
    }

    // Reorder: non-overlays first, then overlays
    node.children = [...nonOverlays, ...overlays];
  }

  /**
   * Step 6: Sectionize (top-level bands)
   */
  private sectionize(tree: InferredNode): InferredNode {
    console.log(`  📑 [HIERARCHY] Sectionizing top-level bands...`);

    // Only sectionize root-level children
    const rootChildren = tree.children;
    if (rootChildren.length === 0) return tree;

    // Detect horizontal bands by y-position
    const bands = this.detectHorizontalBands(rootChildren);
    if (bands.length <= 1) return tree; // No sectionization needed

    // Remove children from root
    tree.children = [];

    // Create section frames
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const union = this.calculateChildrenUnion(band);
      if (!union) continue;

      const sectionName = this.inferSectionName(i, bands.length, union);

      const section: InferredNode = {
        id: `section-${i}-${Date.now()}`,
        rect: union,
        style: { ...band[0].style },
        children: band,
        parent: tree,
        name: sectionName,
        inferredType: "section",
        isSynthetic: true,
      };

      for (const child of band) {
        child.parent = section;
      }

      tree.children.push(section);
      this.metrics.syntheticFrameCount++;
    }

    return tree;
  }

  private detectHorizontalBands(children: InferredNode[]): InferredNode[][] {
    if (children.length === 0) return [];

    // Sort by y-position
    const sorted = [...children].sort((a, b) => a.rect.y - b.rect.y);

    const bands: InferredNode[][] = [];
    let currentBand: InferredNode[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];

      // Check if there's a significant gap (new band)
      const threshold = SECTION_GAP_THRESHOLD; // Conservative gap threshold
      const gap = current.rect.y - (prev.rect.y + prev.rect.height);

      if (gap > threshold) {
        bands.push(currentBand);
        currentBand = [current];
      } else {
        currentBand.push(current);
      }
    }

    if (currentBand.length > 0) {
      bands.push(currentBand);
    }

    return bands;
  }

  private inferSectionName(index: number, total: number, rect: Rect): string {
    // Simple heuristics for common sections
    if (index === 0 && rect.y < 200) {
      return "Header";
    }
    if (index === total - 1 && rect.height > 100) {
      return "Footer";
    }
    if (index === 0 && rect.height > 300) {
      return "Hero";
    }
    return `Section ${index + 1}`;
  }

  /**
   * Step 7: Infer auto-layout
   */
  private inferAutoLayout(tree: InferredNode): InferredNode {
    console.log(`  🔧 [HIERARCHY] Inferring auto-layout...`);

    this.inferAutoLayoutRecursive(tree);
    return tree;
  }

  private inferAutoLayoutRecursive(node: InferredNode): void {
    // Guard against missing children
    if (!node.children || !Array.isArray(node.children)) {
      return;
    }

    // Process children first
    for (const child of node.children) {
      this.inferAutoLayoutRecursive(child);
    }

    // Infer auto-layout for this node if it's a stack/grid
    if (node.inferredType === "stack" || node.inferredType === "grid") {
      // Auto-layout already set in groupSiblings
      return;
    }

    // Check if children form a stack
    if (node.children.length >= 2) {
      const verticalStack = this.detectVerticalStacks(node.children);
      const horizontalStack = this.detectHorizontalStacks(node.children);

      if (
        verticalStack.length > 0 &&
        verticalStack[0].length === node.children.length
      ) {
        // All children form a vertical stack
        node.autoLayout = {
          layoutMode: "VERTICAL",
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "STRETCH",
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          itemSpacing: this.calculateGap(node.children, "VERTICAL"),
        };
        node.inferredType = "stack";
      } else if (
        horizontalStack.length > 0 &&
        horizontalStack[0].length === node.children.length
      ) {
        // All children form a horizontal stack
        node.autoLayout = {
          layoutMode: "HORIZONTAL",
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "STRETCH",
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          itemSpacing: this.calculateGap(node.children, "HORIZONTAL"),
        };
        node.inferredType = "stack";
      }
    }
  }

  /**
   * Step 8: Finalize tree (stable order, naming, metrics)
   */
  private finalizeTree(tree: InferredNode): InferredNode {
    console.log(`  ✨ [HIERARCHY] Finalizing tree...`);

    this.finalizeTreeRecursive(tree);
    return tree;
  }

  private finalizeTreeRecursive(node: InferredNode): void {
    // Guard against missing children
    if (!node.children || !Array.isArray(node.children)) {
      return;
    }

    // Sort children by position (top-to-bottom, left-to-right)
    node.children.sort((a, b) => {
      const yDiff = a.rect.y - b.rect.y;
      if (Math.abs(yDiff) > 10) {
        return yDiff;
      }
      return a.rect.x - b.rect.x;
    });

    // Improve naming
    if (!node.name || node.name === "Node") {
      if (node.inferredType === "section") {
        node.name = "Section";
      } else if (node.inferredType === "stack") {
        node.name = "Stack";
      } else if (node.inferredType === "grid") {
        node.name = "Grid";
      } else if (node.inferredType === "container") {
        node.name = "Container";
      } else if (node.originalData?.htmlTag) {
        node.name = node.originalData.htmlTag;
      }
    }

    // Process children
    for (const child of node.children) {
      this.finalizeTreeRecursive(child);
    }
  }

  /**
   * Calculate final metrics
   */
  private calculateMetrics(root: InferredNode): void {
    const totalNodes = this.countNodes(root);
    const childrenUnderRoot = root.children.length;
    this.metrics.orphanRate =
      totalNodes > 0 ? childrenUnderRoot / totalNodes : 0;

    const { maxDepth, avgDepth } = this.calculateDepth(root);
    this.metrics.maxDepth = maxDepth;
    this.metrics.avgDepth = avgDepth;

    const autoLayoutCount = this.countAutoLayoutNodes(root);
    this.metrics.autoLayoutCoverage =
      totalNodes > 0 ? autoLayoutCount / totalNodes : 0;

    // Collect wrapper candidates
    this.collectWrapperCandidates(root);
  }

  private countNodes(node: InferredNode): number {
    if (!node) {
      console.warn("⚠️ [HIERARCHY] countNodes called with null/undefined node");
      return 0;
    }
    let count = 1;
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  private calculateDepth(node: InferredNode): {
    maxDepth: number;
    avgDepth: number;
  } {
    if (
      !node.children ||
      !Array.isArray(node.children) ||
      node.children.length === 0
    ) {
      return { maxDepth: 1, avgDepth: 1 };
    }

    let maxChildDepth = 0;
    let totalDepth = 0;

    for (const child of node.children) {
      const childDepth = this.calculateDepth(child);
      maxChildDepth = Math.max(maxChildDepth, childDepth.maxDepth);
      totalDepth += childDepth.avgDepth;
    }

    return {
      maxDepth: maxChildDepth + 1,
      avgDepth: 1 + (totalDepth / node.children.length || 0),
    };
  }

  private countAutoLayoutNodes(node: InferredNode): number {
    let count = node.autoLayout ? 1 : 0;
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        count += this.countAutoLayoutNodes(child);
      }
    }
    return count;
  }

  private collectWrapperCandidates(node: InferredNode): void {
    const candidates: Array<{
      id: string;
      name: string;
      score: number;
      reason: string;
    }> = [];
    const engine = this;

    function traverse(n: InferredNode) {
      if (n.children && Array.isArray(n.children) && n.children.length > 0) {
        const union = engine.calculateChildrenUnion(n.children);
        if (union) {
          const nodeArea = n.rect.width * n.rect.height;
          const unionArea = union.width * union.height;
          const areaRatio = nodeArea > 0 ? unionArea / nodeArea : 0;

          if (areaRatio > 0.9) {
            const hasResponsibilities =
              n.style.overflow === "hidden" ||
              (n.style.opacity !== undefined && n.style.opacity < 1) ||
              !!n.style.transform ||
              !!n.style.backgroundColor;

            if (!hasResponsibilities && !n.isSynthetic) {
              candidates.push({
                id: n.id,
                name: n.name || "Unknown",
                score: areaRatio,
                reason: "Rect matches children union, no responsibilities",
              });
            }
          }
        }

        for (const child of n.children) {
          traverse(child);
        }
      }
    }

    traverse(node);

    // Sort by score and take top 50
    candidates.sort((a, b) => b.score - a.score);
    this.metrics.topWrapperCandidates = candidates.slice(0, 50);
  }
}
