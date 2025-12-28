# gridColumnSpan | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridcolumnspan/
scraped_at: 2025-12-22T03:30:46.192Z
---

On this page

Applicable only on direct children of grid auto-layout frames. Determines the number of columns this node will span within the parent grid.

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

### [gridColumnSpan](/docs/plugins/api/properties/nodes-gridcolumnspan/): number

## Remarks[​](#remarks "Direct link to Remarks")

Must be a positive integer. This property defines how many columns the node will occupy starting from gridColumnAnchorIndex. If the span provided results in the node overlapping with another node in the grid, the setter will throw an error. If the span provided results in the node extending beyond the grid's defined columns, the setter will throw an error.

*   [Signature](#signature)
*   [Remarks](#remarks)
