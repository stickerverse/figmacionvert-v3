# Pixel-Perfect Rendering Diagnosis

## 🚨 **Critical Issues Blocking Fidelity**

### **Issue 1: Screenshot Quality & Resolution Degradation**

**Location**: `chrome-extension/src/utils/dom-extractor.ts` (lines 5000-5030)

**Problem**: Images are being aggressively compressed during extraction:

- **Ultra-aggressive scaling**: Minimum 100px on longest side
- **Extreme quality reduction**: 0.005 to 0.3 quality range
- **Aggressive compression logic**: Assumes 0.05 bytes/pixel

```typescript
// CURRENT (BAD) - Line 5006
const minScale = 100 / Math.max(width, height); // TOO SMALL!

// CURRENT (BAD) - Line 5031
let minQuality = 0.005; // Ultra-low quality!
let maxQuality = 0.3; // Much too low!
```

**Impact**:

- Images lose critical visual details
- Text in images becomes unreadable
- Colors become posterized
- Fine gradients are lost

**What you're missing**:

- Need **high-quality baseline** (0.85-0.95 quality)
- Need **minimum 300-400px** preservation for readable text
- Need **progressive optimization** only when payload is truly excessive

---

### **Issue 2: Device Pixel Ratio Not Applied Correctly**

**Location**: `figma-plugin/src/importer.ts` (lines 522-570)

**Problem**: Heuristic for detecting CSS pixels vs device pixels is fragile:

```typescript
// Line 555-560 - This heuristic is WRONG for most cases
const coordsLookLikeCssPx =
  typeof rootAbsW === "number" &&
  typeof rootLayoutW === "number" &&
  Math.abs(rootAbsW - rootLayoutW) < 0.5; // TOO STRICT

// Line 565 - Scale is NEVER applied when coordinates ARE in device pixels
const shouldScale = scaleCandidate > 1 && !coordsLookLikeCssPx;
```

**Impact**:

- On high-DPI displays (devicePixelRatio > 1), elements appear double-sized in Figma
- Coordinates off by 2x on Retina/4K displays
- Layout breaks completely on mobile captures (DPR = 2)

**What you're missing**:

- Need to **explicitly track** whether extraction uses CSS or device pixels
- Need to **pass `screenshotScale`** from capture service reliably
- Need **metadata flag** indicating coordinate system used

---

### **Issue 3: Screenshot Overlay Disabled for "Safety"**

**Location**: `chrome-extension/src/injected-script.ts` (lines 35-60)

**Problem**: Overlay generation is completely disabled on most pages:

```typescript
// Lines 45-50 - OVERLY CONSERVATIVE LIMITS
const MAX_PIXELS = 4_000_000; // ~4MP - TOO SMALL for 1440+ width
const MAX_IMAGE_MB = 3; // Too small - modern screenshots are larger
const MAX_NODES = 2500; // Too aggressive limit

// Result: Overlay skipped, losing visual verification layer
```

**Impact**:

- No pixel-perfect verification possible
- Can't compare original vs Figma side-by-side
- No visual feedback on conversion quality
- Users don't know what's wrong

**What you're missing**:

- Need **dynamic limits** based on available memory
- Need **chunked overlay rendering** for large pages
- Need **lazy-loaded comparison** instead of pre-computed overlay

---

### **Issue 4: Asset Optimization Too Aggressive**

**Location**: `chrome-extension/src/utils/smart-asset-optimizer.ts`

**Problem**: Quality targets are set too low across the board:

```typescript
// Lines 277-282 - ALL quality targets too low
qualityTargets: {
  critical: 0.9,    // OK, but...
  high: 0.8,        // Too low for logos/icons
  medium: 0.65,     // VERY low
  low: 0.45,        // Unacceptable
  minimal: 0.25,    // Terrible
}
```

**Plus**: Intensity modifier reduces quality by another 30%

```typescript
const intensityModifier = 1 - intensity * 0.3; // Lines 289
// Result: critical assets drop to 0.63 quality!
```

**Impact**:

- Small icons/logos become blurry
- Brand assets lose recognition
- UI details disappear
- Colors don't match original

**What you're missing**:

- **Preserve original quality** for critical assets (0.95+)
- **Separate payload optimization** from quality targeting
- **Size budgets** instead of aggressive percentage cuts

---

### **Issue 5: Viewport Sizing Not Preserving Full Content**

**Location**: `chrome-extension/src/content-script.ts` (lines 62-80)

**Problem**: Natural page dimensions might not capture full scrollable content:

