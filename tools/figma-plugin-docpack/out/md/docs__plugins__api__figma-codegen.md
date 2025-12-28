# figma.codegen | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-codegen/
scraped_at: 2025-12-22T03:30:28.680Z
---

info

This API is only available in Figma Dev Mode

Plugins in Dev Mode can extend Figma's native [code snippets](https://help.figma.com/hc/en-us/articles/15023124644247#Build_faster_with_customizable_code_snippets) to generate code for languages or frameworks that Figma doesn’t support, or to surface metadata that a front-end developer might find useful when implementing a design in code (e.g. where to import icons in a codebase or internationalization string extraction).

Plugins in Dev Mode specifically built for code generation ("codegen") appear in the Figma's native language dropdown. Once selected from this menu, the `figma.codegen.on("generate")` callback will get called any time the user's selection changes.

If you are building a plugin specifically for code generation, then you need to add the following to your manifest.

Add the following properties to your manifest.json

```
{  "editorType": ["dev"],  "capabilities": ["codegen"]}
```

These are methods and properties available on the `figma.codegen` object:

### [on](/docs/plugins/api/properties/figma-codegen-on/)(type: 'generate', callback: (event: [CodegenEvent](/docs/plugins/api/CodegenEvent/)) => Promise<[CodegenResult](/docs/plugins/api/CodegenResult/)\[\]> | [CodegenResult](/docs/plugins/api/CodegenResult/)\[\]): void

### [on](/docs/plugins/api/properties/figma-codegen-on/)(type: 'preferenceschange', callback: (event: [CodegenPreferencesEvent](/docs/plugins/api/CodegenPreferencesEvent/)) => Promise<void>): void

A plugin for code generation needs to call `figma.codegen.on('generate')` to register a callback that will be called when a user's selection changes in Dev Mode. This callback should return an array of JSON objects that represent the sections in the Inspect panel. The callback has a 15 second timeout and returns an error if it times out. For more information, see the remarks.

[View more →](/docs/plugins/api/properties/figma-codegen-on/)

* * *

### once(type: 'generate', callback: (event: [CodegenEvent](/docs/plugins/api/CodegenEvent/)) => Promise<[CodegenResult](/docs/plugins/api/CodegenResult/)\[\]> | [CodegenResult](/docs/plugins/api/CodegenResult/)\[\]): void

### once(type: 'preferenceschange', callback: (event: [CodegenPreferencesEvent](/docs/plugins/api/CodegenPreferencesEvent/)) => Promise<void>): void

Same as [`figma.codegen.on`](/docs/plugins/api/properties/figma-codegen-on/), but the callback only gets called the first time.

* * *

### off(type: 'generate', callback: (event: [CodegenEvent](/docs/plugins/api/CodegenEvent/)) => Promise<[CodegenResult](/docs/plugins/api/CodegenResult/)\[\]> | [CodegenResult](/docs/plugins/api/CodegenResult/)\[\]): void

### off(type: 'preferenceschange', callback: (event: [CodegenPreferencesEvent](/docs/plugins/api/CodegenPreferencesEvent/)) => Promise<void>): void

Removes a callback added by [`figma.codegen.on`](/docs/plugins/api/properties/figma-codegen-on/) or [`figma.codegen.once`](/docs/plugins/api/figma-codegen/#once).

* * *

### preferences: [CodegenPreferences](/docs/plugins/api/CodegenPreference/#codegen-preferences) \[readonly\]

Read the current preferences as specified by the user.

```
type CodegenPreferences = {  readonly unit: 'PIXEL' | 'SCALED'  readonly scaleFactor?: number  // An object for every "select" item and their currently  // selected values. The format of this is "select" item  // propertyName => selectedOption.value.  readonly customSettings: Record<string, string>}
```

* * *

### refresh: () => void

Triggers the `figma.codegen.on("generate")` callback again.

This is is useful for plugins that need to refresh the codegen output. For example, if you’re using an iframe to provide more customization options.

* * *
