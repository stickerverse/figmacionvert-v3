# Root Cause Analysis: Why Visual Quality Hasn't Improved

## Critical Issues Preventing Pixel-Perfect Accuracy

### 🔴 **ISSUE #1: Script Injection is NOT Per-Frame/Per-Node**

**Current Behavior:**

- Script is injected **ONCE** into the main page via `content-script.ts:963-1019`
- Content script runs in **all frames** (`manifest.json:57: "all_frames": true`)
- BUT: The injected script (`injected-script.ts`) only runs in the **main world context of the top frame**
- **IFRAMES ARE NOT CAPTURED** - They get placeholder "Embed" nodes (line 1549-1561 in dom-extractor.ts)

**Impact:**

- Any content in iframes (ads, embeds, widgets) is completely missing
- Cross-origin iframes cannot be accessed due to security restrictions
- This causes major visual gaps

**Fix Required:**

- Need to inject script into each accessible iframe
- Handle cross-origin iframes gracefully (screenshot fallback or skip)

---

### 🔴 **ISSUE #2: Position Calculation Has Critical Flaws**

**Location:** `enhanced-figma-importer.ts:900-932`

**Problems:**

1. **Position is set AFTER node creation** - Figma requires position when appending to parent
2. **Auto Layout conflict** - If parent has Auto Layout, manual `x/y` positioning is ignored
3. **Relative position calculation is wrong** - Subtracting parent absolute positions doesn't account for:
   - Parent's own transforms
   - Parent's padding/borders
   - Auto Layout spacing

**Current Code:**

```typescript
// Line 926-927: This calculation is WRONG for Auto Layout parents
figmaNode.x = (absX - parentAbsX) * this.scaleFactor;
figmaNode.y = (absY - parentAbsY) * this.scaleFactor;
```

**Impact:**

- Elements appear in wrong positions
- Auto Layout children are positioned incorrectly
- Nested frames have cumulative positioning errors

---

### 🔴 **ISSUE #3: Position Verification is DISABLED**

**Location:** `enhanced-figma-importer.ts:296-300`

**Code:**

```typescript
// DISABLED: Verification causes 98% stall on large pages
// if (this.options.verifyPositions) {
//   verificationReport = await this.verifyImportAccuracy();
// }
```

**Impact:**

- We have NO way to detect if positions are wrong
- No feedback loop to improve accuracy
- Errors accumulate silently

---

### 🔴 **ISSUE #4: Coordinate System Mismatch**

**Capture Side (`dom-extractor.ts:385-386`):**

```typescript
x: rect.left + scrollLeft,  // Document coordinates
y: rect.top + scrollTop,
```

**Import Side (`enhanced-figma-importer.ts:904-911`):**

```typescript
if (nodeData.absoluteLayout) {
  absX = nodeData.absoluteLayout.left; // Assumes viewport coordinates
  absY = nodeData.absoluteLayout.top;
} else if (nodeData.layout) {
  absX = nodeData.layout.x; // Uses document coordinates
  absY = nodeData.layout.y;
}
```

**Problem:**

- `absoluteLayout` may not exist (only created for `position: absolute/fixed`)
- Falls back to `layout.x/y` which are **document coordinates** (viewport + scroll)
- But the code treats them as if they're viewport coordinates
- This causes positioning errors when page is scrolled

---

### 🔴 **ISSUE #5: Auto Layout Not Applied Correctly**

**Location:** `enhanced-figma-importer.ts:943-1000`

**Problems:**

1. **Auto Layout detection is incomplete** - Only checks for `autoLayout` object or `layoutMode` property
2. **Padding/margin confusion** - CSS padding becomes Auto Layout padding, but margin is ignored
3. **Gap not always captured** - `itemSpacing` may be 0 even when CSS `gap` exists
4. **Children positioning** - When Auto Layout is enabled, children's `x/y` are ignored by Figma

**Impact:**

- Flexbox layouts don't match original
- Spacing between items is wrong
- Alignment is incorrect

---

