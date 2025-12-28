# Shared Node Properties | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/node-properties/
scraped_at: 2025-12-22T03:30:24.399Z
---

Nodes support a range of properties. Some properties are universal, some are shared between node types, and some are unique to specific node types.

On this page, you can explore properties which are available on multiple nodes. Properties appear in alphabetical order, and you can see which nodes each property is supported on.

### absoluteBoundingBox: [Rect](/docs/plugins/api/Rect/) | null \[readonly\]

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

The bounds of the node that does not include rendered properties like drop shadows or strokes. The `x` and `y` inside this property represent the absolute position of the node on the page.

* * *

### absoluteRenderBounds: [Rect](/docs/plugins/api/Rect/) | null \[readonly\]

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

The actual bounds of a node accounting for drop shadows, thick strokes, and anything else that may fall outside the node's regular bounding box defined in `x`, `y`, `width`, and `height`. The `x` and `y` inside this property represent the absolute position of the node on the page. This value will be `null` if the node is invisible.

* * *

### absoluteTransform: [Transform](/docs/plugins/api/Transform/) \[readonly\]

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

The position of a node relative to its **containing page** as a [`Transform`](/docs/plugins/api/Transform/) matrix.

* * *

### addComponentProperty(propertyName: string, type: [ComponentPropertyType](/docs/plugins/api/ComponentPropertyType/), defaultValue: string | boolean | [VariableAlias](/docs/plugins/api/VariableAlias/), options?: [ComponentPropertyOptions](/docs/plugins/api/ComponentPropertyOptions/)): string

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)

Adds a new component property to this node and returns the property name with its unique identifier suffixed. This function supports properties with type `'BOOLEAN'`, `'TEXT'`, `'INSTANCE_SWAP'` or `'VARIANT'`.

* * *

### addDevResourceAsync(url: string, name?: string): Promise<void>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Adds a dev resource to a node. This will fail if the node already has a dev resource with the same url.

[View more →](/docs/plugins/api/properties/nodes-adddevresourceasync/)

* * *

### addMeasurement(start: { node: [SceneNode](/docs/plugins/api/nodes/#scene-node); side: [MeasurementSide](/docs/plugins/api/MeasurementSide/) }, end: { node: [SceneNode](/docs/plugins/api/nodes/#scene-node); side: [MeasurementSide](/docs/plugins/api/MeasurementSide/) }, options?: { offset: [MeasurementOffset](/docs/plugins/api/MeasurementOffset/); freeText: string }): [Measurement](/docs/plugins/api/Measurement/)

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

Adds a measurement between two nodes in the current page.

Measurements are always between a start and end node. The side indicates which edge of the node to draw the measurement from.

Measurements can only go on the same axis, i.e. from side `"LEFT"` -> `"LEFT"`, `"LEFT"` -> `"RIGHT"`, `"TOP"` -> `"BOTTOM"` etc. But not `"LEFT"` -> `"TOP"`.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

### annotations: ReadonlyArray<[Annotation](/docs/plugins/api/Annotation/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

Annotations on the node.

Learn more about annotations in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935) or see the [Annotation type](/docs/plugins/api/Annotation/) for usage examples.

* * *

### [appendChild](/docs/plugins/api/properties/nodes-appendchild/)(child: [SceneNode](/docs/plugins/api/nodes/#scene-node)): void

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Adds a new child to the end of the [`children`](/docs/plugins/api/properties/nodes-children/) array. That is, visually on top of all other children.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-appendchild/)

* * *

### [appendChildAt](/docs/plugins/api/properties/nodes-appendchildat/)(node: [SceneNode](/docs/plugins/api/nodes/#scene-node), rowIndex: number, columnIndex: number): void

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Appends a node to the grid at the specified row and column index.

[View more →](/docs/plugins/api/properties/nodes-appendchildat/)

* * *

### attachedConnectors: [ConnectorNode](/docs/plugins/api/ConnectorNode/)\[\] \[readonly\]

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

An array of `ConnectorNode`s that are attached to a node.

* * *

### backgroundStyleId: string

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

**DEPRECATED:** Use `fillStyleId` instead. This property is read-only if the manifest contains `"documentAccess": "dynamic-page"`.

* * *

### backgrounds: ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

**DEPRECATED:** Use `fills` instead.

* * *

### blendMode: [BlendMode](/docs/plugins/api/BlendMode/)

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Blend mode of this node, as shown in the Layer panel. In addition to the blend modes that paints & effects support, the layer blend mode can also have the value PASS\_THROUGH.

* * *

### bottomLeftRadius: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

* * *

### bottomRightRadius: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

* * *

### boundVariables?: { readonly \[field in [VariableBindableNodeField](/docs/plugins/api/VariableBindableNodeField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)} & { readonly \[field in [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]} & { fills: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; strokes: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; effects: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; layoutGrids: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; componentProperties: { \[propertyName: string\]: [VariableAlias](/docs/plugins/api/VariableAlias/) }; textRangeFills: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\] } \[readonly\]

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

The variables bound to a particular field on this node. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to get and set variable bindings.

* * *

### [characters](/docs/plugins/api/properties/TextNode-characters/): string

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The raw characters in the text node. Setting this property requires the font the be loaded.

[View more →](/docs/plugins/api/properties/TextNode-characters/)

* * *

### [children](/docs/plugins/api/properties/nodes-children/): ReadonlyArray<[SceneNode](/docs/plugins/api/nodes/#scene-node)\> \[readonly\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

The list of children, sorted back-to-front. That is, the first child in the array is the bottommost layer on the screen, and the last child in the array is the topmost layer.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this property.

[View more →](/docs/plugins/api/properties/nodes-children/)

* * *

### clearExplicitVariableModeForCollection(collection: [VariableCollection](/docs/plugins/api/VariableCollection/)): void

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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Clears an explicit mode for the given collection on this node

[View more →](/docs/plugins/api/properties/ExplicitVariableModesMixin-clearexplicitvariablemodeforcollection/)

* * *

### clipsContent: boolean

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Whether the frame clips its contents. That is, whether layers inside the frame are visible outside the bounds of the frame.

* * *

### [componentPropertyDefinitions](/docs/plugins/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/): [ComponentPropertyDefinitions](/docs/plugins/api/ComponentPropertyDefinitions/) \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)

All component properties and their default values that exist on this component set. `'VARIANT'` properties will also have a list of all variant options. `'BOOLEAN'`, `'TEXT'`, and `'INSTANCE_SWAP'` properties will have their names suffixed by a unique identifier starting with `'#'`, which is helpful for quickly distinguishing multiple component properties that have the same name in the Figma UI. The entire property name should be used for all Component property-related API methods and properties.

[View more →](/docs/plugins/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/)

* * *

### componentPropertyReferences: { \[nodeProperty in 'visible' | 'characters' | 'mainComponent'\]?: string} | null

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

All component properties that are attached on this node. A node can only have `componentPropertyReferences` if it is a component sublayer or an instance sublayer. It will be `null` otherwise. The value in the key-value pair refers to the component property name as returned by `componentPropertyDefinitions` on the containing component, component set or main component (for instances).

* * *

### constrainProportions: boolean

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

**DEPRECATED:** Use `targetAspectRatio`, `lockAspectRatio`, and `unlockAspectRatio` instead.

When toggled, causes the layer to keep its proportions when the user resizes it via the properties panel.

* * *

### [constraints](/docs/plugins/api/properties/nodes-constraints/): [Constraints](/docs/plugins/api/Constraints/)

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

Constraints of this node relative to its containing [`FrameNode`](/docs/plugins/api/FrameNode/), if any.

