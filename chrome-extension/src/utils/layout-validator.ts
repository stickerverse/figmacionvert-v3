/**
 * Layout Validator - Ensures extracted elements have correct positions and layout
 * Detects common issues that would cause incorrect Figma rendering
 */

import { ElementNode, WebToFigmaSchema } from '../types/schema';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  type: 'positioning' | 'sizing' | 'layout' | 'structure';
  nodeId: string;
  nodeName: string;
  message: string;
  suggestion?: string;
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
  };
}

export class LayoutValidator {
  private issues: ValidationIssue[] = [];
  private stats = {
    zeroSizeNodes: 0,
    offScreenNodes: 0,
    overlappingNodes: 0,
    missingLayoutNodes: 0,
    negativePositions: 0
  };
  private totalNodes = 0;
  private viewportWidth: number;
  private viewportHeight: number;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
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
      negativePositions: 0
    };
    this.totalNodes = 0;

    // Validate the tree
    this.validateNode(schema.tree);

    // Check for overlapping siblings at each level
    this.checkOverlappingSiblings(schema.tree);

    return {
      valid: this.issues.filter(i => i.severity === 'error').length === 0,
      totalNodes: this.totalNodes,
      issuesCount: this.issues.length,
      issues: this.issues,
      stats: this.stats
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

    // Validate Auto Layout if present
    if (node.autoLayout) {
      this.validateAutoLayout(node);
    }

    // Validate Grid Layout if present
    if (node.gridLayout) {
      this.validateGridLayout(node);
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

    if (report.stats.zeroSizeNodes > 0 || report.stats.offScreenNodes > 0 ||
        report.stats.overlappingNodes > 0 || report.stats.negativePositions > 0) {
      lines.push('');
      lines.push('Statistics:');
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
    }

    return lines.join('\n');
  }
}
