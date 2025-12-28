# DocumentNode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/DocumentNode/
scraped_at: 2025-12-22T03:30:25.268Z
---

On this page

The document node is the root node. There can only be one document node per browser tab, and each of its children must be a [`PageNode`](/docs/plugins/api/PageNode/).

Most plugins will not need to use this node unless they are creating new pages or performing a document-wide operation. In the latter case, it's recommended to only read and not write, as the user may not see the modifications made on a different page.

## Document properties[​](#document-properties "Direct link to Document properties")

### type: 'DOCUMENT' \[readonly\]

The type of this node, represented by the string literal "DOCUMENT"

* * *

### children: ReadonlyArray<[PageNode](/docs/plugins/api/PageNode/)\> \[readonly\]

The list of children. For `DocumentNode`s, children are always [`PageNode`](/docs/plugins/api/PageNode/)s.

* * *

### documentColorProfile: 'LEGACY' | 'SRGB' | 'DISPLAY\_P3' \[readonly\]

The color profile of this document. This will be "LEGACY" for documents created before color management was launched.

* * *

### appendChild(child: [PageNode](/docs/plugins/api/PageNode/)): void

Adds a new page to the end of the `children` array.

* * *

### insertChild(index: number, child: [PageNode](/docs/plugins/api/PageNode/)): void

Adds a new page at the specified index in the `children` array.

* * *

### [findChildren](/docs/plugins/api/properties/DocumentNode-findchildren/)(callback?: (node: [PageNode](/docs/plugins/api/PageNode/)) => boolean): Array<[PageNode](/docs/plugins/api/PageNode/)\>

Searches the immediate children of this node (i.e. all page nodes, not including their children). Returns all pages for which `callback` returns true.

[View more →](/docs/plugins/api/properties/DocumentNode-findchildren/)

* * *

### [findChild](/docs/plugins/api/properties/DocumentNode-findchild/)(callback: (node: [PageNode](/docs/plugins/api/PageNode/)) => boolean): [PageNode](/docs/plugins/api/PageNode/) | null

Searches the immediate children of this node (i.e. all page nodes, not including their children). Returns the first page for which `callback` returns true.

[View more →](/docs/plugins/api/properties/DocumentNode-findchild/)

* * *

### [findAll](/docs/plugins/api/properties/DocumentNode-findall/)(callback?: (node: [PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): Array<[PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node)\>

Searches the entire document tree. Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this function.

[View more →](/docs/plugins/api/properties/DocumentNode-findall/)

* * *

### [findOne](/docs/plugins/api/properties/DocumentNode-findone/)(callback: (node: [PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

Searches this entire page (this node's children, its children's children, etc.). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this function.

[View more →](/docs/plugins/api/properties/DocumentNode-findone/)

* * *

### findAllWithCriteria<T extends NodeType\[\]>(criteria: [FindAllCriteria](/docs/plugins/api/FindAllCriteria/)<T>): Array<{ type: T\[number\] } & ([PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node))>

Searches the entire document tree. Returns all nodes that satisfy all of specified criteria.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this function.

Similar to [`findAllWithCriteria`](/docs/plugins/api/properties/nodes-findallwithcriteria/) with the main difference being that this searches all the nodes in the document, which also includes [`PageNode`](/docs/plugins/api/PageNode/) objects.

* * *

### [findWidgetNodesByWidgetId](/docs/plugins/api/properties/DocumentNode-findwidgetnodesbywidgetid/)(widgetId: string): Array<[WidgetNode](/docs/plugins/api/WidgetNode/)\>

Searches the entire document tree. Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this function.

[View more →](/docs/plugins/api/properties/DocumentNode-findwidgetnodesbywidgetid/)

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

*   [Document properties](#document-properties)
*   [Base node properties](#base-node-properties)
*   [Plugin data properties](#plugin-data-properties)
*   [Dev resource properties](#dev-resource-properties)
