# mode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-mode/
scraped_at: 2025-12-22T03:30:29.555Z
---

On this page

Return the context the plugin is current running in.

*   `default` - The plugin is running as a normal plugin.
*   `textreview` - The plugin is running to provide text review functionality.
*   `inspect` - The plugin is running in the Inspect panel in Dev Mode.
*   `codegen` - The plugin is running in the Code section of the Inspect panel in Dev Mode.
*   `linkpreview` - The plugin is generating a link preview for a [Dev resource](https://help.figma.com/hc/en-us/articles/15023124644247#Add_external_links_and_resources_for_developers) in Dev Mode.
*   `auth` - The plugin is running to authenticate a user in Dev Mode.

caution

The `linkpreview` and `auth` modes are only available to partner and Figma-owned plugins.

## Signature[​](#signature "Direct link to Signature")

### [mode](/docs/plugins/api/properties/figma-mode/): 'default' | 'textreview' | 'inspect' | 'codegen' | 'linkpreview' | 'auth' \[readonly\]

## Remarks[​](#remarks "Direct link to Remarks")

Here’s a simplified example where you can create an if statement in a plugin that has one set of functionality when it is run in `Dev Mode`, and another set of functionality when run in Figma design:

Code sample to determine editorType and mode

```
if (figma.editorType === "dev") {  // Read the document and listen to API events  if (figma.mode === "inspect") {    // Running in inspect panel mode  } else if (figma.mode === "codegen") {    // Running in codegen mode  }} else if (figma.editorType === "figma") {  // If the plugin is run in Figma design, edit the document  if (figma.mode === 'textreview') {    // Running in text review mode  }} else if (figma.editorType === "figjam") {  // Do FigJam only operations  if (figma.mode === 'textreview') {    // Running in text review mode  }}
```

*   [Signature](#signature)
*   [Remarks](#remarks)
