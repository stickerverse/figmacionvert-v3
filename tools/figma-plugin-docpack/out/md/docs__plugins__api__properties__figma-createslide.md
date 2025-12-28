# createSlide | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createslide/
scraped_at: 2025-12-22T03:30:31.428Z
---

On this page

info

This API is only available in Figma Slides

## Signature[​](#signature "Direct link to Signature")

### [createSlide](/docs/plugins/api/properties/figma-createslide/)(row?: number, col?: number): [SlideNode](/docs/plugins/api/SlideNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the slide gets appended to the end of the presentation (the last child in the last Slide Row).

Create a slide

```
const slide = figma.createSlide()
```

To specify a position in the Slide Grid, pass a row and column index to the function.

Create a slide at index 0, 0

```
const slide = figma.createSlide(0, 0)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
