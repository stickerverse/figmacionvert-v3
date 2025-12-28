# notify | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-notify/
scraped_at: 2025-12-22T03:30:29.616Z
---

On this page

Shows a notification on the bottom of the screen.

## Signature[​](#signature "Direct link to Signature")

### [notify](/docs/plugins/api/properties/figma-notify/)(message: string, options?: [NotificationOptions](/docs/plugins/api/properties/figma-notify/#notification-options)): [NotificationHandler](/docs/plugins/api/properties/figma-notify/#notification-handler)

## Parameters[​](#parameters "Direct link to Parameters")

### message[​](#message "Direct link to message")

The message to show. It is limited to 100 characters. Longer messages will be truncated.

### options[​](#options "Direct link to options")

An optional argument with the following optional parameters:

```
interface NotificationOptions {  timeout?: number;  error?: boolean;  onDequeue?: (reason: NotifyDequeueReason) => void  button?: {    text: string    action: () => boolean | void  }}
```

*   `timeout`: How long the notification stays up in milliseconds before closing. Defaults to 3 seconds when not specified. Set the timeout to `Infinity` to make the notification show indefinitely until the plugin is closed.
*   `error`: If true, display the notification as an error message, with a different color.
*   `onDequeue`: A function that will run when the notification is dequeued. This can happen due to the timeout being reached, the notification being dismissed by the user or Figma, or the user clicking the notification's `button`.
    *   The function is passed a `NotifyDequeueReason`, which is defined as the following:

```
 type NotifyDequeueReason = 'timeout' | 'dismiss' | 'action_button_click'
```

*   `button`: An object representing an action button that will be added to the notification.
    *   `text`: The message to display on the action button.
    *   `action`: The function to execute when the user clicks the button. If this function returns `false`, the message will remain when the button is clicked. Otherwise, clicking the action button dismisses the notify message.

## Remarks[​](#remarks "Direct link to Remarks")

The `notify` API is a convenient way to show a message to the user. These messages can be queued.

If the message includes a custom action button, it will be closed automatically when the plugin closes.

Calling `figma.notify` returns a `NotificationHandler` object. This object contains a single `handler.cancel()` method that can be used to remove the notification before it times out by itself. This is useful if the notification becomes no longer relevant.

```
interface NotificationHandler {  cancel: () => void}
```

An alternative way to show a message to the user is to pass a message to the [`figma.closePlugin`](/docs/plugins/api/properties/figma-closeplugin/) function.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [message](#message)
    *   [options](#options)
*   [Remarks](#remarks)
