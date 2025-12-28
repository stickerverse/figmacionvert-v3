# setGridChildPosition | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-setgridchildposition/
scraped_at: 2025-12-22T03:30:50.034Z
---

On this page

Applicable only on direct children of 'GRID' auto-layout frames. Sets the position of the node

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

### [setGridChildPosition](/docs/plugins/api/properties/nodes-setgridchildposition/)(rowIndex: number, columnIndex: number): void

## Remarks[​](#remarks "Direct link to Remarks")

This method sets the position of the node within the grid based on the specified row and column indices. The row and column indices are 0-based, where 0 is the top row in the grid, and 0 is the left-most column in the grid. If the specified row or column index is out of bounds, it will throw an error. If the specified row or column index is occupied by another node, it will throw an error.

Setting the position of a node in a grid

```
const grid = figma.createFrame()grid.layoutMode = 'GRID'grid.gridRowCount = 3grid.gridColumnCount = 3const child1 = figma.createFrame()const child2 = figma.createFrame()const child2 = figma.createFrame()// + --- + --- + --- +// |  1  |  2  |  3  |// + --- + --- + --- +// |     |     |     |// + --- + --- + --- +// |     |     |     |// + --- + --- + --- +// If calling `appendChild` instead of [`appendChildAt`](/api/properties/nodes-appendchildat.md), nodes will be added to the first available position in the grid.grid.appendChild(child1)grid.appendChild(child2)grid.appendChild(child3)// Move the children to specific grid positionschild2.setGridPosition(1, 0)child3.setGridPosition(2, 1)// + --- + --- + --- +// |  1  |     |     |// + --- + --- + --- +// |  2  |     |     |// + --- + --- + --- +// |     |  3  |     |// + --- + --- + --- +
```

*   [Signature](#signature)
*   [Remarks](#remarks)
