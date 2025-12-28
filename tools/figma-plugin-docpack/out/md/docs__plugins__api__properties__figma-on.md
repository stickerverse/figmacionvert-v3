# on | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-on/
scraped_at: 2025-12-22T03:30:30.298Z
---

On this page

Registers an callback that will be called when an event happens in the editor. Current supported events are:

*   The selection on the current page changed.
*   The current page changed.
*   The document has changed.
*   An object from outside Figma is dropped onto the canvas
*   The plugin has started running.
*   The plugin closed.
*   The plugin has started running.
*   The timer has started running.
*   The timer has paused.
*   The timer has stopped.
*   The timer is done.
*   The timer has resumed.

## Signature[​](#signature "Direct link to Signature")

### [on](/docs/plugins/api/properties/figma-on/)(type: [ArgFreeEventType](/docs/plugins/api/properties/figma-on/#arg-free-event-type), callback: () => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'run', callback: (event: [RunEvent](/docs/plugins/api/RunEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'drop', callback: (event: [DropEvent](/docs/plugins/api/DropEvent/)) => boolean): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'documentchange', callback: (event: [DocumentChangeEvent](/docs/plugins/api/DocumentChangeEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](/docs/plugins/api/SlidesViewChangeEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](/docs/plugins/api/CanvasViewChangeEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'textreview', callback: (event: [TextReviewEvent](/docs/plugins/api/TextReviewEvent/)) => Promise<[TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]> | [TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'stylechange', callback: (event: [StyleChangeEvent](/docs/plugins/api/StyleChangeEvent/)) => void): void

## Parameters[​](#parameters "Direct link to Parameters")

### type[​](#type "Direct link to type")

A string identifying the type of event that the callback will be called on.

This is either an `ArgFreeEventType`, `run`, `drop`, or `documentchange`. The `run` event callback will be passed a `RunEvent`. The `drop` event callback will be passed a `DropEvent`. The `documentchange` event callback will be passed a `DocumentChangeEvent`.

```
type ArgFreeEventType =  "selectionchange" |  "currentpagechange" |  "close" |  "timerstart" |  "timerstop" |  "timerpause" |  "timerresume" |  "timeradjust" |  "timerdone"
```

### callback[​](#callback "Direct link to callback")

A function that will be called when the event happens. If `type` is 'run', then this function will be passed a `RunEvent`. If `type` is 'drop', then this function will be passed a `DropEvent`. If `type` is 'documentchange', then this function will be passed a `DocumentChangeEvent`.

Otherwise nothing will be passed in.

## Remarks[​](#remarks "Direct link to Remarks")

This API tries to match Node.js conventions around similar `.on` APIs.

It's important to understand that the `.on` API runs the callbacks **asynchronously**. For example:

```
figma.on("selectionchange", () => { console.log("changed") })console.log("before")figma.currentPage.selection = []console.log("after")// Output:// "before"// "after"// "changed"
```

The asynchronous nature of these APIs have a few other implications.

The callback will not necessarily be called each time the event happens. For example, this will only trigger the event once:

```
figma.currentPage.selection = [figma.createRectangle()]figma.currentPage.selection = [figma.createFrame()]
```

Nor will the ordering of the event trigger and event registration affect whether the callback is called.

```
figma.currentPage.selection = [figma.createFrame()]figma.on("selectionchange", () => { "this will get called!" })
```

## Available event types[​](#available-event-types "Direct link to Available event types")

### `"currentpagechange"`[​](#currentpagechange "Direct link to currentpagechange")

This event will trigger when the user navigates to a different page, or when the plugin changes the value of `figma.currentPage`.

### `"selectionchange"`[​](#selectionchange "Direct link to selectionchange")

This event will trigger when the selection of the **current page** changes. This can happen:

*   By user action.
*   Due to plugin code.
*   When the current page changes (a `"currentpagechange"` event always triggers a `"selectionchange"` event).
*   When a selected node is deleted.
*   When a selected node becomes the child of another selected node (in which case it is considered indirectly selected, and is no longer in `figma.currentPage.selection`)

Note also that changing the selection via the plugin API, then changing it back to its previous value immediately still triggers the event.

