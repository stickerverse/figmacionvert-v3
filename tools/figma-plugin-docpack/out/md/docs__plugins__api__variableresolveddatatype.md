# VariableResolvedDataType | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/VariableResolvedDataType/
scraped_at: 2025-12-22T03:30:57.550Z
---

```
type VariableResolvedDataType =  "BOOLEAN" |  "COLOR" |  "FLOAT" |  "STRING"
```

The list of resolved [`Variable`](/docs/plugins/api/Variable/) types that Figma current supports.

*   `"BOOLEAN"` variables can be assigned to `true` or `false`
*   `"COLOR"` variables can be assigned to [`RGB`](/docs/plugins/api/RGB/) values
*   `"FLOAT"` variables can be assigned to `number` values
*   `"STRING"` variables can be assigned to `string` values

Since a variable can be assigned to a [`VariableAlias`](/docs/plugins/api/VariableAlias/) for any given mode, this type refers to the type of the fully resolved value (after following all aliases).