### 🔴 **ISSUE #6: Transform Matrices Not Applied**

**Location:** `node-builder.ts:1243-1255`

**Problem:**

- Transforms are stored in plugin data but **not visually applied** to nodes
- Only rotation/scale are applied if present, but complex transforms (skew, matrix) are ignored
- `transform-origin` is not accounted for

**Impact:**

- Rotated/scaled elements appear in wrong positions
- Transformed elements don't match original

---

### 🔴 **ISSUE #7: Background Images Not Positioned Correctly**

**Location:** `node-builder.ts:2434-2453`

**Problem:**

- `calculateImageTransform` exists but may not handle all CSS background-position cases
- `background-size: cover/contain` may not match browser rendering exactly
- Background repeat is not fully supported

**Impact:**

- Background images appear in wrong positions
- Background images are scaled incorrectly

---

### 🔴 **ISSUE #8: Font Loading Happens AFTER Text Creation**

**Location:** `node-builder.ts:473-507`

**Problem:**

- Font is loaded, but if it fails, text is created with wrong font
- Font metrics ratio is calculated but may not account for all differences
- Font fallback chain may not match browser's actual fallback

**Impact:**

- Text appears in wrong font
- Text sizing is incorrect
- Line height doesn't match

---

## Why Our Fixes Didn't Help

1. **We fixed the Figma plugin side** (font fallbacks, background handling) but:

   - The **capture side** may not be providing correct data
   - The **positioning logic** has fundamental flaws
   - **Auto Layout conflicts** prevent correct positioning

2. **We added features** (fontFamilyStack, YouTube Sans) but:

   - These are edge cases - the core positioning is broken
   - Font issues are secondary to layout issues

3. **We verified code** but:
   - Didn't test with actual web pages
   - Didn't check if data flows correctly from capture → import
   - Position verification is disabled so we can't see errors

---

## Required Fixes (Priority Order)

### **CRITICAL (Must Fix for Any Improvement):**

1. **Fix Position Calculation** (`enhanced-figma-importer.ts:900-932`)

   - Set position BEFORE appending to parent
   - Handle Auto Layout parents correctly (don't set x/y, let Auto Layout position)
   - Use correct coordinate system (document vs viewport)

2. **Fix Coordinate System** (`dom-extractor.ts` + `enhanced-figma-importer.ts`)

   - Ensure `absoluteLayout` is always created (not just for absolute/fixed)
   - Use consistent coordinate system throughout
   - Account for scroll position correctly

3. **Enable Position Verification** (with optimization)
   - Re-enable verification but make it async/non-blocking
   - Log errors to console instead of blocking
   - Use for debugging, not blocking import

### **HIGH PRIORITY:**

4. **Fix Auto Layout Application**

   - Detect Auto Layout more reliably
   - Don't set x/y on children of Auto Layout parents
   - Capture and apply gap correctly

5. **Handle IFrames**

   - Inject script into accessible iframes
   - Capture iframe content when possible
   - Use screenshot fallback for cross-origin

6. **Apply Transforms Correctly**
   - Apply transform matrices to nodes
   - Account for transform-origin
   - Handle complex transforms

### **MEDIUM PRIORITY:**

7. **Fix Background Image Positioning**

   - Improve `calculateImageTransform` to handle all CSS cases
   - Test with various background-position values
   - Handle background-repeat correctly

8. **Improve Font Loading**
   - Load fonts before creating text nodes
   - Better font metrics matching
   - More accurate fallback chain

---

## Testing Strategy

1. **Create test page** with known positions (grid of colored boxes)
2. **Capture and import** - compare positions
3. **Enable position verification** - see actual errors
4. **Fix one issue at a time** - verify improvement
5. **Test with real websites** - YouTube, GitHub, etc.

---

## Conclusion

The code changes we made were **correct but insufficient**. The core positioning and layout logic has fundamental flaws that prevent pixel-perfect accuracy. We need to fix the **position calculation**, **coordinate system**, and **Auto Layout handling** before any other improvements will be visible.
