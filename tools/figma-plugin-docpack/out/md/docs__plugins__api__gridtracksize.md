# GridTrackSize | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/GridTrackSize/
scraped_at: 2025-12-22T03:30:36.367Z
---

On this page

## GridTrackSize[​](#gridtracksize "Direct link to GridTrackSize")

### value?: number

Applicable only on FIXED or FLEX grid tracks. In FIXED tracks, the size of the track in pixels. In FLEX tracks, the fractional unit value (equivalent to the [`fr` unit](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout#the_fr_unit) in CSS) Optional for `FLEX` tracks.

* * *

### type: 'FLEX' | 'FIXED' | 'HUG'

The type of the grid track. `FLEX` indicates that the track behaves like the CSS grid [`fr` unit](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout#the_fr_unit). `FIXED` indicates that the track will have a fixed pixel size. `HUG` indicates that the track will size to fit its content, equivalent to a CSS setting of `fit-content(100%)`. It is not a valid state for 'FLEX' tracks to be set on a grid when the container is set to layoutSizingHorizonal/layoutSizingVertical 'HUG'

* * *

*   [GridTrackSize](#gridtracksize)
