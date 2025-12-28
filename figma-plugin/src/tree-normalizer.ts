type AnyNode = any;

export interface TreeNormalizationResult {
  removedNodes: number;
  collapsedWrappers: number;
  renamedNodes: number;
  maxDepthBefore: number;
  maxDepthAfter: number;
}

const SEMANTIC_TAG_NAMES: Record<string, string> = {
  header: "Header",
  nav: "Navigation",
  main: "Main",
  footer: "Footer",
  section: "Section",
  article: "Article",
  aside: "Aside",
};

const GENERIC_TAGS = new Set(["div", "span"]);

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function getOpacityFromPaint(paint: any): number {
  const paintOpacity =
    typeof paint?.opacity === "number" ? clamp01(paint.opacity) : 1;
  const alpha =
    typeof paint?.color?.a === "number" ? clamp01(paint.color.a) : 1;
  return paintOpacity * alpha;
}

function hasVisibleFills(node: AnyNode): boolean {
  const fills = Array.isArray(node?.fills) ? node.fills : [];
  for (const f of fills) {
    if (f?.visible === false) continue;
    if (f?.type === "IMAGE") return true;
    if (f?.type === "GRADIENT_LINEAR" || f?.type === "GRADIENT_RADIAL")
      return true;
    if (f?.type === "SOLID") {
      if (getOpacityFromPaint(f) > 0.001) return true;
    }
  }
  return false;
}

function hasVisibleStrokes(node: AnyNode): boolean {
  const strokes = Array.isArray(node?.strokes) ? node.strokes : [];
  for (const s of strokes) {
    if (s?.visible === false) continue;
    const thickness =
      typeof s?.thickness === "number"
        ? s.thickness
        : typeof node?.strokeWeight === "number"
        ? node.strokeWeight
        : 0;
    if (thickness <= 0) continue;
    const paintOpacity =
      typeof s?.opacity === "number" ? clamp01(s.opacity) : 1;
    const alpha =
      typeof s?.color?.a === "number" ? clamp01(s.color.a) : 1;
    if (paintOpacity * alpha > 0.001) return true;
  }
  return false;
}

function hasVisibleEffects(node: AnyNode): boolean {
  const effects = Array.isArray(node?.effects) ? node.effects : [];
  return effects.some((e: any) => e?.visible !== false);
}

function isOpacityWrapper(node: AnyNode): boolean {
  return typeof node?.opacity === "number" && node.opacity < 0.999;
}

function isClippingWrapper(node: AnyNode): boolean {
  const overflowH = node?.overflow?.horizontal;
  const overflowV = node?.overflow?.vertical;
  const overflowClips =
    (overflowH && overflowH !== "visible") || (overflowV && overflowV !== "visible");
  return (
    overflowClips ||
    !!node?.clipPath ||
    !!node?.mask ||
    (Array.isArray(node?.backdropFilters) && node.backdropFilters.length > 0)
  );
}

function hasTransformOrFilters(node: AnyNode): boolean {
  return (
    !!node?.transform ||
    (Array.isArray(node?.filters) && node.filters.length > 0) ||
    (Array.isArray(node?.backdropFilters) && node.backdropFilters.length > 0) ||
    !!node?.perspective
  );
}

function isMeaningfullyIdentified(node: AnyNode): boolean {
  const aria = typeof node?.ariaLabel === "string" && node.ariaLabel.trim().length > 0;
  const cssId = typeof node?.cssId === "string" && node.cssId.trim().length > 0;
  const dataAttrs =
    node?.dataAttributes && typeof node.dataAttributes === "object"
      ? Object.keys(node.dataAttributes).length > 0
      : false;
  const interactions =
    Array.isArray(node?.interactions) && node.interactions.length > 0;
  const componentish = !!node?.isComponent || !!node?.componentId || !!node?.componentKey;

  return aria || cssId || dataAttrs || interactions || componentish;
}

function isVisuallySignificant(node: AnyNode): boolean {
  if (!node) return false;
  if (node.type === "TEXT") return true;
  if (node.type === "IMAGE") return true;
  if (node.type === "VECTOR") return true;
  if (typeof node?.svgContent === "string" && node.svgContent.trim()) return true;
  if (hasVisibleFills(node)) return true;
  if (hasVisibleStrokes(node)) return true;
  if (hasVisibleEffects(node)) return true;
  if (isOpacityWrapper(node)) return true;
  if (isClippingWrapper(node)) return true;
  if (hasTransformOrFilters(node)) return true;
  return false;
}

function extractTextPreview(node: AnyNode, limit = 42): string | null {
  if (!node) return null;
  if (node.type === "TEXT" && typeof node.characters === "string") {
    const text = node.characters.replace(/\s+/g, " ").trim();
    if (!text) return null;
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    const t = extractTextPreview(child, limit);
    if (t) return t;
  }
  return null;
}

function looksGenericName(name: any): boolean {
  const n = typeof name === "string" ? name.trim() : "";
  if (!n) return true;
  return /^(frame|group|div|span|container|wrapper|svg|image|text)$/i.test(n);
}

