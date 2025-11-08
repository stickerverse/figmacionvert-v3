/**
 * Physics-Based Layout Solver for Pixel-Perfect Positioning
 */
export class PhysicsLayoutSolver {
  
  /**
   * Analyze layout and determine optimal Figma positioning strategy
   */
  static solveLayout(tree: any): LayoutSolution {
    const solution: LayoutSolution = {
      useAbsolutePositioning: false,
      autoLayoutNodes: [],
      absolutePositionedNodes: [],
      overlappingElements: [],
      stackingLayers: [],
      layoutStrategy: 'auto'
    };
    
    // Priority 1: Detect overlapping elements (forces absolute positioning)
    const overlapping = this.detectOverlapping(tree.children || []);
    if (overlapping.length > 0) {
      solution.useAbsolutePositioning = true;
      solution.overlappingElements = overlapping;
      solution.layoutStrategy = 'absolute-overlapping';
      console.log(`🔍 Detected ${overlapping.length} overlapping elements - using absolute positioning`);
    }
    
    // Priority 2: Analyze stacking contexts and z-index layers
    const stackingLayers = this.analyzeStackingContexts(tree);
    if (stackingLayers.length > 1) {
      solution.stackingLayers = stackingLayers;
      solution.useAbsolutePositioning = true;
      solution.layoutStrategy = 'absolute-stacking';
      console.log(`📚 Detected ${stackingLayers.length} stacking layers - using absolute positioning`);
    }
    
    // Priority 3: Check for complex positioning (absolute, fixed, transforms)
    const complexPositioned = this.findComplexPositionedElements(tree);
    if (complexPositioned.length > 0) {
      solution.absolutePositionedNodes.push(...complexPositioned);
      solution.useAbsolutePositioning = true;
      solution.layoutStrategy = 'absolute-complex';
      console.log(`⚡ Detected ${complexPositioned.length} complex positioned elements`);
    }
    
    // Priority 4: Analyze flex/grid containers (only if no complex positioning)
    if (!solution.useAbsolutePositioning) {
      const flexContainers = this.findFlexContainers(tree);
      for (const container of flexContainers) {
        const canUseAutoLayout = this.validateAutoLayoutCompatibility(container);
        if (canUseAutoLayout) {
          solution.autoLayoutNodes.push(container);
          solution.layoutStrategy = 'auto-layout';
        } else {
          solution.absolutePositionedNodes.push(container);
          solution.useAbsolutePositioning = true;
          solution.layoutStrategy = 'absolute-fallback';
        }
      }
    }
    
    // Priority 5: Handle remaining elements based on strategy
    if (solution.useAbsolutePositioning) {
      solution.absolutePositionedNodes.push(...this.getAllElements(tree));
    }
    
    return solution;
  }
  
  /**
   * Detect overlapping elements that require absolute positioning
   */
  private static detectOverlapping(nodes: any[]): any[] {
    const overlapping: any[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (this.rectsOverlap(nodes[i], nodes[j])) {
          if (!overlapping.includes(nodes[i])) overlapping.push(nodes[i]);
          if (!overlapping.includes(nodes[j])) overlapping.push(nodes[j]);
        }
      }
    }
    
