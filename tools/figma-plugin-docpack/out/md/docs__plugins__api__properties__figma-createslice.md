# createSlice | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createslice/
scraped_at: 2025-12-22T03:30:31.197Z
---

On this page

Creates a new slice object.

## Signature[​](#signature "Direct link to Signature")

### [createSlice](/docs/plugins/api/properties/figma-createslice/)(): [SliceNode](/docs/plugins/api/SliceNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node is parented under `figma.currentPage`.

Create a slice and export as PNG

```
(async () => {  const slice = figma.createSlice()  // Move to (50, 50)  slice.x = 50  slice.y = 50  // Set size to 500 x 500  slice.resize(500, 500)  // Export a PNG of this region of the canvas  const bytes = await slice.exportAsync()  // Add the image onto the canvas as an image fill in a frame  const image = figma.createImage(bytes)  const frame = figma.createFrame()  frame.resize(500, 500)  frame.fills = [{    imageHash: image.hash,    scaleMode: "FILL",    scalingFactor: 1,    type: "IMAGE",  }]})()
```

*   [Signature](#signature)
*   [Remarks](#remarks)
