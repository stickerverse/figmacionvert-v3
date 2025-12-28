# VariableValue | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/VariableValue/
scraped_at: 2025-12-22T03:30:59.145Z
---

On this page

```
type VariableValue =  string |  number |  boolean |  RGB |  RGBA |  VariableAlias
```

## Variable Alias[​](#variable-alias "Direct link to Variable Alias")

Created via `figma.variables.createVariableBinding()`. Used to alias variables to other variables. Each `VariableValue` has at least one corresponding [`VariableResolvedDataType`](/docs/plugins/api/VariableResolvedDataType/).

*   [Variable Alias](#variable-alias)
