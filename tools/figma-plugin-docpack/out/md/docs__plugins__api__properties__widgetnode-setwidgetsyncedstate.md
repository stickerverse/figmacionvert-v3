# setWidgetSyncedState | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/WidgetNode-setwidgetsyncedstate/
scraped_at: 2025-12-22T03:30:51.875Z
---

On this page

Sets the entire synced state and synced map values for a widget. This function only sets the synced state for widgets with a matching `node.widgetId` (an instance of the same widget). This means that running this function only works inside of a widget.

Supported on:

*   [WidgetNode](/docs/plugins/api/WidgetNode/)

## Signature[​](#signature "Direct link to Signature")

### [setWidgetSyncedState](/docs/plugins/api/properties/WidgetNode-setwidgetsyncedstate/)(syncedState: { \[name: string\]: any }, syncedMap?: { \[mapName: string\]: { \[key: string\]: any } }): void

## Parameters[​](#parameters "Direct link to Parameters")

### syncedState[​](#syncedstate "Direct link to syncedState")

synced state values to set in the WidgetNode.

### syncedMap[​](#syncedmap "Direct link to syncedMap")

synced map values to set in the WidgetNode.

## Remarks[​](#remarks "Direct link to Remarks")

Prior to setting the synced state, the existing synced state is cleared. This means the synced state values will replace the existing synced state. This behaves differently than `node.cloneWidget()` which will only override the passed in synced state and synced map values and preserve the others. Callers should explicitly pass in entire synced state and synced map objects. You can use [node.widgetSyncedState](https://figma.com/widget-docs/managing-multiple-widgets/#widgetnodewidgetsyncedstate) to get the current synced state.

If you try to set the synced state for a widget with a different version of the same widget, that widget will automatically update to match the running widget's version. This ensures that the synced state values you set will always be compatible with the widget. A side effect of this is that a widget may get downgraded to a lower version.

To get a list of other widgets with the same `widgetId`, check out [findWidgetNodesByWidgetId](/docs/plugins/api/properties/nodes-findwidgetnodesbywidgetid/).

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [syncedState](#syncedstate)
    *   [syncedMap](#syncedmap)
*   [Remarks](#remarks)
