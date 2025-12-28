# guides | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/PageNode-guides/
scraped_at: 2025-12-22T03:30:52.443Z
---

On this page

The guides on this page.

Supported on:

*   [PageNode](/docs/plugins/api/PageNode/)

## Signature[​](#signature "Direct link to Signature")

### [guides](/docs/plugins/api/properties/PageNode-guides/): ReadonlyArray<[Guide](/docs/plugins/api/Guide/)\>

## Remarks[​](#remarks "Direct link to Remarks")

Like many of our array properties, `page.guide` creates a new, read-only array every time it is called. To change the guides, you will need to make a copy of the existing array and/or assign a new array.

Example:

```
function addNewGuide(page: PageNode, guide: Guide) {  // .concat() creates a new array  page.guides = page.guides.concat(guide)}
```

*   [Signature](#signature)
*   [Remarks](#remarks)
