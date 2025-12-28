# FontName | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/FontName/
scraped_at: 2025-12-22T03:30:36.142Z
---

```
interface Font {  fontName: FontName}interface FontName {  readonly family: string  readonly style: string}
```

Describes a font used by a text node. For example, the default font is `{ family: "Inter", style: "Regular" }`.