### `"documentchange"`[​](#documentchange "Direct link to documentchange")

If the plugin manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this event. Because this may introduce a loading delay, consider using more granular alternatives, such as the `"stylechange"` event, or using [`PageNode.on`](/docs/plugins/api/properties/PageNode-on/) with the `"nodechange"` event.

This event will trigger when a change is made to the currently open file. The event will be called when nodes/styles are either added, removed, or changed in a document.

The callback will be passed with a DocumentChangeEvent with the below interface:

```
interface DocumentChangeEvent {  documentChanges: DocumentChange[]}
```

info

Note that `DocumentChangeEvent` has a `documentChanges` property with an array of `DocumentChange`s. Figma will not call the 'documentchange' callback synchronously and will instead batch the updates and send them to the callback periodically.

There are 6 different [`DocumentChange`](/docs/plugins/api/DocumentChange/) types that we currently notify on and we might add more in the future. Each of these changes has a `type` property to distinguish them:

<table><thead><tr><th>Change</th><th><code>type</code> property</th><th>Description</th></tr></thead><tbody><tr><td><a href="/docs/plugins/api/DocumentChange/#createchange"><code>CreateChange</code></a></td><td><code>'CREATE'</code></td><td>A node has been created in the document. If a node with nested children is being added to the document a <code>CreateChange</code> will only be made for the highest level parent that was added to the document.</td></tr><tr><td><a href="/docs/plugins/api/DocumentChange/#deletechange"><code>DeleteChange</code></a></td><td><code>'DELETE'</code></td><td>A node has been removed from the document. If a node with nested children is being removed from the document a <code>DeleteChange</code> will only be made for the highest level parent that was removed from the document.</td></tr><tr><td><a href="/docs/plugins/api/DocumentChange/#propertychange"><code>PropertyChange</code></a></td><td><code>'PROPERTY_CHANGE'</code></td><td>A property of a node has changed.</td></tr><tr><td><a href="/docs/plugins/api/DocumentChange/#stylecreatechange"><code>StyleCreateChange</code></a></td><td><code>'STYLE_CREATE'</code></td><td>A style has been added to the document.</td></tr><tr><td><a href="/docs/plugins/api/DocumentChange/#styledeletechange"><code>StyleDeleteChange</code></a></td><td><code>'STYLE_DELETE'</code></td><td>A style has been removed from the document.</td></tr><tr><td><a href="/docs/plugins/api/DocumentChange/#stylepropertychange"><code>StylePropertyChange</code></a></td><td><code>'STYLE_PROPERTY_CHANGE'</code></td><td>A style has had a property changed.</td></tr></tbody></table>

#### Special cases[​](#special-cases "Direct link to Special cases")

We currently never notify a `'documentchange'` listener in the following scenarios:

*   if the change was caused directly by your plugin in a `documentchange` callback
*   if an instance sublayer was updated by a change to a main component
*   if a node was updated as a result of a style changing

#### Example[​](#example "Direct link to Example")

Here is an example of exhaustively checking changes to the document and logging them to the console.

```
figma.on("documentchange", (event) => {for (const change of event.documentChanges) {  switch (change.type) {    case "CREATE":      console.log(        `Node ${change.id} created by a ${change.origin.toLowerCase()} user`      );      break;    case "DELETE":      console.log(        `Node ${change.id} deleted by a ${change.origin.toLowerCase()} user`      );      break;    case "PROPERTY_CHANGE":      for (const prop of change.properties) {        console.log(          `Node ${            change.id          } had ${prop} changed by a ${change.origin.toLowerCase()} user`        );      }      break;    case "STYLE_CREATE":      console.log(        `Style ${change.id} created by a ${change.origin.toLowerCase()} user`      );      break;    case "STYLE_DELETE":      console.log(        `Style ${change.id} deleted by a ${change.origin.toLowerCase()} user`      );      break;     case "STYLE_PROPERTY_CHANGE":       for (const prop of change.properties) {         console.log(            `Style ${              change.id            } had ${prop} changed by a ${change.origin.toLowerCase()} user`          );       }       break;    }  }});
```

