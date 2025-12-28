# cornerRadius | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-cornerradius/
scraped_at: 2025-12-22T03:30:42.780Z
---

On this page

The number of pixels to round the corners of the object by.

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

### [cornerRadius](/docs/plugins/api/properties/nodes-cornerradius/): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

## Remarks[​](#remarks "Direct link to Remarks")

This value must be non-negative and can be fractional. If an edge length is less than twice the corner radius, the corner radius for each vertex of the edge will be clamped to half the edge length.

This property can return [`figma.mixed`](/docs/plugins/api/properties/figma-mixed/) if different vertices have different values.properties. Vector nodes can have individual corner radii on each vertex. Rectangle nodes can also have different corner radii on each of the four corners.

*   [Signature](#signature)
*   [Remarks](#remarks)
