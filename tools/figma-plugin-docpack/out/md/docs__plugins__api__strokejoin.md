# StrokeJoin | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/StrokeJoin/
scraped_at: 2025-12-22T03:30:38.981Z
---

```
type StrokeJoin = "MITER" | "BEVEL" | "ROUND"
```

The possible values are:

*   `"MITER"`: the junction between two strokes will be sharp and pointy, unless the angle is below the "Miter Angle" in which case it the pointy bit will be cut off to "BEVEL" (this is necessary because extremely sharp angles would have an extremely long sharp edge)
*   `"BEVEL"`: the sharp bit at the corner of the join is cut off
*   `"ROUND"`: the corner is rounded
