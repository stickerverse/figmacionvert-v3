/**
 * AI Schema Enhancer for Puppeteer/Node.js
 *
 * Server-side version of the AI schema enhancer
 * Enhances extraction.data schema with AI results
 */

/**
 * Enhance schema with AI results
 */
function enhanceSchemaWithAI(extractionData, aiContext) {
  if (!extractionData || !extractionData.tree) {
    console.warn(
      "[ai-enhancer] Extraction data has no tree, skipping enhancement"
    );
    return extractionData;
  }

  // Guardrails: do not paint huge containers with guessed palette colors.
  const viewport = extractionData?.metadata?.viewport || {};
  const viewportWidth =
    viewport.width ||
    viewport.layoutViewportWidth ||
    extractionData?.metadata?.viewportWidth ||
    extractionData?.tree?.layout?.width ||
    1440;
  const viewportHeight =
    viewport.height ||
    viewport.layoutViewportHeight ||
    extractionData?.metadata?.viewportHeight ||
    extractionData?.tree?.layout?.height ||
    900;
  const viewportArea = Math.max(1, viewportWidth * viewportHeight);
  const MAX_PALETTE_FILLS = 200; // hard cap to prevent flooding the schema
  const MAX_PALETTE_FILL_AREA_RATIO = 0.05; // never fill nodes larger than 5% viewport

  console.log(
    "[ai-enhancer] 🤖 Starting schema enhancement with AI results..."
  );

  const enhancements = {
    ocrTextFilled: 0,
    colorsFilled: 0,
    componentsEnhanced: 0,
    typographyNormalized: 0,
    layoutImproved: 0,
  };

  // Enhance tree recursively
  function enhanceNode(node) {
    if (!node) return;

    // 1. Use OCR to fill missing text
    if (aiContext.ocr && aiContext.ocr.words && node.layout) {
      const isImage =
        node.type === "IMAGE" ||
        node.htmlTag === "img" ||
        node.htmlTag === "canvas";
      const hasNoText = !node.characters || node.characters.trim().length === 0;

      if (isImage && hasNoText) {
        const nearbyWords = findNearbyOCRWords(
          node.layout,
          aiContext.ocr.words
        );
        if (nearbyWords.length > 0) {
          node.ocrText = nearbyWords.map((w) => w.text).join(" ");
          node.ocrConfidence =
            nearbyWords.reduce((sum, w) => sum + (w.confidence || 0), 0) /
            nearbyWords.length;
          enhancements.ocrTextFilled++;
        }
      }
    }

    // 2. Color palette fill (DISABLED)
    // Evidence: palette "Vibrant" fills have caused severe regressions (e.g. large
    // yellow/orange blocks and incorrectly filled header elements). For pixel-fidelity,
    // we do not invent background paints from a global palette.
    const isDocumentRoot = node.htmlTag === "body" || node.htmlTag === "html";

    void isDocumentRoot;

    // 3. Use ML detections to enhance components
    if (
      aiContext.mlComponents &&
      aiContext.mlComponents.detections &&
      node.layout
    ) {
      const overlappingDetections = aiContext.mlComponents.detections.filter(
        (detection) => {
          if (!detection.bbox) return false;
          return rectsOverlap(node.layout, detection.bbox);
        }
      );

      if (overlappingDetections.length > 0) {
        const bestDetection = overlappingDetections.reduce((best, current) =>
          (current.score || 0) > (best.score || 0) ? current : best
        );

        node.mlClassification = bestDetection.class;
        node.mlConfidence = bestDetection.score || 0;
        node.mlUIType = bestDetection.uiType;

        if (bestDetection.uiType) {
          const componentType = mapMLTypeToComponentType(bestDetection.uiType);
          if (!node.componentType) {
            node.componentType = componentType;
          }

          // Add to component registry
          if (!extractionData.components) {
            extractionData.components = { definitions: {} };
          }
          if (!extractionData.components.definitions[node.id]) {
            extractionData.components.definitions[node.id] = {
              id: node.id,
              name: node.name || bestDetection.uiType,
              masterElementId: node.id,
              properties: {
                mlType: bestDetection.uiType,
                mlConfidence: bestDetection.score || 0,
              },
            };
          }
        }

        enhancements.componentsEnhanced++;
      }
    }

    // 4. Use typography analysis to normalize font sizes
    if (
      aiContext.typography &&
      node.type === "TEXT" &&
      node.textStyle &&
      node.textStyle.fontSize
    ) {
      const typography = aiContext.typography;
      const currentSize = node.textStyle.fontSize;
      const baseSize = typography.typeScale?.baseSize || 16;
      const ratio = typography.typeScale?.ratio || 1.25;

      const scaleSizes = generateTypeScale(baseSize, ratio, 10);
      const nearestSize = scaleSizes.reduce((nearest, size) =>
        Math.abs(size - currentSize) < Math.abs(nearest - currentSize)
          ? size
          : nearest
      );

      if (Math.abs(nearestSize - currentSize) <= 2) {
        node.originalFontSize = node.textStyle.fontSize;
        node.textStyle.fontSize = nearestSize;
        node.normalizedToTypeScale = true;
        enhancements.typographyNormalized++;
      }
    }

    // 5. Use ML to improve layout inference
    if (
      aiContext.mlComponents &&
      aiContext.mlComponents.detections &&
      node.layout
    ) {
      const nearbyDetections = aiContext.mlComponents.detections.filter((d) => {
        if (!d.bbox) return false;
        const distance = rectDistance(node.layout, d.bbox);
        return distance < 50;
      });

      if (
        nearbyDetections.length > 1 &&
        !node.autoLayout &&
        node.children &&
        node.children.length > 1
      ) {
        node.suggestedAutoLayout = true;
        node.mlGroupingDetected = true;
        node.suggestedLayoutMode = "HORIZONTAL";
        enhancements.layoutImproved++;
      }
    }

    // Recursively enhance children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child) => enhanceNode(child));
    }
  }

  // Start enhancement
  enhanceNode(extractionData.tree);

  // Log summary
  console.log("[ai-enhancer] 📊 Enhancement Summary:");
  console.log(`   OCR text filled: ${enhancements.ocrTextFilled}`);
  console.log(`   Colors filled: ${enhancements.colorsFilled}`);
  console.log(`   Components enhanced: ${enhancements.componentsEnhanced}`);
  console.log(`   Typography normalized: ${enhancements.typographyNormalized}`);
  console.log(`   Layout improved: ${enhancements.layoutImproved}`);

  return extractionData;
}

