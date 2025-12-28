# figma.viewport | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-viewport/
scraped_at: 2025-12-22T03:30:28.673Z
---

These are methods and properties available on the `figma.viewport` global object. It represents the area of the canvas that is currently visible on-screen, commonly referred to as the **viewport**. The position of the viewport is represented via its center coordinate and zoom level.

### center: [Vector](/docs/plugins/api/Vector/)

Center of the the current page that is currently visible on screen.

* * *

### [zoom](/docs/plugins/api/properties/figma-viewport-zoom/): number

Zoom level. A value of 1.0 means 100% zoom, 0.5 means 50% zoom.

[View more →](/docs/plugins/api/properties/figma-viewport-zoom/)

* * *

### scrollAndZoomIntoView(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>): void

Automatically sets the viewport coordinates such that the nodes are visible on screen. It is the equivalent of pressing Shift-1.

* * *

### bounds: [Rect](/docs/plugins/api/Rect/) \[readonly\]

The bounds of the viewport of the page that is currently visible on screen. The (x, y) corresponds to the top-left of the screen. User actions such as resizing the window or showing/hiding the rulers/UI will change the bounds of the viewport.

* * *

### [slidesView](/docs/plugins/api/properties/figma-viewport-slidesview/): 'grid' | 'single-slide'

info

This API is only available in Figma Slides

[View more →](/docs/plugins/api/properties/figma-viewport-slidesview/)

* * *

### [canvasView](/docs/plugins/api/properties/figma-viewport-canvasview/): 'grid' | 'single-asset'

info

This API is only available in Figma Slides and Figma Buzz

[View more →](/docs/plugins/api/properties/figma-viewport-canvasview/)

* * *
