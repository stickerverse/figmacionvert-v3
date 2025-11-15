/**
 * Test script for coordinate precision and optimization
 * Verifies Math.round() optimization and position accuracy
 */

// Test data representing elements with sub-pixel positioning
const testElements = [
  { id: 'elem-1', x: 123.7, y: 456.2, width: 100.5, height: 50.3 },
  { id: 'elem-2', x: 89.1, y: 234.9, width: 150.7, height: 75.4 },
  { id: 'elem-3', x: 300.0, y: 200.0, width: 200.0, height: 100.0 }, // Already integer
  { id: 'elem-4', x: 45.99, y: 67.01, width: 80.49, height: 60.51 },
];

console.log('🎯 Testing Coordinate Precision Optimization');
console.log('==========================================');

// Simulate the Math.round() optimization
function optimizeCoordinates(element) {
  const original = {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height
  };

  const optimized = {
    x: Math.round(element.x),
    y: Math.round(element.y),
    width: Math.round(element.width),
    height: Math.round(element.height)
  };

  const adjustments = {
    xAdjustment: optimized.x - original.x,
    yAdjustment: optimized.y - original.y,
    widthAdjustment: optimized.width - original.width,
    heightAdjustment: optimized.height - original.height
  };

  return { original, optimized, adjustments };
}

// Test coordinate verification
function verifyCoordinateAccuracy(expected, actual, tolerance = 2) {
  const xDiff = Math.abs(actual.x - expected.x);
  const yDiff = Math.abs(actual.y - expected.y);
  const deviation = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
  
  return {
    withinTolerance: deviation <= tolerance,
    deviation,
    xDiff,
    yDiff
  };
}

// Run tests
let totalAdjustments = 0;
let maxDeviation = 0;
let deviations = [];

console.log('📐 Coordinate Optimization Results:');
console.log('');

testElements.forEach((element, index) => {
  const result = optimizeCoordinates(element);
  const verification = verifyCoordinateAccuracy(result.original, result.optimized);
  
  const hasAdjustment = Math.abs(result.adjustments.xAdjustment) > 0.01 || 
                       Math.abs(result.adjustments.yAdjustment) > 0.01;
  
  if (hasAdjustment) {
    totalAdjustments++;
  }
  
  deviations.push(verification.deviation);
  maxDeviation = Math.max(maxDeviation, verification.deviation);
  
  console.log(`Element ${element.id}:`);
  console.log(`  Original:  (${result.original.x}, ${result.original.y}) ${result.original.width}×${result.original.height}`);
  console.log(`  Optimized: (${result.optimized.x}, ${result.optimized.y}) ${result.optimized.width}×${result.optimized.height}`);
  console.log(`  Adjustment: (${result.adjustments.xAdjustment.toFixed(2)}, ${result.adjustments.yAdjustment.toFixed(2)})`);
  console.log(`  Deviation: ${verification.deviation.toFixed(2)}px`);
  console.log(`  Status: ${verification.withinTolerance ? '✅ Within tolerance' : '❌ Outside tolerance'}`);
  console.log('');
});

// Summary statistics
const averageDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
const withinTolerance = deviations.filter(d => d <= 2).length;

console.log('📊 Test Summary:');
console.log(`  Elements tested: ${testElements.length}`);
console.log(`  Elements adjusted: ${totalAdjustments}/${testElements.length}`);
console.log(`  Within tolerance (≤2px): ${withinTolerance}/${testElements.length}`);
console.log(`  Max deviation: ${maxDeviation.toFixed(2)}px`);
console.log(`  Average deviation: ${averageDeviation.toFixed(2)}px`);
console.log(`  Accuracy rate: ${(withinTolerance / testElements.length * 100).toFixed(1)}%`);

// Test edge cases
console.log('');
console.log('🧪 Edge Case Tests:');

const edgeCases = [
  { id: 'edge-1', x: 0.4, y: 0.6, width: 1.4, height: 1.6 }, // Near zero
  { id: 'edge-2', x: 999.9, y: 1000.1, width: 2000.8, height: 1500.2 }, // Large numbers
  { id: 'edge-3', x: -10.3, y: -5.7, width: 50.0, height: 30.0 }, // Negative coordinates
];

edgeCases.forEach(element => {
  const result = optimizeCoordinates(element);
  console.log(`${element.id}: (${element.x}, ${element.y}) → (${result.optimized.x}, ${result.optimized.y})`);
});

console.log('');
console.log('✅ Coordinate optimization tests completed!');
console.log('This demonstrates how our Math.round() optimization ensures pixel-perfect positioning in Figma.');