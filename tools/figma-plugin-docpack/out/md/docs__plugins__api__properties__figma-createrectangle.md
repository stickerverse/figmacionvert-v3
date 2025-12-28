# createRectangle | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createrectangle/
scraped_at: 2025-12-22T03:30:30.168Z
---

On this page

Creates a new rectangle. The behavior is similar to using the `R` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createRectangle](/docs/plugins/api/properties/figma-createrectangle/)(): [RectangleNode](/docs/plugins/api/RectangleNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has a default fill, width and height both at 100, and is parented under `figma.currentPage`.

Create a rectangle and set basic styles

```
const rect = figma.createRectangle()// Move to (50, 50)rect.x = 50rect.y = 50// Set size to 200 x 100rect.resize(200, 100)// Set solid red fillrect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
```

*   [Signature](#signature)
*   [Remarks](#remarks)
