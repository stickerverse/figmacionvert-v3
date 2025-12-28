# findAllWithCriteria | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-findallwithcriteria/
scraped_at: 2025-12-22T03:30:44.365Z
---

On this page

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes that satisfy all of specified criteria.

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

### [findAllWithCriteria](/docs/plugins/api/properties/nodes-findallwithcriteria/)<T extends NodeType\[\]>(criteria: [FindAllCriteria](/docs/plugins/api/FindAllCriteria/)<T>): Array<{ type: T\[number\] } & [SceneNode](/docs/plugins/api/nodes/#scene-node)\>

## Parameters[​](#parameters "Direct link to Parameters")

### criteria[​](#criteria "Direct link to criteria")

An object of type [`FindAllCriteria`](/docs/plugins/api/FindAllCriteria/) that specifies the search criteria. The following criterias are currently supported:

*   Nodes with specific [`types`](/docs/plugins/api/nodes/)
*   Nodes with [`SharedPluginData`](/docs/plugins/api/node-properties/#getsharedplugindata) by their namespace and keys.
*   Nodes with [`PluginData`](/docs/plugins/api/node-properties/#getplugindata) by their keys.
*   A combination of any of the above.

## Remarks[​](#remarks "Direct link to Remarks")

This is a faster but more limited search compared to [`findAll`](/docs/plugins/api/properties/nodes-findall/), which lets you search nodes based on any logic you can include in a callback.

When paired with [`figma.skipInvisibleInstanceChildren = true`](/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/), this method can be hundreds of times faster in large documents with tens of thousands of nodes.

The return value is narrowly typed to match the provided `types`, which makes it much easier to use node-type-specific properties. For example, `node.findAllWithCriteria({ types: ['TEXT'] })` will return `TextNode[]` instead of the more generic `SceneNode[]` from [`findAll`](/docs/plugins/api/properties/nodes-findall/).

Nodes are included in **back-to-front** order, which is the same order as in [`findAll`](/docs/plugins/api/properties/nodes-findall/). Parents always appear before their children, and children appear in same relative order before their children, and children appear in same relative order as in the [`children`](/docs/plugins/api/properties/nodes-children/) array.

This traversal method is known as ["pre-order traversal"](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order_\(NLR\)).

info

The node this method is called on is **not included**.

## Example Usages[​](#example-usages "Direct link to Example Usages")

### Find by node type[​](#find-by-node-type "Direct link to Find by node type")

```
// Find all component and component set nodes in the current// pageconst nodes = figma.currentPage.findAllWithCriteria({  types: ['COMPONENT', 'COMPONENT_SET']})// Find all text nodes in the current pageconst nodes = figma.currentPage.findAllWithCriteria({  types: ['TEXT']})
```

### Find by plugin data[​](#find-by-plugin-data "Direct link to Find by plugin data")

```
// Find all nodes in the current page with plugin data// for the current plugin.const nodes = figma.currentPage.findAllWithCriteria({  pluginData: {}})// Find all nodes in the current page with plugin data// for the current plugin with keys "a" or "b"const nodes = figma.currentPage.findAllWithCriteria({  pluginData: {    keys: ["a", "b"]  }})
```

### Find by shared plugin data[​](#find-by-shared-plugin-data "Direct link to Find by shared plugin data")

```
// Find all nodes in the current page with shared plugin data// stored on the "bar" namespaceconst nodes = figma.currentPage.findAllWithCriteria({  sharedPluginData: {    namespace: "bar"  }})// Find all nodes in the current page with shared plugin data// stored on the "bar" namespace and keys "a" or "b"const nodes = figma.currentPage.findAllWithCriteria({  sharedPluginData: {    namespace: "bar",    keys: ["a", "b"]  }})
```

### Combining criterias[​](#combining-criterias "Direct link to Combining criterias")

You can combine multiple criterias for further narrow your search.

```
// Find all text nodes in the current page with plugin data// for the current pluginconst nodes = figma.currentPage.findAllWithCriteria({  types: ["TEXT"],  pluginData: {}})// Find all text nodes in the current page with shared plugin data// stored on the "bar" namespaceconst nodes = figma.currentPage.findAllWithCriteria({  types: ["TEXT"],  sharedPluginData: {    namespace: "bar"  }})
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [criteria](#criteria)
*   [Remarks](#remarks)
*   [Example Usages](#example-usages)
    *   [Find by node type](#find-by-node-type)
    *   [Find by plugin data](#find-by-plugin-data)
    *   [Find by shared plugin data](#find-by-shared-plugin-data)
    *   [Combining criterias](#combining-criterias)
