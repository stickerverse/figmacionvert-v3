# findChild | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findchild/
scraped_at: 2025-12-22T03:30:52.426Z
---

On this page

Searches the immediate children of this node (i.e. all page nodes, not including their children). Returns the first page for which `callback` returns true.

Supported on:

*   [DocumentNode](/docs/plugins/api/DocumentNode/)

## Signature[​](#signature "Direct link to Signature")

### [findChild](/docs/plugins/api/properties/DocumentNode-findchild/)(callback: (node: [PageNode](/docs/plugins/api/PageNode/)) => boolean): [PageNode](/docs/plugins/api/PageNode/) | null

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`.

## Remarks[​](#remarks "Direct link to Remarks")

This function returns `null` if no matching node is found.

Example: find the first page matching a certain name scheme

```
const firstTemplate = figma.root.findChild(n => n.name.includes("template"))
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
