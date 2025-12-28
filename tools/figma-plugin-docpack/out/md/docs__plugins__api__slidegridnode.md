# SlideGridNode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/SlideGridNode/
scraped_at: 2025-12-22T03:30:26.771Z
---

On this page

This Slide Grid node exists exactly once in every Figma Slides document. The Slide Grid cannot be selected or edited in the UI. The only way you can manipulate the Slide Grid via the Plugin API is to interface with its children, which are all Slide Rows.

Slide Grids cannot be created using the Plugin API. The Slide Grid node will always be top level in the document.

## Slide Grid properties[​](#slide-grid-properties "Direct link to Slide Grid properties")

### type: 'SLIDE\_GRID' \[readonly\]

The type of this node, represented by the string literal "SLIDE\_GRID"

* * *

### clone(): [SlideGridNode](/docs/plugins/api/SlideGridNode/)

You cannot make a copy of a slide grid node and calling this method throw a runtime exception.

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

## Layout-related properties[​](#layout-related-properties "Direct link to Layout-related properties")

### [x](/docs/plugins/api/properties/nodes-x/): number

The position of the node. Identical to `relativeTransform[0][2]`.

[View more →](/docs/plugins/api/properties/nodes-x/)

* * *

### [y](/docs/plugins/api/properties/nodes-y/): number

The position of the node. Identical to `relativeTransform[1][2]`.

[View more →](/docs/plugins/api/properties/nodes-y/)

* * *

### width: number \[readonly\]

The width of the node. Use a resizing method to change this value.

* * *

### height: number \[readonly\]

The height of the node. Use a resizing method to change this value.

* * *

### minWidth: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `minWidth`.

* * *

### maxWidth: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxWidth`.

* * *

### minHeight: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to null to remove `minHeight`.

* * *

### maxHeight: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxHeight`.

* * *

### [relativeTransform](/docs/plugins/api/properties/nodes-relativetransform/): [Transform](/docs/plugins/api/Transform/)

The position of a node relative to its **containing parent** as a [`Transform`](/docs/plugins/api/Transform/) matrix. Not used for scaling, see `width` and `height` instead. Read the details page to understand the nuances of this property.

[View more →](/docs/plugins/api/properties/nodes-relativetransform/)

* * *

### absoluteTransform: [Transform](/docs/plugins/api/Transform/) \[readonly\]

The position of a node relative to its **containing page** as a [`Transform`](/docs/plugins/api/Transform/) matrix.

* * *

### absoluteBoundingBox: [Rect](/docs/plugins/api/Rect/) | null \[readonly\]

The bounds of the node that does not include rendered properties like drop shadows or strokes. The `x` and `y` inside this property represent the absolute position of the node on the page.

* * *

## Scene node properties[​](#scene-node-properties "Direct link to Scene node properties")

### [visible](/docs/plugins/api/properties/nodes-visible/): boolean

Whether the node is visible or not. Does not affect a plugin's ability to access the node.

[View more →](/docs/plugins/api/properties/nodes-visible/)

* * *

### [locked](/docs/plugins/api/properties/nodes-locked/): boolean

Whether the node is locked or not, preventing certain user interactions on the canvas such as selecting and dragging. Does not affect a plugin's ability to write to those properties.

[View more →](/docs/plugins/api/properties/nodes-locked/)

* * *

### [stuckNodes](/docs/plugins/api/properties/nodes-stucknodes/): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\] \[readonly\]

An array of nodes that are "stuck" to this node. In FigJam, stamps, highlights, and some widgets can "stick" to other nodes if they are dragged on top of another node.

[View more →](/docs/plugins/api/properties/nodes-stucknodes/)

* * *

### attachedConnectors: [ConnectorNode](/docs/plugins/api/ConnectorNode/)\[\] \[readonly\]

An array of `ConnectorNode`s that are attached to a node.

* * *

### componentPropertyReferences: { \[nodeProperty in 'visible' | 'characters' | 'mainComponent'\]?: string} | null

All component properties that are attached on this node. A node can only have `componentPropertyReferences` if it is a component sublayer or an instance sublayer. It will be `null` otherwise. The value in the key-value pair refers to the component property name as returned by `componentPropertyDefinitions` on the containing component, component set or main component (for instances).

* * *

### boundVariables?: { readonly \[field in [VariableBindableNodeField](/docs/plugins/api/VariableBindableNodeField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)} & { readonly \[field in [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]} & { fills: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; strokes: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; effects: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; layoutGrids: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]; componentProperties: { \[propertyName: string\]: [VariableAlias](/docs/plugins/api/VariableAlias/) }; textRangeFills: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\] } \[readonly\]

The variables bound to a particular field on this node. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to get and set variable bindings.

* * *

### setBoundVariable(field: [VariableBindableNodeField](/docs/plugins/api/VariableBindableNodeField/) | [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/), variable: [Variable](/docs/plugins/api/Variable/) | null): void

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

[View more →](/docs/plugins/api/properties/nodes-setboundvariable/)

* * *

### [inferredVariables](/docs/plugins/api/properties/nodes-inferredvariables/)?: { readonly \[field in [VariableBindableNodeField](/docs/plugins/api/VariableBindableNodeField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]} & { fills: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]\[\]; strokes: [VariableAlias](/docs/plugins/api/VariableAlias/)\[\]\[\] } \[readonly\]

An object, keyed by field, returning any variables that match the raw value of that field for the mode of the node (or the default variable value if no mode is set)

[View more →](/docs/plugins/api/properties/nodes-inferredvariables/)

* * *

### [resolvedVariableModes](/docs/plugins/api/properties/nodes-resolvedvariablemodes/): { \[collectionId: string\]: string }

The resolved mode for this node for each variable collection in this file.

[View more →](/docs/plugins/api/properties/nodes-resolvedvariablemodes/)

* * *

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

*   [Slide Grid properties](#slide-grid-properties)
*   [Base node properties](#base-node-properties)
*   [Plugin data properties](#plugin-data-properties)
*   [Dev resource properties](#dev-resource-properties)
*   [Layout-related properties](#layout-related-properties)
*   [Scene node properties](#scene-node-properties)
*   [Export-related properties](#export-related-properties)
*   [Children-related properties](#children-related-properties)
