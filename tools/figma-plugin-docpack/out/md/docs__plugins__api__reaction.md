# Reaction | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Reaction/
scraped_at: 2025-12-22T03:30:38.637Z
---

```
type Reaction = { action?: Action, actions?: Action[], trigger: Trigger | null }
```

A prototyping `Reaction` describes interactivity in prototypes. It contains a list of [`Action`](/docs/plugins/api/Action/) objects ("what happens?") and a [`Trigger`](/docs/plugins/api/Trigger/) ("how do you make it happen?").

> Note: The `action` field is now deprecated and replaced by the `actions` field in order to allow for multiple `Actions` on a `Reaction`.

info

When setting reactions, each `Reaction` must contain both a `Trigger` and a non-empty list of `Action` objects.
