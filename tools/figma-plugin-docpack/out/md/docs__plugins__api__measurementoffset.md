# MeasurementOffset | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/MeasurementOffset/
scraped_at: 2025-12-22T03:30:37.643Z
---

```
type MeasurementOffset =  | { type: 'INNER'; relative: number }  | { type: 'OUTER'; fixed: number }
```

The offset of a [Measurement](/docs/plugins/api/Measurement/). The offset field is relative to the start node’s center. It can either be:

*   type `'INNER'` where the field `relative` is between -1 and 1, indicating where along the node’s edge the measurement starts.
*   type `'OUTER'` where the node field `fixed` is the space between the measurement and the edge of the start node. The sign of the number determines which side it sticks out of. Its value must be non-zero (use type `'INNER'` for an offset of `0`).

![Image showing measurement offsets](https://static.figma.com/uploads/dca6b7f03f5f8e876a9eb2481fb6e6aec7d94944)
