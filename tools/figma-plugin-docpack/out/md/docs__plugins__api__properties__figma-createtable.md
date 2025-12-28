# createTable | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createtable/
scraped_at: 2025-12-22T03:30:31.715Z
---

On this page

info

This API is only available in FigJam

Creates a new table.

## Signature[​](#signature "Direct link to Signature")

### [createTable](/docs/plugins/api/properties/figma-createtable/)(numRows?: number, numColumns?: number): [TableNode](/docs/plugins/api/TableNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, a table has two rows and two columns, and is parented under `figma.currentPage`.

Create a table and add text to cells inside

```
(async () => {  // Create a table with 2 rows and 3 columns  const table = figma.createTable(2, 3)  // Load the font before setting characters  await figma.loadFontAsync(table.cellAt(0, 0).text.fontName)  // Sets characters for the table cells:  // A B C  // 1 2 3  table.cellAt(0, 0).text.characters = 'A'  table.cellAt(0, 1).text.characters = 'B'  table.cellAt(0, 2).text.characters = 'C'  table.cellAt(1, 0).text.characters = '1'  table.cellAt(1, 1).text.characters = '2'  table.cellAt(1, 2).text.characters = '3'})()
```

*   [Signature](#signature)
*   [Remarks](#remarks)
