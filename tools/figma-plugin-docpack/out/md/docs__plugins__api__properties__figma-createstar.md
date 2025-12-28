# createStar | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createstar/
scraped_at: 2025-12-22T03:30:30.571Z
---

On this page

Creates a new star.

## Signature[​](#signature "Direct link to Signature")

### [createStar](/docs/plugins/api/properties/figma-createstar/)(): [StarNode](/docs/plugins/api/StarNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has five points edges (i.e. a canonical star), a default fill, width and height both at 100, and is parented under `figma.currentPage`.

Create a red, 7-pointed star

```
const star = figma.createStar()// Move to (50, 50)star.x = 50star.y = 50// Set size to 200 x 200star.resize(200, 200)// Make the star 7-pointedstar.pointCount = 7// Set solid red fillstar.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]// Make the angles of each point less acutestar.innerRadius = 0.6
```

*   [Signature](#signature)
*   [Remarks](#remarks)
