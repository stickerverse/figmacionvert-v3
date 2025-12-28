# figma.ui | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-ui/
scraped_at: 2025-12-22T03:30:28.318Z
---

These are methods and properties available on the `figma.ui` global object. A UI is created via [`figma.showUI`](/docs/plugins/api/properties/figma-showui/). See the [Creating a User Interface](/docs/plugins/creating-ui/) tutorial on how to use this API.

### show(): void

Makes the plugin's UI visible. Use this to show the UI if it was created using `figma.showUI(..., { visible: false })`, or after a call to `figma.ui.hide()`.

* * *

### hide(): void

Hides the current UI. The UI will still continue to run code and be able to send and receive messages. However, it is not rendered to the user.

* * *

### resize(width: number, height: number): void

Changes the size of the UI, after it has been created. Note that the size can also be set in the initial options. The minimum size is 70x0.

* * *

### reposition(x: number, y: number): void

Changes the position of the UI, after it has been created. Note that the position can also be set in the initial options.

* * *

### getPosition(): { windowSpace: [Vector](/docs/plugins/api/Vector/); canvasSpace: [Vector](/docs/plugins/api/Vector/) }

Fetches the position of the UI in window space and canvas space. Throws an error when no UI is available.

* * *

### close(): void

Destroys the UI and its containing `<iframe>`. Once this has been called, the code inside the iframe will be stopped and you can no longer send messages to and from it.

* * *

### [postMessage](/docs/plugins/api/properties/figma-ui-postmessage/)(pluginMessage: any, options?: [UIPostMessageOptions](/docs/plugins/api/properties/figma-ui-postmessage/#uipost-message-options)): void

Sends a message to the UI's `<iframe>` window.

[View more →](/docs/plugins/api/properties/figma-ui-postmessage/)

* * *

### [onmessage](/docs/plugins/api/properties/figma-ui-onmessage/): [MessageEventHandler](/docs/plugins/api/properties/figma-ui-onmessage/#message-event-handler) | undefined

Register a handler for incoming messages from the UI's `<iframe>` window.

[View more →](/docs/plugins/api/properties/figma-ui-onmessage/)

* * *

### [on](/docs/plugins/api/properties/figma-ui-on/)(type: 'message', callback: [MessageEventHandler](/docs/plugins/api/properties/figma-ui-onmessage/#message-event-handler)): void

Register a handler for incoming messages from the UI's `<iframe>` window.

[View more →](/docs/plugins/api/properties/figma-ui-on/)

* * *

### once(type: 'message', callback: [MessageEventHandler](/docs/plugins/api/properties/figma-ui-onmessage/#message-event-handler)): void

Register a handler for incoming messages from the UI's `<iframe>` window. Same as `figma.ui.on("message")`, but only gets called the first time.

* * *

### off(type: 'message', callback: [MessageEventHandler](/docs/plugins/api/properties/figma-ui-onmessage/#message-event-handler)): void

Removes a handler added via `figma.ui.on`.

* * *
