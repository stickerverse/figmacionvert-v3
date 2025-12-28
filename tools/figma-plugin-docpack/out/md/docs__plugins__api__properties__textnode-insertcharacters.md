# insertCharacters | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TextNode-insertcharacters/
scraped_at: 2025-12-22T03:30:46.689Z
---

On this page

Insert `characters` at index `start` in the text.

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

## Signature[​](#signature "Direct link to Signature")

### [insertCharacters](/docs/plugins/api/properties/TextNode-insertcharacters/)(start: number, characters: string, useStyle?: 'BEFORE' | 'AFTER'): void

## Remarks[​](#remarks "Direct link to Remarks")

This API allows you to insert characters in a text node while preserving the styles of the existing characters. However, you still need to call [`figma.loadFontAsync`](/docs/plugins/api/properties/figma-loadfontasync/) before using this API.

The style of the inserted characters will be copied from the preceding character if `useStyle` is "BEFORE" or not provided. Otherwise, the style of inserted characters will be copied from the following character. If there is no preceding or following character (i.e. `start` is at the boundary of the string), then the style will be copied from the closest existing character.

caution

⚠ Did you know: not all glyphs that you might think as a "character" are actually stored as a single character in JavaScript string? JavaScript strings are UTF-16 encoded. Some characters like "👍" are stored using two characters! Try it in the JavaScript console: "👍".length is 2! The two characters are called "surrogate pairs". Even more mindblowing: some characters are made of multiple _emojis_. For example, "👨‍👧", which you should see in your browser as a single character, has length 5. "👨‍👧".substring(0, 2) is "👨" and "👨‍👧".substring(3, 5) is "👧".

*   [Signature](#signature)
*   [Remarks](#remarks)
