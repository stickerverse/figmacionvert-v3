# LineHeight | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/LineHeight/
scraped_at: 2025-12-22T03:30:37.229Z
---

```
type LineHeight = {  readonly value: number  readonly unit: "PIXELS" | "PERCENT"} | {  readonly unit: "AUTO"}
```

An object representing a number with a unit. This is similar to how you can set either `100%` or `100px` in a lot of CSS properties. It can also be set to `AUTO`.
