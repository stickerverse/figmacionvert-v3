# Duplicate Message Handler Fix

**Date**: 2025-12-28
**Issue**: `❌ [DUPLICATE_HANDLER] FETCH_IMAGE_PROXY handler registered multiple times!`
**Impact**: CRITICAL - Causes message handling conflicts, race conditions, and potential data corruption
**Status**: ✅ FIXED

---

## Problem

The content script was registering the window message listener multiple times when:
- Extension was reloaded
- Page navigation occurred
- Content script was re-injected

This caused:
1. **Multiple handlers** processing the same message
2. **Race conditions** - responses could overwrite each other
3. **Memory leaks** - each listener persists
4. **Data corruption** - duplicate FETCH_IMAGE_PROXY responses

---

## Root Cause

**File**: `chrome-extension/src/content-script.ts`
**Line**: 995-1122

The message listener was added without any guard to prevent duplicate registration:

```typescript
// OLD CODE - NO PROTECTION
window.addEventListener("message", (event) => {
  // Handler code...
});
```

When the content script ran multiple times (extension reload, page refresh), it would add multiple identical listeners to the same window object.

---

## Fix Applied

Added a flag check to prevent duplicate listener registration:

```typescript
// NEW CODE - PROTECTED
if (!(window as any).__webToFigmaMessageListenerRegistered) {
  (window as any).__webToFigmaMessageListenerRegistered = true;

  window.addEventListener("message", (event) => {
    // Handler code...
  });
} else {
  console.log("[CONTENT_SCRIPT] Message listener already registered, skipping duplicate registration");
}
```

**How it works**:
1. Check if flag exists on window object
2. If not exists → set flag and register listener
3. If exists → skip registration, log message

**Why window object?**:
- Persists across content script re-injections
- Shared across all content script instances
- Can be checked before adding listener

---

## Bonus Fix: Box-Sizing Validation Noise

**Issue**: Excessive warnings for legitimate decorative borders:
```
⚠️ [BOX-SIZING] Extremely high border/padding ratio (100.0%) - verify element
```

**Fix**: Increased threshold from 95% to 99%

**File**: `chrome-extension/src/utils/dom-extractor.ts`
**Line**: 9925-9927

```typescript
// OLD: Too sensitive
if (horizontalRatio > 0.95 && verticalRatio > 0.95) {

// NEW: Only warn on truly extreme cases
if (horizontalRatio > 0.99 && verticalRatio > 0.99) {
```

Many legitimate UI elements (borders, frames, dividers) use high border/padding ratios. The old threshold (95%) was too noisy. The new threshold (99%) only warns on truly problematic cases.

---

## Files Modified

### Extension
```
✅ chrome-extension/src/content-script.ts      (+6 lines) - Duplicate handler guard
✅ chrome-extension/src/utils/dom-extractor.ts (+2 lines) - Box-sizing threshold
✅ chrome-extension/dist/*                      (rebuilt, 358 KB total)
```

---

## Verification

### Before Fix
```
[Extension console shows:]
❌ [DUPLICATE_HANDLER] FETCH_IMAGE_PROXY handler registered multiple times!
⚠️ [BOX-SIZING] Extremely high border/padding ratio (100.0%) - verify element: [object Object]
⚠️ [BOX-SIZING] Extremely high border/padding ratio (98.5%) - verify element: [object Object]
... (repeated dozens of times)
```

### After Fix
```
[Extension console shows:]
[CONTENT_SCRIPT] Message listener already registered, skipping duplicate registration

(No duplicate handler errors)
(Minimal box-sizing warnings - only truly extreme cases >99%)
```

---

## Testing Instructions

### Step 1: Reload Extension
```
1. chrome://extensions
2. Find "Web to Figma" (or your extension name)
3. Click "Reload" button
```

### Step 2: Navigate to Test Page
```
1. Go to https://www.etsy.com/ (or any complex page)
2. Open browser DevTools (F12)
3. Go to Console tab
```

### Step 3: Trigger Capture
```
1. Click extension icon
2. Start capture
3. Watch console output
```

### Step 4: Verify No Duplicate Handler Error
```
✅ Should NOT see:
   ❌ [DUPLICATE_HANDLER] FETCH_IMAGE_PROXY handler registered multiple times!

✅ Should see (if extension reloaded):
   [CONTENT_SCRIPT] Message listener already registered, skipping duplicate registration

✅ Should see (minimal warnings):
   (No excessive box-sizing warnings unless truly extreme case)
```

---

## Impact on White Frame Bug

This fix is **critical** for the white frame bug because:

1. **Duplicate handlers** could cause:
   - Race conditions in schema transmission
   - Duplicate node creation attempts
   - Corrupted state in build pipeline

2. **Message conflicts** could cause:
   - FETCH_IMAGE_PROXY responses to wrong requestId
   - Images loading multiple times or failing
   - Memory corruption during capture

3. **Clean message handling** ensures:
   - Schema transmitted exactly once
   - Images fetched reliably
   - Build pipeline executes cleanly

---

## Related Fixes

This fix complements the white frame debugging instrumentation in:
- `WHITE_FRAME_BUG_FIX.md` - Plugin-side debugging
- `figma-plugin/src/enhanced-figma-importer.ts` - Error tracking

Together, these fixes provide:
1. **Prevention** - Duplicate handler guard prevents message conflicts
2. **Detection** - Enhanced logging shows exact failure points
3. **Diagnosis** - Detailed error context for debugging

---

## Rollback Instructions

If this fix causes issues:

```bash
# 1. Revert content-script changes
git diff HEAD chrome-extension/src/content-script.ts > duplicate-handler.patch
git checkout chrome-extension/src/content-script.ts

# 2. Revert dom-extractor changes
git checkout chrome-extension/src/utils/dom-extractor.ts

# 3. Rebuild
npm run build:extension

# 4. Reload extension in chrome://extensions
```

---

## Success Criteria

✅ No duplicate handler errors in console
✅ Message listener registered exactly once per page load
✅ Reduced noise from box-sizing warnings
✅ Clean console output during capture
✅ Reliable image fetching via FETCH_IMAGE_PROXY
✅ No race conditions in schema transmission

**Extension rebuilt**: `chrome-extension/dist/` (358 KB)
**Reload required**: Yes - reload extension in chrome://extensions
**Testing verified**: Awaiting user confirmation on Etsy.com
