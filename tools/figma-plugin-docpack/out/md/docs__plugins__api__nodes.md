# Node Types | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/nodes/
scraped_at: 2025-12-22T03:30:23.584Z
---

In Figma, the Node is the basis for representing layers. There are many different types of nodes, each with their own set of properties.

*   [`BooleanOperationNode`](/docs/plugins/api/BooleanOperationNode/)
*   [`CodeBlockNode`](/docs/plugins/api/CodeBlockNode/)
*   [`ComponentNode`](/docs/plugins/api/ComponentNode/)
*   [`ComponentSetNode`](/docs/plugins/api/ComponentSetNode/)
*   [`ConnectorNode`](/docs/plugins/api/ConnectorNode/)
*   [`DocumentNode`](/docs/plugins/api/DocumentNode/)
*   [`EllipseNode`](/docs/plugins/api/EllipseNode/)
*   [`EmbedNode`](/docs/plugins/api/EmbedNode/)
*   [`FrameNode`](/docs/plugins/api/FrameNode/)
*   [`GroupNode`](/docs/plugins/api/GroupNode/)
*   [`HighlightNode`](/docs/plugins/api/HighlightNode/)
*   [`InstanceNode`](/docs/plugins/api/InstanceNode/)
*   [`InteractiveSlideElementNode`](/docs/plugins/api/InteractiveSlideElementNode/)
*   [`LineNode`](/docs/plugins/api/LineNode/)
*   [`LinkUnfurlNode`](/docs/plugins/api/LinkUnfurlNode/)
*   [`MediaNode`](/docs/plugins/api/MediaNode/)
*   [`PageNode`](/docs/plugins/api/PageNode/)
*   [`PolygonNode`](/docs/plugins/api/PolygonNode/)
*   [`RectangleNode`](/docs/plugins/api/RectangleNode/)
*   [`RemovedNode`](/docs/plugins/api/RemovedNode/)
*   [`SectionNode`](/docs/plugins/api/SectionNode/)
*   [`ShapeWithTextNode`](/docs/plugins/api/ShapeWithTextNode/)
*   [`SliceNode`](/docs/plugins/api/SliceNode/)
*   [`SlideGridNode`](/docs/plugins/api/SlideGridNode/)
*   [`SlideNode`](/docs/plugins/api/SlideNode/)
*   [`SlideRowNode`](/docs/plugins/api/SlideRowNode/)
*   [`StampNode`](/docs/plugins/api/StampNode/)
*   [`StarNode`](/docs/plugins/api/StarNode/)
*   [`StickyNode`](/docs/plugins/api/StickyNode/)
*   [`TableCellNode`](/docs/plugins/api/TableCellNode/)
*   [`TableNode`](/docs/plugins/api/TableNode/)
*   [`TextNode`](/docs/plugins/api/TextNode/)
*   [`TextPathNode`](/docs/plugins/api/TextPathNode/)
*   [`TransformGroupNode`](/docs/plugins/api/TransformGroupNode/)
*   [`VectorNode`](/docs/plugins/api/VectorNode/)
*   [`WashiTapeNode`](/docs/plugins/api/WashiTapeNode/)
*   [`WidgetNode`](/docs/plugins/api/WidgetNode/)

In the [Typings File](/docs/plugins/api/typings/), each node type is represented with an interface. The most general `BaseNode` is always one of those interfaces:

```
type BaseNode =  DocumentNode |  PageNode |  SceneNode
```

Most often, you will work with nodes contained within a page, also referred to as "scene nodes".

```
type SceneNode =  BooleanOperationNode |  CodeBlockNode |  ComponentNode |  ComponentSetNode |  ConnectorNode |  EllipseNode |  EmbedNode |  FrameNode |  GroupNode |  HighlightNode |  InstanceNode |  InteractiveSlideElementNode |  LineNode |  LinkUnfurlNode |  MediaNode |  PolygonNode |  RectangleNode |  SectionNode |  ShapeWithTextNode |  SliceNode |  SlideGridNode |  SlideNode |  SlideRowNode |  StampNode |  StarNode |  StickyNode |  TableNode |  TextNode |  TextPathNode |  TransformGroupNode |  VectorNode |  WashiTapeNode |  WidgetNode
```

Each node has a type property that tells you the type of the node. The list of node types is declared in NodeType. **You will typically use `node.type` when examining a node.**

```
type NodeType =  "BOOLEAN_OPERATION" |  "CODE_BLOCK" |  "COMPONENT" |  "COMPONENT_SET" |  "CONNECTOR" |  "DOCUMENT" |  "ELLIPSE" |  "EMBED" |  "FRAME" |  "GROUP" |  "HIGHLIGHT" |  "INSTANCE" |  "INTERACTIVE_SLIDE_ELEMENT" |  "LINE" |  "LINK_UNFURL" |  "MEDIA" |  "PAGE" |  "POLYGON" |  "RECTANGLE" |  "SECTION" |  "SHAPE_WITH_TEXT" |  "SLICE" |  "SLIDE" |  "SLIDE_GRID" |  "SLIDE_ROW" |  "STAMP" |  "STAR" |  "STICKY" |  "TABLE" |  "TABLE_CELL" |  "TEXT" |  "TEXT_PATH" |  "TRANSFORM_GROUP" |  "VECTOR" |  "WASHI_TAPE" |  "WIDGET"
```

In the [Typings File](/docs/plugins/api/typings/), you will also find references to "mixin" interfaces. This is just a way to group related properties together. For example: pages, frames and groups can all have children, so they all have children-related properties such as `.children`, `.appendChild`.

Our node properties can't be modeled using traditional object-oriented class hierarchy which is why we use the concept of mixins. The `ChildrenMixin` define the properties that all nodes with children have (e.g. append, insert) and `FrameNode`s, `PageNode`s, etc all compose `ChildrenMixin`. However, a `RectangleNode` cannot have children and therefore does not inherit from `ChildrenMixin`.
