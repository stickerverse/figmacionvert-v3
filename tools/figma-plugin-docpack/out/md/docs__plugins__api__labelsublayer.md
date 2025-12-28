# LabelSublayer | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/LabelSublayer/
scraped_at: 2025-12-22T03:30:36.962Z
---

On this page

LabelSublayer (on [ConnectorNodes](/docs/plugins/api/ConnectorNode/)) acts like pared-back version of a rectangle node. It is used to provide a background on text.

## Basic traits[​](#basic-traits "Direct link to Basic traits")

### [toString](/docs/plugins/api/properties/nodes-tostring/)(): string

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](/docs/plugins/api/properties/nodes-tostring/)

* * *

### [parent](/docs/plugins/api/properties/nodes-parent/): ([BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin)) | null \[readonly\]

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](/docs/plugins/api/properties/nodes-appendchild/).

[View more →](/docs/plugins/api/properties/nodes-parent/)

* * *

> Tip: `parent` will always return a [ConnectorNode](/docs/plugins/api/ConnectorNode/)

## Geometry-related properties[​](#geometry-related-properties "Direct link to Geometry-related properties")

### [fills](/docs/plugins/api/properties/nodes-fills/): ReadonlyArray<[Paint](/docs/plugins/api/Paint/)\> | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](/docs/plugins/editing-properties/).

[View more →](/docs/plugins/api/properties/nodes-fills/)

* * *

### [fillStyleId](/docs/plugins/api/properties/nodes-fillstyleid/): string | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

The id of the [`PaintStyle`](/docs/plugins/api/PaintStyle/) object that the [`fills`](/docs/plugins/api/properties/nodes-fills/) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

[View more →](/docs/plugins/api/properties/nodes-fillstyleid/)

* * *

### [cornerRadius](/docs/plugins/api/properties/nodes-cornerradius/): number | [figma.mixed](/docs/plugins/api/properties/figma-mixed/)

The number of pixels to round the corners of the object by.

[View more →](/docs/plugins/api/properties/nodes-cornerradius/)

* * *

### topLeftRadius: number

* * *

### topRightRadius: number

* * *

### bottomLeftRadius: number

* * *

### bottomRightRadius: number

* * *

You can set individual corner radius of each of the four corners of a rectangle node or frame-like node. Similar to `cornerRadius`, these value must be non-negative and can be fractional. If an edge length is less than twice the corner radius, the corner radius for each vertex of the edge will be clamped to half the edge length.

Setting `cornerRadius` sets the property for all four corners. Setting these corners to different values makes `cornerRadius` return `mixed`.

*   [Basic traits](#basic-traits)
*   [Geometry-related properties](#geometry-related-properties)
