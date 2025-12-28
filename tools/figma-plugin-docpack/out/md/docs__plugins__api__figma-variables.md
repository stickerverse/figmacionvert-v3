# figma.variables | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-variables/
scraped_at: 2025-12-22T03:30:29.308Z
---

These are all defined on `figma.variables`. Please see the [Working with Variables](/docs/plugins/working-with-variables/) guide for how to use these functions to interact with variables in Figma.

### getVariableByIdAsync(id: string): Promise<[Variable](/docs/plugins/api/Variable/) | null>

Finds a variable by ID. If not found or the provided ID is invalid, returns a promise containing `null`.

[View more →](/docs/plugins/api/properties/figma-variables-getvariablebyidasync/)

* * *

### getVariableById(id: string): [Variable](/docs/plugins/api/Variable/) | null

**DEPRECATED:** Use [`getVariableByIdAsync`](/docs/plugins/api/properties/figma-variables-getvariablebyidasync/) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable by ID. If not found or the provided ID is invalid, returns `null`.

[View more →](/docs/plugins/api/properties/figma-variables-getvariablebyid/)

* * *

### getVariableCollectionByIdAsync(id: string): Promise<[VariableCollection](/docs/plugins/api/VariableCollection/) | null>

Finds a variable collection by ID. If not found or the provided ID is invalid, returns a promise containing `null`.

[View more →](/docs/plugins/api/properties/figma-variables-getvariablecollectionbyidasync/)

* * *

### getVariableCollectionById(id: string): [VariableCollection](/docs/plugins/api/VariableCollection/) | null

**DEPRECATED:** Use [`getVariableCollectionByIdAsync`](/docs/plugins/api/properties/figma-variables-getvariablecollectionbyidasync/) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable collection by ID. If not found or the provided ID is invalid, returns `null`.

[View more →](/docs/plugins/api/properties/figma-variables-getvariablecollectionbyid/)

* * *

### getLocalVariablesAsync(type?: [VariableResolvedDataType](/docs/plugins/api/VariableResolvedDataType/)): Promise<[Variable](/docs/plugins/api/Variable/)\[\]>

Returns all local variables in the current file, optionally filtering by resolved type.

[View more →](/docs/plugins/api/properties/figma-variables-getlocalvariablesasync/)

* * *

### getLocalVariables(type?: [VariableResolvedDataType](/docs/plugins/api/VariableResolvedDataType/)): [Variable](/docs/plugins/api/Variable/)\[\]

**DEPRECATED:** Use [`getLocalVariablesAsync`](/docs/plugins/api/properties/figma-variables-getlocalvariablesasync/) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns all local variables in the current file, optionally filtering by resolved type.

[View more →](/docs/plugins/api/properties/figma-variables-getlocalvariables/)

* * *

### getLocalVariableCollectionsAsync(): Promise<[VariableCollection](/docs/plugins/api/VariableCollection/)\[\]>

Returns all local variable collections in the current file.

* * *

### getLocalVariableCollections(): [VariableCollection](/docs/plugins/api/VariableCollection/)\[\]

**DEPRECATED:** Use [`getLocalVariableCollectionsAsync`](/docs/plugins/api/figma-variables/#getlocalvariablecollectionsasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns all local variable collections in the current file.

* * *

### createVariable(name: string, collection: [VariableCollection](/docs/plugins/api/VariableCollection/), resolvedType: [VariableResolvedDataType](/docs/plugins/api/VariableResolvedDataType/)): [Variable](/docs/plugins/api/Variable/)

Creates a variable with a given name and resolved type inside a collection.

[View more →](/docs/plugins/api/properties/figma-variables-createvariable/)

* * *

### createVariableCollection(name: string): [VariableCollection](/docs/plugins/api/VariableCollection/)

Creates a new variable collection with the given name.

[View more →](/docs/plugins/api/properties/figma-variables-createvariablecollection/)

* * *

### extendLibraryCollectionByKeyAsync(collectionKey: string, name: string): Promise<[ExtendedVariableCollection](/docs/plugins/api/ExtendedVariableCollection/)\>

Creates a new extended variable collection from a library or local variable collection with the given name.

[View more →](/docs/plugins/api/properties/figma-variables-extendlibrarycollectionbykeyasync/)

* * *

### createVariableAlias(variable: [Variable](/docs/plugins/api/Variable/)): [VariableAlias](/docs/plugins/api/VariableAlias/)

Helper function to create a variable alias.

This should be used with functions such as `node.setProperties()` to assign component properties to variables.

* * *

### createVariableAliasByIdAsync(variableId: string): Promise<[VariableAlias](/docs/plugins/api/VariableAlias/)\>

Helper function to create a variable alias.

This should be used with functions such as `node.setProperties()` to assign component properties to variables.

* * *

### setBoundVariableForPaint(paint: [SolidPaint](/docs/plugins/api/Paint/#solid-paint), field: [VariableBindablePaintField](/docs/plugins/api/VariableBindablePaintField/), variable: [Variable](/docs/plugins/api/Variable/) | null): [SolidPaint](/docs/plugins/api/Paint/#solid-paint)

Helper function to bind a variable to a [`SolidPaint`](/docs/plugins/api/Paint/).

If `null` is provided as the `variable`, the given `field` will be unbound from any variables.

* * *

### setBoundVariableForEffect(effect: [Effect](/docs/plugins/api/Effect/), field: [VariableBindableEffectField](/docs/plugins/api/VariableBindableEffectField/), variable: [Variable](/docs/plugins/api/Variable/) | null): [Effect](/docs/plugins/api/Effect/)

Helper function to bind a variable to an [`Effect`](/docs/plugins/api/Effect/).

If `null` is provided as the `variable`, the given `field` will be unbound from any variables.

* * *

### setBoundVariableForLayoutGrid(layoutGrid: [LayoutGrid](/docs/plugins/api/LayoutGrid/), field: [VariableBindableLayoutGridField](/docs/plugins/api/VariableBindableLayoutGridField/), variable: [Variable](/docs/plugins/api/Variable/) | null): [LayoutGrid](/docs/plugins/api/LayoutGrid/)

Helper function to bind a variable to a [`LayoutGrid`](/docs/plugins/api/LayoutGrid/).

If `null` is provided as the `variable`, the given `field` will be unbound from any variables.

* * *

### importVariableByKeyAsync(key: string): Promise<[Variable](/docs/plugins/api/Variable/)\>

Loads a variable from the team library. Promise is rejected if there is no published variable with that key or if the request fails.

[View more →](/docs/plugins/api/properties/figma-variables-importvariablebykeyasync/)

* * *
