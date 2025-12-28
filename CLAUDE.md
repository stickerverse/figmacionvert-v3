# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

BlueprintAI is a web-to-Figma conversion system that captures any webpage and imports it as editable Figma designs with pixel-perfect fidelity. The system consists of three components working together:

1. **Chrome Extension** (`chrome-extension/`) - Browser-based DOM, style, and asset capture
2. **Handoff Server** (`handoff-server.cjs`) - Local coordination server on port 4411
3. **Figma Plugin** (`figma-plugin/`) - Imports captured designs with Auto Layout solving

All three components share a single schema: `shared/schema.ts` (`WebToFigmaSchema`)

---

## Development Commands

### Installation & Setup
```bash
# Install all dependencies (root + extension + plugin)
npm run install:all

# Start handoff server
./start.sh                  # With AI model verification
node handoff-server.cjs     # Basic start (no verification)
```

### Building
```bash
# Build everything (required after schema changes)
npm run build:all

# Build individual components
npm run build:extension     # Webpack → chrome-extension/dist/
npm run build:plugin        # esbuild → figma-plugin/dist/code.js

# Watch mode (during development)
cd chrome-extension && npm run watch
cd figma-plugin && npm run watch
```

### Loading & Testing
```bash
# Extension: chrome://extensions → Load unpacked → chrome-extension/dist/
# Plugin: Figma Desktop → Plugins → Import from manifest → figma-plugin/manifest.json

# Validation tools
npm run validate:pixels     # Pixel-diff comparison
npm run validate:schema     # Schema validation
npm run verify-models       # AI model verification
```

---

## Critical Architecture Concepts

### 1. Schema as Single Source of Truth

**File**: `shared/schema.ts`

This TypeScript file defines ALL data structures shared between extension, server, and plugin. Changes to this file require rebuilding BOTH extension and plugin:

```bash
npm run build:all  # REQUIRED after any schema changes
```

Key types:
- `WebToFigmaSchema` - Main capture payload
- `AnalyzedNode` - Per-element data with geometry, styles, transforms
- `LayoutHints` - Auto Layout inference metadata
- `Tokens` - Design token extraction

**IMPORTANT**: The schema must maintain backward compatibility. Only add optional fields; never remove or rename existing fields.

### 2. Port 4411 is Hardcoded

The handoff server MUST run on `localhost:4411`. This port is hardcoded in:
- Extension background script
- Plugin polling logic
- Multiple test scripts

**Do not change this port** without updating all three components.

### 3. Pixel-Perfect Fidelity Phases

The system implements pixel-perfect rendering through sequential enhancement phases:

**Phase 1**: Intrinsic Image Size - Captures natural image dimensions for correct scaling
**Phase 2**: Importer Mapping - Maps schema fields to Figma API correctly
**Phase 3**: CSS Transforms - Applies absolute transform matrices for rotated/scaled elements
**Phase 4**: CSS Filters & Blend Modes - Maps or marks for rasterization
**Phase 5**: Rasterization Fallback - Captures unmappable features as native screenshots

#### "Map or Rasterize" Policy

If a CSS visual feature cannot be expressed **exactly** with the Figma Plugin API, the system MUST rasterize that element instead of approximating:

- Representable features → Map to native Figma properties
- Non-representable features → Capture native browser screenshot → Convert to ImagePaint

**Primary capture method**: `chrome.tabs.captureVisibleTab` (native browser screenshot)
**Fallback**: SVG foreignObject rendering (best-effort, not pixel-perfect)

### 4. Build System Architecture

**Extension**: Webpack 5 with TypeScript
- Entry points: `background.ts`, `content-script.ts`, `injected-script.ts`, `popup-new.ts`
- Output: `chrome-extension/dist/` (bundles + manifest)
- Manifest V3 with service worker

**Plugin**: esbuild with CommonJS
- Entry: `code.ts`
- Output: `figma-plugin/dist/code.js` (single bundle)
- Platform: node, Target: ES6
- Externalizes: worker_threads, child_process, fs, path

