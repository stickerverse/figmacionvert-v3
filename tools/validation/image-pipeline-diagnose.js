/**
 * Image pipeline diagnostic for a captured schema JSON.
 *
 * Usage:
 *   node tools/validation/image-pipeline-diagnose.js path/to/capture.json
 */

const fs = require("fs");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node tools/validation/image-pipeline-diagnose.js <capture.json>");
  process.exit(2);
}

if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(2);
}

let schema;
try {
  schema = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch (e) {
  console.error(`Failed to parse JSON: ${inputPath}`);
  process.exit(2);
}

const images = schema?.assets?.images || {};
const imageKeys = Object.keys(images);

function isImageFill(fill) {
  if (!fill || typeof fill !== "object") return false;
  const f = fill.fill && typeof fill.fill === "object" ? fill.fill : fill;
  return f?.type === "IMAGE" && typeof f.imageHash === "string";
}

function isOpaqueSolidFill(fill) {
  if (!fill || typeof fill !== "object") return false;
  const f = fill.fill && typeof fill.fill === "object" ? fill.fill : fill;
  if (f?.type !== "SOLID") return false;
  const opacity = typeof f.opacity === "number" ? f.opacity : 1;
  const visible = f.visible !== false;
  return visible && opacity > 0.98;
}

function getLayout(node) {
  const l = node?.layout;
  if (!l || typeof l !== "object") return null;
  const x = Number(l.x);
  const y = Number(l.y);
  const width = Number(l.width);
  const height = Number(l.height);
  if (![x, y, width, height].every((n) => Number.isFinite(n))) return null;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height, right: x + width, bottom: y + height };
}

function intersectionArea(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.right, b.right);
  const y2 = Math.min(a.bottom, b.bottom);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

const refs = {
  nodesTypeImage: 0,
  nodesWithImageHash: 0,
  nodesWithImgTag: 0,
  nodesWithImageFill: 0,
  nodesWithBackgroundImageFill: 0,
  uniqueHashesReferenced: new Set(),
};

const coverageFindings = [];
const missingFromAssets = new Set();

function walk(node, parent) {
  if (!node || typeof node !== "object") return;

  if (node.type === "IMAGE") refs.nodesTypeImage++;
  if (node.htmlTag === "img") refs.nodesWithImgTag++;
  if (typeof node.imageHash === "string") {
    refs.nodesWithImageHash++;
    refs.uniqueHashesReferenced.add(node.imageHash);
  }

  const fills = Array.isArray(node.fills) ? node.fills : [];
  const bgs = Array.isArray(node.backgrounds) ? node.backgrounds : [];

  const nodeHasImageFill = fills.some(isImageFill);
  const nodeHasBgImageFill = bgs.some(isImageFill);
  if (nodeHasImageFill) refs.nodesWithImageFill++;
  if (nodeHasBgImageFill) refs.nodesWithBackgroundImageFill++;

  for (const f of fills) {
    const ff = f.fill && typeof f.fill === "object" ? f.fill : f;
    if (ff?.type === "IMAGE" && typeof ff.imageHash === "string") {
      refs.uniqueHashesReferenced.add(ff.imageHash);
    }
  }
  for (const f of bgs) {
    const ff = f.fill && typeof f.fill === "object" ? f.fill : f;
    if (ff?.type === "IMAGE" && typeof ff.imageHash === "string") {
      refs.uniqueHashesReferenced.add(ff.imageHash);
    }
  }

  // Heuristic: within each parent, check if a later sibling with an opaque solid fill
  // largely overlaps an image sibling (classic "covering rectangle" symptom).
  if (parent && Array.isArray(parent.children)) {
    // only do this when visiting the first child for that parent
    if (parent.__checkedCoveringOverlays) {
      // noop
    } else {
      parent.__checkedCoveringOverlays = true;
      const siblings = parent.children.filter((c) => c && typeof c === "object");
      const layouts = siblings.map((c) => ({ node: c, layout: getLayout(c) }));

      for (let i = 0; i < siblings.length; i++) {
        const a = siblings[i];
        const aLayout = layouts[i].layout;
        if (!aLayout) continue;
        const aLooksLikeImage =
          a.type === "IMAGE" ||
          typeof a.imageHash === "string" ||
          (Array.isArray(a.fills) && a.fills.some(isImageFill));
        if (!aLooksLikeImage) continue;

        const aArea = aLayout.width * aLayout.height;
        for (let j = i + 1; j < siblings.length; j++) {
          const b = siblings[j];
          const bLayout = layouts[j].layout;
          if (!bLayout) continue;
          const bFills = Array.isArray(b.fills) ? b.fills : [];
          const bHasOpaqueSolid = bFills.some(isOpaqueSolidFill);
          if (!bHasOpaqueSolid) continue;
          const overlap = intersectionArea(aLayout, bLayout);
          const overlapRatio = overlap / aArea;
          if (overlapRatio > 0.85) {
            coverageFindings.push({
              parentId: parent.id,
              imageNodeId: a.id,
              coveringNodeId: b.id,
              overlapRatio: Number(overlapRatio.toFixed(3)),
              imageName: a.name,
              coveringName: b.name,
            });
            break;
          }
        }
      }
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, node);
  }
  if (node.pseudoElements) {
    walk(node.pseudoElements.before, node);
    walk(node.pseudoElements.after, node);
  }
}

// Apply migration if needed
if (schema.tree && !schema.root) {
  schema.root = schema.tree;
  delete schema.tree;
}

walk(schema.root, null);

for (const hash of refs.uniqueHashesReferenced) {
  if (!images[hash]) missingFromAssets.add(hash);
}

const assetStats = {
  total: imageKeys.length,
  withInlineBase64: 0,
  withOnlyUrl: 0,
  missingBoth: 0,
  errors: 0,
};

for (const key of imageKeys) {
  const asset = images[key] || {};
  const base64Candidate = asset.base64 || asset.data || asset.screenshot;
  const hasBase64 = typeof base64Candidate === "string" && base64Candidate.length > 0;
  const urlCandidate = asset.url || asset.absoluteUrl || asset.originalUrl;
  const hasUrl = typeof urlCandidate === "string" && urlCandidate.length > 0;
  if (asset.error) assetStats.errors++;
  if (hasBase64) assetStats.withInlineBase64++;
  else if (hasUrl) assetStats.withOnlyUrl++;
  else assetStats.missingBoth++;
}

const viewport = schema?.metadata?.viewport || {};

console.log("IMAGE_PIPELINE_DIAG", {
  file: inputPath,
  captureEngine: schema?.metadata?.captureEngine || schema?.meta?.captureEngine,
  version: schema?.version,
  url: schema?.metadata?.url,
  viewport: {
    width: viewport.width,
    height: viewport.height,
    devicePixelRatio: viewport.devicePixelRatio,
  },
  assetsImages: assetStats,
  refs: {
    nodesTypeImage: refs.nodesTypeImage,
    nodesWithImgTag: refs.nodesWithImgTag,
    nodesWithImageHash: refs.nodesWithImageHash,
    nodesWithImageFill: refs.nodesWithImageFill,
    nodesWithBackgroundImageFill: refs.nodesWithBackgroundImageFill,
    uniqueHashesReferenced: refs.uniqueHashesReferenced.size,
    missingFromAssets: missingFromAssets.size,
  },
  likelyCoveringOverlays: coverageFindings.slice(0, 25),
});

if (missingFromAssets.size > 0) {
  console.log(
    "MISSING_HASHES_SAMPLE",
    Array.from(missingFromAssets).slice(0, 25)
  );
}

