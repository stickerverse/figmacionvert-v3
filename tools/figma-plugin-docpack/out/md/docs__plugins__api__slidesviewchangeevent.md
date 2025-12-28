# SlidesViewChangeEvent | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/SlidesViewChangeEvent/
scraped_at: 2025-12-22T03:30:38.957Z
---

This event is triggered when the user toggles between grid view and single slide view in Figma Slides.

```
interface SlidesViewChangeEvent {  view: 'GRID' | 'SINGLE_SLIDE'}
```

To read the current view, use the [`figma.viewport.slidesView`](/docs/plugins/api/properties/figma-viewport-slidesview/) property.
