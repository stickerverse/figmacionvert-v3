# NodeChange | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/NodeChange/
scraped_at: 2025-12-22T03:30:37.907Z
---

On this page

Figma has three types of page node changes that we currently notify on.

```
type NodeChange =  | CreateChange  | DeleteChange  | PropertyChange
```

## NodeChange (common properties)[​](#nodechange-common-properties "Direct link to NodeChange (common properties)")

### node: [SceneNode](/docs/plugins/api/nodes/#scene-node) | [RemovedNode](/docs/plugins/api/RemovedNode/)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](/docs/plugins/api/RemovedNode/)

* * *

## CreateChange[​](#createchange "Direct link to CreateChange")

Emitted when a node has been created in the page. If a node with nested children is being added to the page a `CreateChange` will only be made for the highest level parent that was added to the page.

### type: 'CREATE'

The string literal "CREATE" representing the type of document change this is. Always check the type before reading other properties.

* * *

### node: [SceneNode](/docs/plugins/api/nodes/#scene-node) | [RemovedNode](/docs/plugins/api/RemovedNode/)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](/docs/plugins/api/RemovedNode/)

* * *

## DeleteChange[​](#deletechange "Direct link to DeleteChange")

Emitted when a node has been removed from the page. If a node with nested children is being removed from the page a `DeleteChange` will only be made for the highest level parent that was removed from the page.

### type: 'DELETE'

The string literal "DELETE" representing the type of document change this is. Always check the type before reading other properties.

* * *

### node: [SceneNode](/docs/plugins/api/nodes/#scene-node) | [RemovedNode](/docs/plugins/api/RemovedNode/)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](/docs/plugins/api/RemovedNode/)

* * *

## PropertyChange[​](#propertychange "Direct link to PropertyChange")

Emitted when a property of a node has changed.

### type: 'PROPERTY\_CHANGE'

The string literal "PROPERTY\_CHANGE" representing the type of document change this is. Always check the type before reading other properties.

* * *

### properties: [NodeChangeProperty](/docs/plugins/api/NodeChangeProperty/)\[\]

Array of properties that have been changed on the node.

* * *

### node: [SceneNode](/docs/plugins/api/nodes/#scene-node) | [RemovedNode](/docs/plugins/api/RemovedNode/)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](/docs/plugins/api/RemovedNode/)

* * *

*   [NodeChange (common properties)](#nodechange-common-properties)
*   [CreateChange](#createchange)
*   [DeleteChange](#deletechange)
*   [PropertyChange](#propertychange)
