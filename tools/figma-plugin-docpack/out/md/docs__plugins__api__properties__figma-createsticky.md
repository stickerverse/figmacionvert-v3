# createSticky | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createsticky/
scraped_at: 2025-12-22T03:30:31.422Z
---

On this page

info

This API is only available in FigJam

Creates a new sticky. The behavior is similar to using the `S` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createSticky](/docs/plugins/api/properties/figma-createsticky/)(): [StickyNode](/docs/plugins/api/StickyNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has constant width and height both at 240, and is parented under `figma.currentPage`.

Create a sticky with text

```
(async () => {  const sticky = figma.createSticky()  // Load the font before setting characters  await figma.loadFontAsync(sticky.text.fontName)  sticky.text.characters = 'Hello world!'})()
```

*   [Signature](#signature)
*   [Remarks](#remarks)
