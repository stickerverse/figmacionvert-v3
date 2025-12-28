# strokesIncludedInLayout | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokesincludedinlayout/
scraped_at: 2025-12-22T03:30:50.681Z
---

On this page

Applicable only on auto-layout frames. Determines whether strokes are included in [layout calculations](https://help.figma.com/hc/en-us/articles/31289464393751-Use-the-horizontal-and-vertical-flows-in-auto-layout#01JT9NA4HVT02ZPE7BA86SFCD6). When true, auto-layout frames behave like css `box-sizing: border-box`.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [strokesIncludedInLayout](/docs/plugins/api/properties/nodes-strokesincludedinlayout/): boolean

## Remarks[​](#remarks "Direct link to Remarks")

Auto-layout frame with strokes included in layout

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())parentFrame.layoutMode = 'HORIZONTAL'// Let the height of the parent frame resize to fit the childrenparentFrame.counterAxisSizingMode = 'AUTO'// Thick stroke around parent frame to illustrate layout differencesparentFrame.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }}]parentFrame.strokeWeight = 10// Parent frame (strokes overlap with children)// +--------------------------+// |+-----------++-----------+|// ||           ||           ||// ||  Child 1  ||  Child 2  ||// ||           ||           ||// |+-----------++-----------+|// +--------------------------+parentFrame.strokesIncludedInLayout = false// Parent frame (strokes do not overlap with children)// +--------------------------------+// |                                |// |   +-----------++-----------+   |// |   |           ||           |   |// |   |  Child 1  ||  Child 2  |   |// |   |           ||           |   |// |   +-----------++-----------+   |// |                                |// +--------------------------------+parentFrame.strokesIncludedInLayout = true
```

*   [Signature](#signature)
*   [Remarks](#remarks)
