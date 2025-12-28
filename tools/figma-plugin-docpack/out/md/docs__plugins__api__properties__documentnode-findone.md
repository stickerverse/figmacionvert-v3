# findOne | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findone/
scraped_at: 2025-12-22T03:30:41.774Z
---

On this page

Searches this entire page (this node's children, its children's children, etc.). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](/docs/plugins/api/figma/#loadallpagesasync) to access this function.

Supported on:

*   [DocumentNode](/docs/plugins/api/DocumentNode/)

## Signature[​](#signature "Direct link to Signature")

### [findOne](/docs/plugins/api/properties/DocumentNode-findone/)(callback: (node: [PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [PageNode](/docs/plugins/api/PageNode/) | [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`.

## Remarks[​](#remarks "Direct link to Remarks")

This function returns `null` if no matching node is found. The traversal order is the same as in [`findAll`](/docs/plugins/api/properties/nodes-findall/).

Note that the root node itself is **not included**.

Example: find one node whose name is "Template":

```
await figma.loadAllPagesAsync() // call this once when the plugin runsconst template = figma.root.findOne(n => n.name === "Template")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow. Please refer to our [recommendations](/docs/plugins/accessing-document/#optimizing-traversals) for how to optimize document traversals.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
