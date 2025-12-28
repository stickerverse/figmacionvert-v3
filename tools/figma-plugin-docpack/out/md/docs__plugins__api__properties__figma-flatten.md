# flatten | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-flatten/
scraped_at: 2025-12-22T03:30:32.560Z
---

On this page

Flattens every node in nodes into a new vector network.

## Signature[​](#signature "Direct link to Signature")

### [flatten](/docs/plugins/api/properties/figma-flatten/)(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent?: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [VectorNode](/docs/plugins/api/VectorNode/)

## Parameters[​](#parameters "Direct link to Parameters")

### nodes[​](#nodes "Direct link to nodes")

The list of nodes in the new group. This list must be non-empty and cannot include any node that cannot be reparented, such as children of instances. Make a copy of those nodes first if necessary.

### parent[​](#parent "Direct link to parent")

The node under which the new vector will be created. This is similar to `parent.appendChild(group)` and defaults to `figma.currentPage` if left unspecified.

### index[​](#index "Direct link to index")

An optional index argument that specifies where inside `parent` the new vector will be created. When this argument is not provided, it will default to appending the vector as the last (topmost) child. This is similar to the index argument in `parent.insertChild(index, group)`.

## Remarks[​](#remarks "Direct link to Remarks")

This API is roughly the equivalent of pressing Ctrl-E/⌘E in the editor, but flattens the specified list of nodes rather than the current selection. You may still, of course, flatten the current selection by passing it as an argument:

Flatten nodes

```
figma.flatten(figma.currentPage.selection, parent)
```

Since flattening involves moving nodes to a different parent, this operation is subject to many reparenting restrictions:

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`First argument must be an array of at least one node`

`Cannot insert node at index greater than the number of existing siblings`

`Grouped nodes must be in the same page as the parent`

`Cannot move node. Node is the scene root, which cannot be reparented`

`Cannot move node. Doing so would create a parenting cycle`

`Cannot move node. The root node cannot have children of type other than PAGE`

`Cannot move node. Nodes other than the root node cannot have children of type PAGE`

`Cannot move node. New parent is of a type that cannot have children`

`Cannot move node. New parent is a internal, readonly-only node`

`Cannot move node. Node is an internal, readonly-only node`

`Cannot move node. New parent is an instance or is inside of an instance`

`Cannot move node. Node is inside of an instance`

`Cannot move node. Reparenting would create a component cycle`

`Cannot move node. Reparenting would create a component inside a component`

`Cannot move node. Reparenting would create a component set cycle`

`Cannot move node. A COMPONENT_SET node cannot have children of type other than COMPONENT`

`Cannot move node. PageDivider cannot have children`

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [nodes](#nodes)
    *   [parent](#parent)
    *   [index](#index)
*   [Remarks](#remarks)
*   [Possible error cases](#possible-error-cases)
