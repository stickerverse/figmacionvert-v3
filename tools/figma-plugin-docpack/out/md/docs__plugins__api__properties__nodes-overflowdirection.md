# overflowDirection | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-overflowdirection/
scraped_at: 2025-12-22T03:30:48.475Z
---

On this page

Determines whether a frame will scroll in presentation mode when the frame contains content that exceed the frame's bounds. Reflects the value shown in "Overflow Behavior" in the Prototype tab.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

## Signature[​](#signature "Direct link to Signature")

### [overflowDirection](/docs/plugins/api/properties/nodes-overflowdirection/): [OverflowDirection](/docs/plugins/api/OverflowDirection/)

## Remarks[​](#remarks "Direct link to Remarks")

Frames directly parented under the canvas don't need this property to be set or for content to exceed the frame's bounds in order to scroll in presentation mode. They just need the frame to be bigger than the device or screen and will scroll automatically.

*   [Signature](#signature)
*   [Remarks](#remarks)
