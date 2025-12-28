# strokeCap | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokecap/
scraped_at: 2025-12-22T03:30:50.543Z
---

On this page

The decoration applied to vertices which have only one connected segment.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
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
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

## Signature[​](#signature "Direct link to Signature")

### [strokeCap](/docs/plugins/api/properties/nodes-strokecap/): [StrokeCap](/docs/plugins/api/StrokeCap/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

## Remarks[​](#remarks "Direct link to Remarks")

On a vector network, the value is set on the whole vector network. Use the vector network API to set it on individual vertices.

This property can return [`figma.mixed`](/docs/plugins/api/properties/figma-mixed/) if different vertices have different values.properties.

*   [Signature](#signature)
*   [Remarks](#remarks)
