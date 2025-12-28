# layoutWrap | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutwrap/
scraped_at: 2025-12-22T03:30:47.860Z
---

On this page

Determines whether this layer should use wrapping auto-layout. Defaults to `"NO_WRAP"`.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [layoutWrap](/docs/plugins/api/properties/nodes-layoutwrap/): 'NO\_WRAP' | 'WRAP'

## Remarks[​](#remarks "Direct link to Remarks")

This property can only be set on layers with `layoutMode === "HORIZONTAL"`. Setting it on layers without this property will throw an Error.

This property must be set to `"WRAP"` in order for the [`counterAxisSpacing`](/docs/plugins/api/properties/nodes-counteraxisspacing/) and [`counterAxisAlignContent`](/docs/plugins/api/properties/nodes-counteraxisaligncontent/) properties to be applicable.

*   [Signature](#signature)
*   [Remarks](#remarks)
