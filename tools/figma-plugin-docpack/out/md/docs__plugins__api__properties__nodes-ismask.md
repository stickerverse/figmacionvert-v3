# isMask | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-ismask/
scraped_at: 2025-12-22T03:30:46.878Z
---

On this page

Whether this node is a mask. A mask node masks its subsequent siblings.

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
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

## Signature[​](#signature "Direct link to Signature")

### [isMask](/docs/plugins/api/properties/nodes-ismask/): boolean

## Remarks[​](#remarks "Direct link to Remarks")

Since a mask node masks all of its subsequent siblings, enabling `isMask` on a node that is not in a group-like container designed to stop mask propagation can have unintented consequences — that is, it may "mask" (often in practice, hide) more siblings than you intend. When enabling `isMask`, ensure you have contained its propagation propertly. ("Subsequent siblings" are siblings listed _after_ this node in a `children` array in the plugin API; this corresponds to layers shown _above_ this node in the layers panel.)

Example:

```
const rect = figma.createRectangle()const circleToMask = figma.createEllipse()const otherCircle1 = figma.createEllipse()const otherCircle2 = figma.createEllipse()// In the layers panel, this would look something like:// - otherCircle2// - otherCircle1// - circleToMask// - rect//// So if I enable `rect.isMask`, the rect will mask ALL other nodes,// because they are all siblings.//// If I only want `rect` to mask `circleToMask`, I should group// them first.figma.group([rect, circleToMask], figma.currentPage,            figma.currentPage.children.indexOf(circleToMask))rect.isMask = true// Now `rect` only masks its siblings above it in its group// (`circleToMask`) but not the circles outside of the group.// In the layers panel this would look like:// - otherCircle2// - otherCircle1// - Group//   - circleToMask [this is the only node masked by rect]//   - rect (isMask)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
