# layoutPositioning | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutpositioning/
scraped_at: 2025-12-22T03:30:47.595Z
---

On this page

This property is applicable only for direct children of auto-layout frames. Determines whether a layer's size and position should be dermined by auto-layout settings or manually adjustable.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
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

### [layoutPositioning](/docs/plugins/api/properties/nodes-layoutpositioning/): 'AUTO' | 'ABSOLUTE'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property may cause the parent layer's size to change, since it will recalculate as if this child did not exist. It will also change this node's `x`, `y`, and `relativeTransform` properties.

*   The default value of `"AUTO"` will layout this child according to auto-layout rules.
*   Setting `"ABSOLUTE"` will take this child out of auto-layout flow, while still nesting inside the auto-layout frame. This allows explicitly setting `x`, `y`, `width`, and `height`. `"ABSOLUTE"` positioned nodes respect constraint settings.

Auto-layout frame absolutely positioned red circle at the top-right corner

```
const parentFrame = figma.createFrame()parentFrame.appendChild(figma.createFrame())// Create a small red circleconst ellipse = figma.createEllipse()ellipse.resize(20, 20)ellipse.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }}]parentFrame.appendChild(ellipse)parentFrame.clipsContent = falseparentFrame.layoutMode = 'HORIZONTAL'// Enable absolute positioning so we can move the circleellipse.layoutPositioning = 'ABSOLUTE'// Center the circle on the top-right corner of the frameellipse.x = 90ellipse.y = -10// Make the circle stick to the top-right corner of the frameellipse.constraints = { horizontal: 'MAX', vertical: 'MIN' }
```

*   [Signature](#signature)
*   [Remarks](#remarks)
