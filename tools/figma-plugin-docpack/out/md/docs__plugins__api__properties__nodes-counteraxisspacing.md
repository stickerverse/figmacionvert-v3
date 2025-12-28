# counterAxisSpacing | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-counteraxisspacing/
scraped_at: 2025-12-22T03:30:43.592Z
---

On this page

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames with [`layoutWrap`](/docs/plugins/api/properties/nodes-layoutwrap/) set to `"WRAP"`. Determines the distance between wrapped tracks. The value must be positive.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [counterAxisSpacing](/docs/plugins/api/properties/nodes-counteraxisspacing/): number | null

## Remarks[​](#remarks "Direct link to Remarks")

Set this propety to `null` to have it sync with [`itemSpacing`](/docs/plugins/api/properties/nodes-itemspacing/). This will never return `null`. Once set to `null`, it will start returning the value of [`itemSpacing`](/docs/plugins/api/properties/nodes-itemspacing/).

Auto-layout frame with children wrapping to the next line

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())// Make children flow horizontally and wrapparentFrame.layoutMode = 'HORIZONTAL'parentFrame.layoutWrap = 'WRAP'// Set a fixed width so when we set itemSpacing below, the children will wrapparentFrame.primaryAxisSizingMode = 'FIXED'// Let the height of the parent frame resize to fit the childrenparentFrame.counterAxisSizingMode = 'AUTO'// Horizontal gap between childrenparentFrame.itemSpacing = 10// Parent frame// +------------------------------------------+// |+-----------+          +-----------+      |// ||           |          |           |      |// ||  Child 1  | -- 10 -- |  Child 2  |      |// ||           |          |           |      |// |+-----------+          +-----------+      |// |      |                                   |// |      |                                   |// |      20                                  |// |      |                                   |// |      |                                   |// |+-----------+                             |// ||           |                             |// ||  Child 3  |                             |// ||           |                             |// |+-----------+                             |// +------------------------------------------+parentFrame.counterAxisSpacing = 20
```

*   [Signature](#signature)
*   [Remarks](#remarks)
