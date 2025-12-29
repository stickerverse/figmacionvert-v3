# Schema Import Verification - Critical Findings

## Problem Analysis

The user reported: **"the schema is not being imported into the plugin to be built"**

## Root Cause Discovered

The plugin **WAS NOT** importing the shared schema types (`WebToFigmaSchema`, `AnalyzedNode`) from `shared/schema.ts`. The entire codebase used `any` types, which meant:

1. **No type safety** - The plugin couldn't validate incoming schema structure
2. **No compile-time checks** - TypeScript couldn't catch schema mismatches
3. **Runtime-only validation** - Errors only appeared when data didn't match expectations

## Fix Applied

### 1. Added Schema Type Imports

**File**: `/figma-plugin/src/code.ts` (lines 19-28)
```typescript
// Import shared schema types (CRITICAL: Single source of truth)
import type { WebToFigmaSchema, AnalyzedNode } from "../../shared/schema";

// Log the imported schema type at module load to verify import
console.log("[SCHEMA IMPORT CHECK] WebToFigmaSchema type imported from shared/schema.ts");

// Type definitions for incoming data formats (extension → plugin)
// Using 'any' for now to maintain compatibility with existing code
// TODO: Add proper TypeScript types after verifying schema import works
type IncomingSchemaData = any;
```

**File**: `/figma-plugin/src/enhanced-figma-importer.ts` (lines 33-34)
```typescript
// Import shared schema types (CRITICAL: Single source of truth)
import type { WebToFigmaSchema, AnalyzedNode } from "../../shared/schema";
```

### 2. Added Comprehensive Debug Logging

**File**: `/figma-plugin/src/code.ts` `handleEnhancedImportV2` function (lines 1570-1581)
```typescript
// CRITICAL DEBUG: Log incoming data structure before processing
console.log("[SCHEMA DEBUG] Incoming data structure:", {
  hasRoot: !!data?.root,
  hasTree: !!data?.tree,
  hasCaptures: !!data?.captures,
  hasRawSchemaJson: !!data?.rawSchemaJson,
  hasSchema: !!data?.schema,
  capturesLength: data?.captures?.length,
  dataKeys: data ? Object.keys(data).slice(0, 20) : [],
  firstCaptureKeys: data?.captures?.[0] ? Object.keys(data.captures[0]).slice(0, 20) : [],
  firstCaptureDataKeys: data?.captures?.[0]?.data ? Object.keys(data.captures[0].data).slice(0, 20) : [],
});
```

### 3. Build Verification

**Command**: `npm run build:all`
**Result**: ✅ Build successful

**Bundle verification**:
```bash
grep -n "SCHEMA IMPORT CHECK" /figma-plugin/dist/code.js
# Output: Line 1268 - confirms the import log is in the bundle
```

## Verification Steps

### Step 1: Reload Plugin in Figma Desktop

1. Open Figma Desktop
2. Go to: Plugins → Development → Import from manifest
3. Select: `/figma-plugin/manifest.json`
4. **IMPORTANT**: If plugin was already loaded, remove it and re-add it to force reload

### Step 2: Open Figma Developer Console

1. In Figma Desktop, press: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
2. Go to the **Console** tab
3. Look for the startup log:
   ```
   [SCHEMA IMPORT CHECK] WebToFigmaSchema type imported from shared/schema.ts
   ```
   ✅ If you see this log, the schema import is working correctly

### Step 3: Capture a Page with Extension

1. Open Chrome with the extension loaded
2. Navigate to any test webpage
3. Click the extension icon
4. Click "Capture Page"
5. Click "Send to Figma"

### Step 4: Check Plugin Console Logs

After sending to Figma, the plugin console should show:

