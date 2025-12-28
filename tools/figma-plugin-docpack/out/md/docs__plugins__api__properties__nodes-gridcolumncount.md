# gridColumnCount | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridcolumncount/
scraped_at: 2025-12-22T03:30:45.480Z
---

On this page

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the number of columns in the grid.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [gridColumnCount](/docs/plugins/api/properties/nodes-gridcolumncount/): number

## Remarks[​](#remarks "Direct link to Remarks")

If the setter for this value is called on a grid with a value less than 1, it will throw an error. Users cannot remove columns from a grid if they are occupied by children, so if you try to reduce the count of columns in a grid and some of those columns have children, it will throw an error. By default, when the column count is increased, the new columns will be added as [`GridTrackSize`](/docs/plugins/api/GridTrackSize/) objects with type `"FLEX"`. If you want to change the type of the new columns, you can use the setters on GridTrackSize objects returned by [`gridRowSizes`](/docs/plugins/api/properties/nodes-gridrowsizes/) or [`gridColumnSizes`](/docs/plugins/api/properties/nodes-gridcolumnsizes/).

*   [Signature](#signature)
*   [Remarks](#remarks)
