# ComponentPropertyDefinitions | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/ComponentPropertyDefinitions/
scraped_at: 2025-12-22T03:30:35.172Z
---

```
type ComponentPropertyDefinitions = {  [propertyName: string]: {    type: ComponentPropertyType    defaultValue: string | boolean    variantOptions?: string[]    preferredValues?: InstanceSwapPreferredValue[]    readonly boundVariables?: {      [field in VariableBindableComponentPropertyDefinitionField]?: VariableAlias    }  }}type VariableBindableComponentPropertyDefinitionField = "defaultValue"
```

A map of component property definitions that exist on a component or component set node. Each definition in the map must have a type matching [`ComponentPropertyType`](/docs/plugins/api/ComponentPropertyType/). `defaultValue` represents the value that instances will initially have for that property. `'VARIANT'` properties also have `variantOptions`, a list of possible values for that variant property. `'INSTANCE_SWAP'` properties may optionally have a list of [`InstanceSwapPreferredValue`](/docs/plugins/api/InstanceSwapPreferredValue/)s. A component property can optionally be bound to a [`Variable`](/docs/plugins/api/Variable/), in which case the `boundVariables` structure will be populated with a [`VariableAlias`](/docs/plugins/api/VariableAlias/) describing the variable controlling this property.
