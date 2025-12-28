# ungroup | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-ungroup/
scraped_at: 2025-12-22T03:30:32.632Z
---

On this page

Ungroups the given `node`, moving all of `node`'s children into `node`'s parent and removing `node`. Returns an array of nodes that were children of `node`.

## Signature[​](#signature "Direct link to Signature")

### [ungroup](/docs/plugins/api/properties/figma-ungroup/)(node: [SceneNode](/docs/plugins/api/nodes/#scene-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin)): Array<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>

## Parameters[​](#parameters "Direct link to Parameters")

### node[​](#node "Direct link to node")

The node to ungroup.

## Remarks[​](#remarks "Direct link to Remarks")

This API is roughly the equivalent of pressing Ctrl-Shift-G/⌘⇧G in the editor, but ungroups the given node rather than all nodes in the current selection.

If the ungrouped node is part of the current selection, the ungrouped node's children will become part of the selection. Otherwise the selection is unchanged.

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`Instances cannot be ungrouped`

`Components cannot be ungrouped`

`Only group-like nodes can be ungrouped`

`The given node cannot be ungrouped`

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [node](#node)
*   [Remarks](#remarks)
*   [Possible error cases](#possible-error-cases)
