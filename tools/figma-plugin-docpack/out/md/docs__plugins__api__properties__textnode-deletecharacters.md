# deleteCharacters | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TextNode-deletecharacters/
scraped_at: 2025-12-22T03:30:43.491Z
---

On this page

Remove characters in the text from `start` (inclusive) to `end` (exclusive).

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

## Signature[​](#signature "Direct link to Signature")

### [deleteCharacters](/docs/plugins/api/properties/TextNode-deletecharacters/)(start: number, end: number): void

## Remarks[​](#remarks "Direct link to Remarks")

This API allows you to remove characters in a text node while preserving the styles of the existing characters. However, you still need to call [`figma.loadFontAsync`](/docs/plugins/api/properties/figma-loadfontasync/) before using this API.

caution

⚠ Did you know: not all glyphs that you might think as a "character" are actually stored as a single character in JavaScript string? JavaScript strings are UTF-16 encoded. Some characters like "👍" are stored using two characters! Try it in the JavaScript console: "👍".length is 2! The two characters are called "surrogate pairs". Even more mindblowing: some characters are made of multiple _emojis_. For example, "👨‍👧", which you should see in your browser as a single character, has length 5. "👨‍👧".substring(0, 2) is "👨" and "👨‍👧".substring(3, 5) is "👧".

*   [Signature](#signature)
*   [Remarks](#remarks)
