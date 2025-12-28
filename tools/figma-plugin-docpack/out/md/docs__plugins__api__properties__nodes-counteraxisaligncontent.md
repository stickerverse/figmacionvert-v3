# counterAxisAlignContent | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-counteraxisaligncontent/
scraped_at: 2025-12-22T03:30:43.015Z
---

On this page

Applicable only on auto-layout frames with [`layoutWrap`](/docs/plugins/api/properties/nodes-layoutwrap/) set to `"WRAP"`. Determines how the wrapped tracks are spaced out inside of the auto-layout frame.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [counterAxisAlignContent](/docs/plugins/api/properties/nodes-counteraxisaligncontent/): 'AUTO' | 'SPACE\_BETWEEN'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property on a non-wrapping auto-layout frame will throw an error.

*   `"AUTO"`: If all children of this auto-layout frame have [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/) set to `"STRETCH"`, the tracks will stretch to fill the auto-layout frame. This is like flexbox `align-content: stretch`. Otherwise, each track will be as tall as the tallest child of the track, and will align based on the value of [`counterAxisAlignItems`](/docs/plugins/api/properties/nodes-counteraxisalignitems/). This is like flexbox `align-content: start | center | end`. [`counterAxisSpacing`](/docs/plugins/api/properties/nodes-counteraxisspacing/) is respected when `counterAxisAlignContent` is set to `"AUTO"`.
*   `"SPACE_BETWEEN"`: Tracks are all sized based on the tallest child in the track. The free space within the auto-layout frame is divided up evenly between each track. If the total height of all tracks is taller than the height of the auto-layout frame, the spacing will be 0.

*   [Signature](#signature)
*   [Remarks](#remarks)
