# Variable | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Variable/
scraped_at: 2025-12-22T03:30:40.771Z
---

On this page

## Variable properties[​](#variable-properties "Direct link to Variable properties")

A `Variable` is a single design token that defines values for each of the modes in its [`VariableCollection`](/docs/plugins/api/VariableCollection/). These values can be applied to various kinds of design properties and prototyping actions, enabling design token functionality and advanced prototyping flows.

Read more about variables in the [Guide to variables](https://help.figma.com/hc/en-us/articles/15339657135383).

### id: string \[readonly\]

The unique identifier of this variable.

* * *

### name: string

The name of this variable.

* * *

### description: string

Description of this variable.

* * *

### [hiddenFromPublishing](/docs/plugins/api/properties/Variable-hiddenfrompublishing/): boolean

Whether this variable is hidden when publishing the current file as a library. Can only true if [`remote`](/docs/plugins/api/Variable/#remote) is false (e.g. this is a local variable).

[View more →](/docs/plugins/api/properties/Variable-hiddenfrompublishing/)

* * *

### getPublishStatusAsync(): Promise<[PublishStatus](/docs/plugins/api/PublishStatus/)\>

Returns the publishing status of this variable in the current file.

* * *

### remote: boolean \[readonly\]

Whether this variable is remote or local.

* * *

### variableCollectionId: string \[readonly\]

The ID of the collection that contains this variable.

* * *

### key: string \[readonly\]

The key to use with [`importVariableByKeyAsync`](/docs/plugins/api/properties/figma-variables-importvariablebykeyasync/). Note that while this key is present on local and published variables, you can only import variables that are already published.

* * *

### resolvedType: [VariableResolvedDataType](/docs/plugins/api/VariableResolvedDataType/) \[readonly\]

The resolved type of the variable.

* * *

### [resolveForConsumer](/docs/plugins/api/properties/Variable-resolveforconsumer/)(consumer: [SceneNode](/docs/plugins/api/nodes/#scene-node)): { value: [VariableValue](/docs/plugins/api/VariableValue/); resolvedType: [VariableResolvedDataType](/docs/plugins/api/VariableResolvedDataType/) }

Retrieves the resolved value for this variable if it was bound to `consumer`.

[View more →](/docs/plugins/api/properties/Variable-resolveforconsumer/)

* * *

### setValueForMode(modeId: string, newValue: [VariableValue](/docs/plugins/api/VariableValue/)): void

Sets the value of this variable for the provided mode. If the modeId belongs to an extended collection, the value will be overridden on the extension.

* * *

### valuesByMode: { \[modeId: string\]: [VariableValue](/docs/plugins/api/VariableValue/) } \[readonly\]

The values for each mode of this variable. Note that this will not resolve any aliases. To return fully resolved values in all cases, consider using [`resolveForConsumer`](/docs/plugins/api/properties/Variable-resolveforconsumer/).

* * *

### remove(): void

Removes this variable from the document.

* * *

### [scopes](/docs/plugins/api/properties/Variable-scopes/): Array<[VariableScope](/docs/plugins/api/VariableScope/)\>

An array of scopes in the UI where this variable is shown. Setting this property will show/hide this variable in the variable picker UI for different fields.

[View more →](/docs/plugins/api/properties/Variable-scopes/)

* * *

### codeSyntax: { \[platform in [CodeSyntaxPlatform](/docs/plugins/api/CodeSyntaxPlatform/#code-syntax-platform)\]?: string} \[readonly\]

Code syntax definitions for this variable. Supported platforms are `'WEB'`, `'ANDROID'`, and `'iOS'`.

* * *

### [setVariableCodeSyntax](/docs/plugins/api/properties/Variable-setvariablecodesyntax/)(platform: [CodeSyntaxPlatform](/docs/plugins/api/CodeSyntaxPlatform/#code-syntax-platform), value: string): void

Add or modify a platform definition on [`codeSyntax`](/docs/plugins/api/Variable/#codesyntax). Acceptable platforms are `'WEB'`, `'ANDROID'`, and `'iOS'`.

[View more →](/docs/plugins/api/properties/Variable-setvariablecodesyntax/)

* * *

### removeVariableCodeSyntax(platform: [CodeSyntaxPlatform](/docs/plugins/api/CodeSyntaxPlatform/#code-syntax-platform)): void

Remove a platform definition from [`codeSyntax`](/docs/plugins/api/Variable/#codesyntax). Acceptable parameters are `'WEB'`, `'ANDROID'`, and `'iOS'` if previously defined.

* * *

### valuesByModeForCollectionAsync(collection: [VariableCollection](/docs/plugins/api/VariableCollection/)): Promise<{ \[modeId: string\]: [VariableValue](/docs/plugins/api/VariableValue/) }>

The overridden or inherited values for each mode for the provided collection that inherits this variable. Note that this will not resolve any aliases. To return fully resolved values in all cases, consider using [`resolveForConsumer`](/docs/plugins/api/properties/Variable-resolveforconsumer/).

* * *

### removeOverrideForMode(extendedModeId: string): void

Removes the overridden value for the given mode if it exists and returns to the inherited value.

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

*   [Variable properties](#variable-properties)
*   [Plugin data properties](#plugin-data-properties)
