# findAll | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-findall/
scraped_at: 2025-12-22T03:30:44.412Z
---

On this page

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](/docs/plugins/api/PageNode/), you must first call [`loadAsync`](/docs/plugins/api/PageNode/#loadasync) to access this function.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)

## Signature[​](#signature "Direct link to Signature")

### [findAll](/docs/plugins/api/properties/nodes-findall/)(callback?: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\]

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`. If this argument is omitted, `findAll` returns all nodes in the subtree.

## Remarks[​](#remarks "Direct link to Remarks")

Nodes are included in **back-to-front** order. Parents always appear before their children, and children appear in same relative order before their children, and children appear in same relative order as in the [`children`](/docs/plugins/api/properties/nodes-children/) array.

This traversal method is known as ["pre-order traversal"](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order_\(NLR\)).

Note that the node this method is called on is **not included**.

Example: find all nodes whose name is "Color":

```
const colors = figma.currentPage.findAll(n => n.name === "Color")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow. If you only need to search immediate children, it is much faster to call `node.children.filter(callback)` or `node.findChildren(callback)`. Please refer to our [recommendations](/docs/plugins/accessing-document/#optimizing-traversals) for how to optimize document traversals.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