function deriveProfessionalName(node: AnyNode): string | null {
  if (!node) return null;
  const tag = typeof node.htmlTag === "string" ? node.htmlTag.toLowerCase() : "";

  if (tag && SEMANTIC_TAG_NAMES[tag]) {
    return SEMANTIC_TAG_NAMES[tag];
  }

  const aria = typeof node.ariaLabel === "string" ? node.ariaLabel.trim() : "";
  if (aria) return aria;

  const attrs = node?.attributes && typeof node.attributes === "object" ? node.attributes : null;
  const alt = typeof attrs?.alt === "string" ? attrs.alt.trim() : "";
  if (node.type === "IMAGE" && alt) return `Image: ${alt}`;

  const cssId = typeof node.cssId === "string" ? node.cssId.trim() : "";
  if (cssId) return `#${cssId}`;

  const dataAttrs =
    node?.dataAttributes && typeof node.dataAttributes === "object"
      ? node.dataAttributes
      : null;
  // Intentionally ignore data-testid/class names for naming: they often produce noisy,
  // unprofessional layer names. Prefer semantic tags + aria-label + real text content.
  void dataAttrs;

  if (node.type === "TEXT") {
    const t = extractTextPreview(node);
    if (t) return t;
  }

  const t = extractTextPreview(node);
  if (t) {
    if (tag === "button") return `Button: ${t}`;
    if (tag === "a") return `Link: ${t}`;
  }

  return null;
}

function clearRelativeLayout(node: AnyNode): void {
  if (!node?.layout || typeof node.layout !== "object") return;
  delete node.layout.relativeX;
  delete node.layout.relativeY;
}

function maxDepth(node: AnyNode, depth: number): number {
  if (!node) return depth;
  const kids = Array.isArray(node.children) ? node.children : [];
  let m = depth;
  for (const k of kids) m = Math.max(m, maxDepth(k, depth + 1));
  return m;
}

function normalizeNode(
  node: AnyNode,
  result: TreeNormalizationResult
): AnyNode[] {
  if (!node) return [];

  const children = Array.isArray(node.children) ? node.children : [];
  const normalizedChildren: AnyNode[] = [];
  for (const child of children) {
    normalizedChildren.push(...normalizeNode(child, result));
  }
  node.children = normalizedChildren;

  // Normalize pseudo-elements if present.
  if (node.pseudoElements && typeof node.pseudoElements === "object") {
    if (node.pseudoElements.before) {
      const before = normalizeNode(node.pseudoElements.before, result);
      node.pseudoElements.before = before.length === 1 ? before[0] : null;
    }
    if (node.pseudoElements.after) {
      const after = normalizeNode(node.pseudoElements.after, result);
      node.pseudoElements.after = after.length === 1 ? after[0] : null;
    }
  }

  // Professional naming pass (only if current name is generic).
  if (looksGenericName(node.name)) {
    const derived = deriveProfessionalName(node);
    if (derived && derived !== node.name) {
      node.name = derived;
      result.renamedNodes++;
    }
  }

  const tag = typeof node.htmlTag === "string" ? node.htmlTag.toLowerCase() : "";
  const hasPseudo =
    !!node?.pseudoElements?.before || !!node?.pseudoElements?.after;

  // Remove empty, non-visual generic wrappers.
  if (
    node.type === "FRAME" &&
    !hasPseudo &&
    (!node.children || node.children.length === 0) &&
    GENERIC_TAGS.has(tag) &&
    !isMeaningfullyIdentified(node) &&
    !isVisuallySignificant(node)
  ) {
    result.removedNodes++;
    return [];
  }

  // Collapse trivial single-child wrappers (geometry preserved using absolute coords during import).
  if (
    node.type === "FRAME" &&
    !hasPseudo &&
    node.children &&
    node.children.length === 1 &&
    GENERIC_TAGS.has(tag) &&
    !isMeaningfullyIdentified(node) &&
    !isVisuallySignificant(node)
  ) {
    const onlyChild = node.children[0];
    // Child will be re-parented; any relativeX/Y computed against this wrapper is now wrong.
    clearRelativeLayout(onlyChild);
    result.collapsedWrappers++;
    result.removedNodes++;
    return [onlyChild];
  }

  return [node];
}

export function normalizeSchemaTreeForFigma(
  schema: AnyNode
): TreeNormalizationResult {
  const root = schema?.root;
  const initial: TreeNormalizationResult = {
    removedNodes: 0,
    collapsedWrappers: 0,
    renamedNodes: 0,
    maxDepthBefore: maxDepth(root, 1),
    maxDepthAfter: 1,
  };

  if (!root) {
    initial.maxDepthAfter = initial.maxDepthBefore;
    return initial;
  }

  const normalized = normalizeNode(root, initial);
  schema.root = normalized.length === 1 ? normalized[0] : normalized[0] || root;

  initial.maxDepthAfter = maxDepth(schema.root, 1);
  return initial;
}
