# Pixel-Perfect Accuracy: Remaining Issues Analysis

## Summary

This document identifies all remaining issues preventing pixel-perfect visual accuracy in Figma imports.

---

## 🔴 CRITICAL ISSUES (High Impact on Visual Accuracy)

### 1. CSS Transforms Not Visually Applied

**Location:** `figma-plugin/src/node-builder.ts:1274-1276`, `1308-1320`

**Problem:**

- Only `rotation` is applied to nodes
- `scale`, `skew`, and `matrix` transforms are stored in plugin data but **not visually applied**
- `transform-origin` is not accounted for
- Transformed elements appear in wrong positions/sizes

**Current Code:**

```typescript
// Only rotation is applied
if ("rotation" in node) {
  (node as any).rotation = data.layout.rotation || 0;
}

// Transform matrix is stored but not applied
if (data.layoutContext.transform && data.layoutContext.transform.matrix) {
  this.safeSetPluginData(
    node,
    "cssTransform",
    JSON.stringify(data.layoutContext.transform)
  );
}
```

**Impact:**

- Rotated/scaled elements don't match original
- Skewed elements appear as rectangles
- Complex transforms (matrix) are completely ignored
- Elements with transforms are positioned incorrectly

**Fix Required:**

- Apply scale using `node.resize()` with scaled dimensions
- Apply rotation (already done)
- For skew/matrix: Create a wrapper frame and apply transform, or use vector paths
- Account for `transform-origin` when calculating position

---

### 2. Text Node Positioning and Sizing Issues ✅ FIXED

**Location:** `figma-plugin/src/node-builder.ts:632-648`

**Problem (FIXED):**

- **CRITICAL BUG**: Text nodes were setting position using absolute coordinates directly, bypassing the relative positioning logic used by all other nodes
- This caused text to appear in completely wrong positions

**Fix Applied:**

- Removed direct position setting in `createText()`
- Text nodes now use `applyPositioning()` like all other nodes
- Position is calculated relative to parent, accounting for Auto Layout, padding, etc.

**Remaining Issues:**

1. **Font metrics compensation may be inaccurate** - Font fallback ratios may not match browser
2. **Text bounds calculation** - `renderedMetrics` may not match actual text bounds
3. **Line height calculation** - May not match browser rendering exactly

**Impact:**

- ✅ Text positioning now matches other nodes (FIXED)
- ⚠️ Text sizing may still be inaccurate
- ⚠️ Line height/spacing may be incorrect
- ⚠️ Multi-line text may wrap differently

**Further Fixes Needed:**

- Improve font metrics compensation accuracy
- Verify text bounds match browser rendering
- Handle text wrapping more accurately

---

### 3. Border/Stroke Compensation May Be Inaccurate

**Location:** `figma-plugin/src/node-builder.ts:1200-1283`

**Problem:**

- Stroke compensation logic exists but may not handle all edge cases
- `box-sizing: border-box` vs `content-box` compensation may be wrong
- Multiple strokes (outline + border) may not be handled correctly
- Stroke alignment (INSIDE/OUTSIDE/CENTER) compensation may be inaccurate

**Impact:**

- Elements with borders are wrong size
- Border-box elements may be too large/small
- Multiple stroke elements have incorrect dimensions

**Fix Required:**

- Verify stroke compensation calculations
- Test with various box-sizing values
- Handle multiple stroke types correctly

---

### 4. Effects/Shadows May Not Match Exactly

**Location:** `figma-plugin/src/node-builder.ts:1865-1879`, `convertEffects()`

**Problem:**

- Box shadows are converted but may not match browser rendering exactly
- Shadow blur radius may be calculated differently
- Multiple shadows may not be in correct order
- Inner shadows may not be positioned correctly

**Impact:**

- Shadows appear in wrong positions
- Shadow blur doesn't match original
- Shadow colors/opacity may be off

**Fix Required:**

- Verify shadow conversion matches browser rendering
- Test with multiple shadows
- Ensure shadow order matches CSS

---

### 5. Auto Layout Detection Edge Cases

**Location:** `figma-plugin/src/enhanced-figma-importer.ts:1056-1100`

**Problems:**

1. **Some flex containers not detected** - Only checks for `autoLayout` object
2. **Grid layouts not fully converted** - Grid may not be detected as Auto Layout
3. **Nested Auto Layout issues** - Children of Auto Layout parents may have positioning conflicts
4. **Gap/spacing calculation** - CSS `gap` may not be captured correctly

**Impact:**

- Flexbox layouts don't match original
- Grid layouts are wrong
- Spacing between items is incorrect
- Alignment is off

**Fix Required:**

- Improve Auto Layout detection (check computed styles)
- Better grid-to-Auto-Layout conversion
- Fix nested Auto Layout positioning
- Verify gap/spacing calculations

---

### 6. IFrames Not Captured (Content Missing)

**Location:** `chrome-extension/src/utils/dom-extractor.ts:1549-1561`

**Problem:**

- IFrames get placeholder "Embed" nodes instead of actual content
- Cross-origin iframes cannot be accessed (security restriction)
- Even same-origin iframes may not be captured if script injection fails

**Impact:**

