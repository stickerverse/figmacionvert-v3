# getSlideGrid | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-getslidegrid/
scraped_at: 2025-12-22T03:30:32.638Z
---

On this page

**DEPRECATED:** Use [`figma.getCanvasGrid`](/docs/plugins/api/properties/figma-getcanvasgrid/) instead.

info

This API is only available in Figma Slides

## Signature[​](#signature "Direct link to Signature")

### [getSlideGrid](/docs/plugins/api/properties/figma-getslidegrid/)(): Array<Array<[SlideNode](/docs/plugins/api/SlideNode/)\>>

## Remarks[​](#remarks "Direct link to Remarks")

The slide grid provides structure to both single slide view and grid view. The order of Slides within a presentation is a key part of updating and editing a deck. To visualize the slide nodes in a 2D array, you can call this function.

```
const grid = figma.getSlideGrid()
```

The returned grid is a 2D array of SlideNodes. For example:

```
[  [SlideNode, SlideNode],  [SlideNode, SlideNode, SlideNode, SlideNode, SlideNode],  [SlideNode, SlideNode, SlideNode, SlideNode, SlideNode],  [SlideNode, SlideNode, SlideNode],]
```

*   [Signature](#signature)
*   [Remarks](#remarks)
