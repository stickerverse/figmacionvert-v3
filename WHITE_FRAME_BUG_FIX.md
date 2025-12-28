# White Frame Bug - Comprehensive Fix & Debugging Guide

**Date**: 2025-12-28
**Symptom**: Blank white frame rendered on Figma canvas with no content, import process stops
**Status**: ✅ DEBUGGING INSTRUMENTATION ADDED

---

## What Was Fixed

Added comprehensive error tracking and logging to catch the exact failure point when nodes fail to build. The plugin will now:

1. **Track every node build attempt** - success vs failure counts
2. **Log detailed error information** when nodes fail validation or creation
3. **Throw explicit errors** when ALL nodes fail (preventing silent white frames)
4. **Provide diagnostic data** in console for each failure

---

## Files Modified

### `/Users/skirk92/figmacionvert-2/figma-plugin/src/enhanced-figma-importer.ts`

**Lines 209-235**: Enhanced `ValidationUtils.validateNodeData()` logging
- Changed `console.warn` → `console.error` with detailed context
- Added node structure details to validation failures

**Lines 1829-1892**: Enhanced `buildHierarchy` caller with success/fail tracking
- Tracks success/fail count for each batch of child nodes
- Logs detailed error info for each failed node
- Throws explicit error if ALL nodes fail to build

**Lines 1973-1982**: Enhanced `createSingleNodeRobust` null return logging
- Added detailed node structure info when NodeBuilder returns null
- Shows which properties are present/missing

---

## How to Debug the White Frame Bug

### Step 1: Reload the Plugin

```
1. Open Figma Desktop
2. Go to: Plugins → Development → Import plugin from manifest
3. Select: /Users/skirk92/figmacionvert-2/figma-plugin/manifest.json
4. Click "Import"
```

### Step 2: Open Plugin Console

```
1. In Figma: Plugins → Development → Open Console
2. This shows all plugin logs and errors
```

### Step 3: Attempt Import

```
1. Trigger an import (via extension or test script)
2. Watch the console for diagnostic logs
```

### Step 4: Analyze Console Output

The console will now show one of these failure patterns:

#### Pattern 1: Schema Reception Failure

```
❌ [PRE-IMPORT] CRITICAL: Schema has no tree - this WILL cause blank frames
```

**Meaning**: Schema is not being transmitted correctly from server
**Fix**: Check handoff server logs and `/api/jobs/:id` endpoint response

#### Pattern 2: Validation Failures

```
❌ [VALIDATION] Invalid node data: not an object
❌ [VALIDATION] Invalid node data: missing or invalid id
❌ [VALIDATION] Node xyz123: missing or invalid type
```

**Meaning**: Schema nodes are malformed (missing required fields)
**Fix**: Check schema structure - ensure all nodes have `id` and `type`

#### Pattern 3: Node Creation Failures

```
❌ [NODE_CREATION] NodeBuilder returned null for xyz123
{
  id: "xyz123",
  type: "FRAME",
  tagName: "div",
  hasLayout: true,
  hasRect: true,
  hasStyles: true,
  nodeKeys: [...]
}
```

**Meaning**: NodeBuilder's `createNode()` is returning null despite valid data
**Fix**: Check `figma-plugin/src/node-builder.ts` for exceptions or early returns

#### Pattern 4: All Nodes Failed

```
[DEBUG] Building 50 child nodes...
❌ [CRITICAL] Failed to build child node: {...}
❌ [CRITICAL] Failed to build child node: {...}
...
[DEBUG] Build results: 0 success, 50 failed out of 50 total

Error: CRITICAL: All 50 child nodes failed to build.
This will result in a blank white frame.
Check console above for specific validation/creation errors.
```

**Meaning**: Every single node failed - likely systemic issue
**Fix**: Look at the first few failure logs to identify common cause

---

## Common Root Causes & Fixes

### 1. Schema Not Transmitted

**Symptom**: `[PRE-IMPORT] CRITICAL: Schema has no tree`

**Check**:
```bash
# Verify server is running
curl http://localhost:4411/api/health

# Check job endpoint
curl http://localhost:4411/api/jobs/<jobId>
```

**Expected Response**:
```json
{
  "status": { "state": "ready" },
  "payload": {
    "root": { ... },
    "metadata": { ... }
  }
}
```

