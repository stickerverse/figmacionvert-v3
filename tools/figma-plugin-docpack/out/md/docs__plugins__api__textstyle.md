# TextStyle | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/TextStyle/
scraped_at: 2025-12-22T03:30:41.521Z
---

On this page

## TextStyle[​](#textstyle "Direct link to TextStyle")

### type: 'TEXT'

The string literal "TEXT" representing the style type. Always check the `type` before reading other properties.

* * *

### fontSize: number

Value to replace the text [`fontSize`](/docs/plugins/api/TextNode/#fontsize) with.

* * *

### textDecoration: [TextDecoration](/docs/plugins/api/TextDecoration/)

Value to replace the text [`textDecoration`](/docs/plugins/api/TextNode/#textdecoration) with.

* * *

### fontName: [FontName](/docs/plugins/api/FontName/)

Value to replace the text [`fontName`](/docs/plugins/api/TextNode/#fontname) with.

* * *

### letterSpacing: [LetterSpacing](/docs/plugins/api/LetterSpacing/)

Value to replace the text [`letterSpacing`](/docs/plugins/api/TextNode/#letterspacing) with.

* * *

### lineHeight: [LineHeight](/docs/plugins/api/LineHeight/)

Value to replace the text [`lineHeight`](/docs/plugins/api/TextNode/#lineheight) with.

* * *

### leadingTrim: [LeadingTrim](/docs/plugins/api/LeadingTrim/)

Value to replace the text [`leadingTrim`](/docs/plugins/api/TextNode/#leadingtrim) with.

* * *

### paragraphIndent: number

Value to replace the text [`paragraphIndent`](/docs/plugins/api/TextNode/#paragraphindent) with.

* * *

### paragraphSpacing: number

Value to replace the text [`paragraphSpacing`](/docs/plugins/api/TextNode/#paragraphspacing) with.

* * *

### listSpacing: number

Value to replace the text [`listSpacing`](/docs/plugins/api/TextNode/#listspacing) with.

* * *

### hangingPunctuation: boolean

Value to replace the text [`hangingPunctuation`](/docs/plugins/api/TextNode/#hangingpunctuation) with.

* * *

### hangingList: boolean

Value to replace the text [`hangingList`](/docs/plugins/api/TextNode/#hanginglist) with.

* * *

### textCase: [TextCase](/docs/plugins/api/TextCase/)

Value to replace the text [`textCase`](/docs/plugins/api/TextNode/#textcase) with.

* * *

### boundVariables?: { \[field in [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)}

The variables bound to a particular field on this text style.

* * *

### setBoundVariable(field: [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/), variable: [Variable](/docs/plugins/api/Variable/) | null): void

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

[View more →](/docs/plugins/api/properties/TextStyle-setboundvariable/)

* * *

## Base style properties[​](#base-style-properties "Direct link to Base style properties")

### id: string \[readonly\]

The unique identifier of the style in the document the plugin is executing from. You can assign this value via `setFillStyleIdAsync`, `setStrokeStyleIdAsync`, `setTextStyleIdAsync`, etc. to make the node properties reflect that of the style node.

* * *

### getStyleConsumersAsync(): Promise<[StyleConsumers](/docs/plugins/api/StyleConsumers/)\[\]>

The consumers of this style. The `fields` in `StyleConsumers` refers to the field where the style is applied (e.g. a PaintStyle can be applied in `setFillStyleIdAsync` or `setStrokeStyleIdAsync`).

* * *

### consumers: [StyleConsumers](/docs/plugins/api/StyleConsumers/)\[\] \[readonly\]

**DEPRECATED:** Use `getStyleConsumersAsync` instead. Accessing this property will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

The consumers of this style. The `fields` in `StyleConsumers` refers to the field where the style is applied (e.g. a PaintStyle can be applied in `setFillStyleIdAsync` or `setStrokeStyleIdAsync`).

* * *

### name: string

The name of the style node. Note that setting this also sets "autoRename" to false on [`TextNode`](/docs/plugins/api/TextNode/).

* * *

### remove(): void

Deletes a local style.

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

## Publishable properties[​](#publishable-properties "Direct link to Publishable properties")

### [description](/docs/plugins/api/properties/nodes-description/): string

The plain-text annotation entered by the user for this style/component.

[View more →](/docs/plugins/api/properties/nodes-description/)

* * *

### [descriptionMarkdown](/docs/plugins/api/properties/nodes-descriptionmarkdown/): string

The rich-text annotation entered by the user for this style/component.

[View more →](/docs/plugins/api/properties/nodes-descriptionmarkdown/)

* * *

### [documentationLinks](/docs/plugins/api/properties/nodes-documentationlinks/): ReadonlyArray<[DocumentationLink](/docs/plugins/api/DocumentationLink/)\>

The documentation links for this style/component.

[View more →](/docs/plugins/api/properties/nodes-documentationlinks/)

* * *

### remote: boolean \[readonly\]

Whether this style/component is a remote style/component that doesn't live in the file (i.e. is from the team library). Remote components are read-only: attempts to change their properties will throw.

* * *

### key: string \[readonly\]

The key to use with [`figma.importComponentByKeyAsync`](/docs/plugins/api/figma/#importcomponentbykeyasync), [`figma.importComponentSetByKeyAsync`](/docs/plugins/api/figma/#importcomponentsetbykeyasync) and [`figma.importStyleByKeyAsync`](/docs/plugins/api/figma/#importstylebykeyasync). Note that while this key is present on local and published components, you can only import components that are already published.

* * *

### getPublishStatusAsync(): Promise<[PublishStatus](/docs/plugins/api/PublishStatus/)\>

Gets the status of this style/component in the team library.

* * *

## Folders[​](#folders "Direct link to Folders")

Styles can be put inside folders (including nested folders) by setting the name of the style to be a delimited path name. For example, the following code would move a paint style named `Style 1` into a nested folder named `b`. Folder `b` resides in folder `a`.

```
const style = figma.createPaintStyle() style.name = "a/b/Style 1"
```

Folder names cannot be empty strings and they are unique within the same hierarchy. Since two nested folders can have the same name when residing in different parent folders, we refer to folders by their absolute delimited folder name. The following function `getNamePrefix` can be used to get the absolute folder name given a style name.

```
const getNameParts = (name: string) => {  const nameParts = name.split('/').filter((part: string) => !!part)  return nameParts.map((part: string) => part.trim())}const getNamePrefix = (name: string): string => {  const pathParts = getNameParts(name)  pathParts.pop()  return pathParts.join('/')}
```

*   [TextStyle](#textstyle)
*   [Base style properties](#base-style-properties)
*   [Plugin data properties](#plugin-data-properties)
*   [Publishable properties](#publishable-properties)
*   [Folders](#folders)
