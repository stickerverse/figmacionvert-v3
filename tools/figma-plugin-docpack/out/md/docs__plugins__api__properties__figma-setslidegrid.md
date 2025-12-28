# setSlideGrid | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-setslidegrid/
scraped_at: 2025-12-22T03:30:32.623Z
---

On this page

**DEPRECATED:** Use [`figma.setCanvasGrid`](/docs/plugins/api/properties/figma-setcanvasgrid/) instead.

info

This API is only available in Figma Slides

## Signature[​](#signature "Direct link to Signature")

### [setSlideGrid](/docs/plugins/api/properties/figma-setslidegrid/)(slideGrid: Array<Array<[SlideNode](/docs/plugins/api/SlideNode/)\>>): void

## Remarks[​](#remarks "Direct link to Remarks")

The order of Slides within a presentation is a key part of updating and editing a deck. Using this method you can manipulate and reorder the grid.

For example:

```
const grid = figma.getSlideGrid()const [firstRow, ...rest] = grid// move the first row to the endfigma.setSlideGrid([...rest, firstRow])
```

So long as all the Slides in the current grid are passed back to `setSlideGrid` the update will succeed. Meaning, you can change the amount of rows as you please - flatten all to one row, explode to many rows, etc, and the method will handle all updates for you.

*   [Signature](#signature)
*   [Remarks](#remarks)
