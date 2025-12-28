# itemReverseZIndex | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-itemreversezindex/
scraped_at: 2025-12-22T03:30:46.988Z
---

On this page

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines the [canvas stacking order](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties#Canvas_stacking_order) of layers in this frame. When true, the first layer will be draw on top.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [itemReverseZIndex](/docs/plugins/api/properties/nodes-itemreversezindex/): boolean

## Remarks[​](#remarks "Direct link to Remarks")

Auto-layout frame with different canvas stacking

```
const parentFrame = figma.createFrame()// Create red and green children so we can see the overlapconst child1 = figma.createFrame()child1.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }}]const child2 = figma.createFrame()child2.fills = [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }}]parentFrame.appendChild(child1)parentFrame.appendChild(child2)parentFrame.layoutMode = 'HORIZONTAL'// Negative horizontal gap between children so they overlapparentFrame.itemSpacing = -20// Parent frame (last child on top)// +---------------------+// |+-------+-----------+|// ||       |           ||// ||Child 1|  Child 2  ||// ||       |           ||// |+-------+-----------+|// +---------------------+parentFrame.itemReverseZIndex = false// Parent frame (first child on top)// +---------------------+// |+-----------+-------+|// ||           |       ||// ||  Child 1  |Child 2||// ||           |       ||// |+-----------+-------+|// +---------------------+parentFrame.itemReverseZIndex = true
```

*   [Signature](#signature)
*   [Remarks](#remarks)