**Watch mode caveats**:
- Webpack watch may miss some TypeScript errors
- Always run full `npm run build` before testing critical changes

### 5. Import Pipeline Critical Ordering

**File**: `figma-plugin/src/node-builder.ts`

The node build pipeline MUST execute in this exact order to prevent "white blank frame" failures:

1. Create node (Frame/Rectangle/Text)
2. Parent to container
3. Resize to dimensions
4. **Phase 3**: Apply pixel-perfect transform matrix (`applyPixelPerfectTransform`)
5. **Phase 4**: Apply CSS filters and blend modes (`applyCssFiltersAndBlend`)
6. **Phase 5**: Apply rasterization fallback (`applyRasterization`)
7. Apply fills/strokes/effects
8. Apply Auto Layout (if enabled)
9. Process children recursively

**Critical bug pattern**: Early `return` statements after transform application abort the pipeline before fills/effects/children are processed, causing blank frames.

### 6. Element Screenshot Capture Hierarchy

**File**: `chrome-extension/src/utils/element-screenshot.ts`

For Phase 5 rasterization, the capture priority is:

1. **PRIMARY**: `captureElementViaTabCapture()` - Native browser screenshot via `chrome.tabs.captureVisibleTab`
   - Pixel-perfect capture of exactly what user sees
   - Includes: fonts, cross-origin images, filters, blends, transforms, pseudo-elements, videos/canvas
   - Requires: 'activeTab' permission (already in manifest.json)

2. **FALLBACK**: `captureElementViaForeignObject()` - SVG foreignObject rendering
   - Best-effort synthetic re-render
   - Known limitations: CORS fonts, cross-origin images, compositing differences, videos/WebGL

3. **VALIDATION**: `validateCaptureResult()` - Detects failed/suspicious captures
   - Checks data URL format and size
   - Compares capture size to element dimensions
   - Prevents silent failures from entering pipeline

### 7. Hierarchy Inference Engine

**Location**: `figma-plugin/src/hierarchy-inference/`

Advanced 35KB algorithm that converts flat DOM structures into proper Figma frame hierarchies:

- `inference-engine.ts` - Spatial analysis and layout pattern recognition
- `preprocessor.ts` - Normalizes layout data
- `converter.ts` - Converts inferred structure to layout hints

Critical for converting web pages with implicit container relationships into explicit Figma nesting.

### 8. Layout Solver (CSS → Auto Layout)

**File**: `figma-plugin/src/layout-solver.ts`

Converts CSS layout properties to Figma Auto Layout:
- Detects flexbox/grid containers
- Maps `flex-direction` → `layoutMode` (HORIZONTAL/VERTICAL)
- Extracts gap, padding, alignment properties
- Falls back to absolute positioning when Auto Layout not applicable

**Important**: Auto Layout application is controlled by `options.applyAutoLayout` flag. When disabled, nodes use absolute positioning but preserve layout metadata for debugging.

---

## Common Failure Modes & Prevention

### "White Blank Frame" Symptom

**Cause**: Early `return` in node builder pipeline before fills/effects/children processed

**Prevention checklist**:
1. Search codebase for `return` statements in node builder
2. Verify all returns occur AFTER fills/strokes/effects application
3. Use flag-based approach to skip alternate paths without aborting
4. Never return immediately after transform application

**Debugging**: Check Figma plugin console for node creation logs - if transform applied but no "applied fills" log follows, early return occurred.

### Schema Validation Failures

**Cause**: Extension and plugin using different schema versions after schema modification

**Prevention**:
```bash
# After ANY change to shared/schema.ts:
npm run build:all
npm run validate:schema
```

**Debugging**: Check both extension and plugin are loading from `dist/` directories, not source files.

### Port 4411 Conflicts

**Cause**: Previous server process still running

**Fix**:
```bash
lsof -ti:4411 | xargs kill -9
./start.sh
```

