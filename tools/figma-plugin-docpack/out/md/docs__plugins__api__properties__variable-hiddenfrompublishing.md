# hiddenFromPublishing | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/Variable-hiddenfrompublishing/
scraped_at: 2025-12-22T03:30:58.612Z
---

On this page

Whether this variable is hidden when publishing the current file as a library. Can only true if [`remote`](/docs/plugins/api/Variable/#remote) is false (e.g. this is a local variable).

## Signature[​](#signature "Direct link to Signature")

### [hiddenFromPublishing](/docs/plugins/api/properties/Variable-hiddenfrompublishing/): boolean

## Remarks[​](#remarks "Direct link to Remarks")

If the parent [`VariableCollection`](/docs/plugins/api/VariableCollection/) is marked as `hiddenFromPublishing`, then this variable will also be hidden from publishing via the UI. `hiddenFromPublishing` is independently toggled for a variable and collection, however both must be true for a given variable to be publishable.

*   [Signature](#signature)
*   [Remarks](#remarks)
