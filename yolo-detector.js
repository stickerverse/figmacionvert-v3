/**
 * YOLO Component Detector - ML-based UI component detection from screenshots
 * 
 * Uses TensorFlow.js with COCO-SSD model as base, enhanced with UI-specific
 * post-processing to classify detected objects as UI components.
 * 
 * Detects:
 * - Buttons, icons, form inputs
 * - Cards, navigation bars
 * - Images, avatars
 * - Text blocks, headers
 */

// TensorFlow.js - loads native bindings for speed
require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

// UI Component classification based on detected objects + heuristics
const UI_COMPONENT_MAPPINGS = {
  // COCO-SSD classes that map to UI patterns
  'person': 'AVATAR',        // Face detection → avatar
  'cell phone': 'DEVICE_FRAME',
  'laptop': 'DEVICE_FRAME',
  'tv': 'DEVICE_FRAME',
  'book': 'CARD',
  'clock': 'ICON',
  'keyboard': 'INPUT_AREA',
  'mouse': 'INTERACTIVE',
  // Everything else uses visual analysis
};

// Thresholds for detection
const CONFIG = {
  minScore: 0.3,           // Minimum confidence for object detection
  nmsThreshold: 0.5,       // Non-max suppression threshold
  maxDetections: 100,      // Maximum detections per image
  enableUIHeuristics: true // Use additional UI pattern recognition
};

let model = null;

/**
 * Load the COCO-SSD model (lazy loading)
 */
async function loadModel() {
  if (!model) {
    console.log('[yolo] Loading COCO-SSD model...');
    const startTime = Date.now();
    model = await cocoSsd.load({
      base: 'mobilenet_v2' // Faster than full model
    });
    console.log(`[yolo] Model loaded in ${Date.now() - startTime}ms`);
  }
  return model;
}

/**
 * Detect UI components from a screenshot
 * @param {Buffer|string} image - Image buffer or file path or base64 string
 * @returns {Promise<DetectionResult>}
 */
