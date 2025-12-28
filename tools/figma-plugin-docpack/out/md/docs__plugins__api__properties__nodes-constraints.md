# constraints | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-constraints/
scraped_at: 2025-12-22T03:30:42.853Z
---

On this page

Constraints of this node relative to its containing [`FrameNode`](/docs/plugins/api/FrameNode/), if any.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

## Signature[​](#signature "Direct link to Signature")

### [constraints](/docs/plugins/api/properties/nodes-constraints/): [Constraints](/docs/plugins/api/Constraints/)

## Remarks[​](#remarks "Direct link to Remarks")

Not all node types have a constraint property. In particular, Group and BooleanOperation nodes do not have a constraint property themselves. Instead, resizing a frame applies the constraints on the children of those nodes.

*   [Signature](#signature)
*   [Remarks](#remarks)
