# getCanvasGrid | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-getcanvasgrid/
scraped_at: 2025-12-22T03:30:32.931Z
---

On this page

Gets the current canvas grid layout as a 2D array of nodes.

info

This API is only available in Figma Slides and Figma Buzz

## Signature[​](#signature "Direct link to Signature")

### [getCanvasGrid](/docs/plugins/api/properties/figma-getcanvasgrid/)(): Array<Array<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>>

## Remarks[​](#remarks "Direct link to Remarks")

The canvas grid represents the organizational structure of assets in Slides and Buzz, where each position can contain a node (slide or asset).

To visualize the nodes in the canvas grid in a 2D array, you can call this function.

```
const grid = figma.getCanvasGrid()
```

*   [Signature](#signature)
*   [Remarks](#remarks)
