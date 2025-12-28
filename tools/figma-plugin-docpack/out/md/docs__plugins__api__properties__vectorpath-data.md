# data | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/VectorPath-data/
scraped_at: 2025-12-22T03:30:59.477Z
---

On this page

A series of path commands that encodes how to draw the path.

## Signature[​](#signature "Direct link to Signature")

### [data](/docs/plugins/api/properties/VectorPath-data/): string \[readonly\]

## Remarks[​](#remarks "Direct link to Remarks")

Figma supports a subset of the SVG path format. Path commands must be joined into a single string in order separated by a single space. Here are the path commands we support:

*   `M x y`: The absolute "move to" command.
*   `L x y`: The absolute "line to" command.
*   `Q x0 y0 x y`: The absolute "quadratic spline to" command. _Note_ that while Figma supports this as input, we will never generate this ourselves. All quadratic splines are converted to cubic splines internally.
*   `C x0 y0 x1 y1 x y`: The absolute "cubic spline to" command.
*   `Z`: The "close path" command.

*   [Signature](#signature)
*   [Remarks](#remarks)
