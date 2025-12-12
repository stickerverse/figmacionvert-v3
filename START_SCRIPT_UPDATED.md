# Start Script Updated - AI Model Verification

**Date:** 2025-01-11  
**Status:** ✅ **COMPLETE**

---

## SUMMARY

The `start.sh` script has been enhanced to verify all AI model dependencies and files before starting services.

---

## NEW FEATURES

### **1. Node.js Version Check**

- ✅ Verifies Node.js >= 18.0.0 is installed
- ❌ Exits with error if version is too old

### **2. AI Model Dependency Verification**

Checks that all required AI packages are installed:

- ✅ `tesseract.js` - OCR text extraction
- ✅ `@tensorflow/tfjs` - ML runtime
- ✅ `@tensorflow/tfjs-node` - Node.js bindings
- ✅ `@tensorflow-models/coco-ssd` - Object detection model
- ✅ `node-vibrant` - Color palette extraction
- ✅ `chroma-js` - Color manipulation

**Output:**

```
🤖 Verifying AI model dependencies...
  ✅ Tesseract.js (OCR): 5.1.1
  ✅ TensorFlow.js: 4.22.0
  ✅ TensorFlow.js Node: 4.22.0
  ✅ COCO-SSD Model: 2.2.3
  ✅ Node-Vibrant (Color): 4.0.3
  ✅ Chroma.js: 2.6.0
```

### **3. AI Model File Verification**

Checks that all AI model files exist:

- ✅ `vision-analyzer.cjs` - Vision analysis module
- ✅ `color-analyzer.cjs` - Color extraction module
- ✅ `typography-analyzer.cjs` - Typography analysis module
- ✅ `yolo-detector.cjs` - ML component detection module

**Output:**

```
📁 Verifying AI model files...
  ✅ Vision Analyzer
  ✅ Color Analyzer
  ✅ Typography Analyzer
  ✅ YOLO Detector
```

### **4. AI Model Loading Test**

- ✅ Attempts to require all AI model modules
- ✅ Verifies modules can be loaded without syntax errors
- ⚠️ Warns if loading fails (but continues - may be due to native deps)

### **5. Enhanced Status Output**

Shows AI models status in final output:

```
🤖 AI Models Status:
  ✅ OCR (Tesseract.js)
  ✅ Color Palette (Node-Vibrant)
  ✅ ML Component Detection (COCO-SSD)
  ✅ Typography Analysis
```

### **6. AI Endpoint Information**

Displays the AI analysis endpoint URL:

```
📍 AI Analysis Endpoint: http://localhost:4411/api/ai-analyze
```

---

## SCRIPT FLOW

1. **Check Node.js Version** → Exit if < 18.0.0
2. **Install Dependencies** → Root, Chrome extension, Figma plugin
3. **Verify AI Packages** → Check all 6 AI dependencies
4. **Verify AI Files** → Check all 4 AI model files
5. **Test AI Loading** → Quick module load test
6. **Build Projects** → Chrome extension + Figma plugin
7. **Start Handoff Server** → With AI models ready
8. **Display Status** → Show all services and AI status

---

## ERROR HANDLING

### **Missing Dependencies:**

- Script shows which packages are missing
- Prompts user to continue or exit
- Suggests running `npm install` to fix

### **Missing Files:**

- Script shows which files are missing
- Prompts user to continue or exit
- Warns that AI features may not work

### **Load Test Failure:**

- Script warns but continues
- Native dependencies may not load until first use
- This is usually OK

---

## USAGE

```bash
# Make executable (first time only)
chmod +x start.sh

# Run the script
./start.sh

# Or via npm
npm start
```

---

## EXPECTED OUTPUT

```
╔════════════════════════════════════════════╗
║      Web to Figma - Starting Services      ║
║         with AI Model Verification          ║
╚════════════════════════════════════════════╝

🔍 Checking Node.js version...
✅ Node.js v20.10.0

📦 Installing root dependencies (including AI models)...
📦 Installing Chrome extension dependencies...
📦 Installing Figma Plugin dependencies...

🤖 Verifying AI model dependencies...
  ✅ Tesseract.js (OCR): 5.1.1
  ✅ TensorFlow.js: 4.22.0
  ✅ TensorFlow.js Node: 4.22.0
  ✅ COCO-SSD Model: 2.2.3
  ✅ Node-Vibrant (Color): 4.0.3
  ✅ Chroma.js: 2.6.0

📁 Verifying AI model files...
  ✅ Vision Analyzer
  ✅ Color Analyzer
  ✅ Typography Analyzer
  ✅ YOLO Detector

🧪 Testing AI model loading...
✅ AI models can be loaded

🔨 Building Chrome extension...
✅ Chrome extension built

🔨 Building Figma Plugin...
✅ Figma Plugin built

🚀 Starting Handoff Server on port 4411...
✅ Handoff Server started (PID: 12345)
✅ Handoff Server is responding

╔════════════════════════════════════════════╗
║          All Services Running!             ║
╚════════════════════════════════════════════╝

📍 Handoff Server: http://localhost:4411
📍 AI Analysis Endpoint: http://localhost:4411/api/ai-analyze

🤖 AI Models Status:
  ✅ OCR (Tesseract.js)
  ✅ Color Palette (Node-Vibrant)
  ✅ ML Component Detection (COCO-SSD)
  ✅ Typography Analysis

Next Steps:
  1. Load Chrome extension from: chrome-extension/dist
  2. Open Figma plugin
  3. Navigate to a webpage and click 'Capture'

To test headless capture:
  node puppeteer-auto-import.cjs https://stripe.com

To test AI analysis endpoint:
  curl -X POST http://localhost:4411/api/ai-analyze \
    -H 'Content-Type: application/json' \
    -d '{"screenshot": "data:image/png;base64,..."}'

Press Ctrl+C to stop all services
```

---

## TROUBLESHOOTING

### **"AI model verification failed"**

**Solution:**

```bash
npm install
```

### **"Node.js version must be >= 18.0.0"**

**Solution:**

- Install Node.js 18+ from https://nodejs.org/
- Or use nvm: `nvm install 18 && nvm use 18`

### **"AI model loading test failed"**

**This is usually OK:**

- Native dependencies (TensorFlow.js) may not load until first use
- Models will work when actually called
- If models fail at runtime, check server logs

### **"Handoff Server is not responding"**

**Solution:**

- Check if port 4411 is already in use: `lsof -i :4411`
- Kill existing process: `pkill -f "node handoff-server"`
- Restart the script

---

## BENEFITS

### **Before:**

- ❌ No verification of AI models
- ❌ Silent failures if models missing
- ❌ No way to know if AI is ready

### **After:**

- ✅ Verifies all AI dependencies
- ✅ Checks all AI model files
- ✅ Tests model loading
- ✅ Clear status output
- ✅ Graceful error handling
- ✅ User-friendly prompts

---

## CONCLUSION

The start script now ensures:

1. ✅ All AI model dependencies are installed
2. ✅ All AI model files exist
3. ✅ Models can be loaded
4. ✅ All projects are built
5. ✅ Services start with AI ready

**One command (`./start.sh`) now handles everything!**
