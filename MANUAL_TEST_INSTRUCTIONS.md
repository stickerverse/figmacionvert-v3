# Manual Test Instructions for Completion Dialog

## Quick Test Steps

Follow these steps to test if the completion dialog is working:

### 1. Reload Extension
1. Open `chrome://extensions/`
2. Find "Web to Figma Capture" extension
3. Click the reload button (🔄) to refresh the extension
4. Verify the extension shows "Errors" = 0

### 2. Start Handoff Server
```bash
cd /Users/skirk92/figmacionvert-2
npm run handoff-server
```
Keep this running in the background.

### 3. Test Page Capture

1. **Navigate to a test page**: Go to `https://example.com` (simple page for testing)

2. **Open extension popup**: Click the extension icon in Chrome toolbar

3. **Start capture**: Click "Capture Full Page" or the main capture button

4. **Watch for progress**: 
   - You should see capture progress in the popup
   - Console messages in Developer Tools (F12)

5. **Check for completion dialog**: 
   - After 30-60 seconds, a dialog should appear over the webpage
   - Dialog should have "Send to Figma Plugin" and "Download JSON" buttons

### 4. Debug If Dialog Doesn't Appear

If no dialog appears, check:

1. **Console Logs** (Press F12 → Console tab):
   ```
   Look for these messages:
   ✅ Extraction complete
   📋 About to show completion dialog
   ✅ Completion dialog should now be visible
   ```

2. **Check for DOM Elements**:
   In console, run:
   ```javascript
   document.getElementById('capture-completion-dialog')
   ```
   Should return an element or `null`

3. **Manual Dialog Test**:
   In console, run this to test dialog creation:
   ```javascript
   // Create test dialog manually
   const dialog = document.createElement('div');
   dialog.id = 'test-dialog';
   dialog.style.cssText = `
     position: fixed; top: 50%; left: 50%; 
     transform: translate(-50%, -50%);
     background: white; padding: 20px;
     border: 2px solid red; z-index: 9999999;
     border-radius: 8px;
   `;
   dialog.innerHTML = '<h3>TEST DIALOG</h3><p>If you see this, dialog creation works!</p>';
   document.body.appendChild(dialog);
   ```

### 5. Expected Console Output

When capture works correctly, you should see:
```
🌐 Content script loaded
🚀 Starting capture...
💉 Injecting script once for all viewports...
📸 Screenshot captured: yes
🌳 DOM extracted: yes
✅ Extraction complete
📋 About to show completion dialog for EXTRACTION_COMPLETE
✅ Completion dialog should now be visible (EXTRACTION_COMPLETE path)
```

### 6. Common Issues

**Issue**: Extension not loading
- **Solution**: Rebuild extension: `cd chrome-extension && npm run build`

**Issue**: "Chrome extension runtime NOT available"
- **Solution**: Make sure you clicked the extension icon first to inject content script

**Issue**: Dialog appears but "Send to Figma" is disabled
- **Solution**: This means capture data is missing tree structure - check console for warnings

**Issue**: No dialog at all
- **Solution**: Check if capture completed successfully - look for "Extraction complete" message

### 7. Test Results

Please report what you see:
1. ✅ Extension loaded successfully 
2. ✅ Capture started (progress messages)
3. ✅ Capture completed (✅ Extraction complete)
4. ❌ No dialog appeared / ✅ Dialog appeared
5. ❌ "Send to Figma" disabled / ✅ "Send to Figma" clickable

---

## Advanced Debug Commands

If basic test fails, try these in browser console:

```javascript
// Check if content script functions are available
typeof showCaptureCompletionDialog

// Force show dialog with test data
if (typeof showCaptureCompletionDialog === 'function') {
  showCaptureCompletionDialog(1, '5.0', {
    version: '2.0.0',
    tree: { id: 'test', type: 'FRAME', name: 'Test', children: [] },
    metadata: { url: 'test', title: 'Test' }
  });
}

// Check for existing dialogs
document.querySelectorAll('[id*="dialog"]')
```