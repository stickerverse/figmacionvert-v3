# findWidgetNodesByWidgetId | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findwidgetnodesbywidgetid/
scraped_at: 2025-12-22T03:30:41.846Z
---

On this page

Searches the entire document tree. Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this function.

Supported on:

*   [DocumentNode](/docs/plugins/api/DocumentNode/)

## Signature[​](#signature "Direct link to Signature")

### [findWidgetNodesByWidgetId](/docs/plugins/api/properties/DocumentNode-findwidgetnodesbywidgetid/)(widgetId: string): Array<[WidgetNode](/docs/plugins/api/WidgetNode/)\>

## Parameters[​](#parameters "Direct link to Parameters")

### widgetId[​](#widgetid "Direct link to widgetId")

The widget ID to search for, which represents unique identifier for the widget.

## Remarks[​](#remarks "Direct link to Remarks")

`node.widgetId` is not to be confused with `node.id`, which is the unique identifier for the node on the canvas. In other words, if you clone a widget, the cloned widget will have a matching `widgetId` but a different `id`.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [widgetId](#widgetid)
*   [Remarks](#remarks)