[View more →](/docs/plugins/api/properties/nodes-constraints/)

* * *

### [cornerRadius](/docs/plugins/api/properties/nodes-cornerradius/): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

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

The number of pixels to round the corners of the object by.

[View more →](/docs/plugins/api/properties/nodes-cornerradius/)

* * *

### [cornerSmoothing](/docs/plugins/api/properties/nodes-cornersmoothing/): number

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

A value that lets you control how "smooth" the corners are. Ranges from 0 to 1.

[View more →](/docs/plugins/api/properties/nodes-cornersmoothing/)

* * *

### [counterAxisAlignContent](/docs/plugins/api/properties/nodes-counteraxisaligncontent/): 'AUTO' | 'SPACE\_BETWEEN'

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames with [`layoutWrap`](/docs/plugins/api/properties/nodes-layoutwrap/) set to `"WRAP"`. Determines how the wrapped tracks are spaced out inside of the auto-layout frame.

[View more →](/docs/plugins/api/properties/nodes-counteraxisaligncontent/)

* * *

### [counterAxisAlignItems](/docs/plugins/api/properties/nodes-counteraxisalignitems/): 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the counter axis direction.

[View more →](/docs/plugins/api/properties/nodes-counteraxisalignitems/)

* * *

### [counterAxisSizingMode](/docs/plugins/api/properties/nodes-counteraxissizingmode/): 'FIXED' | 'AUTO'

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames. Determines whether the counter axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](/docs/plugins/api/properties/nodes-counteraxissizingmode/)

* * *

### [counterAxisSpacing](/docs/plugins/api/properties/nodes-counteraxisspacing/): number | null

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames with [`layoutWrap`](/docs/plugins/api/properties/nodes-layoutwrap/) set to `"WRAP"`. Determines the distance between wrapped tracks. The value must be positive.

[View more →](/docs/plugins/api/properties/nodes-counteraxisspacing/)

* * *

### dashPattern: ReadonlyArray<number>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

A list of numbers specifying alternating dash and gap lengths, in pixels.

* * *

### [deleteCharacters](/docs/plugins/api/properties/TextNode-deletecharacters/)(start: number, end: number): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Remove characters in the text from `start` (inclusive) to `end` (exclusive).

[View more →](/docs/plugins/api/properties/TextNode-deletecharacters/)

* * *

### deleteComponentProperty(propertyName: string): void

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)

Deletes an existing component property on this node. This function only supports properties with type `'BOOLEAN'`, `'TEXT'`, or `'INSTANCE_SWAP'`.

* * *

### deleteDevResourceAsync(url: string): Promise<void>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Deletes a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](/docs/plugins/api/properties/nodes-deletedevresourceasync/)

* * *

### deleteMeasurement(id: string): void

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

Delete a measurement.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

### [description](/docs/plugins/api/properties/nodes-description/): string

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
*   [TextStyle](/docs/plugins/api/TextStyle/)

The plain-text annotation entered by the user for this style/component.

[View more →](/docs/plugins/api/properties/nodes-description/)

* * *

### [descriptionMarkdown](/docs/plugins/api/properties/nodes-descriptionmarkdown/): string

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
*   [TextStyle](/docs/plugins/api/TextStyle/)

The rich-text annotation entered by the user for this style/component.

[View more →](/docs/plugins/api/properties/nodes-descriptionmarkdown/)

* * *

### detachedInfo: [DetachedInfo](/docs/plugins/api/DetachedInfo/) | null \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Includes the id (for local components) or key (for library components) of the component the given node was detached from, if any. If the node isn't a detached instance, it will be null. If the node is a component or instance, it will be null.

* * *

### devStatus: [DevStatus](/docs/plugins/api/DevStatus/)

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Whether the node is marked [ready for development](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode#01H8CR3K6V9S02RK503QCX0367) or [completed](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode#01H8CR3K6V9S02RK503QCX0367).

There are some restrictions on how `devStatus` can be set:

*   Can only be set on a node directly under a page or section
*   Cannot be set on a node that is inside another node that already has a `devStatus`

* * *

### [documentationLinks](/docs/plugins/api/properties/nodes-documentationlinks/): ReadonlyArray<[DocumentationLink](/docs/plugins/api/DocumentationLink/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
*   [TextStyle](/docs/plugins/api/TextStyle/)

The documentation links for this style/component.

[View more →](/docs/plugins/api/properties/nodes-documentationlinks/)

* * *

### editComponentProperty(propertyName: string, newValue: { name: string; defaultValue: string | boolean | [VariableAlias](/docs/plugins/api/VariableAlias/); preferredValues: [InstanceSwapPreferredValue](/docs/plugins/api/InstanceSwapPreferredValue/)\[\] }): string

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)

Modifies the name, default value, or preferred values of an existing component property on this node and returns the property name with its unique identifier suffixed.

This function supports properties with type `'BOOLEAN'`, `'TEXT'`, `'INSTANCE_SWAP'`, or `'VARIANT'` with the following restrictions:

*   `name` is supported for all properties
*   `defaultValue` is supported for `'BOOLEAN'`, `'TEXT'`, and `'INSTANCE_SWAP'` properties, but not for `'VARIANT'` properties
*   `preferredValues` is only supported for `'INSTANCE_SWAP'` properties

* * *

### editDevResourceAsync(currentUrl: string, newValue: { name: string; url: string }): Promise<void>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Edits a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](/docs/plugins/api/properties/nodes-editdevresourceasync/)

* * *

### editMeasurement(id: string, newValue: { offset: [MeasurementOffset](/docs/plugins/api/MeasurementOffset/); freeText: string }): [Measurement](/docs/plugins/api/Measurement/)

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

Edit a measurement’s offset.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

