# Critical Fixes for Pixel-Perfect Accuracy

## Summary

Applied critical fixes to address the main issues preventing pixel-perfect visual accuracy in Figma imports.

---

## ✅ Fix #1: Always Create absoluteLayout

**Problem**: `absoluteLayout` was only created for `position: absolute/fixed` elements. For normal flow elements, the importer fell back to `layout.x/y` which are document coordinates, causing inconsistent coordinate system usage.

**Fix**: Always create `absoluteLayout` for ALL nodes in `dom-extractor.ts:445-467`

**Impact**: Consistent coordinate system throughout the pipeline. The importer can always use `absoluteLayout` instead of falling back to `layout.x/y`.

**Code Change**:

```typescript
// CRITICAL FIX: Always create absoluteLayout for consistent coordinate system
const absoluteLayout = {
  left: absoluteX,
  top: absoluteY,
  right: absoluteX + layoutWidth,
  bottom: absoluteY + layoutHeight,
  width: layoutWidth,
  height: layoutHeight,
};

const node: any = {
  // ... other properties
  absoluteLayout: absoluteLayout, // Always provided
};
```

---

## ✅ Fix #2: Timeout Returns Partial Schema

**Problem**: When DOM extraction timed out after 120 seconds, the promise rejected with an error, returning **zero schema data**. This caused complete import failure even if 90% of content was extracted.

**Fix**: Modified timeout handler to attempt recovery of partial schema before failing.

**Changes**:

1. Added `schemaInProgress` tracking in `DOMExtractor` class
2. Added `getPartialSchema()` method to extractor
3. Store extractor globally in injected script for timeout recovery
4. Modified timeout handler in `content-script.ts:1330-1387` to request partial schema

**Impact**: Complex pages that timeout will still import with whatever content was extracted, rather than failing completely.

**Code Changes**:

- `dom-extractor.ts`: Added `schemaInProgress` field and `getPartialSchema()` method
- `injected-script.ts`: Store extractor globally, handle `GET_PARTIAL_SCHEMA` message
- `content-script.ts`: Modified timeout to request and use partial schema

---

## ✅ Fix #3: Improved Position Calculation

**Problem**: Position calculation didn't account for parent padding when calculating relative positions, and didn't consistently use `absoluteLayout`.

**Fix**:

1. Always prefer `absoluteLayout` over `layout.x/y` in importer
2. Account for parent padding when calculating relative positions
3. Improved Auto Layout detection check

**Impact**: More accurate positioning, especially for elements inside Auto Layout containers with padding.

**Code Changes**:

- `enhanced-figma-importer.ts:1000-1045`: Always use `absoluteLayout` first, account for parent padding

---

## ✅ Fix #4: Auto Layout Padding Consideration

**Problem**: When calculating relative positions for children of Auto Layout parents, parent padding wasn't accounted for.

**Fix**: Subtract parent padding from relative position calculation.

**Impact**: Children in Auto Layout containers with padding are positioned correctly.

**Code Changes**:

- `enhanced-figma-importer.ts:1029-1031`: Account for parent padding in position calculation

---

## ✅ Fix #5: Image Fixes (Previously Applied)

**Status**: Already fixed in previous session

- Natural dimensions used for transforms
- Dimensions preserved on timeout/proxy
- Correct scaleMode mapping
- ImageTransform preserved

---

## Remaining Critical Issues

### 🔴 High Priority (Still Need Fixing):

1. **Text Extraction Issues**

   - Some text nodes may not be extracted if they have zero dimensions
   - Font matching may not work for all web fonts
   - Text decoration/transform may be missing

2. **Auto Layout Detection Edge Cases**

   - Some flex containers may not be detected
   - Grid layouts need better conversion
   - Nested Auto Layout may have issues

3. **CSS Transforms Not Applied**

   - Transform matrices stored but not visually applied
   - Transform-origin not accounted for
   - Rotation/scale may not match original

4. **IFrame Content Missing**

   - IFrames get placeholder "Embed" nodes
   - Cross-origin iframes cannot be accessed
   - Need screenshot fallback for iframes

5. **Background Color Override**
   - Body background can override main frame (partially fixed)
   - Need to ensure main frame background is always applied last

---

## Testing Recommendations

1. **Test with complex pages** (Etsy, YouTube, GitHub):

   - Verify timeout recovery works
   - Check that partial content imports correctly
   - Verify positioning is accurate

2. **Test Auto Layout pages**:

   - Verify flex containers are detected
   - Check that children are positioned correctly
   - Verify padding/spacing is correct

3. **Test with images**:

   - Verify aspect ratios are preserved
   - Check that images are in correct positions
   - Verify scaleMode is correct

4. **Test timeout scenario**:
   - Trigger timeout on a complex page
   - Verify partial schema is returned
   - Check that imported content matches what was extracted

---

## Expected Improvements

After these fixes:

- ✅ Consistent coordinate system (absoluteLayout always available)
- ✅ Partial content imports on timeout (instead of complete failure)
- ✅ More accurate positioning (accounts for padding)
- ✅ Better Auto Layout handling
- ✅ Images import correctly (from previous fixes)

**Remaining work for pixel-perfect accuracy**:

- Text extraction and font matching
- CSS transform application
- IFrame content capture
- Background color handling refinement

---

## Files Modified

1. `chrome-extension/src/utils/dom-extractor.ts`

   - Always create `absoluteLayout`
   - Add `schemaInProgress` tracking
   - Add `getPartialSchema()` method

2. `chrome-extension/src/injected-script.ts`

   - Store extractor globally
   - Handle `GET_PARTIAL_SCHEMA` message

3. `chrome-extension/src/content-script.ts`

   - Modified timeout to recover partial schema

4. `figma-plugin/src/enhanced-figma-importer.ts`
   - Improved position calculation
   - Account for parent padding
   - Always prefer `absoluteLayout`

---

## Next Steps

To achieve pixel-perfect accuracy, prioritize:

1. **Text Extraction** - Ensure all text is captured and rendered
2. **Font Matching** - Improve web font to Figma font mapping
3. **Transform Application** - Apply CSS transforms visually
4. **IFrame Handling** - Capture iframe content when possible
5. **Layout Refinement** - Improve grid/flex conversion accuracy
