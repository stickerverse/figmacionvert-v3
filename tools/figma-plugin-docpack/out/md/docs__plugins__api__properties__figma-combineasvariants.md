# combineAsVariants | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-combineasvariants/
scraped_at: 2025-12-22T03:30:32.350Z
---

On this page

info

This API is only available in Figma Design

Creates a new [`ComponentSetNode`](/docs/plugins/api/ComponentSetNode/) by combining all the nodes in `nodes`, which should all have type [`ComponentNode`](/docs/plugins/api/ComponentNode/).

## Signature[​](#signature "Direct link to Signature")

### [combineAsVariants](/docs/plugins/api/properties/figma-combineasvariants/)(nodes: ReadonlyArray<[ComponentNode](/docs/plugins/api/ComponentNode/)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)

## Parameters[​](#parameters "Direct link to Parameters")

### nodes[​](#nodes "Direct link to nodes")

The list of nodes in the new component set. This list must be non-empty, and must consist of only component nodes.

### parent[​](#parent "Direct link to parent")

The node under which the new component set will be created. This is similar to `parent.appendChild(componentSet)`, but must be specified at the time that the group is created rather than later.

### index[​](#index "Direct link to index")

An optional index argument that specifies where inside `parent` the new component set will be created. When this argument is not provided, it will default to appending the component set as the last (topmost) child. This is similar to the index argument in `parent.insertChild(index, componentSet)`.

## Remarks[​](#remarks "Direct link to Remarks")

This API is roughly the equivalent of pressing the "Combine as Variants" button in the editor, but combines the specified list of nodes rather than the current selection. You may still, of course, combine the current selection as variants by passing it as an argument:

Combining variants

```
figma.combineAsVariants(figma.currentPage.selection, parent)
```

info

Why is there no `figma.createComponentSet()` function? It would create an empty component set, and empty component sets are not supported in Figma.

Since combining as variants involves moving nodes to a different parent, this operation is subject to many reparenting restrictions:

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
