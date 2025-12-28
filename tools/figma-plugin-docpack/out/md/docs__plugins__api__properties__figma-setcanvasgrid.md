# setCanvasGrid | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-setcanvasgrid/
scraped_at: 2025-12-22T03:30:32.944Z
---

On this page

Sets the canvas grid layout, reorganizing nodes in the canvas.

info

This API is only available in Figma Slides and Figma Buzz

## Signature[​](#signature "Direct link to Signature")

### [setCanvasGrid](/docs/plugins/api/properties/figma-setcanvasgrid/)(canvasGrid: Array<Array<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>>): void

## Parameters[​](#parameters "Direct link to Parameters")

### canvasGrid[​](#canvasgrid "Direct link to canvasGrid")

A 2D array representing the new canvas grid layout

## Remarks[​](#remarks "Direct link to Remarks")

This allows you to programmatically rearrange the layout of slides or assets in the canvas grid. All nodes in the current grid must be included in the new layout.

For example:

```
const grid = figma.getCanvasGrid()const [firstRow, ...rest] = grid// move the first row to the endfigma.setCanvasGrid([...rest, firstRow])
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [canvasGrid](#canvasgrid)
*   [Remarks](#remarks)
