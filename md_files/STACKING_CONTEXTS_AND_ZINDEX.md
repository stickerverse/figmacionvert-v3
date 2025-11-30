TITLE: Stacking Contexts And Z Index

This file describes how to determine painting order for elements and how to map that order to Figma layer order.

SECTION: Stacking Context Definition

A stacking context is a group of elements that share a common z ordering context.
New stacking contexts are formed by specific css properties such as positioned elements with non auto z index, elements with reduced opacity, and elements with transforms or certain filters.

SECTION: Painting Order Within A Stacking Context

Within a stacking context, the browser paints backgrounds and borders of the element that establishes the context.
Then it paints descendants based on rules that consider z index values and document order.
Negative z index elements are painted first, followed by normal flow and positioned elements, then positive z index elements.

SECTION: Global Painting Order

To reconstruct painting order across the page, build a tree of stacking contexts starting from the root.
Traverse this tree and produce a linear list of elements in the exact order they are painted.
This order is what should be mirrored in Figma as layer order.

SECTION: Mapping To Figma Layers

In Figma, elements created later in a frame appear above earlier ones.
To match browser painting, create or reorder Figma nodes according to the computed painting sequence.
Within each Figma frame that corresponds to a stacking context, maintain this order among child layers.

SECTION: Overlays And Fixed Elements

Modals, overlays, and fixed headers often sit in top level stacking contexts with large positive z index.
During mapping, these elements should become top most frames in the Figma page so that they visually sit above base content.

SECTION: Diagnostics

When unexpected overlaps appear in Figma, compare the computed painting order with devtools painting information.
Any discrepancies indicate bugs in stacking context detection or ordering and should be corrected.
