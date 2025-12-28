# layoutSizingVertical | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizingvertical/
scraped_at: 2025-12-22T03:30:47.783Z
---

On this page

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/), [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/), [`primaryAxisSizingMode`](/docs/plugins/api/properties/nodes-primaryaxissizingmode/), and [`counterAxisSizingMode`](/docs/plugins/api/properties/nodes-counteraxissizingmode/). This field maps directly to the "Vertical sizing" dropdown in the Figma UI.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SliceNode](/docs/plugins/api/SliceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

## Signature[​](#signature "Direct link to Signature")

### [layoutSizingVertical](/docs/plugins/api/properties/nodes-layoutsizingvertical/): 'FIXED' | 'HUG' | 'FILL'

## Remarks[​](#remarks "Direct link to Remarks")

`"HUG"` is only valid on auto-layout frames and text nodes. `"FILL"` is only valid on auto-layout children. Setting these values when they don't apply will throw an error.

*   [Signature](#signature)
*   [Remarks](#remarks)
