# findChild | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-findchild/
scraped_at: 2025-12-22T03:30:44.884Z
---

On this page

Searches the immediate children of this node (i.e. not including the children's children). Returns the first node for which `callback` returns true.

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

### [findChild](/docs/plugins/api/properties/nodes-findchild/)(callback: (node: [SceneNode](/docs/plugins/api/nodes/#scene-node)) => boolean): [SceneNode](/docs/plugins/api/nodes/#scene-node) | null

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`.

## Remarks[​](#remarks "Direct link to Remarks")

This function returns `null` if no matching node is found.

Example: find the first frame that is an immediate child of the current page.

```
const firstChildFrame = figma.currentPage.findChild(n => n.type === "FRAME")
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
