# counterAxisSizingMode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-counteraxissizingmode/
scraped_at: 2025-12-22T03:30:43.211Z
---

On this page

Applicable only on auto-layout frames. Determines whether the counter axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [counterAxisSizingMode](/docs/plugins/api/properties/nodes-counteraxissizingmode/): 'FIXED' | 'AUTO'

## Remarks[​](#remarks "Direct link to Remarks")

Auto-layout frames have a **primary axis**, which is the axis that resizes when you add new items into the frame. For example, frames with "VERTICAL" [`layoutMode`](/docs/plugins/api/properties/nodes-layoutmode/) resize in the y-axis.

The other axis is called the **counter axis**.

*   `"FIXED"`: The counter axis length is determined by the user or plugins, unless the [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/) is set to “STRETCH” or [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/) is 1.
*   `"AUTO"`: The counter axis length is determined by the size of the children. If set, the auto-layout frame will automatically resize along the counter axis to fit its children.

Note: `“AUTO”` cannot be used in any axes where [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/) = “STRETCH” or [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/) = 1. Either use `“FIXED”` or disable [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/)/[`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/).

Horizontal auto-layout frame with different counterAxisSizingMode values

```
const parentFrame = figma.createFrame()const child2 = figma.createFrame()// Make the second child 200px high instead of the default 100pxchild2.resize(100, 200)parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(child2)parentFrame.layoutMode = 'HORIZONTAL'// Parent frame// +--------------------------+// |+-----------++-----------+|// ||           ||           ||// ||  Child 1  ||  Child 2  ||// ||           ||           ||// |+-----------+|           ||// +--------------------------+parentFrame.counterAxisSizingMode = 'FIXED' // Child 2 is clipped// Parent frame// +--------------------------+// |+-----------++-----------+|// ||           ||           ||// ||  Child 1  ||  Child 2  ||// ||           ||           ||// |+-----------+|           ||// |             |           ||// |             |           ||// |             +-----------+|// +--------------------------+parentFrame.counterAxisSizingMode = 'AUTO'
```

*   [Signature](#signature)
*   [Remarks](#remarks)
