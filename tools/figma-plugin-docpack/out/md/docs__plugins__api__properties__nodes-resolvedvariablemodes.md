# resolvedVariableModes | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-resolvedvariablemodes/
scraped_at: 2025-12-22T03:30:49.488Z
---

On this page

The resolved mode for this node for each variable collection in this file.

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

### [resolvedVariableModes](/docs/plugins/api/properties/nodes-resolvedvariablemodes/): { \[collectionId: string\]: string }

## Remarks[​](#remarks "Direct link to Remarks")

The set of resolved modes on a node includes the explicitly set modes on the node, as well as the explicitly set modes on ancestors of the node. By default, nodes [automatically inherit](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables#Auto_mode) the modes of their parents.

explicitVariableModes vs resolvedVariableModes

```
// Create two collections with two modes eachconst collection1 = figma.variables.createVariableCollection("Collection 1")const collection1Mode1Id = collection1.modes[0].modeIdconst collection1Mode2Id = collection1.addMode('Mode 2')const collection2 = figma.variables.createVariableCollection("Collection 2")const collection2Mode1Id = collection2.modes[0].modeIdconst collection2Mode2Id = collection2.addMode('Mode 2')const parentFrame = figma.createFrame()const childFrame = figma.createFrame()parentFrame.appendChild(childFrame)parentFrame.setExplicitVariableModeForCollection(  collection1,  collection1Mode2Id)childFrame.setExplicitVariableModeForCollection(  collection2,  collection2Mode1Id)// Example output (only collection2 is present):// { 'VariableCollectionId:1:3': '1:2' }console.log(childFrame.explicitVariableModes);// Example output (both collections are present):// { 'VariableCollectionId:1:2': '1:1', 'VariableCollectionId:1:3': '1:2' }console.log(childFrame.resolvedVariableModes);
```

*   [Signature](#signature)
*   [Remarks](#remarks)
