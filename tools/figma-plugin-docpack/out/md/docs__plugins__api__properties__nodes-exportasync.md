# exportAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/
scraped_at: 2025-12-22T03:30:44.047Z
---

On this page

Exports the node as an encoded image.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

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

## Signature[​](#signature "Direct link to Signature")

### exportAsync(settings?: [ExportSettings](/docs/plugins/api/ExportSettings/)): Promise<Uint8Array>

### exportAsync(settings: [ExportSettingsSVGString](/docs/plugins/api/ExportSettings/#export-settings-svgstring)): Promise<string>

### exportAsync(settings: [ExportSettingsREST](/docs/plugins/api/ExportSettings/#export-settings-rest)): Promise<Object>

## Parameters[​](#parameters "Direct link to Parameters")

### settings[​](#settings "Direct link to settings")

When this parameter is absent, this function defaults to exporting as a PNG at 1x resolution.

Note that the result is a Uint8Array, representing the bytes of the image file (encoded in the specified format).

Create a hexagon, export as PNG, and place on canvas

```
(async () => {  const polygon = figma.createPolygon()  polygon.pointCount = 6  polygon.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]  // Export a 2x resolution PNG of the node  const bytes = await polygon.exportAsync({    format: 'PNG',    constraint: { type: 'SCALE', value: 2 },  })  // Add the image onto the canvas as an image fill in a frame  const image = figma.createImage(bytes)  const frame = figma.createFrame()  frame.x = 200  frame.resize(200, 230)  frame.fills = [{    imageHash: image.hash,    scaleMode: "FILL",    scalingFactor: 1,    type: "IMAGE",  }]})()
```

Export a VectorNode as an SVG string

```
 (async () => {   // Create a triangle using the VectorPath API   const vector = figma.createVector()   vector.vectorPaths = [{     windingRule: "EVENODD",     data: "M 0 100 L 100 100 L 50 0 Z",   }]   // Export the vector to SVG   const svg = await vector.exportAsync({ format: 'SVG_STRING' })   console.log(svg); })()
```

Export a node as a JSON object

```
(async () => {  const json = await figma.currentPage.selection[0].exportAsync({format: 'JSON_REST_V1'})  // Return a JSON object in the same format as the Figma REST API response  console.log(json.document)})()
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [settings](#settings)
