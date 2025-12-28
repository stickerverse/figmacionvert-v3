# DevStatus | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/DevStatus/
scraped_at: 2025-12-22T03:30:35.473Z
---

```
type DevStatus = {  type: "READY_FOR_DEV" | "COMPLETED",  description?: string} | null
```

`DevStatus` represents whether or not a node has a particular handoff (or dev) status applied to it. A `null` value represents no status, and the `type` field represents the type of status the node has.

A node can have the statuses:

*   `"READY_FOR_DEV"`, indicating that the node's contents are ready to be implemented by a developer
*   `"COMPLETED"`, indicating that dev work for the design is done

Description is an optional field where the designer can add more information about the design and what has changed.

caution

Note: currently, the plugin API does not reflect if a node has been changed since a status was set, but this can be seen in the app.
