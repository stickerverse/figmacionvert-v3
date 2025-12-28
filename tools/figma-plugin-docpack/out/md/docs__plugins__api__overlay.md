# Overlay | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Overlay/
scraped_at: 2025-12-22T03:30:38.171Z
---

```
type OverlayBackground =  { readonly type: "NONE" } |  { readonly type: "SOLID_COLOR", readonly color: RGBA }
```

An overlay either has no background or a single colored background (usually transparent).

```
type OverlayPositionType = "CENTER" | "TOP_LEFT" | "TOP_CENTER" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_CENTER" | "BOTTOM_RIGHT" | "MANUAL"
```

Describes where the overlay is located with respect to the device screen. The exception is `"MANUAL"`, which is relative to the element that triggered the overlay.

```
type OverlayBackgroundInteraction = "NONE" | "CLOSE_ON_CLICK_OUTSIDE"
```
