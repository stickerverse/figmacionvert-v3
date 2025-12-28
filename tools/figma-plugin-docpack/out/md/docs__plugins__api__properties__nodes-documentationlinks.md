# documentationLinks | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-documentationlinks/
scraped_at: 2025-12-22T03:30:43.908Z
---

On this page

The documentation links for this style/component.

Supported on:

*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [EffectStyle](/docs/plugins/api/EffectStyle/)
*   [GridStyle](/docs/plugins/api/GridStyle/)
*   [PaintStyle](/docs/plugins/api/PaintStyle/)
*   [TextStyle](/docs/plugins/api/TextStyle/)

## Signature[​](#signature "Direct link to Signature")

### [documentationLinks](/docs/plugins/api/properties/nodes-documentationlinks/): ReadonlyArray<[DocumentationLink](/docs/plugins/api/DocumentationLink/)\>

## Remarks[​](#remarks "Direct link to Remarks")

This API currently only supports setting a single documentation link. To clear the documentation links, set to the empty list \[\].

Example:

```
node.documentationLinks = [{uri: "https://www.figma.com"}]// clear documentation linksnode.documentationLinks = []
```

*   [Signature](#signature)
*   [Remarks](#remarks)
