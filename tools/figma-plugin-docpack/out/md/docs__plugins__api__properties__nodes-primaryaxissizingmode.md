# primaryAxisSizingMode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-primaryaxissizingmode/
scraped_at: 2025-12-22T03:30:48.669Z
---

On this page

Applicable only on auto-layout frames. Determines whether the primary axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [primaryAxisSizingMode](/docs/plugins/api/properties/nodes-primaryaxissizingmode/): 'FIXED' | 'AUTO'

## Remarks[​](#remarks "Direct link to Remarks")

Auto-layout frames have a **primary axis**, which is the axis that resizes when you add new items into the frame. For example, frames with "VERTICAL" [`layoutMode`](/docs/plugins/api/properties/nodes-layoutmode/) resize in the y-axis.

*   `"FIXED"`: The primary axis length is determined by the user or plugins, unless the [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/) is set to “STRETCH” or [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/) is 1.
*   `"AUTO"`: The primary axis length is determined by the size of the children. If set, the auto-layout frame will automatically resize along the counter axis to fit its children.

Note: `“AUTO”` should not be used in any axes where [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/) = “STRETCH” or [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/) = 1. Either use `“FIXED”` or disable [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/)/[`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/).

*   [Signature](#signature)
*   [Remarks](#remarks)
