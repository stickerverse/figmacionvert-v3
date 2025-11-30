TITLE: Asset And Image Extraction

This file describes how raster assets and related resources are extracted and prepared for use in Figma.

SECTION: Image Sources

Capture image sources from image elements, css background images, picture elements, and any other constructs that render bitmaps.
Use network tracking to map these references to actual resource urls and responses.
Inline data urls must also be supported.

SECTION: Url Resolution

Resolve relative urls against the document base url to obtain absolute urls.
Handle redirects and final response urls as reported by the network logs.
Maintain a mapping from dom reference to resolved resource identifier.

SECTION: Download Strategy

Download assets using a dedicated http client or using devtools when suitable.
Store binaries in memory or on disk, keyed by a stable hash such as a cryptographic digest of the content.
Reuse existing entries when the same binary appears at multiple locations.

SECTION: Figma Image References

Upload each unique binary to Figma only once and obtain an image reference identifier.
Store a mapping from asset identifier to Figma image reference.
When constructing Figma nodes, set image fills referencing this image reference rather than reuploading.

SECTION: Background Images

When css background image is a bitmap, create a rectangle or frame in Figma with the element geometry and apply an image fill.
Background size and background position should be translated into Figma scale and alignment modes as closely as possible.
Repeated backgrounds may require tiling emulation when Figma support allows.

SECTION: Gradients

When css background uses gradients, parse gradient definitions into stop lists with positions and colors.
Map linear gradients into Figma linear gradients with appropriate angle.
Map radial gradients into radial gradients while approximating shape and size.

SECTION: Vector Assets And Icon Fonts

External vector assets such as standalone svg files are handled by the vector processing pipeline.
Icon fonts that rely on glyph code points may require special handling, such as mapping to corresponding vector icons when known.

SECTION: Caching And Performance

Use both url based and content based caching to minimize redundant downloads and uploads.
Persist caches across runs when practical so repeated imports of the same site do not reprocess assets unnecessarily.
