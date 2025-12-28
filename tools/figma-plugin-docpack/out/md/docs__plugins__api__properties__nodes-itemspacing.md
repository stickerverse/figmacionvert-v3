# itemSpacing | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-itemspacing/
scraped_at: 2025-12-22T03:30:47.421Z
---

On this page

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines distance between children of the frame.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [itemSpacing](/docs/plugins/api/properties/nodes-itemspacing/): number

## Remarks[​](#remarks "Direct link to Remarks")

For auto-layout frames with [`layoutMode`](/docs/plugins/api/properties/nodes-layoutmode/) set to `"HORIZONTAL"`, this is the horizontal gap between children. For auto-layout frames with [`layoutMode`](/docs/plugins/api/properties/nodes-layoutmode/) set to `"VERTICAL"`, this is the vertical gap between children.

Auto-layout frame with a horizontal gap between children

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())parentFrame.layoutMode = 'HORIZONTAL'// Parent frame// +------------------------------------+// |+-----------+          +-----------+|// ||           |          |           ||// ||  Child 1  | -- 20 -- |  Child 2  ||// ||           |          |           ||// |+-----------+          +-----------+|// +------------------------------------+parentFrame.itemSpacing = 20
```

Auto-layout frame with a vertical gap between children

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())parentFrame.layoutMode = 'VERTICAL'// Parent frame// +-------------+// |+-----------+|// ||           ||// ||  Child 1  ||// ||           ||// |+-----------+|// |      |      |// |      |      |// |      20     |// |      |      |// |      |      |// |+-----------+|// ||           ||// ||  Child 2  ||// ||           ||// |+-----------+|// +-------------+parentFrame.itemSpacing = 20
```

*   [Signature](#signature)
*   [Remarks](#remarks)
