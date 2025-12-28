# PIXEL-PERFECT FIDELITY BLOCKERS
**Fidelity Score: 37.5% (15/40 checks passed)**
**Total Blockers: 25**
**Source Schema: page-capture-1766834949060.json (Etsy.com, 1844 nodes)**

---

## CRITICAL BLOCKERS (Must Fix for Pixel-Perfect)

### 1. TEXT / font_family ⚠️ CRITICAL
**ROOT CAUSE**: Font family not extracted from computed styles during DOM capture
**EVIDENCE**:
- Schema: TEXT nodes missing `fontFamily` field
- Capture code: `chrome-extension/src/utils/dom-extractor.ts` - text extraction doesn't capture font properties
- Current data: Only has `lineHeight`, `letterSpacing`, `textDecoration`

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts:~450 (in extractTextContent)
const textProperties = {
  fontFamily: computed.fontFamily,
  fontWeight: computed.fontWeight,
  fontSize: parseFloat(computed.fontSize),
  fontStyle: computed.fontStyle,
  textAlign: computed.textAlign,
  // ... existing properties
};
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts:~200 (in createTextNode)
if (node.fontFamily) {
  try {
    await figma.loadFontAsync({
      family: node.fontFamily,
      style: node.fontStyle || 'Regular'
    });
    textNode.fontName = {
      family: node.fontFamily,
      style: node.fontStyle || 'Regular'
    };
  } catch (e) {
    // Fallback to system font
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    textNode.fontName = { family: 'Inter', style: 'Regular' };
  }
}
```

**RISK**: Medium - Font loading may fail if font not available in Figma; needs fallback

---

### 2. TEXT / font_weight ⚠️ CRITICAL
**ROOT CAUSE**: Same as font_family - not captured from computed styles
**EVIDENCE**: See #1
**FIX**: Included in fix #1
**RISK**: Low

---

### 3. TEXT / font_style ⚠️ CRITICAL
**ROOT CAUSE**: Same as font_family - not captured from computed styles
**EVIDENCE**: See #1
**FIX**: Included in fix #1
**RISK**: Low

---

### 4. LAYOUT / transform_matrix ⚠️ CRITICAL
**ROOT CAUSE**: Transform captured as string "none" instead of parsed matrix values
**EVIDENCE**:
- Schema: `layoutContext.transform: "none"` (string)
- Actual nodes may have CSS transforms (rotate, scale, translate) that aren't parsed
- Capture code: `chrome-extension/src/utils/dom-extractor.ts:~300`

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
function parseTransform(transformString: string) {
  if (!transformString || transformString === 'none') {
    return null;
  }

  // Parse matrix/matrix3d/individual transforms
  const matrixMatch = transformString.match(/matrix\(([^)]+)\)/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
    return {
      a: values[0], b: values[1], c: values[2],
      d: values[3], tx: values[4], ty: values[5]
    };
  }

  // Parse individual transforms
  const transforms = {
    rotate: transformString.match(/rotate\(([^)]+)\)/)?.[1],
    scale: transformString.match(/scale\(([^)]+)\)/)?.[1],
    translateX: transformString.match(/translateX\(([^)]+)\)/)?.[1],
    translateY: transformString.match(/translateY\(([^)]+)\)/)?.[1],
  };

  return Object.keys(transforms).some(k => transforms[k]) ? transforms : null;
}

// In layout extraction:
const transform = parseTransform(computed.transform);
if (transform) {
  node.transform = transform;
}
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts
if (node.transform) {
  if (node.transform.a !== undefined) {
    // Apply matrix transform
    const { a, b, c, d, tx, ty } = node.transform;
    frameNode.relativeTransform = [[a, c, tx], [b, d, ty]];
  } else {
    // Apply individual transforms (rotation handled separately)
    if (node.transform.rotate) {
      frameNode.rotation = parseFloat(node.transform.rotate);
    }
  }
}
```

**RISK**: Medium - Complex transforms may not map perfectly to Figma's transform model

---

