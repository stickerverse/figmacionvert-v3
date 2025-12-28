# rotation | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/ConnectorNode-rotation/
scraped_at: 2025-12-22T03:30:52.189Z
---

On this page

The rotation of the node in degrees. Returns values from -180 to 180. Identical to `Math.atan2(-m10, m00)` in the [`relativeTransform`](/docs/plugins/api/properties/nodes-relativetransform/) matrix. When setting `rotation`, it will also set `m00`, `m01`, `m10`, `m11`.

Supported on:

*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)

## Signature[​](#signature "Direct link to Signature")

### [rotation](/docs/plugins/api/properties/ConnectorNode-rotation/): number

## Remarks[​](#remarks "Direct link to Remarks")

The rotation is with respect to the top-left of the object. Therefore, it is independent from the position of the object. If you want to rotate with respect to the center (or any arbitrary point), you can do so via matrix transformations and [`relativeTransform`](/docs/plugins/api/properties/nodes-relativetransform/).

*   [Signature](#signature)
*   [Remarks](#remarks)