### effectStyleId: string

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
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The id of the [`EffectStyle`](/docs/plugins/api/EffectStyle/) object that the properties of this node are linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setEffectStyleIdAsync` to update the style.

* * *

### effects: ReadonlyArray<[Effect](/docs/plugins/api/Effect/)\>

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
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Array of effects. See [`Effect`](/docs/plugins/api/Effect/) type. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

* * *

### expanded: boolean

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Whether this container is shown as expanded in the layers panel.

* * *

### explicitVariableModes: { \[collectionId: string\]: string }

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
*   [PageNode](/docs/plugins/api/PageNode/)
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

The explicitly set modes for this node. For `SceneNodes`, represents a subset of [`resolvedVariableModes`](/docs/plugins/api/properties/nodes-resolvedvariablemodes/). Note that this does not include [workspace and team-default modes](https://help.figma.com/hc/en-us/articles/12611253730071).

* * *

### exportAsync(settings?: [ExportSettings](/docs/plugins/api/ExportSettings/)): Promise<Uint8Array>

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
*   [PageNode](/docs/plugins/api/PageNode/)
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

### exportAsync(settings: [ExportSettingsSVGString](/docs/plugins/api/ExportSettings/#export-settings-svgstring)): Promise<string>

### exportAsync(settings: [ExportSettingsREST](/docs/plugins/api/ExportSettings/#export-settings-rest)): Promise<Object>

Exports the node as an encoded image.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-exportasync/)

* * *

### exportSettings: ReadonlyArray<[ExportSettings](/docs/plugins/api/ExportSettings/)\>

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
*   [PageNode](/docs/plugins/api/PageNode/)
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

List of export settings stored on the node. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

* * *

### fillGeometry: [VectorPaths](/docs/plugins/api/VectorPath/#vector-paths) \[readonly\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

An array of paths representing the object fills relative to the node.

* * *

### [fillStyleId](/docs/plugins/api/properties/nodes-fillstyleid/): string | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableCellNode](/docs/plugins/api/TableCellNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The id of the [`PaintStyle`](/docs/plugins/api/PaintStyle/) object that the [`fills`](/docs/plugins/api/properties/nodes-fills/) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

[View more →](/docs/plugins/api/properties/nodes-fillstyleid/)

* * *

### [fills](/docs/plugins/api/properties/nodes-fills/): ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\> | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableCellNode](/docs/plugins/api/TableCellNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

[View more →](/docs/plugins/api/properties/nodes-fills/)

* * *

### [findAll](/docs/plugins/api/properties/nodes-findall/)(callback?: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findall/)

* * *

### [findAllWithCriteria](/docs/plugins/api/properties/nodes-findallwithcriteria/)<T extends NodeType\[\]>(criteria: [FindAllCriteria](/docs/plugins/api/FindAllCriteria/)<T>): Array<{ type: T\[number\] } & [SceneNode](/docs/plugins/api/nodes/#scene-node)\>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes that satisfy all of specified criteria.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findallwithcriteria/)

* * *

### [findChild](/docs/plugins/api/properties/nodes-findchild/)(callback: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Searches the immediate children of this node (i.e. not including the children's children). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findchild/)

* * *

### [findChildren](/docs/plugins/api/properties/nodes-findchildren/)(callback?: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Searches the immediate children of this node (i.e. not including the children's children). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findchildren/)

* * *

### [findOne](/docs/plugins/api/properties/nodes-findone/)(callback: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Searches this entire subtree (this node's children, its children's children, etc). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findone/)

* * *

### [findWidgetNodesByWidgetId](/docs/plugins/api/properties/nodes-findwidgetnodesbywidgetid/)(widgetId: string): Array<[WidgetNode](/docs/plugins/api/WidgetNode/)\>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Searches this entire subtree (this node's children, its children's children, etc). Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findwidgetnodesbywidgetid/)

* * *

### fontName: [FontName](/docs/plugins/api/FontName/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The font family (e.g. "Inter"), and font style (e.g. "Regular"). Setting this property to a different value requires the new font to be loaded.

* * *

### fontSize: number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The size of the font. Has minimum value of 1.

* * *

### fontWeight: number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) \[readonly\]

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The weight of the font (e.g. 400 for "Regular", 700 for "Bold").

* * *

### getCSSAsync(): Promise<{ \[key: string\]: string }>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Resolves to a JSON object of CSS properties of the node. This is the same CSS that Figma shows in the inspect panel and is helpful if you are building a [plugin for code generation](/docs/plugins/codegen-plugins/).

* * *

### getDevResourcesAsync(options?: { includeChildren: boolean }): Promise<[DevResourceWithNodeId](/docs/plugins/api/DevResource/#dev-resource-with-node-id)\[\]>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Gets all of the dev resources on a node. This includes any inherited dev resources from components and component sets.

[View more →](/docs/plugins/api/properties/nodes-getdevresourcesasync/)

* * *

### getMeasurements(): [Measurement](/docs/plugins/api/Measurement/)\[\]

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

Get all measurements in the current page.

Learn more about measurements in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935).

* * *

### getMeasurementsForNode(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [Measurement](/docs/plugins/api/Measurement/)\[\]

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

Get all measurements pointing to a node in the current page. This includes all measurements whose start _or_ end node is the node passed in.

* * *

### getPluginData(key: string): string

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
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
*   [TextStyle](/docs/plugins/api/TextStyle/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [Variable](/docs/plugins/api/Variable/)
*   [VariableCollection](/docs/plugins/api/VariableCollection/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

Retrieves custom information that was stored on this node or style using [`setPluginData`](/docs/plugins/api/properties/nodes-setplugindata/). If there is no data stored for the provided key, an empty string is returned.

* * *

### getPluginDataKeys(): string\[\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
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
*   [TextStyle](/docs/plugins/api/TextStyle/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [Variable](/docs/plugins/api/Variable/)
*   [VariableCollection](/docs/plugins/api/VariableCollection/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

Retrieves a list of all keys stored on this node or style using using [`setPluginData`](/docs/plugins/api/properties/nodes-setplugindata/). This enables iterating through all data stored privately on a node or style by your plugin.

* * *

### getPublishStatusAsync(): Promise<[PublishStatus](/docs/plugins/api/PublishStatus/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
*   [TextStyle](/docs/plugins/api/TextStyle/)

Gets the status of this style/component in the team library.

* * *

### getRangeAllFontNames(start: number, end: number): [FontName](/docs/plugins/api/FontName/)\[\]

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `fontName`s from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeBoundVariable(start: number, end: number, field: [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/)): [VariableAlias](/docs/plugins/api/VariableAlias/) | null | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `boundVariable` for a given field from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeFillStyleId(start: number, end: number): string | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `fillStyleId` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeFills(start: number, end: number): [Paint](/docs/plugins/api/Paint/)\[\] | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `fills` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeFontName(start: number, end: number): [FontName](/docs/plugins/api/FontName/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `fontName` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeFontSize(start: number, end: number): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `fontSize` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeFontWeight(start: number, end: number): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `fontWeight` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeHyperlink(start: number, end: number): [HyperlinkTarget](/docs/plugins/api/HyperlinkTarget/) | null | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `hyperlink` from characters in range `start` (inclusive) to `end` (exclusive). Returns a [`HyperlinkTarget`](/docs/plugins/api/HyperlinkTarget/) if the range contains exactly one hyperlink, or `null` if the range contains none.

* * *

### getRangeIndentation(start: number, end: number): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `indentation` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeLetterSpacing(start: number, end: number): [LetterSpacing](/docs/plugins/api/LetterSpacing/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `letterSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeLineHeight(start: number, end: number): [LineHeight](/docs/plugins/api/LineHeight/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeListOptions(start: number, end: number): [TextListOptions](/docs/plugins/api/TextListOptions/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textListOptions` from characters in range `start` (inclusive) to `end` (exclusive). Returns a [`TextListOptions`](/docs/plugins/api/TextListOptions/)

* * *

### getRangeListSpacing(start: number, end: number): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `listSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeOpenTypeFeatures(start: number, end: number): { readonly \[feature in [OpenTypeFeature](/docs/plugins/api/OpenTypeFeature/)\]: boolean} | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the [`openTypeFeatures`](/docs/plugins/api/properties/TextNode-opentypefeatures/) from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeParagraphIndent(start: number, end: number): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `paragraphIndent` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeParagraphSpacing(start: number, end: number): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `paragraphSpacing` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextCase(start: number, end: number): [TextCase](/docs/plugins/api/TextCase/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textCase` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextDecoration(start: number, end: number): [TextDecoration](/docs/plugins/api/TextDecoration/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textDecoration` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextDecorationColor(start: number, end: number): [TextDecorationColor](/docs/plugins/api/TextDecorationColor/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textDecorationColor` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextDecorationOffset(start: number, end: number): [TextDecorationOffset](/docs/plugins/api/TextDecorationOffset/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textDecorationOffset` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextDecorationSkipInk(start: number, end: number): boolean | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textDecorationSkipInk` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextDecorationStyle(start: number, end: number): [TextDecorationStyle](/docs/plugins/api/TextDecorationStyle/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textDecorationStyle` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextDecorationThickness(start: number, end: number): [TextDecorationThickness](/docs/plugins/api/TextDecorationThickness/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textDecorationThickness` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRangeTextStyleId(start: number, end: number): string | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get the `textStyleId` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### getRelaunchData(): { \[command: string\]: string }

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Retreives the reluanch data stored on this node using [`setRelaunchData`](/docs/plugins/api/properties/nodes-setrelaunchdata/)

* * *

### getSharedPluginData(namespace: string, key: string): string

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
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
*   [TextStyle](/docs/plugins/api/TextStyle/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [Variable](/docs/plugins/api/Variable/)
*   [VariableCollection](/docs/plugins/api/VariableCollection/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

Retrieves custom information that was stored on this node or style using [`setSharedPluginData`](/docs/plugins/api/properties/nodes-setsharedplugindata/). If there is no data stored for the provided namespace and key, an empty string is returned.

* * *

### getSharedPluginDataKeys(namespace: string): string\[\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
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
*   [TextStyle](/docs/plugins/api/TextStyle/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [Variable](/docs/plugins/api/Variable/)
*   [VariableCollection](/docs/plugins/api/VariableCollection/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

Retrieves a list of all keys stored on this node or style using [`setSharedPluginData`](/docs/plugins/api/properties/nodes-setsharedplugindata/). This enables iterating through all data stored in a given namespace.

* * *

### [getStyledTextSegments](/docs/plugins/api/properties/TextNode-getstyledtextsegments/)<StyledTextSegmentFields extends (keyof Omit< StyledTextSegment, 'characters' | 'start' | 'end' >)\[\]>(fields: StyledTextSegmentFields, start?: number, end?: number): Array<Pick<[StyledTextSegment](/docs/plugins/api/StyledTextSegment/), StyledTextSegmentFields\[number\] | 'characters' | 'start' | 'end'>>

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Get text segments along with the desired text properties (font size, text case, etc...)

[View more →](/docs/plugins/api/properties/TextNode-getstyledtextsegments/)

* * *

### getTopLevelFrame(): [FrameNode](/docs/plugins/api/FrameNode/) | undefined

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Returns the top-most frame that contains this node. If the node is not inside a frame, this will return undefined.

info

This function will only work in Figma Design and will throw an error if called in FigJam or Slides.

* * *

### [gridChildHorizontalAlign](/docs/plugins/api/properties/nodes-gridchildhorizontalalign/): 'MIN' | 'CENTER' | 'MAX' | 'AUTO'

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

Applicable only on direct children of grid auto-layout frames. Controls the horizontal alignment of the node within its grid cell.

[View more →](/docs/plugins/api/properties/nodes-gridchildhorizontalalign/)

* * *

### [gridChildVerticalAlign](/docs/plugins/api/properties/nodes-gridchildverticalalign/): 'MIN' | 'CENTER' | 'MAX' | 'AUTO'

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

Applicable only on direct children of grid auto-layout frames. Controls the vertical alignment of the node within its grid cell.

[View more →](/docs/plugins/api/properties/nodes-gridchildverticalalign/)

* * *

### [gridColumnAnchorIndex](/docs/plugins/api/properties/nodes-gridcolumnanchorindex/): number \[readonly\]

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

Applicable only on direct children of grid auto-layout frames. Determines the starting column index for this node within the parent grid.

[View more →](/docs/plugins/api/properties/nodes-gridcolumnanchorindex/)

* * *

### [gridColumnCount](/docs/plugins/api/properties/nodes-gridcolumncount/): number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the number of columns in the grid.

[View more →](/docs/plugins/api/properties/nodes-gridcolumncount/)

* * *

### [gridColumnGap](/docs/plugins/api/properties/nodes-gridcolumngap/): number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the gap between columns in the grid.

[View more →](/docs/plugins/api/properties/nodes-gridcolumngap/)

* * *

### [gridColumnSizes](/docs/plugins/api/properties/nodes-gridcolumnsizes/): Array<[GridTrackSize](/docs/plugins/api/GridTrackSize/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`. Returns an array of [`GridTrackSize`](/docs/plugins/api/GridTrackSize/) objects representing the columns in the grid in order.

[View more →](/docs/plugins/api/properties/nodes-gridcolumnsizes/)

* * *

### [gridColumnSpan](/docs/plugins/api/properties/nodes-gridcolumnspan/): number

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

Applicable only on direct children of grid auto-layout frames. Determines the number of columns this node will span within the parent grid.

[View more →](/docs/plugins/api/properties/nodes-gridcolumnspan/)

* * *

### [gridRowAnchorIndex](/docs/plugins/api/properties/nodes-gridrowanchorindex/): number \[readonly\]

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

Applicable only on direct children of grid auto-layout frames. Determines the starting row index for this node within the parent grid.

[View more →](/docs/plugins/api/properties/nodes-gridrowanchorindex/)

* * *

### [gridRowCount](/docs/plugins/api/properties/nodes-gridrowcount/): number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the number of rows in the grid.

[View more →](/docs/plugins/api/properties/nodes-gridrowcount/)

* * *

### [gridRowGap](/docs/plugins/api/properties/nodes-gridrowgap/): number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the gap between rows in the grid.

[View more →](/docs/plugins/api/properties/nodes-gridrowgap/)

* * *

### [gridRowSizes](/docs/plugins/api/properties/nodes-gridrowsizes/): Array<[GridTrackSize](/docs/plugins/api/GridTrackSize/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`. Returns an array of [`GridTrackSize`](/docs/plugins/api/GridTrackSize/) objects representing the rows in the grid in order.

[View more →](/docs/plugins/api/properties/nodes-gridrowsizes/)

* * *

### [gridRowSpan](/docs/plugins/api/properties/nodes-gridrowspan/): number

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

Applicable only on direct children of grid auto-layout frames. Determines the number of rows this node will span within the parent grid.

[View more →](/docs/plugins/api/properties/nodes-gridrowspan/)

* * *

### gridStyleId: string

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

The id of the [`GridStyle`](/docs/plugins/api/GridStyle/) object that the [`layoutGrids`](/docs/plugins/api/node-properties/#layoutgrids) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setGridStyleIdAsync` to update the style.

* * *

### guides: ReadonlyArray<[Guide](/docs/plugins/api/Guide/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Array of [`Guide`](/docs/plugins/api/Guide/) used inside the frame. Note that each frame has its own guides, separate from the canvas-wide guides. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

* * *

### handleMirroring: [HandleMirroring](/docs/plugins/api/HandleMirroring/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

Whether the vector handles are mirrored or independent.

* * *

### hangingList: boolean

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Whether numbered list counters or unordered list bullets hang outside the text box.

* * *

### hangingPunctuation: boolean

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Whether punctuation, like quotation marks, hangs outside the text box.

* * *

### hasMissingFont: boolean \[readonly\]

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Returns whether the text uses a font currently not available to the document.

* * *

### height: number \[readonly\]

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

The height of the node. Use a resizing method to change this value.

* * *

### horizontalPadding: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

**DEPRECATED:** Use `paddingLeft` and `paddingRight` instead.

* * *

### hyperlink: [HyperlinkTarget](/docs/plugins/api/HyperlinkTarget/) | null | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

A [`HyperlinkTarget`](/docs/plugins/api/HyperlinkTarget/) if the text node has exactly one hyperlink, or `null` if the node has none.

* * *

### [id](/docs/plugins/api/properties/nodes-id/): string \[readonly\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

The unique identifier of a node. For example, `1:3`. The node id can be used with methods such as [`figma.getNodeByIdAsync`](/docs/plugins/api/figma/#getnodebyidasync), but plugins typically don't need to use this since you can usually just access a node directly.

[View more →](/docs/plugins/api/properties/nodes-id/)

* * *

### inferredAutoLayout: [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/) | null

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Returns inferred auto layout properties of a [`FrameNode`](/docs/plugins/api/FrameNode/) if applicable. Otherwise, returns `null`.

This is what Figma uses to power Dev Mode’s [code snippets](https://help.figma.com/hc/en-us/articles/15023124644247#Build_faster_with_customizable_code_snippets) feature, as it makes sure the generated code is more useful.

info

This method uses a heuristic to infer the auto layout properties.

* * *

### [inferredVariables](/docs/plugins/api/properties/nodes-inferredvariables/)?: { readonly \[field in [VariableBindableNodeField](/docs/plugins/api/VariableBindableNodeField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]} & { fills: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]\[\]; strokes: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]\[\] } \[readonly\]

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

An object, keyed by field, returning any variables that match the raw value of that field for the mode of the node (or the default variable value if no mode is set)

[View more →](/docs/plugins/api/properties/nodes-inferredvariables/)

* * *

### [insertCharacters](/docs/plugins/api/properties/TextNode-insertcharacters/)(start: number, characters: string, useStyle?: 'BEFORE' | 'AFTER'): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Insert `characters` at index `start` in the text.

[View more →](/docs/plugins/api/properties/TextNode-insertcharacters/)

* * *

### [insertChild](/docs/plugins/api/properties/nodes-insertchild/)(index: number, child: [SceneNode](/docs/plugins/api/nodes/#scene-node)): void

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

Adds a new child at the specified index in the [`children`](/docs/plugins/api/properties/nodes-children/) array.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-insertchild/)

* * *

### isAsset: boolean \[readonly\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Returns true if Figma detects that a node is an asset, otherwise returns false. An asset is is either an icon or a raster image.

This property is useful if you're building a [plugin for code generation](/docs/plugins/codegen-plugins/).

info

This property uses a set of heuristics to determine if a node is an asset. At a high level an icon is a small vector graphic and an image is a node with an image fill.

* * *

### [isMask](/docs/plugins/api/properties/nodes-ismask/): boolean

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
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Whether this node is a mask. A mask node masks its subsequent siblings.

[View more →](/docs/plugins/api/properties/nodes-ismask/)

* * *

### [itemReverseZIndex](/docs/plugins/api/properties/nodes-itemreversezindex/): boolean

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines the [canvas stacking order](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties#Canvas_stacking_order) of layers in this frame. When true, the first layer will be draw on top.

[View more →](/docs/plugins/api/properties/nodes-itemreversezindex/)

* * *

### [itemSpacing](/docs/plugins/api/properties/nodes-itemspacing/): number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines distance between children of the frame.

[View more →](/docs/plugins/api/properties/nodes-itemspacing/)

* * *

### key: string \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
*   [TextStyle](/docs/plugins/api/TextStyle/)

The key to use with [`figma.importComponentByKeyAsync`](/docs/plugins/api/figma/#importcomponentbykeyasync), [`figma.importComponentSetByKeyAsync`](/docs/plugins/api/figma/#importcomponentsetbykeyasync) and [`figma.importStyleByKeyAsync`](/docs/plugins/api/figma/#importstylebykeyasync). Note that while this key is present on local and published components, you can only import components that are already published.

* * *

### [layoutAlign](/docs/plugins/api/properties/nodes-layoutalign/): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT'

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

Applicable only on direct children of auto-layout frames. Determines if the layer should stretch along the parent’s counter axis. Defaults to `“INHERIT”`.

[View more →](/docs/plugins/api/properties/nodes-layoutalign/)

* * *

### layoutGrids: ReadonlyArray<[LayoutGrid](/docs/plugins/api/LayoutGrid/)\>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Array of [`LayoutGrid`](/docs/plugins/api/LayoutGrid/) objects used as layout grids on this node. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

* * *

### [layoutGrow](/docs/plugins/api/properties/nodes-layoutgrow/): number

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

This property is applicable only for direct children of auto-layout frames. Determines whether a layer should stretch along the parent’s primary axis. 0 corresponds to a fixed size and 1 corresponds to stretch.

[View more →](/docs/plugins/api/properties/nodes-layoutgrow/)

* * *

### [layoutMode](/docs/plugins/api/properties/nodes-layoutmode/): 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Determines whether this layer uses auto-layout to position its children. Defaults to "NONE".

[View more →](/docs/plugins/api/properties/nodes-layoutmode/)

* * *

### [layoutPositioning](/docs/plugins/api/properties/nodes-layoutpositioning/): 'AUTO' | 'ABSOLUTE'

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

This property is applicable only for direct children of auto-layout frames. Determines whether a layer's size and position should be dermined by auto-layout settings or manually adjustable.

[View more →](/docs/plugins/api/properties/nodes-layoutpositioning/)

* * *

### [layoutSizingHorizontal](/docs/plugins/api/properties/nodes-layoutsizinghorizontal/): 'FIXED' | 'HUG' | 'FILL'

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

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/), [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/), [`primaryAxisSizingMode`](/docs/plugins/api/properties/nodes-primaryaxissizingmode/), and [`counterAxisSizingMode`](/docs/plugins/api/properties/nodes-counteraxissizingmode/). This field maps directly to the "Horizontal sizing" dropdown in the Figma UI.

[View more →](/docs/plugins/api/properties/nodes-layoutsizinghorizontal/)

* * *

### [layoutSizingVertical](/docs/plugins/api/properties/nodes-layoutsizingvertical/): 'FIXED' | 'HUG' | 'FILL'

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

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](/docs/plugins/api/properties/nodes-layoutgrow/), [`layoutAlign`](/docs/plugins/api/properties/nodes-layoutalign/), [`primaryAxisSizingMode`](/docs/plugins/api/properties/nodes-primaryaxissizingmode/), and [`counterAxisSizingMode`](/docs/plugins/api/properties/nodes-counteraxissizingmode/). This field maps directly to the "Vertical sizing" dropdown in the Figma UI.

[View more →](/docs/plugins/api/properties/nodes-layoutsizingvertical/)

* * *

### [layoutWrap](/docs/plugins/api/properties/nodes-layoutwrap/): 'NO\_WRAP' | 'WRAP'

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Determines whether this layer should use wrapping auto-layout. Defaults to `"NO_WRAP"`.

[View more →](/docs/plugins/api/properties/nodes-layoutwrap/)

* * *

### leadingTrim: [LeadingTrim](/docs/plugins/api/LeadingTrim/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The removal of the vertical space above and below text glyphs. Requires the font to be loaded.

* * *

### letterSpacing: [LetterSpacing](/docs/plugins/api/LetterSpacing/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The spacing between the individual characters. Requires the font to be loaded.

* * *

### lineHeight: [LineHeight](/docs/plugins/api/LineHeight/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The spacing between the lines in a paragraph of text. Requires the font to be loaded.

* * *

### listSpacing: number

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The vertical distance between lines of a list.

* * *

### lockAspectRatio(): void

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

Locks the node's `targetAspectRatio` to the current ratio of its width and height.

* * *

### [locked](/docs/plugins/api/properties/nodes-locked/): boolean

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

Whether the node is locked or not, preventing certain user interactions on the canvas such as selecting and dragging. Does not affect a plugin's ability to write to those properties.

[View more →](/docs/plugins/api/properties/nodes-locked/)

* * *

### maskType: [MaskType](/docs/plugins/api/MaskType/)

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
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Type of masking to use if this node is a mask. Defaults to `"ALPHA"`. You must check `isMask` to verify that this is a mask; changing `maskType` does not automatically turn on `isMask`, and a node that is not a mask can still have a `maskType`.

* * *

### maxHeight: number | null

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

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxHeight`.

* * *

### maxWidth: number | null

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

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxWidth`.

* * *

### minHeight: number | null

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

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to null to remove `minHeight`.

* * *

### minWidth: number | null

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

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `minWidth`.

* * *

### [name](/docs/plugins/api/properties/nodes-name/): string

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

The name of the layer that appears in the layers panel. Calling `figma.root.name` will return the name, read-only, of the current file.

[View more →](/docs/plugins/api/properties/nodes-name/)

* * *

### [numberOfFixedChildren](/docs/plugins/api/properties/nodes-numberoffixedchildren/): number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

Determines which children of the frame are fixed children in a scrolling frame.

[View more →](/docs/plugins/api/properties/nodes-numberoffixedchildren/)

* * *

### opacity: number

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Opacity of the node, as shown in the Layer panel. Must be between 0 and 1.

* * *

### [openTypeFeatures](/docs/plugins/api/properties/TextNode-opentypefeatures/): { readonly \[feature in [OpenTypeFeature](/docs/plugins/api/OpenTypeFeature/)\]: boolean} | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) \[readonly\]

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

[OpenType features](https://help.figma.com/hc/en-us/articles/4913951097367) that have been explicitly enabled or disabled.

[View more →](/docs/plugins/api/properties/TextNode-opentypefeatures/)

* * *

### outlineStroke(): [VectorNode](/docs/plugins/api/VectorNode/) | null

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

This method performs an action similar to using the "Outline Stroke" function in the editor from the right-click menu. However, this method creates and returns a new node while leaving the original intact. Returns `null` if the node has no strokes.

* * *

### [overflowDirection](/docs/plugins/api/properties/nodes-overflowdirection/): [OverflowDirection](/docs/plugins/api/OverflowDirection/)

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

Determines whether a frame will scroll in presentation mode when the frame contains content that exceed the frame's bounds. Reflects the value shown in "Overflow Behavior" in the Prototype tab.

[View more →](/docs/plugins/api/properties/nodes-overflowdirection/)

* * *

### overlayBackground: [OverlayBackground](/docs/plugins/api/Overlay/#overlay-background) \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

How this frame obscures the content under it when opened as an overlay.

* * *

### overlayBackgroundInteraction: [OverlayBackgroundInteraction](/docs/plugins/api/Overlay/#overlay-background-interaction) \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

How the user can interact with the content under this frame when opened as an overlay.

* * *

### overlayPositionType: [OverlayPositionType](/docs/plugins/api/Overlay/#overlay-position-type) \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

How this frame is positioned when opened as an overlay.

* * *

### paddingBottom: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames. Determines the bottom padding between the border of the frame and its children.

* * *

### paddingLeft: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames. Determines the left padding between the border of the frame and its children.

* * *

### paddingRight: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames. Determines the right padding between the border of the frame and its children.

* * *

### paddingTop: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames. Determines the top padding between the border of the frame and its children.

* * *

### paragraphIndent: number

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The indentation of paragraphs (offset of the first line from the left). Setting this property requires the font the be loaded.

* * *

### paragraphSpacing: number

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The vertical distance between paragraphs. Setting this property requires the font to be loaded.

* * *

### [parent](/docs/plugins/api/properties/nodes-parent/): ([BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin)) | null \[readonly\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](/docs/plugins/api/properties/nodes-appendchild/).

[View more →](/docs/plugins/api/properties/nodes-parent/)

* * *

### [primaryAxisAlignItems](/docs/plugins/api/properties/nodes-primaryaxisalignitems/): 'MIN' | 'MAX' | 'CENTER' | 'SPACE\_BETWEEN'

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the primary axis direction.

[View more →](/docs/plugins/api/properties/nodes-primaryaxisalignitems/)

* * *

### [primaryAxisSizingMode](/docs/plugins/api/properties/nodes-primaryaxissizingmode/): 'FIXED' | 'AUTO'

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames. Determines whether the primary axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](/docs/plugins/api/properties/nodes-primaryaxissizingmode/)

* * *

### [reactions](/docs/plugins/api/properties/nodes-reactions/): ReadonlyArray<[Reaction](/docs/plugins/api/Reaction/)\>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

List of [Reactions](/docs/plugins/api/Reaction/) on this node, which includes both the method of interaction with this node in a prototype, and the behavior of that interaction. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setReactionsAsync` to update the value.

[View more →](/docs/plugins/api/properties/nodes-reactions/)

* * *

### [relativeTransform](/docs/plugins/api/properties/nodes-relativetransform/): [Transform](/docs/plugins/api/Transform/)

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

The position of a node relative to its **containing parent** as a [`Transform`](/docs/plugins/api/Transform/) matrix. Not used for scaling, see `width` and `height` instead. Read the details page to understand the nuances of this property.

[View more →](/docs/plugins/api/properties/nodes-relativetransform/)

* * *

### remote: boolean \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
*   [TextStyle](/docs/plugins/api/TextStyle/)

Whether this style/component is a remote style/component that doesn't live in the file (i.e. is from the team library). Remote components are read-only: attempts to change their properties will throw.

* * *

### [remove](/docs/plugins/api/properties/nodes-remove/)(): void

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Removes this node and **all of its children** from the document.

[View more →](/docs/plugins/api/properties/nodes-remove/)

* * *

### [removed](/docs/plugins/api/properties/nodes-removed/): boolean \[readonly\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Returns true if this node has been removed since it was first accessed. If your plugin stays open for a while and stores references to nodes, you should write your code defensively and check that the nodes haven't been removed by the user.

[View more →](/docs/plugins/api/properties/nodes-removed/)

* * *

### [rescale](/docs/plugins/api/properties/nodes-rescale/)(scale: number): void

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

Rescales the node. This API function is the equivalent of using the Scale Tool from the toolbar.

[View more →](/docs/plugins/api/properties/nodes-rescale/)

* * *

### [resize](/docs/plugins/api/properties/nodes-resize/)(width: number, height: number): void

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

Resizes the node. If the node contains children with constraints, it applies those constraints during resizing. If the parent has auto-layout, causes the parent to be resized.

[View more →](/docs/plugins/api/properties/nodes-resize/)

* * *

### [resizeWithoutConstraints](/docs/plugins/api/properties/nodes-resizewithoutconstraints/)(width: number, height: number): void

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

Resizes the node. Children of the node are never resized, even if those children have constraints. If the parent has auto-layout, causes the parent to be resized (this constraint cannot be ignored).

[View more →](/docs/plugins/api/properties/nodes-resizewithoutconstraints/)

* * *

### [resolvedVariableModes](/docs/plugins/api/properties/nodes-resolvedvariablemodes/): { \[collectionId: string\]: string }

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

The resolved mode for this node for each variable collection in this file.

[View more →](/docs/plugins/api/properties/nodes-resolvedvariablemodes/)

* * *

### [rotation](/docs/plugins/api/properties/nodes-rotation/): number

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

The rotation of the node in degrees. Returns values from -180 to 180. Identical to `Math.atan2(-m10, m00)` in the [`relativeTransform`](/docs/plugins/api/properties/nodes-relativetransform/) matrix. When setting `rotation`, it will also set `m00`, `m01`, `m10`, `m11`.

[View more →](/docs/plugins/api/properties/nodes-rotation/)

* * *

### setBoundVariable(field: [VariableBindableNodeField](/docs/plugins/api/VariableBindableNodeField/) | [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/), variable: [Variable](/docs/plugins/api/Variable/) | null): void

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

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

[View more →](/docs/plugins/api/properties/nodes-setboundvariable/)

* * *

### setDevResourcePreviewAsync(url: string, preview: PlainTextElement): Promise<void>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

caution

This is a private API only available to [Figma partners](https://www.figma.com/partners/)

* * *

### setEffectStyleIdAsync(styleId: string): Promise<void>

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
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Set the [`EffectStyle`](/docs/plugins/api/EffectStyle/) that the properties of this node are linked to.

* * *

### setExplicitVariableModeForCollection(collection: [VariableCollection](/docs/plugins/api/VariableCollection/), modeId: string): void

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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Sets an explicit mode for the given collection on this node

[View more →](/docs/plugins/api/properties/ExplicitVariableModesMixin-setexplicitvariablemodeforcollection/)

* * *

### setFillStyleIdAsync(styleId: string): Promise<void>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableCellNode](/docs/plugins/api/TableCellNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Sets the [`PaintStyle`](/docs/plugins/api/PaintStyle/) that the [`fills`](/docs/plugins/api/properties/nodes-fills/) property of this node is linked to.

* * *

### [setGridChildPosition](/docs/plugins/api/properties/nodes-setgridchildposition/)(rowIndex: number, columnIndex: number): void

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

Applicable only on direct children of 'GRID' auto-layout frames. Sets the position of the node

[View more →](/docs/plugins/api/properties/nodes-setgridchildposition/)

* * *

### setGridStyleIdAsync(styleId: string): Promise<void>

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Set the [`GridStyle`](/docs/plugins/api/GridStyle/) that the [`layoutGrids`](/docs/plugins/api/node-properties/#layoutgrids) property of this node is linked to.

* * *

### [setPluginData](/docs/plugins/api/properties/nodes-setplugindata/)(key: string, value: string): void

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
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
*   [TextStyle](/docs/plugins/api/TextStyle/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [Variable](/docs/plugins/api/Variable/)
*   [VariableCollection](/docs/plugins/api/VariableCollection/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

Lets you store custom information on any node or style, **private** to your plugin. The total size of your entry (`pluginId`, `key`, `value`) cannot exceed 100 kB.

[View more →](/docs/plugins/api/properties/nodes-setplugindata/)

* * *

### setRangeBoundVariable(start: number, end: number, field: [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/), variable: [Variable](/docs/plugins/api/Variable/) | null): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `boundVariable` for a given field from characters in range `start` (inclusive) to `end` (exclusive). Requires any new fonts to be loaded.

* * *

### setRangeFillStyleId(start: number, end: number, value: string): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

**DEPRECATED:** Use `setRangeFillStyleIdAsync` instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Set the `fillStyleId` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeFillStyleIdAsync(start: number, end: number, styleId: string): Promise<void>

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the provided [`PaintStyle`](/docs/plugins/api/PaintStyle/) as a fill to characters in range `start` (inclusive) to `end` (exclusive).

* * *

### setRangeFills(start: number, end: number, value: [Paint](/docs/plugins/api/Paint/)\[\]): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `fills` from characters in range `start` (inclusive) to `end` (exclusive). Requires font to be loaded.

Can be bound to color variables by using [`setBoundVariableForPaint`](/docs/plugins/api/figma-variables/#setboundvariableforpaint) on one or more of the provided `Paint`s

* * *

### setRangeFontName(start: number, end: number, value: [FontName](/docs/plugins/api/FontName/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `fontName` from characters in range `start` (inclusive) to `end` (exclusive). Requires the new font to be loaded.

* * *

### setRangeFontSize(start: number, end: number, value: number): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `fontSize` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeHyperlink(start: number, end: number, value: [HyperlinkTarget](/docs/plugins/api/HyperlinkTarget/) | null): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `hyperlink` from characters in range `start` (inclusive) to `end` (exclusive). Removes the hyperlink in range if `value` is `null`.

* * *

### setRangeIndentation(start: number, end: number, value: number): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `indentation` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### setRangeLetterSpacing(start: number, end: number, value: [LetterSpacing](/docs/plugins/api/LetterSpacing/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `letterSpacing` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeLineHeight(start: number, end: number, value: [LineHeight](/docs/plugins/api/LineHeight/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeListOptions(start: number, end: number, value: [TextListOptions](/docs/plugins/api/TextListOptions/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textListOptions` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### setRangeListSpacing(start: number, end: number, value: number): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `listSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

* * *

### setRangeParagraphIndent(start: number, end: number, value: number): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `paragraphIndent` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

* * *

### setRangeParagraphSpacing(start: number, end: number, value: number): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `paragraphSpacing` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

* * *

### setRangeTextCase(start: number, end: number, value: [TextCase](/docs/plugins/api/TextCase/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textCase` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextDecoration(start: number, end: number, value: [TextDecoration](/docs/plugins/api/TextDecoration/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textDecoration` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextDecorationColor(start: number, end: number, value: [TextDecorationColor](/docs/plugins/api/TextDecorationColor/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textDecorationColor` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextDecorationOffset(start: number, end: number, value: [TextDecorationOffset](/docs/plugins/api/TextDecorationOffset/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textDecorationOffset` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextDecorationSkipInk(start: number, end: number, value: boolean): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textDecorationSkipInk` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextDecorationStyle(start: number, end: number, value: [TextDecorationStyle](/docs/plugins/api/TextDecorationStyle/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textDecorationStyle` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextDecorationThickness(start: number, end: number, value: [TextDecorationThickness](/docs/plugins/api/TextDecorationThickness/)): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the `textDecorationThickness` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextStyleId(start: number, end: number, value: string): void

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

**DEPRECATED:** Use `setRangeTextStyleIdAsync` instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Set the `textStyleId` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setRangeTextStyleIdAsync(start: number, end: number, styleId: string): Promise<void>

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Set the provided [`TextStyle`](/docs/plugins/api/TextStyle/) to characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

* * *

### setReactionsAsync(reactions: Array<[Reaction](/docs/plugins/api/Reaction/)\>): Promise<void>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Updates the reactions on this node. See [`reactions`](/docs/plugins/api/properties/nodes-reactions/) for a usage example.

* * *

### [setRelaunchData](/docs/plugins/api/properties/nodes-setrelaunchdata/)(data: { \[command: string\]: string }): void

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Sets state on the node to show a button and description when the node is selected. Clears the button and description when `relaunchData` is `{}`.

info

In Figma and Dev Mode, this shows up in the properties panel. In FigJam, this shows up in the property menu. See [here](/docs/plugins/api/properties/nodes-setrelaunchdata/#example-figma-design-ui) for examples.

[View more →](/docs/plugins/api/properties/nodes-setrelaunchdata/)

* * *

### [setSharedPluginData](/docs/plugins/api/properties/nodes-setsharedplugindata/)(namespace: string, key: string, value: string): void

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
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
*   [TextStyle](/docs/plugins/api/TextStyle/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [Variable](/docs/plugins/api/Variable/)
*   [VariableCollection](/docs/plugins/api/VariableCollection/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

Lets you store custom information on any node or style, **public** to all plugins. The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB.

[View more →](/docs/plugins/api/properties/nodes-setsharedplugindata/)

* * *

### setStrokeStyleIdAsync(styleId: string): Promise<void>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

Set the [`PaintStyle`](/docs/plugins/api/PaintStyle/) that the [`strokes`](/docs/plugins/api/node-properties/#strokes) property of this node is linked to.

* * *

### setVectorNetworkAsync(vectorNetwork: [VectorNetwork](/docs/plugins/api/VectorNetwork/)): Promise<void>

Supported on:

*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

Updates the vector network.

* * *

### [strokeAlign](/docs/plugins/api/properties/nodes-strokealign/): 'CENTER' | 'INSIDE' | 'OUTSIDE'

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The alignment of the stroke with respect to the boundaries of the shape.

[View more →](/docs/plugins/api/properties/nodes-strokealign/)

* * *

### strokeBottomWeight: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Determines the bottom stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

* * *

### [strokeCap](/docs/plugins/api/properties/nodes-strokecap/): [StrokeCap](/docs/plugins/api/StrokeCap/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The decoration applied to vertices which have only one connected segment.

[View more →](/docs/plugins/api/properties/nodes-strokecap/)

* * *

### strokeGeometry: [VectorPaths](/docs/plugins/api/VectorPath/#vector-paths) \[readonly\]

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

An array of paths representing the object strokes relative to the node. StrokeGeometry is always from the center regardless of the nodes `strokeAlign`.

* * *

### [strokeJoin](/docs/plugins/api/properties/nodes-strokejoin/): [StrokeJoin](/docs/plugins/api/StrokeJoin/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The decoration applied to vertices which have two or more connected segments.

[View more →](/docs/plugins/api/properties/nodes-strokejoin/)

* * *

### strokeLeftWeight: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Determines the left stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

* * *

### strokeMiterLimit: number

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The miter limit on the stroke. This is the same as the [SVG miter limit](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-miterlimit).

* * *

### strokeRightWeight: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Determines the right stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

* * *

### strokeStyleId: string

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The id of the [`PaintStyle`](/docs/plugins/api/PaintStyle/) object that the [`strokes`](/docs/plugins/api/node-properties/#strokes) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setStrokeStyleIdAsync` to update the style.

* * *

### strokeTopWeight: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Determines the top stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

* * *

### strokeWeight: number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The thickness of the stroke, in pixels. This value must be non-negative and can be fractional.

caution

For rectangle nodes or frame-like nodes using different individual stroke weights, this property will return [`figma.mixed`](/docs/plugins/api/properties/figma-mixed/).

info

For rectangle nodes or frame-like nodes, individual stroke weights can be set for each side using the following properties:

*   [`strokeTopWeight`](/docs/plugins/api/node-properties/#stroketopweight)
*   [`strokeBottomWeight`](/docs/plugins/api/node-properties/#strokebottomweight)
*   [`strokeLeftWeight`](/docs/plugins/api/node-properties/#strokeleftweight)
*   [`strokeRightWeight`](/docs/plugins/api/node-properties/#strokerightweight)

* * *

### strokes: ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\>

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)

The paints used to fill the area of the shape's strokes. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

* * *

### [strokesIncludedInLayout](/docs/plugins/api/properties/nodes-strokesincludedinlayout/): boolean

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

Applicable only on auto-layout frames. Determines whether strokes are included in [layout calculations](https://help.figma.com/hc/en-us/articles/31289464393751-Use-the-horizontal-and-vertical-flows-in-auto-layout#01JT9NA4HVT02ZPE7BA86SFCD6). When true, auto-layout frames behave like css `box-sizing: border-box`.

[View more →](/docs/plugins/api/properties/nodes-strokesincludedinlayout/)

* * *

### [stuckNodes](/docs/plugins/api/properties/nodes-stucknodes/): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\] \[readonly\]

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

An array of nodes that are "stuck" to this node. In FigJam, stamps, highlights, and some widgets can "stick" to other nodes if they are dragged on top of another node.

[View more →](/docs/plugins/api/properties/nodes-stucknodes/)

* * *

### [stuckTo](/docs/plugins/api/properties/nodes-stuckto/): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

Supported on:

*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

If this node is stuck to another node this property returns that node or null.

[View more →](/docs/plugins/api/properties/nodes-stuckto/)

* * *

### [targetAspectRatio](/docs/plugins/api/properties/nodes-targetaspectratio/): [Vector](/docs/plugins/api/Vector/) | null \[readonly\]

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

When toggled, causes the layer to keep its proportions when the user resizes it via auto layout, constraints, the properties panel, or on-canvas. If not set, the node does NOT resize toward a specific targetAspectRatio.

[View more →](/docs/plugins/api/properties/nodes-targetaspectratio/)

* * *

### textCase: [TextCase](/docs/plugins/api/TextCase/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Overrides the case of the raw characters in the text node. Requires the font to be loaded.

* * *

### textDecoration: [TextDecoration](/docs/plugins/api/TextDecoration/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Whether the text is underlined or has a strikethrough. Requires the font to be loaded.

* * *

### textDecorationColor: [TextDecorationColor](/docs/plugins/api/TextDecorationColor/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The text decoration color. If the text is not underlined, this value will be null. Requires the font to be loaded.

* * *

### textDecorationOffset: [TextDecorationOffset](/docs/plugins/api/TextDecorationOffset/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The text decoration offset. If the text is not underlined, this value will be null. Requires the font to be loaded.

* * *

### textDecorationSkipInk: boolean | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

Whether the text decoration skips descenders. If the text is not underlined, this value will be null. Requires the font to be loaded.

* * *

### textDecorationStyle: [TextDecorationStyle](/docs/plugins/api/TextDecorationStyle/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The text decoration style (e.g. "SOLID"). If the text is not underlined, this value will be null. Requires the font to be loaded.

* * *

### textDecorationThickness: [TextDecorationThickness](/docs/plugins/api/TextDecorationThickness/) | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) | null

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

The text decoration thickness. If the text is not underlined, this value will be null. Requires the font to be loaded.

* * *

### [toString](/docs/plugins/api/properties/nodes-tostring/)(): string

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
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
*   [PageNode](/docs/plugins/api/PageNode/)
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

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](/docs/plugins/api/properties/nodes-tostring/)

* * *

### topLeftRadius: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

* * *

### topRightRadius: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

* * *

### unlockAspectRatio(): void

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

Unlocks the node's `targetAspectRatio`.

* * *

### [variantProperties](/docs/plugins/api/properties/nodes-variantproperties/): { \[property: string\]: string } | null \[readonly\]

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)

**DEPRECATED:** Use [`componentProperties`](/docs/plugins/api/InstanceNode/#componentproperties) instead.

Variant properties and values for this node. Is `null` for nodes that are not variants.

[View more →](/docs/plugins/api/properties/nodes-variantproperties/)

* * *

### vectorNetwork: [VectorNetwork](/docs/plugins/api/VectorNetwork/)

Supported on:

*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

Exposes a complete, but more complex representation of vectors as a network of edges between vectices. See [`VectorNetwork`](/docs/plugins/api/VectorNetwork/).

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setVectorNetworkAsync` to update the value.

* * *

### vectorPaths: [VectorPaths](/docs/plugins/api/VectorPath/#vector-paths)

Supported on:

*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)

Exposes a simple, but incomplete representation of vectors as path. See [`VectorPaths`](/docs/plugins/api/VectorPath/)

* * *

### verticalPadding: number

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InferredAutoLayoutResult](/docs/plugins/api/InferredAutoLayoutResult/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

**DEPRECATED:** Use `paddingTop` and `paddingBottom` instead.

* * *

### [visible](/docs/plugins/api/properties/nodes-visible/): boolean

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

Whether the node is visible or not. Does not affect a plugin's ability to access the node.

[View more →](/docs/plugins/api/properties/nodes-visible/)

* * *

### width: number \[readonly\]

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

The width of the node. Use a resizing method to change this value.

* * *

### [x](/docs/plugins/api/properties/nodes-x/): number

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

The position of the node. Identical to `relativeTransform[0][2]`.

[View more →](/docs/plugins/api/properties/nodes-x/)

* * *

### [y](/docs/plugins/api/properties/nodes-y/): number

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

The position of the node. Identical to `relativeTransform[1][2]`.

[View more →](/docs/plugins/api/properties/nodes-y/)

* * *
