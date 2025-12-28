# VERIFIED PIXEL-PERFECT FIDELITY ANALYSIS

**Analysis Date**: 2025-12-27
**Audit Script**: `tools/validation/fidelity-audit.mjs` (corrected)
**Schema File**: `/Users/skirk92/figmacionvert-2/page-capture-1766834949060.json`

---

## FILE VERIFICATION

```
Path: /Users/skirk92/figmacionvert-2/page-capture-1766834949060.json
Size: 43,616,053 bytes (41.6 MB)
SHA256: 5eaedbf0570c8e33f9018515849da2615f3c1dc11670a80bd9f2e53861cb5929
Source: Etsy.com
Nodes: 1,844 (FRAME: 1,331 | TEXT: 369 | VECTOR: 75 | IMAGE: 69)
```

---

## FIDELITY SCORE: 62.5% (25/40 checks)

**15 BLOCKERS IDENTIFIED**

---

## ✅ WHAT'S WORKING (25 checks passed)

### Layout (4/7 passed)
- ✅ **absolute_positioning**: `absoluteLayout.left/top/width/height` present
- ✅ **dpr_scaling**: `metadata.viewport.devicePixelRatio = 2`
- ✅ **transform_matrix**: 6 nodes with CSS transforms detected in `layoutContext.transform`
- ✅ **position_fixed**: 2 fixed position nodes detected

### Stacking (5/5 passed)
- ✅ **z_index**: Present in `layoutContext.zIndex`
- ✅ **stacking_contexts**: `layoutContext._stackingContext` tracked
- ✅ **opacity_groups**: Opacity values present
- ✅ **clip_overflow**: `layoutContext.overflow` captured
- ✅ **masks**: Not applicable (rare feature)

### Visuals (5/7 passed)
- ✅ **fills**: Color fills present
- ✅ **borders**: Stroke data captured
- ✅ **border_radius_per_corner**: `cornerRadius` values present
- ✅ **shadows**: Effects array present
- ✅ **gradients**: 9 gradient fills detected

### Text (9/10 passed)
- ✅ **font_family**: `fontName.family` + `textStyle.fontFamily`
- ✅ **font_weight**: `textStyle.fontWeight`
- ✅ **font_style**: `fontName.style` + `textStyle.fontStyle`
- ✅ **line_height**: Proper pixel values in `lineHeight`
- ✅ **letter_spacing**: Pixel values in `letterSpacing`
- ✅ **text_transform**: `textTransform` + `textStyle.textTransform` captured
- ✅ **text_decoration**: Values present
- ✅ **text_wrapping**: `textAutoResize` values present
- ✅ **text_bounds**: All 369 TEXT nodes have `absoluteLayout`

### Images (1/7 passed)
- ✅ **format_support**: 69 IMAGE nodes with fills

### Special (1/4 passed)
- ✅ **svg_handling**: 75 SVG/VECTOR nodes

---

## ❌ CRITICAL BLOCKERS (Must Fix)

### 1. IMAGE Properties (6 blockers - all IMAGE nodes affected)

**Impact**: All 69 IMAGE nodes missing sizing and scaling data

#### 1a. intrinsic_size ⚠️ **CRITICAL**
- **Evidence**: No `intrinsicSize` field
- **Expected**: `{ width: naturalWidth, height: naturalHeight }`
- **Capture Location**: `chrome-extension/src/utils/dom-extractor.ts:~7030` (in `applyImageExtraction()`)
- **Fix**: Extract `img.naturalWidth` and `img.naturalHeight`

#### 1b. object_fit ⚠️ **CRITICAL**
- **Evidence**: No `imageFit` field
- **Expected**: `"fill" | "contain" | "cover" | "none" | "scale-down"`
- **Capture Location**: Same as 1a
- **Fix**: Read `computed.objectFit`

#### 1c. aspect_ratio ⚠️ **HIGH**
- **Evidence**: No `aspectRatio` field
- **Expected**: `intrinsicWidth / intrinsicHeight`
- **Capture Location**: Same as 1a
- **Fix**: Calculate from intrinsic size

#### 1d. exif_orientation ⚠️ **LOW**
- **Evidence**: No EXIF data
- **Impact**: Minimal (web images usually pre-oriented)

#### 1e. cors_handling ⚠️ **LOW**
- **Evidence**: No `crossOrigin` field
- **Impact**: Informational only

#### 1f. alpha_channel ⚠️ **LOW**
- **Evidence**: No `hasAlpha` field
- **Impact**: Figma handles transparently

**IMPORTER IMPACT**: Without intrinsicSize and imageFit, Figma cannot:
- Preserve aspect ratios correctly
- Apply proper image scaling (contain vs cover vs fill)
- Handle object-fit: none correctly

---

### 2. CSS Filters ⚠️ **HIGH**

- **Evidence**: No `filters` field
- **Expected**: Array of `{ type: 'blur' | 'brightness' | ..., value: number }`
- **Capture Location**: `chrome-extension/src/utils/dom-extractor.ts` (add after line 4670)
- **Fix**: Parse `computed.filter` (e.g., "blur(5px)" → `[{ type: 'blur', radius: 5 }]`)
- **Importer Fix**: Map blur to `LAYER_BLUR` effect in Figma

**NOTE**: 0 instances on Etsy page, but needed for general pixel-perfect support

---

### 3. Blend Modes ⚠️ **HIGH**

- **Evidence**: No `blendMode` or `mixBlendMode` field
- **Expected**: Figma blend mode enum (e.g., `"MULTIPLY"`, `"SCREEN"`)
- **Capture Location**: Same as filters
- **Fix**: Map `computed.mixBlendMode` to Figma enum
- **Mapping**: Direct 1:1 (multiply→MULTIPLY, screen→SCREEN, etc.)

