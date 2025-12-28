# createVariable | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-createvariable/
scraped_at: 2025-12-22T03:30:56.904Z
---

On this page

Creates a variable with a given name and resolved type inside a collection.

## Signature[​](#signature "Direct link to Signature")

### createVariable(name: string, collection: [VariableCollection](/docs/plugins/api/VariableCollection/), resolvedType: [VariableResolvedDataType](/docs/plugins/api/VariableResolvedDataType/)): [Variable](/docs/plugins/api/Variable/)

## Parameters[​](#parameters "Direct link to Parameters")

### name[​](#name "Direct link to name")

The name of the newly created variable

### collection[​](#collection "Direct link to collection")

A variable collection. Make sure to pass a collection object here; passing a collection ID is deprecated.

### resolvedType[​](#resolvedtype "Direct link to resolvedType")

The resolved type of this variable

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [name](#name)
    *   [collection](#collection)
    *   [resolvedType](#resolvedtype)
