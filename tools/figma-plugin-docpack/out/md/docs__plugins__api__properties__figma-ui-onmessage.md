# onmessage | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-ui-onmessage/
scraped_at: 2025-12-22T03:30:54.719Z
---

On this page

Register a handler for incoming messages from the UI's `<iframe>` window.

## Signature[​](#signature "Direct link to Signature")

### [onmessage](/docs/plugins/api/properties/figma-ui-onmessage/): [MessageEventHandler](/docs/plugins/api/properties/figma-ui-onmessage/#message-event-handler) | undefined

## Remarks[​](#remarks "Direct link to Remarks")

The `pluginMessage` argument contains the message passed by the call to `postMessage` on the UI side.

The `props` argument contains a `origin` property contains the origin of the document that sent the message. It is an advanced feature, mainly used for implementing OAuth.

*   [Signature](#signature)
*   [Remarks](#remarks)
