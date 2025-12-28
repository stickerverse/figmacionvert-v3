# primaryAxisAlignItems | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-primaryaxisalignitems/
scraped_at: 2025-12-22T03:30:48.686Z
---

On this page

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the primary axis direction.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [primaryAxisAlignItems](/docs/plugins/api/properties/nodes-primaryaxisalignitems/): 'MIN' | 'MAX' | 'CENTER' | 'SPACE\_BETWEEN'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property will cause all the children to update their `x` and `y` values.

*   In horizontal auto-layout frames, `“MIN”` and `“MAX”` correspond to left and right respectively.
*   In vertical auto-layout frames, `“MIN”` and `“MAX”` correspond to top and bottom respectively.
*   `“SPACE_BETWEEN”` will cause the children to space themselves evenly along the primary axis, only putting the extra space between the children.

The corresponding property for the counter axis direction is [`counterAxisAlignItems`](/docs/plugins/api/properties/nodes-counteraxisalignitems/).

Horizontal auto-layout frame with different primaryAxisAlignItems values

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())parentFrame.layoutMode = 'HORIZONTAL'// Make the parent frame wider so we can see the effects of// the different primaryAxisAlignItems valuesparentFrame.resize(300, 100)// Parent frame// +------------------------------------+// | +-----------++-----------+         |// | |           ||           |         |// | |  Child 1  ||  Child 2  |         |// | |           ||           |         |// | +-----------++-----------+         |// +------------------------------------+parentFrame.primaryAxisAlignItems = 'MIN'// Parent frame// +------------------------------------+// |          +-----------++-----------+|// |          |           ||           ||// |          |  Child 1  ||  Child 2  ||// |          |           ||           ||// |          +-----------++-----------+|// +------------------------------------+parentFrame.primaryAxisAlignItems = 'MAX'// Parent frame// +------------------------------------+// |     +-----------++-----------+     |// |     |           ||           |     |// |     |  Child 1  ||  Child 2  |     |// |     |           ||           |     |// |     +-----------++-----------+     |// +------------------------------------+parentFrame.primaryAxisAlignItems = 'CENTER'// Parent frame// +------------------------------------+// |+-----------+          +-----------+|// ||           |          |           ||// ||  Child 1  |          |  Child 2  ||// ||           |          |           ||// |+-----------+          +-----------+|// +------------------------------------+parentFrame.primaryAxisAlignItems = 'SPACE_BETWEEN'
```

*   [Signature](#signature)
*   [Remarks](#remarks)
