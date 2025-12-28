# createComponentFromNode | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createcomponentfromnode/
scraped_at: 2025-12-22T03:30:31.156Z
---

On this page

info

This API is only available in Figma Design

Creates a component from an existing node, preserving all of its properties and children. The behavior is similar to using the **Create component** button in the toolbar.

## Signature[​](#signature "Direct link to Signature")

### [createComponentFromNode](/docs/plugins/api/properties/figma-createcomponentfromnode/)(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [ComponentNode](/docs/plugins/api/ComponentNode/)

## Remarks[​](#remarks "Direct link to Remarks")

To create a brand new component instead, use [`figma.createComponent`](/docs/plugins/api/properties/figma-createcomponent/).

There are many restrictions on what nodes can be turned into components. For example, the node cannot be a component or component set and cannot be inside a component, component set, or instance.

If you try to create a component from a node that cannot be turned into a component, then the function will throw a `Cannot create component from node` error.

Create a component from a node

```
const frame = figma.createFrame()const component = figma.createComponentFromNode(frame)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
