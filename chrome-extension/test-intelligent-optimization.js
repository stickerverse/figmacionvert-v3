/**
 * Test script to demonstrate the intelligent asset optimization system
 * This can be run in a browser console to test the optimization logic
 */

// Mock schema with various asset types for testing
const testSchema = {
  version: '2.0.0',
  metadata: {
    url: 'https://example.com',
    title: 'Test Page',
    timestamp: new Date().toISOString(),
    viewport: { width: 1920, height: 1080, devicePixelRatio: 1 },
    fonts: []
  },
  tree: {
    id: 'root',
    type: 'FRAME',
    name: 'Root',
    layout: { x: 0, y: 0, width: 1920, height: 1080 },
    children: [
      // Hero image element
      {
        id: 'hero',
        type: 'IMAGE',
        name: 'Hero Image',
        layout: { x: 0, y: 0, width: 1200, height: 600 },
        imageHash: 'hero-image-hash',
        children: []
      },
      // Icon element
      {
        id: 'icon1',
        type: 'IMAGE', 
        name: 'Icon',
        layout: { x: 100, y: 700, width: 32, height: 32 },
        imageHash: 'icon-image-hash',
        children: []
      },
      // Background element
      {
        id: 'bg',
        type: 'FRAME',
        name: 'Background',
        layout: { x: 0, y: 800, width: 1920, height: 280 },
        fills: [{ type: 'IMAGE', imageHash: 'bg-image-hash' }],
        children: []
      },
      // Small decorative element
      {
        id: 'decoration',
        type: 'IMAGE',
        name: 'Decoration',
        layout: { x: 1800, y: 1000, width: 64, height: 64 },
        imageHash: 'decoration-image-hash',
        children: []
      }
    ]
  },
  assets: {
    images: {
      'hero-image-hash': {
        hash: 'hero-image-hash',
        url: 'https://example.com/hero.jpg',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(1000), // Large base64
        width: 1200,
        height: 600,
        mimeType: 'image/jpeg'
      },
      'icon-image-hash': {
        hash: 'icon-image-hash', 
        url: 'https://example.com/icon.png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(50), // Small base64
        width: 32,
        height: 32,
        mimeType: 'image/png'
      },
      'bg-image-hash': {
        hash: 'bg-image-hash',
        url: 'https://example.com/background.jpg', 
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(800), // Medium base64
        width: 1920,
        height: 280,
        mimeType: 'image/jpeg'
      },
      'decoration-image-hash': {
        hash: 'decoration-image-hash',
        url: 'https://example.com/decoration.png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(100), // Small base64
        width: 64,
        height: 64,
        mimeType: 'image/png'
      }
    },
    svgs: {
      'icon-svg-hash': {
        hash: 'icon-svg-hash',
        svgCode: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
        width: 24,
        height: 24
      }
    }
  },
  styles: { colors: {}, textStyles: {}, effects: {} }
};

console.log('🧪 Testing Intelligent Asset Optimization');
console.log('==========================================');

// Calculate initial payload size
const initialPayloadSize = new TextEncoder().encode(JSON.stringify(testSchema)).length;
console.log(`📦 Initial payload size: ${(initialPayloadSize / 1024 / 1024).toFixed(2)}MB`);

// Test asset classification
console.log('\n🏷️  Asset Classification Test:');
console.log('------------------------------');

Object.entries(testSchema.assets.images).forEach(([hash, asset]) => {
  const classification = classifyTestAsset(asset);
  const importance = determineTestImportance(asset, classification);
  
  console.log(`${asset.url.split('/').pop()}: ${classification} (${importance})`);
  console.log(`  - Dimensions: ${asset.width}×${asset.height}`);
  console.log(`  - Size: ${((asset.base64.length * 0.75) / 1024).toFixed(1)}KB`);
  console.log(`  - Optimization strategy: ${getOptimizationStrategy(classification, importance)}`);
});

// Test optimization thresholds
console.log('\n🎯 Optimization Strategy Test:');
console.log('------------------------------');

const payloadScenarios = [50, 100, 150, 200]; // MB
payloadScenarios.forEach(sizeMB => {
  console.log(`\nAt ${sizeMB}MB payload:`);
  
  Object.entries(testSchema.assets.images).forEach(([hash, asset]) => {
    const classification = classifyTestAsset(asset);
    const importance = determineTestImportance(asset, classification);
    const strategy = getOptimizationStrategy(classification, importance);
    const intensity = calculateOptimizationIntensity(sizeMB, importance);
    const quality = calculateTargetQuality(importance, intensity);
    
    console.log(`  ${asset.url.split('/').pop()}: ${strategy} (intensity: ${(intensity * 100).toFixed(0)}%, quality: ${(quality * 100).toFixed(0)}%)`);
  });
});

// Helper functions for testing
function classifyTestAsset(asset) {
  if (asset.width > 800 || asset.height > 600) return 'HERO';
  if (asset.width <= 64 && asset.height <= 64) return 'ICON';
  if (asset.width > 1000) return 'BACKGROUND';
  return 'CONTENT';
}

function determineTestImportance(asset, classification) {
  if (classification === 'HERO') return 'CRITICAL';
  if (classification === 'ICON') return 'MEDIUM';
  if (classification === 'BACKGROUND') return 'LOW';
  if (asset.width < 100 && asset.height < 100) return 'MINIMAL';
  return 'MEDIUM';
}

function getOptimizationStrategy(classification, importance) {
  if (importance === 'CRITICAL') return 'MINIMAL';
  if (importance === 'HIGH') return 'BALANCED';
  if (classification === 'ICON') return 'CONVERT_SVG';
  if (importance === 'LOW') return 'AGGRESSIVE';
  if (importance === 'MINIMAL') return 'ULTRA_AGGRESSIVE';
  return 'BALANCED';
}

function calculateOptimizationIntensity(payloadSizeMB, importance) {
  let baseIntensity = 0;
  if (payloadSizeMB >= 180) baseIntensity = 1.0;
  else if (payloadSizeMB >= 150) baseIntensity = 0.8;
  else if (payloadSizeMB >= 100) baseIntensity = 0.6;
  else if (payloadSizeMB >= 50) baseIntensity = 0.4;
  else baseIntensity = 0.2;
  
  const modifiers = {
    'CRITICAL': 0.3,
    'HIGH': 0.5,
    'MEDIUM': 0.7,
    'LOW': 0.9,
    'MINIMAL': 1.0
  };
  
  return Math.min(1, baseIntensity * (modifiers[importance] || 0.7));
}

function calculateTargetQuality(importance, intensity) {
  const baseQualities = {
    'CRITICAL': 0.9,
    'HIGH': 0.8,
    'MEDIUM': 0.65,
    'LOW': 0.45,
    'MINIMAL': 0.25
  };
  
  const baseQuality = baseQualities[importance] || 0.65;
  const intensityModifier = 1 - (intensity * 0.3);
  
  return Math.max(0.1, baseQuality * intensityModifier);
}

console.log('\n✅ Intelligent Asset Optimization Test Complete');
console.log('\n💡 Key Benefits:');
console.log('- Context-aware asset classification');
console.log('- Progressive optimization based on payload pressure');
console.log('- Quality preservation for critical assets');
console.log('- Smart compression strategies per asset type');
console.log('- Automatic fallback to emergency compression if needed');