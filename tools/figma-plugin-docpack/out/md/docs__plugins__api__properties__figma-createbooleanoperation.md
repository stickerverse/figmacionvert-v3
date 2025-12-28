# createBooleanOperation | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createbooleanoperation/
scraped_at: 2025-12-22T03:30:31.767Z
---

On this page

**DEPRECATED:** Use [`figma.union`](/docs/plugins/api/figma/#union), [`figma.subtract`](/docs/plugins/api/figma/#subtract), [`figma.intersect`](/docs/plugins/api/figma/#intersect), [`figma.exclude`](/docs/plugins/api/figma/#exclude) instead.

## Signature[​](#signature "Direct link to Signature")

### [createBooleanOperation](/docs/plugins/api/properties/figma-createbooleanoperation/)(): [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)

## Remarks[​](#remarks "Direct link to Remarks")

Using this function is not recommended because empty boolean operation nodes can have surprising, unpredictable behavior. It will eventually be remove. Use one of the functions listed above instead.

Creates a new, empty boolean operation node. The particular kind of operation is set via `.booleanOperation`. By default, the value is `"UNION"`.

This snippet, for example, creates a boolean operation node that is a union of a rectangle and an ellipse.

Create a boolean operation node

```
const node = figma.createBooleanOperation()node.appendChild(figma.createRectangle())node.appendChild(figma.createEllipse())
```

*   [Signature](#signature)
*   [Remarks](#remarks)
