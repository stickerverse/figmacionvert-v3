# createInstance | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-buzz-createinstance/
scraped_at: 2025-12-22T03:30:55.859Z
---

On this page

Creates an instance of a component in Buzz, optionally positioned at specific canvas coordinates.

## Signature[​](#signature "Direct link to Signature")

### [createInstance](/docs/plugins/api/properties/figma-buzz-createinstance/)(component: [ComponentNode](/docs/plugins/api/ComponentNode/), rowIndex: number, columnIndex?: number): [InstanceNode](/docs/plugins/api/InstanceNode/)

## Parameters[​](#parameters "Direct link to Parameters")

### component[​](#component "Direct link to component")

The ComponentNode to create an instance from

### rowIndex[​](#rowindex "Direct link to rowIndex")

The row position on the canvas grid (optional)

### columnIndex[​](#columnindex "Direct link to columnIndex")

The column position on the canvas grid (optional)

## Remarks[​](#remarks "Direct link to Remarks")

If no rowIndex and columnIndex are specified, the new instance will be created at the end of the canvas grid.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [component](#component)
    *   [rowIndex](#rowindex)
    *   [columnIndex](#columnindex)
*   [Remarks](#remarks)
