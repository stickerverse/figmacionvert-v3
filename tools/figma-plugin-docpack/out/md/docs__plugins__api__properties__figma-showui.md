# showUI | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-showui/
scraped_at: 2025-12-22T03:30:29.884Z
---

On this page

Enables you to render UI to interact with the user, or simply to access browser APIs. This function creates a modal dialog with an `<iframe>` containing the HTML markup in the `html` argument.

## Signature[​](#signature "Direct link to Signature")

### [showUI](/docs/plugins/api/properties/figma-showui/)(html: string, options?: [ShowUIOptions](/docs/plugins/api/properties/figma-showui/#show-uioptions)): void

## Parameters[​](#parameters "Direct link to Parameters")

### html[​](#html "Direct link to html")

The HTML to insert into the iframe. You can pass in the HTML code as a string here, but this will often be the global value [`__html__`](/docs/plugins/api/global-objects/#html).

### options[​](#options "Direct link to options")

An object that may contain the following optional parameters:

*   `visible`: Whether the UI starts out displayed to the user. Defaults to `true`. You can use `figma.ui.show()` and `figma.ui.hide()` to change the visibility later.
*   `width`: The width of the UI. Defaults to 300. Minimum is 70. Can be changed later using `figma.ui.resize(width, height)`
*   `height`: The height of the UI. Defaults to 200. Minimum is 0. Can be changed later using `figma.ui.resize(width, height)`
*   `title`: The title of the UI window. Defaults to the plugin name.
*   `position`: The position of the UI window. Defaults to the last position of the iframe or the center of the viewport. If specified, expects an X/Y coordinate in the canvas space (i.e matches x/y values returned by `<PluginNode>.x` and `<PluginNode>.y`)
*   `themeColors`: Defaults to `false`. When enabled, CSS variables will be added to the plugin iframe to allow [support for light and dark themes](/docs/plugins/css-variables/).

info

If the position specified is outside of the user's viewport, the iframe will be moved so that it remains in the user's viewport.

## Remarks[​](#remarks "Direct link to Remarks")

The easiest way to use this API is to load the HTML file defined in the manifest. This enables writing a separate HTML file which can be accessed through the [`__html__`](/docs/plugins/api/global-objects/#html) global variable.

If the `<iframe>` UI is already showing when this function is called, the previous UI will be closed before the new one is displayed.

## Usage Examples[​](#usage-examples "Direct link to Usage Examples")

Example usage

```
figma.showUI(  "<b>Hello from Figma</b>",  { width: 400, height: 200, title: "My title" })figma.showUI(  "<b>Hello from Figma</b>",  { width: 400, height: 200, title: "My title", position: { x: 100, y: 100 } })figma.showUI(__html__)
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [html](#html)
    *   [options](#options)
*   [Remarks](#remarks)
*   [Usage Examples](#usage-examples)
