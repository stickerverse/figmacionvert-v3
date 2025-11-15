/**
 * Figma Coordinate Optimizer
 * 
 * Implements coordinate optimization for pixel-perfect Figma compatibility:
 * - Math.round() on all coordinates to prevent sub-pixel misalignment
 * - Coordinate verification system with tolerance checking
 * - Position accuracy measurement and reporting
 * - Handles viewport scrolling and iframe offsets
 */

export interface CoordinateOptimizationConfig {
  enableRounding: boolean;
  tolerance: number;           // Allowed pixel difference (1-2px)
  includeScrollOffset: boolean;
  debugMode: boolean;
  verificationEnabled: boolean;
}

export interface OptimizedCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  original: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  adjustments: {
    xAdjustment: number;
    yAdjustment: number;
    widthAdjustment: number;
    heightAdjustment: number;
  };
}

export interface CoordinateVerificationResult {
  totalElements: number;
  withinTolerance: number;
  outsideTolerance: number;
  maxDeviation: number;
  averageDeviation: number;
  problematicElements: Array<{
    elementId: string;
    expected: { x: number; y: number };
    actual: { x: number; y: number };
    deviation: number;
  }>;
}

export class FigmaCoordinateOptimizer {
  private config: CoordinateOptimizationConfig;

  constructor(config: Partial<CoordinateOptimizationConfig> = {}) {
    this.config = {
      enableRounding: true,
      tolerance: 2, // 2px tolerance for verification
      includeScrollOffset: true,
      debugMode: false,
      verificationEnabled: true,
      ...config
    };

    if (this.config.debugMode) {
      console.log('🎯 Figma coordinate optimizer initialized:', this.config);
    }
  }

  /**
   * Optimize element coordinates for pixel-perfect Figma compatibility
   */
  optimizeElementCoordinates(element: Element): OptimizedCoordinates {
    const rect = element.getBoundingClientRect();
    
    // Get scroll offsets for absolute positioning
    const scrollX = this.config.includeScrollOffset ? 
      (window.pageXOffset || document.documentElement.scrollLeft || 0) : 0;
    const scrollY = this.config.includeScrollOffset ? 
      (window.pageYOffset || document.documentElement.scrollTop || 0) : 0;

    // Calculate original coordinates
    const originalX = rect.left + scrollX;
    const originalY = rect.top + scrollY;
    const originalWidth = rect.width;
    const originalHeight = rect.height;

    // Apply coordinate optimization
    const optimizedX = this.config.enableRounding ? Math.round(originalX) : originalX;
    const optimizedY = this.config.enableRounding ? Math.round(originalY) : originalY;
    const optimizedWidth = this.config.enableRounding ? Math.round(originalWidth) : originalWidth;
    const optimizedHeight = this.config.enableRounding ? Math.round(originalHeight) : originalHeight;

    const result: OptimizedCoordinates = {
      x: optimizedX,
      y: optimizedY,
      width: optimizedWidth,
      height: optimizedHeight,
      original: {
        x: originalX,
        y: originalY,
        width: originalWidth,
        height: originalHeight
      },
      adjustments: {
        xAdjustment: optimizedX - originalX,
        yAdjustment: optimizedY - originalY,
        widthAdjustment: optimizedWidth - originalWidth,
        heightAdjustment: optimizedHeight - originalHeight
      }
    };

    if (this.config.debugMode) {
      const hasAdjustment = Math.abs(result.adjustments.xAdjustment) > 0.01 || 
                           Math.abs(result.adjustments.yAdjustment) > 0.01;
      if (hasAdjustment) {
        console.log(`🔧 Coordinate adjustment for ${element.tagName}:`, {
          original: `(${originalX.toFixed(2)}, ${originalY.toFixed(2)})`,
          optimized: `(${optimizedX}, ${optimizedY})`,
          adjustment: `(${result.adjustments.xAdjustment.toFixed(2)}, ${result.adjustments.yAdjustment.toFixed(2)})`
        });
      }
    }

    return result;
  }

  /**
   * Batch optimize coordinates for multiple elements
   */
  optimizeMultipleElements(elements: Element[]): Map<Element, OptimizedCoordinates> {
    const results = new Map<Element, OptimizedCoordinates>();
    
    elements.forEach(element => {
      const optimized = this.optimizeElementCoordinates(element);
      results.set(element, optimized);
    });

    if (this.config.debugMode) {
      const totalAdjustments = Array.from(results.values())
        .filter(coords => Math.abs(coords.adjustments.xAdjustment) > 0.01 || 
                         Math.abs(coords.adjustments.yAdjustment) > 0.01).length;
      
      console.log(`📊 Coordinate optimization summary: ${totalAdjustments}/${elements.length} elements adjusted`);
    }

    return results;
  }

