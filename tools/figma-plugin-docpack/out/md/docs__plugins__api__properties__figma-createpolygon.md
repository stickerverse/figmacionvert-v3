# createPolygon | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createpolygon/
scraped_at: 2025-12-22T03:30:30.424Z
---

On this page

Creates a new polygon (defaults to a triangle).

## Signature[​](#signature "Direct link to Signature")

### [createPolygon](/docs/plugins/api/properties/figma-createpolygon/)(): [PolygonNode](/docs/plugins/api/PolygonNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has three edges (i.e. a triangle), a default fill, width and height both at 100, and is parented under `figma.currentPage`.

Create a red octagon

```
const polygon = figma.createPolygon()// Move to (50, 50)polygon.x = 50polygon.y = 50// Set size to 200 x 200polygon.resize(200, 200)// Make the polygon 8-sidedpolygon.pointCount = 8// Set solid red fillpolygon.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
```

*   [Signature](#signature)
*   [Remarks](#remarks)
