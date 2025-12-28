# selection | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/PageNode-selection/
scraped_at: 2025-12-22T03:30:52.739Z
---

On this page

The selected nodes on this page. Each page stores its own selection separately. The ordering of nodes in the selection is **unspecified**, you should not be relying on it.

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

## Signature[​](#signature "Direct link to Signature")

### [selection](/docs/plugins/api/properties/PageNode-selection/): ReadonlyArray<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>

## Remarks[​](#remarks "Direct link to Remarks")

Like many of our array properties, `page.selection` returns a new, read-only array every time it is called (the nodes inside are references to existing nodes, not copies). To change the selection, you will need to make a copy of the existing array and/or assign a new array.

Example:

```
function addNewNodeToSelection(page: PageNode, node: SceneNode) {  // .concat() creates a new array  page.selection = page.selection.concat(node)}function selectFirstChildOfNode(page: PageNode, node: SceneNode) {  if (node.children.length > 0) {    page.selection = [node.children[0]]  }}
```

*   As the selection is just a node property, the selection is preserved when the user switches between pages.
*   Nodes in the selection are unique. When setting the selection, the API will de-deduplicate nodes in the selection. This API could have been a `Set<SceneNode>`, but it's generally easier to work with array and to get the first node using just selection\[0\].
*   Only **directly selected nodes** are present in this array. A node is directly selected when it is selected and none of its ancestors are selected. That means the array will never contain both a node and one of its descendents.

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`Cannot select the document node`

`Cannot select the page node`

`The selection of a page can only include nodes in that page`

*   [Signature](#signature)
*   [Remarks](#remarks)
*   [Possible error cases](#possible-error-cases)
