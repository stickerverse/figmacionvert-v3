# cornerSmoothing | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-cornersmoothing/
scraped_at: 2025-12-22T03:30:42.943Z
---

On this page

A value that lets you control how "smooth" the corners are. Ranges from 0 to 1.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

## Signature[​](#signature "Direct link to Signature")

### [cornerSmoothing](/docs/plugins/api/properties/nodes-cornersmoothing/): number

## Remarks[​](#remarks "Direct link to Remarks")

A value of 0 is the default and means that the corner is perfectly circular. A value of 0.6 means the corner matches the iOS 7 "squircle" icon shape. Other values produce various other curves. See [this post](https://www.figma.com/blog/desperately-seeking-squircles/) for the gory details!

*   [Signature](#signature)
*   [Remarks](#remarks)
