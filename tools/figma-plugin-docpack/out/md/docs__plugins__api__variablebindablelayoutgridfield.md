# VariableBindableLayoutGridField | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/VariableBindableLayoutGridField/
scraped_at: 2025-12-22T03:30:58.052Z
---

```
// if pattern is set to 'ROWS' or 'COLUMNS' then alignment can be 'MIN', 'MAX', 'CENTER', or 'STRETCH'type VariableBindableRowColumnMinMaxLayoutField =  'sectionSize' |  'count' |  'offset' |  'gutterSize'type VariableBindableRowColumnCenterLayoutField =  'sectionSize' |  'count' |  'gutterSize'type VariableBindableRowColumnStretchLayoutField =  'count' |  'offset' |  'gutterSize'// if pattern is set to 'GRID' then a variable can only be bound to 'sectionSize'type VariableBindableGridLayoutField = 'sectionSize'type VariableBindableLayoutGridField =  VariableBindableRowColumnMinMaxLayoutField  | VariableBindableRowColumnCenterLayoutField  | VariableBindableRowColumnStretchLayoutField  | VariableBindableGridLayoutField
```

A list of node fields that can be bound to a [`LayoutGrid`](/docs/plugins/api/LayoutGrid/) according to the combination of [`pattern`](/docs/plugins/api/LayoutGrid/#pattern) and [`alignment`](/docs/plugins/api/LayoutGrid/#alignment).
