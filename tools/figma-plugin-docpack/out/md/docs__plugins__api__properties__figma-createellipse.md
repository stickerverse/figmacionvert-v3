# createEllipse | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createellipse/
scraped_at: 2025-12-22T03:30:30.499Z
---

On this page

Creates a new ellipse. The behavior is similar to using the `O` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createEllipse](/docs/plugins/api/properties/figma-createellipse/)(): [EllipseNode](/docs/plugins/api/EllipseNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has a default fill, width and height both at 100, and is parented under `figma.currentPage`.

Create a red, U-shaped half donut

```
const ellipse = figma.createEllipse()// Move to (50, 50)ellipse.x = 50ellipse.y = 50// Set size to 200 x 100ellipse.resize(200, 100)// Set solid red fillellipse.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]// Arc from 0° to 180° clockwiseellipse.arcData = {startingAngle: 0, endingAngle: Math.PI, innerRadius: 0.5}
```

*   [Signature](#signature)
*   [Remarks](#remarks)
