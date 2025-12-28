# setBoundVariable | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TextStyle-setboundvariable/
scraped_at: 2025-12-22T03:30:59.180Z
---

On this page

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

## Signature[​](#signature "Direct link to Signature")

### setBoundVariable(field: [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/), variable: [Variable](/docs/plugins/api/Variable/) | null): void

## Parameters[​](#parameters "Direct link to Parameters")

### field[​](#field "Direct link to field")

The field to bind the variable to.

### variable[​](#variable "Direct link to variable")

The variable to bind to the field. If `null` is provided, the field will be unbound from any variables. Make sure to pass a Variable object or null; passing a variable ID is not supported.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [field](#field)
    *   [variable](#variable)
