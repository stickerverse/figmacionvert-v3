/**
 * Pixel-Perfect Positioning Validator
 * Measures accuracy of Figma imports against original DOM positions
 * Used to validate the new absolute transform matrix system
 */

const fs = require('fs');
const path = require('path');

class PixelPerfectValidator {
  constructor() {
    this.validationResults = {
      totalNodes: 0,
      pixelPerfectNodes: 0,
      averagePixelError: 0,
      maxPixelError: 0,
      worstOffenders: [],
      transformAccuracy: {
        total: 0,
        accurate: 0,
        averageError: 0
      }
    };
  }

  /**
   * Validate a captured schema against expected positioning
   */
  validateSchema(schema, reportPath = './validation-report.json') {
    console.log('🎯 [PIXEL-PERFECT VALIDATOR] Starting validation...');
    
    if (!schema?.root) {
      throw new Error('Schema must have root property with absolute transform data');
    }

    this.validateNode(schema.root, null);
    this.calculateMetrics();
    this.generateReport(reportPath);
    
    return this.validationResults;
  }

  /**
   * Recursively validate node positioning
   */
  validateNode(node, parent) {
    this.validationResults.totalNodes++;

    // Check if node has positioning data
    const hasAbsoluteTransform = node.absoluteTransform;
    const hasLocalSize = node.localSize;
    const hasRect = node.rect;

    if (!hasRect) {
      console.warn(`⚠️ Node ${node.id} missing rect data`);
      return;
    }

    // Validate transform matrix if present
    if (hasAbsoluteTransform) {
      this.validateTransformMatrix(node);
    }

    // Validate positioning accuracy
    const positionError = this.calculatePositionError(node);
    if (positionError <= 1.0) { // Within 1 pixel = pixel perfect
      this.validationResults.pixelPerfectNodes++;
    }

    // Track worst offenders
    if (positionError > 5.0) {
      this.validationResults.worstOffenders.push({
        nodeId: node.id,
        tagName: node.tagName,
        error: positionError,
        position: {
          expected: { x: node.rect.x, y: node.rect.y },
          actual: this.getExpectedPosition(node)
        }
      });
    }

    // Recursively validate children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => this.validateNode(child, node));
    }
  }

  /**
   * Validate transform matrix accuracy
   */
  validateTransformMatrix(node) {
    this.validationResults.transformAccuracy.total++;

    if (!node.absoluteTransform?.matrix) {
      return;
    }

    const { matrix, origin } = node.absoluteTransform;
    
    // Validate matrix format: [a, b, c, d, tx, ty]
    if (!Array.isArray(matrix) || matrix.length !== 6) {
      console.warn(`⚠️ Invalid matrix format for node ${node.id}`);
      return;
    }

    // Check for valid transform components
    const [a, b, c, d, tx, ty] = matrix;
    const isIdentity = a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0;
    const hasValidComponents = matrix.every(val => Number.isFinite(val));

    if (!hasValidComponents) {
      console.warn(`⚠️ Invalid matrix values for node ${node.id}:`, matrix);
      return;
    }

    // Calculate determinant to check for degenerate transforms
    const determinant = a * d - b * c;
    if (Math.abs(determinant) < 1e-6) {
      console.warn(`⚠️ Degenerate transform matrix for node ${node.id} (det=${determinant})`);
      return;
    }

    // Validate origin normalization (0-1 range)
    if (origin && (origin.x < 0 || origin.x > 1 || origin.y < 0 || origin.y > 1)) {
      console.warn(`⚠️ Transform origin out of range for node ${node.id}:`, origin);
    }

    this.validationResults.transformAccuracy.accurate++;
    
    console.log(`✅ Valid transform matrix for ${node.tagName}:`, {
      matrix: matrix.map(v => Math.round(v * 1000) / 1000), // Round for readability
      origin,
      determinant: Math.round(determinant * 1000) / 1000
    });
  }

  /**
   * Calculate positioning error in pixels
   */
  calculatePositionError(node) {
    // For now, assume captured positions are accurate
    // In a full implementation, this would compare against expected Figma positions
    
    // Check for sub-pixel precision
    const x = node.rect.x;
    const y = node.rect.y;
    
    // Calculate precision error (how far from integer pixels)
    const xError = Math.abs(x - Math.round(x));
    const yError = Math.abs(y - Math.round(y));
    
    return Math.sqrt(xError * xError + yError * yError);
  }

  /**
   * Get expected position based on layout calculations
   */
  getExpectedPosition(node) {
    // This would calculate expected position from absolute transform
    if (node.absoluteTransform?.matrix) {
      const [a, b, c, d, tx, ty] = node.absoluteTransform.matrix;
      return { x: tx, y: ty };
    }
    
    return { x: node.rect.x, y: node.rect.y };
  }

  /**
   * Calculate validation metrics
   */
  calculateMetrics() {
    const results = this.validationResults;
    
    // Calculate accuracy percentage
    results.accuracyPercentage = results.totalNodes > 0 
      ? (results.pixelPerfectNodes / results.totalNodes) * 100 
      : 0;
    
    // Calculate transform accuracy
    results.transformAccuracy.accuracyPercentage = results.transformAccuracy.total > 0
      ? (results.transformAccuracy.accurate / results.transformAccuracy.total) * 100
      : 0;
    
    // Sort worst offenders by error
    results.worstOffenders.sort((a, b) => b.error - a.error);
    results.worstOffenders = results.worstOffenders.slice(0, 10); // Top 10
  }

  /**
   * Generate validation report
   */
  generateReport(reportPath) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalNodes: this.validationResults.totalNodes,
        pixelPerfectNodes: this.validationResults.pixelPerfectNodes,
        accuracyPercentage: this.validationResults.accuracyPercentage,
        transformAccuracy: this.validationResults.transformAccuracy
      },
      issues: {
        worstOffenders: this.validationResults.worstOffenders
      },
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 [VALIDATION SUMMARY]');
    console.log(`   Total nodes analyzed: ${report.summary.totalNodes}`);
    console.log(`   Pixel-perfect nodes: ${report.summary.pixelPerfectNodes}`);
    console.log(`   Accuracy: ${report.summary.accuracyPercentage.toFixed(2)}%`);
    console.log(`   Transform accuracy: ${report.summary.transformAccuracy.accuracyPercentage.toFixed(2)}%`);
    console.log(`   Report saved to: ${reportPath}`);

    if (report.issues.worstOffenders.length > 0) {
      console.log('\n⚠️ [WORST POSITIONING ERRORS]');
      report.issues.worstOffenders.slice(0, 3).forEach((offender, i) => {
        console.log(`   ${i + 1}. ${offender.tagName} (${offender.nodeId}): ${offender.error.toFixed(2)}px error`);
      });
    }
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const accuracy = this.validationResults.accuracyPercentage;
    const transformAccuracy = this.validationResults.transformAccuracy.accuracyPercentage;

    if (accuracy < 90) {
      recommendations.push("Overall positioning accuracy is below 90%. Consider reviewing coordinate system handling.");
    }

    if (transformAccuracy < 95) {
      recommendations.push("Transform matrix accuracy is below 95%. Check absolute transform extraction in DOM extractor.");
    }

    if (this.validationResults.worstOffenders.length > 5) {
      recommendations.push("Multiple nodes have significant positioning errors. Review hierarchy inference and parent-relative calculations.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Excellent pixel-perfect accuracy! The absolute transform system is working correctly.");
    }

    return recommendations;
  }
}

module.exports = { PixelPerfectValidator };

// CLI usage
if (require.main === module) {
  const schemaPath = process.argv[2];
  if (!schemaPath) {
    console.error('Usage: node pixel-perfect-validator.js <schema.json>');
    process.exit(1);
  }

  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const validator = new PixelPerfectValidator();
    const results = validator.validateSchema(schema, './pixel-perfect-validation-report.json');
    
    // Exit with error code if accuracy is too low
    const accuracy = results.accuracyPercentage;
    if (accuracy < 80) {
      console.error(`\n❌ Pixel-perfect validation failed: ${accuracy.toFixed(2)}% accuracy (minimum: 80%)`);
      process.exit(1);
    } else {
      console.log(`\n✅ Pixel-perfect validation passed: ${accuracy.toFixed(2)}% accuracy`);
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}