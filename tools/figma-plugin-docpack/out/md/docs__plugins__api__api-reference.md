# API Reference | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/api-reference/
scraped_at: 2025-12-22T03:30:23.174Z
---

On this page

The API reference includes the resources and materials to navigate the Plugin API. You can explore the Plugin API using any of the entry points in the sidebar.

If you’re new to Figma or plugins, we’ve outlined some of the key resources involved below. Make sure to read through our development guides for tips and best practices!

## Global objects and variables[​](#global-objects-and-variables "Direct link to Global objects and variables")

You can access most of the Plugin API through the [`figma`](/docs/plugins/api/figma/) global object and its sub-objects. You’ll find properties and functions that allow you to view, create, and update the contents of files.

There are also global variables available across the Plugin API: [`__html__`](/docs/plugins/api/global-objects/#html) and [`__uiFiles__`](/docs/plugins/api/global-objects/#uifiles). You can use these variable to access the contents of your ui files.

[**Explore global objects and variables →**](/docs/plugins/api/global-objects/)

## Node types[​](#node-types "Direct link to Node types")

In Figma, nodes are the way we represent the contents of a file. Every layer in a Figma design or FigJam file corresponds to a node.

Each node supports a range of properties. Some properties are universal, some are shared between nodes and some are unique to specific node types.

Select a [**Node type**](/docs/plugins/api/nodes/) to see which properties are supported on that node.

## Node properties[​](#node-properties "Direct link to Node properties")

Some node properties are supported across node types. You can use the [Shared Node Properties](/docs/plugins/api/node-properties/) section to explore these shared properties. We show which node types a property is supported on.

## Data types[​](#data-types "Direct link to Data types")

To assist you with writing your plugin code, we provide a TypeScript [typings file](/docs/plugins/api/typings/) for the entire Plugin API. The typings file is a collection of type and interface declarations you can use for type checking.

These declarations represent groups of related properties, parameters, and other data you’ll interact with in Figma. You’ll see types and interfaces in a few places in the API reference.

*   To get and set properties on nodes or global objects
*   Passed as parameters in a function
*   Returned by a method

You can access types and interfaces from any properties and methods that use them. Or, you can explore types and interfaces in the [Data Types](/docs/plugins/api/data-types/) section of the sidebar.

## Other resources[​](#other-resources "Direct link to Other resources")

### Plugin manifest[​](#plugin-manifest "Direct link to Plugin manifest")

Every plugin must define a `manifest.json` file that describes the plugin. Figma creates a simple manifest when you register a plugin for development.

You can extend this manifest to take advantage of optional functionality. For example: accept plugin parameters, or create private plugins in an organization.

**[View plugin manifest properties →](/docs/plugins/manifest/)**

### Typings file[​](#typings-file "Direct link to Typings file")

The API reference and documentation explain the structure of the the API and how it works. This is great when exploring the API or understanding supported features and functions.

We provide a [typings file](/docs/plugins/api/typings/) with type annotations for the entire Plugin API. When used with an editor, like [VSCode](https://code.visualstudio.com/), this provides you with suggestions as you code. This helps to reduce errors and catch edge cases.

We also provide a set of [typescript-eslint rules](https://github.com/figma/eslint-plugin-figma-plugins?tab=readme-ov-file#eslint-plugin-figma-plugins) that ensure you're correctly using the Plugin API. The GitHub repository includes detailed instructions for installing and using the rules to test your plugin code.

You don’t have to use TypeScript when developing plugins, but we strongly recommend you do! The API reference and all associated guides use it.

**[Set up TypeScript →](/docs/plugins/typescript/)**

tip

💡 We update the typings file any time we make changes to the API. To get the latest typings, run `npm install --save-dev @figma/plugin-typings`.

*   [Global objects and variables](#global-objects-and-variables)
*   [Node types](#node-types)
*   [Node properties](#node-properties)
*   [Data types](#data-types)
*   [Other resources](#other-resources)
    *   [Plugin manifest](#plugin-manifest)
    *   [Typings file](#typings-file)
