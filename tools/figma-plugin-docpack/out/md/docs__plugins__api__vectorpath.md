# VectorPath | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/VectorPath/
scraped_at: 2025-12-22T03:30:40.824Z
---

On this page

The `VectorPath` API is the recommended way to change the geometry of a vector object. While [vector networks](/docs/plugins/api/VectorNetwork/) are more powerful, they are significantly more complicated and very easy to get wrong. Paths are usually sufficient and much easier to work with. Creating a vector path looks like this:

```
// Set the geometry to a trianglenode.vectorPaths = [{  windingRule: "EVENODD",  data: "M 0 100 L 100 100 L 50 0 Z",}]
```

## VectorPath[​](#vectorpath "Direct link to VectorPath")

### [windingRule](/docs/plugins/api/properties/VectorPath-windingrule/): [WindingRule](/docs/plugins/api/properties/VectorPath-windingrule/#winding-rule) | 'NONE' \[readonly\]

The winding rule for the path (same as in SVGs). This determines whether a given point in space is inside or outside the path.

[View more →](/docs/plugins/api/properties/VectorPath-windingrule/)

* * *

### [data](/docs/plugins/api/properties/VectorPath-data/): string \[readonly\]

A series of path commands that encodes how to draw the path.

[View more →](/docs/plugins/api/properties/VectorPath-data/)

* * *

## VectorPaths[​](#vectorpaths "Direct link to VectorPaths")

Vector nodes can be composed of multiple VectorPath(s).

```
type VectorPaths = ReadonlyArray<VectorPath>
```

*   [VectorPath](#vectorpath)
*   [VectorPaths](#vectorpaths)
