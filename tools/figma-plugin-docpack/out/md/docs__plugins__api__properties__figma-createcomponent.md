# createComponent | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createcomponent/
scraped_at: 2025-12-22T03:30:30.878Z
---

On this page

info

This API is only available in Figma Design

Creates a new, empty component.

## Signature[​](#signature "Direct link to Signature")

### [createComponent](/docs/plugins/api/properties/figma-createcomponent/)(): [ComponentNode](/docs/plugins/api/ComponentNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has width and height both at 100, and is parented under `figma.currentPage`.

This function creates a brand new component. To create a component from an existing node, use [`figma.createComponentFromNode`](/docs/plugins/api/properties/figma-createcomponentfromnode/).

Create a component

```
const component = figma.createComponent()
```

*   [Signature](#signature)
*   [Remarks](#remarks)
