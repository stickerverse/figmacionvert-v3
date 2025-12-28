# moveColumn | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TableNode-movecolumn/
scraped_at: 2025-12-22T03:30:54.160Z
---

On this page

Moves the column from the start index to the destination index.

Supported on:

*   [TableNode](/docs/plugins/api/TableNode/)

## Signature[​](#signature "Direct link to Signature")

### moveColumn(fromIndex: number, toIndex: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### fromIndex[​](#fromindex "Direct link to fromIndex")

Index of the column to move. Must satisfy `0 <= columnIndex < numColumns`.

### toIndex[​](#toindex "Direct link to toIndex")

Index that specifies where the column will be moved before. Must satisfy `0 <= columnIndex < numColumns`.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [fromIndex](#fromindex)
    *   [toIndex](#toindex)