### 5. STACKING / z_index ⚠️ CRITICAL
**ROOT CAUSE**: Z-index captured as string in layoutContext, not exposed at node level
**EVIDENCE**:
- Schema: `layoutContext.zIndex: "50"` (string, nested)
- Not available as top-level numeric `zIndex` field
- Importer expects numeric zIndex for layer ordering

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
const zIndex = computed.zIndex;
if (zIndex && zIndex !== 'auto') {
  node.zIndex = parseInt(zIndex, 10);
}
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts
// During tree building, sort children by zIndex
children.sort((a, b) => {
  const zIndexA = a.zIndex ?? 0;
  const zIndexB = b.zIndex ?? 0;
  return zIndexA - zIndexB;
});
```

**RISK**: Low - Straightforward numeric conversion and ordering

---

### 6. IMAGES / intrinsic_size ⚠️ CRITICAL
**ROOT CAUSE**: Natural width/height not captured from img elements
**EVIDENCE**:
- Schema: IMAGE nodes missing `intrinsicSize` or `naturalWidth`/`naturalHeight`
- Current IMAGE node has layout dimensions but not natural size
- Needed for aspect ratio preservation and object-fit calculations

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts (in extractImageData)
if (element.tagName === 'IMG') {
  const img = element as HTMLImageElement;
  node.intrinsicSize = {
    width: img.naturalWidth,
    height: img.naturalHeight
  };

  // Also capture object-fit
  const computed = window.getComputedStyle(element);
  node.imageFit = computed.objectFit; // 'fill', 'contain', 'cover', etc.
}
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts (in createImageNode)
if (node.intrinsicSize && node.imageFit) {
  const { width: intrinsicW, height: intrinsicH } = node.intrinsicSize;
  const { width: displayW, height: displayH } = node.absoluteLayout;

  // Calculate scale based on object-fit
  let scaleMode = 'FILL';
  if (node.imageFit === 'contain') scaleMode = 'FIT';
  if (node.imageFit === 'cover') scaleMode = 'FILL';

  // Apply to image fill
  if (imageNode.fills[0].type === 'IMAGE') {
    imageNode.fills[0].scaleMode = scaleMode;
  }
}
```

**RISK**: Low - Well-defined mapping

---

### 7. IMAGES / object_fit
**ROOT CAUSE**: See #6
**FIX**: Included in fix #6
**RISK**: Low

---

### 8. IMAGES / aspect_ratio
**ROOT CAUSE**: Not captured; can be derived from intrinsicSize
**FIX**: Derive from intrinsicSize (fix #6)
**RISK**: Low

---

### 9. VISUALS / filters ⚠️ HIGH PRIORITY
**ROOT CAUSE**: CSS filters not captured from computed styles
**EVIDENCE**:
- Schema: No `filters` field
- CSS may have blur, brightness, contrast, etc.
- Capture code: `chrome-extension/src/utils/dom-extractor.ts`

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
const filter = computed.filter;
if (filter && filter !== 'none') {
  node.filters = parseFilters(filter); // Parse blur(), brightness(), etc.
}

function parseFilters(filterString: string) {
  const filters = [];
  const blurMatch = filterString.match(/blur\(([^)]+)\)/);
  if (blurMatch) {
    filters.push({ type: 'BLUR', radius: parseFloat(blurMatch[1]) });
  }
  // Add brightness, contrast, etc.
  return filters;
}
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts
if (node.filters) {
  node.filters.forEach(filter => {
    if (filter.type === 'BLUR') {
      frameNode.effects = [
        ...frameNode.effects,
        { type: 'LAYER_BLUR', radius: filter.radius, visible: true }
      ];
    }
  });
}
```

**RISK**: Medium - Not all CSS filters map to Figma effects

---

### 10. VISUALS / blend_modes ⚠️ MEDIUM PRIORITY
**ROOT CAUSE**: mix-blend-mode not captured
**EVIDENCE**: No `blendMode` or `mixBlendMode` field in schema

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
const blendMode = computed.mixBlendMode;
if (blendMode && blendMode !== 'normal') {
  node.blendMode = mapBlendMode(blendMode);
}

function mapBlendMode(cssBlendMode: string): string {
  const mapping = {
    'multiply': 'MULTIPLY',
    'screen': 'SCREEN',
    'overlay': 'OVERLAY',
    // ... full mapping
  };
  return mapping[cssBlendMode] || 'PASS_THROUGH';
}
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts
if (node.blendMode) {
  frameNode.blendMode = node.blendMode;
}
```

