# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTML to Figma is a three-part system that converts web pages into pixel-perfect, editable Figma designs:

1. **Chrome Extension** ([chrome-extension/](chrome-extension/)): Captures DOM structure, computed styles, assets, and interactive states from live web pages
2. **Figma Plugin** ([figma-plugin/](figma-plugin/)): Imports the captured JSON data and reconstructs it as native Figma nodes with Auto Layout, styles, and components
3. **Handoff Server** ([handoff-server.js](handoff-server.js)): Express server that queues capture jobs and coordinates data transfer between the extension/Puppeteer and the Figma plugin

## Build Commands

### Chrome Extension
```bash
cd chrome-extension
npm install
npm run build       # Production build
npm run watch       # Development build with watch mode
```

After building, load the unpacked extension from `chrome-extension/` directory in Chrome Developer Mode (chrome://extensions/).

### Figma Plugin
```bash
cd figma-plugin
npm install
npm run build       # Builds both plugin code and UI
npm run watch       # Watch mode for development
```

Load the plugin in Figma Desktop via Plugins → Development → Import plugin from manifest (select [manifest.json](figma-plugin/manifest.json)).

### Root-Level Utilities

From the project root:

```bash
npm run handoff-server    # Start the handoff server (required for data transfer)
npm run capture           # Run Puppeteer automated capture
npm run validate:pixels   # Compare screenshots for visual fidelity testing
```

## Architecture

### System Flow

The complete workflow involves three stages:

1. **Capture** – Chrome extension (live browser) or Puppeteer scripts (headless) extract DOM + computed styles
2. **Transfer** – Payload posted to handoff server queue at `http://127.0.0.1:4411/jobs`
3. **Import** – Figma plugin UI polls `/jobs/next` and imports the data

### Chrome Extension Architecture

The extension operates in three isolated JavaScript contexts that communicate via message passing:

1. **Content Script** ([content-script.ts](chrome-extension/src/content-script.ts)):
   - Injects the extraction script into the page
   - Acts as message relay between injected script and background
   - Sends progress updates to the popup UI
   - Handles chunked message passing to avoid Chrome's 32 MB message limit

2. **Injected Script** ([injected-script.ts](chrome-extension/src/injected-script.ts)):
   - Runs in the page's JavaScript context (full DOM access)
   - Orchestrates the extraction pipeline using specialized utilities
   - Produces the final `WebToFigmaSchema` JSON

3. **Background Service Worker** ([background.ts](chrome-extension/src/background.ts)):
   - Manages extension state and storage
   - Reassembles chunked payloads
   - Posts complete JSON to handoff server
   - Handles screenshot capture requests

4. **Popup UI** ([popup/](chrome-extension/src/popup/)):
   - User interface for configuring capture options
   - Displays capture progress and preview cards
   - Shows handoff server connection status (LED indicator)
   - Provides JSON download and direct Figma integration

### Extraction Pipeline

The injected script coordinates multiple specialized utilities in sequence:

1. **DOMExtractor** ([dom-extractor.ts](chrome-extension/src/utils/dom-extractor.ts)):
   - Recursively traverses the DOM tree
   - Extracts computed styles via `StyleParser`
   - Handles assets (images/SVGs) via `AssetHandler`
   - Determines Figma node types (FRAME, TEXT, RECTANGLE, IMAGE, VECTOR)
   - Generates semantic node names from HTML structure

2. **ComponentDetector** ([component-detector.ts](chrome-extension/src/utils/component-detector.ts)):
   - Detects repeated UI patterns (buttons, cards, inputs)
   - Groups similar elements into component definitions
   - Identifies component instances for Figma component system

3. **StateCapturer** ([state-capturer.ts](chrome-extension/src/utils/state-capturer.ts)):
   - Captures interactive states (hover, focus, active, disabled)
   - Programmatically triggers pseudo-states and re-extracts styles
   - Stores state variations for variant generation

4. **VariantsCollector** ([variants-collector.ts](chrome-extension/src/utils/variants-collector.ts)):
   - Aggregates captured states into variant sets
   - Prepares data for Figma's variant frames

### Handoff Server

The handoff server ([handoff-server.js](handoff-server.js)) is an Express server running on `http://127.0.0.1:4411` that:

- Queues capture jobs from the Chrome extension or Puppeteer scripts via `POST /jobs`
- Serves jobs to the Figma plugin via `GET /jobs/next` (with long polling)
- Enables the Figma plugin to automatically import new captures without manual file upload
- Logs all queue events for debugging

**Start the server before testing the full workflow:**
```bash
npm run handoff-server
```

**Remote `/capture` endpoint prerequisites**
- Build the injected extractor once via `cd chrome-extension && npm run build` so that `chrome-extension/dist/injected-script.js` exists (the server loads this file into Puppeteer).
- Ensure Puppeteer can launch Chromium. The default install downloads a bundled Chromium; alternatively set `PUPPETEER_EXECUTABLE_PATH` to a local Chrome/Chromium binary if downloads are blocked.
- The headless capture has a 90 s timeout and requires normal network access to the target URL.

### Puppeteer Automation

For headless capture and testing, several Puppeteer scripts are available:

- [puppeteer-auto-import.js](puppeteer-auto-import.js): Main automated capture script
- [complete-automated-workflow.js](complete-automated-workflow.js): Full end-to-end workflow
- Other `puppeteer-*.js` scripts: Various workflow variations

These scripts:
- Launch headless Chromium
- Navigate to target URLs
- Execute the same DOM extraction logic as the extension
- Post results directly to the handoff server

**Usage:**
```bash
npm run capture  # Uses puppeteer-auto-import.js
# OR
node puppeteer-auto-import.js https://example.com
```

### Data Schema

The central data contract between extension and plugin is `WebToFigmaSchema` ([types/schema.ts](chrome-extension/src/types/schema.ts)):

```typescript
{
  version: string;           // Schema version for compatibility
  metadata: PageMetadata;    // URL, title, viewport, fonts, capture options
  tree: ElementNode;         // Root node of the element tree
  assets: AssetRegistry;     // Images and SVGs with hashes
  styles: StyleRegistry;     // Reusable colors, text styles, effects
  components: ComponentRegistry; // Detected component definitions
  variants: VariantsRegistry;    // Interactive state variants
  yogaLayout?: YogaLayoutData;   // Optional Yoga flex layout data
}
```

**ElementNode** is the core building block:
- Contains Figma-compatible properties (layout, fills, strokes, effects, corner radius)
- Includes `autoLayout` data for Figma Auto Layout conversion
- Preserves HTML metadata (tag, classes, selectors) for reference
- Supports pseudo-elements (::before, ::after) as child nodes
- Recursive `children` array for tree structure

### Figma Plugin Architecture

The plugin ([figma-plugin/src/code.ts](figma-plugin/src/code.ts)) reconstructs Figma nodes from the schema:

1. **Font Loading**: Pre-loads required fonts from metadata (defaults to Inter family)
2. **Node Building**: Recursively creates Figma nodes via `buildNode()`:
   - Maps schema node types to Figma API node types
   - Converts web color models to Figma RGBA
   - Applies fills, strokes, effects, corner radius
   - Processes text with proper font loading
3. **Frame Organization**: Creates structured pages:
   - Main frame with pixel-perfect layout
   - Variants frame with interactive states
   - Components library frame
   - Design system page with styles
4. **Auto-Import**: Plugin UI polls handoff server and automatically imports when new data arrives

**Key modules:**
- [node-builder.ts](figma-plugin/src/node-builder.ts): Core Figma node creation logic
- [style-manager.ts](figma-plugin/src/style-manager.ts): Creates reusable Figma color/text styles
- [component-manager.ts](figma-plugin/src/component-manager.ts): Converts component definitions to Figma components
- [variants-frame-builder.ts](figma-plugin/src/variants-frame-builder.ts): Builds interactive variant frames
- [design-system-builder.ts](figma-plugin/src/design-system-builder.ts): Generates design system documentation page

## Key Technical Details

### Auto Layout Conversion

The extension analyzes CSS Flexbox/Grid properties and converts them to Figma Auto Layout:
- `display: flex` → `layoutMode: HORIZONTAL | VERTICAL`
- `justify-content` → `primaryAxisAlignItems`
- `align-items` → `counterAxisAlignItems`
- `gap` → `itemSpacing`
- CSS padding maps directly to Auto Layout padding

### Asset Handling

Images and SVGs are:
- Extracted with unique content-based hashes
- Stored as base64 in the JSON (for images)
- Stored as raw SVG code (for vectors)
- Referenced by hash in element nodes
- The Figma plugin creates image fills or vector nodes from these assets

### Style Deduplication

The `StyleRegistry` tracks:
- **Colors**: RGBA values with usage counts (for creating Figma color styles)
- **Text Styles**: Font family, weight, size, line height, letter spacing
- **Effects**: Drop shadows, inner shadows, blurs

Styles used frequently are converted to reusable Figma styles.

### Component Detection Algorithm

The ComponentDetector identifies components by:
1. Analyzing DOM structure similarity (same tag, classes, attributes)
2. Calculating visual similarity scores
3. Grouping elements with high similarity as component instances
4. Creating a base component definition from the first instance

### Yoga Layout Integration

For accurate flex layout positioning:
- [server/yoga-processor.js](server/yoga-processor.js) uses Facebook's Yoga layout engine
- Computes Auto Layout positions to mirror CSS flexbox inside Figma
- Optional - included in schema as `yogaLayout` field

### Build Output Structure

Chrome Extension builds to `chrome-extension/dist/`:
- `background.js` - Service worker
- `content-script.js` - Content script
- `injected-script.js` - Page context script
- `popup/` - Popup UI files

Figma Plugin compiles to `figma-plugin/dist/`:
- `code.js` - Main plugin code
- `ui.js` - Plugin UI (not currently used, auto-import is handled via polling)

## Development Workflow

### Full End-to-End Testing

1. **Start the handoff server:**
   ```bash
   npm run handoff-server
   ```

2. **Build and load the Chrome extension:**
   ```bash
   cd chrome-extension
   npm run watch  # Keep running in watch mode
   ```
   Then load the unpacked extension from `chrome-extension/` in chrome://extensions/

3. **Build and load the Figma plugin:**
   ```bash
   cd figma-plugin
   npm run watch  # Keep running in watch mode
   ```
   Then load the plugin in Figma Desktop

4. **Capture a page:**
   - Navigate to any web page (must be non-restricted URL)
   - Click extension icon → "Capture Page"
   - Wait for completion - handoff LED should turn green

5. **Verify auto-import in Figma:**
   - Plugin UI should detect the new job automatically
   - Import begins immediately
   - New page appears in Figma with the imported design

### Headless Testing

Instead of steps 4-5 above, use Puppeteer:
```bash
npm run capture
# OR
node puppeteer-auto-import.js https://example.com
```

The Figma plugin will still auto-import when it detects the job.

### Visual Fidelity Validation

Compare original webpage screenshots against Figma exports:

```bash
npm run validate:pixels -- \
  --baseline artifacts/source.png \
  --candidate artifacts/figma.png \
  --diff artifacts/diff.png \
  --threshold 0.1
```

Uses [pixelmatch](https://github.com/mapbox/pixelmatch) to generate diff heatmaps. See [docs/validation.md](docs/validation.md) for details.

## Important Constraints

- **Font Loading**: Figma requires fonts to be loaded before creating text nodes. The plugin attempts to load fonts from metadata but falls back to Inter if unavailable.
- **Circular References**: The DOMExtractor tracks processed elements to prevent infinite loops in circular DOM structures.
- **Message Size Limits**: Very large pages may exceed Chrome message size limits. The extension implements chunked message passing to handle this - the background worker reassembles chunks before posting to the handoff server.
- **Computed Styles**: All styles are extracted as computed values (px, rgba) rather than CSS variables or relative units.
- **Sandboxing**: The injected script has full page access but cannot use Chrome APIs directly - must communicate via content script.
- **Restricted URLs**: Chrome extensions cannot access `chrome://`, `chrome-extension://`, or similar restricted URLs. Test on regular HTTP/HTTPS sites.
- **Handoff Server**: Must be running on `localhost:4411` for the auto-import workflow. The Figma plugin manifest allows localhost network access specifically for this.

## Additional Documentation

- [docs/html-to-figma-architecture.md](docs/html-to-figma-architecture.md): Detailed architecture overview and validation steps
- [docs/validation.md](docs/validation.md): Visual fidelity testing guide
- [docs/html-to-figma-competitive-roadmap.md](docs/html-to-figma-competitive-roadmap.md): Feature roadmap and competitive analysis
