# setBoundVariable | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/
scraped_at: 2025-12-22T03:30:49.956Z
---

On this page

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SliceNode](/docs/plugins/api/SliceNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

## Signature[​](#signature "Direct link to Signature")

### setBoundVariable(field: [VariableBindableNodeField](/docs/plugins/api/VariableBindableNodeField/) | [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/), variable: [Variable](/docs/plugins/api/Variable/) | null): void

## Parameters[​](#parameters "Direct link to Parameters")

### field[​](#field "Direct link to field")

The field to bind the variable to.

### variable[​](#variable "Direct link to variable")

The variable to bind to the field. If `null` is provided, the field will be unbound from any variables. Make sure to pass a Variable object or null; passing a variable ID is deprecated.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [field](#field)
    *   [variable](#variable)
