# fillStyleId | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-fillstyleid/
scraped_at: 2025-12-22T03:30:44.145Z
---

On this page

The id of the [`PaintStyle`](/docs/plugins/api/PaintStyle/) object that the [`fills`](/docs/plugins/api/properties/nodes-fills/) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

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
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableCellNode](/docs/plugins/api/TableCellNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

## Signature[​](#signature "Direct link to Signature")

### [fillStyleId](/docs/plugins/api/properties/nodes-fillstyleid/): string | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

## Remarks[​](#remarks "Direct link to Remarks")

This property can return [`figma.mixed`](/docs/plugins/api/properties/figma-mixed/) if the node has multiple fills.properties. Text nodes can have multiple fills if some characters are colored differently than others.

*   [Signature](#signature)
*   [Remarks](#remarks)
