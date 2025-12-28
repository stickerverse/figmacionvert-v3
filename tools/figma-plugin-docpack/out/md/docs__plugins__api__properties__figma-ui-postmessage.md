# postMessage | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-ui-postmessage/
scraped_at: 2025-12-22T03:30:54.714Z
---

On this page

Sends a message to the UI's `<iframe>` window.

## Signature[​](#signature "Direct link to Signature")

### [postMessage](/docs/plugins/api/properties/figma-ui-postmessage/)(pluginMessage: any, options?: [UIPostMessageOptions](/docs/plugins/api/properties/figma-ui-postmessage/#uipost-message-options)): void

## Parameters[​](#parameters "Direct link to Parameters")

### pluginMessage[​](#pluginmessage "Direct link to pluginMessage")

This can be almost any data type or plain object, as long as it's a serializable object.

This is similar to saying that it should be possible to send the object over a network if it were necessary. You can send objects, arrays, numbers, strings, booleans, null, undefined, Date objects and Uint8Array objects. However, functions and prototype chains of objects will not be sent.

These restrictions are the same as the browser's `postMessage`: [click here](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) for more details.

### options[​](#options "Direct link to options")

An object that may contain the following optional parameters:

*   `origin`: An advanced option, mainly used for implementing OAuth. If the `origin` option is provided, the message will only be delivered to the iframe if the origin of the document inside the iframe matches the `origin`. This defaults to `'*'`, which allows the message to be passed to any document.

## Remarks[​](#remarks "Direct link to Remarks")

Read more about how to use this API in the [Creating a User Interface](/docs/plugins/creating-ui/) tutorial.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [pluginMessage](#pluginmessage)
    *   [options](#options)
*   [Remarks](#remarks)
