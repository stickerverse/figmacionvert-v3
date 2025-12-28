# normalizeMarkdown | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-util-normalizemarkdown/
scraped_at: 2025-12-22T03:30:55.262Z
---

On this page

Normalizes the markdown string to verify what markdown will render with Figma's rich-text editors.

Examples:

```
const md = "# Hello, world!\n\nThis is a **bold** text."const normalizedMd = figma.util.normalizeMarkdown(md);// Set an component description with descriptionMarkdowncomponent.descriptionMarkdown = normalizedMd;
```

## Signature[​](#signature "Direct link to Signature")

### normalizeMarkdown(markdown: string): string

## Parameters[​](#parameters "Direct link to Parameters")

### markdown[​](#markdown "Direct link to markdown")

A markdown string to normalize.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [markdown](#markdown)
