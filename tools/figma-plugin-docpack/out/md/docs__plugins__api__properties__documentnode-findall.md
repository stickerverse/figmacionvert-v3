# findAll | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findall/
scraped_at: 2025-12-22T03:30:41.678Z
---

On this page

Searches the entire document tree. Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this function.

Supported on:

*   [DocumentNode](/docs/plugins/api/DocumentNode/)

## Signature[​](#signature "Direct link to Signature")

### [findAll](/docs/plugins/api/properties/DocumentNode-findall/)(callback?: (node: [PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): Array<[PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node)\>

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`. If this argument is omitted, `findAll` returns all nodes in the subtree.

## Remarks[​](#remarks "Direct link to Remarks")

Nodes are included in **back-to-front** order. Parents always appear before their children, and children appear in same relative order before their children, and children appear in same relative order as in the [`children`](/docs/plugins/api/properties/nodes-children/) array.

This traversal method is known as ["pre-order traversal"](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order_\(NLR\)).

Note that the root node itself is **not included**.

Example: find all nodes whose name is "Color":

```
await figma.loadAllPagesAsync() // call this once when the plugin runsconst colors = figma.root.findAll(n => n.name === "Color")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow. Please refer to our [recommendations](/docs/plugins/accessing-document/#optimizing-traversals) for how to optimize document traversals.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
