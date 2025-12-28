# Data Types | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/data-types/
scraped_at: 2025-12-22T03:30:23.826Z
---

To assist you with writing your plugin code, we provide a TypeScript typings file for the entire Plugin API.

The typings file is a collection of type and interface declarations you can use for type checking. These declarations represent groups of related properties, parameters, and other data sets you’ll interact with.

You’ll see **types** and **interfaces** in a few places:

*   To get and set properties on nodes or global objects
*   Passed as parameters in a function
*   Returned by a method

Types and interfaces come in varying levels of complexity.

*   Choose one option from a list of values, like [`BlendMode`](/docs/plugins/api/BlendMode/).
*   Support a mixture of required and optional properties. You’ll see a “?” at the end of any optional properties.
*   Offer different properties based on the outcome you want to achieve, like [`ConnectorEndpoint`](/docs/plugins/api/ConnectorEndpoint/).
*   Support or reference other types and interfaces, like [`Paint`](/docs/plugins/api/Paint/) and [`Effect`](/docs/plugins/api/Effect/).