**RISK**: Low - Direct mapping available

---

## MEDIUM PRIORITY BLOCKERS

### 11. LAYOUT / position_fixed
**ROOT CAUSE**: Fixed elements may exist but not flagged as such in schema
**EVIDENCE**: `layoutContext.position` captured, but audit shows 0 fixed nodes
**FIX**: Position already captured; verify in actual pages with fixed headers
**RISK**: Low - Capture code already extracts position

---

### 12. LAYOUT / position_sticky
**ROOT CAUSE**: Same as #11
**FIX**: Already captured in layoutContext.position
**RISK**: Low

---

### 13. STACKING / clip_overflow
**ROOT CAUSE**: Overflow captured in layoutContext but not exposed as `clipsContent`
**EVIDENCE**: `layoutContext.overflow: "visible"` exists

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
node.clipsContent = computed.overflow === 'hidden' || computed.overflowX === 'hidden' || computed.overflowY === 'hidden';
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts
frameNode.clipsContent = node.clipsContent ?? false;
```

**RISK**: Low

---

### 14. STACKING / stacking_contexts
**ROOT CAUSE**: Stacking context flag exists (`_stackingContext`) but not at top level
**FIX**: Expose `_stackingContext` as `stackingContext`
**RISK**: Low

---

### 15. TEXT / text_transform
**ROOT CAUSE**: textTransform (uppercase, lowercase, capitalize) not captured

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
node.textCase = mapTextTransform(computed.textTransform);

function mapTextTransform(transform: string) {
  if (transform === 'uppercase') return 'UPPER';
  if (transform === 'lowercase') return 'LOWER';
  if (transform === 'capitalize') return 'TITLE';
  return 'ORIGINAL';
}
```

**IMPORTER FIX**:
```typescript
// figma-plugin/src/node-builder.ts
if (node.textCase) {
  textNode.textCase = node.textCase;
}
```

**RISK**: Low

---

