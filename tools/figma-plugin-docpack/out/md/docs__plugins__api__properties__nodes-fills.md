# fills | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-fills/
scraped_at: 2025-12-22T03:30:44.225Z
---

On this page

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

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

### [fills](/docs/plugins/api/properties/nodes-fills/): ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\> | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

## Remarks[​](#remarks "Direct link to Remarks")

This property can return [`figma.mixed`](/docs/plugins/api/properties/figma-mixed/) if the node has multiple sets of fills. Text nodes can have multiple sets of fills if some characters are colored differently than others.

Use [`solidPaint`](/docs/plugins/api/properties/figma-util-solidpaint/) to create solid paint fills with CSS color strings.

Page nodes have a [`backgrounds`](/docs/plugins/api/PageNode/#backgrounds) property instead of a `fills` property.

*   [Signature](#signature)
*   [Remarks](#remarks)
