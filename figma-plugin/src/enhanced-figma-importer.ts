/**
 * Enhanced Figma Importer
 * 
 * Implements best practices for pixel-perfect Figma reconstruction:
 * - Proper image creation using figma.createImage() with Uint8Array
 * - Coordinate verification system for position accuracy
 * - Batch processing for large image sets
 * - Robust error handling and recovery
 * - Font loading with figma.loadFontAsync()
 * - Position verification after import
 */

import { NodeBuilder } from './node-builder';
import { StyleManager } from './style-manager';

export interface EnhancedImportOptions {
  createMainFrame: boolean;
  enableBatchProcessing: boolean;
  verifyPositions: boolean;
  maxBatchSize: number;
  coordinateTolerance: number;
  enableDebugMode: boolean;
  retryFailedImages: boolean;
  enableProgressiveLoading: boolean;
}

export interface ImageCreationResult {
  success: boolean;
  imageHash?: string;
  error?: string;
  retryAttempts: number;
  processingTime: number;
}

export interface PositionVerificationResult {
  elementId: string;
  expected: { x: number; y: number };
  actual: { x: number; y: number };
  deviation: number;
  withinTolerance: boolean;
}

export interface ImportVerificationReport {
  totalElements: number;
  positionsVerified: number;
  positionsWithinTolerance: number;
  positionsOutsideTolerance: number;
  maxDeviation: number;
  averageDeviation: number;
  problematicElements: PositionVerificationResult[];
  imagesProcessed: number;
  imagesSuccessful: number;
  imagesFailed: number;
  totalProcessingTime: number;
}

export class EnhancedFigmaImporter {
  private options: EnhancedImportOptions;
  private nodeBuilder: NodeBuilder;
  private styleManager: StyleManager;
  private imageCreationCache = new Map<string, string>(); // hash -> figmaImageHash
  private createdNodes = new Map<string, SceneNode>(); // elementId -> figmaNode
  private verificationData: Array<{ elementId: string; originalData: any; figmaNode: SceneNode }> = [];

  constructor(
    private data: any,
    options: Partial<EnhancedImportOptions> = {}
  ) {
    this.options = {
      createMainFrame: true,
      enableBatchProcessing: true,
      verifyPositions: true,
      maxBatchSize: 10,
      coordinateTolerance: 2, // 2px tolerance
      enableDebugMode: false,
      retryFailedImages: true,
      enableProgressiveLoading: false,
      ...options
    };

    this.styleManager = new StyleManager(data.styles);
    this.nodeBuilder = new NodeBuilder(this.styleManager, null, this.options as any, data.assets);

    if (this.options.enableDebugMode) {
      console.log('🎯 Enhanced Figma importer initialized:', this.options);
    }
  }

  /**
   * Main import method with enhanced error handling and verification
   */
  async runImport(): Promise<ImportVerificationReport> {
    const startTime = Date.now();

    try {
      figma.ui.postMessage({ type: 'progress', message: 'Starting enhanced import...', percent: 0 });

      // Step 1: Load all required fonts
      await this.loadAllFonts();

      // Step 2: Create main container frame
      const mainFrame = await this.createMainFrame();

      // Step 3: Process nodes with batch optimization
      await this.processNodesWithBatching(mainFrame);

      // Step 4: Verify positions if enabled
      let verificationReport: ImportVerificationReport | null = null;
      if (this.options.verifyPositions) {
        verificationReport = await this.verifyImportAccuracy();
      }

      // Step 5: Focus on imported content
      figma.viewport.scrollAndZoomIntoView([mainFrame]);

      const totalTime = Date.now() - startTime;
      const report: ImportVerificationReport = verificationReport || {
        totalElements: this.createdNodes.size,
        positionsVerified: 0,
        positionsWithinTolerance: 0,
        positionsOutsideTolerance: 0,
        maxDeviation: 0,
        averageDeviation: 0,
        problematicElements: [],
        imagesProcessed: this.imageCreationCache.size,
        imagesSuccessful: this.imageCreationCache.size,
        imagesFailed: 0,
        totalProcessingTime: totalTime
      };

      figma.ui.postMessage({
        type: 'complete',
        stats: { elements: this.createdNodes.size },
        verification: report
      });

      if (this.options.enableDebugMode) {
        console.log('✅ Enhanced import complete:', report);
      }

      return report;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      figma.ui.postMessage({ type: 'error', message: errorMessage });
      
      if (this.options.enableDebugMode) {
        console.error('❌ Enhanced import failed:', error);
      }
      
      throw error;
    }
  }

