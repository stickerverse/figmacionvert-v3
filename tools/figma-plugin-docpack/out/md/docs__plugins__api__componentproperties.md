# ComponentProperties | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/ComponentProperties/
scraped_at: 2025-12-22T03:30:35.165Z
---

```
type ComponentProperties = {  [propertyName: string]: {    type: ComponentPropertyType    value: string | boolean    preferredValues?: InstanceSwapPreferredValue[]    readonly boundVariables?: {      [field in VariableBindableComponentPropertyField]?: VariableAlias    }  }}type VariableBindableComponentPropertyField = "value"
```

A map of component properties that exist on an instance node. Each property in the map must have a type matching [`ComponentPropertyType`](/docs/plugins/api/ComponentPropertyType/). A component property can optionally be bound to a [`Variable`](/docs/plugins/api/Variable/), in which case the `boundVariables` structure will be populated with a [`VariableAlias`](/docs/plugins/api/VariableAlias/) describing the variable controlling this property.
