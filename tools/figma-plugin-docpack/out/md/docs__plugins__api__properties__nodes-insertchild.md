# insertChild | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-insertchild/
scraped_at: 2025-12-22T03:30:46.812Z
---

On this page

Adds a new child at the specified index in the [`children`](/docs/plugins/api/properties/nodes-children/) array.

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

### [insertChild](/docs/plugins/api/properties/nodes-insertchild/)(index: number, child: [SceneNode](/docs/plugins/api/nodes/#scene-node)): void

## Parameters[​](#parameters "Direct link to Parameters")

### index[​](#index "Direct link to index")

Determines where the new layer gets inserted. For example, suppose a group has layers A, B, C, where C is the top-most layer.

*   `insertChild(0, D)` gives a group with layers **D**, A, B, C
*   `insertChild(1, D)` gives a group with layers A, **D**, B, C
*   `insertChild(2, D)` gives a group with layers A, B, **D**, C
*   `insertChild(3, D)` gives a group with layers A, B, C, **D**
*   `insertChild(4, D)` throws an error since the group originally only has 3 children

### child[​](#child "Direct link to child")

The node to be inserted.

## Remarks[​](#remarks "Direct link to Remarks")

Reparenting nodes is subject to many restrictions. For example, some nodes cannot be moved, others would break the document if moved. Below are possible exceptions that can be thrown if the operation is invalid.

If this is called on an auto-layout frame, calling this function can cause this layer to be resized and children to be moved.

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`Cannot insert node at index greater than the number of existing siblings`

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
    *   [index](#index)
    *   [child](#child)
*   [Remarks](#remarks)
*   [Possible error cases](#possible-error-cases)