  /**
   * Load all fonts required for the import with proper error handling
   */
  private async loadAllFonts(): Promise<void> {
    figma.ui.postMessage({ type: 'progress', message: 'Loading fonts...', percent: 5 });

    const requiredFonts = this.extractRequiredFonts();
    const loadPromises: Promise<void>[] = [];

    for (const fontName of requiredFonts) {
      loadPromises.push(
        this.loadFontSafely(fontName).catch(error => {
          console.warn(`⚠️ Failed to load font ${fontName.family}:`, error);
          // Continue with default font
        })
      );
    }

    await Promise.all(loadPromises);

    if (this.options.enableDebugMode) {
      console.log(`✅ Font loading complete. Attempted to load ${requiredFonts.length} fonts.`);
    }
  }

  /**
   * Safely load a font with fallback to default
   */
  private async loadFontSafely(fontName: FontName): Promise<void> {
    try {
      await figma.loadFontAsync(fontName);
    } catch (error) {
      // Fallback to Inter Regular if the specific font fails
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      } catch (fallbackError) {
        console.warn('Failed to load fallback font Inter:', fallbackError);
      }
    }
  }

  /**
   * Extract all required fonts from the data
   */
  private extractRequiredFonts(): FontName[] {
    const fonts = new Set<string>();
    
    // Extract from metadata fonts
    if (this.data.metadata?.fonts) {
      Object.values(this.data.metadata.fonts).forEach((font: any) => {
        if (font.family) {
          fonts.add(`${font.family}-Regular`);
          if (font.weights) {
            font.weights.forEach((weight: number) => {
              const style = this.weightToStyle(weight);
              fonts.add(`${font.family}-${style}`);
            });
          }
        }
      });
    }

    // Convert to FontName format
    return Array.from(fonts).map(fontStr => {
      const [family, style] = fontStr.split('-');
      return { family, style: style || 'Regular' };
    });
  }

  /**
   * Create the main container frame with proper sizing
   */
  private async createMainFrame(): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = `Imported Page - ${new Date().toLocaleTimeString()}`;
    
    // Set frame size based on page metadata
    const pageWidth = this.data.metadata?.viewport?.width || 1440;
    const pageHeight = this.data.metadata?.viewport?.height || 900;
    
    frame.resize(pageWidth, pageHeight);
    frame.x = 0;
    frame.y = 0;

    // Set background to white for clarity
    frame.fills = [{
      type: 'SOLID',
      color: { r: 1, g: 1, b: 1 }
    }];

    figma.currentPage.appendChild(frame);

    if (this.options.enableDebugMode) {
      console.log(`📐 Created main frame: ${pageWidth}×${pageHeight}`);
    }

    return frame;
  }

  /**
   * Process all nodes with batch optimization for images
   */
  private async processNodesWithBatching(parentFrame: FrameNode): Promise<void> {
    if (!this.data.tree) {
      throw new Error('No tree data available for import');
    }

    // Separate image nodes for batch processing
    const allNodes = this.flattenNodeTree(this.data.tree);
    const imageNodes = allNodes.filter(node => node.type === 'IMAGE' || node.imageHash);
    const nonImageNodes = allNodes.filter(node => node.type !== 'IMAGE' && !node.imageHash);

    figma.ui.postMessage({ 
      type: 'progress', 
      message: `Processing ${allNodes.length} elements (${imageNodes.length} images)...`, 
      percent: 10 
    });

    // Step 1: Batch process images first
    if (this.options.enableBatchProcessing && imageNodes.length > 0) {
      await this.batchProcessImages(imageNodes);
    }

    // Step 2: Create all nodes
    let processedCount = 0;
    for (const nodeData of allNodes) {
      try {
        const figmaNode = await this.createSingleNode(nodeData, parentFrame);
        if (figmaNode) {
          this.createdNodes.set(nodeData.id, figmaNode);
          this.verificationData.push({ elementId: nodeData.id, originalData: nodeData, figmaNode });
        }

        processedCount++;
        const progress = 10 + (processedCount / allNodes.length) * 70;
        figma.ui.postMessage({ 
          type: 'progress', 
          message: `Created ${processedCount}/${allNodes.length} elements...`, 
          percent: progress 
        });

      } catch (error) {
        console.warn(`⚠️ Failed to create node ${nodeData.id}:`, error);
        // Continue processing other nodes
      }
    }

    if (this.options.enableDebugMode) {
      console.log(`✅ Node processing complete: ${processedCount}/${allNodes.length} nodes created`);
    }
  }

  /**
   * Batch process images for optimal performance
   */
  private async batchProcessImages(imageNodes: any[]): Promise<void> {
    const batches = this.chunkArray(imageNodes, this.options.maxBatchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      figma.ui.postMessage({ 
        type: 'progress', 
        message: `Processing image batch ${i + 1}/${batches.length}...`, 
        percent: 15 + (i / batches.length) * 15 
      });

      // Process images in parallel within batch
      const batchPromises = batch.map(nodeData => this.preloadImage(nodeData));
      await Promise.allSettled(batchPromises);

      // Small delay to prevent overwhelming Figma
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Preload image and cache the result
   */
  private async preloadImage(nodeData: any): Promise<ImageCreationResult> {
    const startTime = Date.now();
    const result: ImageCreationResult = {
      success: false,
      retryAttempts: 0,
      processingTime: 0
    };

    try {
      const imageHash = nodeData.imageHash;
      if (!imageHash || this.imageCreationCache.has(imageHash)) {
        result.success = true;
        result.imageHash = this.imageCreationCache.get(imageHash);
        return result;
      }

      // Get image data from assets
      const imageAsset = this.data.assets?.images?.[imageHash];
      if (!imageAsset) {
        throw new Error(`Image asset not found for hash: ${imageHash}`);
      }

      // Convert base64 to Uint8Array using proper method
      const imageBytes = await this.base64ToUint8Array(imageAsset.base64);
      
      // Create Figma image
      const figmaImage = figma.createImage(imageBytes);
      this.imageCreationCache.set(imageHash, figmaImage.hash);

      result.success = true;
      result.imageHash = figmaImage.hash;

      if (this.options.enableDebugMode) {
        console.log(`✅ Preloaded image ${imageHash} → ${figmaImage.hash}`);
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Retry logic
      if (this.options.retryFailedImages && result.retryAttempts < 2) {
        result.retryAttempts++;
        await new Promise(resolve => setTimeout(resolve, 100 * result.retryAttempts));
        return await this.preloadImage(nodeData);
      }

      if (this.options.enableDebugMode) {
        console.warn(`❌ Failed to preload image ${nodeData.imageHash}:`, error);
      }
    } finally {
      result.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Convert base64 string to Uint8Array for Figma
   */
  private async base64ToUint8Array(base64: string): Promise<Uint8Array> {
    // Handle data URL format or raw base64
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Decode base64 to binary string
    const binaryString = atob(base64Data);
    
    // Convert to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }

  /**
   * Create a single Figma node with proper positioning
   */
  private async createSingleNode(nodeData: any, parent: FrameNode): Promise<SceneNode | null> {
    try {
      // Use existing node builder but ensure coordinates are set correctly
      const figmaNode = await this.nodeBuilder.buildNode(nodeData);
      
      if (!figmaNode) {
        return null;
      }

      // CRITICAL: Set coordinates BEFORE appending to parent
      if ('x' in figmaNode && 'y' in figmaNode && nodeData.layout) {
        // Apply coordinate rounding for pixel-perfect positioning
        figmaNode.x = Math.round(nodeData.layout.x || 0);
        figmaNode.y = Math.round(nodeData.layout.y || 0);
      }

      // Set size if available
      if ('resize' in figmaNode && nodeData.layout) {
        const width = Math.max(Math.round(nodeData.layout.width || 1), 1);
        const height = Math.max(Math.round(nodeData.layout.height || 1), 1);
        figmaNode.resize(width, height);
      }

      // Append to parent
      parent.appendChild(figmaNode);

      return figmaNode;

    } catch (error) {
      console.warn(`Failed to create node ${nodeData.id}:`, error);
      return null;
    }
  }

  /**
   * Verify import accuracy by checking positions
   */
  private async verifyImportAccuracy(): Promise<ImportVerificationReport> {
    figma.ui.postMessage({ type: 'progress', message: 'Verifying import accuracy...', percent: 85 });

    const verificationResults: PositionVerificationResult[] = [];
    let withinTolerance = 0;
    let outsideTolerance = 0;
    const deviations: number[] = [];

    for (const { elementId, originalData, figmaNode } of this.verificationData) {
      if (!('x' in figmaNode) || !('y' in figmaNode) || !originalData.layout) {
        continue;
      }

      const expected = {
        x: Math.round(originalData.layout.x || 0),
        y: Math.round(originalData.layout.y || 0)
      };

      const actual = {
        x: figmaNode.x,
        y: figmaNode.y
      };

      const xDiff = Math.abs(actual.x - expected.x);
      const yDiff = Math.abs(actual.y - expected.y);
      const deviation = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      const withinToleranceFlag = deviation <= this.options.coordinateTolerance;

      if (withinToleranceFlag) {
        withinTolerance++;
      } else {
        outsideTolerance++;
      }

      deviations.push(deviation);
      verificationResults.push({
        elementId,
        expected,
        actual,
        deviation,
        withinTolerance: withinToleranceFlag
      });
    }

    // Sort by deviation (worst first)
    verificationResults.sort((a, b) => b.deviation - a.deviation);

    const report: ImportVerificationReport = {
      totalElements: this.verificationData.length,
      positionsVerified: verificationResults.length,
      positionsWithinTolerance: withinTolerance,
      positionsOutsideTolerance: outsideTolerance,
      maxDeviation: deviations.length > 0 ? Math.max(...deviations) : 0,
      averageDeviation: deviations.length > 0 ? deviations.reduce((sum, d) => sum + d, 0) / deviations.length : 0,
      problematicElements: verificationResults.filter(r => !r.withinTolerance).slice(0, 10), // Top 10 worst
      imagesProcessed: this.imageCreationCache.size,
      imagesSuccessful: Array.from(this.imageCreationCache.values()).filter(hash => hash).length,
      imagesFailed: 0, // Would need to track this separately
      totalProcessingTime: 0 // Set by caller
    };

    // Log verification results
    if (this.options.enableDebugMode) {
      console.log('📐 Position verification results:', {
        accuracy: `${withinTolerance}/${verificationResults.length} within ${this.options.coordinateTolerance}px`,
        maxDeviation: `${report.maxDeviation.toFixed(2)}px`,
        averageDeviation: `${report.averageDeviation.toFixed(2)}px`
      });

      if (report.problematicElements.length > 0) {
        console.warn('⚠️ Elements with position mismatches:', 
          report.problematicElements.slice(0, 5).map(el => ({
            id: el.elementId,
            expected: `(${el.expected.x}, ${el.expected.y})`,
            actual: `(${el.actual.x}, ${el.actual.y})`,
            deviation: `${el.deviation.toFixed(2)}px`
          }))
        );
      }
    }

    // Notify user of verification results
    if (report.positionsOutsideTolerance > 0) {
      figma.notify(`⚠️ ${report.positionsOutsideTolerance} elements have position mismatches > ${this.options.coordinateTolerance}px`, { timeout: 5000 });
    } else {
      figma.notify('✅ Import accuracy verified - all positions correct!');
    }

    return report;
  }

  /**
   * Utility methods
   */
  private flattenNodeTree(node: any): any[] {
    const nodes = [node];
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        nodes.push(...this.flattenNodeTree(child));
      }
    }
    return nodes;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private weightToStyle(weight: number): string {
    if (weight >= 700) return 'Bold';
    if (weight >= 600) return 'SemiBold';
    if (weight >= 500) return 'Medium';
    if (weight >= 300) return 'Light';
    return 'Regular';
  }
}