  /**
   * Verify coordinate accuracy against expected positions
   */
  verifyCoordinateAccuracy(
    expectedPositions: Array<{ elementId: string; x: number; y: number }>,
    actualPositions: Array<{ elementId: string; x: number; y: number }>
  ): CoordinateVerificationResult {
    const result: CoordinateVerificationResult = {
      totalElements: expectedPositions.length,
      withinTolerance: 0,
      outsideTolerance: 0,
      maxDeviation: 0,
      averageDeviation: 0,
      problematicElements: []
    };

    const deviations: number[] = [];
    
    expectedPositions.forEach(expected => {
      const actual = actualPositions.find(a => a.elementId === expected.elementId);
      
      if (!actual) {
        result.problematicElements.push({
          elementId: expected.elementId,
          expected: { x: expected.x, y: expected.y },
          actual: { x: 0, y: 0 },
          deviation: Infinity
        });
        result.outsideTolerance++;
        return;
      }

      const xDiff = Math.abs(actual.x - expected.x);
      const yDiff = Math.abs(actual.y - expected.y);
      const deviation = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      
      deviations.push(deviation);
      
      if (deviation <= this.config.tolerance) {
        result.withinTolerance++;
      } else {
        result.outsideTolerance++;
        result.problematicElements.push({
          elementId: expected.elementId,
          expected: { x: expected.x, y: expected.y },
          actual: { x: actual.x, y: actual.y },
          deviation
        });
      }
    });

    // Calculate statistics
    if (deviations.length > 0) {
      result.maxDeviation = Math.max(...deviations.filter(d => d !== Infinity));
      result.averageDeviation = deviations.filter(d => d !== Infinity)
        .reduce((sum, d) => sum + d, 0) / deviations.filter(d => d !== Infinity).length;
    }

    // Sort problematic elements by deviation (worst first)
    result.problematicElements.sort((a, b) => b.deviation - a.deviation);

    if (this.config.debugMode) {
      console.log('📐 Coordinate verification results:', {
        accuracy: `${result.withinTolerance}/${result.totalElements} within ${this.config.tolerance}px`,
        maxDeviation: result.maxDeviation.toFixed(2) + 'px',
        averageDeviation: result.averageDeviation.toFixed(2) + 'px',
        problematicCount: result.problematicElements.length
      });

      if (result.problematicElements.length > 0) {
        console.log('⚠️ Top 5 coordinate mismatches:', 
          result.problematicElements.slice(0, 5).map(el => ({
            id: el.elementId,
            expectedPos: `(${el.expected.x}, ${el.expected.y})`,
            actualPos: `(${el.actual.x}, ${el.actual.y})`,
            off: `${el.deviation.toFixed(2)}px`
          }))
        );
      }
    }

    return result;
  }

  /**
   * Generate coordinate verification function for Figma plugin
   */
  generateFigmaVerificationCode(): string {
    return `
// Figma Plugin Coordinate Verification Function
function verifyElementPositions(importedFrame, originalData) {
  const errors = [];
  const tolerance = ${this.config.tolerance};
  
  importedFrame.children.forEach((node, index) => {
    const expectedData = originalData.nodes?.[index];
    if (!expectedData) return;
    
    const xDiff = Math.abs(node.x - expectedData.x);
    const yDiff = Math.abs(node.y - expectedData.y);
    const deviation = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    
    if (deviation > tolerance) {
      errors.push({
        name: node.name,
        expected: { x: expectedData.x, y: expectedData.y },
        actual: { x: node.x, y: node.y },
        deviation: Math.round(deviation * 100) / 100
      });
    }
  });
  
  if (errors.length > 0) {
    console.error('❌ Position verification failed:');
    errors.slice(0, 5).forEach(error => {
      console.error(\`  \${error.name}: expected (\${error.expected.x}, \${error.expected.y}) but got (\${error.actual.x}, \${error.actual.y}) - off by \${error.deviation}px\`);
    });
    
    figma.notify(\`⚠️ \${errors.length} elements have position mismatches > \${tolerance}px\`, { timeout: 5000 });
    return false;
  } else {
    console.log('✅ Position verification passed - all elements within tolerance');
    figma.notify('✅ Import accuracy verified - all positions correct!');
    return true;
  }
}
`;
  }

  /**
   * Create coordinate optimization report for debugging
   */
  createOptimizationReport(optimizedCoordinates: Map<Element, OptimizedCoordinates>): {
    totalElements: number;
    elementsAdjusted: number;
    averageXAdjustment: number;
    averageYAdjustment: number;
    maxAdjustment: number;
    subPixelElements: number;
  } {
    const adjustments = Array.from(optimizedCoordinates.values());
    const elementsAdjusted = adjustments.filter(coords => 
      Math.abs(coords.adjustments.xAdjustment) > 0.01 || 
      Math.abs(coords.adjustments.yAdjustment) > 0.01
    );

    const xAdjustments = adjustments.map(a => Math.abs(a.adjustments.xAdjustment));
    const yAdjustments = adjustments.map(a => Math.abs(a.adjustments.yAdjustment));
    const totalAdjustments = adjustments.map(a => 
      Math.sqrt(a.adjustments.xAdjustment ** 2 + a.adjustments.yAdjustment ** 2)
    );

    return {
      totalElements: adjustments.length,
      elementsAdjusted: elementsAdjusted.length,
      averageXAdjustment: xAdjustments.reduce((sum, adj) => sum + adj, 0) / xAdjustments.length,
      averageYAdjustment: yAdjustments.reduce((sum, adj) => sum + adj, 0) / yAdjustments.length,
      maxAdjustment: Math.max(...totalAdjustments),
      subPixelElements: adjustments.filter(a => 
        Math.abs(a.original.x % 1) > 0.01 || Math.abs(a.original.y % 1) > 0.01
      ).length
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CoordinateOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debugMode) {
      console.log('🔧 Coordinate optimizer config updated:', this.config);
    }
  }
}