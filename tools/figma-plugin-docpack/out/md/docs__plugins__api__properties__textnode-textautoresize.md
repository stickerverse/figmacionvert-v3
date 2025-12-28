# textAutoResize | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TextNode-textautoresize/
scraped_at: 2025-12-22T03:30:54.403Z
---

On this page

The behavior of how the size of the text box adjusts to fit the characters. Setting this property requires the font the be loaded.

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)

## Signature[​](#signature "Direct link to Signature")

### [textAutoResize](/docs/plugins/api/properties/TextNode-textautoresize/): 'NONE' | 'WIDTH\_AND\_HEIGHT' | 'HEIGHT' | 'TRUNCATE'

## Remarks[​](#remarks "Direct link to Remarks")

*   "NONE": The size of the textbox is fixed and is independent of its content.
*   "HEIGHT": The width of the textbox is fixed. Characters wrap to fit in the textbox. The height of the textbox automatically adjusts to fit its content.
*   "WIDTH\_AND\_HEIGHT": Both the width and height of the textbox automatically adjusts to fit its content. Characters do not wrap.
*   \[DEPRECATED\] "TRUNCATE": Like "NONE", but text that overflows the bounds of the text node will be truncated with an ellipsis. This value will be removed in the future - prefer reading from [`textTruncation`](/docs/plugins/api/properties/TextNode-texttruncation/) instead.

*   [Signature](#signature)
*   [Remarks](#remarks)
