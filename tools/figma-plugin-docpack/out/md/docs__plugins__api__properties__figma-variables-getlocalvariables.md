# getLocalVariables | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-getlocalvariables/
scraped_at: 2025-12-22T03:30:56.897Z
---

On this page

**DEPRECATED:** Use [`getLocalVariablesAsync`](/docs/plugins/api/properties/figma-variables-getlocalvariablesasync/) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns all local variables in the current file, optionally filtering by resolved type.

## Signature[​](#signature "Direct link to Signature")

### getLocalVariables(type?: [VariableResolvedDataType](/docs/plugins/api/VariableResolvedDataType/)): [Variable](/docs/plugins/api/Variable/)\[\]

## Parameters[​](#parameters "Direct link to Parameters")

### type[​](#type "Direct link to type")

Filters the returned variables to only be of the given resolved type.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [type](#type)
