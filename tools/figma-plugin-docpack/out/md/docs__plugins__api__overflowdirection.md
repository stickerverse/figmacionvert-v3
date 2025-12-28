# OverflowDirection | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/OverflowDirection/
scraped_at: 2025-12-22T03:30:38.058Z
---

```
type OverflowDirection = "NONE" | "HORIZONTAL" | "VERTICAL" | "BOTH"
```

The possible values are:

*   `"NONE"`: the frame does not _explicitly_ scroll
*   `"HORIZONTAL"`: the frame can scroll in the horizontal direction if its content exceeds the frame's bounds horizontally
*   `"VERTICAL"`: the frame can in the vertical direction if its content exceeds the frame's bounds vertically
*   `"BOTH"`: the frame can scroll in either direction if the content exceeds the frame's bounds

Note that top-level frames (parented directly under the canvas) can still scroll even when `OverflowDirection` is `NONE`.