function findNearbyOCRWords(nodeRect, words) {
  if (!words || words.length === 0) return [];

  const nodeCenterX = nodeRect.x + nodeRect.width / 2;
  const nodeCenterY = nodeRect.y + nodeRect.height / 2;
  const searchRadius = Math.max(nodeRect.width, nodeRect.height) * 1.5;

  return words
    .filter((word) => {
      if (!word.bbox) return false;
      const wordCenterX = word.bbox.x + word.bbox.width / 2;
      const wordCenterY = word.bbox.y + word.bbox.height / 2;
      const distance = Math.sqrt(
        Math.pow(wordCenterX - nodeCenterX, 2) +
          Math.pow(wordCenterY - nodeCenterY, 2)
      );
      return distance < searchRadius;
    })
    .map((word) => ({
      text: word.text,
      confidence: word.confidence || 0,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

function rectsOverlap(rect1, rect2) {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

function rectDistance(rect1, rect2) {
  const center1X = rect1.x + rect1.width / 2;
  const center1Y = rect1.y + rect1.height / 2;
  const center2X = rect2.x + rect2.width / 2;
  const center2Y = rect2.y + rect2.height / 2;
  return Math.sqrt(
    Math.pow(center2X - center1X, 2) + Math.pow(center2Y - center1Y, 2)
  );
}

function mapMLTypeToComponentType(mlType) {
  const mapping = {
    BUTTON: "BUTTON",
    INPUT: "INPUT",
    CARD: "CARD",
    NAV: "NAVIGATION",
    ICON: "ICON",
    AVATAR: "AVATAR",
  };
  return mapping[mlType.toUpperCase()] || "UNKNOWN";
}

function generateTypeScale(base, ratio, count) {
  const sizes = [];
  for (let i = 0; i < count; i++) {
    sizes.push(base * Math.pow(ratio, i));
  }
  return sizes;
}

module.exports = { enhanceSchemaWithAI };
