# PIXEL-PERFECT FIDELITY IMPLEMENTATION PLAN

**Current Fidelity: 60.0% (24/40 checks passed)**
**Target Fidelity: 100%**

**Based on Actual Schema Analysis:**
- Source: `page-capture-1766834949060.json` (Etsy.com)
- Total Nodes: 1,844
- Schema Version: 2.0.0-production

---

## ✅ ALREADY WORKING (False Positives Fixed)

These were marked as FAIL but are actually captured correctly:

1. **✅ Font Family** - Captured in `fontName.family` and `textStyle.fontFamily`
2. **✅ Font Weight** - Captured in `textStyle.fontWeight`
3. **✅ Font Style** - Captured in `fontName.style` and `textStyle.fontStyle`
4. **✅ Z-Index** - Captured in `layoutContext.zIndex` (as string)
5. **✅ Stacking Contexts** - Captured in `layoutContext._stackingContext`
6. **✅ Clip/Overflow** - Captured in `layoutContext.overflow`
7. **✅ Absolute Positioning** - Captured in `absoluteLayout` (left/top/width/height)
8. **✅ DPR Scaling** - Captured in `metadata.viewport.devicePixelRatio`
9. **✅ Position (static/relative/absolute)** - Captured in `layoutContext.position`

---

## ❌ CRITICAL BLOCKERS (Must Fix)

### 1. Transform Parsing ⚠️ **HIGH PRIORITY**

**STATUS**: Transform captured as string "none" - not parsed into matrix/values

**CURRENT CODE**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts:9979-10102
private extractTransformData(computed: CSSStyleDeclaration, element: Element): any {
  const transform = computed.transform || 'none';
  // ... parsing code EXISTS but NOT APPLIED to nodes
}
```

**ROOT CAUSE**: Transform parsing functions exist but are never called/applied to nodes

**FIX REQUIRED**:
```typescript
// In buildNode() around line 4656, after cornerRadius:
if (computed.transform && computed.transform !== 'none') {
  const transformData = this.extractTransformData(computed, element);
  if (transformData) {
    node.transform = transformData; // Add to node
  }
}
```

**IMPORTER FIX**: `figma-plugin/src/node-builder.ts`
```typescript
if (node.transform?.matrix) {
  const [a, b, c, d, tx, ty] = node.transform.matrix;
  frameNode.relativeTransform = [[a, c, tx], [b, d, ty]];
}
```

**EVIDENCE**: `layoutContext.transform: "none"` (string, not parsed)
**RISK**: Medium - CSS transforms may not map perfectly to Figma

---

### 2. CSS Filters (blur, brightness, etc.) ⚠️ **HIGH PRIORITY**

**STATUS**: Not captured

**ROOT CAUSE**: CSS `filter` property not extracted

**FIX REQUIRED**: `chrome-extension/src/utils/dom-extractor.ts`
```typescript
// In buildNode() around line 4670
const filter = computed.filter;
if (filter && filter !== 'none') {
  node.filters = this.parseFilters(filter);
}

private parseFilters(filterString: string): any[] {
  const filters = [];

  // Parse blur()
  const blurMatch = filterString.match(/blur\(([^)]+)\)/);
  if (blurMatch) {
    const radius = parseFloat(blurMatch[1]);
    filters.push({ type: 'blur', radius });
  }

  // Parse brightness()
  const brightnessMatch = filterString.match(/brightness\(([^)]+)\)/);
  if (brightnessMatch) {
    const amount = parseFloat(brightnessMatch[1]);
    filters.push({ type: 'brightness', amount });
  }

  // Parse contrast(), saturate(), grayscale(), etc.
  // ... similar patterns

  return filters;
}
```

**IMPORTER FIX**: `figma-plugin/src/node-builder.ts`
```typescript
if (node.filters) {
  node.filters.forEach(filter => {
    if (filter.type === 'blur') {
      if (!frameNode.effects) frameNode.effects = [];
      frameNode.effects.push({
        type: 'LAYER_BLUR',
        radius: filter.radius,
        visible: true
      });
    }
    // Map other filters to Figma effects where possible
  });
}
```

**EVIDENCE**: No `filters` field in schema
**RISK**: Medium - Not all CSS filters map to Figma effects

---

### 3. Blend Modes (mix-blend-mode) ⚠️ **HIGH PRIORITY**

**STATUS**: Not captured

**ROOT CAUSE**: `mixBlendMode` property not extracted

**FIX REQUIRED**: `chrome-extension/src/utils/dom-extractor.ts`
```typescript
// In buildNode() around line 4675
const blendMode = computed.mixBlendMode;
if (blendMode && blendMode !== 'normal') {
  node.blendMode = this.mapCSSBlendModeToFigma(blendMode);
}