async function detectComponents(image) {
  const startTime = Date.now();
  
  try {
    // Load model
    const detector = await loadModel();
    
    // Convert image to tensor
    let imageBuffer;
    if (typeof image === 'string') {
      if (image.startsWith('data:image')) {
        // Base64 data URL
        const base64Data = image.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else if (image.length > 1000 && !image.includes('/')) {
        // Raw base64 string
        imageBuffer = Buffer.from(image, 'base64');
      } else if (fs.existsSync(image)) {
        // File path
        imageBuffer = fs.readFileSync(image);
      } else {
        throw new Error('Invalid image input');
      }
    } else {
      imageBuffer = image;
    }
    
    // Decode image
    const imageTensor = tf.node.decodeImage(imageBuffer, 3);
    const [height, width] = imageTensor.shape;
    
    console.log(`[yolo] Processing image: ${width}x${height}`);
    
    // Run detection
    const predictions = await detector.detect(imageTensor, CONFIG.maxDetections);
    
    // Clean up tensor
    imageTensor.dispose();
    
    // Map COCO detections to UI components
    const uiComponents = predictions
      .filter(p => p.score >= CONFIG.minScore)
      .map(pred => mapToUIComponent(pred, width, height));
    
    // Apply UI-specific heuristics
    const enhancedComponents = CONFIG.enableUIHeuristics 
      ? await applyUIHeuristics(uiComponents, width, height)
      : uiComponents;
    
    // Group by type
    const grouped = groupByType(enhancedComponents);
    
    const result = {
      detections: enhancedComponents,
      grouped,
      summary: {
        total: enhancedComponents.length,
        byType: Object.fromEntries(
          Object.entries(grouped).map(([k, v]) => [k, v.length])
        )
      },
      imageSize: { width, height },
      duration: Date.now() - startTime
    };
    
    console.log(`[yolo] Detected ${result.summary.total} components in ${result.duration}ms`);
    console.log('[yolo] Summary:', result.summary.byType);
    
    return result;
    
  } catch (error) {
    console.error('[yolo] Detection failed:', error.message);
    return {
      detections: [],
      grouped: {},
      summary: { total: 0, byType: {} },
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Map COCO-SSD detection to UI component type
 */
function mapToUIComponent(prediction, imageWidth, imageHeight) {
  const [x, y, w, h] = prediction.bbox;
  const aspectRatio = w / h;
  const area = w * h;
  const relativeSize = area / (imageWidth * imageHeight);
  
  // Start with COCO class mapping
  let uiType = UI_COMPONENT_MAPPINGS[prediction.class] || 'UNKNOWN';
  
  // Apply additional heuristics based on position and size
  if (uiType === 'UNKNOWN') {
    // Header area (top of page, wide)
    if (y < imageHeight * 0.15 && w > imageWidth * 0.5) {
      uiType = 'HEADER';
    }
    // Footer area (bottom of page, wide)
    else if (y > imageHeight * 0.85 && w > imageWidth * 0.5) {
      uiType = 'FOOTER';
    }
    // Navigation (horizontal, near top)
    else if (y < imageHeight * 0.2 && aspectRatio > 3) {
      uiType = 'NAV';
    }
    // Sidebar (tall, thin, on edges)
    else if (aspectRatio < 0.5 && (x < imageWidth * 0.2 || x > imageWidth * 0.8)) {
      uiType = 'SIDEBAR';
    }
    // Card-like (moderate size, not too long)
    else if (relativeSize > 0.01 && relativeSize < 0.15 && aspectRatio > 0.5 && aspectRatio < 2) {
      uiType = 'CARD';
    }
    // Button-like (small, horizontal)
    else if (relativeSize < 0.02 && aspectRatio > 1.5 && aspectRatio < 6) {
      uiType = 'BUTTON';
    }
    // Icon-like (small, square-ish)
    else if (w < 80 && h < 80 && aspectRatio > 0.7 && aspectRatio < 1.4) {
      uiType = 'ICON';
    }
    // Image container
    else if (relativeSize > 0.05 && prediction.class === 'UNKNOWN') {
      uiType = 'IMAGE_CONTAINER';
    }
    // Default to generic element
    else {
      uiType = 'ELEMENT';
    }
  }
  
  return {
    type: uiType,
    cocoClass: prediction.class,
    confidence: prediction.score,
    bbox: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h)
    },
    center: {
      x: Math.round(x + w / 2),
      y: Math.round(y + h / 2)
    },
    aspectRatio: parseFloat(aspectRatio.toFixed(2)),
    relativeSize: parseFloat((relativeSize * 100).toFixed(2))
  };
}

/**
 * Apply UI-specific heuristics to enhance detection
 */
async function applyUIHeuristics(components, width, height) {
  const enhanced = [...components];
  
  // Detect grid patterns (multiple similar-sized elements in a row)
  const potentialGridItems = components.filter(c => 
    c.type === 'CARD' || c.type === 'ELEMENT' || c.type === 'IMAGE_CONTAINER'
  );
  
  if (potentialGridItems.length >= 3) {
    const clusters = clusterByRow(potentialGridItems);
    for (const cluster of clusters) {
      if (cluster.length >= 3) {
        // Mark as grid items
        cluster.forEach(item => {
          item.type = 'GRID_ITEM';
          item.gridCluster = true;
        });
      }
    }
  }
  
  // Detect hero sections (large area near top)
  const heroCandidate = components.find(c => 
    c.bbox.y < height * 0.3 && 
    c.relativeSize > 10 && 
    c.bbox.width > width * 0.6
  );
  if (heroCandidate) {
    heroCandidate.type = 'HERO_SECTION';
  }
  
  // Detect form areas (multiple inputs close together)
  const formElements = components.filter(c => 
    c.type === 'INPUT_AREA' || c.type === 'BUTTON'
  );
  if (formElements.length >= 2) {
    const formCluster = clusterByProximity(formElements, 100);
    if (formCluster.length >= 2) {
      formCluster.forEach(item => {
        item.formContext = true;
      });
    }
  }
  
  return enhanced;
}

/**
 * Cluster elements by row (similar Y position)
 */
function clusterByRow(items, threshold = 30) {
  const clusters = [];
  const sorted = [...items].sort((a, b) => a.bbox.y - b.bbox.y);
  
  let currentCluster = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    if (Math.abs(curr.bbox.y - prev.bbox.y) < threshold) {
      currentCluster.push(curr);
    } else {
      if (currentCluster.length > 0) clusters.push(currentCluster);
      currentCluster = [curr];
    }
  }
  
  if (currentCluster.length > 0) clusters.push(currentCluster);
  
  return clusters;
}

/**
 * Cluster elements by proximity
 */
function clusterByProximity(items, maxDistance) {
  if (items.length === 0) return [];
  
  const cluster = [items[0]];
  
  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const inRange = cluster.some(c => {
      const dist = Math.hypot(
        c.center.x - item.center.x,
        c.center.y - item.center.y
      );
      return dist < maxDistance;
    });
    if (inRange) cluster.push(item);
  }
  
  return cluster;
}

/**
 * Group detections by type
 */
function groupByType(detections) {
  return detections.reduce((acc, det) => {
    if (!acc[det.type]) acc[det.type] = [];
    acc[det.type].push(det);
    return acc;
  }, {});
}

/**
 * Analyze screenshot for component patterns (high-level API)
 */
async function analyzeUIScreenshot(imagePath) {
  console.log('[yolo] Starting UI analysis...');
  
  const result = await detectComponents(imagePath);
  
  // Create component summary for Figma
  const figmaComponents = result.detections.map(det => ({
    type: det.type,
    bounds: det.bbox,
    confidence: det.confidence,
    suggestedName: `${det.type}_${det.bbox.x}_${det.bbox.y}`
  }));
  
  return {
    ...result,
    figmaComponents,
    forSchema: {
      mlDetections: result.detections,
      summary: result.summary
    }
  };
}

// Export functions
module.exports = {
  detectComponents,
  analyzeUIScreenshot,
  loadModel,
  CONFIG
};
