# selectedTextRange | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/PageNode-selectedtextrange/
scraped_at: 2025-12-22T03:30:52.717Z
---

On this page

The current text node being edited, if any, and the text currently being selected within that text node.

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

## Signature[​](#signature "Direct link to Signature")

### [selectedTextRange](/docs/plugins/api/properties/PageNode-selectedtextrange/): { node: [TextNode](/docs/plugins/api/TextNode/); start: number; end: number } | null

## Remarks[​](#remarks "Direct link to Remarks")

This property will return `null` if there is no text node being edited. Setting this property to a `node` will enter text edit mode on that `node`. Leaving text edit mode will set this value to `null`.

When `start == end`, it means that no characters is currently selected -- i.e., there is just a cursor.

Changing `selectedTextRange` will trigger a `selectionchange` message.

*   [Signature](#signature)
*   [Remarks](#remarks)
