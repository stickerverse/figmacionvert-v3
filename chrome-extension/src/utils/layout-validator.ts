/**
 * Layout Validator - Ensures extracted elements have correct positions and layout
 * Detects common issues that would cause incorrect Figma rendering
 */

import { 
  ElementNode, 
  WebToFigmaSchema, 
  ValidationIssue, 
  ValidationReport, 
  PositionAccuracy, 
  TransformValidation, 
  ValidationThresholds 
} from '../types/schema';

export class LayoutValidator {
  private issues: ValidationIssue[] = [];
  private stats = {
    zeroSizeNodes: 0,
    offScreenNodes: 0,
    overlappingNodes: 0,
    missingLayoutNodes: 0,
    negativePositions: 0,
    inaccuratePositions: 0,
    degenerateTransforms: 0,
    unsupported3DTransforms: 0,
    layoutStructureIssues: 0
  };
  private totalNodes = 0;
  private viewportWidth: number;
  private viewportHeight: number;
  private thresholds: ValidationThresholds;
  private accuracyMetrics = {
    totalDeltaX: 0,
    totalDeltaY: 0,
    totalConfidence: 0,
    worstDelta: 0,
    coordinateSystemsUsed: new Set<string>()
  };

  constructor(
    viewportWidth: number, 
    viewportHeight: number,
    thresholds: Partial<ValidationThresholds> = {}
  ) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.thresholds = {
      positionTolerance: 1.0, // 1 pixel tolerance
      sizeTolerance: 1.0,
      confidenceThreshold: 0.8,
      transformDeterminantThreshold: 0.001,
      ...thresholds
    };
  }

  /**
   * Validate the entire schema tree
   */
  validate(schema: WebToFigmaSchema): ValidationReport {
    this.issues = [];
    this.stats = {
      zeroSizeNodes: 0,
      offScreenNodes: 0,
      overlappingNodes: 0,
      missingLayoutNodes: 0,
      negativePositions: 0,
      inaccuratePositions: 0,
      degenerateTransforms: 0,
      unsupported3DTransforms: 0,
      layoutStructureIssues: 0
    };
    this.totalNodes = 0;
    this.accuracyMetrics = {
      totalDeltaX: 0,
      totalDeltaY: 0,
      totalConfidence: 0,
      worstDelta: 0,
      coordinateSystemsUsed: new Set<string>()
    };

    // Validate the tree
    this.validateNode(schema.tree);

    // Check for overlapping siblings at each level
    this.checkOverlappingSiblings(schema.tree);

    // Calculate accuracy metrics
    const avgPositionAccuracy = this.totalNodes > 0 
      ? Math.sqrt((this.accuracyMetrics.totalDeltaX ** 2 + this.accuracyMetrics.totalDeltaY ** 2) / this.totalNodes)
      : 0;
    
    const avgConfidence = this.totalNodes > 0
      ? this.accuracyMetrics.totalConfidence / this.totalNodes
      : 1;

    return {
      valid: this.issues.filter(i => i.severity === 'error').length === 0,
      totalNodes: this.totalNodes,
      issuesCount: this.issues.length,
      issues: this.issues,
      stats: this.stats,
      accuracyMetrics: {
        averagePositionAccuracy: avgPositionAccuracy,
        worstPositionDelta: this.accuracyMetrics.worstDelta,
        averageConfidence: avgConfidence,
        coordinateSystemsUsed: Array.from(this.accuracyMetrics.coordinateSystemsUsed)
      },
      thresholds: this.thresholds
    };
  }

  /**
   * Validate a single node and its children recursively
   */
  private validateNode(node: ElementNode, parentBounds?: { x: number; y: number; width: number; height: number }) {
    this.totalNodes++;

    // Check if layout exists
    if (!node.layout) {
      this.stats.missingLayoutNodes++;
      this.issues.push({
        severity: 'error',
        type: 'layout',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Node is missing layout information',
        suggestion: 'This node may not render correctly in Figma'
      });
      return;
    }

    const { x, y, width, height } = node.layout;

    // Check for zero or negative dimensions
    if (width <= 0 || height <= 0) {
      this.stats.zeroSizeNodes++;
      this.issues.push({
        severity: 'warning',
        type: 'sizing',
        nodeId: node.id,
        nodeName: node.name,
        message: `Node has zero or negative size: ${width}x${height}`,
        suggestion: 'Zero-size nodes may be invisible in Figma'
      });
    }

    // Check for extremely large dimensions (likely errors)
    if (width > 50000 || height > 50000) {
      this.issues.push({
        severity: 'warning',
        type: 'sizing',
        nodeId: node.id,
        nodeName: node.name,
        message: `Node has unusually large dimensions: ${width}x${height}`,
        suggestion: 'This may indicate a layout calculation error'
      });
    }

    // Check for negative positions (relative to parent)
    if (x < 0 || y < 0) {
      this.stats.negativePositions++;
      this.issues.push({
        severity: 'info',
        type: 'positioning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Node has negative position: (${x}, ${y})`,
        suggestion: 'Negative positions are valid but may indicate overflow content'
      });
    }

    // Check if node is way off-screen (not just partially)
    const absoluteX = node.absoluteLayout?.left ?? x;
    const absoluteY = node.absoluteLayout?.top ?? y;

    if (absoluteX > this.viewportWidth * 2 || absoluteY > this.viewportHeight * 2) {
      this.stats.offScreenNodes++;
      this.issues.push({
        severity: 'info',
        type: 'positioning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Node is far off-screen: (${absoluteX}, ${absoluteY})`,
        suggestion: 'This may be intentional (hidden content, modals, etc.)'
      });
    }

    // Validate coordinate accuracy if multiple coordinate systems are available
    this.validateCoordinateAccuracy(node);

    // Validate transforms if present
    this.validateTransforms(node);

    // Validate layout structure decisions
    this.validateLayoutStructure(node);

    // Validate Auto Layout if present
    if (node.autoLayout) {
      this.validateAutoLayout(node);
    }

    // Recursively validate children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        this.validateNode(child, { x, y, width, height });
      }
    }
  }

  /**
   * Validate Auto Layout configuration
   */
  private validateAutoLayout(node: ElementNode) {
    const autoLayout = node.autoLayout;
    if (!autoLayout) return;

    // Check for invalid layout mode
    if (!['HORIZONTAL', 'VERTICAL', 'NONE'].includes(autoLayout.layoutMode)) {
      this.issues.push({
        severity: 'error',
        type: 'layout',
        nodeId: node.id,
        nodeName: node.name,
        message: `Invalid Auto Layout mode: ${autoLayout.layoutMode}`,
        suggestion: 'Valid modes are HORIZONTAL, VERTICAL, or NONE'
      });
    }

    // Check for negative padding
    if (autoLayout.paddingTop < 0 || autoLayout.paddingRight < 0 ||
        autoLayout.paddingBottom < 0 || autoLayout.paddingLeft < 0) {
      this.issues.push({
        severity: 'warning',
        type: 'layout',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Auto Layout has negative padding values',
        suggestion: 'Negative padding may not render correctly in Figma'
      });
    }

    // Check for negative item spacing
    if (autoLayout.itemSpacing < 0) {
      this.issues.push({
        severity: 'warning',
        type: 'layout',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Auto Layout has negative item spacing',
        suggestion: 'Negative spacing may cause overlapping elements'
      });
    }
  }

  /**
   * Validate Grid Layout configuration
   */
  private validateGridLayout(node: ElementNode) {
    const gridLayout = node.gridLayout;
    if (!gridLayout) return;

    // Grid layouts are stored as metadata since Figma doesn't have native grid support
    // Just validate that the data is present
    if (!gridLayout.templateColumns || !gridLayout.templateRows) {
      this.issues.push({
        severity: 'info',
        type: 'layout',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Grid layout is incomplete (missing template columns or rows)',
        suggestion: 'Grid will be stored as metadata but rendered as Auto Layout in Figma'
      });
    }
  }

  /**
   * Check for overlapping sibling nodes (potential layout issues)
   */
  private checkOverlappingSiblings(node: ElementNode) {
    if (!node.children || node.children.length < 2) return;

    // Only check for overlaps in manual layout (not Auto Layout)
    if (node.autoLayout && node.autoLayout.layoutMode !== 'NONE') {
      // Auto Layout handles positioning, so overlaps are expected
      for (const child of node.children) {
        this.checkOverlappingSiblings(child);
      }
      return;
    }

    // Check each pair of siblings for overlap
    for (let i = 0; i < node.children.length; i++) {
      for (let j = i + 1; j < node.children.length; j++) {
        const childA = node.children[i];
        const childB = node.children[j];

        if (!childA.layout || !childB.layout) continue;

        const overlapAmount = this.calculateOverlap(
          childA.layout.x,
          childA.layout.y,
          childA.layout.width,
          childA.layout.height,
          childB.layout.x,
          childB.layout.y,
          childB.layout.width,
          childB.layout.height
        );

        if (overlapAmount > 0) {
          this.stats.overlappingNodes++;

          // Only report significant overlaps (> 10% of smaller node's area)
          const areaA = childA.layout.width * childA.layout.height;
          const areaB = childB.layout.width * childB.layout.height;
          const smallerArea = Math.min(areaA, areaB);

          if (overlapAmount > smallerArea * 0.1) {
            this.issues.push({
              severity: 'info',
              type: 'positioning',
              nodeId: childA.id,
              nodeName: childA.name,
              message: `Node overlaps with sibling "${childB.name}"`,
              suggestion: 'Overlapping nodes may indicate z-index layering or absolute positioning'
            });
          }
        }
      }
    }

    // Recursively check children
    for (const child of node.children) {
      this.checkOverlappingSiblings(child);
    }
  }

  /**
   * Calculate overlap area between two rectangles
   */
  private calculateOverlap(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): number {
    const left = Math.max(x1, x2);
    const right = Math.min(x1 + w1, x2 + w2);
    const top = Math.max(y1, y2);
    const bottom = Math.min(y1 + h1, y2 + h2);

    if (left < right && top < bottom) {
      return (right - left) * (bottom - top);
    }
    return 0;
  }

  /**
   * Validate coordinate accuracy using multiple coordinate systems
   */
  private validateCoordinateAccuracy(node: ElementNode): PositionAccuracy | null {
    // Only validate if we have multiple coordinate systems available
    if (!node.viewportLayout || !node.absoluteLayout || !node.layout) {
      return null;
    }

    const scrollX = (typeof window !== 'undefined' ? window.pageXOffset || window.scrollX : 0) || 0;
    const scrollY = (typeof window !== 'undefined' ? window.pageYOffset || window.scrollY : 0) || 0;

    // Calculate expected absolute position from viewport position + scroll
    const expectedAbsoluteX = node.viewportLayout.left + scrollX;
    const expectedAbsoluteY = node.viewportLayout.top + scrollY;

    // Calculate deltas between coordinate systems
    const deltaX = Math.abs(node.absoluteLayout.left - expectedAbsoluteX);
    const deltaY = Math.abs(node.absoluteLayout.top - expectedAbsoluteY);

    // Calculate confidence based on how close the coordinates match
    const maxDelta = Math.max(deltaX, deltaY);
    const confidence = Math.max(0, 1 - (maxDelta / this.thresholds.positionTolerance));

    const accuracy: PositionAccuracy = {
      isAccurate: deltaX <= this.thresholds.positionTolerance && deltaY <= this.thresholds.positionTolerance,
      deltaX,
      deltaY,
      confidence,
      coordinateSystem: 'dual-coordinate',
      validationMethod: 'scroll-adjusted'
    };

    // Track metrics
    this.accuracyMetrics.totalDeltaX += deltaX;
    this.accuracyMetrics.totalDeltaY += deltaY;
    this.accuracyMetrics.totalConfidence += confidence;
    this.accuracyMetrics.worstDelta = Math.max(this.accuracyMetrics.worstDelta, maxDelta);
    this.accuracyMetrics.coordinateSystemsUsed.add('dual-coordinate');

    // Report issues if accuracy is poor
    if (!accuracy.isAccurate) {
      this.stats.inaccuratePositions++;
      
      const severity = maxDelta > this.thresholds.positionTolerance * 5 ? 'warning' : 'info';
      
      this.issues.push({
        severity,
        type: 'coordinate-accuracy',
        nodeId: node.id,
        nodeName: node.name,
        message: `Coordinate accuracy issue: ${maxDelta.toFixed(2)}px delta between coordinate systems`,
        suggestion: 'This may indicate transform or positioning calculation errors',
        accuracy,
        delta: { x: deltaX, y: deltaY },
        confidence: confidence
      });
    }

    // Warn about very low confidence even if within tolerance
    if (confidence < this.thresholds.confidenceThreshold) {
      this.issues.push({
        severity: 'info',
        type: 'coordinate-accuracy',
        nodeId: node.id,
        nodeName: node.name,
        message: `Low positioning confidence: ${(confidence * 100).toFixed(1)}%`,
        suggestion: 'Position may not be accurately represented in Figma',
        accuracy,
        confidence: confidence
      });
    }

    return accuracy;
  }

  /**
   * Validate CSS transforms and detect degenerate transforms
   */
  private validateTransforms(node: ElementNode): TransformValidation | null {
    // Check if node has transform data
    if (!node.transform) {
      return null;
    }

    const warnings: string[] = [];
    let isDegenerate = false;
    let hasUnsupported3D = false;
    let determinant = 1;

    // Validate transform matrix if present (Transform2D is [[number, number, number], [number, number, number]])
    if (node.transform && Array.isArray(node.transform) && node.transform.length === 2) {
      const [[a, c, tx], [b, d, ty]] = node.transform;
      
      // Calculate determinant (ad - bc)
      determinant = a * d - b * c;
      
      // Check for degenerate transform (determinant near zero)
      if (Math.abs(determinant) < this.thresholds.transformDeterminantThreshold) {
        isDegenerate = true;
        this.stats.degenerateTransforms++;
        warnings.push('Transform matrix is degenerate (determinant ≈ 0)');
      }

      // Check for extreme scaling
      const scaleX = Math.sqrt(a * a + b * b);
      const scaleY = Math.sqrt(c * c + d * d);
      
      if (scaleX < 0.01 || scaleY < 0.01) {
        warnings.push('Extreme scaling detected that may cause rendering issues');
      }
      
      if (scaleX > 100 || scaleY > 100) {
        warnings.push('Very large scaling detected that may cause performance issues');
      }
    }

    // For now, we can't easily detect 3D transforms from the Transform2D matrix
    // 3D transform detection would require access to the original CSS transform functions
    // This is a limitation we'll note but won't error on
    hasUnsupported3D = false;

    const validation: TransformValidation = {
      isValid: !isDegenerate && warnings.length === 0,
      isDegenerate,
      hasUnsupported3D,
      determinant,
      warnings
    };

    // Report transform issues
    if (isDegenerate) {
      this.issues.push({
        severity: 'warning',
        type: 'transform',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Degenerate transform matrix detected',
        suggestion: 'This element may not render correctly in Figma due to invalid transform'
      });
    }

    if (hasUnsupported3D) {
      this.issues.push({
        severity: 'info',
        type: 'transform',
        nodeId: node.id,
        nodeName: node.name,
        message: '3D transform properties detected',
        suggestion: '3D transforms will be flattened to 2D in Figma'
      });
    }

    return validation;
  }

  /**
   * Validate layout structure decisions (Auto Layout vs absolute positioning)
   */
  private validateLayoutStructure(node: ElementNode): void {
    if (!node.children || node.children.length === 0) {
      return;
    }

    const hasAutoLayout = node.autoLayout && node.autoLayout.layoutMode !== 'NONE';
    
    // Check if this should be Auto Layout but isn't
    if (!hasAutoLayout && node.children.length >= 2) {
      const childrenWithLayout = node.children.filter(child => child.layout);
      
      if (childrenWithLayout.length >= 2) {
        // Check if children are arranged in a row or column
        const isLinearArrangement = this.detectLinearArrangement(childrenWithLayout);
        
        if (isLinearArrangement.isLinear && isLinearArrangement.confidence > 0.8) {
          this.stats.layoutStructureIssues++;
          
          this.issues.push({
            severity: 'info',
            type: 'structure',
            nodeId: node.id,
            nodeName: node.name,
            message: `Children appear to be arranged ${isLinearArrangement.direction} but Auto Layout is not used`,
            suggestion: 'Consider using Auto Layout for more maintainable designs in Figma',
            confidence: isLinearArrangement.confidence
          });
        }
      }
    }

    // Check for overlapping elements that might indicate z-index layering
    if (hasAutoLayout && node.hasOverlappingElements) {
      this.issues.push({
        severity: 'warning',
        type: 'structure',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Auto Layout container has overlapping elements',
        suggestion: 'Overlapping elements in Auto Layout may not render as expected'
      });
    }
  }

  /**
   * Detect if children are arranged in a linear pattern
   */
  private detectLinearArrangement(children: ElementNode[]): {
    isLinear: boolean;
    direction: 'horizontally' | 'vertically';
    confidence: number;
  } {
    if (children.length < 2) {
      return { isLinear: false, direction: 'horizontally', confidence: 0 };
    }

    // Sort children by position
    const sortedByX = [...children].sort((a, b) => a.layout!.x - b.layout!.x);
    const sortedByY = [...children].sort((a, b) => a.layout!.y - b.layout!.y);

    // Check horizontal alignment
    const horizontalAligned = this.checkAlignment(sortedByX, 'horizontal');
    const verticalAligned = this.checkAlignment(sortedByY, 'vertical');

    if (horizontalAligned.confidence > verticalAligned.confidence) {
      return {
        isLinear: horizontalAligned.confidence > 0.7,
        direction: 'horizontally',
        confidence: horizontalAligned.confidence
      };
    } else {
      return {
        isLinear: verticalAligned.confidence > 0.7,
        direction: 'vertically',
        confidence: verticalAligned.confidence
      };
    }
  }

  /**
   * Check if elements are aligned in a direction
   */
  private checkAlignment(elements: ElementNode[], direction: 'horizontal' | 'vertical'): {
    confidence: number;
  } {
    if (elements.length < 2) {
      return { confidence: 0 };
    }

    const positions = elements.map(el => 
      direction === 'horizontal' ? el.layout!.y : el.layout!.x
    );

    // Calculate variance in the perpendicular direction
    const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = better alignment
    // Convert to confidence score (0-1)
    const confidence = Math.max(0, 1 - (standardDeviation / 50)); // 50px tolerance

    return { confidence };
  }

  /**
   * Generate a summary report string
   */
  static generateSummary(report: ValidationReport): string {
    const lines = [];

    lines.push(`Validation Complete: ${report.valid ? '✅ PASSED' : '⚠️ ISSUES FOUND'}`);
    lines.push(`Total Nodes: ${report.totalNodes}`);
    lines.push(`Issues Found: ${report.issuesCount}`);

    if (report.issuesCount > 0) {
      const errors = report.issues.filter(i => i.severity === 'error').length;
      const warnings = report.issues.filter(i => i.severity === 'warning').length;
      const info = report.issues.filter(i => i.severity === 'info').length;

      lines.push('');
      if (errors > 0) lines.push(`❌ Errors: ${errors}`);
      if (warnings > 0) lines.push(`⚠️ Warnings: ${warnings}`);
      if (info > 0) lines.push(`ℹ️ Info: ${info}`);
    }

    // Add accuracy metrics
    if (report.accuracyMetrics) {
      lines.push('');
      lines.push('Positioning Accuracy:');
      lines.push(`  • Average accuracy: ${report.accuracyMetrics.averagePositionAccuracy.toFixed(2)}px`);
      lines.push(`  • Worst position delta: ${report.accuracyMetrics.worstPositionDelta.toFixed(2)}px`);
      lines.push(`  • Average confidence: ${(report.accuracyMetrics.averageConfidence * 100).toFixed(1)}%`);
      if (report.accuracyMetrics.coordinateSystemsUsed.length > 0) {
        lines.push(`  • Coordinate systems: ${report.accuracyMetrics.coordinateSystemsUsed.join(', ')}`);
      }
    }

    // Add detailed statistics
    const hasAnyStats = Object.values(report.stats).some(value => value > 0);
    if (hasAnyStats) {
      lines.push('');
      lines.push('Issue Statistics:');
      if (report.stats.zeroSizeNodes > 0) {
        lines.push(`  • Zero-size nodes: ${report.stats.zeroSizeNodes}`);
      }
      if (report.stats.offScreenNodes > 0) {
        lines.push(`  • Off-screen nodes: ${report.stats.offScreenNodes}`);
      }
      if (report.stats.overlappingNodes > 0) {
        lines.push(`  • Overlapping nodes: ${report.stats.overlappingNodes}`);
      }
      if (report.stats.negativePositions > 0) {
        lines.push(`  • Negative positions: ${report.stats.negativePositions}`);
      }
      if (report.stats.inaccuratePositions > 0) {
        lines.push(`  • Inaccurate positions: ${report.stats.inaccuratePositions}`);
      }
      if (report.stats.degenerateTransforms > 0) {
        lines.push(`  • Degenerate transforms: ${report.stats.degenerateTransforms}`);
      }
      if (report.stats.unsupported3DTransforms > 0) {
        lines.push(`  • 3D transforms: ${report.stats.unsupported3DTransforms}`);
      }
      if (report.stats.layoutStructureIssues > 0) {
        lines.push(`  • Layout structure issues: ${report.stats.layoutStructureIssues}`);
      }
    }

    return lines.join('\n');
  }
}
