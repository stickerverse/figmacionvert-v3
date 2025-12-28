# createPage | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createpage/
scraped_at: 2025-12-22T03:30:31.149Z
---

On this page

info

This API is only available in Figma Design

Creates a new page, appended to the document's list of children.

## Signature[​](#signature "Direct link to Signature")

### [createPage](/docs/plugins/api/properties/figma-createpage/)(): [PageNode](/docs/plugins/api/PageNode/)

## Remarks[​](#remarks "Direct link to Remarks")

A page node can be the parent of all types of nodes except for the document node and other page nodes.

Files in a Starter team are limited to three pages. When a plugin tries to create more than three pages in a Starter team file, it triggers the following error:

Page limit error

```
The Starter plan only comes with 3 pages. Upgrade toProfessional for unlimited pages.
```

*   [Signature](#signature)
*   [Remarks](#remarks)