For a more involved example see our [plugin samples on GitHub](https://github.com/figma/plugin-samples/tree/master/document-change).

### `"textreview"`[​](#textreview "Direct link to textreview")

info

This event is only available to plugins that have the `"textreview"` capability in their `manifest.json` and the plugin is running in text review mode.

`"textreview"` events allow plugins to review text in a document and act as either a replacement or a supplement to native spell check.

This event is triggered periodically when the user is typing in a text node. The callback will be passed with a TextReviewEvent with the below interface:

```
interface TextReviewEvent {  text: string}
```

The `text` property is the text that the user has currently typed into the node.

A `"textreview"` event listener should return a promise that resolves to an array of `TextReviewRange` objects. Each `TextReviewRange` object represents a single range of text that should be marked as either an error or a suggestion. The `TextReviewRange` interface is defined as:

```
type TextReviewRange = {  start: number  end: number  suggestions: string[]  color?: 'RED' | 'GREEN' | 'BLUE'}
```

The `start` property is the index of the first character in the range. The `end` property is the index of the last character in the range. The `suggestions` property is an array of strings that represent the suggestions for the range. The `color` property is optional and can be used to change the color of the underline that is drawn under the range. If no color is specified the underline will be red.

For more information read our in depth guide on [text review plugins](/docs/plugins/textreview-plugins/).

### `"drop"`[​](#drop "Direct link to drop")

This event will trigger when objects outside Figma (such as elements from other browser windows, or files from the local filesystem) are dropped onto the canvas.

It can also be triggered by a special `pluginDrop` message sent from the UI. See the [Triggering drop events from the UI](/docs/plugins/creating-ui/#triggering-drop-events-from-the-ui) section for more details.

The callback will be passed a `DropEvent` with the below interface. It should return `false` if it wants to handle the particular drop and stop Figma from performing the default drop behavior.

```
interface DropEvent {  node: BaseNode | SceneNode  x: number  y: number  absoluteX: number  absoluteY: number  items: DropItem[]  files: DropFile[]  dropMetadata?: any}
```

*   The `node` property contains the node where the drop landed. This will sometimes be the page node if the drop didn't land on anything in the canvas, or if target node is locked or cannot be a parent of another node.
*   The `x` and `y` properties are coordinates relative to the node drop target
*   The `absoluteX` and `absoluteY` properties are absolute canvas coordinates
*   The `items` property is an array of `DropItem` objects. You will see multiple objects if a drop contains multiple, non-file data types. If there are no data items, this array will be empty.
*   The `files` property is an array of dropped files represented as `DropFile` objects. If no files are present, this array will be empty.
*   The `dropMetadata` property comes from drop events [explicitly triggered by the UI](/docs/plugins/creating-ui/#triggering-drop-events-from-the-ui).

Items and files will conform to the below interfaces:

```
interface DropItem {  type: string // e.g. "text/html", "text/uri-list", etc...  data: string}interface DropFile {  name: string // file name  type: string // e.g. "image/png"  getBytesAsync(): Promise<Uint8Array> // get raw file bytes  getTextAsync(): Promise<string> // get text assuming file is UTF8-encoded}
```

See the Icon Drag-and-Drop and PNG Crop examples in the [figma/plugin-samples](https://github.com/figma/plugin-samples) repository for plugins that implement this API.

#### UI Recommendations[​](#ui-recommendations "Direct link to UI Recommendations")

When the plugin registers a drop callback, it should give the user instructions with either text in the plugin UI or [`figma.notify()`](/docs/plugins/api/properties/figma-notify/) (if the plugin does not show a UI) telling them what to do.

[`figma.notify()`](/docs/plugins/api/properties/figma-notify/) can be called with the `timeout` option set to `Infinity` to make the notification show for as long as the plugin is open.

### `"close"`[​](#close "Direct link to close")

This event will trigger when the plugin is about to close, either from a call to `figma.closePlugin()` or the user closing the plugin via the UI.

This is a good place to run cleanup actions. For example, some plugins add UI elements in the canvas by creating nodes. These UI elements should be deleted when the plugin is closed. Note that you don't need to call `figma.closePlugin()` again in this function.

**You should use this API only if strictly necessary, and run as little code as possible in the callback when doing so**. When a user closes a plugin, they expect it to be closed immediately. Having long-running actions in the closing callback prevents the plugin for closing promptly.

This is also not the place to run any asynchronous actions (e.g. register callbacks, using `await`, etc). The plugin execution environment will be destroyed immediately when all the callbacks have returned, and further callbacks will not be called.

### `"run"`[​](#run "Direct link to run")

This event is triggered when a plugin is run. For plugins with parameters, this happens after all parameters have been enter by the user in the quick action UI. For all other plugins this happens immediately after launch.

The callback will be passed a `RunEvent` that looks like:

```
interface RunEvent {  parameters?: ParameterValues  command: string}
```

*   The `parameters` property is of type [`ParameterValues`](/docs/plugins/api/figma-parameters/#parametervalues), and contains the value entered for each parameter.
*   The `command` argument is the same as [`figma.command`](/docs/plugins/api/figma/#command), but provided here again for convenience.

Handling the `run` event is only required for plugins with parameters. For all plugins it can still be a convenient spot to put your top level code, since it is called on every plugin run.

### `"stylechange"`[​](#stylechange "Direct link to stylechange")

Triggered when any styles in the document change.

The callback will receive a StyleChangeEvent with the below interface:

```
interface StyleChangeEvent {  styleChanges: StyleChange[]}
```

There are 3 different [`StyleChange`](/docs/plugins/api/StyleChange/) types. Each of these changes has a `type` property to distinguish them:

<table><thead><tr><th>Change</th><th><code>type</code> property</th><th>Description</th></tr></thead><tbody><tr><td><a href="/docs/plugins/api/StyleChange/#stylecreatechange"><code>StyleCreateChange</code></a></td><td><code>'STYLE_CREATE'</code></td><td>A style has been added to the document.</td></tr><tr><td><a href="/docs/plugins/api/StyleChange/#styledeletechange"><code>StyleDeleteChange</code></a></td><td><code>'STYLE_DELETE'</code></td><td>A style has been removed from the document.</td></tr><tr><td><a href="/docs/plugins/api/StyleChange/#stylepropertychange"><code>StylePropertyChange</code></a></td><td><code>'STYLE_PROPERTY_CHANGE'</code></td><td>A style has had a property changed.</td></tr></tbody></table>

### `"timerstart"`[​](#timerstart "Direct link to timerstart")

This event will trigger when somebody starts a timer in the document. This can happen either by a user (either the current user or a multiplayer user) starting the timer from the UI, or triggered by plugin code. To inspect the current state of the timer when this event fires, use the `figma.timer` interface. For example:

```
figma.on("timerstart", () => console.log(figma.timer.remaining))figma.timer.start(300)// Output:// 300
```

### `"timerpause"`[​](#timerpause "Direct link to timerpause")

Triggered when a timer that is running is paused.

### `"timerstop"`[​](#timerstop "Direct link to timerstop")

Triggered when the timer is stopped.

### `"timerdone"`[​](#timerdone "Direct link to timerdone")

Triggered when the timer is running and reaches 0 time remaining.

### `"timerresume"`[​](#timerresume "Direct link to timerresume")

Triggered when a timer that is paused is resumed.

### `"timeradjust"`[​](#timeradjust "Direct link to timeradjust")

Triggered when the total time on the timer changes. From the UI, it is only possible to add time to the timer. However, plugin code can both add and remove time from a running timer.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [type](#type)
    *   [callback](#callback)
*   [Remarks](#remarks)
*   [Available event types](#available-event-types)
    *   [`"currentpagechange"`](#currentpagechange)
    *   [`"selectionchange"`](#selectionchange)
    *   [`"documentchange"`](#documentchange)
    *   [`"textreview"`](#textreview)
    *   [`"drop"`](#drop)
    *   [`"close"`](#close)
    *   [`"run"`](#run)
    *   [`"stylechange"`](#stylechange)
    *   [`"timerstart"`](#timerstart)
    *   [`"timerpause"`](#timerpause)
    *   [`"timerstop"`](#timerstop)
    *   [`"timerdone"`](#timerdone)
    *   [`"timerresume"`](#timerresume)
    *   [`"timeradjust"`](#timeradjust)