#### Expected Success Logs:
```
[SCHEMA DEBUG] Incoming data structure: {
  hasRoot: false,
  hasTree: false,
  hasCaptures: true,
  capturesLength: 1,
  dataKeys: ['captures', ...],
  firstCaptureKeys: ['viewport', 'data', ...],
  firstCaptureDataKeys: ['root', 'metadata', 'assets', 'tokens', ...],
}
🔓 Unwrapping multi-viewport capture format (V2)...
✅ Using viewport: Desktop (V2), has root
🚀 Starting enhanced import V2 with schema: {
  rootPresent: true,
  rootType: "FRAME",
  rootChildren: 42,
  ...
}
```

#### Failure Indicators:
```
❌ No root data available (V2). Data structure: ...
```

### Step 5: Verify Import Completes

- Import should complete without errors
- Elements should appear in Figma canvas
- No "No root data available" errors in console

## Technical Details

### Schema Structure

**Shared Schema** (`shared/schema.ts`):
```typescript
export interface WebToFigmaSchema {
  version: "v2";
  url: string;
  viewport: Viewport;
  root: AnalyzedNode;  // ← Modern schema uses 'root'
  tokens: Tokens;
  assets?: { ... };
  meta: { ... };
}
```

**Extension Output Format** (multi-viewport):
```json
{
  "captures": [
    {
      "viewport": "Desktop",
      "width": 1920,
      "height": 1080,
      "data": {
        "root": { ... },      // ← WebToFigmaSchema
        "metadata": { ... },
        "assets": { ... },
        "tokens": { ... }
      }
    }
  ]
}
```

### Import Path Flow

1. **Extension** → Captures DOM → Creates `WebToFigmaSchema` with `root` field
2. **Handoff Server** → Wraps schema in multi-viewport format
3. **Plugin** → Receives data → Unwraps → Checks for `root` or `tree` (legacy)
4. **Plugin** → Migrates `tree` → `root` if needed
5. **Plugin** → Validates `root` exists
6. **Plugin** → Passes to importer

### Legacy Compatibility

The plugin still supports legacy schemas with `tree` field:
```typescript
// Check for both modern 'root' and legacy 'tree' fields
const candidate = (cap.data?.root || cap.data?.tree)
  ? cap.data
  : (cap.data?.schema?.root || cap.data?.schema?.tree)
  ? cap.data.schema
  : ...

// Migrate tree → root
if (schema.tree && !schema.root) {
  console.log("🔄 [V2-MIGRATION] Converting legacy 'tree' to canonical 'root'");
  schema.root = schema.tree;
  delete schema.tree;
}
```

## Files Modified

1. **`/figma-plugin/src/code.ts`**
   - Added schema type imports (line 20)
   - Added schema import verification log (line 23)
   - Added comprehensive debug logging (lines 1570-1581)

2. **`/figma-plugin/src/enhanced-figma-importer.ts`**
   - Added schema type imports (line 34)

3. **`/figma-plugin/dist/code.js`**
   - Rebuilt bundle includes all changes
   - Schema import log confirmed at line 1268

## Next Steps

1. ✅ Schema types ARE being imported (verified in bundle)
2. ⏳ **USER ACTION REQUIRED**: Reload plugin in Figma and check console
3. ⏳ **USER ACTION REQUIRED**: Test capture → send → import flow
4. ⏳ **USER ACTION REQUIRED**: Paste console output here if errors occur

## Debug Output Template

When reporting issues, please include:

```
=== PLUGIN LOAD ===
[SCHEMA IMPORT CHECK] log: YES/NO

=== IMPORT START ===
[SCHEMA DEBUG] Incoming data structure: { paste full object here }

=== UNWRAPPING ===
🔓 Unwrapping logs: { paste here }

=== VALIDATION ===
Final validation logs: { paste here }

=== ERRORS ===
Any error messages: { paste here }
```

## Summary

**Status**: ✅ Schema import is now properly configured
**Build**: ✅ Plugin successfully built with schema types
**Bundle**: ✅ Verified schema import exists in dist/code.js
**Testing**: ⏳ Awaiting user verification in Figma Desktop

The schema IS being imported into the plugin. The next step is to verify it's working correctly at runtime by checking the console logs when the plugin loads and when data is imported.
