# on | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-codegen-on/
scraped_at: 2025-12-22T03:30:55.573Z
---

On this page

A plugin for code generation needs to call `figma.codegen.on('generate')` to register a callback that will be called when a user's selection changes in Dev Mode. This callback should return an array of JSON objects that represent the sections in the Inspect panel. The callback has a 15 second timeout and returns an error if it times out. For more information, see the remarks.

## Signature[​](#signature "Direct link to Signature")

### [on](/docs/plugins/api/properties/figma-codegen-on/)(type: 'generate', callback: (event: [CodegenEvent](/docs/plugins/api/CodegenEvent/)) => Promise<[CodegenResult](/docs/plugins/api/CodegenResult/)\[\]> | [CodegenResult](/docs/plugins/api/CodegenResult/)\[\]): void

### [on](/docs/plugins/api/properties/figma-codegen-on/)(type: 'preferenceschange', callback: (event: [CodegenPreferencesEvent](/docs/plugins/api/CodegenPreferencesEvent/)) => Promise<void>): void

## Parameters[​](#parameters "Direct link to Parameters")

### type[​](#type "Direct link to type")

The type of event to add the callback for: 'generate' or 'preferenceschange'.

### callback[​](#callback "Direct link to callback")

The callback that is called when the event is triggered.

## Remarks[​](#remarks "Direct link to Remarks")

This callback can be async if your plugin needs to do some data fetching or other async operation to generate code.

info

`figma.showUI` is not allowed within the generate callback. Instead, if [`figma.showUI`](/docs/plugins/api/properties/figma-showui/) is required in the generate callback, the `showUI` call should be moved outside of the callback and [`figma.ui.postMessage`](/docs/plugins/api/properties/figma-ui-postmessage/) should be used within the callback instead. This ensures that the plugin is able to handle concurrent "generate" events.

A plugin can also register a callback to handle events when codegen preferences are modified. This is useful for codegenPreferences that need to open an iframe to get more user input.

info

Only preferences with `itemType: "action"` will trigger the \`"preferenceschange"\`\` callback.

The callback has a 15 second timeout. If the callback registered by `figma.codegen.on('generate')` doesn't return a value within 15 seconds (for example, if the array of JSON objects takes too long to construct), the operation ends and an error message is sent to the console:

Callback timeout error

```
code generation timed out after 15 seconds
```

Additionally, a notification appears in the Code section of the Inspect panel to alert the plugin's user of the error:

Inspect panel timeout error

```
<Plugin name> ran into an issueThis plugin is created by a third party and notmaintained by Figma, so to give feedback pleasereach out to the developer.
```

The error in the Inspect panel includes a link to your plugin's community page.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [type](#type)
    *   [callback](#callback)
*   [Remarks](#remarks)
