# getVariableCollectionById | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-getvariablecollectionbyid/
scraped_at: 2025-12-22T03:30:56.656Z
---

On this page

**DEPRECATED:** Use [`getVariableCollectionByIdAsync`](/docs/plugins/api/properties/figma-variables-getvariablecollectionbyidasync/) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable collection by ID. If not found or the provided ID is invalid, returns `null`.

## Signature[​](#signature "Direct link to Signature")

### getVariableCollectionById(id: string): [VariableCollection](/docs/plugins/api/VariableCollection/) | null

## Parameters[​](#parameters "Direct link to Parameters")

### id[​](#id "Direct link to id")

The variable collection ID to search for, which represents a unique identifier for the variable collection.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [id](#id)
