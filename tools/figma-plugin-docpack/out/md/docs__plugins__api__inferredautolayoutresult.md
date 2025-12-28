# InferredAutoLayoutResult | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/InferredAutoLayoutResult/
scraped_at: 2025-12-22T03:30:36.816Z
---

### [layoutMode](/docs/plugins/api/properties/nodes-layoutmode/): 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'

Determines whether this layer uses auto-layout to position its children. Defaults to "NONE".

[View more →](/docs/plugins/api/properties/nodes-layoutmode/)

* * *

### paddingLeft: number

Applicable only on auto-layout frames. Determines the left padding between the border of the frame and its children.

* * *

### paddingRight: number

Applicable only on auto-layout frames. Determines the right padding between the border of the frame and its children.

* * *

### paddingTop: number

Applicable only on auto-layout frames. Determines the top padding between the border of the frame and its children.

* * *

### paddingBottom: number

Applicable only on auto-layout frames. Determines the bottom padding between the border of the frame and its children.

* * *

### horizontalPadding: number

**DEPRECATED:** Use `paddingLeft` and `paddingRight` instead.

* * *

### verticalPadding: number

**DEPRECATED:** Use `paddingTop` and `paddingBottom` instead.

* * *

### [primaryAxisSizingMode](/docs/plugins/api/properties/nodes-primaryaxissizingmode/): 'FIXED' | 'AUTO'

Applicable only on auto-layout frames. Determines whether the primary axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](/docs/plugins/api/properties/nodes-primaryaxissizingmode/)

* * *

### [counterAxisSizingMode](/docs/plugins/api/properties/nodes-counteraxissizingmode/): 'FIXED' | 'AUTO'

Applicable only on auto-layout frames. Determines whether the counter axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](/docs/plugins/api/properties/nodes-counteraxissizingmode/)

* * *

### [strokesIncludedInLayout](/docs/plugins/api/properties/nodes-strokesincludedinlayout/): boolean

Applicable only on auto-layout frames. Determines whether strokes are included in [layout calculations](https://help.figma.com/hc/en-us/articles/31289464393751-Use-the-horizontal-and-vertical-flows-in-auto-layout#01JT9NA4HVT02ZPE7BA86SFCD6). When true, auto-layout frames behave like css `box-sizing: border-box`.

[View more →](/docs/plugins/api/properties/nodes-strokesincludedinlayout/)

* * *

### [layoutWrap](/docs/plugins/api/properties/nodes-layoutwrap/): 'NO\_WRAP' | 'WRAP'

Determines whether this layer should use wrapping auto-layout. Defaults to `"NO_WRAP"`.

[View more →](/docs/plugins/api/properties/nodes-layoutwrap/)

* * *

### [primaryAxisAlignItems](/docs/plugins/api/properties/nodes-primaryaxisalignitems/): 'MIN' | 'MAX' | 'CENTER' | 'SPACE\_BETWEEN'

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the primary axis direction.

[View more →](/docs/plugins/api/properties/nodes-primaryaxisalignitems/)

* * *

### [counterAxisAlignItems](/docs/plugins/api/properties/nodes-counteraxisalignitems/): 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the counter axis direction.

[View more →](/docs/plugins/api/properties/nodes-counteraxisalignitems/)

* * *

### [counterAxisAlignContent](/docs/plugins/api/properties/nodes-counteraxisaligncontent/): 'AUTO' | 'SPACE\_BETWEEN'

Applicable only on auto-layout frames with [`layoutWrap`](/docs/plugins/api/properties/nodes-layoutwrap/) set to `"WRAP"`. Determines how the wrapped tracks are spaced out inside of the auto-layout frame.

[View more →](/docs/plugins/api/properties/nodes-counteraxisaligncontent/)

* * *

### [itemSpacing](/docs/plugins/api/properties/nodes-itemspacing/): number

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines distance between children of the frame.

[View more →](/docs/plugins/api/properties/nodes-itemspacing/)

* * *

### [counterAxisSpacing](/docs/plugins/api/properties/nodes-counteraxisspacing/): number | null

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames with [`layoutWrap`](/docs/plugins/api/properties/nodes-layoutwrap/) set to `"WRAP"`. Determines the distance between wrapped tracks. The value must be positive.

[View more →](/docs/plugins/api/properties/nodes-counteraxisspacing/)

* * *

### [itemReverseZIndex](/docs/plugins/api/properties/nodes-itemreversezindex/): boolean

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines the [canvas stacking order](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties#Canvas_stacking_order) of layers in this frame. When true, the first layer will be draw on top.

[View more →](/docs/plugins/api/properties/nodes-itemreversezindex/)

* * *

### [layoutAlign](/docs/plugins/api/properties/nodes-layoutalign/): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT'

Applicable only on direct children of auto-layout frames. Determines if the layer should stretch along the parent’s counter axis. Defaults to `“INHERIT”`.

[View more →](/docs/plugins/api/properties/nodes-layoutalign/)

* * *

### [layoutGrow](/docs/plugins/api/properties/nodes-layoutgrow/): number

This property is applicable only for direct children of auto-layout frames. Determines whether a layer should stretch along the parent’s primary axis. 0 corresponds to a fixed size and 1 corresponds to stretch.

[View more →](/docs/plugins/api/properties/nodes-layoutgrow/)

* * *

### [layoutPositioning](/docs/plugins/api/properties/nodes-layoutpositioning/): 'AUTO' | 'ABSOLUTE'

This property is applicable only for direct children of auto-layout frames. Determines whether a layer's size and position should be dermined by auto-layout settings or manually adjustable.

[View more →](/docs/plugins/api/properties/nodes-layoutpositioning/)

* * *
