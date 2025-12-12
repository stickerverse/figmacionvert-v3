# Visual Discrepancies Analysis: Figma Render vs Original Webpage

## Overview
This document identifies visual and structural discrepancies between the rendered Figma output and the original webpage, along with root causes and actionable fixes.

---

## 1. TYPOGRAPHY DISCREPANCIES

### 1.1 Font Family Mismatches
**Issue:** Web fonts (e.g., YouTube's Roboto, YouTube Sans) not matching Figma fallbacks
**Symptoms:**
- Text appears in Inter/Arial instead of original font
- Font weights may appear incorrect (e.g., Medium vs Regular)

**Root Cause:** 
- `node-builder.ts:168-172` - Font fallback chain doesn't include web-specific fonts
- `dom-extractor.ts:2136-2137` - Only first font in font-family stack is used
- Missing font loading for web fonts not in Figma's available fonts

**Fix:**
1. **Capture:** Extend font fallback mapping in `node-builder.ts` to include common web fonts:
   ```typescript
   ["Roboto", ["Roboto", "Inter", "Arial", "sans-serif"]],
   ["YouTube Sans", ["Roboto", "Inter", "Arial", "sans-serif"]],
   ["YouTube", ["Roboto", "Inter", "Arial", "sans-serif"]],
   ```
2. **Schema:** Store full font-family stack in `ElementNode.textStyle.fontFamilyStack`
3. **Rendering:** Try loading web fonts first, fall back gracefully

### 1.2 Font Weight Mapping Issues
**Issue:** Numeric font weights (400, 500, 700) not correctly mapped to Figma styles (Regular, Medium, Bold)
**Symptoms:**
- Text appears lighter/heavier than original
- Missing intermediate weights (500 → Medium)

**Root Cause:**
- `dom-extractor.ts:2138-2144` - Font weight parsing doesn't handle all numeric values
- `node-builder.ts:175-184` - Limited style fallback chain (Regular, Normal, Medium, Bold, Light)

**Fix:**
1. **Capture:** Improve font weight parsing in `dom-extractor.ts`:
   ```typescript
   const fontWeightMap: Record<number, string> = {
     100: "Thin", 200: "ExtraLight", 300: "Light",
     400: "Regular", 500: "Medium", 600: "SemiBold",
     700: "Bold", 800: "ExtraBold", 900: "Black"
   };
   ```
2. **Schema:** Store numeric weight in `textStyle.fontWeight` for precise matching
3. **Rendering:** Expand style fallback chain to include all weight variants

### 1.3 Line Height Discrepancies
**Issue:** Line height calculations incorrect for relative units (%, em) or "normal"
**Symptoms:**
- Text spacing too tight or too loose
- Multi-line text doesn't match original spacing

**Root Cause:**
- `dom-extractor.ts:2147-2159` - Line height parsing may not match browser calculation exactly
- `dom-extractor.ts:2176-2182` - "normal" defaults to `fontSize * 1.2` which may not match browser

**Fix:**
1. **Capture:** Use actual rendered line height from `getComputedStyle().lineHeight` (already in pixels)
2. **Schema:** Store both computed pixel value and original CSS value
3. **Rendering:** Use computed pixel value directly, preserve original for reference

### 1.4 Letter Spacing Issues
**Issue:** Letter spacing not applied correctly, especially for em units
**Symptoms:**
- Text appears more/less spaced than original
- Headers or uppercase text spacing incorrect

**Root Cause:**
- `dom-extractor.ts:2161-2169` - Letter spacing conversion may be inaccurate
- Browser may apply letter spacing differently than Figma

**Fix:**
1. **Capture:** Use computed pixel value from browser when available
2. **Schema:** Store both computed and original CSS values
3. **Rendering:** Apply computed pixel value directly

### 1.5 Text Decoration/Transform Missing
**Issue:** Text decorations (underline, strikethrough) and transforms (uppercase, lowercase) not applied
**Symptoms:**
- Underlined links appear as plain text
- Uppercase text appears in original case

**Root Cause:**
- `dom-extractor.ts:2189-2190` - Text decoration/transform captured but may not be applied
- Figma text nodes don't support all CSS text decorations

**Fix:**
1. **Capture:** Ensure `textDecoration` and `textTransform` are captured
2. **Schema:** Store in `textStyle.textDecoration` and `textStyle.textTransform`
3. **Rendering:** 
   - Apply `textTransform` to `characters` property
   - Use Figma's underline/strikethrough effects where supported
   - Store unsupported decorations in plugin data

---

## 2. COLOR AND BACKGROUND DISCREPANCIES

### 2.1 Background Color Parsing Issues
**Issue:** Background colors not correctly parsed from CSS (rgba, hex, named colors)
**Symptoms:**
- Elements appear transparent when they should have background
- Colors slightly off (e.g., #f9f9f9 vs #fafafa)

**Root Cause:**
- `node-builder.ts:1408-1411` - Multiple color parsing fallbacks may conflict
- `dom-extractor.ts:459-475` - Background color extraction may miss some cases

**Fix:**
1. **Capture:** Improve color parsing to handle all CSS color formats:
   - rgba(), rgb()
   - hex (#fff, #ffffff)
   - named colors (transparent, currentColor)
   - CSS variables (var(--color))
2. **Schema:** Store original CSS value and parsed RGB values
3. **Rendering:** Use parsed RGB values, preserve original for reference

### 2.2 Background Image Missing or Incorrectly Positioned
**Issue:** Background images not appearing or positioned incorrectly
**Symptoms:**
- Missing background images
- Images cropped or scaled incorrectly
- Background position (center, top-left) not respected

**Root Cause:**
- `node-builder.ts:1983-2068` - Background layer conversion may not handle all cases
- `dom-extractor.ts` - Background image URL, position, size, repeat may not be fully captured
- Image assets may not be loaded/cached correctly

**Fix:**
1. **Capture:** Ensure all background properties are captured:
   - `backgroundImage` (URL)
   - `backgroundPosition` (x, y)
   - `backgroundSize` (cover, contain, specific dimensions)
   - `backgroundRepeat` (no-repeat, repeat-x, repeat-y)
2. **Schema:** Store in `ElementNode.backgrounds[]` array with full positioning data
3. **Rendering:** 
   - Load background images as assets
   - Apply correct positioning using `imageTransform`
   - Handle `backgroundSize: cover/contain` correctly
   - Respect `backgroundRepeat` settings

### 2.3 Gradient Backgrounds Incorrect
**Issue:** Linear/radial gradients not matching original
**Symptoms:**
- Gradient direction wrong
- Gradient stops/colors incorrect
- Gradient positioning off

**Root Cause:**
- `node-builder.ts:2034-2055` - Gradient conversion may not handle all CSS gradient syntax
- `dom-extractor.ts` - Gradient parsing may miss angle, position, or stop colors

**Fix:**
1. **Capture:** Parse CSS gradients completely:
   - `linear-gradient(angle, stops...)` → angle in degrees
   - `radial-gradient(shape size at position, stops...)` → shape, size, position
   - All color stops with positions
2. **Schema:** Store gradient type, transform matrix, and stops
3. **Rendering:** Apply `gradientTransform` correctly to match CSS angle/position

### 2.4 Opacity/Transparency Issues
**Issue:** Element opacity not applied correctly
**Symptoms:**
- Elements appear fully opaque when they should be semi-transparent
- Overlay effects missing

**Root Cause:**
- `node-builder.ts:1541-1543` - Opacity may not be applied to all node types
- Opacity may be applied to node but not to fills/strokes

**Fix:**
1. **Capture:** Ensure `opacity` is captured from computed styles
2. **Schema:** Store in `ElementNode.opacity`
3. **Rendering:** Apply opacity to node, ensure fills/strokes respect node opacity

---

## 3. LAYOUT AND SPACING DISCREPANCIES

### 3.1 Absolute Positioning Issues
**Issue:** Absolutely positioned elements not in correct location
**Symptoms:**
- Elements offset from where they should be
- Overlapping elements in wrong order

**Root Cause:**
- `enhanced-figma-importer.ts:753-988` - Absolute positioning may not account for parent offsets
- `dom-extractor.ts` - `absoluteLayout` vs `layout` may be inconsistent

**Fix:**
1. **Capture:** Use `getBoundingClientRect()` for absolute positions
2. **Schema:** Store both `absoluteLayout` (viewport-relative) and `layout` (parent-relative)
3. **Rendering:** Use `absoluteLayout` for positioning, account for parent frame offsets

### 3.2 Flex/Grid Layout Not Preserved
**Issue:** Flexbox/grid layouts converted to static frames
**Symptoms:**
- Spacing between items incorrect
- Alignment (justify-content, align-items) not respected
- Gap between items missing

**Root Cause:**
- `node-builder.ts` - Auto Layout may not be applied correctly
- `dom-extractor.ts` - Flex/grid properties may not be fully captured

**Fix:**
1. **Capture:** Ensure all flex/grid properties are captured:
   - `display: flex/grid`
   - `flexDirection`, `justifyContent`, `alignItems`
   - `gap`, `rowGap`, `columnGap`
   - `gridTemplateColumns`, `gridTemplateRows`
2. **Schema:** Store in `ElementNode.autoLayout` object
3. **Rendering:** 
   - Apply Figma Auto Layout for flex containers
   - Set `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`
   - Apply `paddingLeft/Right/Top/Bottom` and `itemSpacing` (gap)

### 3.3 Padding/Margin/Gap Incorrect
**Issue:** Spacing between elements doesn't match original
**Symptoms:**
- Elements too close or too far apart
- Internal padding missing

**Root Cause:**
- `dom-extractor.ts` - Padding/margin may not be captured or applied
- `node-builder.ts` - Auto Layout padding may not match CSS padding

**Fix:**
1. **Capture:** Capture all spacing properties:
   - `paddingTop/Right/Bottom/Left` or `padding` shorthand
   - `marginTop/Right/Bottom/Left` or `margin` shorthand
   - `gap`, `rowGap`, `columnGap`
2. **Schema:** Store in `ElementNode.padding` and `ElementNode.margin` objects
3. **Rendering:** 
   - Apply padding to Auto Layout frames
   - Apply margin by adjusting node position or using spacer nodes
   - Apply gap to Auto Layout `itemSpacing`

### 3.4 Text Auto-Resize Behavior
**Issue:** Text nodes not wrapping or sizing correctly
**Symptoms:**
- Text overflowing containers
- Text not wrapping when it should
- Text too narrow/wide

**Root Cause:**
- `dom-extractor.ts:2260-2274` - Auto-resize heuristic may be incorrect
- `whiteSpace: nowrap` vs wrapping behavior

**Fix:**
1. **Capture:** Ensure `whiteSpace`, `width`, `display` are captured
2. **Schema:** Store in `ElementNode.textAutoResize` and `textStyle.whiteSpace`
3. **Rendering:**
   - `whiteSpace: nowrap` → `textAutoResize: "WIDTH_AND_HEIGHT"`
   - Fixed width → `textAutoResize: "HEIGHT"`
   - Auto width → `textAutoResize: "HEIGHT"` with proper constraints

---

## 4. BORDERS AND EFFECTS DISCREPANCIES

### 4.1 Border Radius Not Applied
**Issue:** Rounded corners missing or incorrect
**Symptoms:**
- Sharp corners where rounded should be
- Individual corner radius (border-top-left-radius) not supported

**Root Cause:**
- `node-builder.ts:1512-1518` - Corner radius may not handle individual corners
- `dom-extractor.ts:443-446` - Border radius parsing may not handle all formats

**Fix:**
1. **Capture:** Parse all border radius formats:
   - `borderRadius: 8px` → all corners
   - `borderTopLeftRadius`, `borderTopRightRadius`, etc. → individual corners
2. **Schema:** Store in `ElementNode.cornerRadius` (single value) or `cornerRadii` (object)
3. **Rendering:** 
   - Apply single radius to `cornerRadius` property
   - For individual corners, use `cornerRadius` with largest value and clip path for others

### 4.2 Box Shadow Missing or Incorrect
**Issue:** Drop shadows not appearing or incorrect
**Symptoms:**
- Missing shadows
- Shadow color, blur, offset incorrect
- Multiple shadows not supported

**Root Cause:**
- `node-builder.ts:1520-1539` - Effect conversion may not handle all shadow formats
- `dom-extractor.ts` - Box shadow parsing may miss some properties

**Fix:**
1. **Capture:** Parse CSS box-shadow completely:
   - `box-shadow: offsetX offsetY blur spread color`
   - Multiple shadows (comma-separated)
   - `inset` shadows
2. **Schema:** Store in `ElementNode.effects[]` array
3. **Rendering:** 
   - Convert to Figma `DROP_SHADOW` or `INNER_SHADOW`
   - Apply `color`, `offset`, `radius` (blur), `spread`
   - Support multiple shadows (Figma supports multiple effects)

### 4.3 Border Width/Color/Style Issues
**Issue:** Borders missing or incorrect style
**Symptoms:**
- Missing borders
- Border color wrong
- Dashed/dotted borders appear solid

**Root Cause:**
- `node-builder.ts:1467-1502` - Stroke conversion may not handle all border styles
- `dom-extractor.ts:425-428` - Border extraction may miss some properties

**Fix:**
1. **Capture:** Capture all border properties:
   - `borderWidth`, `borderColor`, `borderStyle`
   - Individual borders (`borderTopWidth`, etc.)
   - `borderStyle: dashed/dotted/solid`
2. **Schema:** Store in `ElementNode.strokes[]` array
3. **Rendering:**
   - Apply `strokeWeight` from border width
   - Apply `strokeAlign: "INSIDE"` (default)
   - Apply `dashPattern` for dashed/dotted borders

---

## 5. IMAGE AND ASSET DISCREPANCIES

### 5.1 Images Missing or Wrong Size
**Issue:** Images not loading or displayed at incorrect size
**Symptoms:**
- Red placeholder rectangles
- Images too small/large
- Images cropped incorrectly

**Root Cause:**
- `node-builder.ts:1360-1383` - Image loading may fail
- `dom-extractor.ts` - Image dimensions may not match `object-fit` behavior
- Image assets may not be captured or cached correctly

**Fix:**
1. **Capture:** 
   - Capture image `src`, `width`, `height`, `object-fit`, `object-position`
   - Ensure images are included in asset registry
2. **Schema:** Store `imageHash` and `objectFit` in `ElementNode`
3. **Rendering:**
   - Load images using `imageHash` from asset registry
   - Apply `scaleMode` based on `object-fit`:
     - `object-fit: fill` → `scaleMode: "FILL"`
     - `object-fit: contain` → `scaleMode: "FIT"`
     - `object-fit: cover` → `scaleMode: "CROP"`
   - Handle `object-position` for cropping

### 5.2 SVG Rendering Issues
**Issue:** SVGs not rendering correctly
**Symptoms:**
- SVGs missing or appear as rectangles
- SVG colors/styles not preserved

**Root Cause:**
- `dom-extractor.ts` - SVG content may not be captured
- SVG may be treated as regular image instead of vector

**Fix:**
1. **Capture:** 
   - Capture SVG `innerHTML` or `outerHTML`
   - Capture SVG computed styles
2. **Schema:** Store SVG content in `ElementNode.svgContent` or as vector asset
3. **Rendering:** 
   - Use Figma's vector import for SVG content
   - Preserve SVG styles and colors

### 5.3 Background Image Assets Missing
**Issue:** Background images not loading
**Symptoms:**
- Backgrounds appear as solid color
- Missing background images

**Root Cause:**
- Background image URLs may not be captured
- Images may not be included in asset registry
- Background image positioning may prevent proper loading

**Fix:**
1. **Capture:** Ensure background image URLs are extracted and added to asset registry
2. **Schema:** Store background image `imageHash` in `ElementNode.backgrounds[]`
3. **Rendering:** Load background images from asset registry, apply positioning

---

## 6. STACKING AND LAYERING DISCREPANCIES

### 6.1 Z-Index Ordering Issues
**Issue:** Elements in wrong stacking order
**Symptoms:**
- Elements appearing behind when they should be in front
- Overlays not appearing on top

**Root Cause:**
- `enhanced-figma-importer.ts` - Node creation order may not respect z-index
- `dom-extractor.ts` - Z-index may not be captured or used for sorting

**Fix:**
1. **Capture:** Capture `z-index` from computed styles
2. **Schema:** Store in `ElementNode.zIndex`
3. **Rendering:** 
   - Sort nodes by z-index before creating
   - Use Figma's layer order (last created = top)
   - Handle `position: relative/absolute` with z-index

### 6.2 Pseudo-Elements Missing
**Issue:** ::before and ::after elements not appearing
**Symptoms:**
- Decorative elements missing
- Icons or badges missing

**Root Cause:**
- `dom-extractor.ts` - Pseudo-elements may not be captured
- `schema.ts:300-303` - Pseudo-elements schema exists but may not be populated

**Fix:**
1. **Capture:** 
   - Use `getComputedStyle(element, ':before')` and `':after'`
   - Capture pseudo-element content, styles, positioning
2. **Schema:** Store in `ElementNode.pseudoElements.before` and `.after`
3. **Rendering:** Create separate nodes for pseudo-elements, position correctly

### 6.3 Overlay Elements Not Positioned Correctly
**Issue:** Modals, tooltips, dropdowns not appearing correctly
**Symptoms:**
- Overlays not visible
- Overlays positioned incorrectly

**Root Cause:**
- `position: fixed` elements may not be captured correctly
- Overlays may be outside viewport bounds

**Fix:**
1. **Capture:** Ensure `position: fixed` elements are captured with viewport-relative positions
2. **Schema:** Store `position: "fixed"` and viewport coordinates
3. **Rendering:** Position fixed elements relative to canvas/viewport, not parent

---

## 7. TRANSFORM AND ANIMATION DISCREPANCIES

### 7.1 CSS Transforms Not Applied
**Issue:** Rotated, scaled, or translated elements not matching
**Symptoms:**
- Elements at wrong angle
- Elements scaled incorrectly
- Elements offset from correct position

**Root Cause:**
- `dom-extractor.ts` - Transforms may not be captured (requires `captureTransforms` option)
- `node-builder.ts` - Transforms may not be applied to Figma nodes

**Fix:**
1. **Capture:** 
   - Always capture `transform` and `transform-origin`
   - Parse matrix/translate/rotate/scale values
2. **Schema:** Store in `ElementNode.transform` object
3. **Rendering:** 
   - Apply transforms using Figma's `rotation` and `scale` properties
   - Handle `transform-origin` by adjusting position
   - Store complex transforms in plugin data if not directly supported

---

## IMPLEMENTATION PRIORITY

### High Priority (Critical Visual Issues)
1. Font family/weight mapping
2. Background image loading and positioning
3. Layout/spacing (padding, margin, gap)
4. Border radius and effects

### Medium Priority (Noticeable Differences)
5. Color parsing accuracy
6. Text auto-resize behavior
7. Z-index ordering
8. Image sizing and object-fit

### Low Priority (Edge Cases)
9. Pseudo-elements
10. Complex transforms
11. SVG rendering
12. Text decoration/transform

---

## TESTING CHECKLIST

For each fix, verify:
- [ ] Original webpage renders correctly
- [ ] Captured schema contains all necessary properties
- [ ] Figma render matches original visually
- [ ] Skeleton/wireframe structure is correct
- [ ] All assets (images, fonts) load correctly
- [ ] Interactive elements (hover states) preserved
- [ ] Responsive behavior maintained (if applicable)

