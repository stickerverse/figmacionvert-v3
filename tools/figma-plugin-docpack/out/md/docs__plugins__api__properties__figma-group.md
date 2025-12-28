# group | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-group/
scraped_at: 2025-12-22T03:30:32.359Z
---

On this page

Creates new group containing all the nodes in `nodes`. There is no `createGroup` function -- use this instead. Group nodes have many quirks, like auto-resizing, that you can read about in the [`FrameNode`](/docs/plugins/api/FrameNode/) section.

## Signature[​](#signature "Direct link to Signature")

### [group](/docs/plugins/api/properties/figma-group/)(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [GroupNode](/docs/plugins/api/GroupNode/)

## Parameters[​](#parameters "Direct link to Parameters")

### nodes[​](#nodes "Direct link to nodes")

The list of nodes in the new group. This list must be non-empty as Figma does not support empty groups. This list cannot include any node that cannot be reparented, such as children of instances.

### parent[​](#parent "Direct link to parent")

The node under which the new group will be created. This is similar to `parent.appendChild(group)`, but must be specified at the time that the group is created rather than later.

### index[​](#index "Direct link to index")

An optional index argument that specifies where inside `parent` the new group will be created. When this argument is not provided, it will default to appending the group as the last (topmost) child. This is similar to the index argument in `parent.insertChild(index, group)`.

## Remarks[​](#remarks "Direct link to Remarks")

This API is roughly the equivalent of pressing Ctrl-G/⌘G in the editor, but groups the specified list of nodes rather than the current selection. You may still, of course, group the current selection by passing it as an argument:

Group nodes

```
figma.group(figma.currentPage.selection, parent)
```

info

Why is there no `figma.createGroup()` function? It would create an empty group, and empty groups are not supported in Figma.

info

Why do we require `figma.group(...)` to specify the parent, rather let you call `parent.appendChild(group)` separately? It allows you to create the new group while keeping all the grouped layers in the same absolute x/y locations. The method `.appendChild` preserves the _relative_ position of a node, so if you use `.appendChild` to populate a group, you would need to do additional work to put them back in their original location if that was the desired behavior.

Since grouping involves moving nodes to a different parent, this operation is subject to many reparenting restrictions:

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
