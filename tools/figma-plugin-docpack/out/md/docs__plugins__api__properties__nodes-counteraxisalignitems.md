# counterAxisAlignItems | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-counteraxisalignitems/
scraped_at: 2025-12-22T03:30:43.151Z
---

On this page

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the counter axis direction.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [counterAxisAlignItems](/docs/plugins/api/properties/nodes-counteraxisalignitems/): 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property will cause all the children to update their `x` and `y` values.

*   In horizontal auto-layout frames, `“MIN”` and `“MAX”` correspond to top and bottom respectively.
*   In vertical auto-layout frames, `“MIN”` and `“MAX”` correspond to left and right respectively.
*   `"BASELINE"` can only be set on horizontal auto-layout frames, and aligns all children along the [text baseline](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties#Text_baseline_alignment).

The corresponding property for the primary axis direction is [`primaryAxisAlignItems`](/docs/plugins/api/properties/nodes-primaryaxisalignitems/).

Horizontal auto-layout frame with different counterAxisAlignItems values

```
(async () => {  const parentFrame = figma.createFrame()  const text = figma.createText()  await figma.loadFontAsync(text.fontName)  text.characters = 'asdf'  // Make the text taller so we can see how text baseline alignment works  text.lineHeight = {unit: 'PERCENT', value: 300}  // Auto-layout frame will have 2 children: a frame and a text node  parentFrame.appendChild(figma.createFrame())  parentFrame.appendChild(text)  parentFrame.layoutMode = 'HORIZONTAL'  // Make the parent frame taller so we can see the effects of  // the different counterAxisAlignItems values  parentFrame.resize(200, 150)  // Parent frame  // +--------------------------+  // |+-----------++----+       |  // ||           ||    |       |  // ||  Child 1  ||asdf|       |  // ||           ||    |       |  // |+-----------++----+       |  // |                          |  // |                          |  // +--------------------------+  parentFrame.counterAxisAlignItems = 'MIN'  // Parent frame  // +--------------------------+  // |                          |  // |                          |  // |+-----------++----+       |  // ||           ||    |       |  // ||  Child 1  ||asdf|       |  // ||           ||    |       |  // |+-----------++----+       |  // +--------------------------+  parentFrame.counterAxisAlignItems = 'MAX'  // Parent frame  // +--------------------------+  // |                          |  // |+-----------++----+       |  // ||           ||    |       |  // ||  Child 1  ||asdf|       |  // ||           ||    |       |  // |+-----------++----+       |  // |                          |  // +--------------------------+  parentFrame.counterAxisAlignItems = 'CENTER'  // Parent frame  // +--------------------------+  // |+-----------+             |  // ||           |+----+       |  // ||  Child 1  ||    |       |  // ||           ||asdf|       |  // |+-----------+|    |       |  // |             +----+       |  // |                          |  // +--------------------------+  parentFrame.counterAxisAlignItems = 'BASELINE'})()
```

*   [Signature](#signature)
*   [Remarks](#remarks)
