# Image Import Fixes Applied

## Summary

Fixed critical issues with image positioning, sizing, and aspect ratio preservation in the Figma import pipeline.

## Issues Fixed

### 1. Image Node Type Correction

**Problem**: IMG tags were being set as `RECTANGLE` type instead of `IMAGE` type in the schema.

**Fix**: Changed node type from `RECTANGLE` to `IMAGE` for `<img>` elements in `dom-extractor.ts:1590`.

**Impact**: Ensures proper handling of image nodes throughout the pipeline.

---

### 2. Natural Dimensions for Image Transform Calculation

**Problem**: Image transforms were calculated using rendered dimensions (`img.width`, `img.height`) instead of natural dimensions (`img.naturalWidth`, `img.naturalHeight`), causing incorrect aspect ratio calculations.

**Fix**:

- Updated `dom-extractor.ts:1632-1638` to use `naturalWidth` and `naturalHeight` for transform calculations
- Store natural dimensions in asset registry when available

**Impact**: Image transforms now correctly preserve aspect ratios when images are scaled via CSS.

---

### 3. Image Dimension Preservation

**Problem**: When images were loaded via proxy or timed out, dimensions were lost (set to 0), causing aspect ratio issues.

**Fix**:

- Updated `dom-extractor.ts:1950-1959` to try to get dimensions from DOM when proxy is used
- Updated `dom-extractor.ts:1998-2016` to preserve dimensions from failed img elements
- Updated `captureImage()` to accept element parameter and extract natural dimensions immediately

**Impact**: Image dimensions are now preserved even when loading fails or uses proxy.

---

### 4. ScaleMode Mapping Correction

**Problem**: `object-fit: fill` was incorrectly mapped to `STRETCH` (which doesn't exist in Figma) instead of `FILL`.

**Fix**: Updated `dom-extractor.ts:1632-1645` to correctly map:

- `fill` → `FILL` (stretch to fill, may distort)
- `contain` → `FIT` (fit within, maintain aspect ratio)
- `cover` → `CROP` (fill, maintain aspect ratio, crop overflow)
- `none` → `CROP` (use natural size, crop if needed)
- `scale-down` → `FIT` (like contain)

**Impact**: Images now use correct Figma scale modes, preventing distortion.

---

### 5. ImageTransform Preservation in Node Builder

**Problem**: Pre-calculated `imageTransform` from the schema was not being used in the Figma node builder.

**Fix**:

- Updated `node-builder.ts:2623-2639` to use `imageTransform` from fill if provided
- Updated `node-builder.ts:2493-2500` to include `imageTransform` in cached image paints
- Updated `node-builder.ts:870-890` to pass `imageTransform` from fills to `resolveImagePaint`

**Impact**: Image positioning (object-position) is now correctly preserved in Figma.

---

### 6. ScaleMode from Fills

**Problem**: Node builder was deriving scaleMode from `objectFit` instead of using the pre-calculated `scaleMode` from fills.

**Fix**: Updated `node-builder.ts:870-890` to:

1. First check for `scaleMode` in fills
2. Fall back to deriving from `objectFit` if not found

**Impact**: Ensures consistent scaleMode usage throughout the pipeline.

---

## Files Modified

1. `chrome-extension/src/utils/dom-extractor.ts`

   - Line 1590: Changed node type to IMAGE
   - Lines 1616-1630: Store natural dimensions in asset
   - Lines 1632-1645: Use natural dimensions for transform calculation
   - Lines 1632-1645: Fixed scaleMode mapping
   - Lines 1850-1875: Updated captureImage to accept element and extract dimensions
   - Lines 1950-1959: Preserve dimensions when using proxy
   - Lines 1998-2016: Preserve dimensions from failed img elements

2. `figma-plugin/src/node-builder.ts`
   - Lines 870-890: Use scaleMode and imageTransform from fills
   - Lines 2493-2500: Include imageTransform in cached paints
   - Lines 2623-2639: Use imageTransform from fill if provided

---

## Testing Recommendations

1. **Test with various object-fit values**:

   - `fill`: Should stretch to fill (may distort)
   - `contain`: Should fit within bounds (maintain aspect ratio)
   - `cover`: Should fill bounds (maintain aspect ratio, crop overflow)
   - `none`: Should use natural size (crop if needed)

2. **Test with object-position**:

   - Various percentage values (e.g., "20% 30%")
   - Keyword values (e.g., "left top", "right bottom")

3. **Test with scaled images**:

   - Images with CSS width/height different from natural dimensions
   - Images with CSS transforms

4. **Test with proxy-loaded images**:
   - Images that require proxy due to CORS
   - Images that timeout during direct load

---

## Expected Results

After these fixes:

- ✅ Images import with correct aspect ratios
- ✅ Images positioned correctly based on object-position
- ✅ Images use correct scaleMode (FILL/FIT/CROP) based on object-fit
- ✅ Image dimensions preserved even when loading via proxy
- ✅ No stretching or distortion when object-fit is "contain" or "cover"
- ✅ Natural dimensions used for all transform calculations

---

## Notes

- All fixes are backward compatible
- No breaking changes to schema structure
- Image assets now store natural dimensions when available
- Node builder correctly handles both pre-calculated and derived transforms
