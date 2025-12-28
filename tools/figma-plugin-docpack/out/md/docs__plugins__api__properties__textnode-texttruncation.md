# textTruncation | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TextNode-texttruncation/
scraped_at: 2025-12-22T03:30:54.408Z
---

On this page

Whether this text node will truncate with an ellipsis when the text node size is smaller than the text inside.

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)

## Signature[​](#signature "Direct link to Signature")

### [textTruncation](/docs/plugins/api/properties/TextNode-texttruncation/): 'DISABLED' | 'ENDING'

## Remarks[​](#remarks "Direct link to Remarks")

When [`textAutoResize`](/docs/plugins/api/properties/TextNode-textautoresize/) is set to `"NONE"`, the text will truncate when the fixed size is smaller than the text inside. When it is `"HEIGHT"` or `"WIDTH_AND_HEIGHT"`, truncation will only occur if used in conjunction with [`maxHeight`](/docs/plugins/api/node-properties/#maxheight) or [`maxLines`](/docs/plugins/api/properties/TextNode-maxlines/).

*   [Signature](#signature)
*   [Remarks](#remarks)
