# Schema Import Failure Diagnostic Guide

## Quick Diagnosis Checklist

Run through these checks in order to identify where the import is failing:

### 1. Check Handoff Server Status
```bash
# Is the server running?
lsof -i :4411

# Check server logs
curl http://localhost:4411/api/health?source=plugin
```

**Expected**: Server responds with `{"ok": true, "queueLength": N}`
**If fails**: Start handoff server with `./start.sh` or `node handoff-server.cjs`

---

### 2. Check Figma Plugin Console
Open Figma Desktop → Plugins → Development → Open Console

**Look for these log patterns:**

#### ✅ SUCCESSFUL IMPORT START
```
🔵 handleImportRequest called { hasData: true, ... }
✅ Import started
```

#### ❌ NO DATA RECEIVED
```
❌ No data received
```
**Cause**: Extension didn't send schema or handoff server has no job
**Fix**: Check Chrome extension is running and has captured a page

#### ❌ DECOMPRESSION FAILURE
```
❌ [DECOMPRESS] Decompression failed: ...
🔄 [DECOMPRESS] Falling back to original payload
```
**Cause**: Corrupted compressed payload or pako.inflate failure
**Fix**: Check handoff server is using compatible compression format

#### ❌ NO ROOT AFTER UNWRAPPING
```
❌ No root data available for import. Data structure: { ... }
```
**Cause**: Schema missing `root` field after all unwrapping attempts
**Fix**: Check schema structure in extension capture

---

### 3. Check Chrome Extension Console
Open Chrome → Extension popup → Right-click → Inspect

**Look for:**
```javascript
// Successful capture
✅ Schema captured: { root: { ... }, metadata: { ... } }

// Successful handoff
✅ Handoff transfer complete: job_123abc
```

---

### 4. Verify Schema Structure

In the plugin console, check the pre-import validation logs:

```
🔍 [PRE-IMPORT] Schema overview: {
  schemaExists: true,
  schemaType: 'object',
  rootKeys: ['root', 'metadata', 'assets', ...]
}

✅ [PRE-IMPORT] Root validation: {
  rootExists: true,
  rootType: 'object',
  rootNodeType: 'FRAME',
  childrenCount: 42  // ⚠️ Should be > 0
}
```

**If childrenCount = 0**: Schema has empty root → capture failed in extension

---

## Common Failure Scenarios

### Scenario A: "Import complete" but blank white frames
**Symptom**: Import succeeds but Figma shows empty frames
**Console Pattern**:
```
✅ Import started
✅ [PRE-IMPORT] Root validation: { childrenCount: 0 }  // ⚠️ RED FLAG
```
**Root Cause**: Schema root has no children
**Fix**: Re-capture page in extension, check DOM extraction isn't filtering out all nodes

---

### Scenario B: "Import failed" immediately
**Symptom**: Import aborts with error notification
**Console Pattern**:
```
❌ No root data available for import
```
**Root Cause**: Schema structure is invalid after unwrapping
**Fix**:
1. Check extension is sending `schema.root` not `schema.tree`
2. Check multi-viewport format has valid `captures[0].data.root`
3. Enable extension debug logging to see what's being sent

---

### Scenario C: Import hangs / no response
**Symptom**: "Importing..." message never completes
**Console Pattern**:
```
🔵 handleImportRequest called
✅ Import started
[then nothing...]
```
**Root Cause**: EnhancedFigmaImporter threw uncaught error OR infinite loop
**Fix**: Check for error logs after "Import started", add more granular logging

---

### Scenario D: Server connection errors
**Symptom**: UI shows "Server disconnected"
**Console Pattern**:
```
[handoff] Health check failed: Server connection failed - ensure handoff server is running on localhost:4411
```
**Root Cause**: Handoff server not running or port conflict
**Fix**:
```bash
# Kill any process on port 4411
lsof -ti:4411 | xargs kill -9

# Restart server
./start.sh
```

---

## Advanced Debugging: Enable Payload Inspection

Add this temporary logging to `handleImportRequest` (after line 400):

```typescript
// TEMPORARY DEBUG: Log full incoming data structure
console.log("🔍 [FULL PAYLOAD DUMP]", JSON.stringify(data, null, 2).substring(0, 5000));
```

This will show the first 5000 characters of the payload to identify structure issues.

---

## Schema Structure Requirements

For import to succeed, the schema MUST have this structure after all unwrapping:

```typescript
{
  root: {
    type: "FRAME" | "PAGE",
    id: string,
    name: string,
    children: AnalyzedNode[],  // MUST be non-empty array
    layout: { x, y, width, height },
    // ... other fields
  },
  metadata: {
    url: string,
    viewportWidth: number,
    viewportHeight: number,
    // ... other metadata
  },
  assets?: {
    images?: Record<string, ImageAsset>,
    fonts?: Record<string, FontAsset>
  }
}
```

**Critical**: `root.children` MUST be a non-empty array for visible import.

---

## Next Steps Based on Findings

| Finding | Action |
|---------|--------|
| No console logs at all | Plugin not loaded → reload plugin in Figma |
| "No data received" | Extension issue → check extension console |
| "Decompression failed" | Handoff server issue → check compression format |
| "No root data" | Schema structure issue → check extension capture |
| childrenCount: 0 | DOM extraction issue → check extension filters |
| Import hangs | EnhancedFigmaImporter error → add try-catch logging |

---

## Emergency Workaround: Skip Compression

If decompression is the issue, modify handoff server to send uncompressed payloads:

In `handoff-server.cjs`, change:
```javascript
// FROM:
job.payload = { compressed: true, data: base64CompressedPayload }

// TO:
job.payload = schemaData  // Send raw uncompressed
```

Then reload both extension and plugin.
