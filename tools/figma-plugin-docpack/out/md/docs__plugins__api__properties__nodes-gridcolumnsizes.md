# gridColumnSizes | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridcolumnsizes/
scraped_at: 2025-12-22T03:30:45.678Z
---

On this page

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`. Returns an array of [`GridTrackSize`](/docs/plugins/api/GridTrackSize/) objects representing the columns in the grid in order.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [gridColumnSizes](/docs/plugins/api/properties/nodes-gridcolumnsizes/): Array<[GridTrackSize](/docs/plugins/api/GridTrackSize/)\>

## Remarks[​](#remarks "Direct link to Remarks")

The order of the columns is from left to right. The [`GridTrackSize`](/docs/plugins/api/GridTrackSize/) can be used to change the type of the column (either `"FLEX"` or `"FIXED"`) and the size of the track (if it is a `"FIXED"` track).

*   [Signature](#signature)
*   [Remarks](#remarks)
