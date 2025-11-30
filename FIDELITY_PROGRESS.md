# Fidelity Improvement Progress

## Phase 1: Fix viewport / scale / frame sizing

**Completed**

- Added `layoutViewportWidth`, `layoutViewportHeight`, `scrollHeight`, and `screenshotScale` to schema metadata.
- Updated `enhanced-figma-importer.ts` to use these fields for precise frame sizing.
- Implemented `scaleFactor` logic to handle potential screenshot scaling issues.
- Verified capture of Stripe results in correct 1440px width frame.

## Phase 2: Capture and apply gradients

**Completed**

- Implemented robust CSS gradient parsing in `dom-extractor.ts`.
- Added support for `linear-gradient` and `radial-gradient`.
- Corrected angle mapping from CSS (Top-to-Bottom = 180deg) to Figma (Down = 90deg).
- Verified gradient transforms in JSON output.

## Phase 3: Improve typography fidelity

**Completed**

- Enhanced `dom-extractor.ts` to correctly parse font stacks and remove quotes.
- Verified `text-transform` (UPPERCASE, etc.) and `text-decoration` capture.
- Confirmed `line-height` uses browser-rendered metrics for pixel perfection.
- Validated `font-family` fallback logic in `node-builder.ts`.

## Phase 4: Restore shadows, borders, and elevation

**Completed**

## Phase 5: Ensure images/logos are captured reliably

**Completed**

## Phase 6: Layout / spacing / auto layout strategy

**Completed**

## Phase 7: Advanced Visuals & Interaction (Current Focus)

**Planned**

- **Glassmorphism**: Implement `backdrop-filter` support (blur, brightness, contrast).
- **Custom Shapes**: Implement `clip-path` support (circles, polygons, paths).
- **Vector Fidelity**: Ensure SVGs are imported as editable vectors, not images.
- **Interactive States**: Capture `:hover` and `:focus` styles as Figma variants.
