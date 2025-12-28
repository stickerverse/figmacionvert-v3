# figma.annotations | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-annotations/
scraped_at: 2025-12-22T03:30:29.312Z
---

These are all defined on `figma.annotations`.

### getAnnotationCategoriesAsync(): Promise<[AnnotationCategory](/docs/plugins/api/AnnotationCategory/)\[\]>

Returns a list of all [`AnnotationCategory`](/docs/plugins/api/AnnotationCategory/)s that exist in the current file.

* * *

### getAnnotationCategoryByIdAsync(id: string): Promise<[AnnotationCategory](/docs/plugins/api/AnnotationCategory/) | null>

Returns an [`AnnotationCategory`](/docs/plugins/api/AnnotationCategory/) by its ID. If not found, returns a promise containing null.

[View more →](/docs/plugins/api/properties/figma-annotations-getannotationcategorybyidasync/)

* * *

### addAnnotationCategoryAsync(categoryInput: { label: string; color: [AnnotationCategoryColor](/docs/plugins/api/AnnotationCategoryColor/) }): Promise<[AnnotationCategory](/docs/plugins/api/AnnotationCategory/)\>

Adds a new [`AnnotationCategory`](/docs/plugins/api/AnnotationCategory/).

[View more →](/docs/plugins/api/properties/figma-annotations-addannotationcategoryasync/)

* * *
