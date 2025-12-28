# layoutMode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutmode/
scraped_at: 2025-12-22T03:30:47.545Z
---

On this page

Determines whether this layer uses auto-layout to position its children. Defaults to "NONE".

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [layoutMode](/docs/plugins/api/properties/nodes-layoutmode/): 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property will cause the position of the children of this layer to change as a side-effect. It also causes the size of this layer to change, since at least one dimension of auto-layout frames is automatically calculated.

As a consequence, note that if a frame has `layoutMode === "NONE"`, calling `layoutMode = "VERTICAL"; layoutMode = "NONE"` does not leave the document unchanged. Removing auto-layout from a frame does not restore the children to their original positions.

This property must be set to `"HORIZONTAL"` or `"VERTICAL"` in order for the [`primaryAxisSizingMode`](/docs/plugins/api/properties/nodes-primaryaxissizingmode/), [`counterAxisSizingMode`](/docs/plugins/api/properties/nodes-counteraxissizingmode/), [`layoutWrap`](/docs/plugins/api/properties/nodes-layoutwrap/), [`primaryAxisAlignItems`](/docs/plugins/api/properties/nodes-primaryaxisalignitems/), [`counterAxisAlignItems`](/docs/plugins/api/properties/nodes-counteraxisalignitems/), [`counterAxisAlignContent`](/docs/plugins/api/properties/nodes-counteraxisaligncontent/), [`paddingTop`](/docs/plugins/api/node-properties/#paddingtop), [`paddingBottom`](/docs/plugins/api/node-properties/#paddingbottom), [`paddingLeft`](/docs/plugins/api/node-properties/#paddingleft), [`paddingRight`](/docs/plugins/api/node-properties/#paddingright), [`itemSpacing`](/docs/plugins/api/properties/nodes-itemspacing/), [`counterAxisSpacing`](/docs/plugins/api/properties/nodes-counteraxisspacing/), [`itemReverseZIndex`](/docs/plugins/api/properties/nodes-itemreversezindex/), and [`strokesIncludedInLayout`](/docs/plugins/api/properties/nodes-strokesincludedinlayout/) properties to be applicable.

Auto-layout frame with horizontal layout

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())// Parent frame// +--------------------------+// |+-----------++-----------+|// ||           ||           ||// ||  Child 1  ||  Child 2  ||// ||           ||           ||// |+-----------++-----------+|// +--------------------------+parentFrame.layoutMode = 'HORIZONTAL'
```

Auto-layout frame with vertical layout

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())parentFrame.appendChild(figma.createFrame())// Parent frame// +-------------+// |+-----------+|// ||           ||// ||  Child 1  ||// ||           ||// |+-----------+|// |+-----------+|// ||           ||// ||  Child 2  ||// ||           ||// |+-----------+|// +-------------+parentFrame.layoutMode = 'VERTICAL'
```

*   [Signature](#signature)
*   [Remarks](#remarks)
