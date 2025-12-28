# findChildren | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-findchildren/
scraped_at: 2025-12-22T03:30:44.906Z
---

On this page

Searches the immediate children of this node (i.e. not including the children's children). Returns all nodes for which `callback` returns true.

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

### [findChildren](/docs/plugins/api/properties/nodes-findchildren/)(callback?: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node)\[\]

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`. If this argument is omitted, `findChildren` returns `node.children`.

## Remarks[​](#remarks "Direct link to Remarks")

Example: find all frames that are immediate child of the current page.

```
const childFrames = figma.currentPage.findChildren(n => n.type === "FRAME")
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
