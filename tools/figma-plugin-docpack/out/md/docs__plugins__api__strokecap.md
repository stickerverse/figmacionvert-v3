# StrokeCap | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/StrokeCap/
scraped_at: 2025-12-22T03:30:39.012Z
---

```
type StrokeCap = "NONE" |"ROUND" |"SQUARE" |"ARROW_LINES" |"ARROW_EQUILATERAL" |"DIAMOND_FILLED" |"TRIANGLE_FILLED" |"CIRCLE_FILLED"
```

The possible values are:

*   `"NONE"`: nothing is added to the end of the stroke
*   `"ROUND"`: a semi-circle is added to the end of the stroke
*   `"SQUARE"`: a square is added to the end of the stroke
*   `"ARROW_LINES"`: an arrow made up of two lines is added to the end of the stroke
*   `"ARROW_EQUILATERAL"`: an arrow made up of an equilateral triangle pointing outwards is added to the end of the stroke
*   `"DIAMOND_FILLED"`: a filled diamond is added to the end of the stroke
*   `"TRIANGLE_FILLED"`: an arrow made up of an equilateral triangle pointing inwards is added to the end of the stroke
*   `"CIRCLE_FILLED"`: a filled circle is added to the end of the stroke
