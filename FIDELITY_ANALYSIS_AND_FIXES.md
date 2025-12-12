# Fidelity Analysis: Etsy.com Import Issues

## Executive Summary

The Figma import of Etsy.com shows catastrophic failure: **~90% of content is missing**, leaving only a blue background with a few isolated images. This indicates multiple critical failures in the capture → schema → builder pipeline.

---

## Complete Difference Analysis

### 1. **Missing Content (Critical)**

- **Original**: Rich content including navigation, search bar, product grids, text, buttons, forms, footer
- **Figma**: Almost entirely blank blue canvas with only ~9 images visible
- **Root Cause**: DOM extraction is timing out, returning no or incomplete schema

### 2. **Incorrect Background Color**

- **Original**: White/light backgrounds with colored sections
- **Figma**: Solid royal blue (#2A61C5) covering entire canvas
- **Root Cause**: Body element's background color is being extracted and applied, overriding the main frame's white background

### 3. **Missing Typography**

- **Original**: All text content (headings, labels, descriptions, prices)
- **Figma**: No readable text except faint pixel patterns
- **Root Cause**: Text extraction failing or text nodes not being created in Figma

### 4. **Missing Layout Structure**

- **Original**: Complex grid layouts, flex containers, proper spacing
- **Figma**: Flat structure with isolated images, no grids or proper alignment
- **Root Cause**: Layout mode detection (flex/grid) not being applied, or Auto Layout not being created

### 5. **Missing Images**

- **Original**: Hundreds of product images, icons, SVGs
- **Figma**: Only ~9 images visible
- **Root Cause**: Image loading failures (CORS, CSP, timeouts) and proxy failures

### 6. **Missing Interactive Elements**

- **Original**: Buttons, forms, dropdowns, navigation
- **Figma**: None visible
- **Root Cause**: Elements not extracted or not rendered

---

## Root Cause Analysis

### Issue #1: Timeout Returns No Data (CRITICAL)

**Location**: `chrome-extension/src/content-script.ts:1402-1405`

**Problem**: When DOM extraction times out after 120 seconds, the promise rejects with an error, returning **zero schema data**. This causes complete import failure.

**Impact**: Even if 90% of content was extracted before timeout, it's all lost.

**Fix**: Return partial schema on timeout instead of rejecting completely.

---

### Issue #2: Body Background Overrides Main Frame

**Location**:

- `chrome-extension/src/utils/dom-extractor.ts:1112-1133` (extracts body background)
- `figma-plugin/src/enhanced-figma-importer.ts:480-486` (sets main frame to white)

**Problem**: The body element's blue background color is extracted and stored in `node.fills`. When the body node is created in Figma, it has the blue fill, which covers the white main frame background.

**Impact**: Entire canvas appears blue instead of white.

**Fix**:

1. Don't apply body background fill if it matches document background
2. Or skip body node creation and use its children directly
3. Or ensure main frame background is applied after body node

---

### Issue #3: Extraction Performance / Timeout

**Location**: `chrome-extension/src/utils/dom-extractor.ts:253-296`

**Problem**:

- Extraction is synchronous and recursive, blocking on each element
- `getComputedStyle()` and `getBoundingClientRect()` are expensive
- No batching or async processing
- Complex pages like Etsy have thousands of elements

**Impact**: Extraction takes >120 seconds and times out, returning no data.

**Fix**:

1. Add progress checkpoints to return partial data
2. Optimize style extraction (cache computed styles)
3. Skip non-visible elements earlier
4. Process in batches with yield points

---

### Issue #4: Text Extraction Failing

**Location**: `chrome-extension/src/utils/dom-extractor.ts:420-460`

**Problem**:

- Text nodes are only created if `textRect.width > 0 || textRect.height > 0`
- Some text might have zero dimensions due to CSS
- Text might be filtered out as "empty"

**Impact**: No text content in Figma.

**Fix**:

1. Check `textContent.trim().length > 0` before dimension check
2. Use parent element's computed style for text dimensions
3. Don't skip text nodes with zero dimensions if they have content

---

### Issue #5: Image Loading Failures

**Location**: `chrome-extension/src/utils/dom-extractor.ts:1624-1750`

**Problem**:

- CORS blocking direct image loads
- CSP violations blocking fetch
- 5-second timeout too short for large images
- Proxy fallback not always working

**Impact**: Most images fail to load, leaving empty image nodes.

**Fix**:

1. Increase image timeout to 10 seconds
2. Improve proxy error handling
3. Continue extraction even if images fail (use placeholders)
4. Batch image loading with retries

---

### Issue #6: Layout Mode Not Applied

**Location**:

- `chrome-extension/src/utils/dom-extractor.ts:792-850` (detects flex/grid)
- `figma-plugin/src/enhanced-figma-importer.ts:830-1000` (creates nodes)

**Problem**:

- Layout mode is detected but might not be applied to Figma nodes
- Auto Layout properties might be missing or incorrect
- Grid layouts not being converted to Figma Auto Layout

**Impact**: All layouts appear as static positioned elements, losing grid/flex structure.

**Fix**:

1. Ensure `suggestedAutoLayout` and `suggestedLayoutMode` are applied
2. Convert CSS Grid to Figma Auto Layout where possible
3. Apply padding, gap, alignment from computed styles

---

### Issue #7: Zero-Size Element Filtering Too Aggressive

**Location**: `chrome-extension/src/utils/dom-extractor.ts:279-296`

**Problem**: Elements with `width === 0 && height === 0` are skipped unless they have `overflow: visible` AND content. Some important containers might be filtered out.

**Impact**: Important wrapper elements missing, breaking layout hierarchy.

**Fix**:

1. Keep elements with children even if 0x0
2. Check if element has meaningful computed styles (background, border, etc.)
3. Use `scrollWidth/scrollHeight` for containers

---

## Fixes Applied

See code changes in:

1. `chrome-extension/src/content-script.ts` - Timeout handling
2. `chrome-extension/src/utils/dom-extractor.ts` - Performance, text extraction, filtering
3. `figma-plugin/src/enhanced-figma-importer.ts` - Body background handling
4. `figma-plugin/src/node-builder.ts` - Layout application