**NOTE**: 0 instances on Etsy page

---

### 4. Transform Individual Values ⚠️ **MEDIUM**

- **Evidence**: No `transform.rotate` or `transform.scale` fields
- **Current**: Transforms exist as strings in `layoutContext.transform` (6 nodes)
- **Expected**: Parsed matrix values in `transform.matrix` field
- **Status**: **PARSING CODE EXISTS** at line 9979 (`extractTransformData()`) but is **NEVER CALLED**

**FIX**: In `buildNode()` around line 4656, add:
```typescript
if (computed.transform && computed.transform !== 'none') {
  const transformData = this.extractTransformData(computed, element);
  if (transformData) {
    node.transform = transformData;
  }
}
```

**Importer Fix**: Apply `node.transform.matrix` to `frameNode.relativeTransform`

---

### 5. Baseline Alignment ⚠️ **LOW**

- **Evidence**: No `baselineOffset` or `verticalAlign` field
- **Impact**: Inline text vertical alignment may be incorrect
- **Fix**: Capture `computed.verticalAlign` for inline elements
- **Importer Fix**: No perfect Figma mapping (approximate with `textAlignVertical`)

---

## ⚠️ LOW PRIORITY / NOT APPLICABLE

### 6-10. Page-Specific Absences (Not Blockers)

- **scroll_offsets**: Not needed for static captures
- **position_sticky**: 0 sticky nodes on Etsy (but properly captured in `layoutContext.position`)
- **canvas_fallback**: 0 canvas elements on Etsy
- **video_fallback**: 0 video elements on Etsy
- **pseudo_elements**: 176 pseudo nodes exist but content extraction not implemented

---

## 🔍 END-TO-END VERIFICATION REQUIRED

For the top 5 blockers, verify each stage:

### Stage 1: Capture (dom-extractor.ts)
- [ ] Field exists in captured node
- [ ] Value is correct (matches browser computed value)
- [ ] Field survives JSON serialization

### Stage 2: Server (handoff-server.cjs)
- [ ] Schema passes through unchanged
- [ ] No field stripping or transformation

### Stage 3: Plugin Import (node-builder.ts, enhanced-figma-importer.ts)
- [ ] Field is read from schema
- [ ] Value is applied to Figma node
- [ ] Figma API call succeeds

### Stage 4: Visual Output
- [ ] Visual appearance matches source
- [ ] Pixel diff < 1px
- [ ] No visual artifacts

**Priority for verification**:
1. Image properties (affects all 69 IMAGE nodes)
2. Transform parsing (affects 6 transformed nodes)
3. Filters (0 instances but needed for completeness)
4. Blend modes (0 instances but needed)
5. Baseline alignment (subtle visual effect)

---

## 📊 IMPLEMENTATION PRIORITY

### Phase 1 - Critical (Image Properties)
**Impact**: 62.5% → 72.5% (+10%)

- Add `intrinsicSize`, `imageFit`, `aspectRatio` to IMAGE extraction
- Update importer to apply image scale modes
- **LOC**: ~20 lines capture + ~25 lines importer

### Phase 2 - High (Transforms)
**Impact**: 72.5% → 75% (+2.5%)

- Call existing `extractTransformData()` function
- Update importer to apply `relativeTransform`
- **LOC**: ~5 lines capture + ~15 lines importer

### Phase 3 - Optional (Filters + Blend Modes)
**Impact**: 75% → 80% (+5%)

- Implement filter parsing
- Implement blend mode mapping
- **LOC**: ~60 lines total

**Expected Final Score**: 80% (32/40 checks)

**Remaining 20%**: Edge cases (baseline, pseudo-content, EXIF, etc.)

---

## 🎯 ACCURATE CONCLUSIONS

### What the Audit Actually Shows

**PASS (62.5%)**: Core layout, text, and visual properties are captured correctly

**FAIL (37.5%)**: Missing image metadata, unparsed transforms, and optional effects

### What the Audit Does NOT Show

- Whether captured fields are **applied correctly** in the importer
- Whether Figma output is **visually pixel-perfect**
- Whether there are **importer bugs** that ignore schema data

### Next Steps (Non-Negotiable)

1. ✅ **Fix audit contradictions** (DONE)
2. ✅ **Verify file with SHA256** (DONE)
3. ✅ **Produce TRUE blocker list** (DONE)
4. ⬜ **Verify TOP 5 end-to-end**:
   - Capture intrinsicSize → check schema → verify importer uses it → confirm visual output
   - Parse transforms → check schema → verify importer applies matrix → confirm rotation/scale
   - Add filters → check schema → verify importer creates effects → confirm blur
   - Add blend modes → check schema → verify importer applies mode → confirm visual blend
   - Add baseline → check schema → verify importer approximates → measure text position

**Only after end-to-end verification can we claim pixel-perfect rendering.**

---

## 🚫 WHAT NOT TO DO

- ❌ Don't implement fixes without end-to-end verification
- ❌ Don't trust "field exists in schema" = "pixel perfect output"
- ❌ Don't create more plans or harnesses
- ❌ Don't claim improvements without visual diff validation

## ✅ WHAT TO DO NEXT

1. Pick ONE blocker (recommend: image intrinsicSize)
2. Verify end-to-end:
   - Does current capture work? (inspect schema)
   - Does importer read it? (add console.log in node-builder.ts)
   - Does Figma apply it? (inspect Figma node properties)
   - Does output match? (visual diff)
3. If any stage fails, FIX that stage
4. Re-verify
5. Move to next blocker

**Only implement code changes when verification shows they're needed.**