```typescript
// Lines 62-80 - Natural dimensions might miss content
const naturalDimensions = detectNaturalPageDimensions();
const viewports: CaptureViewportTarget[] = message.viewports || [
  {
    name: "Natural",
    width: naturalDimensions.width,
    height: naturalDimensions.height,
    // ^ May not include bottom-aligned absolutely positioned content
    deviceScaleFactor: window.devicePixelRatio || 1,
    preserveNatural: true,
  },
];
```

**Impact**:

- Floating headers/footers get cut off
- Sticky elements don't render properly
- Full-page captures miss bottom content
- Modal overlays might be incomplete

**What you're missing**:

- **Scroll all the way** to get true `scrollHeight`
- **Capture `document.documentElement.scrollHeight`** not just viewport
- **Account for `position: fixed`** elements separately

---

### **Issue 6: Font Rendering Without Embedded Fonts**

**Location**: `chrome-extension/src/utils/dom-extractor.ts` (lines 219-230)

**Problem**: Fonts are extracted but not embedded with the capture:

```typescript
// Fonts are listed but NOT downloaded/embedded
const fonts = this.buildFontDefinitions();
```

**Impact**:

- When Figma imports, fonts might not be available
- Text falls back to system fonts
- Font weight/size might render differently
- Figma can't guarantee original typography

**What you're missing**:

- **Download actual font files** (@font-face sources)
- **Embed WOFF2 fonts** in the capture payload
- **Store font fallback chain** explicitly
- **Include font variation** data (weights, styles)

---

## 🔧 **What Needs to Change**

### **Priority 1: Image Quality Baseline**

```typescript
// In dom-extractor.ts - Change aggressive compression to intelligent:
// BEFORE (BAD):
const minScale = 100 / Math.max(width, height);

// AFTER (GOOD):
// Only scale if REALLY necessary (>10MB payload)
const minScale = Math.max(0.25, 300 / Math.max(width, height));
const scale = shouldScale ? Math.sqrt(targetPixels / totalPixels) : 1;
```

### **Priority 2: Fix Device Pixel Ratio Handling**

```typescript
// In importer.ts - Make it explicit:
const captureCoordinateSystem =
  this.data.metadata?.captureCoordinateSystem || "css-pixels";
const shouldApplyScale =
  captureCoordinateSystem === "device-pixels" && scaleCandidate > 1;
const factor = shouldApplyScale ? 1 / scaleCandidate : 1;
```

### **Priority 3: Enable Quality Screenshots**

```typescript
// In injected-script.ts - Dynamic limits:
const availableMemory =
  (performance as any).memory?.jsHeapSizeLimit / (1024 * 1024) || 2048;
const MAX_PIXELS = Math.min(8_000_000, availableMemory * 100_000);
const MAX_NODES = Math.min(5000, availableMemory * 0.5);
```

### **Priority 4: Preserve Asset Quality**

```typescript
// In smart-asset-optimizer.ts - Only optimize when necessary:
const shouldOptimize = payloadSizeMB > 15; // Not at 5-10MB
const qualityTargets = shouldOptimize ?
  { critical: 0.85, high: 0.75, ... } :  // Conservative reduction
  { critical: 0.95, high: 0.90, ... };   // Preserve quality
```

### **Priority 5: Full Page Capture**

```typescript
// In content-script.ts - Get true dimensions:
const bodyScroll = document.body.scrollHeight;
const htmlScroll = document.documentElement.scrollHeight;
const trueHeight = Math.max(bodyScroll, htmlScroll, window.innerHeight);
```

### **Priority 6: Embed Fonts**

```typescript
// New file: chrome-extension/src/utils/font-embedder.ts
class FontEmbedder {
  async downloadAndEmbedFonts(
    fontStack: string[]
  ): Promise<Map<string, ArrayBuffer>>;
}
```

---

## 📊 **Expected Results After Fixes**

| Aspect         | Before               | After                   |
| -------------- | -------------------- | ----------------------- |
| Image Quality  | 0.005-0.3            | 0.85-0.95               |
| Min Image Size | 100px                | 300px                   |
| Device Scale   | Broken               | Correct                 |
| Overlay Gen    | Rare/Disabled        | Always Available        |
| Font Fidelity  | Fallback             | Embedded                |
| Payload Size   | Aggressively Reduced | Optimized Intelligently |

---

## ✅ **Action Items**

1. **Reduce compression aggression** in `dom-extractor.ts`
2. **Fix DPR handling** in `importer.ts`
3. **Enable overlays** in `injected-script.ts`
4. **Improve asset optimization** in `smart-asset-optimizer.ts`
5. **Capture full content** in `content-script.ts`
6. **Add font embedding** in new `font-embedder.ts`

**Result**: Near pixel-perfect renders matching your original websites! 🎯
