# createPageDivider | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createpagedivider/
scraped_at: 2025-12-22T03:30:31.167Z
---

On this page

Creates a new page divider, appended to the document's list of children. A page divider is a [`PageNode`](/docs/plugins/api/PageNode/) with `isPageDivider` true.

## Signature[​](#signature "Direct link to Signature")

### [createPageDivider](/docs/plugins/api/properties/figma-createpagedivider/)(dividerName?: string): [PageNode](/docs/plugins/api/PageNode/)

## Parameters[​](#parameters "Direct link to Parameters")

### dividerName[​](#dividername "Direct link to dividerName")

An optional argument to specify the name of the page divider node. It won't change how the page divider appears in the UI, but it specifies the name of the underlying node. The dividerName must be a page divider name (all asterisks, all en dashes, all em dashes, or all spaces). If no dividerName is specified, the default name for the created page divider node is "---".

## Remarks[​](#remarks "Direct link to Remarks")

A page divider is always the child of the document node and cannot have any children.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [dividerName](#dividername)
*   [Remarks](#remarks)
