/**
 * Preview Generator - Creates visual overlays showing extracted elements on screenshots
 * Helps visualize what will be rendered in Figma
 */

import { ElementNode } from '../types/schema';

export interface PreviewOptions {
  showBoundingBoxes: boolean;
  showLabels: boolean;
  colorByType: boolean;
  highlightIssues: boolean;
  maxLabels?: number;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  FRAME: 'rgba(99, 102, 241, 0.5)',      // Indigo
  TEXT: 'rgba(16, 185, 129, 0.5)',        // Green
  RECTANGLE: 'rgba(59, 130, 246, 0.5)',   // Blue
  IMAGE: 'rgba(236, 72, 153, 0.5)',       // Pink
  VECTOR: 'rgba(251, 146, 60, 0.5)',      // Orange
  COMPONENT: 'rgba(168, 85, 247, 0.5)',   // Purple
  INSTANCE: 'rgba(139, 92, 246, 0.5)'     // Violet
};

export class PreviewGenerator {
  /**
   * Generate a preview image with element overlays
   */
  static async generatePreview(
    screenshotDataUrl: string,
    tree: ElementNode,
    options: PreviewOptions = {
      showBoundingBoxes: true,
      showLabels: false,
      colorByType: true,
      highlightIssues: false
    }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Create canvas matching screenshot size
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw the screenshot
          ctx.drawImage(img, 0, 0);

          // Draw overlays
          if (options.showBoundingBoxes) {
            this.drawBoundingBoxes(ctx, tree, options);
          }

          // Convert to data URL
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load screenshot image'));
      };

      img.src = screenshotDataUrl;
    });
  }

  /**
   * Draw bounding boxes for all nodes
   */
  private static drawBoundingBoxes(
    ctx: CanvasRenderingContext2D,
    node: ElementNode,
    options: PreviewOptions,
    depth: number = 0
  ) {
    if (!node.layout) return;

    const { x, y, width, height } = node.layout;

    // Use absolute layout if available (more accurate for visualization)
    const absoluteX = node.absoluteLayout?.left ?? x;
    const absoluteY = node.absoluteLayout?.top ?? y;

    // Determine color
    let strokeColor = options.colorByType
      ? (NODE_TYPE_COLORS[node.type] || 'rgba(156, 163, 175, 0.5)')
      : `rgba(59, 130, 246, ${Math.max(0.3, 1 - depth * 0.1)})`;

    // Highlight issues (zero size, off-screen, etc.)
    if (options.highlightIssues) {
      if (width <= 0 || height <= 0) {
        strokeColor = 'rgba(239, 68, 68, 0.8)'; // Red for zero-size
      } else if (absoluteX < 0 || absoluteY < 0) {
        strokeColor = 'rgba(251, 146, 60, 0.6)'; // Orange for negative position
      }
    }

    // Draw bounding box
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(1, 3 - depth * 0.5);
    ctx.strokeRect(absoluteX, absoluteY, width, height);

    // Draw label if enabled
    if (options.showLabels && depth < (options.maxLabels ?? 3)) {
      this.drawLabel(ctx, node, absoluteX, absoluteY, width, height);
    }

    // Draw fill for very small elements to make them visible
    if (width < 5 || height < 5) {
      ctx.fillStyle = strokeColor;
      ctx.fillRect(absoluteX, absoluteY, Math.max(width, 5), Math.max(height, 5));
    }

    // Recursively draw children
    if (node.children) {
      for (const child of node.children) {
        this.drawBoundingBoxes(ctx, child, options, depth + 1);
      }
    }
  }

  /**
   * Draw a label for a node
   */
  private static drawLabel(
    ctx: CanvasRenderingContext2D,
    node: ElementNode,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const text = `${node.type}: ${node.name}`;
    const fontSize = 12;
    ctx.font = `${fontSize}px sans-serif`;

    // Measure text
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Position label at top of box (or inside if box is large enough)
    let labelX = x + 4;
    let labelY = height > 30 ? y + textHeight + 4 : y - 4;

    // Draw label background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(labelX - 2, labelY - textHeight, textWidth + 4, textHeight + 4);

    // Draw label text
    ctx.fillStyle = 'white';
    ctx.fillText(text, labelX, labelY);
  }

  /**
   * Generate a simplified minimap showing overall layout structure
   */
  static generateMinimap(
    tree: ElementNode,
    viewportWidth: number,
    viewportHeight: number,
    minimapSize: { width: number; height: number } = { width: 300, height: 200 }
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = minimapSize.width;
    canvas.height = minimapSize.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Calculate scale
    const scaleX = minimapSize.width / viewportWidth;
    const scaleY = minimapSize.height / viewportHeight;
    const scale = Math.min(scaleX, scaleY);

    // Fill background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, minimapSize.width, minimapSize.height);

    // Draw viewport boundary
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, viewportWidth * scale, viewportHeight * scale);

    // Draw all nodes as simple rectangles
    this.drawMinimapNode(ctx, tree, scale);

    return canvas.toDataURL('image/png');
  }

  /**
   * Draw a node on the minimap
   */
  private static drawMinimapNode(
    ctx: CanvasRenderingContext2D,
    node: ElementNode,
    scale: number
  ) {
    if (!node.layout) return;

    const x = node.layout.x * scale;
    const y = node.layout.y * scale;
    const width = Math.max(1, node.layout.width * scale);
    const height = Math.max(1, node.layout.height * scale);

    // Different colors for different node types
    const color = NODE_TYPE_COLORS[node.type] || 'rgba(156, 163, 175, 0.3)';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    // Draw border for frames
    if (node.type === 'FRAME') {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }

    // Recursively draw children
    if (node.children) {
      for (const child of node.children) {
        this.drawMinimapNode(ctx, child, scale);
      }
    }
  }

  /**
   * Generate statistics visualization showing node type distribution
   */
  static generateStatsChart(tree: ElementNode): { [type: string]: number } {
    const stats: { [type: string]: number } = {};

    const countNodes = (node: ElementNode) => {
      stats[node.type] = (stats[node.type] || 0) + 1;
      if (node.children) {
        for (const child of node.children) {
          countNodes(child);
        }
      }
    };

    countNodes(tree);
    return stats;
  }
}
