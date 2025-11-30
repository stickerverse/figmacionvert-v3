---
description: Initialize and start the Web to Figma project
---

# Initialize Web to Figma Project

This workflow initializes the complete Web to Figma development environment, including the Chrome Extension, Figma Plugin, and Capture Service.

## Prerequisites

Before running this workflow, ensure you have:
- Node.js (v16 or higher)
- npm or yarn
- Chrome browser
- Figma desktop app

## Steps

### 1. Verify Project Structure

First, confirm that you have all three main components:
- `chrome-extension/` - Chrome extension for capturing web pages
- `figma-plugin/` - Figma plugin for importing captured designs
- `capture-service/` - Backend service for managing data transfer

### 2. Install Chrome Extension Dependencies

Navigate to the Chrome extension directory and install dependencies:
```bash
cd chrome-extension
npm install
```

### 3. Build Chrome Extension

Build the extension for development:
```bash
npm run build
# or for watch mode during development:
npm run dev
```

### 4. Install Figma Plugin Dependencies

Navigate to the Figma plugin directory and install dependencies:
```bash
cd ../figma-plugin
npm install
```

### 5. Build Figma Plugin

Build the plugin:
```bash
npm run build
# or for watch mode:
npm run dev
```

### 6. Install Capture Service Dependencies

Navigate to the capture service directory and install dependencies:
```bash
cd ../capture-service
npm install
```

### 7. Start Capture Service

// turbo
Start the capture service (typically runs on port 5511):
```bash
npm run dev
```

### 8. Load Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `chrome-extension/dist` directory

### 9. Load Figma Plugin

1. Open Figma desktop app
2. Go to Plugins → Development → Import plugin from manifest
3. Select the `figma-plugin/manifest.json` file

### 10. Verify Connections

1. Open the Chrome extension popup and check connection status
2. Run the Figma plugin and verify:
   - Server connection light is green
   - Extension connection light is green
3. Navigate to any webpage and try capturing to ensure the full pipeline works

## Troubleshooting

- **Extension not loading**: Check that you selected the `dist` folder, not the root folder
- **Figma plugin errors**: Ensure you're using Figma desktop app, not browser version
- **Connection issues**: Verify the capture service is running on the expected port (check console logs)
- **Build errors**: Clear `node_modules` and reinstall dependencies

## Development Tips

- Keep all three dev servers running in separate terminals
- Use watch mode (`npm run dev`) for hot-reloading during development
- Check browser console and Figma plugin console for debugging info
