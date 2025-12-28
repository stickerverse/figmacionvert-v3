# DetachedInfo | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/DetachedInfo/
scraped_at: 2025-12-22T03:30:35.426Z
---

```
type DetachedInfo = {  type: 'local'  componentId: string} | {  type: 'library'  componentKey: string}
```

Information about detached instances. If the node is detached from a local component (a component in the same file), `type` will show `local` and `componentId` will contain the ID of this component. If the node is detached from a library component, `type` will show `library` and `componentKey` will contain the key of this component.

`detachedInfo` will be present even if the component from which the node was detached has been deleted. It will also be present even if the user doesn't have access to the file containing that component.
