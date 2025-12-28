# figma | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma/
scraped_at: 2025-12-22T03:30:24.181Z
---

On this page

These are methods and properties available on the `figma` global object.

## General[​](#general "Direct link to General")

### apiVersion: '1.0.0' \[readonly\]

The version of the Figma API this plugin is running on, as defined in your `manifest.json` in the `"api"` field.

* * *

### fileKey: string | undefined \[readonly\]

The file key of the current file this plugin is running on. **Only [private plugins](https://help.figma.com/hc/en-us/articles/4404228629655-Create-private-organization-plugins) and Figma-owned resources (such as the Jira and Asana widgets) have access to this.** To enable this behavior, you need to specify `enablePrivatePluginApi` in your `manifest.json`.

* * *

### command: string \[readonly\]

The currently executing command from the `manifest.json` file. It is the command string in the `ManifestMenuItem` (more details in the [manifest guide](/docs/plugins/manifest/)). If the plugin does not have any menu item, this property is undefined.

* * *

### pluginId?: string \[readonly\]

The value specified in the `manifest.json` "id" field. This only exists for Plugins.

* * *

### widgetId?: string \[readonly\]

Similar to `figma.pluginId` but for widgets. The value specified in the `manifest.json` "id" field. This only exists for Widgets.

* * *

### editorType: 'figma' | 'figjam' | 'dev' | 'slides' | 'buzz' \[readonly\]

The current editor type this plugin is running in. See also [Setting editor type](/docs/plugins/setting-editor-type/).

* * *

### [mode](/docs/plugins/api/properties/figma-mode/): 'default' | 'textreview' | 'inspect' | 'codegen' | 'linkpreview' | 'auth' \[readonly\]

Return the context the plugin is current running in.

*   `default` - The plugin is running as a normal plugin.
*   `textreview` - The plugin is running to provide text review functionality.
*   `inspect` - The plugin is running in the Inspect panel in Dev Mode.
*   `codegen` - The plugin is running in the Code section of the Inspect panel in Dev Mode.
*   `linkpreview` - The plugin is generating a link preview for a [Dev resource](https://help.figma.com/hc/en-us/articles/15023124644247#Add_external_links_and_resources_for_developers) in Dev Mode.
*   `auth` - The plugin is running to authenticate a user in Dev Mode.

caution

The `linkpreview` and `auth` modes are only available to partner and Figma-owned plugins.

[View more →](/docs/plugins/api/properties/figma-mode/)

* * *

### [skipInvisibleInstanceChildren](/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/): boolean

When enabled, causes all node properties and methods to skip over invisible nodes (and their descendants) inside [`instances`](/docs/plugins/api/InstanceNode/). This makes operations like document traversal much faster.

info

Defaults to true in Figma Dev Mode and false in Figma and FigJam

[View more →](/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/)

* * *

### currentPage: [PageNode](/docs/plugins/api/PageNode/)

The page that the user currently viewing. You can set this value to a [`PageNode`](/docs/plugins/api/PageNode/) to switch pages.

*   If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use [`figma.setCurrentPageAsync`](/docs/plugins/api/figma/#setcurrentpageasync) to update the value.

* * *

### setCurrentPageAsync(page: [PageNode](/docs/plugins/api/PageNode/)): Promise<void>

Switch the active page to the specified [`PageNode`](/docs/plugins/api/PageNode/).

* * *

### root: [DocumentNode](/docs/plugins/api/DocumentNode/) \[readonly\]

The root of the entire Figma document. This node is used to access other pages. Each child is a [`PageNode`](/docs/plugins/api/PageNode/).

* * *

### [showUI](/docs/plugins/api/properties/figma-showui/)(html: string, options?: [ShowUIOptions](/docs/plugins/api/properties/figma-showui/#show-uioptions)): void

Enables you to render UI to interact with the user, or simply to access browser APIs. This function creates a modal dialog with an `<iframe>` containing the HTML markup in the `html` argument.

[View more →](/docs/plugins/api/properties/figma-showui/)

* * *

### ui: [UIAPI](/docs/plugins/api/figma-ui/#uiapi) \[readonly\]

This property contains methods used to modify and communicate with the UI created via `figma.showUI(...)`.

Read more in the [UI section](/docs/plugins/api/figma-ui/).

* * *

### util: [UtilAPI](/docs/plugins/api/figma-util/#util-api) \[readonly\]

This property contains convenience functions for common operations.

Read more in the [util section](/docs/plugins/api/figma-util/).

* * *

### constants: [ConstantsAPI](/docs/plugins/api/figma-constants/#constants-api) \[readonly\]

This property contains constants that can be accessed by the plugin API.

Read more in the [constants section](/docs/plugins/api/figma-constants/).

* * *

### timer?: [TimerAPI](/docs/plugins/api/figma-timer/#timer-api) \[readonly\]

info

This API is only available in FigJam

This property contains methods used to read, set, and modify the built in FigJam timer.

Read more in the [timer section](/docs/plugins/api/figma-timer/).

* * *

### viewport: [ViewportAPI](/docs/plugins/api/figma-viewport/#viewport-api) \[readonly\]

This property contains methods used to read and set the viewport, the user-visible area of the current page.

Read more in the [viewport section](/docs/plugins/api/figma-viewport/).

* * *

### clientStorage: [ClientStorageAPI](/docs/plugins/api/figma-clientStorage/#client-storage-api) \[readonly\]

This property contains methods to store persistent data on the user's local machine.

Read more in the [client storage section](/docs/plugins/api/figma-clientStorage/).

* * *

### parameters: [ParametersAPI](/docs/plugins/api/figma-parameters/#parameters-api) \[readonly\]

This property contains methods to handle user inputs when a plugin is launched in query mode. See [Accepting Parameters as Input](/docs/plugins/plugin-parameters/) for more details.

* * *

### payments?: [PaymentsAPI](/docs/plugins/api/figma-payments/#payments-api) \[readonly\]

info

`payments` must be specified in the permissions array in `manifest.json` to access this property.

This property contains methods for plugins that require payment.

* * *

### currentUser: [User](/docs/plugins/api/User/) | null \[readonly\]

info

`currentuser` must be specified in the permissions array in `manifest.json` to access this property.

This property contains details about the current user.

* * *

### activeUsers: [ActiveUser](/docs/plugins/api/ActiveUser/)\[\] \[readonly\]

info

This API is only available in FigJam.

`activeusers` must be specified in the permissions array in `manifest.json` to access this property.

This property contains details about the active users in the file. `figma.activeUsers[0]` will match `figma.currentUser` for the `id`, `name`, `photoUrl`, `color`, and `sessionId` properties.

* * *

### textreview?: [TextReviewAPI](/docs/plugins/api/figma-textreview/#text-review-api) \[readonly\]

info

`textreview` must be specified in the capabilities array in `manifest.json` to access this property.

This property contains methods that enable text review features in your plugin.

* * *

### variables: [VariablesAPI](/docs/plugins/api/figma-variables/#variables-api) \[readonly\]

This property contains methods to work with Variables and Variable Collections within Figma.

* * *

### teamLibrary: [TeamLibraryAPI](/docs/plugins/api/figma-teamlibrary/#team-library-api) \[readonly\]

This property contains methods to work with assets residing in a team library.

* * *

### annotations: [AnnotationsAPI](/docs/plugins/api/figma-annotations/#annotations-api) \[readonly\]

This property contains methods to work with annotations.

* * *

### buzz: [BuzzAPI](/docs/plugins/api/figma-buzz/#buzz-api) \[readonly\]

This API is only available in Buzz.

This property contains methods to work in Buzz.

* * *

### [closePlugin](/docs/plugins/api/properties/figma-closeplugin/)(message?: string): void

Closes the plugin. You should always call this function once your plugin is done running. When called, any UI that's open will be closed and any `setTimeout` or `setInterval` timers will be cancelled.

[View more →](/docs/plugins/api/properties/figma-closeplugin/)

* * *

### [on](/docs/plugins/api/properties/figma-on/)(type: [ArgFreeEventType](/docs/plugins/api/properties/figma-on/#arg-free-event-type), callback: () => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'run', callback: (event: [RunEvent](/docs/plugins/api/RunEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'drop', callback: (event: [DropEvent](/docs/plugins/api/DropEvent/)) => boolean): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'documentchange', callback: (event: [DocumentChangeEvent](/docs/plugins/api/DocumentChangeEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](/docs/plugins/api/SlidesViewChangeEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](/docs/plugins/api/CanvasViewChangeEvent/)) => void): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'textreview', callback: (event: [TextReviewEvent](/docs/plugins/api/TextReviewEvent/)) => Promise<[TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]> | [TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]): void

### [on](/docs/plugins/api/properties/figma-on/)(type: 'stylechange', callback: (event: [StyleChangeEvent](/docs/plugins/api/StyleChangeEvent/)) => void): void

Registers an callback that will be called when an event happens in the editor. Current supported events are:

*   The selection on the current page changed.
*   The current page changed.
*   The document has changed.
*   An object from outside Figma is dropped onto the canvas
*   The plugin has started running.
*   The plugin closed.
*   The plugin has started running.
*   The timer has started running.
*   The timer has paused.
*   The timer has stopped.
*   The timer is done.
*   The timer has resumed.

[View more →](/docs/plugins/api/properties/figma-on/)

* * *

### once(type: [ArgFreeEventType](/docs/plugins/api/properties/figma-on/#arg-free-event-type), callback: () => void): void

### once(type: 'run', callback: (event: [RunEvent](/docs/plugins/api/RunEvent/)) => void): void

### once(type: 'drop', callback: (event: [DropEvent](/docs/plugins/api/DropEvent/)) => boolean): void

### once(type: 'documentchange', callback: (event: [DocumentChangeEvent](/docs/plugins/api/DocumentChangeEvent/)) => void): void

### once(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](/docs/plugins/api/SlidesViewChangeEvent/)) => void): void

### once(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](/docs/plugins/api/CanvasViewChangeEvent/)) => void): void

### once(type: 'textreview', callback: (event: [TextReviewEvent](/docs/plugins/api/TextReviewEvent/)) => Promise<[TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]> | [TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]): void

### once(type: 'stylechange', callback: (event: [StyleChangeEvent](/docs/plugins/api/StyleChangeEvent/)) => void): void

Same as `figma.on`, but the callback will only be called once, the first time the specified event happens.

* * *

### [off](/docs/plugins/api/properties/figma-off/)(type: [ArgFreeEventType](/docs/plugins/api/properties/figma-on/#arg-free-event-type), callback: () => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'run', callback: (event: [RunEvent](/docs/plugins/api/RunEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'drop', callback: (event: [DropEvent](/docs/plugins/api/DropEvent/)) => boolean): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'documentchange', callback: (event: [DocumentChangeEvent](/docs/plugins/api/DocumentChangeEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](/docs/plugins/api/SlidesViewChangeEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](/docs/plugins/api/CanvasViewChangeEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'textreview', callback: (event: [TextReviewEvent](/docs/plugins/api/TextReviewEvent/)) => Promise<[TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]> | [TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'stylechange', callback: (event: [StyleChangeEvent](/docs/plugins/api/StyleChangeEvent/)) => void): void

Removes a callback added with `figma.on` or `figma.once`.

[View more →](/docs/plugins/api/properties/figma-off/)

* * *

### [notify](/docs/plugins/api/properties/figma-notify/)(message: string, options?: [NotificationOptions](/docs/plugins/api/properties/figma-notify/#notification-options)): [NotificationHandler](/docs/plugins/api/properties/figma-notify/#notification-handler)

Shows a notification on the bottom of the screen.

[View more →](/docs/plugins/api/properties/figma-notify/)

* * *

### [commitUndo](/docs/plugins/api/properties/figma-commitundo/)(): void

Commits actions to undo history. This does not trigger an undo.

[View more →](/docs/plugins/api/properties/figma-commitundo/)

* * *

### triggerUndo(): void

Triggers an undo action. Reverts to the last `commitUndo()` state.

* * *

### [saveVersionHistoryAsync](/docs/plugins/api/properties/figma-saveversionhistoryasync/)(title: string, description?: string): Promise<[VersionHistoryResult](/docs/plugins/api/properties/figma-saveversionhistoryasync/#version-history-result)\>

Saves a new version of the file and adds it to the version history of the file. Returns the new version id.

[View more →](/docs/plugins/api/properties/figma-saveversionhistoryasync/)

* * *

### [openExternal](/docs/plugins/api/properties/figma-openexternal/)(url: string): void

Open a url in a new tab.

[View more →](/docs/plugins/api/properties/figma-openexternal/)

* * *

## Nodes[​](#nodes "Direct link to Nodes")

This section contains to get or create new nodes.

### getNodeByIdAsync(id: string): Promise<[BaseNode](/docs/plugins/api/nodes/#base-node) | null>

Finds a node by its id in the current document. Every node has an `id` property, which is unique within the document. If the id is invalid, or the node cannot be found (e.g. removed), returns a promise containing null.

* * *

### getNodeById(id: string): [BaseNode](/docs/plugins/api/nodes/#base-node) | null

**DEPRECATED:** Use [`figma.getNodeByIdAsync`](/docs/plugins/api/figma/#getnodebyidasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a node by its id in the current document. Every node has an `id` property, which is unique within the document. If the id is invalid, or the node cannot be found (e.g. removed), returns null.

* * *

### [createRectangle](/docs/plugins/api/properties/figma-createrectangle/)(): [RectangleNode](/docs/plugins/api/RectangleNode/)

Creates a new rectangle. The behavior is similar to using the `R` shortcut followed by a click.

[View more →](/docs/plugins/api/properties/figma-createrectangle/)

* * *

### [createLine](/docs/plugins/api/properties/figma-createline/)(): [LineNode](/docs/plugins/api/LineNode/)

Creates a new line.

[View more →](/docs/plugins/api/properties/figma-createline/)

* * *

### [createEllipse](/docs/plugins/api/properties/figma-createellipse/)(): [EllipseNode](/docs/plugins/api/EllipseNode/)

Creates a new ellipse. The behavior is similar to using the `O` shortcut followed by a click.

[View more →](/docs/plugins/api/properties/figma-createellipse/)

* * *

### [createPolygon](/docs/plugins/api/properties/figma-createpolygon/)(): [PolygonNode](/docs/plugins/api/PolygonNode/)

Creates a new polygon (defaults to a triangle).

[View more →](/docs/plugins/api/properties/figma-createpolygon/)

* * *

### [createStar](/docs/plugins/api/properties/figma-createstar/)(): [StarNode](/docs/plugins/api/StarNode/)

Creates a new star.

[View more →](/docs/plugins/api/properties/figma-createstar/)

* * *

### [createVector](/docs/plugins/api/properties/figma-createvector/)(): [VectorNode](/docs/plugins/api/VectorNode/)

Creates a new, empty vector network with no vertices.

[View more →](/docs/plugins/api/properties/figma-createvector/)

* * *

### [createText](/docs/plugins/api/properties/figma-createtext/)(): [TextNode](/docs/plugins/api/TextNode/)

Creates a new, empty text node.

[View more →](/docs/plugins/api/properties/figma-createtext/)

* * *

### [createFrame](/docs/plugins/api/properties/figma-createframe/)(): [FrameNode](/docs/plugins/api/FrameNode/)

Creates a new frame. The behavior is similar to using the `F` shortcut followed by a click.

[View more →](/docs/plugins/api/properties/figma-createframe/)

* * *

### [createComponent](/docs/plugins/api/properties/figma-createcomponent/)(): [ComponentNode](/docs/plugins/api/ComponentNode/)

info

This API is only available in Figma Design

Creates a new, empty component.

[View more →](/docs/plugins/api/properties/figma-createcomponent/)

* * *

### [createComponentFromNode](/docs/plugins/api/properties/figma-createcomponentfromnode/)(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [ComponentNode](/docs/plugins/api/ComponentNode/)

info

This API is only available in Figma Design

Creates a component from an existing node, preserving all of its properties and children. The behavior is similar to using the **Create component** button in the toolbar.

[View more →](/docs/plugins/api/properties/figma-createcomponentfromnode/)

* * *

### [createBooleanOperation](/docs/plugins/api/properties/figma-createbooleanoperation/)(): [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)

**DEPRECATED:** Use [`figma.union`](/docs/plugins/api/figma/#union), [`figma.subtract`](/docs/plugins/api/figma/#subtract), [`figma.intersect`](/docs/plugins/api/figma/#intersect), [`figma.exclude`](/docs/plugins/api/figma/#exclude) instead.

[View more →](/docs/plugins/api/properties/figma-createbooleanoperation/)

* * *

### [createPage](/docs/plugins/api/properties/figma-createpage/)(): [PageNode](/docs/plugins/api/PageNode/)

info

This API is only available in Figma Design

Creates a new page, appended to the document's list of children.

[View more →](/docs/plugins/api/properties/figma-createpage/)

* * *

### [createPageDivider](/docs/plugins/api/properties/figma-createpagedivider/)(dividerName?: string): [PageNode](/docs/plugins/api/PageNode/)

Creates a new page divider, appended to the document's list of children. A page divider is a [`PageNode`](/docs/plugins/api/PageNode/) with `isPageDivider` true.

[View more →](/docs/plugins/api/properties/figma-createpagedivider/)

* * *

### [createSlice](/docs/plugins/api/properties/figma-createslice/)(): [SliceNode](/docs/plugins/api/SliceNode/)

Creates a new slice object.

[View more →](/docs/plugins/api/properties/figma-createslice/)

* * *

### [createSlide](/docs/plugins/api/properties/figma-createslide/)(row?: number, col?: number): [SlideNode](/docs/plugins/api/SlideNode/)

info

This API is only available in Figma Slides

[View more →](/docs/plugins/api/properties/figma-createslide/)

* * *

### [createSlideRow](/docs/plugins/api/properties/figma-createsliderow/)(row?: number): [SlideRowNode](/docs/plugins/api/SlideRowNode/)

info

This API is only available in Figma Slides

Creates a new Slide Row, which automatically gets appended to the Slide Grid.

[View more →](/docs/plugins/api/properties/figma-createsliderow/)

* * *

### [createSticky](/docs/plugins/api/properties/figma-createsticky/)(): [StickyNode](/docs/plugins/api/StickyNode/)

info

This API is only available in FigJam

Creates a new sticky. The behavior is similar to using the `S` shortcut followed by a click.

[View more →](/docs/plugins/api/properties/figma-createsticky/)

* * *

### [createShapeWithText](/docs/plugins/api/properties/figma-createshapewithtext/)(): [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)

info

This API is only available in FigJam

Creates a new shape with text.

[View more →](/docs/plugins/api/properties/figma-createshapewithtext/)

* * *

### [createConnector](/docs/plugins/api/properties/figma-createconnector/)(): [ConnectorNode](/docs/plugins/api/ConnectorNode/)

info

This API is only available in FigJam

Creates a new connector. The behavior is similar to using the `Shift-C` shortcut followed by a click.

[View more →](/docs/plugins/api/properties/figma-createconnector/)

* * *

### createCodeBlock(): [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)

info

This API is only available in FigJam

Creates a new code block.

* * *

### createSection(): [SectionNode](/docs/plugins/api/SectionNode/)

Creates a new section

* * *

### [createTable](/docs/plugins/api/properties/figma-createtable/)(numRows?: number, numColumns?: number): [TableNode](/docs/plugins/api/TableNode/)

info

This API is only available in FigJam

Creates a new table.

[View more →](/docs/plugins/api/properties/figma-createtable/)

* * *

### [createLinkPreviewAsync](/docs/plugins/api/properties/figma-createlinkpreviewasync/)(url: string): Promise<[EmbedNode](/docs/plugins/api/EmbedNode/) | [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)\>

info

This API is only available in FigJam.

Resolves link metadata from a URL, and inserts either an embed or a unfurled preview of the link into the document An embed will be inserted if the URL is a valid OEmbed provider (has a `<link type="application/json+oembed" ... />` tag). The returned `<iframe>` source will be converted into an EmbedNode.

Otherwise, the title, description, thumbnail, and favicon will be parsed from the HTML markup of the URL using standard `og` or `twitter` meta tags. This information will be converted into a LinkUnfurlNode.

[View more →](/docs/plugins/api/properties/figma-createlinkpreviewasync/)

* * *

### [createGif](/docs/plugins/api/properties/figma-creategif/)(hash: string): [MediaNode](/docs/plugins/api/MediaNode/)

info

This API is only available in FigJam

Creates a new GIF with the given `Image` hash.

[View more →](/docs/plugins/api/properties/figma-creategif/)

* * *

### createNodeFromSvg(svg: string): [FrameNode](/docs/plugins/api/FrameNode/)

Creates a new node from an SVG string. This is equivalent to the SVG import feature in the editor. See the [official documentation on SVG paths](https://www.w3.org/TR/SVG/paths.html) for more details.

* * *

### [createNodeFromJSXAsync](/docs/plugins/api/properties/figma-createnodefromjsxasync/)(jsx: any): Promise<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>

This API creates a new node using the JSX API used by widgets.

[View more →](/docs/plugins/api/properties/figma-createnodefromjsxasync/)

* * *

### [combineAsVariants](/docs/plugins/api/properties/figma-combineasvariants/)(nodes: ReadonlyArray<[ComponentNode](/docs/plugins/api/ComponentNode/)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)

info

This API is only available in Figma Design

Creates a new [`ComponentSetNode`](/docs/plugins/api/ComponentSetNode/) by combining all the nodes in `nodes`, which should all have type [`ComponentNode`](/docs/plugins/api/ComponentNode/).

[View more →](/docs/plugins/api/properties/figma-combineasvariants/)

* * *

### [group](/docs/plugins/api/properties/figma-group/)(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [GroupNode](/docs/plugins/api/GroupNode/)

Creates new group containing all the nodes in `nodes`. There is no `createGroup` function -- use this instead. Group nodes have many quirks, like auto-resizing, that you can read about in the [`FrameNode`](/docs/plugins/api/FrameNode/) section.

[View more →](/docs/plugins/api/properties/figma-group/)

* * *

### union(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)

Creates a new [`BooleanOperationNode`](/docs/plugins/api/BooleanOperationNode/) using the UNION operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.group`](/docs/plugins/api/properties/figma-group/).

* * *

### subtract(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)

Creates a new [`BooleanOperationNode`](/docs/plugins/api/BooleanOperationNode/) using the SUBTRACT operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.subtract`](/docs/plugins/api/figma/#subtract).

* * *

### intersect(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)

Creates a new [`BooleanOperationNode`](/docs/plugins/api/BooleanOperationNode/) using the INTERSECT operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.intersect`](/docs/plugins/api/figma/#intersect).

* * *

### exclude(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)

Creates a new [`BooleanOperationNode`](/docs/plugins/api/BooleanOperationNode/) using the EXCLUDE operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.exclude`](/docs/plugins/api/figma/#exclude).

* * *

### [flatten](/docs/plugins/api/properties/figma-flatten/)(nodes: ReadonlyArray<[BaseNode](/docs/plugins/api/nodes/#base-node)\>, parent?: [BaseNode](/docs/plugins/api/nodes/#base-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin), index?: number): [VectorNode](/docs/plugins/api/VectorNode/)

Flattens every node in nodes into a new vector network.

[View more →](/docs/plugins/api/properties/figma-flatten/)

* * *

### [ungroup](/docs/plugins/api/properties/figma-ungroup/)(node: [SceneNode](/docs/plugins/api/nodes/#scene-node) & [ChildrenMixin](/docs/plugins/api/node-properties/#children-mixin)): Array<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>

Ungroups the given `node`, moving all of `node`'s children into `node`'s parent and removing `node`. Returns an array of nodes that were children of `node`.

[View more →](/docs/plugins/api/properties/figma-ungroup/)

* * *

## Dev Mode[​](#dev-mode "Direct link to Dev Mode")

These APIs integrate your plugin with Figma's Dev Mode. Use the APIs to generate code and interfaces in Dev Mode.

### codegen: [CodegenAPI](/docs/plugins/api/figma-codegen/#codegen-api) \[readonly\]

This property contains methods used to integrate with the Dev Mode codegen functionality.

Read more in the [codegen section](/docs/plugins/api/figma-codegen/).

* * *

### vscode?: VSCodeAPI \[readonly\]

This property contains methods used to integrate with the Figma for VS Code extension. If `undefined`, the plugin is not running in VS Code.

Read more in [Dev Mode plugins in Visual Studio Code](/docs/plugins/working-in-dev-mode/#dev-mode-plugins-in-visual-studio-code)

* * *

### devResources?: DevResourcesAPI \[readonly\]

caution

This is a private API only available to [Figma partners](https://www.figma.com/partners/)

* * *

### getSelectionColors(): null | { paints: [Paint](/docs/plugins/api/Paint/)\[\]; styles: [PaintStyle](/docs/plugins/api/PaintStyle/)\[\] }

Returns all of the colors in a user’s current selection. This returns the same values that are shown in Figma's native selection colors feature. This can be useful for getting a list of colors and styles in the current selection and converting them into a different code format (like CSS variables for a user’s codebase).

If there are colors in a selection it will return an object with a `paints` property, which is an array of `Paint[]`, and a `styles` property, which is an array of `PaintStyle[]`.

info

`getSelectionColors()` returns `null` if there is no selection, or if there are too many colors in the selection (>1000).

* * *

## Slides[​](#slides "Direct link to Slides")

### [getSlideGrid](/docs/plugins/api/properties/figma-getslidegrid/)(): Array<Array<[SlideNode](/docs/plugins/api/SlideNode/)\>>

**DEPRECATED:** Use [`figma.getCanvasGrid`](/docs/plugins/api/properties/figma-getcanvasgrid/) instead.

info

This API is only available in Figma Slides

[View more →](/docs/plugins/api/properties/figma-getslidegrid/)

* * *

### [setSlideGrid](/docs/plugins/api/properties/figma-setslidegrid/)(slideGrid: Array<Array<[SlideNode](/docs/plugins/api/SlideNode/)\>>): void

**DEPRECATED:** Use [`figma.setCanvasGrid`](/docs/plugins/api/properties/figma-setcanvasgrid/) instead.

info

This API is only available in Figma Slides

[View more →](/docs/plugins/api/properties/figma-setslidegrid/)

* * *

## Canvas Grid[​](#canvas-grid "Direct link to Canvas Grid")

### [getCanvasGrid](/docs/plugins/api/properties/figma-getcanvasgrid/)(): Array<Array<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>>

Gets the current canvas grid layout as a 2D array of nodes.

info

This API is only available in Figma Slides and Figma Buzz

[View more →](/docs/plugins/api/properties/figma-getcanvasgrid/)

* * *

### [setCanvasGrid](/docs/plugins/api/properties/figma-setcanvasgrid/)(canvasGrid: Array<Array<[SceneNode](/docs/plugins/api/nodes/#scene-node)\>>): void

Sets the canvas grid layout, reorganizing nodes in the canvas.

info

This API is only available in Figma Slides and Figma Buzz

[View more →](/docs/plugins/api/properties/figma-setcanvasgrid/)

* * *

### [createCanvasRow](/docs/plugins/api/properties/figma-createcanvasrow/)(rowIndex?: number): [SceneNode](/docs/plugins/api/nodes/#scene-node)

Creates a new row in the canvas grid at the specified index.

info

This API is only available in Figma Slides and Figma Buzz

[View more →](/docs/plugins/api/properties/figma-createcanvasrow/)

* * *

### [moveNodesToCoord](/docs/plugins/api/properties/figma-movenodestocoord/)(nodeIds: string\[\], rowIndex?: number, columnIndex?: number): void

Moves the specified nodes to a specific coordinate in the canvas grid.

info

This API is only available in Figma Slides and Figma Buzz

This function allows precise positioning of multiple nodes within the canvas grid system used in Slides and Buzz.

[View more →](/docs/plugins/api/properties/figma-movenodestocoord/)

* * *

## Styles[​](#styles "Direct link to Styles")

These are APIs available to create new styles and retrieve existing ones in the current document. The newly created styles are local to the current document and do not contain default properties (except for TextStyle).

### getStyleByIdAsync(id: string): Promise<[BaseStyle](/docs/plugins/api/BaseStyle/) | null>

Finds a style by its id in the current document. If not found, returns a promise containing null.

* * *

### getStyleById(id: string): [BaseStyle](/docs/plugins/api/BaseStyle/) | null

**DEPRECATED:** Use [`figma.getStyleByIdAsync`](/docs/plugins/api/figma/#getstylebyidasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a style by its id in the current document. If not found, returns null.

* * *

### createPaintStyle(): [PaintStyle](/docs/plugins/api/PaintStyle/)

info

This API is only available in Figma Design

Creates a new Paint style. This might be referred to as a Color style, or Fill style more colloquially. However, since this type of style may contain images, and may be used for backgrounds, strokes, and fills, it is called a Paint.

* * *

### createTextStyle(): [TextStyle](/docs/plugins/api/TextStyle/)

info

This API is only available in Figma Design

Creates a new Text style. By default, the text style has the Figma default text properties (font family Inter Regular, font size 12).

* * *

### createEffectStyle(): [EffectStyle](/docs/plugins/api/EffectStyle/)

info

This API is only available in Figma Design

Creates a new Effect style.

* * *

### createGridStyle(): [GridStyle](/docs/plugins/api/GridStyle/)

info

This API is only available in Figma Design

Creates a new Grid style.

* * *

The APIs below allow access to local styles, which are returned in the same order as displayed in the UI. Only local styles are returned, not the ones from the team library.

### getLocalPaintStylesAsync(): Promise<[PaintStyle](/docs/plugins/api/PaintStyle/)\[\]>

Returns the list of local paint styles.

* * *

### getLocalPaintStyles(): [PaintStyle](/docs/plugins/api/PaintStyle/)\[\]

**DEPRECATED:** Use [`figma.getLocalPaintStylesAsync`](/docs/plugins/api/figma/#getlocalpaintstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local paint styles.

* * *

### getLocalTextStylesAsync(): Promise<[TextStyle](/docs/plugins/api/TextStyle/)\[\]>

Returns the list of local text styles.

* * *

### getLocalTextStyles(): [TextStyle](/docs/plugins/api/TextStyle/)\[\]

**DEPRECATED:** Use [`figma.getLocalTextStylesAsync`](/docs/plugins/api/figma/#getlocaltextstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local text styles.

* * *

### getLocalEffectStylesAsync(): Promise<[EffectStyle](/docs/plugins/api/EffectStyle/)\[\]>

Returns the list of local effect styles.

* * *

### getLocalEffectStyles(): [EffectStyle](/docs/plugins/api/EffectStyle/)\[\]

**DEPRECATED:** Use [`figma.getLocalEffectStylesAsync`](/docs/plugins/api/figma/#getlocaleffectstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local effect styles.

* * *

### getLocalGridStylesAsync(): Promise<[GridStyle](/docs/plugins/api/GridStyle/)\[\]>

Returns the list of local grid styles.

* * *

### getLocalGridStyles(): [GridStyle](/docs/plugins/api/GridStyle/)\[\]

**DEPRECATED:** Use [`figma.getLocalGridStylesAsync`](/docs/plugins/api/figma/#getlocalgridstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local grid styles.

* * *

### moveLocalPaintStyleAfter(targetNode: [PaintStyle](/docs/plugins/api/PaintStyle/), reference: [PaintStyle](/docs/plugins/api/PaintStyle/) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local paint styles.

* * *

### moveLocalTextStyleAfter(targetNode: [TextStyle](/docs/plugins/api/TextStyle/), reference: [TextStyle](/docs/plugins/api/TextStyle/) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local text styles.

* * *

### moveLocalEffectStyleAfter(targetNode: [EffectStyle](/docs/plugins/api/EffectStyle/), reference: [EffectStyle](/docs/plugins/api/EffectStyle/) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local effect styles.

* * *

### moveLocalGridStyleAfter(targetNode: [GridStyle](/docs/plugins/api/GridStyle/), reference: [GridStyle](/docs/plugins/api/GridStyle/) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local grid styles.

* * *

### moveLocalPaintFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain paint styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](/docs/plugins/api/BaseStyle/) section for more info.

* * *

### moveLocalTextFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain text styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](/docs/plugins/api/BaseStyle/) section for more info.

* * *

### moveLocalEffectFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain effect styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](/docs/plugins/api/BaseStyle/) section for more info.

* * *

### moveLocalGridFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain grid styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](/docs/plugins/api/BaseStyle/) section for more info.

* * *

## Team Library[​](#team-library "Direct link to Team Library")

These APIs allow you to get a component, style, or variable from the team library. This requires you to have a key. You can get a key by calling `component.key` or `style.key` while a plugin is running.

### importComponentByKeyAsync(key: string): Promise<[ComponentNode](/docs/plugins/api/ComponentNode/)\>

Loads a component node from the team library. Promise is rejected if there is no published component with that key or if the request fails.

* * *

### importComponentSetByKeyAsync(key: string): Promise<[ComponentSetNode](/docs/plugins/api/ComponentSetNode/)\>

Loads a component set node from the team library. Promise is rejected if there is no published component set with that key or if the request fails.

* * *

### importStyleByKeyAsync(key: string): Promise<[BaseStyle](/docs/plugins/api/BaseStyle/)\>

Loads a style from the team library. Promise is rejected if there is no style with that key or if the request fails.

* * *

### importVariableByKeyAsync(key: string): Promise<[Variable](/docs/plugins/api/Variable/)\>

Loads a variable from the team library. Promise is rejected if there is no published variable with that key or if the request fails.

[View more →](/docs/plugins/api/properties/figma-variables-importvariablebykeyasync/)

* * *

## Other[​](#other "Direct link to Other")

### listAvailableFontsAsync(): Promise<[Font](/docs/plugins/api/FontName/#font)\[\]>

Returns the lists of currently available fonts. This should be the same list as the one you'd see if you manually used the font picker.

* * *

### [loadFontAsync](/docs/plugins/api/properties/figma-loadfontasync/)(fontName: [FontName](/docs/plugins/api/FontName/)): Promise<void>

Makes a font available _in the plugin_ for use when creating and modifying text. Calling this function is **necessary** to modify any property of a text node that may cause the rendered text to change, including `.characters`, `.fontSize`, `.fontName`, etc.

You can either pass in a hardcoded font, a font loaded via `listAvailableFontsAsync`, or the font stored on an existing text node.

Read more about how to work with fonts, when to load them, and how to load them in the [Working with Text](/docs/plugins/working-with-text/) page.

[View more →](/docs/plugins/api/properties/figma-loadfontasync/)

* * *

### hasMissingFont: boolean \[readonly\]

Returns true if the document contains text with missing fonts.

* * *

### [createImage](/docs/plugins/api/properties/figma-createimage/)(data: Uint8Array): [Image](/docs/plugins/api/Image/)

Creates an `Image` object from the raw bytes of a file content. Note that `Image` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain images. [Example: how to work with images](/docs/plugins/working-with-images/).

[View more →](/docs/plugins/api/properties/figma-createimage/)

* * *

### [createImageAsync](/docs/plugins/api/properties/figma-createimageasync/)(src: string): Promise<[Image](/docs/plugins/api/Image/)\>

Creates an `Image` object from a src URL. Note that `Image` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain images.

[View more →](/docs/plugins/api/properties/figma-createimageasync/)

* * *

### getImageByHash(hash: string): [Image](/docs/plugins/api/Image/) | null

This gets the corresponding `Image` object for a given image hash, which can then be used to obtain the bytes of the image. This hash is found in a node's fill property as part of the ImagePaint object. If there is no image with this hash, returns null.

* * *

### [createVideoAsync](/docs/plugins/api/properties/figma-createvideoasync/)(data: Uint8Array): Promise<[Video](/docs/plugins/api/Video/)\>

Creates a `Video` object from the raw bytes of a file content. Like `Image` objects, `Video` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain videos.

[View more →](/docs/plugins/api/properties/figma-createvideoasync/)

* * *

### [mixed](/docs/plugins/api/properties/figma-mixed/): unique symbol \[readonly\]

This a constant value that some node properties return when they are a mix of multiple values. An example might be font size: a single text node can use multiple different font sizes for different character ranges. For those properties, you should always compare against `figma.mixed`.

[View more →](/docs/plugins/api/properties/figma-mixed/)

* * *

### base64Encode(data: Uint8Array): string

Returns a base64-encoded string from the Uint8Array `data`.

* * *

### base64Decode(data: string): Uint8Array

Decodes and returns a Uint8Array from the base64-encoded string `data`.

* * *

### getFileThumbnailNodeAsync(): Promise<[FrameNode](/docs/plugins/api/FrameNode/) | [ComponentNode](/docs/plugins/api/ComponentNode/) | [ComponentSetNode](/docs/plugins/api/ComponentSetNode/) | [SectionNode](/docs/plugins/api/SectionNode/) | null>

Gets the node that is currently being used for file thumbnail, or null if the default thumbnail is used.

* * *

### getFileThumbnailNode(): [FrameNode](/docs/plugins/api/FrameNode/) | [ComponentNode](/docs/plugins/api/ComponentNode/) | [ComponentSetNode](/docs/plugins/api/ComponentSetNode/) | [SectionNode](/docs/plugins/api/SectionNode/) | null

**DEPRECATED:** Use [`figma.getFileThumbnailNodeAsync`](/docs/plugins/api/figma/#getfilethumbnailnodeasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Gets the node that is currently being used for file thumbnail, or null if the default thumbnail is used.

* * *

### setFileThumbnailNodeAsync(node: [FrameNode](/docs/plugins/api/FrameNode/) | [ComponentNode](/docs/plugins/api/ComponentNode/) | [ComponentSetNode](/docs/plugins/api/ComponentSetNode/) | [SectionNode](/docs/plugins/api/SectionNode/) | null): Promise<void>

Set `node` to be the thumbnail for the file. If `node` is null, then use the default thumbnail.

* * *

### loadAllPagesAsync(): Promise<void>

Loads all pages of the document into memory. This enables the use of the following features:

*   The `documentchange` event for [`figma.on`](/docs/plugins/api/properties/figma-on/)
*   [`findAll`](/docs/plugins/api/properties/DocumentNode-findall/)
*   [`findOne`](/docs/plugins/api/properties/DocumentNode-findone/)
*   [`findAllWithCriteria`](/docs/plugins/api/DocumentNode/#findallwithcriteria)
*   [`findWidgetNodesByWidgetId`](/docs/plugins/api/properties/DocumentNode-findwidgetnodesbywidgetid/)

Calling this method may be slow for large documents, and should be avoided unless absolutely necessary.

This method is only necessary if the plugin manifest contains `"documentAccess": "dynamic-page"`. Without this manifest setting, the full document is loaded automatically when the plugin or widget runs.

* * *

*   [General](#general)
*   [Nodes](#nodes)
*   [Dev Mode](#dev-mode)
*   [Slides](#slides)
*   [Canvas Grid](#canvas-grid)
*   [Styles](#styles)
*   [Team Library](#team-library)
*   [Other](#other)
