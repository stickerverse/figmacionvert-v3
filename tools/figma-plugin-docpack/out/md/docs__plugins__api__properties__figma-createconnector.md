# createConnector | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createconnector/
scraped_at: 2025-12-22T03:30:31.494Z
---

On this page

info

This API is only available in FigJam

Creates a new connector. The behavior is similar to using the `Shift-C` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createConnector](/docs/plugins/api/properties/figma-createconnector/)(): [ConnectorNode](/docs/plugins/api/ConnectorNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has a width of 200, and is parented under `figma.currentPage`.

Add a connector between two stickies

```
// Create two stickiesconst stickyLeft = figma.createSticky()stickyLeft.x = -200const stickyRight = figma.createSticky()stickyRight.x = 200// Connect the two stickiesconst connector = figma.createConnector()connector.connectorStart = {  endpointNodeId: stickyLeft.id,  magnet: 'AUTO'}connector.connectorEnd = {  endpointNodeId: stickyRight.id,  magnet: 'AUTO'}
```

*   [Signature](#signature)
*   [Remarks](#remarks)
