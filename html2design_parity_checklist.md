# HTML2Design Parity Checklist

Derived from HTML2Design changelog (v9 - v205).

## 1. Typography & Fonts (Bucket 1)

- [x] **Automatic Text Style Creation** (v70): Auto-generate local Figma text styles for common typography (H1-H6, p, etc.).
- [x] **Text Merging** (v66, v84, v172): Merge adjacent text nodes with identical styles/lines to reduce layer count.
- [x] **Icon Fonts as SVG** (v172, v71, v56): Detect icon fonts (FontAwesome, Material Icons) and render as SVG paths to avoid missing font issues.
- [x] **Font Fallbacks & Mapping** (v66, v160): Better error reporting and mapping for missing fonts. Support local font lookup.
- [ ] **Line Height & Positioning** (v112, v122): Fix text positioning with custom line-heights; rounding improvements.
- [ ] **Oblique/Italic Support** (v17): Explicit support for oblique.

## 2. Layout & Auto-Layout

- [ ] **Auto-Layout v2** (v153, v101): Comprehensive auto-layout overhaul.
- [ ] **Overflow Handling** (v197, v172): Support `overflow: auto/scroll` by creating scrollable frames (prototyping).
- [ ] **Absolute in Auto-Layout** (v123): Allow absolute positioned elements inside auto-layout frames.
- [ ] **Sticky & Fixed Positioning** (v182, v172, v179): Correctly handle `position: sticky` and `fixed` (pinning).
- [ ] **Flex/Grid Gaps**: Ensure `gap` properties are mapped to auto-layout item spacing.
- [ ] **Min/Max Width/Height** (v205, v186): Respect min/max constraints.
- [ ] **Z-Index Stacking** (v135, v56): Handle negative z-index and stacking contexts correctly.

## 3. Media (Images, SVG, Video)

- [x] **Picture/Source Tags** (v58): _Implemented in previous step._
- [ ] **Video Support** (v72, v168): Capture `<video>` elements (poster or snapshot).
- [ ] **SVG Improvements** (v39, v53, v145): Support nested SVGs, `<use>` tags, and text inside SVG.
- [ ] **WebGL/Canvas** (v55): Capture canvas content as images.
- [ ] **Backdrop Filter** (v135, v137): Support `backdrop-filter` (blur).
- [ ] **Clip Path** (v85, v91): Support `clip-path` (polygon, circle) using masks.
- [ ] **Mixed Borders** (v188, v172): Handle borders with different colors/widths per side (simulate with inner shadows or frames).
- [ ] **Gradients** (v145, v139): Support radial, conic, and `calc()` in gradients.

## 4. Capture & Extension Engine

- [ ] **Capture `<html>` root** (v179): Capture root element to catch background colors/images on html tag.
- [ ] **Nested Iframes & Shadow Roots** (v153, v147, v42): Deep traversal of nested iframes and shadow DOMs.
- [ ] **Scrolling Algorithm** (v180, v179): "Relaxed" scrolling to capture lazy-loaded content without double-scrolling artifacts.
- [ ] **Disable Animations** (v51): Pause/disable CSS animations/transitions during capture for stability.
- [ ] **Wait for Stability** (v10): Robust network/DOM stability checks (partially implemented).

## 5. Plugin UI & Workflow

- [ ] **Import Options Panel** (v205): UI to toggle features (e.g., "Create Styles", "Download Images", "Dark Mode").
- [ ] **Multi-Viewport Import** (v66): Import mobile/desktop views simultaneously.
- [ ] **Re-import/Update** (v51): Update existing frames without losing connections (hard).
- [ ] **Link Prototypes** (v134, v169): Create prototype links for `<a>` tags.