private mapCSSBlendModeToFigma(cssBlendMode: string): string {
  const mapping: Record<string, string> = {
    'normal': 'NORMAL',
    'multiply': 'MULTIPLY',
    'screen': 'SCREEN',
    'overlay': 'OVERLAY',
    'darken': 'DARKEN',
    'lighten': 'LIGHTEN',
    'color-dodge': 'COLOR_DODGE',
    'color-burn': 'COLOR_BURN',
    'hard-light': 'HARD_LIGHT',
    'soft-light': 'SOFT_LIGHT',
    'difference': 'DIFFERENCE',
    'exclusion': 'EXCLUSION',
    'hue': 'HUE',
    'saturation': 'SATURATION',
    'color': 'COLOR',
    'luminosity': 'LUMINOSITY'
  };
  return mapping[cssBlendMode] || 'PASS_THROUGH';
}
```

**IMPORTER FIX**: `figma-plugin/src/node-builder.ts`
```typescript
if (node.blendMode) {
  frameNode.blendMode = node.blendMode;
}
```

**EVIDENCE**: No `blendMode` or `mixBlendMode` in schema
**RISK**: Low - Direct 1:1 mapping exists

---

### 4. Image Intrinsic Size + Object-Fit ⚠️ **CRITICAL**

**STATUS**: Not captured

**ROOT CAUSE**: Natural image dimensions and object-fit not extracted

**FIX REQUIRED**: `chrome-extension/src/utils/dom-extractor.ts`
```typescript
// In applyImageExtraction() around line 7030
private async applyImageExtraction(
  element: Element,
  node: any,
  computed: CSSStyleDeclaration
): Promise<void> {
  node.type = "IMAGE";
  node.name = "Image";

  // ADD THIS:
  if (element.tagName === 'IMG') {
    const img = element as HTMLImageElement;
    node.intrinsicSize = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };
  }

  // ADD THIS:
  const objectFit = computed.objectFit || 'fill';
  node.imageFit = objectFit; // 'fill', 'contain', 'cover', 'scale-down', 'none'

  // Calculate aspect ratio
  if (node.intrinsicSize) {
    const { width, height } = node.intrinsicSize;
    if (width && height) {
      node.aspectRatio = width / height;
    }
  }

  // ... existing code
}
```

**IMPORTER FIX**: `figma-plugin/src/node-builder.ts`
```typescript
if (node.type === 'IMAGE' && node.intrinsicSize && node.imageFit) {
  const { width: intrinsicW, height: intrinsicH } = node.intrinsicSize;
  const { width: displayW, height: displayH } = node.absoluteLayout;

  // Map CSS object-fit to Figma scaleMode
  let scaleMode = 'FILL';
  if (node.imageFit === 'contain') scaleMode = 'FIT';
  if (node.imageFit === 'cover') scaleMode = 'FILL';
  if (node.imageFit === 'none') scaleMode = 'CROP';

  // Apply to image fill
  if (imageNode.fills && imageNode.fills[0] && imageNode.fills[0].type === 'IMAGE') {
    imageNode.fills[0].scaleMode = scaleMode;

    // For 'none', we need to maintain aspect ratio
    if (node.imageFit === 'none') {
      imageNode.resize(intrinsicW, intrinsicH);
    }
  }
}
```

**EVIDENCE**: No `intrinsicSize`, `imageFit`, or `aspectRatio` in IMAGE nodes
**RISK**: Low - Well-defined mapping

---

### 5. Text Transform → Text Case Mapping ⚠️ **CRITICAL**

**STATUS**: Captured as `textTransform: "none"` but needs Figma `textCase` mapping

**ROOT CAUSE**: CSS `textTransform` captured but not mapped to Figma's `textCase` enum

**FIX REQUIRED**: `chrome-extension/src/utils/dom-extractor.ts`
```typescript
// In extractTypographySafe() around line 4856, REPLACE:
node.textTransform = computed.textTransform || "none";

// WITH:
const textTransform = computed.textTransform || "none";
node.textTransform = textTransform; // Keep for reference
node.textCase = this.mapTextTransformToTextCase(textTransform);

