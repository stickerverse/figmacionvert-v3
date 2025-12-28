# off | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/PageNode-off/
scraped_at: 2025-12-22T03:30:53.041Z
---

On this page

Removes a callback added with [`on`](/docs/plugins/api/properties/PageNode-on/) or [`once`](/docs/plugins/api/PageNode/#once).

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

## Signature[​](#signature "Direct link to Signature")

### [off](/docs/plugins/api/properties/PageNode-off/)(type: 'nodechange', callback: (event: [NodeChangeEvent](/docs/plugins/api/NodeChangeEvent/)) => void): void

## Remarks[​](#remarks "Direct link to Remarks")

The callback needs to be the same object that was originally added. For example, you can do this:

Correct way to remove a callback

```
let fn = () => { console.log("nodechange") }page.on("nodechange", fn)page.off("nodechange", fn)
```

whereas the following won't work, because the function objects are different:

Incorrect way to remove a callback

```
page.on("nodechange", () => { console.log("nodechange") })page.off("nodechange", () => { console.log("nodechange") })
```

*   [Signature](#signature)
*   [Remarks](#remarks)
