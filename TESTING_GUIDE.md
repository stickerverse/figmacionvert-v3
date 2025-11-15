# 🧪 Complete Testing Guide - HTML to Figma

## ✅ **Pre-Flight Checklist**

All components are built and ready:
- ✅ Cloud Backend: `https://capture-service-sandy.vercel.app`
- ✅ Chrome Extension: `chrome-extension/dist/`
- ✅ Figma Plugin: `figma-plugin/dist/code.js`

---

## **Step 1: Load Chrome Extension**

### Install in Chrome:
1. Open Chrome browser
2. Navigate to: `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select folder: `/Users/skirk92/figmacionvert-2/chrome-extension/`
6. Verify extension appears with icon

### Verify Installation:
- Extension icon should appear in Chrome toolbar
- Click icon → popup should open
- Check for "Cloud Service" connection indicator (should show "Checking service...")

---

## **Step 2: Load Figma Plugin**

### Install in Figma Desktop:
1. Open Figma Desktop app (NOT browser version)
2. Click **Plugins** menu → **Development** → **Import plugin from manifest**
3. Navigate to: `/Users/skirk92/figmacionvert-2/figma-plugin/manifest.json`
4. Click **Open**

### Verify Installation:
- Plugin should appear in: Plugins → Development → "Web to Figma"
- If you see it, installation succeeded

---

## **Step 3: Test End-to-End Workflow**

### 3A. Capture a Website

1. **Navigate to a test website** in Chrome
   - Recommended: `https://stripe.com` (simple, clean design)
   - Alternative: `https://example.com` (minimal test)

2. **Click the Chrome extension icon**
   - Popup window opens

3. **Click "Capture Page" button**
   - Progress indicator appears
   - Wait 5-10 seconds for capture
   - Cloud Service LED should turn green
   - Console log (F12) should show: `📦 Sending payload to cloud service`

4. **Verify Capture Success**
   - Extension should show completion message
   - Check browser console for: `✅ Job sent to cloud service`

### 3B. Import to Figma

1. **Open Figma Desktop**
   - Create new file or open existing file

2. **Run the plugin**
   - Plugins → Development → "Web to Figma"
   - Plugin UI opens

3. **Auto-Import (Automatic)**
   - Plugin polls every 2.5 seconds
   - Should detect the capture automatically
   - Status changes to "Importing job..."
   - New page appears in Figma with imported design

4. **Verify Import Success**
   - Check Figma layers panel
   - You should see frames matching the website structure
   - Images should be loaded
   - Text should be readable

---

## **Step 4: Troubleshooting**

### Extension Issues

**Problem: Extension won't capture**
- Check console (F12) for errors
- Verify you're NOT on restricted URL (chrome://, chrome-extension://)
- Try simpler site like https://example.com

**Problem: "Cloud service offline"**
- Check: https://capture-service-sandy.vercel.app/health
- Should return: `{"status":"ok"}`
- If offline, notify me

### Figma Plugin Issues

**Problem: Plugin doesn't auto-import**
- Check Figma console: Plugins → Development → "Open Console"
- Look for polling messages
- Verify plugin is connected to cloud service

**Problem: Import fails with error**
- Check console for error message
- Verify schema format is correct
- Try capturing smaller/simpler page

### Backend Issues

**Check Cloud Service Status:**
```bash
curl https://capture-service-sandy.vercel.app/health
# Should return: {"status":"ok","version":"1.0.0",...}
```

**Check Job Queue:**
```bash
curl https://capture-service-sandy.vercel.app/api/jobs/next
# Returns: HTTP 204 (no jobs) or job data
```

---

## **Step 5: Expected Results**

### Successful Capture:
- ✅ Extension shows green checkmark
- ✅ Console log: "Job sent to cloud service"
- ✅ Cloud service queues the job

### Successful Import:
- ✅ Plugin detects job within 2.5 seconds
- ✅ New Figma page created
- ✅ Frames match website layout
- ✅ Images are loaded
- ✅ Text is readable

---

## **Advanced Testing**

### Test Different Websites:
- Simple: https://example.com
- Medium: https://stripe.com
- Complex: https://github.com
- Very Complex: https://amazon.com (may be slow)

### Monitor Cloud Logs:
```bash
# Watch real-time logs
vercel logs https://capture-service-sandy.vercel.app --follow
```

### Clear Job Queue:
The queue resets automatically on Vercel cold starts (~15 min inactivity).
To force reset: just wait 15 minutes or trigger a new deployment.

---

## **Quick Test Commands**

### Verify All Services:
```bash
# Backend health
curl https://capture-service-sandy.vercel.app/health

# Check if extension is loaded
chrome://extensions/

# Check if plugin is loaded
# In Figma: Plugins → Development → should see "Web to Figma"
```

---

## **Success Criteria**

You know it's working when:
1. ✅ Extension captures page without errors
2. ✅ Backend receives and queues the job
3. ✅ Figma plugin polls and detects the job
4. ✅ Import completes with visible frames in Figma
5. ✅ Images and text render correctly

---

## **Need Help?**

If testing fails:
1. Check console logs (both Chrome and Figma)
2. Verify cloud service is running
3. Try simpler test page (example.com)
4. Share error messages with me

**Ready to test? Follow the steps above!** 🚀