### Rasterization Capture Failures

**Causes**:
- `chrome.tabs.captureVisibleTab` permission denied
- Element scrolled out of viewport
- Cross-origin iframe restrictions
- Browser security policies

**Detection**: Check console for `[PHASE 5]` logs:
- `✅ Native screenshot capture successful` - working correctly
- `⚠️ ForeignObject fallback successful` - native failed, using fallback
- `❌ All capture methods failed` - rasterization unavailable

---

## File Organization & Key Files

### Extension Core
- `/src/background.ts` - Service worker, handles `CAPTURE_VISIBLE_TAB` messages
- `/src/content-script.ts` - Page-level capture coordination
- `/src/injected-script.ts` - Access to page JavaScript context
- `/src/utils/dom-extractor.ts` - Main DOM traversal and extraction (10,600+ lines)
- `/src/utils/element-screenshot.ts` - Rasterization capture with fallback hierarchy
- `/src/high-fidelity-capture.ts` - Orchestrates full capture flow

### Plugin Core
- `/src/code.ts` - Plugin entry point
- `/src/enhanced-figma-importer.ts` - Import orchestration (126KB, main import logic)
- `/src/node-builder.ts` - Schema → Figma nodes (258KB, critical build pipeline)
- `/src/layout-solver.ts` - CSS → Auto Layout conversion
- `/src/utils/css-filter-parser.ts` - Phase 4 filter parsing for rasterization decisions

### Shared
- `/shared/schema.ts` - Single source of truth for all types

### Server
- `/handoff-server.cjs` - Express server on port 4411 with job queue

### Validation Tools
- `/tools/validation/fidelity-audit.mjs` - Schema fidelity scoring
- `/tools/validation/pixel-perfect-regression.mjs` - Per-node validation
- `/tools/validation/schema-guardrails.js` - Schema structure validation

---

## Testing & Validation Workflow

### Before Committing

1. **Build everything**:
   ```bash
   npm run build:all
   ```

2. **Validate schema**:
   ```bash
   npm run validate:schema
   ```

3. **Test extension mode**:
   - Reload extension in chrome://extensions
   - Navigate to test page
   - Capture and verify no console errors

4. **Test plugin import**:
   - Reload plugin in Figma
   - Verify import completes without "white blank frames"
   - Check plugin console for Phase 1-5 logs

5. **Run fidelity audit** (if available):
   ```bash
   node tools/validation/fidelity-audit.mjs page-capture-NEW.json
   ```

### Verifying Pixel-Perfect Phases

Each phase has distinct console signatures:

**Phase 1** (Intrinsic Size):
```
[IMAGE] Using intrinsic size: 800x600
```

**Phase 3** (Transforms):
```
[PHASE 3] Applying absoluteTransform matrix
```

**Phase 4** (Filters/Blends):
```
[PHASE 4] Applying blur filter: 5px
[PHASE 4] Applied blend mode: MULTIPLY
```

**Phase 5** (Rasterization):
```
[PHASE 5] Rasterizing node due to: FILTER
[PHASE 5] ✅ Applied rasterization screenshot
```

---

## Important Constraints

- **Node 18+** required (native dependencies in AI models)
- **Port 4411** is non-negotiable (hardcoded in 3 components)
- **Schema backward compatibility** mandatory (add optional fields only)
- **Figma Plugin sandbox** restrictions (no file system, limited APIs)
- **activeTab permission** required for native screenshot capture
- **Memory limits** for large pages (use progressive loading in plugin)

---

## AI/ML Integration (Optional Enhancement)

The handoff server provides optional AI enhancement via `/api/ai-analyze`:

- OCR (Tesseract.js)
- Vision analysis (TensorFlow.js + COCO-SSD)
- Color palette extraction (Node-Vibrant)
- Typography analysis
- Component detection (YOLO)

AI results are embedded in schema but are NOT required for pixel-perfect rendering. The capture pipeline prioritizes ground truth from computed styles over AI inference.
