# appendChildAt | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-appendchildat/
scraped_at: 2025-12-22T03:30:42.481Z
---

On this page

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Appends a node to the grid at the specified row and column index.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [appendChildAt](/docs/plugins/api/properties/nodes-appendchildat/)(node: [SceneNode](/docs/plugins/api/nodes/#scene-node), rowIndex: number, columnIndex: number): void

## Remarks[​](#remarks "Direct link to Remarks")

If the specified row or column index is out of bounds, it will throw an error. If the specified row or column index is occupied by another node, it will throw an error. If the node is already a child of the grid, it will be removed from its current position and appended to the new position.

Appending a node to a grid at a specific row and column index

```
// + --- + --- + --- +// |     |     |     |// + --- + --- + --- +// |     |     |     |// + --- + --- + --- +// |     |     |     |// + --- + --- + --- +const grid = figma.createFrame()grid.layoutMode = 'GRID'grid.gridRowCount = 3grid.gridColumnCount = 3const child1 = figma.createFrame()const child2 = figma.createFrame()const child2 = figma.createFrame()// + --- + --- + --- +// |  1  |     |     |// + --- + --- + --- +// |  2  |     |     |// + --- + --- + --- +// |  3  |     |     |// + --- + --- + --- +grid.appendChildAt(child1, 0, 0)grid.appendChildAt(child2, 1, 0)grid.appendChildAt(child3, 2, 0)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
