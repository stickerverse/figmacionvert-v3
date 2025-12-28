# PublishStatus | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/PublishStatus/
scraped_at: 2025-12-22T03:30:38.316Z
---

```
type PublishStatus = "UNPUBLISHED" | "CURRENT" | "CHANGED"
```

Describes the status of elements that could be published to the team library, namely styles and components.

The possible values are:

*   `"UNPUBLISHED"`: the element is not published to the team library
*   `"CURRENT"`: the element is published and the published version matches the local version
*   `"CHANGED"`: the element is published, but has local changes
