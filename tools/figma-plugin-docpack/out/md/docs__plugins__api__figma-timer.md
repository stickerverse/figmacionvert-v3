# figma.timer | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-timer/
scraped_at: 2025-12-22T03:30:28.641Z
---

info

This API is only available in FigJam

These are methods and properties available on the `figma.timer` global object. It represents the built-in timer that is available in FigJam. If the plugin is not running in a FigJam document, this object will not be available.

### remaining: number \[readonly\]

Time remaining on timer, in seconds. If the timer has not been started, returns 0.

* * *

### total: number \[readonly\]

Total time on timer, in seconds. If the timer has not been started, returns 0. The total time is defined as the time the timer was initially started at, plus or minus any time that may have been added or removed from the timer.

* * *

### state: 'STOPPED' | 'PAUSED' | 'RUNNING' \[readonly\]

The current state of the timer. If the timer is started and not paused, the state will be `"RUNNING"`. If the timer is not started or finished, the state is `"STOPPED"`. And if the timer is started but paused, the state is `"PAUSED"`.

* * *

### pause: () => void

Pause the timer. If the timer has not been started, does nothing.

* * *

### resume: () => void

Resume the timer. If the timer is not currently started and paused, does nothing.

* * *

### start: (seconds: number) => void

Start the timer with `seconds` seconds remaining. If the timer is not currently started, will start the timer with this total time. If the timer is currently started, will set the remaining time to this value, and increment or decrement the timer's total time based on how much time was added or removed from the remaining time. If the timer was previously paused, will also unpause the timer.

* * *

### stop: () => void

Stops the timer. If the timer was not started or is finished, does nothing.

* * *
