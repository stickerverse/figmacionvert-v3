TITLE: Layout Mapping To Figma

This file defines how various css layout behaviors are converted into Figma layout configurations.

SECTION: Overview

Css supports several layout models, including block flow, inline flow, flex layout, grid layout, and absolute positioning.
Figma supports frames and auto layout which can emulate many of these behaviors.
A consistent mapping is required for predictable and editable results.

SECTION: Display Types

Elements with block like display are typically represented as frames that may or may not use auto layout depending on their children.
Inline elements that only contain text usually collapse into text nodes.
Flex containers map naturally to frames with auto layout enabled, using horizontal or vertical direction based on flex direction.
Grid containers may map to frames using auto layout plus manual constraints or to nested frames representing rows and columns.

SECTION: Position Types

Static and relative positioned elements participate in the normal flow and are usually represented with auto layout in their parent frame.
Absolute and fixed positioned elements are treated as absolutely positioned children in Figma by enabling absolute positioning on those nodes and setting constraints relative to the containing frame.
Sticky elements can be treated as relative for static snapshots because their sticky behavior is temporal, not geometric at capture time.

SECTION: Containing Blocks

The containing block for positioning is typically the nearest ancestor with non static position or the root document.
This ancestor should map to the Figma frame whose coordinate system is used for the positioned child.
All absolute child coordinates are interpreted relative to this frame.

SECTION: Auto Layout Decisions

When a container is display flex and its children appear in a consistent row or column without overlapping, auto layout is preferred.
Primary axis and spacing are derived from flex direction, justify content, align items, and gap.
If children overlap or use complex absolute positioning within the container, it may be safer to use a non auto layout frame and place children absolutely.

SECTION: Constraints And Resizing

For each child in a frame, derive constraints from distances to frame edges and from css properties.
In Figma, constraints such as left, right, top, bottom, center, and scale are used to approximate responsive behavior.
While full browser responsive behavior may not be fully replicated, constraints should reflect general intent.

SECTION: Layer Order

Within a frame, children should be added or ordered according to final painting order derived from stacking context analysis.
This ensures that overlapping elements appear above or below as they do in the browser.