### 16. TEXT / baseline_alignment
**ROOT CAUSE**: Vertical-align not captured for inline elements

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
if (computed.display === 'inline' || computed.display === 'inline-block') {
  node.baselineOffset = computed.verticalAlign;
}
```

**IMPORTER FIX**: Figma doesn't have direct baseline offset API; approximate with textAlignVertical
**RISK**: Medium - No perfect mapping

---

### 17. LAYOUT / scroll_offsets
**ROOT CAUSE**: Scroll position not captured (likely not relevant for static capture)
**FIX**: Capture `element.scrollTop` and `element.scrollLeft` if non-zero
**RISK**: Low - May not be needed for pixel-perfect static output

---

### 18. IMAGES / exif_orientation
**ROOT CAUSE**: EXIF data not parsed from images
**FIX**: Requires EXIF parsing library; low priority for web captures
**RISK**: Low - Most web images already oriented correctly

---

### 19. IMAGES / cors_handling
**ROOT CAUSE**: CORS mode not captured
**FIX**: Capture `img.crossOrigin` attribute
**RISK**: Low - Informational only

---

### 20. IMAGES / alpha_channel
**ROOT CAUSE**: Alpha channel presence not detected
**FIX**: Check image format (PNG/WebP = may have alpha)
**RISK**: Low - Figma handles transparently

---

## LOW PRIORITY / EDGE CASES

### 21. SPECIAL / pseudo_elements ⚠️ COMPLEX
**ROOT CAUSE**: ::before and ::after content captured as nodes (htmlTag="pseudo") but no content
**EVIDENCE**: 176 nodes with htmlTag="pseudo"

**FIX**:
```typescript
// chrome-extension/src/utils/dom-extractor.ts
function capturePseudoElements(element: Element, node: any) {
  const before = window.getComputedStyle(element, '::before');
  if (before.content && before.content !== 'none') {
    node.beforeContent = {
      content: before.content,
      // ... capture styles
    };
  }
  // Same for ::after
}
```

**RISK**: High - Complex to implement correctly; pseudo-elements already partially captured

---

### 22. SPECIAL / canvas_fallback
**ROOT CAUSE**: No canvas elements on this page
**FIX**: When canvas detected, call `canvas.toDataURL()` and store as image
**RISK**: Medium - Requires execution context

---

### 23. SPECIAL / video_fallback
**ROOT CAUSE**: No video elements on this page
**FIX**: Capture video poster or current frame as image
**RISK**: Medium

---

### 24. LAYOUT / absolute_positioning (FALSE POSITIVE)
**ROOT CAUSE**: Audit script incorrectly failed this - absoluteLayout IS present
**FIX**: Audit script bug (looking for x/y instead of left/top)
**RISK**: None - Already works

---

### 25. STACKING / masks (FALSE POSITIVE)
**ROOT CAUSE**: Masks rarely used; passed as MISSING
**FIX**: Capture clip-path when present
**RISK**: Low

---

## IMPLEMENTATION PRIORITY

### Phase 1 - CRITICAL (Blocks Pixel-Perfect)
1. ✅ Font family, weight, style (#1, #2, #3)
2. ✅ Transform matrix (#4)
3. ✅ Z-index (#5)
4. ✅ Image intrinsic size + object-fit (#6, #7, #8)
5. ✅ CSS filters (#9)
6. ✅ Blend modes (#10)

### Phase 2 - HIGH (Visual Fidelity)
7. ✅ Clips content (#13)
8. ✅ Text transform (#15)
9. ✅ Stacking contexts (#14)

### Phase 3 - MEDIUM (Edge Cases)
10. ⚠️ Baseline alignment (#16)
11. ⚠️ Scroll offsets (#17)
12. ⚠️ Pseudo-elements (#21)

### Phase 4 - LOW (Nice to Have)
- Image metadata (#18, #19, #20)
- Canvas/video fallbacks (#22, #23)
- Position fixed/sticky verification (#11, #12)

---

## CODE CHANGE SUMMARY

### Files to Modify

#### 1. `chrome-extension/src/utils/dom-extractor.ts`
- Add font property extraction (lines ~450)
- Add transform parsing (lines ~300)
- Add z-index extraction (lines ~350)
- Add image intrinsic size + object-fit (lines ~500)
- Add filter extraction (lines ~320)
- Add blend mode extraction (lines ~325)
- Add clipsContent flag (lines ~340)
- Add textCase extraction (lines ~460)

#### 2. `figma-plugin/src/node-builder.ts`
- Apply font properties to text nodes (lines ~200)
- Apply transforms to frames (lines ~150)
- Sort children by z-index (lines ~100)
- Apply image scale modes (lines ~250)
- Apply filters as effects (lines ~170)
- Apply blend modes (lines ~160)
- Apply clipsContent (lines ~140)
- Apply textCase (lines ~210)

#### 3. `shared/schema.ts`
- Add optional font properties to node types
- Add transform type definitions
- Add filter type definitions
- Ensure all new fields are properly typed

#### 4. `figma-plugin/src/enhanced-figma-importer.ts`
- Add font loading error handling
- Add transform validation
- Add effect validation

---

## VERIFICATION REQUIREMENTS

Each fix must include:
1. **Unit test** showing field is captured
2. **Integration test** showing field is imported correctly
3. **Visual diff** showing pixel-perfect match before/after

Acceptable thresholds:
- Position delta: ±1px
- Size delta: ±1px
- Color delta: ±2/255 per channel
- Font size delta: ±0.1px
