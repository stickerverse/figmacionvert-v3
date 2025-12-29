# Layout Positioning Fix - Blank White Frame Error

## Critical Issue

**Symptom**: Figma plugin imports fail with blank white frames and error:
```
❌ [NODE_BUILDER] afterCreate failed for Button Container: Categories:
Error: in set_layoutPositioning: Can only set layoutPositioning ABSOLUTE
if the parent node has layoutMode !== NONE

❌ [CRITICAL] Failed to build root tree node
```

**Root Cause**: The node builder was setting `layoutPositioning = "ABSOLUTE"` on child nodes without checking if the parent node has `layoutMode !== "NONE"`. This violates Figma's Plugin API constraint.

## Figma API Constraint

According to Figma's Plugin API:
- `layoutPositioning = "ABSOLUTE"` can **only** be set on a child node if its parent has `layoutMode !== "NONE"`
- If the parent has `layoutMode = "NONE"`, the child cannot have explicit `layoutPositioning` set
- This is enforced at the API level and throws an error if violated

## Analysis

### Error Flow

1. **Schema capture** → Layout intelligence determines node should use ABSOLUTE positioning
2. **Professional layout validation** ([node-builder.ts:7745](figma-plugin/src/node-builder.ts#L7745)) → Sets `correctedData.layoutPositioning = "ABSOLUTE"` (lines 7763, 7807, 7810)
3. **Node creation** → Parent node created with `layoutMode = "NONE"` (multiple locations)
4. **afterCreate** ([node-builder.ts:2195](figma-plugin/src/node-builder.ts#L2195)) → Calls `applyPositioning` (line 2206)
5. **applyPositioning** ([node-builder.ts:2694](figma-plugin/src/node-builder.ts#L2694)) → Calls `applyProfessionalPositioning` (line 2701)
6. **applyProfessionalPositioning** ([node-builder.ts:7566](figma-plugin/src/node-builder.ts#L7566)) → Attempts to set `node.layoutPositioning = "ABSOLUTE"` (line 7593)
7. **Figma API error** → Throws because parent has `layoutMode = "NONE"`
8. **Import failure** → Error caught in afterCreate, entire import fails with blank white frame

### Why This Happens

The professional layout solver analyzes CSS layout patterns and infers that certain nodes should use ABSOLUTE positioning (lines 7762-7763, 7806-7807). However, this decision is made **before** the parent node is created, so it doesn't know the parent will have `layoutMode = "NONE"`.

Later, when the parent is created and set to `layoutMode = "NONE"` (lines 3109, 3131, 3211, 4263), the child nodes still have the pre-determined `layoutPositioning = "ABSOLUTE"` setting, causing the API constraint violation.

## Fix Applied

**File**: [figma-plugin/src/node-builder.ts:7591-7612](figma-plugin/src/node-builder.ts#L7591-L7612)

**Solution**: Add runtime parent check before setting `layoutPositioning`

**Before**:
```typescript
// CORRECTED: Apply layoutPositioning if specified (direct property on node)
if (data.layoutPositioning && "layoutPositioning" in node) {
  (node as any).layoutPositioning = data.layoutPositioning;
  console.log(
    `📍 [PROFESSIONAL POSITIONING] Applied layoutPositioning: ${data.layoutPositioning}`
  );
}
```

**After**:
```typescript
// CORRECTED: Apply layoutPositioning if specified (direct property on node)
// CRITICAL FIX: Only set ABSOLUTE positioning if parent has layoutMode !== NONE
if (data.layoutPositioning && "layoutPositioning" in node) {
  // Check if parent supports this layoutPositioning mode
  const canUseAbsolute =
    data.layoutPositioning === "AUTO" ||
    (node.parent &&
      "layoutMode" in node.parent &&
      (node.parent as FrameNode).layoutMode !== "NONE");

  if (canUseAbsolute) {
    (node as any).layoutPositioning = data.layoutPositioning;
    console.log(
      `📍 [PROFESSIONAL POSITIONING] Applied layoutPositioning: ${data.layoutPositioning}`
    );
  } else {
    console.warn(
      `⚠️ [PROFESSIONAL POSITIONING] Skipping layoutPositioning=${data.layoutPositioning} - parent layoutMode is NONE`
    );
    // Don't set layoutPositioning - leave it as default to prevent Figma API error
  }
}
```

## Fix Logic

1. **Check if parent exists**: `node.parent` must be defined
2. **Check if parent supports layoutMode**: `"layoutMode" in node.parent`
3. **Check parent's layoutMode**: `(node.parent as FrameNode).layoutMode !== "NONE"`
4. **Special case for AUTO**: `layoutPositioning = "AUTO"` is always safe to set
5. **Safe fallback**: If checks fail, **don't set the property** - Figma will use default positioning

## Impact

### Functionality Preserved
- Nodes with `layoutMode !== "NONE"` parents will still get correct ABSOLUTE positioning
- Nodes in Auto Layout containers continue to work correctly
- Professional layout intelligence still runs and provides recommendations

### Regression Prevention
- API constraint violations eliminated
- Import failures due to layoutPositioning mismatch prevented
- Graceful degradation when parent doesn't support ABSOLUTE positioning

### Console Warnings
When the fix triggers, you'll see:
```
⚠️ [PROFESSIONAL POSITIONING] Skipping layoutPositioning=ABSOLUTE - parent layoutMode is NONE
```

This is **expected** and indicates the fix is working correctly to prevent the API error.

## Verification

### Build Status
```bash
cd figma-plugin && npm run build
# ✅ [figma-plugin] esbuild build complete
```

### Testing Checklist

1. **Reload plugin** in Figma Desktop
2. **Import a page capture** with complex layout
3. **Verify console logs** - Should see positioning warnings but NO errors
4. **Check imported result** - Should see complete page, not blank white frame
5. **Verify layout** - Nodes should be positioned correctly even without explicit ABSOLUTE setting

### Expected Console Output

**Before fix** (error):
```
❌ [NODE_BUILDER] afterCreate failed for Button Container: Categories:
Error: in set_layoutPositioning: Can only set layoutPositioning ABSOLUTE...
❌ [CRITICAL] Failed to build root tree node
```

**After fix** (warning only):
```
⚠️ [PROFESSIONAL POSITIONING] Skipping layoutPositioning=ABSOLUTE - parent layoutMode is NONE
📍 [PROFESSIONAL POSITIONING] Applied layoutPositioning: AUTO
✅ [NODE_CREATION] Created FRAME: Button Container
```

## Related Issues

This fix resolves the exact "white blank frame" failure mode documented in [CLAUDE.md](CLAUDE.md):

> **Critical bug pattern**: Early `return` statements after transform application abort the pipeline before fills/effects/children are processed, causing blank frames.

While this specific issue was about layoutPositioning (not early returns), it falls into the same category of **critical import pipeline failures** that result in blank frames.

## Prevention

### For Future Development

1. **Always check parent constraints** before setting child positioning properties
2. **Use runtime checks** instead of pre-computed decisions when working with Figma's layout API
3. **Add graceful fallbacks** when API constraints can't be satisfied
4. **Log warnings** instead of failing silently

### Code Pattern to Follow

```typescript
// GOOD: Check parent before setting child positioning
if (data.layoutPositioning && "layoutPositioning" in node) {
  const canUse = checkParentConstraints(node.parent, data.layoutPositioning);
  if (canUse) {
    node.layoutPositioning = data.layoutPositioning;
  } else {
    console.warn("Skipping - parent constraint violated");
  }
}

// BAD: Blindly set positioning
node.layoutPositioning = data.layoutPositioning; // May throw API error!
```

## Next Steps

1. ✅ **Build verified** - Plugin compiles successfully
2. **Test import** - Reload plugin and import a page capture
3. **Monitor console** - Verify warnings appear but no errors
4. **Visual verification** - Confirm page imports completely without blank frames
5. **Optional optimization** - Consider adjusting layout intelligence to avoid ABSOLUTE recommendations when parent will be NONE

## Files Modified

- [figma-plugin/src/node-builder.ts:7591-7612](figma-plugin/src/node-builder.ts#L7591-L7612) - Added parent layoutMode check before setting layoutPositioning

## Build Commands

```bash
# Build plugin
cd figma-plugin && npm run build

# Build everything (if schema changes were made)
npm run build:all
```
