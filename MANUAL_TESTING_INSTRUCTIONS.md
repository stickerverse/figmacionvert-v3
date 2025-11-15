# Manual Testing Instructions - Enhanced Figma Plugin

## 🎯 **Issue Diagnosis**

The automated import isn't working, but this could be due to:
1. Figma plugin not loaded in Figma Desktop
2. Plugin polling but not processing jobs correctly
3. Enhanced importer encountering runtime errors

## 📋 **Manual Testing Steps**

### Step 1: Load the Plugin in Figma Desktop

1. **Open Figma Desktop** (not web version)
2. **Go to Plugins → Development → Import plugin from manifest**
3. **Select**: `/Users/skirk92/figmacionvert-2/figma-plugin/manifest.json`
4. **Run the plugin** from Plugins menu

### Step 2: Check Plugin Console

1. **Open Developer Console** in Figma Desktop (Help → Developer Console)
2. **Look for any errors** related to our enhanced importer
3. **Check for polling messages** - should see regular health check calls

### Step 3: Manual Import Test

If auto-import isn't working, test manual import:

1. **Copy the JSON data** from: `/Users/skirk92/figmacionvert-2/enhanced-test-1762741526356.json`
2. **In plugin UI**, look for manual import option
3. **Paste the JSON** and trigger import manually
4. **Watch console** for enhanced import logs:
   - "🚀 Starting enhanced import V2..."
   - "📐 Import verification:"
   - Position accuracy results

### Step 4: Check for Enhanced Features

If import works, verify enhanced features:

1. **Check positioning accuracy**:
   - Elements should be pixel-perfect aligned
   - No sub-pixel positioning

2. **Check console logs**:
   ```
   📐 Import verification: {
     totalElements: 58,
     withinTolerance: X,
     outsideTolerance: X,
     maxDeviation: "X.XXpx",
     averageDeviation: "X.XXpx"
   }
   ```

3. **Check Figma notification**:
   - Should show accuracy results
   - "✅ Import complete with pixel-perfect accuracy!" or
   - "⚠️ Import complete with X position mismatches"

## 🔧 **Debugging Common Issues**

### Issue 1: Plugin Won't Load
- **Check manifest.json** is valid
- **Verify build output** exists in `dist/code.js`
- **Look for security errors** in console

### Issue 2: Import Fails
- **Check for enhanced importer errors**
- **Verify schema format** is correct
- **Look for font loading issues**

### Issue 3: Auto-Import Not Working
- **Check server polling** in console
- **Verify handoff server** is running on port 4411
- **Check plugin polling status** in telemetry

## 📊 **Expected Results**

With our enhanced features, you should see:

### 1. Enhanced Console Output
```
🚀 Starting enhanced import V2 with schema: {
  version: "2.0.0",
  treeNodes: "present", 
  assets: 0,
  metadata: "present"
}

✅ Starting enhanced import process...
✅ Enhanced import process completed successfully

📐 Import verification: {
  totalElements: 58,
  withinTolerance: 58,
  outsideTolerance: 0,
  maxDeviation: "0.00px",
  averageDeviation: "0.00px"
}
```

### 2. Figma Notification
- Success message with accuracy metrics
- Import statistics showing processed elements

### 3. Page Structure
- Main frame containing all elements
- Proper Auto Layout where applicable
- Accurate positioning and sizing

## 🚨 **If Manual Import Also Fails**

Check these potential issues in console:

1. **Security errors**: "import expression rejected" or "process is not defined"
2. **Font errors**: Failed to load required fonts
3. **Asset errors**: Image processing failures
4. **Schema errors**: Invalid data structure

## 📞 **Next Steps**

Please try the manual testing and let me know:

1. **Can you load the plugin?** (Any errors in console?)
2. **Does manual import work?** (Copy/paste JSON method)
3. **What console output do you see?** (Enhanced import logs)
4. **Any error messages?** (Security, font, or asset errors)

This will help identify whether the issue is:
- **Auto-import polling** (server communication)
- **Enhanced importer logic** (our new code)  
- **Figma compatibility** (security or API issues)

Based on your feedback, I can provide targeted fixes!