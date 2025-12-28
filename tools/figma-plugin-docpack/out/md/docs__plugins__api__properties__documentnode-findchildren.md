# findChildren | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findchildren/
scraped_at: 2025-12-22T03:30:52.182Z
---

On this page

Searches the immediate children of this node (i.e. all page nodes, not including their children). Returns all pages for which `callback` returns true.

Supported on:

*   [DocumentNode](/docs/plugins/api/DocumentNode/)

## Signature[​](#signature "Direct link to Signature")

### [findChildren](/docs/plugins/api/properties/DocumentNode-findchildren/)(callback?: (node: [PageNode](/docs/plugins/api/PageNode/)) => boolean): Array<[PageNode](/docs/plugins/api/PageNode/)\>

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`. If this argument is omitted, `findChildren` returns `node.children`.

## Remarks[​](#remarks "Direct link to Remarks")

Example: find pages matching a certain name scheme

```
const templates = figma.root.findChildren(n => n.name.includes("template"))
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [callback](#callback)
*   [Remarks](#remarks)
