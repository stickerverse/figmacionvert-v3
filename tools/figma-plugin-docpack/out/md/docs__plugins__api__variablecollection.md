# VariableCollection | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/VariableCollection/
scraped_at: 2025-12-22T03:30:51.850Z
---

On this page

## Variable Collection properties[​](#variable-collection-properties "Direct link to Variable Collection properties")

A `Variable collection` is a grouping of related [`Variable`](/docs/plugins/api/Variable/) objects each with the same modes.

Every `Variable` in a collection define values for each of its collection's modes, and can be published to create a tokenized design system. Read more about variables in the [Guide to variables](https://help.figma.com/hc/en-us/articles/15339657135383).

### id: string \[readonly\]

The unique identifier of this variable collection.

* * *

### name: string

The name of this variable collection.

* * *

### hiddenFromPublishing: boolean

Whether this variable collection is hidden when publishing the current file as a library. Can only true if [`remote`](/docs/plugins/api/VariableCollection/#remote) is false (e.g. this is a local variable collection).

* * *

### getPublishStatusAsync(): Promise<[PublishStatus](/docs/plugins/api/PublishStatus/)\>

Returns the publishing status of this variable collection in the current file.

* * *

### remote: boolean \[readonly\]

Whether this variable collection is remote or local.

* * *

### isExtension: boolean \[readonly\]

Whether this variable collection is an extension of another variable collection.

* * *

### modes: Array<{ modeId: string; name: string }> \[readonly\]

The list of modes defined for this variable collection.

* * *

### variableIds: string\[\] \[readonly\]

The list of variables contained in this variable collection.

Note that the order of these variables is roughly the same as what is shown in Figma Design, however it does not account for groups. As a result, the order of these variables may not exactly reflect the exact ordering and grouping shown in the authoring UI.

* * *

### defaultModeId: string \[readonly\]

The default mode ID for this collection.

* * *

### key: string \[readonly\]

The key to use with [`getVariablesInLibraryCollectionAsync`](/docs/plugins/api/properties/figma-teamlibrary-getvariablesinlibrarycollectionasync/).

Note that while this key is present on local and published variable collections, `TeamLibaryAPI` can only be used to query the variables of variable collections that are already published.

* * *

### extend(name: string): [ExtendedVariableCollection](/docs/plugins/api/ExtendedVariableCollection/)

Creates an extended variable collection from this variable collection. Returns the newly created extended variable collection. This method is only available on local variable collections.

info

This API is limited to the Enterprise plan. If limited by the current pricing tier, this method will throw an error with the message `in extend: Cannot create extended collections outside of enterprise plan.`

See [Figma plans and features](https://help.figma.com/hc/en-us/articles/360040328273) for more information.

* * *

### remove(): void

Removes this variable collection and all of its variables from the document.

* * *

### removeMode(modeId: string): void

Removes the given mode by ID.

* * *

### addMode(name: string): string

Adds a new mode with the given name to this collection. Returns the newly created mode ID.

info

This API is limited by the current file's pricing tier. If limited the current pricing tier, this method will throw an error with the message `in addMode: Limited to N modes only`, where N is the mode limit.

See [Figma plans and features](https://help.figma.com/hc/en-us/articles/360040328273) for more information.

* * *

### renameMode(modeId: string, newName: string): void

Renames the given mode.

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

*   [Variable Collection properties](#variable-collection-properties)
*   [Plugin data properties](#plugin-data-properties)
