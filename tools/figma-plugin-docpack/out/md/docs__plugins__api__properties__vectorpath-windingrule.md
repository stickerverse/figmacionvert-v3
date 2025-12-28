# windingRule | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/VectorPath-windingrule/
scraped_at: 2025-12-22T03:30:59.483Z
---

On this page

The winding rule for the path (same as in SVGs). This determines whether a given point in space is inside or outside the path.

## Signature[​](#signature "Direct link to Signature")

### [windingRule](/docs/plugins/api/properties/VectorPath-windingrule/): [WindingRule](/docs/plugins/api/properties/VectorPath-windingrule/#winding-rule) | 'NONE' \[readonly\]

## Remarks[​](#remarks "Direct link to Remarks")

```
type WindingRule = "NONZERO" | "EVENODD"
```

Winding rules work off a concept called the winding number, which tells you for a given point how many times the path winds around that point. This is described in much more detail [here](https://oreillymedia.github.io/Using_SVG/extras/ch06-fill-rule.html). This field can have three possible values:

*   `"NONZERO"`: The point is considered inside the path if the winding number is NONZERO.
*   `"EVENODD"`: The point is considered inside the path if the winding number is odd.
*   `"NONE"`: An open path won’t have a fill.

*   [Signature](#signature)
*   [Remarks](#remarks)
