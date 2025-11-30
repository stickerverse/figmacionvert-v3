TITLE: Box Model Algorithm

This file explains how to translate the browser box model into Figma geometry in a consistent manner.

SECTION: Browser Box Model

The browser exposes per element box model information that includes content, padding, border, and margin boxes.
Each box has x, y, width, and height in pixels.
This data comes from devtools dom methods and reflects the final layout.

SECTION: Choice Of Canonical Box

For Figma geometry, the border box is usually the most appropriate canonical representation.
The border box corresponds to what the user visually perceives as the element bounds.
In this approach, Figma frame position and size are derived directly from the border box.

SECTION: Mapping To Figma Geometry

Frame x is set to border box x.
Frame y is set to border box y.
Frame width is set to border box width.
Frame height is set to border box height.
Padding is represented as internal padding on auto layout frames rather than altering the external geometry.

SECTION: Padding Representation

Padding top, right, bottom, and left are computed from the difference between content and padding or border boxes.
In auto layout, these values become frame padding values.
In non auto layout frames, padding may not be represented explicitly but still matters for inner content placement.

SECTION: Margins

Margins represent spacing between siblings.
In auto layout, margins often translate into item spacing and alignment offsets rather than explicit margin properties.
In absolute positioning, margins are usually baked into final positions and do not need separate representation.

SECTION: Borders And Radii

Border widths remain style properties and do not change the canonical frame size once border box is chosen.
Corner radii are mapped directly from browser values to Figma corner radius properties per corner when supported.

SECTION: Overflow And Clipping

Overflow rules determine whether child content is clipped.
If overflow is hidden or similar, the Figma frame should have clipping enabled.
If overflow is visible, clipping should be disabled so that children can extend beyond the frame bounds.

SECTION: Pixel Rounding

Internal calculations may use floating point values, but Figma expects integer positions and dimensions.
Before creating or updating a node, round x, y, width, height, and padding values to the nearest integer.
This reduces blurry edges while staying as close as possible to actual layout.

SECTION: Edge Cases

Zero size elements can be skipped unless they have special meaning, such as icons or pseudo elements represented through zero sized placeholders.
Transformed elements may need special handling where transform matrices alter the visual box relative to the box model.