private mapTextTransformToTextCase(transform: string): string {
  if (transform === 'uppercase') return 'UPPER';
  if (transform === 'lowercase') return 'LOWER';
  if (transform === 'capitalize') return 'TITLE';
  return 'ORIGINAL';
}
```

**IMPORTER FIX**: `figma-plugin/src/node-builder.ts`
```typescript
if (node.textCase && node.textCase !== 'ORIGINAL') {
  textNode.textCase = node.textCase;
}
```

**EVIDENCE**: `textTransform: "none"` exists, but no `textCase` field
**RISK**: Low - Simple mapping

---

## ⚠️ MEDIUM PRIORITY FIXES

### 6. Baseline Alignment

**STATUS**: Not captured

**FIX**: Capture `verticalAlign` for inline elements
```typescript
if (computed.display?.includes('inline')) {
  node.baselineOffset = computed.verticalAlign;
}
```

**RISK**: Medium - No perfect Figma mapping

---

### 7. Pseudo-Element Content

**STATUS**: 176 nodes tagged as `htmlTag: "pseudo"` but no content extracted

**ROOT CAUSE**: Pseudo-elements detected but content not captured

**FIX REQUIRED**: `chrome-extension/src/utils/dom-extractor.ts`
```typescript
// In capturePseudoElement() around line 6566
private capturePseudoElement(
  element: Element,
  pseudoSelector: '::before' | '::after',
  parentNode: any
): void {
  const pseudoStyle = ExtractionValidation.safeGetComputedStyle(element, pseudoSelector);
  if (!pseudoStyle) return;

  const content = pseudoStyle.content;
  if (!content || content === 'none' || content === 'normal') return;

  // CREATE NODE FOR PSEUDO ELEMENT
  const node: any = {
    id: nodeId,
    parentId: parentNode.id,
    type: isText ? 'TEXT' : 'FRAME',
    htmlTag: 'pseudo',
    // ADD THIS:
    pseudoContent: content.replace(/^["']|["']$/g, ''), // Remove quotes
    pseudoType: pseudoSelector, // '::before' or '::after'
    // ... rest of extraction
  };
}
```

**EVIDENCE**: 176 nodes with `htmlTag: "pseudo"` but no content
**RISK**: High - Complex CSS content values (images, counters, etc.)

---

## 📊 LOW PRIORITY / INFORMATIONAL

### 8. Scroll Offsets
**STATUS**: Not needed for static captures
**FIX**: Optional - capture `element.scrollTop/scrollLeft` if non-zero

### 9. Position Sticky
**STATUS**: No sticky elements on test page (Etsy)
**FIX**: Already captured in `layoutContext.position`

### 10. Image Metadata (EXIF, CORS, Alpha)
**STATUS**: Not critical for rendering fidelity
**FIX**: Optional metadata enhancements

### 11. Canvas/Video Fallbacks
**STATUS**: No canvas/video on test page
**FIX**: Implement when needed

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1 - Critical Capture Fixes (dom-extractor.ts)
- [ ] Add transform data to nodes (call existing `extractTransformData`)
- [ ] Implement `parseFilters()` and add to nodes
- [ ] Implement `mapCSSBlendModeToFigma()` and add to nodes
- [ ] Add `intrinsicSize`, `imageFit`, `aspectRatio` to IMAGE nodes
- [ ] Add `textCase` mapping to TEXT nodes

### Phase 2 - Importer Fixes (node-builder.ts, enhanced-figma-importer.ts)
- [ ] Apply `node.transform.matrix` to `relativeTransform`
- [ ] Map `node.filters` to Figma effects
- [ ] Apply `node.blendMode`
- [ ] Apply `node.imageFit` to image `scaleMode`
- [ ] Apply `node.textCase`

### Phase 3 - Schema Updates (shared/schema.ts)
- [ ] Add optional `transform?: TransformData` to node types
- [ ] Add optional `filters?: Filter[]` to node types
- [ ] Add optional `blendMode?: string` to node types
- [ ] Add optional `intrinsicSize?: { width: number; height: number }` to IMAGE type
- [ ] Add optional `imageFit?: string` to IMAGE type
- [ ] Add optional `aspectRatio?: number` to IMAGE type
- [ ] Add optional `textCase?: string` to TEXT type

### Phase 4 - Testing & Validation
- [ ] Build extension and plugin
- [ ] Test transform rendering
- [ ] Test filter effects
- [ ] Test blend modes
- [ ] Test image scaling
- [ ] Test text case
- [ ] Run pixel-perfect diff

---

## 🎯 EXPECTED IMPACT

**After Phase 1 & 2:**
- Fidelity Score: 60% → **85%**
- Remaining gaps: Edge cases (pseudo-elements, baseline, metadata)

**After Phase 3 (Optional enhancements):**
- Fidelity Score: 85% → **95%**

**Pixel-Perfect Threshold:**
- Position accuracy: ±1px
- Size accuracy: ±1px
- Color accuracy: ±2/255
- Text rendering: Exact (with font loading)

---

## 🔧 CODE CHANGE SUMMARY

**Files to Modify:**

1. **chrome-extension/src/utils/dom-extractor.ts** (~150 lines)
   - Add transform application (10 lines)
   - Add filter parsing (40 lines)
   - Add blend mode mapping (20 lines)
   - Add image intrinsic size (15 lines)
   - Add textCase mapping (10 lines)
   - Add pseudo-element content (optional, 30 lines)

2. **figma-plugin/src/node-builder.ts** (~80 lines)
   - Apply transforms (15 lines)
   - Apply filters (25 lines)
   - Apply blend modes (5 lines)
   - Apply image scaling (20 lines)
   - Apply textCase (5 lines)

3. **shared/schema.ts** (~30 lines)
   - Add type definitions for new fields

**Total LOC**: ~260 lines of new code

---

## ✅ VERIFICATION REQUIREMENTS

Each fix must include:
1. Unit test showing field is captured correctly
2. Integration test showing field is imported to Figma correctly
3. Visual diff showing pixel-perfect match

**Regression Harness** (to be created):
```bash
npm run fidelity-test <url>
```

Output:
- Schema capture
- Figma import
- Screenshot comparison
- Pixel diff report
- Pass/fail with delta metrics
