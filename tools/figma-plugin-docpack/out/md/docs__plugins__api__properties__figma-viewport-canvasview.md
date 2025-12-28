# canvasView | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-viewport-canvasview/
scraped_at: 2025-12-22T03:30:55.790Z
---

On this page

info

This API is only available in Figma Slides and Figma Buzz

## Signature[​](#signature "Direct link to Signature")

### [canvasView](/docs/plugins/api/properties/figma-viewport-canvasview/): 'grid' | 'single-asset'

## Remarks[​](#remarks "Direct link to Remarks")

The viewport mode within the Slides and Buzz UI: In Asset View, the viewport is zoomed into the current asset or slide, and we only render that one asset/slide. In Grid View, the viewport is zoomed out to show the entire canvas grid.

You can access the current view:

```
const currentView = figma.viewport.canvasView
```

And you can set the view:

```
figma.viewport.canvasView = 'single-asset'
```

### A Note About Asset View:[​](#a-note-about-asset-view "Direct link to A Note About Asset View:")

We have updated all of the create methods (`figma.createRectangle()`, `figma.createLine()`, etc) so that when the Figma Slides/Buzz file is in Asset View, they append that node to the focused asset/slide instead of to the canvas. This is to ensure that the node you are creating is viewable by the current user and not hidden off to the side of the larger grid view.

*   [Signature](#signature)
*   [Remarks](#remarks)
    *   [A Note About Asset View:](#a-note-about-asset-view)