- Major visual gaps (ads, embeds, widgets are missing)
- Page looks incomplete
- User-visible content is missing

**Fix Required:**

- Inject script into accessible iframes
- Handle cross-origin iframes gracefully (screenshot fallback)
- Capture iframe content when possible

---

## 🟡 MEDIUM PRIORITY ISSUES

### 7. Image Object-Fit/Object-Position Edge Cases

**Location:** `figma-plugin/src/node-builder.ts:2860-2871`, `parseObjectPositionToTransform()`

**Problem:**

- `object-fit: cover/contain` may not match browser exactly
- `object-position` with percentages may be calculated incorrectly
- Complex `object-position` values (e.g., "right 20px bottom 10px") may not be handled

**Impact:**

- Images are scaled/positioned incorrectly
- Aspect ratios may be wrong
- Image cropping doesn't match original

**Fix Required:**

- Verify object-fit calculations match browser
- Improve object-position parsing
- Test with various object-position values

---

### 8. Background Image Positioning

**Location:** `figma-plugin/src/node-builder.ts:2434-2453`, `calculateImageTransform()`

**Problem:**

- `background-position` with keywords may not be calculated correctly
- `background-size: cover/contain` may not match browser exactly
- Background repeat is not fully supported

**Impact:**

- Background images appear in wrong positions
- Background images are scaled incorrectly
- Repeating backgrounds don't work

**Fix Required:**

- Verify background-position calculations
- Improve background-size handling
- Add support for background-repeat

---

### 9. Font Loading and Fallback Issues

**Location:** `figma-plugin/src/node-builder.ts:150-244`

**Problem:**

- Font fallback chain may not match browser's actual fallback
- Font metrics ratio may be inaccurate for some font pairs
- Web fonts may not load correctly
- Font loading happens after text creation attempt

**Impact:**

- Text appears in wrong font
- Text sizing is incorrect
- Font metrics don't match

**Fix Required:**

- Improve font fallback matching
- Verify font metrics ratios
- Ensure fonts load before text creation

---

### 10. Z-Index/Stacking Order Issues

**Location:** `figma-plugin/src/enhanced-figma-importer.ts:629-680`

**Problem:**

- Z-index sorting may not handle all cases correctly
- Stacking context creation may be incomplete
- Positioned vs non-positioned element ordering may be wrong

**Impact:**

- Elements appear in wrong visual order
- Overlapping elements are incorrect
- Stacking contexts don't match

**Fix Required:**

- Verify z-index sorting logic
- Handle stacking contexts correctly
- Test with complex z-index scenarios

---

## 🟢 LOW PRIORITY ISSUES (Polish)

### 11. Opacity/Visibility Edge Cases

**Location:** `figma-plugin/src/node-builder.ts:1745-1748`

**Problem:**

- Opacity may not be applied correctly in all cases
- Visibility: hidden elements may still be created
- Display: none elements may be included

**Impact:**

- Some elements are too visible/not visible enough
- Hidden elements clutter the design

**Fix Required:**

- Verify opacity application
- Skip visibility: hidden elements
- Skip display: none elements

---

### 12. Corner Radius Edge Cases

**Location:** `figma-plugin/src/node-builder.ts:1858-1863`

**Problem:**

- Border-radius with percentages may not be calculated correctly
- Individual corner radius values may not be handled
- Elliptical border-radius may not be supported

**Impact:**

- Corner radius doesn't match original
- Some rounded corners are wrong

**Fix Required:**

- Verify corner radius calculations
- Handle individual corner values
- Support elliptical border-radius

---

## Testing Recommendations

To verify fixes and identify remaining issues:

1. **Test with Complex Pages:**

   - Pages with transforms (rotate, scale, skew)
   - Pages with complex layouts (flexbox, grid)
   - Pages with iframes
   - Pages with custom fonts

2. **Visual Comparison:**

   - Screenshot original page
   - Screenshot Figma import
   - Compare pixel-by-pixel
   - Measure differences

3. **Position Verification:**

   - Re-enable position verification (with sampling)
   - Compare actual vs expected positions
   - Identify systematic errors

4. **Element-by-Element Check:**
   - Verify each element type (text, images, shapes)
   - Check positioning, sizing, colors, effects
   - Document discrepancies

---

## Priority Fix Order

1. **CSS Transforms** (Critical - affects many elements)
2. **Text Positioning/Sizing** (Critical - text is everywhere)
3. **Auto Layout Edge Cases** (High - affects layout accuracy)
4. **IFrames** (High - major visual gaps)
5. **Border/Stroke Compensation** (Medium - affects sizing)
6. **Effects/Shadows** (Medium - visual polish)
7. **Image Positioning** (Medium - affects image accuracy)
8. **Font Loading** (Low - mostly works)
9. **Z-Index** (Low - edge cases)
10. **Opacity/Visibility** (Low - polish)

---

## Next Steps

1. Fix CSS transforms (apply scale, skew, matrix)
2. Fix text positioning (use relative positioning)
3. Improve Auto Layout detection
4. Add iframe content capture
5. Verify and fix border/stroke compensation
6. Test with real-world pages
7. Re-enable position verification (with sampling)
