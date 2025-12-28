# ExtendedVariableCollection | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/ExtendedVariableCollection/
scraped_at: 2025-12-22T03:30:57.570Z
---

On this page

## Extended Variable Collection properties[​](#extended-variable-collection-properties "Direct link to Extended Variable Collection properties")

An `ExtendedVariableCollection` is a `VariableCollection` that extends another `VariableCollection` to enable theming. When extending a collection, the extension inherits the modes and variables from its parent variable collection. In an extended collection, a variable mode value can be overridden from its default value to give it a theme-specific value. For examples, see [Working with Variables](/docs/plugins/working-with-variables/#extended-variable-collections).

info

This feature is limited to the Enterprise plan.

### isExtension: true \[readonly\]

`isExtension` is set to `true` to distinguish an extended collection from base variable collections.

* * *

### parentVariableCollectionId: string \[readonly\]

The ID of the parent variable collection.

* * *

### variableIds: string\[\] \[readonly\]

The list of variables contained in this extended variable collection including variables that are inherited from its parent collection.

* * *

### variableOverrides: { \[variableId: string\]: { \[extendedModeId: string\]: [VariableValue](/docs/plugins/api/VariableValue/) } } \[readonly\]

The overridden variable values in this extended variable collection.

* * *

### removeOverridesForVariable(variableToClear: [Variable](/docs/plugins/api/Variable/)): void

Removes all overridden values in this extended collection for the given variable.

* * *

### modes: Array<{ modeId: string; name: string; parentModeId: string }> \[readonly\]

The modes inherited from the parent collection.

* * *

### removeMode(modeId: string): void

Removes the given mode by ID if its parent mode has been deleted.

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

*   [Extended Variable Collection properties](#extended-variable-collection-properties)
*   [Plugin data properties](#plugin-data-properties)
