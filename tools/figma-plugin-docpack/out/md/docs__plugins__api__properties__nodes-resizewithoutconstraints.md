# resizeWithoutConstraints | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-resizewithoutconstraints/
scraped_at: 2025-12-22T03:30:49.364Z
---

On this page

Resizes the node. Children of the node are never resized, even if those children have constraints. If the parent has auto-layout, causes the parent to be resized (this constraint cannot be ignored).

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SliceNode](/docs/plugins/api/SliceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

## Signature[​](#signature "Direct link to Signature")

### [resizeWithoutConstraints](/docs/plugins/api/properties/nodes-resizewithoutconstraints/)(width: number, height: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### width[​](#width "Direct link to width")

New width of the node. Must be >= 0.01

### height[​](#height "Direct link to height")

New height of the node. Must be >= 0.01, except for [`LineNode`](/docs/plugins/api/LineNode/) which must always be given a height of exactly 0.

## Remarks[​](#remarks "Direct link to Remarks")

This function will not cause its children to resize. Use [`resize`](/docs/plugins/api/properties/nodes-resize/) if you need to apply constraints.

caution

⚠️ If this node is a text node with a missing font, the text node will be resized but the text will not re-layout until the next time the text node is opened on a machine that _has_ the font. This can cause the text node to re-layout immediately and be surprising to your user. Consider checking the text node property [`hasMissingFont`](/docs/plugins/api/TextNode/#hasmissingfont) before using this function.

Ignores `targetAspectRatio`. If `targetAspectRatio` has been set, it will be updated to correspond to the post-resize value.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [width](#width)
    *   [height](#height)
*   [Remarks](#remarks)
