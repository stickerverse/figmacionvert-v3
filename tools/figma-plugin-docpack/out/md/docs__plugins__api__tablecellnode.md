# TableCellNode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/TableCellNode/
scraped_at: 2025-12-22T03:30:27.435Z
---

On this page

Table cells are elements within a [TableNode](/docs/plugins/api/TableNode/).

## Table cell properties[​](#table-cell-properties "Direct link to Table cell properties")

### type: 'TABLE\_CELL' \[readonly\]

The type of this node, represented by the string literal "TABLE\_CELL"

* * *

### text: [TextSublayerNode](/docs/plugins/api/TextSublayer/#text-sublayer-node) \[readonly\]

Text sublayer of the TableCellNode

* * *

### rowIndex: number \[readonly\]

The row index of this cell relative to its parent table.

* * *

### columnIndex: number \[readonly\]

The column index of this cell relative to its parent table.

* * *

## Basic properties[​](#basic-properties "Direct link to Basic properties")

### [toString](/docs/plugins/api/properties/nodes-tostring/)(): string

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](/docs/plugins/api/properties/nodes-tostring/)

* * *

### [parent](/docs/plugins/api/properties/nodes-parent/): ([BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin)) | null \[readonly\]

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](/docs/plugins/api/properties/nodes-appendchild/).

[View more →](/docs/plugins/api/properties/nodes-parent/)

* * *

### height: number \[readonly\]

The height of the node. Use a resizing method to change this value.

* * *

### width: number \[readonly\]

The width of the node. Use a resizing method to change this value.

* * *

## Fill-related properties[​](#fill-related-properties "Direct link to Fill-related properties")

### [fills](/docs/plugins/api/properties/nodes-fills/): ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\> | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

[View more →](/docs/plugins/api/properties/nodes-fills/)

* * *

### [fillStyleId](/docs/plugins/api/properties/nodes-fillstyleid/): string | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

The id of the [`PaintStyle`](/docs/plugins/api/PaintStyle/) object that the [`fills`](/docs/plugins/api/properties/nodes-fills/) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

[View more →](/docs/plugins/api/properties/nodes-fillstyleid/)

* * *

### setFillStyleIdAsync(styleId: string): Promise<void>

Sets the [`PaintStyle`](/docs/plugins/api/PaintStyle/) that the [`fills`](/docs/plugins/api/properties/nodes-fills/) property of this node is linked to.

* * *

*   [Table cell properties](#table-cell-properties)
*   [Basic properties](#basic-properties)
*   [Fill-related properties](#fill-related-properties)
