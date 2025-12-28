# getVariableById | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-getvariablebyid/
scraped_at: 2025-12-22T03:30:56.610Z
---

On this page

**DEPRECATED:** Use [`getVariableByIdAsync`](/docs/plugins/api/properties/figma-variables-getvariablebyidasync/) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable by ID. If not found or the provided ID is invalid, returns `null`.

## Signature[​](#signature "Direct link to Signature")

### getVariableById(id: string): [Variable](/docs/plugins/api/Variable/) | null

## Parameters[​](#parameters "Direct link to Parameters")

### id[​](#id "Direct link to id")

The variable ID to search for, which represents a unique identifier for the variable.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [id](#id)
