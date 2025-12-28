# findOne | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-findone/
scraped_at: 2025-12-22T03:30:44.870Z
---

On this page

Searches this entire subtree (this node's children, its children's children, etc). Returns the first node for which `callback` returns true.

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

### [findOne](/docs/plugins/api/properties/nodes-findone/)(callback: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`.

## Remarks[​](#remarks "Direct link to Remarks")

This function returns `null` if no matching node is found. The traversal order is the same as in [`findAll`](/docs/plugins/api/properties/nodes-findall/).

Note that the node this method is called on is **not included**.

Example: find one node whose name is "Template":

```
const template = figma.currentPage.findOne(n => n.name === "Template")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow. If you only need to search immediate children, it is much faster to call `node.children.find(callback)` or `node.findChild(callback)`. Please refer to our [recommendations](/docs/plugins/accessing-document/#optimizing-traversals) for how to optimize document traversals.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
