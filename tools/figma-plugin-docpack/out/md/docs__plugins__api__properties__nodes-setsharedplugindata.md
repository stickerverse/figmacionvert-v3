# setSharedPluginData | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-setsharedplugindata/
scraped_at: 2025-12-22T03:30:50.327Z
---

On this page

Lets you store custom information on any node or style, **public** to all plugins. The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB.

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

## Signature[​](#signature "Direct link to Signature")

### [setSharedPluginData](/docs/plugins/api/properties/nodes-setsharedplugindata/)(namespace: string, key: string, value: string): void

## Parameters[​](#parameters "Direct link to Parameters")

### namespace[​](#namespace "Direct link to namespace")

A unique string to identify your plugin and avoid key collisions with other plugins. The namespace must be at least 3 alphanumeric characters.

### key[​](#key "Direct link to key")

The key under which to store the data. This is similar to writing to a plain object via `obj[key] = value`.

### value[​](#value "Direct link to value")

The data you want to store. If you want to store a value type other than a string, encode it as a JSON string first via `JSON.stringify` and `JSON.parse`. If you set the value to the empty string (""), the key/value pair is removed.

## Remarks[​](#remarks "Direct link to Remarks")

This lets you store custom information on any node or style. You can retrieve it later by calling [`getSharedPluginData`](/docs/plugins/api/node-properties/#getsharedplugindata) with the same namespace and key. To find all data stored on a node or style in a particular namespace, use [`getSharedPluginDataKeys`](/docs/plugins/api/node-properties/#getsharedplugindatakeys).

Any data you write using this API will be readable by any plugin. The intent is to allow plugins to interoperate with each other. Use [`setPluginData`](/docs/plugins/api/properties/nodes-setplugindata/) instead if you don't want other plugins to be able to read your data.

You must also provide a `namespace` argument to avoid key collisions with other plugins. This argument is mandatory to prevent multiple plugins from using generic key names like `data` and overwriting one another. We recommend passing a value that identifies your plugin. This namespace can be given to authors of other plugins so that they can read data from your plugin.

caution

⚠ Total entry size cannot exceed 100 kB.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [namespace](#namespace)
    *   [key](#key)
    *   [value](#value)
*   [Remarks](#remarks)
