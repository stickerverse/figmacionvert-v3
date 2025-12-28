# ArcData | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/ArcData/
scraped_at: 2025-12-22T03:30:33.643Z
---

```
interface ArcData {  readonly startingAngle: number  readonly endingAngle: number  readonly innerRadius: number}
```

This data controls the "arc" properties of the circle shape:

![](https://static.figma.com/uploads/abd31088233f035d829a22d99a4e481263f5db68)

The angles are in radians and the inner radius value is from 0 to 1. For the angles, 0° is the x axis and increasing angles rotate clockwise.

Examples:

```
// Make a half-circlenode.arcData = {startingAngle: 0, endingAngle: Math.PI, innerRadius: 0}
```

```
// Make a donutnode.arcData = {startingAngle: 0, endingAngle: 2 * Math.PI, innerRadius: 0.5}
```
