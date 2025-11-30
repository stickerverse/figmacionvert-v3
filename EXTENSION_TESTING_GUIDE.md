# 🧪 Chrome Extension Testing Guide

## Quick Start Testing

### Step 1: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder
5. Verify the extension appears in the extensions list

### Step 2: Open Test Page

1. Open the test page: `file:///Users/skirk92/figmacionvert-2/test-extension-progress.html`
2. Open Developer Tools (`F12` or `Cmd+Option+I`)
3. Go to the **Console** tab

### Step 3: Run Pre-Test Verification

In the console, run the test script:
```javascript
// Copy and paste this into the console:
fetch('/Users/skirk92/figmacionvert-2/test-extension.js')
  .then(response => response.text())
  .then(script => eval(script))
  .catch(err => console.log('Could not load test script:', err));
```

Or manually run tests:
```javascript
// Test 1: Check if extension functions are loaded
console.log('extractPageToSchema available:', typeof window.extractPageToSchema);
console.log('extractPageToFigmaAPI available:', typeof window.extractPageToFigmaAPI);
console.log('convertToFigmaAPI available:', typeof window.convertToFigmaAPI);

// Test 2: Check page elements
console.log('Total DOM elements:', document.querySelectorAll('*').length);
```

### Step 4: Test Progress Reporting

1. **Click the extension icon** in the Chrome toolbar
2. **Click "Capture Page"** in the popup
3. **Watch the progress carefully** - it should:
   - Start at 0%
   - Progress through different stages
   - Show step-by-step messages
   - Reach 100% completion

### Step 5: Monitor Console Output

You should see detailed logging like:
```
🎯 Starting enhanced extraction with page scrolling...
📍 Starting Step 1: Page scrolling
✅ Step 1 complete: Page scrolling finished
📍 Starting Step 2: DOM tree extraction
📊 DOMExtractor progress: 15% - Starting main DOM extraction...
📊 DOMExtractor progress: 45% - Processing elements...
📊 DOMExtractor progress: 75% - Extracting styles...
✅ Step 2 complete: Main DOM extraction finished
```

## Expected Behavior

### ✅ Success Indicators

- **Progress advances from 0% to 100%**
- **Step-by-step console logging appears**
- **No errors in console**
- **Completion dialog appears**
- **Option to "Send to Figma" or "Download JSON"**

### ❌ Failure Indicators

- **Progress stays at 0%**
- **No console logging appears**
- **JavaScript errors in console**
- **Extension popup shows error**
- **Page refreshes unexpectedly**

## Troubleshooting

### Issue: Progress stays at 0%

**Check:**
1. Console for error messages
2. Extension popup shows progress bar
3. Network tab for failed requests
4. Extension reloaded after latest build

**Solutions:**
1. Rebuild extension: `cd chrome-extension && npm run build`
2. Reload extension in `chrome://extensions/`
3. Hard refresh test page (`Ctrl+Shift+R`)

### Issue: Extension not loading

**Check:**
1. Extension appears in `chrome://extensions/`
2. Extension is enabled
3. No errors shown in extensions page
4. Manifest.json is valid

**Solutions:**
1. Verify build completed: check `dist/` folder exists
2. Reload extension
3. Check browser console for permission errors

### Issue: Functions not available

**Check:**
1. `dist/injected-script.js` file exists and is recent
2. Content Security Policy allows script injection
3. Page is not a restricted URL (chrome://, file:// may have restrictions)

**Solutions:**
1. Test on `http://localhost` instead of `file://`
2. Check extension manifest permissions
3. Verify script injection in content-script.ts

## Advanced Testing

### Test on Different Page Types

1. **Simple static page** (like our test page)
2. **Complex SPA** (like React/Vue app)
3. **E-commerce site** (like Amazon product page)
4. **News site** (like CNN article)
5. **Social media** (like Twitter feed)

### Performance Testing

Monitor these metrics:
- **Extraction time** (should be under 30 seconds)
- **Memory usage** (check Task Manager)
- **JSON file size** (should be reasonable, < 50MB)
- **Browser responsiveness** (page shouldn't freeze)

### Browser Compatibility

Test on:
- **Chrome** (latest version)
- **Edge** (Chromium-based)
- **Brave** (if needed)

## Debug Commands

### Manual Progress Test
```javascript
// Simulate progress reporting
window.postMessage({
  type: 'EXTRACTION_PROGRESS', 
  phase: 'test', 
  message: 'Testing progress...', 
  percent: 50
}, '*');
```

### Manual Extraction Test
```javascript
// Test basic extraction
if (typeof window.extractPageToSchema === 'function') {
  console.log('🧪 Testing manual extraction...');
  window.extractPageToSchema()
    .then(result => console.log('✅ Extraction successful:', result))
    .catch(error => console.error('❌ Extraction failed:', error));
}
```

### Check Extension State
```javascript
// Verify extension components
console.log('Extension state check:');
console.log('- DOMExtractor:', typeof window.DOMExtractor);
console.log('- NavigationGuard:', window.NavigationGuard ? 'loaded' : 'not loaded');
console.log('- Progress callbacks:', typeof window.postMessage);
```

## Success Criteria

The extension passes testing if:

- ✅ Progress reporting shows 0% → 100% advancement
- ✅ Console shows detailed step-by-step logging
- ✅ No JavaScript errors occur during extraction
- ✅ Completion dialog appears with options
- ✅ JSON output is generated successfully
- ✅ Navigation blocking prevents page refresh
- ✅ Extension works on multiple page types

## Next Steps After Testing

1. **If tests pass:** Extension is ready for production use
2. **If tests fail:** Check console errors and refer to troubleshooting section
3. **For further development:** Use test results to identify areas for improvement

---

**Note:** This testing guide verifies that the 0% progress issue has been resolved through the systematic fixes implemented in the extraction pipeline.