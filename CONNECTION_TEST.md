# Testing the Chrome Extension → Figma Flow

## Connection Status: ✅ CONNECTED

The handoff server is running and both the Chrome extension and Figma plugin are successfully communicating with it:

- Extension heartbeat: Active
- Plugin polling: Active
- Queue: Empty (ready for jobs)

## The Problem

No data is being sent from Chrome to the handoff server. When you click "Capture" in the Chrome extension, it should:

1. Extract the DOM
2. Send it to `http://localhost:4411/api/jobs`
3. Figma plugin polls and receives it

## Test Steps

### 1. Open Chrome Extension

- Load test page in Chrome
- Open the extension popup
- Look for capture button

### 2. Capture a Page

- Click "Capture & Send to Figma"
- Check the extension console (right-click extension → Inspect)
- Look for messages like:
  - "Starting extraction"
  - "Sending to handoff server"
  - Any errors

### 3. Check What Happens

**Expected**: Data appears in Figma within 2-3 seconds

**If nothing happens**: The capture is failing or not being sent

## Debug Commands

Check if jobs are being queued:

```bash
curl http://localhost:4411/api/health
```

Manually send test data:

```bash
curl -X POST http://localhost:4411/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "tree": {"type": "FRAME", "name": "Test", "children": []}}'
```

## Next Steps

1. **Reload Chrome extension**: chrome://extensions → click reload
2. **Test capture on**: `file:///Users/skirk92/figmacionvert-2/test-simple.html`
3. **Report what you see** in:
   - Chrome extension popup (any error messages?)
   - Chrome extension console (Inspect → Console tab)
   - Figma (does anything appear?)
