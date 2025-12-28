# DevResource | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/DevResource/
scraped_at: 2025-12-22T03:30:35.421Z
---

On this page

Dev Resources are a new feature of Dev Mode, which allow you to add links to any layer within Figma.

![Image showing a dev resource](https://static.figma.com/uploads/8eccbc89d8536e189513440c02619303c41ee5cc)

## DevResource properties[​](#devresource-properties "Direct link to DevResource properties")

### name: string \[readonly\]

The name of the resource.

* * *

### url: string \[readonly\]

The URL of the resource. This is considered the unique identifier of the resource.

* * *

### inheritedNodeId?: string \[readonly\]

`inheritedNodeId` is a field only relevant to links on `INSTANCE` nodes. If `inheritedNodeId` is defined, the link is inherited from a main component or a component set. If you want to edit or delete the inherited link, you will need to go to the main node to do so. For example:

```
const devResource = { ..., inheritedNodeId: '1:2' }const node = await figma.getNodeByIdAsync(devResource.inheritedNodeId)await node.editDevResourceAsync(...)
```

* * *

### nodeId: string

The ID of the node that this link is attached to.

* * *

## Example usage[​](#example-usage "Direct link to Example usage")

```
const node = figma.currentPage.selection[0]// Get related linkconst links = await node.getDevResourcesAsync()// Get related link from node and all of its childrenconst links = await node.getDevResourcesAsync({ includeChildren: true })// Add a related linkawait node.addDevResourceAsync('https://google.com')// Edit related linkawait node.editDevResourceAsync(  'https://google.com', { name: 'Hotels', url: 'https://hotels.com' })// Delete related linkawait node.deleteDevResourceAsync('https://hotels.com')
```

*   [DevResource properties](#devresource-properties)
*   [Example usage](#example-usage)
