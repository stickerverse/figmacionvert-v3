# Annotation | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Annotation/
scraped_at: 2025-12-22T03:30:33.405Z
---

On this page

Annotations let you add notes and pin properties to nodes in Dev Mode.

The `annotations` field is supported on the following node types: [ComponentNode](/docs/plugins/api/ComponentNode/), [ComponentSetNode](/docs/plugins/api/ComponentSetNode/), [EllipseNode](/docs/plugins/api/EllipseNode/), [FrameNode](/docs/plugins/api/FrameNode/), [InstanceNode](/docs/plugins/api/InstanceNode/), [LineNode](/docs/plugins/api/LineNode/), [PolygonNode](/docs/plugins/api/PolygonNode/), [RectangleNode](/docs/plugins/api/RectangleNode/), [StarNode](/docs/plugins/api/StarNode/), [TextNode](/docs/plugins/api/TextNode/), [VectorNode](/docs/plugins/api/VectorNode/).

## Annotation properties[​](#annotation-properties "Direct link to Annotation properties")

```
interface Annotation {  readonly label?: string  readonly labelMarkdown?: string  readonly properties?: ReadonlyArray<AnnotationProperty>  readonly categoryId?: string}
```

See [AnnotationProperty](/docs/plugins/api/AnnotationProperty/) for supported properties.

## Annotation node properties[​](#annotation-node-properties "Direct link to Annotation node properties")

### annotations: ReadonlyArray<[Annotation](/docs/plugins/api/Annotation/)\>

Annotations on the node.

Learn more about annotations in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935) or see the [Annotation type](/docs/plugins/api/Annotation/) for usage examples.

* * *

## Example usage[​](#example-usage "Direct link to Example usage")

```
const node = figma.currentPage.selection[0]// Add an annotation notenode.annotations = [{ label: 'Main product navigation' }]// Pin the fill propertynode.annotations = [{ properties: [{ type: 'fills' }] }]// Add an annotation with a note and width property pinnednode.annotations = [  { label: 'Pressing activates animation', properties: [{ type: 'width' }] },]// Add a rich-text annotation label with markdownnode.annotations = [  { labelMarkdown: '# Important \n Pressing activates a *fun* animation' },]// Add multiple annotations with annotation categoriescategories = await figma.annotations.getAnnotationCategoriesAsync()interactionCategory = categories[1]a11yCategory = categories[2]node.annotations = [  {    label: 'Pressing activates animation',    categoryId: interactionCategory.id,  },  {    label: 'Fill in aria-label with i18n string',    categoryId: a11yCategory.id,  },]// Clear an annotationnode.annotations = []
```

*   [Annotation properties](#annotation-properties)
*   [Annotation node properties](#annotation-node-properties)
*   [Example usage](#example-usage)
