# rescale | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-rescale/
scraped_at: 2025-12-22T03:30:49.193Z
---

On this page

Rescales the node. This API function is the equivalent of using the Scale Tool from the toolbar.

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

### [rescale](/docs/plugins/api/properties/nodes-rescale/)(scale: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### scale[​](#scale "Direct link to scale")

The scale by which to resize the node from the top-left corner.

## Remarks[​](#remarks "Direct link to Remarks")

The scale factor must be >= 0.01

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [scale](#scale)
*   [Remarks](#remarks)
