# targetAspectRatio | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-targetaspectratio/
scraped_at: 2025-12-22T03:30:51.089Z
---

On this page

When toggled, causes the layer to keep its proportions when the user resizes it via auto layout, constraints, the properties panel, or on-canvas. If not set, the node does NOT resize toward a specific targetAspectRatio.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

## Signature[​](#signature "Direct link to Signature")

### [targetAspectRatio](/docs/plugins/api/properties/nodes-targetaspectratio/): [Vector](/docs/plugins/api/Vector/) | null \[readonly\]

## Remarks[​](#remarks "Direct link to Remarks")

Use `lockAspectRatio` and `unlockAspectRatio` to set targetAspectRatio.

```
const parentFrame = figma.createFrame()const image = await figma.createNodeFromJSXAsync(  <figma.widget.Image    src="https://picsum.photos/200/300"    width={200}    height={300}  />)parentFrame.appendChild(image)image.lockAspectRatio() // set to 2:3 ratio, implicit from the size// Add autolayout to parent, which defaults to Hug x HugparentFrame.layoutMode = 'HORIZONTAL'// Set child to fill-widthimage.layoutGrow = 1// Resize parent to be much largerparentFrame.resize(500, 1000)// Since the child is fill-width, it will expand to the available spaceimage.width == 500image.height == 750// Image maintains the 2:3 ratio even as it grew with auto layout!
```

caution

⚠️ `targetAspectRatio` cannot be used with auto-resizing text (TextNodes where textAutoResize !== NONE).

*   [Signature](#signature)
*   [Remarks](#remarks)
