# createText | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createtext/
scraped_at: 2025-12-22T03:30:30.715Z
---

On this page

Creates a new, empty text node.

## Signature[​](#signature "Direct link to Signature")

### [createText](/docs/plugins/api/properties/figma-createtext/)(): [TextNode](/docs/plugins/api/TextNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, parented under `figma.currentPage`. Without setting additional properties, the text has no characters. You can assign a string, to the [`characters`](/docs/plugins/api/properties/TextNode-characters/) property of the returned node to provide it with text.

Create a styled 'Hello world!' text node

```
(async () => {  const text = figma.createText()  // Move to (50, 50)  text.x = 50  text.y = 50  // Load the font in the text node before setting the characters  await figma.loadFontAsync(text.fontName)  text.characters = 'Hello world!'  // Set bigger font size and red color  text.fontSize = 18  text.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]})()
```

*   [Signature](#signature)
*   [Remarks](#remarks)