**Fix**: Ensure `job.payload` contains unwrapped schema (not `job.payload.schema`)

### 2. Schema Has Wrong Structure

**Symptom**: `Schema has no tree` or validation failures on all nodes

**Check Schema Fields**:
- ✅ Has `root` property (not `tree`)
- ✅ `root.id` is a string
- ✅ `root.type` is a string
- ✅ `root.children` is an array
- ✅ Each child has `id`, `type`, `rect`, `layout`

**Fix**: Run schema migration in handoff server (line 1495):
```javascript
jobPayload = migrateSchemaHierarchy(jobPayload);
```

### 3. NodeBuilder Returns Null

**Symptom**: `[NODE_CREATION] NodeBuilder returned null`

**Possible Causes**:
- Missing font throws exception → returns null
- Invalid layout properties → returns null
- Early return in build pipeline → returns null (see CLAUDE.md "white blank frame" section)

**Check**: `/Users/skirk92/figmacionvert-2/figma-plugin/src/node-builder.ts`
- Search for `return null;` statements
- Check for try/catch blocks that swallow errors
- Verify no early returns after transform application

### 4. Font Loading Failures

**Symptom**: Text nodes fail with "Font not found" errors

**Fix**: Add font fallback in `node-builder.ts`:
```typescript
try {
  await figma.loadFontAsync(fontName);
} catch (err) {
  console.warn(`Font ${fontName.family} not available, using fallback`);
  fontName = { family: "Inter", style: "Regular" };
  await figma.loadFontAsync(fontName);
}
```

### 5. Image Loading Failures

**Symptom**: IMAGE nodes fail to create

**Check**:
- Are base64 image strings valid?
- Is `figma.createImage()` throwing exceptions?
- Do images have valid dimensions?

**Fix**: Add error handling around image creation in NodeBuilder

---

## Verification Checklist

After applying fixes, verify:

- [ ] Plugin console shows `[DEBUG] Building X child nodes...`
- [ ] Build results show `> 0 success` (not all failures)
- [ ] No `CRITICAL: All X child nodes failed to build` error
- [ ] Frame on canvas has visible content (not blank white)
- [ ] Console shows `✅ Node processing complete: X created, Y failed`

---

## Next Steps if Still Failing

If the white frame persists after these fixes:

1. **Capture Full Console Output**
   - Copy entire plugin console log
   - Look for first error chronologically

2. **Check Node Builder Logs**
   - Search for `[PHASE 3]`, `[PHASE 4]`, `[PHASE 5]` logs
   - Verify transform/filter/rasterization phases execute

3. **Inspect Schema File**
   - Find schema JSON file on disk (handoff server saves to disk)
   - Validate structure manually
   - Check first few nodes for required fields

4. **Enable NodeBuilder Debugging**
   - Add console.log at start of `createNode()` method
   - Log every property access/assignment
   - Find exact line where null is returned

---

## Testing the Fix

### Quick Test

```bash
# 1. Start server
./start.sh

# 2. Reload plugin in Figma (see Step 1 above)

# 3. Trigger capture from extension or run:
node puppeteer-auto-import.cjs https://example.com

# 4. Check Figma plugin console for:
[DEBUG] Building X child nodes...
[DEBUG] Build results: N success, M failed out of X total
✅ Node processing complete: N created, M failed
```

### Expected Success Output

```
[DEBUG] Building 50 child nodes...
[DEBUG] Build results: 48 success, 2 failed out of 50 total
✅ Node processing complete: 1844 created, 2 failed
```

### Expected Failure Output (Explicit Error)

```
[DEBUG] Building 50 child nodes...
❌ [CRITICAL] Failed to build child node: {...}
...
[DEBUG] Build results: 0 success, 50 failed out of 50 total

Error: CRITICAL: All 50 child nodes failed to build.
This will result in a blank white frame.
Check console above for specific validation/creation errors.
```

---

## Summary

**Before**: Silent failures → blank white frame with no error message
**After**: Explicit error tracking → console shows exactly which nodes fail and why

The plugin will now **throw an error** if all nodes fail, preventing the silent "white frame" symptom. Check the plugin console to see detailed diagnostic information about each failure.

**Plugin rebuilt**: `/Users/skirk92/figmacionvert-2/figma-plugin/dist/code.js` (664.8 KB)
**Reload required**: Yes - re-import plugin in Figma to use new version
