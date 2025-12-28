# resize | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-resize/
scraped_at: 2025-12-22T03:30:49.399Z
---

On this page

Resizes the node. If the node contains children with constraints, it applies those constraints during resizing. If the parent has auto-layout, causes the parent to be resized.

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

### [resize](/docs/plugins/api/properties/nodes-resize/)(width: number, height: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### width[​](#width "Direct link to width")

New width of the node. Must be >= 0.01

### height[​](#height "Direct link to height")

New height of the node. Must be >= 0.01, except for [`LineNode`](/docs/plugins/api/LineNode/) which must always be given a height of exactly 0.

## Remarks[​](#remarks "Direct link to Remarks")

Since this function applies constraints recursively (when there are multiple levels of nested frames with constraints), calls to this function could be expensive. Use [`resizeWithoutConstraints`](/docs/plugins/api/properties/nodes-resizewithoutconstraints/) if you don't need to apply constraints.

caution

⚠️ If this node is a text node with a missing font or contains a text node with a missing font, the text node will be resized but the text will not re-layout until the next time the text node is opened on a machine that _has_ the font. This can cause the text node to re-layout immediately and be surprising to your user. Consider checking if the document [`figma.hasMissingFont`](/docs/plugins/api/figma/#hasmissingfont) before using this function.

Ignores `targetAspectRatio`. If `targetAspectRatio` has been set, it will be updated to correspond to the post-resize value.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [width](#width)
    *   [height](#height)
*   [Remarks](#remarks)
