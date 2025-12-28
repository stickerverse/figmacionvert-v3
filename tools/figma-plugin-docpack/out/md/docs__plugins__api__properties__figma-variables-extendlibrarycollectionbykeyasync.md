# extendLibraryCollectionByKeyAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-extendlibrarycollectionbykeyasync/
scraped_at: 2025-12-22T03:30:57.465Z
---

On this page

Creates a new extended variable collection from a library or local variable collection with the given name.

## Signature[​](#signature "Direct link to Signature")

### extendLibraryCollectionByKeyAsync(collectionKey: string, name: string): Promise<[ExtendedVariableCollection](/docs/plugins/api/ExtendedVariableCollection/)\>

## Parameters[​](#parameters "Direct link to Parameters")

### collectionKey[​](#collectionkey "Direct link to collectionKey")

The key of the library or local variable collection to extend.

### name[​](#name "Direct link to name")

The name of the newly created variable collection.

info

This API is limited to the Enterprise plan. If limited by the current pricing tier, this method will throw an error with the message `in extend: Cannot create extended collections outside of enterprise plan.`

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [collectionKey](#collectionkey)
    *   [name](#name)
