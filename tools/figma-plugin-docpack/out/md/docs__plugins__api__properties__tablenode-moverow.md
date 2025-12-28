# moveRow | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TableNode-moverow/
scraped_at: 2025-12-22T03:30:54.111Z
---

On this page

Moves the row from the start index to the destination index.

Supported on:

*   [TableNode](/docs/plugins/api/TableNode/)

## Signature[​](#signature "Direct link to Signature")

### moveRow(fromIndex: number, toIndex: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### fromIndex[​](#fromindex "Direct link to fromIndex")

Index of the row to move. Must satisfy `0 <= rowIndex < numRows`.

### toIndex[​](#toindex "Direct link to toIndex")

Index that specifies where the row will be moved before. Must satisfy `0 <= rowIndex < numRows`.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [fromIndex](#fromindex)
    *   [toIndex](#toindex)
