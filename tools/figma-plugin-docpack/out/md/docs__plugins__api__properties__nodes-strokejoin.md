# strokeJoin | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokejoin/
scraped_at: 2025-12-22T03:30:50.620Z
---

On this page

The decoration applied to vertices which have two or more connected segments.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

## Signature[​](#signature "Direct link to Signature")

### [strokeJoin](/docs/plugins/api/properties/nodes-strokejoin/): [StrokeJoin](/docs/plugins/api/StrokeJoin/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

## Remarks[​](#remarks "Direct link to Remarks")

On a vector network, the value is set on the whole vector network. Use the vector network API to set it on individual vertices.

This property can return [`figma.mixed`](/docs/plugins/api/properties/figma-mixed/) if different vertices have different values.properties.

*   [Signature](#signature)
*   [Remarks](#remarks)
