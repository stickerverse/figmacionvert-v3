# VariableAlias | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/VariableAlias/
scraped_at: 2025-12-22T03:30:51.607Z
---

```
interface VariableAlias {  type: 'VARIABLE_ALIAS'  id: string}
```

A structure used to describe when a particular node or variable is directly bound to a variable. The `id` of the bound variable can be used in conjunction with functions that accept a VariableId, such as `figma.variables.getVariableById`.
