# gridRowSizes | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridrowsizes/
scraped_at: 2025-12-22T03:30:46.318Z
---

On this page

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`. Returns an array of [`GridTrackSize`](/docs/plugins/api/GridTrackSize/) objects representing the rows in the grid in order.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)

## Signature[​](#signature "Direct link to Signature")

### [gridRowSizes](/docs/plugins/api/properties/nodes-gridrowsizes/): Array<[GridTrackSize](/docs/plugins/api/GridTrackSize/)\>

## Remarks[​](#remarks "Direct link to Remarks")

The order of the rows is from top to bottom. The [`GridTrackSize`](/docs/plugins/api/GridTrackSize/) can be used to change the type of the row (either `"FLEX"` or `"FIXED"`) and the size of the track (if it is a `"FIXED"` track).

Grid layout with mixed track sizes and types

```
const parentFrame = figma.createFrame()parentFrame.layoutMode = 'GRID'parentFrame.gridRowCount = 2parentFrame.gridColumnCount = 3// Change the first row to be a fixed size of 100pxparentFrame.gridRowSizes[0].type // 'FLEX'parentFrame.gridRowSizes[0].type = 'FIXED'parentFrame.gridRowSizes[0].value = 100parentFrame.gridRowSizes[0].type // 'FIXED'// Grid with one fixed row and one flexible rows// + --- + --- + --- +// |     |     |     | 100px height// + --- + --- + --- +// |     |     |     |// |     |     |     | 'flex' height// |     |     |     |  occupies remaining height in the container, because there is only one flex row.// |     |     |     |// + --- + --- + --- +
```

*   [Signature](#signature)
*   [Remarks](#remarks)
