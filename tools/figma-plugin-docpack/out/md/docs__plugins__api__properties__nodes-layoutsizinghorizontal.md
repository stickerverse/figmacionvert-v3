# layoutSizingHorizontal | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizinghorizontal/
scraped_at: 2025-12-22T03:30:47.735Z
---

On this page

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/), [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/), [`primaryAxisSizingMode`](/docs/plugins/api/properties/nodes-primaryaxissizingmode/), and [`counterAxisSizingMode`](/docs/plugins/api/properties/nodes-counteraxissizingmode/). This field maps directly to the "Horizontal sizing" dropdown in the Figma UI.

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

### [layoutSizingHorizontal](/docs/plugins/api/properties/nodes-layoutsizinghorizontal/): 'FIXED' | 'HUG' | 'FILL'

## Remarks[​](#remarks "Direct link to Remarks")

`"HUG"` is only valid on auto-layout frames and text nodes. `"FILL"` is only valid on auto-layout children. Setting these values when they don't apply will throw an error.

Setting layoutSizingHorizontal on an auto-layout frame

```
const parentFrame = figma.createFrame()const child2 = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(child2)parentFrame.layoutMode = 'VERTICAL'// Make the second child twice as wide as the firstchild2.resize(200, 100)// Parent frame (child 2 is clipped)// +-------------+// |+-----------+|// ||           ||// ||  Child 1  ||// ||           ||// |+-----------+|// |+------------|// ||            |// ||  Child 2   |// ||            |// |+------------|// +-------------+parentFrame.layoutSizingHorizontal = 'FIXED'// Parent frame (child 2 is not clipped)// +------------------------+// |+-----------+           |// ||           |           |// ||  Child 1  |           |// ||           |           |// |+-----------+           |// |+----------------------+|// ||                      ||// ||       Child 2        ||// ||                      ||// |+----------------------+|// +------------------------+parentFrame.layoutSizingHorizontal = 'HUG'
```

Setting layoutSizingHorizontal on an auto-layout child

```
const parentFrame = figma.createFrame()const child2 = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(child2)parentFrame.layoutMode = 'HORIZONTAL'parentFrame.resize(300, 100)// Parent frame// +-------------------------------------+// |+-----------++-----------+           |// ||           ||           |           |// ||  Child 1  ||  Child 2  |           |// ||           ||           |           |// |+-----------++-----------+           |// +-------------------------------------+child2.layoutSizingHorizontal = 'FIXED'// Parent frame// +-------------------------------------+// |+-----------++----------------------+|// ||           ||                      ||// ||  Child 1  ||       Child 2        ||// ||           ||                      ||// |+-----------++----------------------+|// +-------------------------------------+child2.layoutSizingHorizontal = 'FILL'
```

*   [Signature](#signature)
*   [Remarks](#remarks)
