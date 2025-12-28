# PageNode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/PageNode/
scraped_at: 2025-12-22T03:30:26.336Z
---

On this page

The page node is always a descendent of the [`DocumentNode`](/docs/plugins/api/DocumentNode/). Most plugins only need to access the current page accessed via [`figma.currentPage`](/docs/plugins/api/figma/#currentpage).

## Page properties[​](#page-properties "Direct link to Page properties")

### type: 'PAGE' \[readonly\]

The type of this node, represented by the string literal "PAGE"

* * *

### clone(): [PageNode](/docs/plugins/api/PageNode/)

Create a clone of this page, parented under [`figma.root`](/docs/plugins/api/figma/#root). Prototyping connections will be copied such that they point to their equivalent in the cloned page. Components will be cloned as instances who master is the original component.

* * *

### [guides](/docs/plugins/api/properties/PageNode-guides/): ReadonlyArray<[Guide](/docs/plugins/api/Guide/)\>

The guides on this page.

[View more →](/docs/plugins/api/properties/PageNode-guides/)

* * *

### [selection](/docs/plugins/api/properties/PageNode-selection/): ReadonlyArray<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>

The selected nodes on this page. Each page stores its own selection separately. The ordering of nodes in the selection is **unspecified**, you should not be relying on it.

[View more →](/docs/plugins/api/properties/PageNode-selection/)

* * *

### [selectedTextRange](/docs/plugins/api/properties/PageNode-selectedtextrange/): { node: [TextNode](/docs/plugins/api/TextNode/); start: number; end: number } | null

The current text node being edited, if any, and the text currently being selected within that text node.

[View more →](/docs/plugins/api/properties/PageNode-selectedtextrange/)

* * *

### [flowStartingPoints](/docs/plugins/api/properties/PageNode-flowstartingpoints/): ReadonlyArray<{ nodeId: string; name: string }>

The sorted list of flow starting points used when accessing Presentation view.

[View more →](/docs/plugins/api/properties/PageNode-flowstartingpoints/)

* * *

### backgrounds: ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\>

The background color of the canvas (currently only supports a single solid color paint).

* * *

### prototypeBackgrounds: ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\>

The background color of the prototype (currently only supports a single solid color paint).

* * *

### prototypeStartNode: [FrameNode](/docs/plugins/api/FrameNode/) | [GroupNode](/docs/plugins/api/GroupNode/) | [ComponentNode](/docs/plugins/api/ComponentNode/) | [InstanceNode](/docs/plugins/api/InstanceNode/) | null \[readonly\]

The starting point when launching a prototype. Prototypes with a starting node contain all frames reachable from that node. Prototypes without a starting node contain all frames on the current page. Note that prototypes are per-page.

* * *

### isPageDivider: boolean

Returns true if the node is a page divider, which is only possible when the page node is empty and has a page divider name. A page divider name consists of all asterisks, all en dashes, all em dashes, or all spaces.

* * *

### loadAsync(): Promise<void>

Loads the contents of the page node.

* * *

### [on](/docs/plugins/api/properties/PageNode-on/)(type: 'nodechange', callback: (event: [NodeChangeEvent](/docs/plugins/api/NodeChangeEvent/)) => void): void

Registers a callback that will be invoked when an event occurs on the page. Current supported events are:

*   `"nodechange"`: Emitted when a node is added, removed, or updated.

[View more →](/docs/plugins/api/properties/PageNode-on/)

* * *

### once(type: 'nodechange', callback: (event: [NodeChangeEvent](/docs/plugins/api/NodeChangeEvent/)) => void): void

Same as [`on`](/docs/plugins/api/properties/PageNode-on/), but the callback will only be called once, the first time the specified event happens.

* * *

### [off](/docs/plugins/api/properties/PageNode-off/)(type: 'nodechange', callback: (event: [NodeChangeEvent](/docs/plugins/api/NodeChangeEvent/)) => void): void

Removes a callback added with [`on`](/docs/plugins/api/properties/PageNode-on/) or [`once`](/docs/plugins/api/PageNode/#once).

[View more →](/docs/plugins/api/properties/PageNode-off/)

* * *

### [focusedSlide](/docs/plugins/api/properties/PageNode-focusedslide/)?: [SlideNode](/docs/plugins/api/SlideNode/) | null

info

This API is only available in Figma Slides

When in single slide view, the Slide that is currently focused is accessible via this property.

[View more →](/docs/plugins/api/properties/PageNode-focusedslide/)

* * *

### [focusedNode](/docs/plugins/api/properties/PageNode-focusednode/): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

info

This API is only available in Figma Slides and Figma Buzz

When in Asset View, the Slide/Asset that is currently focused is accessible via this property.

[View more →](/docs/plugins/api/properties/PageNode-focusednode/)

* * *

## Measurement properties[​](#measurement-properties "Direct link to Measurement properties")

### getMeasurements(): [Measurement](/docs/plugins/api/Measurement/)\[\]

Get all measurements in the current page.

Learn more about measurements in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935).

* * *

### getMeasurementsForNode(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [Measurement](/docs/plugins/api/Measurement/)\[\]

Get all measurements pointing to a node in the current page. This includes all measurements whose start _or_ end node is the node passed in.

* * *

### addMeasurement(start: { node: [SceneNode](/docs/plugins/api/nodes/#scene-node); side: [MeasurementSide](/docs/plugins/api/MeasurementSide/) }, end: { node: [SceneNode](/docs/plugins/api/nodes/#scene-node); side: [MeasurementSide](/docs/plugins/api/MeasurementSide/) }, options?: { offset: [MeasurementOffset](/docs/plugins/api/MeasurementOffset/); freeText: string }): [Measurement](/docs/plugins/api/Measurement/)

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

### editMeasurement(id: string, newValue: { offset: [MeasurementOffset](/docs/plugins/api/MeasurementOffset/); freeText: string }): [Measurement](/docs/plugins/api/Measurement/)

Edit a measurement’s offset.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

### deleteMeasurement(id: string): void

Delete a measurement.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

## Base node properties[​](#base-node-properties "Direct link to Base node properties")

### [id](/docs/plugins/api/properties/nodes-id/): string \[readonly\]

The unique identifier of a node. For example, `1:3`. The node id can be used with methods such as [`figma.getNodeByIdAsync`](/docs/plugins/api/figma/#getnodebyidasync), but plugins typically don't need to use this since you can usually just access a node directly.

[View more →](/docs/plugins/api/properties/nodes-id/)

* * *

### [parent](/docs/plugins/api/properties/nodes-parent/): ([BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin)) | null \[readonly\]

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](/docs/plugins/api/properties/nodes-appendchild/).

[View more →](/docs/plugins/api/properties/nodes-parent/)

* * *

### [name](/docs/plugins/api/properties/nodes-name/): string

The name of the layer that appears in the layers panel. Calling `figma.root.name` will return the name, read-only, of the current file.

[View more →](/docs/plugins/api/properties/nodes-name/)

* * *

### [removed](/docs/plugins/api/properties/nodes-removed/): boolean \[readonly\]

Returns true if this node has been removed since it was first accessed. If your plugin stays open for a while and stores references to nodes, you should write your code defensively and check that the nodes haven't been removed by the user.

[View more →](/docs/plugins/api/properties/nodes-removed/)

* * *

### [toString](/docs/plugins/api/properties/nodes-tostring/)(): string

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](/docs/plugins/api/properties/nodes-tostring/)

* * *

### [remove](/docs/plugins/api/properties/nodes-remove/)(): void

Removes this node and **all of its children** from the document.

[View more →](/docs/plugins/api/properties/nodes-remove/)

* * *

### [setRelaunchData](/docs/plugins/api/properties/nodes-setrelaunchdata/)(data: { \[command: string\]: string }): void

Sets state on the node to show a button and description when the node is selected. Clears the button and description when `relaunchData` is `{}`.

info

In Figma and Dev Mode, this shows up in the properties panel. In FigJam, this shows up in the property menu. See [here](/docs/plugins/api/properties/nodes-setrelaunchdata/#example-figma-design-ui) for examples.

[View more →](/docs/plugins/api/properties/nodes-setrelaunchdata/)

* * *

### getRelaunchData(): { \[command: string\]: string }

Retreives the reluanch data stored on this node using [`setRelaunchData`](/docs/plugins/api/properties/nodes-setrelaunchdata/)

* * *

### isAsset: boolean \[readonly\]

Returns true if Figma detects that a node is an asset, otherwise returns false. An asset is is either an icon or a raster image.

This property is useful if you're building a [plugin for code generation](/docs/plugins/codegen-plugins/).

info

This property uses a set of heuristics to determine if a node is an asset. At a high level an icon is a small vector graphic and an image is a node with an image fill.

* * *

### getCSSAsync(): Promise<{ \[key: string\]: string }>

Resolves to a JSON object of CSS properties of the node. This is the same CSS that Figma shows in the inspect panel and is helpful if you are building a [plugin for code generation](/docs/plugins/codegen-plugins/).

* * *

### getTopLevelFrame(): [FrameNode](/docs/plugins/api/FrameNode/) | undefined

Returns the top-most frame that contains this node. If the node is not inside a frame, this will return undefined.

info

This function will only work in Figma Design and will throw an error if called in FigJam or Slides.

* * *

## Plugin data properties[​](#plugin-data-properties "Direct link to Plugin data properties")

### getPluginData(key: string): string

Retrieves custom information that was stored on this node or style using [`setPluginData`](/docs/plugins/api/properties/nodes-setplugindata/). If there is no data stored for the provided key, an empty string is returned.

* * *

### [setPluginData](/docs/plugins/api/properties/nodes-setplugindata/)(key: string, value: string): void

Lets you store custom information on any node or style, **private** to your plugin. The total size of your entry (`pluginId`, `key`, `value`) cannot exceed 100 kB.

[View more →](/docs/plugins/api/properties/nodes-setplugindata/)

* * *

### getPluginDataKeys(): string\[\]

Retrieves a list of all keys stored on this node or style using using [`setPluginData`](/docs/plugins/api/properties/nodes-setplugindata/). This enables iterating through all data stored privately on a node or style by your plugin.

* * *

### getSharedPluginData(namespace: string, key: string): string

Retrieves custom information that was stored on this node or style using [`setSharedPluginData`](/docs/plugins/api/properties/nodes-setsharedplugindata/). If there is no data stored for the provided namespace and key, an empty string is returned.

* * *

### [setSharedPluginData](/docs/plugins/api/properties/nodes-setsharedplugindata/)(namespace: string, key: string, value: string): void

Lets you store custom information on any node or style, **public** to all plugins. The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB.

[View more →](/docs/plugins/api/properties/nodes-setsharedplugindata/)

* * *

### getSharedPluginDataKeys(namespace: string): string\[\]

Retrieves a list of all keys stored on this node or style using [`setSharedPluginData`](/docs/plugins/api/properties/nodes-setsharedplugindata/). This enables iterating through all data stored in a given namespace.

* * *

## Dev resource properties[​](#dev-resource-properties "Direct link to Dev resource properties")

### getDevResourcesAsync(options?: { includeChildren: boolean }): Promise<[DevResourceWithNodeId](/docs/plugins/api/DevResource/#dev-resource-with-node-id)\[\]>

Gets all of the dev resources on a node. This includes any inherited dev resources from components and component sets.

[View more →](/docs/plugins/api/properties/nodes-getdevresourcesasync/)

* * *

### addDevResourceAsync(url: string, name?: string): Promise<void>

Adds a dev resource to a node. This will fail if the node already has a dev resource with the same url.

[View more →](/docs/plugins/api/properties/nodes-adddevresourceasync/)

* * *

### editDevResourceAsync(currentUrl: string, newValue: { name: string; url: string }): Promise<void>

Edits a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](/docs/plugins/api/properties/nodes-editdevresourceasync/)

* * *

### deleteDevResourceAsync(url: string): Promise<void>

Deletes a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](/docs/plugins/api/properties/nodes-deletedevresourceasync/)

