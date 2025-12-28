# figma.teamLibrary | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-teamlibrary/
scraped_at: 2025-12-22T03:30:29.320Z
---

The TeamLibrary API is designed to work with library files and assets enabled for the current file. These libraries must be enabled manually via the UI, see [Manage libraries in design files](https://help.figma.com/hc/en-us/articles/1500008731201-Manage-libraries-in-design-files) for more info.

warning

`teamlibrary` must be specified in the permissions array in `manifest.json` to access this property.

```
{  "permissions": ["teamlibrary"]}
```

If your manifest doesn't contain these fields, the teamLibrary API methods described below will throw errors if you try to use them.

### [getAvailableLibraryVariableCollectionsAsync](/docs/plugins/api/properties/figma-teamlibrary-getavailablelibraryvariablecollectionsasync/)(): Promise<[LibraryVariableCollection](/docs/plugins/api/LibraryVariableCollection/)\[\]>

Returns a descriptor of all [`VariableCollection`](/docs/plugins/api/VariableCollection/)s that exist in the enabled libraries of the current file. Rejects if the request fails.

info

This requires that users enable libraries that contain variables via the UI. Currently it is not possible to enable libraries via the Plugin API.

[View more →](/docs/plugins/api/properties/figma-teamlibrary-getavailablelibraryvariablecollectionsasync/)

* * *

### getVariablesInLibraryCollectionAsync(libraryCollectionKey: string): Promise<[LibraryVariable](/docs/plugins/api/LibraryVariable/)\[\]>

Returns a descriptor of all [`Variable`](/docs/plugins/api/Variable/)s that exist in a given [`LibraryVariableCollection`](/docs/plugins/api/LibraryVariableCollection/). Rejects if the given variable collection does not exist, or if the current user does not have access to that variable collection's library, or if the request fails.

[View more →](/docs/plugins/api/properties/figma-teamlibrary-getvariablesinlibrarycollectionasync/)

* * *
