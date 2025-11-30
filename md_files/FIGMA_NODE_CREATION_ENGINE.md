TITLE: Figma Node Creation Engine

This file explains how the normalized schema is turned into Figma nodes.

SECTION: Overview

The builder traverses the schema tree and, for each node, decides what Figma node type to create, what properties to assign, and how to nest nodes.
It must respect the pixel perfect ruleset and use resolved style and layout information.

SECTION: Node Type Decisions

Element nodes that serve as layout containers usually become frames.
Element nodes that act primarily as background boxes may become rectangles.
Text nodes become Figma text nodes.
Vector nodes derived from svg become vector nodes or groups of vectors.
Repeated patterns can optionally become components and instances.

SECTION: Creation Steps Per Node

For each node in traversal order:
Decide on Figma node type.
Create the node.
Set its position and size from the layout subsection.
Apply visual styles including fills, strokes, shadows, and corner radii.
Configure layout settings for containers, such as auto layout direction and padding.
Attach children according to the dom hierarchy and computed painting order.

SECTION: Auto Layout Configuration

When a node is a flex like container, enable auto layout in Figma.
Set orientation based on flex direction and primary axis alignment based on justify content.
Set cross axis alignment based on align items.
Use item spacing derived from css gap or from observed spacing between children.
Padding is set from the box model padding values.

SECTION: Absolute Positioning

For nodes that use absolute or fixed positioning, enable absolute positioning mode in Figma when supported.
Set constraints relative to the containing frame based on distances to edges.
Use the position type and containing block information from the schema to choose the correct parent frame.

SECTION: Text Node Configuration

For text nodes, set the characters field to the text content.
Apply font family, weight, size, line height, letter spacing, and color from resolved style.
Set alignment, auto resize mode, and any decorations.
If the schema indicates multiple style ranges, apply them to the corresponding character ranges.

SECTION: Image And Gradient Application

For nodes that require bitmap fills, set Figma fills to image paints using previously obtained image references.
For gradient backgrounds, set gradient paints with correct stops and directions.
Opacity and blend modes should be applied as closely as Figma allows.

SECTION: Layer Order

During creation or after all nodes are created, reorder children within each frame according to the stacking and painting order computed earlier.
This ensures that overlapping elements appear correctly.

SECTION: Post Processing

After building the whole tree, adjust the page zoom and view center for convenience.
Optionally group top level sections into separate frames that match major page sections, such as header, content, and footer, while preserving layout.

SECTION: Error Reporting

If the builder encounters data that cannot be applied to a node, it must log a structured error rather than silently ignoring it.
Errors should reference node identifiers and property names so that issues can be traced back to schema or capture problems.
