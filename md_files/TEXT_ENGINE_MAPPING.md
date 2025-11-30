TITLE: Text Engine Mapping

This file explains how browser text rendering is translated into Figma text nodes.

SECTION: Text Node Extraction

During capture, contiguous text that the browser renders as a single visual line or block should be grouped into a logical text run.
Line breaks from line break elements and block boundaries should be respected.
Whitespace must be handled according to the whitespace mode, such as normal, pre, pre wrap, or nowrap.

SECTION: Text Content Handling

Text content should already reflect css text transform if the pipeline applies transformations at capture time.
Alternatively, the builder can mimic transforms by updating the string before assigning it to Figma.
Preserve human readable characters and avoid rewriting content.

SECTION: Font Mapping

Font family names from css must be matched against available Figma fonts.
An exact match is ideal, but fallbacks based on generic family, such as serif or sans serif, can be used when necessary.
Font weight is converted from numeric values into equivalent Figma weights.

SECTION: Size, Line Height, And Letter Spacing

Font size in pixels maps directly to Figma font size.
Line height in pixels maps to Figma line height in pixel mode when possible.
When line height is normal, use browser computed effective line height if available or allow Figma defaults.
Letter spacing is converted from pixels into Figma letter spacing values while preserving negative spacing when needed.

SECTION: Alignment

Css text alignment maps to Figma horizontal text alignment values such as left, center, right, or justify.
Vertical alignment is generally achieved at the frame layout level rather than as a text specific property.

SECTION: Multi Style Text

When descendants within a text run apply different styles such as bold, italic, or color changes, represent this as a single Figma text node with styled ranges.
Each range specifies font, weight, size, color, and decoration for the characters in that range.

SECTION: Color And Decoration

Css color maps to Figma fill.
Text decoration, such as underline or line through, maps to Figma text decoration options.
If multiple decorations apply, they should be combined as long as Figma supports that combination.

SECTION: Bounds And Resizing

The text layout box from the browser provides x, y, width, and height for the rendered text area.
Figma text node position is based on this box.
Text resizing mode should be chosen to approximate browser behavior, commonly auto width, auto height, or fixed box with wrapping.
