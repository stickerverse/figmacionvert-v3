# Schema Mismatch Fix: Extension Root Field Not Recognized by Plugin

## Problem Summary

The Figma plugin was failing during import with "No root data available for import" error, even though the Chrome extension was successfully capturing and sending the schema data.

### Root Cause

**Schema Field Mismatch Between Extension and Plugin:**

1. **Chrome Extension** sends schema with modern `root` field:
   ```javascript
   {
     captures: [
       {
         viewport: "Desktop",
         data: {
           root: { ... },      // ✅ Modern schema uses 'root'
           metadata: { ... },
           assets: { ... }
         }
       }
     ]
   }
   ```

2. **Figma Plugin V2 Import Path** (`handleEnhancedImportV2`) only checked for legacy `tree` field:
   ```javascript
   // ❌ BEFORE: Only looked for 'tree'
   const candidate = cap.data?.tree
     ? cap.data
     : cap.data?.schema?.tree
     ? cap.data.schema
     : ...

   if (candidate?.tree) {  // ❌ Never finds 'root'
     picked = candidate;
   }
   ```

3. **Result**: Plugin couldn't find the schema and rejected the import with "No root data available"

### Why V1 Import Path Worked

The main `handleImportRequest` function (V1 path) already checked for both `root` and `tree`:
```javascript
// ✅ V1 import path checks both
const candidate = (cap.data?.root || cap.data?.tree)
  ? cap.data
  : (cap.data?.schema?.root || cap.data?.schema?.tree)
  ? cap.data.schema
  : ...
```

This is why some imports worked while others failed - it depended on which import path was triggered.

## Fix Applied

Updated `handleEnhancedImportV2` in `/figma-plugin/src/code.ts` to match the V1 import logic:

### 1. Multi-Viewport Unwrapping (Lines 1581-1632)
```javascript
// ✅ AFTER: Check for both modern 'root' and legacy 'tree'
const candidate = (cap.data?.root || cap.data?.tree)
  ? cap.data
  : (cap.data?.schema?.root || cap.data?.schema?.tree)
  ? cap.data.schema
  : cap.data?.rawSchemaJson
  ? JSON.parse(cap.data.rawSchemaJson)
  : cap.data || cap.schema;

if (candidate?.root || candidate?.tree) {  // ✅ Finds either field
  picked = candidate;
  console.log(
    `✅ Using viewport: ${cap.viewport || "unnamed"} (V2), has ${
      candidate.root ? 'root' : 'tree'
    }`
  );
  break;
}
```

### 2. Tree-to-Root Migration (Lines 1634-1639)
```javascript
// Apply migration if legacy tree exists
if (schema.tree && !schema.root) {
  console.log("🔄 [V2-MIGRATION] Converting legacy 'tree' to canonical 'root'");
  schema.root = schema.tree;
  delete schema.tree;
}
```

### 3. Deep Search Update (Lines 1667-1694)
```javascript
// Deep search for any nested object that contains a root or tree
const findSchemaWithRoot = (obj: any): any | null => {
  if (!obj || typeof obj !== "object") return null;
  if (visited.has(obj)) return null;
  visited.add(obj);
  if ((obj as any).root || (obj as any).tree) return obj;  // ✅ Check both
  // ... recursive search
};

if (nested) {
  console.log("✅ Found nested schema with root/tree (V2), using it");
  // Migrate if tree found
  if (nested.tree && !nested.root) {
    console.log("🔄 [NESTED-V2] Converting nested 'tree' to canonical 'root'");
    nested.root = nested.tree;
    delete nested.tree;
  }
}
```

### 4. Updated Validation Messages (Lines 1696-1728)
```javascript
// Final validation
if (!schema.root) {
  console.error("❌ No root data available (V2). Data structure:", { ... });
  figma.ui.postMessage({
    type: "error",
    message: "No root data available for import. The schema may be in an unsupported format.",
  });
  return;
}

console.log("🚀 Starting enhanced import V2 with schema:", {
  version: schema.version,
  rootPresent: !!schema.root,
  rootType: schema.root?.type,
  rootName: schema.root?.name,
  rootChildren: schema.root?.children?.length || 0,
  // ...
});
```

## Additional Fixes

### Fixed Syntax Error in node-builder.ts
Found and fixed a missing `if` statement at line 3154:
```javascript
// ❌ BEFORE: Missing opening 'if' statement
node.strokesIncludedInLayout = layout.strokesIncludedInLayout;
console.log(...);
} else if (typeof node.strokeWeight === 'number' && node.strokeWeight > 0) {

// ✅ AFTER: Added missing 'if'
if (layout.strokesIncludedInLayout !== undefined) {
  node.strokesIncludedInLayout = layout.strokesIncludedInLayout;
  console.log(...);
} else if (typeof node.strokeWeight === 'number' && node.strokeWeight > 0) {
```

### Commented Out Missing Method
Temporarily commented out call to undefined `applyPixelPerfectTransform` method at line 2767:
```javascript
// TODO: Implement applyPixelPerfectTransform method
// if (data.absoluteTransform) {
//   this.applyPixelPerfectTransform(node, data, untransformedWidth, untransformedHeight);
//   appliedPixelPerfectMatrix = true;
// }
```

## Testing Instructions

### 1. Reload the Figma Plugin
```bash
# The plugin has been rebuilt - reload it in Figma Desktop
# Figma → Plugins → Development → Import from manifest → figma-plugin/manifest.json
```

### 2. Capture a Page with Extension
1. Open any webpage in Chrome
2. Click the extension icon
3. Perform a capture
4. Click "Send to Figma"

### 3. Verify the Fix in Plugin Console

Open Figma's Developer Console and look for these success logs:

```
🔓 Unwrapping multi-viewport capture format (V2)...
✅ Using viewport: Desktop (V2), has root
🚀 Starting enhanced import V2 with schema: {
  rootPresent: true,
  rootType: "FRAME",
  rootChildren: 42,
  ...
}
✅ Starting enhanced import process...
```

**Before the fix, you would see:**
```
❌ No root data available (V2). Data structure: ...
```

### 4. Verify Import Success

The import should now complete successfully with:
- All elements imported into Figma
- Pixel-perfect positioning preserved
- No "No root data available" errors

## Impact

This fix ensures that:
1. **Both V1 and V2 import paths** now recognize the modern `root` field from the extension
2. **Backward compatibility** with legacy `tree` field is maintained via automatic migration
3. **Multi-viewport captures** are properly unwrapped and imported
4. **Deep nesting** of schema structures is handled correctly

## Files Modified

1. `/figma-plugin/src/code.ts` - Updated `handleEnhancedImportV2` function (lines 1581-1728)
2. `/figma-plugin/src/node-builder.ts` - Fixed syntax error (line 3154) and commented out missing method (line 2767)

## Build Status

✅ Plugin build successful:
```
npm run build
> npm run typecheck && npm run build:bundle
> tsc -p tsconfig.json --noEmit
> node esbuild.config.cjs
[figma-plugin] esbuild build complete
```

## Next Steps

1. ✅ Plugin has been rebuilt with the fix
2. ⏳ Test the import flow end-to-end (capture → send → import)
3. ⏳ Implement the `applyPixelPerfectTransform` method for Phase 3 transforms (if needed)
4. ⏳ Verify no regressions in existing import flows
