# setVariableCodeSyntax | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/Variable-setvariablecodesyntax/
scraped_at: 2025-12-22T03:30:58.881Z
---

On this page

Add or modify a platform definition on [`codeSyntax`](/docs/plugins/api/Variable/#codesyntax). Acceptable platforms are `'WEB'`, `'ANDROID'`, and `'iOS'`.

## Signature[​](#signature "Direct link to Signature")

### [setVariableCodeSyntax](/docs/plugins/api/properties/Variable-setvariablecodesyntax/)(platform: [CodeSyntaxPlatform](/docs/plugins/api/CodeSyntaxPlatform/#code-syntax-platform), value: string): void

## Remarks[​](#remarks "Direct link to Remarks")

Here’s an example of adding code syntax definitions to a variable:

```
 const collection = figma.variables.createVariableCollection(   'Example Collection' ) const variable = figma.variables.createVariable(   'ExampleVariableName',   collection,   'STRING' ) variable.setVariableCodeSyntax('WEB', 'example-variable-name') variable.setVariableCodeSyntax('ANDROID', 'exampleVariableName') variable.setVariableCodeSyntax('iOS', 'exampleVariableName') // Output: // { //   WEB: 'example-variable-name', //   ANDROID: 'exampleVariableName', //   iOS: 'exampleVariableName' // } console.log(variable.codeSyntax)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
