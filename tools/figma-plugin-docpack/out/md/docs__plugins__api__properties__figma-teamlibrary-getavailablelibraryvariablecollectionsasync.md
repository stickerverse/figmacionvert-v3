# getAvailableLibraryVariableCollectionsAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-teamlibrary-getavailablelibraryvariablecollectionsasync/
scraped_at: 2025-12-22T03:30:58.292Z
---

On this page

Returns a descriptor of all [`VariableCollection`](/docs/plugins/api/VariableCollection/)s that exist in the enabled libraries of the current file. Rejects if the request fails.

info

This requires that users enable libraries that contain variables via the UI. Currently it is not possible to enable libraries via the Plugin API.

## Signature[​](#signature "Direct link to Signature")

### [getAvailableLibraryVariableCollectionsAsync](/docs/plugins/api/properties/figma-teamlibrary-getavailablelibraryvariablecollectionsasync/)(): Promise<[LibraryVariableCollection](/docs/plugins/api/LibraryVariableCollection/)\[\]>

## Remarks[​](#remarks "Direct link to Remarks")

This is intended to be used in conjunction with [`getVariablesInLibraryCollectionAsync`](/docs/plugins/api/properties/figma-teamlibrary-getvariablesinlibrarycollectionasync/)

*   [Signature](#signature)
*   [Remarks](#remarks)
