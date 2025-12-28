# mixed | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-mixed/
scraped_at: 2025-12-22T03:30:30.142Z
---

On this page

This a constant value that some node properties return when they are a mix of multiple values. An example might be font size: a single text node can use multiple different font sizes for different character ranges. For those properties, you should always compare against `figma.mixed`.

## Signature[​](#signature "Direct link to Signature")

### [mixed](/docs/plugins/api/properties/figma-mixed/): unique symbol \[readonly\]

## Remarks[​](#remarks "Direct link to Remarks")

Example:

Check if property is a mix of multiple values

```
if (node.type === 'RECTANGLE') {  if (node.cornerRadius !== figma.mixed) {    console.log(`Single corner radius: ${node.cornerRadius}`)  } else {    console.log(`Mixed corner radius: ${node.topLeftRadius}, ${node.topRightRadius}, ${node.bottomLeftRadius}, ${node.bottomRightRadius}`)  }}
```

info

Your plugin never needs to know what the actual value of `figma.mixed` is, only that it is a unique, constant value that can be compared against. That being said, this value returns an object of type `symbol` which is a more advanced feature of Javascript. [Read more about symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol). It works in TypeScript via the `unique symbol` [subtype](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol).

*   [Signature](#signature)
*   [Remarks](#remarks)