* * *

### setDevResourcePreviewAsync(url: string, preview: PlainTextElement): Promise<void>

caution

This is a private API only available to [Figma partners](https://www.figma.com/partners/)

* * *

## Explicit variable modes[​](#explicit-variable-modes "Direct link to Explicit variable modes")

### explicitVariableModes: { \[collectionId: string\]: string }

The explicitly set modes for this node. For `SceneNodes`, represents a subset of [`resolvedVariableModes`](/docs/plugins/api/properties/nodes-resolvedvariablemodes/). Note that this does not include [workspace and team-default modes](https://help.figma.com/hc/en-us/articles/12611253730071).

* * *

### clearExplicitVariableModeForCollection(collection: [VariableCollection](/docs/plugins/api/VariableCollection/)): void

Clears an explicit mode for the given collection on this node

[View more →](/docs/plugins/api/properties/ExplicitVariableModesMixin-clearexplicitvariablemodeforcollection/)

* * *

### setExplicitVariableModeForCollection(collection: [VariableCollection](/docs/plugins/api/VariableCollection/), modeId: string): void

Sets an explicit mode for the given collection on this node

[View more →](/docs/plugins/api/properties/ExplicitVariableModesMixin-setexplicitvariablemodeforcollection/)

* * *

## Children-related properties[​](#children-related-properties "Direct link to Children-related properties")

### [children](/docs/plugins/api/properties/nodes-children/): ReadonlyArray<[SceneNode](/docs/plugins/api/nodes/#scene-node)\> \[readonly\]

The list of children, sorted back-to-front. That is, the first child in the array is the bottommost layer on the screen, and the last child in the array is the topmost layer.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this property.

[View more →](/docs/plugins/api/properties/nodes-children/)

* * *

### [appendChild](/docs/plugins/api/properties/nodes-appendchild/)(child: [SceneNode](/docs/plugins/api/nodes/#scene-node)): void

Adds a new child to the end of the [`children`](/docs/plugins/api/properties/nodes-children/) array. That is, visually on top of all other children.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-appendchild/)

* * *

### [insertChild](/docs/plugins/api/properties/nodes-insertchild/)(index: number, child: [SceneNode](/docs/plugins/api/nodes/#scene-node)): void

Adds a new child at the specified index in the [`children`](/docs/plugins/api/properties/nodes-children/) array.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-insertchild/)

