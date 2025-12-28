# deleteDevResourceAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-deletedevresourceasync/
scraped_at: 2025-12-22T03:30:43.719Z
---

On this page

Deletes a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

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

## Signature[​](#signature "Direct link to Signature")

### deleteDevResourceAsync(url: string): Promise<void>

## Parameters[​](#parameters "Direct link to Parameters")

### url[​](#url "Direct link to url")

The url of the dev resource.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [url](#url)
