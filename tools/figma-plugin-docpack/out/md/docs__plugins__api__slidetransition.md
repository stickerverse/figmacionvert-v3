# SlideTransition | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/SlideTransition/
scraped_at: 2025-12-22T03:30:38.892Z
---

On this page

A `SlideTransition` is a transition, or animation, that is played when navigating between slides in a Figma Slides presentation.

To read the current slide transition:

```
const slideTransition = slideNode.getSlideTransition()
```

To set the slide transition:

```
slideNode.setSlideTransition(slideTransition)
```

If you use the trigger type ON\_CLICK, the delay parameter will be ignored and set to 0.

To clear a slide transition, you can set its transition type to NONE:

```
slideNode.setSlideTransition({  style: 'NONE',  duration: 0.3,  curve: 'EASE_IN',  timing: {    type: 'ON_CLICK'  }  })
```

If you want to update the slide transition for every slide in the grid, like the button in UI that says “Apply to all slides”, you can loop through each slide in the grid.

```
figma.getSlideGrid().flat().forEach(slide => slide.setSlideTransition(transition))
```

## Slide Transition properties[​](#slide-transition-properties "Direct link to Slide Transition properties")

### style: 'NONE' | 'DISSOLVE' | 'SLIDE\_FROM\_LEFT' | 'SLIDE\_FROM\_RIGHT' | 'SLIDE\_FROM\_BOTTOM' | 'SLIDE\_FROM\_TOP' | 'PUSH\_FROM\_LEFT' | 'PUSH\_FROM\_RIGHT' | 'PUSH\_FROM\_BOTTOM' | 'PUSH\_FROM\_TOP' | 'MOVE\_FROM\_LEFT' | 'MOVE\_FROM\_RIGHT' | 'MOVE\_FROM\_TOP' | 'MOVE\_FROM\_BOTTOM' | 'SLIDE\_OUT\_TO\_LEFT' | 'SLIDE\_OUT\_TO\_RIGHT' | 'SLIDE\_OUT\_TO\_TOP' | 'SLIDE\_OUT\_TO\_BOTTOM' | 'MOVE\_OUT\_TO\_LEFT' | 'MOVE\_OUT\_TO\_RIGHT' | 'MOVE\_OUT\_TO\_TOP' | 'MOVE\_OUT\_TO\_BOTTOM' | 'SMART\_ANIMATE' \[readonly\]

The type of slide transition.

* * *

### duration: number \[readonly\]

The duration of the slide transition, in seconds.

* * *

### curve: 'EASE\_IN' | 'EASE\_OUT' | 'EASE\_IN\_AND\_OUT' | 'LINEAR' | 'GENTLE' | 'QUICK' | 'BOUNCY' | 'SLOW' \[readonly\]

The easing of the slide transition.

* * *

### timing: { type: 'ON\_CLICK' | 'AFTER\_DELAY'; delay: number } \[readonly\]

The timing of the slide transition.

* * *

*   [Slide Transition properties](#slide-transition-properties)