    return overlapping;
  }
  
  /**
   * Check if two elements overlap
   */
  private static rectsOverlap(node1: any, node2: any): boolean {
    if (!node1.absoluteLayout || !node2.absoluteLayout) return false;
    
    const rect1 = node1.absoluteLayout;
    const rect2 = node2.absoluteLayout;
    
    return !(
      rect1.right <= rect2.left ||
      rect1.left >= rect2.right ||
      rect1.bottom <= rect2.top ||
      rect1.top >= rect2.bottom
    );
  }
  
  /**
   * Analyze stacking contexts and z-index layers
   */
  private static analyzeStackingContexts(tree: any): StackingLayer[] {
    const layers: StackingLayer[] = [];
    const elements = this.getAllElements(tree);
    
    // Group elements by z-index
    const zIndexGroups = new Map<number, any[]>();
    
    elements.forEach(element => {
      const zIndex = element.stackingContext?.zIndex || 0;
      if (!zIndexGroups.has(zIndex)) {
        zIndexGroups.set(zIndex, []);
      }
      zIndexGroups.get(zIndex)!.push(element);
    });
    
    // Sort z-index groups and create layers
    const sortedZIndexes = Array.from(zIndexGroups.keys()).sort((a, b) => a - b);
    
    sortedZIndexes.forEach((zIndex, index) => {
      layers.push({
        zIndex,
        layerIndex: index,
        elements: zIndexGroups.get(zIndex)!
      });
    });
    
    return layers;
  }
  
  /**
   * Find elements with complex positioning
   */
  private static findComplexPositionedElements(tree: any): any[] {
    const complexElements: any[] = [];
    const elements = this.getAllElements(tree);
    
    elements.forEach(element => {
      const isComplexPositioned = (
        element.position === 'absolute' ||
        element.position === 'fixed' ||
        element.position === 'sticky' ||
        element.transform ||
        element.hasOverlappingElements ||
        (element.stackingContext?.isStackingContext && element.stackingContext.zIndex !== 0)
      );
      
      if (isComplexPositioned) {
        complexElements.push(element);
      }
    });
    
    return complexElements;
  }
  
  /**
   * Find flex containers that might be convertible to Auto Layout
   */
  private static findFlexContainers(tree: any): any[] {
    const flexContainers: any[] = [];
    
    const traverse = (node: any) => {
      if (node.autoLayout?.layoutMode === 'HORIZONTAL' || node.autoLayout?.layoutMode === 'VERTICAL') {
        flexContainers.push(node);
      }
      
      if (node.children) {
        node.children.forEach((child: any) => traverse(child));
      }
    };
    
    traverse(tree);
    return flexContainers;
  }
  
  /**
   * Validate if a flex container can use Figma Auto Layout
   */
  private static validateAutoLayoutCompatibility(container: any): boolean {
    if (!container.children || container.children.length === 0) return false;
    
    // Check for disqualifying conditions
    const hasAbsoluteChildren = container.children.some((child: any) => 
      child.position === 'absolute' || child.position === 'fixed'
    );
    
    const hasOverlappingChildren = container.children.some((child: any) => 
      child.hasOverlappingElements
    );
    
    const hasComplexTransforms = container.children.some((child: any) => 
      child.transform && child.transform.matrix
    );
    
    // Auto Layout incompatible if any disqualifying conditions
    return !(hasAbsoluteChildren || hasOverlappingChildren || hasComplexTransforms);
  }
  
  /**
   * Get all elements in tree (flattened)
   */
  private static getAllElements(tree: any): any[] {
    const elements: any[] = [];
    
    const traverse = (node: any) => {
      elements.push(node);
      if (node.children) {
        node.children.forEach((child: any) => traverse(child));
      }
    };
    
    traverse(tree);
    return elements;
  }
  
  /**
   * Apply the solved layout strategy to Figma nodes
   */
  static applyLayoutSolution(
    solution: LayoutSolution,
    rootFrame: FrameNode,
    nodeMap: Map<string, SceneNode>
  ): void {
    
    console.log(`🎯 Applying layout strategy: ${solution.layoutStrategy}`);
    
    if (solution.useAbsolutePositioning) {
      // Disable Auto Layout on root frame for absolute positioning
      rootFrame.layoutMode = 'NONE';
      
      // Apply absolute positioning to all elements
      solution.absolutePositionedNodes.forEach(nodeData => {
        const figmaNode = nodeMap.get(nodeData.id);
        if (figmaNode && nodeData.absoluteLayout) {
          this.applyAbsolutePositioning(figmaNode, nodeData);
        }
      });
      
      // Handle stacking layers
      if (solution.stackingLayers.length > 0) {
        this.applyStackingOrder(solution.stackingLayers, nodeMap);
      }
      
    } else {
      // Use Auto Layout approach
      solution.autoLayoutNodes.forEach(nodeData => {
        const figmaNode = nodeMap.get(nodeData.id);
        if (figmaNode && 'layoutMode' in figmaNode && nodeData.autoLayout) {
          this.applyAutoLayout(figmaNode as FrameNode, nodeData.autoLayout);
        }
      });
    }
  }
  
  /**
   * Apply absolute positioning to a Figma node
   */
  private static applyAbsolutePositioning(node: SceneNode, nodeData: any): void {
    if (nodeData.absoluteLayout) {
      node.x = nodeData.absoluteLayout.left;
      node.y = nodeData.absoluteLayout.top;
      
      if ('resize' in node) {
        (node as any).resize(
          Math.max(nodeData.absoluteLayout.width, 1),
          Math.max(nodeData.absoluteLayout.height, 1)
        );
      }
    }
  }
  
  /**
   * Apply stacking order based on z-index
   */
  private static applyStackingOrder(layers: StackingLayer[], nodeMap: Map<string, SceneNode>): void {
    layers.forEach(layer => {
      layer.elements.forEach(element => {
        const figmaNode = nodeMap.get(element.id);
        if (figmaNode && figmaNode.parent) {
          // Move to front for higher z-index
          const parent = figmaNode.parent;
          if ('appendChild' in parent) {
            (parent as any).appendChild(figmaNode);
          }
        }
      });
    });
  }
  
  /**
   * Apply Auto Layout to a frame
   */
  private static applyAutoLayout(frame: FrameNode, autoLayoutData: any): void {
    frame.layoutMode = autoLayoutData.layoutMode;
    frame.primaryAxisAlignItems = autoLayoutData.primaryAxisAlignItems;
    frame.counterAxisAlignItems = autoLayoutData.counterAxisAlignItems;
    frame.itemSpacing = autoLayoutData.itemSpacing;
    frame.paddingTop = autoLayoutData.paddingTop;
    frame.paddingRight = autoLayoutData.paddingRight;
    frame.paddingBottom = autoLayoutData.paddingBottom;
    frame.paddingLeft = autoLayoutData.paddingLeft;
  }
}

export interface LayoutSolution {
  useAbsolutePositioning: boolean;
  autoLayoutNodes: any[];
  absolutePositionedNodes: any[];
  overlappingElements: any[];
  stackingLayers: StackingLayer[];
  layoutStrategy: 'auto' | 'auto-layout' | 'absolute-overlapping' | 'absolute-stacking' | 'absolute-complex' | 'absolute-fallback';
}

export interface StackingLayer {
  zIndex: number;
  layerIndex: number;
  elements: any[];
}