# Trigger | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Trigger/
scraped_at: 2025-12-22T03:30:40.471Z
---

```
type Trigger =  { readonly type: "ON_CLICK" | "ON_HOVER" | "ON_PRESS" | "ON_DRAG", "ON_MEDIA_END" } |  { readonly type: "AFTER_TIMEOUT", readonly timeout: number } |  { readonly type: "MOUSE_UP" | "MOUSE_DOWN",    readonly delay: number,  } |  { readonly type: "MOUSE_ENTER" | "MOUSE_LEAVE"    readonly delay: number,    readonly deprecatedVersion: boolean  } |  { readonly type: "ON_KEY_DOWN",    readonly device: "KEYBOARD" | "XBOX_ONE" | "PS4" | "SWITCH_PRO" | "UNKNOWN_CONTROLLER",    readonly keyCodes: ReadonlyArray<number>,  } |  { readonly type: "ON_MEDIA_HIT",    readonly mediaHitTime: number  }
```

A prototyping `Trigger` describes the user input needed to cause an interaction to happen.

The `"ON_HOVER"` and `"ON_PRESS"` trigger types revert the navigation when the trigger is finished. On the other hand, `"MOUSE_ENTER"`, `"MOUSE_LEAVE"`, `"MOUSE_UP"` and `"MOUSE_DOWN"` are permanent, one-way navigation.

The `delay` parameter requires the trigger to be held for a certain duration of time before the action occurs.

Both `timeout` and `delay` are stored in milliseconds.

The `"ON_MEDIA_HIT"` and `"ON_MEDIA_END"` trigger types can only trigger from a video. They fire when a video reaches a certain time or ends. The `timestamp` parameter is stored in seconds.
