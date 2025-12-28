# createLine | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createline/
scraped_at: 2025-12-22T03:30:30.411Z
---

On this page

Creates a new line.

## Signature[​](#signature "Direct link to Signature")

### [createLine](/docs/plugins/api/properties/figma-createline/)(): [LineNode](/docs/plugins/api/LineNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node is 100 in width, has a black stroke, with weight 1, and is parented under `figma.currentPage`.

Create a line and set basic styles

```
const line = figma.createLine()// Move to (50, 50)line.x = 50line.y = 50// Make line 200px longline.resize(200, 0)// 4px thick red line with arrows at each endline.strokeWeight = 4line.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]line.strokeCap = 'ARROW_LINES'
```

*   [Signature](#signature)
*   [Remarks](#remarks)