* * *

### [findChildren](/docs/plugins/api/properties/nodes-findchildren/)(callback?: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\]

Searches the immediate children of this node (i.e. not including the children's children). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findchildren/)

* * *

### [findChild](/docs/plugins/api/properties/nodes-findchild/)(callback: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

Searches the immediate children of this node (i.e. not including the children's children). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findchild/)

* * *

### [findAll](/docs/plugins/api/properties/nodes-findall/)(callback?: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\]

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findall/)

* * *

### [findOne](/docs/plugins/api/properties/nodes-findone/)(callback: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

Searches this entire subtree (this node's children, its children's children, etc). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findone/)

* * *

### [findAllWithCriteria](/docs/plugins/api/properties/nodes-findallwithcriteria/)<T extends NodeType\[\]>(criteria: [FindAllCriteria](/docs/plugins/api/FindAllCriteria/)<T>): Array<{ type: T\[number\] } & [SceneNode](/docs/plugins/api/nodes/#scene-node)\>

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes that satisfy all of specified criteria.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findallwithcriteria/)

* * *

### [findWidgetNodesByWidgetId](/docs/plugins/api/properties/nodes-findwidgetnodesbywidgetid/)(widgetId: string): Array<[WidgetNode](/docs/plugins/api/WidgetNode/)\>

Searches this entire subtree (this node's children, its children's children, etc). Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-findwidgetnodesbywidgetid/)

* * *

## Export-related properties[​](#export-related-properties "Direct link to Export-related properties")

### exportSettings: ReadonlyArray<[ExportSettings](/docs/plugins/api/ExportSettings/)\>

List of export settings stored on the node. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

* * *

### exportAsync(settings?: [ExportSettings](/docs/plugins/api/ExportSettings/)): Promise<Uint8Array>

### exportAsync(settings: [ExportSettingsSVGString](/docs/plugins/api/ExportSettings/#export-settings-svgstring)): Promise<string>

### exportAsync(settings: [ExportSettingsREST](/docs/plugins/api/ExportSettings/#export-settings-rest)): Promise<Object>

Exports the node as an encoded image.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

[View more →](/docs/plugins/api/properties/nodes-exportasync/)

* * *

*   [Page properties](#page-properties)
*   [Measurement properties](#measurement-properties)
*   [Base node properties](#base-node-properties)
*   [Plugin data properties](#plugin-data-properties)
*   [Dev resource properties](#dev-resource-properties)
*   [Explicit variable modes](#explicit-variable-modes)
*   [Children-related properties](#children-related-properties)
*   [Export-related properties](#export-related-properties)
