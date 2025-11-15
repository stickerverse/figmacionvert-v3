/**
 * WTF (Web To Figma) File Format Generator
 * Creates ZIP archives containing webpage capture data
 */

import JSZip from 'jszip';

export interface WTFManifest {
  version: string;
  generator: string;
  url: string;
  capturedAt: string;
  viewport: {
    width: number;
    height: number;
  };
  screenshot: {
    file: string;
    width: number;
    height: number;
  };
  schema: {
    file: string;
    elementCount: number;
    nodeCount: number;
  };
  images: {
    count: number;
    totalSizeBytes: number;
    format: string;
  };
  features: {
    autoLayout: boolean;
    components: boolean;
    variants: boolean;
    screenshots: boolean;
  };
}

export interface WTFGeneratorOptions {
  schema: any; // WebToFigmaSchema
  screenshot: Blob;
  url: string;
  viewport: { width: number; height: number };
}

/**
 * Generates a .wtf file (ZIP archive) from captured webpage data
 */
export class WTFGenerator {
  private zip: JSZip;

  constructor() {
    this.zip = new JSZip();
  }

  /**
   * Create a .wtf file from schema and screenshot
   */
  async generate(options: WTFGeneratorOptions): Promise<Blob> {
    const { schema, screenshot, url, viewport } = options;

    // Create manifest
    const manifest = await this.createManifest(schema, screenshot, url, viewport);
    this.zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Add schema
    this.zip.file('schema.json', JSON.stringify(schema, null, 2));

    // Add screenshot
    this.zip.file('screenshot.png', screenshot);

    // Generate ZIP blob
    const blob = await this.zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // Balance between speed and compression
      }
    });

    return blob;
  }

  /**
   * Create manifest.json from schema metadata
   */
  private async createManifest(
    schema: any,
    screenshot: Blob,
    url: string,
    viewport: { width: number; height: number }
  ): Promise<WTFManifest> {
    // Get screenshot dimensions
    const screenshotDimensions = await this.getImageDimensions(screenshot);

    // Count elements and nodes recursively
    const counts = this.countNodes(schema.tree);

    // Count images
    const imageCount = Object.keys(schema.assets?.images || {}).length;
    const imageTotalSize = this.calculateImageSize(schema.assets?.images || {});

    return {
      version: '1.0.0',
      generator: 'Web To Figma Chrome Extension',
      url,
      capturedAt: new Date().toISOString(),
      viewport,
      screenshot: {
        file: 'screenshot.png',
        width: screenshotDimensions.width,
        height: screenshotDimensions.height
      },
      schema: {
        file: 'schema.json',
        elementCount: counts.elements,
        nodeCount: counts.nodes
      },
      images: {
        count: imageCount,
        totalSizeBytes: imageTotalSize,
        format: 'base64'
      },
      features: {
        autoLayout: true,
        components: !!schema.components,
        variants: !!schema.variants,
        screenshots: true
      }
    };
  }

  /**
   * Get image dimensions from blob
   */
  private getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Recursively count elements and nodes in tree
   */
  private countNodes(node: any): { elements: number; nodes: number } {
    if (!node) return { elements: 0, nodes: 0 };

    let elements = 1;
    let nodes = 1;

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const childCounts = this.countNodes(child);
        elements += childCounts.elements;
        nodes += childCounts.nodes;
      }
    }

    return { elements, nodes };
  }

  /**
   * Calculate total size of images in bytes
   */
  private calculateImageSize(images: Record<string, any>): number {
    let totalSize = 0;

    for (const hash in images) {
      const image = images[hash];
      if (image.base64) {
        // Estimate base64 size (rough approximation)
        totalSize += image.base64.length * 0.75; // base64 is ~33% larger than binary
      }
    }

    return Math.round(totalSize);
  }
}

/**
 * Helper function to generate .wtf filename
 */
export function generateWTFFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'index';
    const timestamp = new Date().toISOString().split('T')[0];

    const cleanPath = path.substring(0, 50); // Limit length
    return `${domain}${cleanPath ? '-' + cleanPath : ''}-${timestamp}.wtf`;
  } catch {
    const timestamp = new Date().toISOString().split('T')[0];
    return `webpage-${timestamp}.wtf`;
  }
}
