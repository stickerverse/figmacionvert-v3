# gridRowAnchorIndex | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridrowanchorindex/
scraped_at: 2025-12-22T03:30:46.000Z
---

On this page

Applicable only on direct children of grid auto-layout frames. Determines the starting row index for this node within the parent grid.

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

### [gridRowAnchorIndex](/docs/plugins/api/properties/nodes-gridrowanchorindex/): number \[readonly\]

## Remarks[​](#remarks "Direct link to Remarks")

The row index is 0-based, where 0 is the first row in the grid. This property works in conjunction with gridRowSpan to determine the node's row position and size in the grid. If the index provided is greater than the number of rows in the grid, the setter will throw an error. If the index provided results in the node overlapping with another node in the grid, the setter will throw an error.

*   [Signature](#signature)
*   [Remarks](#remarks)
