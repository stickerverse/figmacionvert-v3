# StyleChange | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/StyleChange/
scraped_at: 2025-12-22T03:30:39.189Z
---

On this page

Figma has 3 types of document style changes that we currently notify on.

```
type StyleChange =  | StyleCreateChange  | StyleDeleteChange  | StylePropertyChange
```

## StyleChange (common properties)[​](#stylechange-common-properties "Direct link to StyleChange (common properties)")

### style: [BaseStyle](/docs/plugins/api/BaseStyle/) | null

The style that has been updated in the document. This is null for StyleDeleteChange.

* * *

## StyleCreateChange[​](#stylecreatechange "Direct link to StyleCreateChange")

Emitted when a style has been added to the document.

### type: 'STYLE\_CREATE'

The string literal "STYLE\_CREATE" representing the type of document change this is. Always check the type before reading other properties.

* * *

### style: [BaseStyle](/docs/plugins/api/BaseStyle/) | null

The style that has been updated in the document. This is null for StyleDeleteChange.

* * *

## StyleDeleteChange[​](#styledeletechange "Direct link to StyleDeleteChange")

Emitted when a style has been removed from the document.

### type: 'STYLE\_DELETE'

The string literal "STYLE\_DELETE" representing the type of document change this is. Always check the type before reading other properties. In this case, the returned style is null.

* * *

### style: [BaseStyle](/docs/plugins/api/BaseStyle/) | null

The style that has been updated in the document. This is null for StyleDeleteChange.

* * *

## StylePropertyChange[​](#stylepropertychange "Direct link to StylePropertyChange")

Emitted when a style has had a property changed.

### type: 'STYLE\_PROPERTY\_CHANGE'

The string literal "STYLE\_PROPERTY\_CHANGE" representing the type of document change this is. Always check the type before reading other properties.

* * *

### properties: [StyleChangeProperty](/docs/plugins/api/StyleChangeProperty/)\[\]

Array of properties that have been changed on the node.

* * *

### style: [BaseStyle](/docs/plugins/api/BaseStyle/) | null

The style that has been updated in the document. This is null for StyleDeleteChange.

* * *

*   [StyleChange (common properties)](#stylechange-common-properties)
*   [StyleCreateChange](#stylecreatechange)
*   [StyleDeleteChange](#styledeletechange)
*   [StylePropertyChange](#stylepropertychange)
