# commitUndo | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-commitundo/
scraped_at: 2025-12-22T03:30:29.837Z
---

On this page

Commits actions to undo history. This does not trigger an undo.

## Signature[​](#signature "Direct link to Signature")

### [commitUndo](/docs/plugins/api/properties/figma-commitundo/)(): void

## Remarks[​](#remarks "Direct link to Remarks")

By default, plugin actions are not committed to undo history. Call `figma.commitUndo()` so that triggered undos can revert a subset of plugin actions.

For example, after running the following plugin code, the first triggered undo will undo both the rectangle and the ellipse:

```
figma.createRectangle();figma.createEllipse();figma.closePlugin();
```

Whereas if we call `commitUndo()` in our plugin, the first triggered undo will only undo the ellipse:

```
figma.createRectangle();figma.commitUndo();figma.createEllipse();figma.closePlugin();
```

*   [Signature](#signature)
*   [Remarks](#remarks)
