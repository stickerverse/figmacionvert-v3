# MaskType | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/MaskType/
scraped_at: 2025-12-22T03:30:37.358Z
---

```
type MaskType =  "ALPHA" |  "VECTOR" |  "LUMINANCE"
```

Mask type defines what type of masking a node should use if it is a mask.

The possible values are:

*   `"ALPHA"`: the mask node's alpha channel will be used to determine the opacity of each pixel in the masked result.
*   `"VECTOR"`: if the mask node has visible fill paints, every pixel inside the node's fill regions will be fully visible in the masked result. If the mask has visible stroke paints, every pixel inside the node's stroke regions will be fully visible in the masked result.
*   `"LUMINANCE"`: the luminance value of each pixel of the mask node will be used to determine the opacity of that pixel in the masked result.
