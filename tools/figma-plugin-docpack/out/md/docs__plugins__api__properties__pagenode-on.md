# on | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/PageNode-on/
scraped_at: 2025-12-22T03:30:53.014Z
---

On this page

Registers a callback that will be invoked when an event occurs on the page. Current supported events are:

*   `"nodechange"`: Emitted when a node is added, removed, or updated.

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

## Signature[​](#signature "Direct link to Signature")

### [on](/docs/plugins/api/properties/PageNode-on/)(type: 'nodechange', callback: (event: [NodeChangeEvent](/docs/plugins/api/NodeChangeEvent/)) => void): void

## Parameters[​](#parameters "Direct link to Parameters")

### type[​](#type "Direct link to type")

The type of event to listen for.

### callback[​](#callback "Direct link to callback")

The callback to be invoked when the event occurs.

## Remarks[​](#remarks "Direct link to Remarks")

## Available event types[​](#available-event-types "Direct link to Available event types")

### `"nodechange"`[​](#nodechange "Direct link to nodechange")

This event will be emitted when a node on the page is added, removed, or updated.

The callback will receive a NodeChangeEvent with the below interface:

```
interface NodeChangeEvent {  nodeChanges: NodeChange[]}
```

There are 3 different [`NodeChange`](/docs/plugins/api/NodeChange/) types. Each of these changes has a `type` property to distinguish them:

<table><thead><tr><th>Change</th><th><code>type</code> property</th><th>Description</th></tr></thead><tbody><tr><td><a href="/docs/plugins/api/NodeChange/#createchange"><code>CreateChange</code></a></td><td><code>'CREATE'</code></td><td>A node has been created in the page. If a node with nested children is being added to the page a <code>CreateChange</code> will only be made for the highest level parent that was added to the page.</td></tr><tr><td><a href="/docs/plugins/api/NodeChange/#deletechange"><code>DeleteChange</code></a></td><td><code>'DELETE'</code></td><td>A node has been removed from the page. If a node with nested children is being removed from the page a <code>DeleteChange</code> will only be made for the highest level parent that was removed from the page.</td></tr><tr><td><a href="/docs/plugins/api/NodeChange/#propertychange"><code>PropertyChange</code></a></td><td><code>'PROPERTY_CHANGE'</code></td><td>A property of a node has changed.</td></tr></tbody></table>

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [type](#type)
    *   [callback](#callback)
*   [Remarks](#remarks)
*   [Available event types](#available-event-types)
    *   [`"nodechange"`](#nodechange)
