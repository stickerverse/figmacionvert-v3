# CodegenPreference | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/CodegenPreference/
scraped_at: 2025-12-22T03:30:34.350Z
---

On this page

```
type CodegenPreference =  | {      itemType: 'unit'      defaultScaleFactor: number      scaledUnit: string      default?: boolean      // The languages that this preference applies to.      // If omitted, will default to all languages.      includedLanguages?: string[]    }  | {      itemType: 'select'      propertyName: string      label: string      options: {        label: string;        value: string;        isDefault?: boolean      }[]      includedLanguages?: string[]    }  | {      itemType: 'action'      propertyName: string      label: string      includedLanguages?: string[]    }
```

Codegen preferences let you define custom commands for your plugin that show up in Figma's UI. These commands can run plugin code, including the ability to open an iframe, and they allow users of the plugin to customize the codegen output.

## "unit" preference[​](#unit-preference "Direct link to \"unit\" preference")

This configures whether the plugin supports a scaled unit (in addition to a pixel unit). This should only be defined once. This option will always appear at the top of the menu.

## "select" preference[​](#select-preference "Direct link to \"select\" preference")

This is useful to provide a simple multiple-choice option for the user. This is useful for something like custom formatting options.

## "action" preference[​](#action-preference "Direct link to \"action\" preference")

This is useful to open an iframe. When a user clicks on this item, the `figma.codegen.on('preferenceschange')` callback will get called.

*   ["unit" preference](#unit-preference)
*   ["select" preference](#select-preference)
*   ["action" preference](#action-preference)
