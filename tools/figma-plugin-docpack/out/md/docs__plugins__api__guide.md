# Guide | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Guide/
scraped_at: 2025-12-22T03:30:36.347Z
---

```
interface Guide {  readonly axis: "X" | "Y"  readonly offset: number}
```

Guides are either a horizontal (Y-axis) or vertical straight (X-axis) line. The offset determines its position relative to the node it is stored in (usually either the canvas or a frame).
