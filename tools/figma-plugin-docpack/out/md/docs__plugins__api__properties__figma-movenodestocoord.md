# moveNodesToCoord | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-movenodestocoord/
scraped_at: 2025-12-22T03:30:32.954Z
---

On this page

Moves the specified nodes to a specific coordinate in the canvas grid.

info

This API is only available in Figma Slides and Figma Buzz

This function allows precise positioning of multiple nodes within the canvas grid system used in Slides and Buzz.

## Signature[​](#signature "Direct link to Signature")

### [moveNodesToCoord](/docs/plugins/api/properties/figma-movenodestocoord/)(nodeIds: string\[\], rowIndex?: number, columnIndex?: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### nodeIds[​](#nodeids "Direct link to nodeIds")

Array of node IDs to move

### rowIndex[​](#rowindex "Direct link to rowIndex")

The target row index in the canvas grid (optional)

### columnIndex[​](#columnindex "Direct link to columnIndex")

The target column index in the canvas grid (optional)

## Remarks[​](#remarks "Direct link to Remarks")

Calling this function without rowIndex and columnIndex will move the node to the end of the grid

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [nodeIds](#nodeids)
    *   [rowIndex](#rowindex)
    *   [columnIndex](#columnindex)
*   [Remarks](#remarks)
