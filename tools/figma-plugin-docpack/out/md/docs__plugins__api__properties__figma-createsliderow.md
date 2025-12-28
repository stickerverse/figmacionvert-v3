# createSlideRow | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createsliderow/
scraped_at: 2025-12-22T03:30:31.485Z
---

On this page

info

This API is only available in Figma Slides

Creates a new Slide Row, which automatically gets appended to the Slide Grid.

## Signature[​](#signature "Direct link to Signature")

### [createSlideRow](/docs/plugins/api/properties/figma-createsliderow/)(row?: number): [SlideRowNode](/docs/plugins/api/SlideRowNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the row gets appended to the end of the Slide Grid.

Create a slide row

```
const slideRow = figma.createSlideRow()
```

To specify a position in the Slide Grid, pass a row index to the function.

Create a slide row at index 0

```
const slideRow = figma.createSlideRow(0)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
