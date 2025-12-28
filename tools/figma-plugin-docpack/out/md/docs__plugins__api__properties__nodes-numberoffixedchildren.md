# numberOfFixedChildren | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-numberoffixedchildren/
scraped_at: 2025-12-22T03:30:48.098Z
---

On this page

Determines which children of the frame are fixed children in a scrolling frame.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

## Signature[​](#signature "Direct link to Signature")

### [numberOfFixedChildren](/docs/plugins/api/properties/nodes-numberoffixedchildren/): number

## Remarks[​](#remarks "Direct link to Remarks")

In Figma, fixed children are always on top of scrolling (non-fixed) children. Despite the "Fix position when scrolling" checkbox in the UI, fixed layers are not represented as a boolean property on individual layers. Instead, what we really have are two sections of children inside each frame. These section headers are visible in the layers panel when a frame has at least one fixed child.

*   [Signature](#signature)
*   [Remarks](#remarks)
