# getVariablesInLibraryCollectionAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-teamlibrary-getvariablesinlibrarycollectionasync/
scraped_at: 2025-12-22T03:30:58.047Z
---

On this page

Returns a descriptor of all [`Variable`](/docs/plugins/api/Variable/)s that exist in a given [`LibraryVariableCollection`](/docs/plugins/api/LibraryVariableCollection/). Rejects if the given variable collection does not exist, or if the current user does not have access to that variable collection's library, or if the request fails.

## Signature[​](#signature "Direct link to Signature")

### getVariablesInLibraryCollectionAsync(libraryCollectionKey: string): Promise<[LibraryVariable](/docs/plugins/api/LibraryVariable/)\[\]>

## Parameters[​](#parameters "Direct link to Parameters")

### libraryCollectionKey[​](#librarycollectionkey "Direct link to libraryCollectionKey")

the key of the library variable collection that contains the returned library variables.

## Example usage[​](#example-usage "Direct link to Example usage")

Example usage of getVariablesInLibraryCollectionAsync

```
// Query all published collections from libraries enabled for this fileconst libraryCollections =    await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()// Select a library variable collection to import into this fileconst variablesInFirstLibrary =    await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libraryCollections[0].key)// Import the first number variable we find in that collectionconst variableToImport =    variablesInFirstLibrary.find((libVar) => libVar.resolvedType === 'FLOAT')const importedVariable =    await figma.variables.importVariableByKeyAsync(variableToImport.key)
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [libraryCollectionKey](#librarycollectionkey)
*   [Example usage](#example-usage)
