# Action | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Action/
scraped_at: 2025-12-22T03:30:33.346Z
---

On this page

```
type Action =  { readonly type: "BACK" | "CLOSE" } |  { readonly type: "URL", url: string } |  { readonly type: "UPDATE_MEDIA_RUNTIME",    readonly destinationId: string | null,    readonly mediaAction:      | "PLAY"      | "PAUSE"      | "TOGGLE_PLAY_PAUSE"      | "MUTE"      | "UNMUTE"      | "TOGGLE_MUTE_UNMUTE"  } |  { readonly type: "UPDATE_MEDIA_RUNTIME",    readonly destinationId?: string | null,    readonly mediaAction: "SKIP_FORWARD" | "SKIP_BACKWARD"    readonly amountToSkip: number  } |  { readonly type: "UPDATE_MEDIA_RUNTIME",    readonly destinationId?: string | null,    readonly mediaAction: "SKIP_TO"    readonly newTimestamp: number  } |  {    readonly type: 'SET_VARIABLE'    readonly variableId: string | null    readonly variableValue?: VariableData  } |  {    readonly type: 'SET_VARIABLE_MODE'    readonly variableCollectionId: string | null    readonly variableModeId: string | null  } |  {    readonly type: 'CONDITIONAL'    readonly conditionalBlocks: ConditionalBlock[]  }  { readonly type: "NODE",    readonly destinationId: string | null,    readonly navigation: Navigation,    readonly transition: Transition | null,    readonly preserveScrollPosition?: boolean,    readonly overlayRelativePosition?: Vector,    readonly resetVideoPosition?: boolean,    readonly resetScrollPosition?: boolean,    readonly resetInteractiveComponents?: boolean,  }type Navigation = "NAVIGATE" | "SWAP" | "OVERLAY" | "SCROLL_TO" | "CHANGE_TO"
```

A prototyping `Action` describes interactivity in prototypes. Specifically, "what happens?" upon a [`Trigger`](/docs/plugins/api/Trigger/).

## "BACK" action[​](#back-action "Direct link to \"BACK\" action")

This action navigates to the previously opened frame by popping the navigation history.

## "CLOSE" action[​](#close-action "Direct link to \"CLOSE\" action")

This action closes the current topmost overlay (applicable only on overlays).

## "URL" action[​](#url-action "Direct link to \"URL\" action")

This action opens an external URL specified in the `url: string` parameter. If `openInNewTab: boolean` is set, a new browser tab will be opened.

## "UPDATE\_MEDIA\_RUNTIME" action[​](#update_media_runtime-action "Direct link to \"UPDATE_MEDIA_RUNTIME\" action")

This action alters the playing status of all video fills on the destination node. If `destinationId` is not set, then it will update video fills on the current node.

`mediaAction: MediaAction` determines

*   `"PLAY"`: Plays the video.
*   `"PAUSE"`: Pauses the video.
*   `"TOGGLE_PLAY_PAUSE"`: Plays the video if it is paused, and pauses the video if it is playing.
*   `"MUTE"`: Mutes the video.
*   `"UNMUTE"`: Unmutes the video.
*   `"TOGGLE_MUTE_UNMUTE`"\`: Mutes the video if it is unmuted, and unmutes the video if it is muted.
*   `"SKIP_FORWARD"`: Jumps forward in time in the video. An `amountToSkip` must be provided (in seconds).
*   `"SKIP_BACKWARD"`: Jumps backward in time in the video. An `amountToSkip` must be provided (in seconds).
*   `"SKIP_TO"`: Jumps to a specific timestamp in the video. A `newTimestamp` must be provided (in seconds).

## "SET\_VARIABLE" action[​](#set_variable-action "Direct link to \"SET_VARIABLE\" action")

Variables are stored values that represent design attributes or saved states. They can be string, number, color, or boolean value types. This action can set and modify the values of variables in prototypes.

*   `variableId`: string: The variable ID of an existing variable that an action will modify.
*   `variableValue`: `VariableData`: The value we want to set variableId during the prototyping. The value can be a boolean, float, string, color, variable or expression.

Important data types:

*   `VariableDataType`: Defines the types of data a VariableData object can hold

```
type VariableDataType = 'BOOLEAN' | 'FLOAT' | 'STRING' | 'VARIABLE_ALIAS' | 'COLOR' | 'EXPRESSION'
```

*   `VariableResolvedDataType`: Defines the types of data a VariableData object can eventually equal

```
type VariableResolvedDataType = 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING'
```

*   `ExpressionFunction`: Defines the list of operators available to use in an Expression

```
type ExpressionFunction =  | 'ADDITION'  | 'SUBTRACTION'  | 'MULTIPLICATION'  | 'DIVISION'  | 'EQUALS'  | 'NOT_EQUAL'  | 'LESS_THAN'  | 'LESS_THAN_OR_EQUAL'  | 'GREATER_THAN'  | 'GREATER_THAN_OR_EQUAL'  | 'AND'  | 'OR'  | 'VAR_MODE_LOOKUP'  | 'NEGATE'  | 'NOT'
```

*   `VariableData`: Defines an object which contains a value, VariableDataType and VariableResolvedDataType.

```
interface VariableData = {  type?: VariableDataType  resolvedType?: VariableResolvedDataType  value?: number | boolean | string | RGB | RGBA | VariableAlias | Expression}
```

*   `Expression`: Defines the [Expression](https://help.figma.com/hc/en-us/articles/15253194385943) object, which contains a list of `VariableData` objects strung together by operators (`ExpressionFunction`). This is essentially just a mathematical statement.

```
interface Expression {  expressionFunction: ExpressionFunction  expressionArguments: VariableData[]}
```

_Note that the `Expression` and `VariableData` objects can be recursive_

Example of creating an expression with strings

```
// $StringVariable + " Figma"const stringExpression = {  expressionArguments: [    {      resolvedType: 'STRING',      type: 'VARIABLE_ALIAS',      value: {        type: 'VARIABLE_ALIAS',        id: "$StringVariableID",      },    },    {      resolvedType: 'STRING',      type: 'STRING',      value: " Figma",    }  ],  expressionFunction: 'ADDITION',}
```

Example of creating a Set Variable action using the expression from above

```
const value = {  resolvedType: 'STRING',  type: 'EXPRESSION',  value: stringExpression}const setStringVariableAction = {  type: 'SET_VARIABLE',  variableId: "$StringVariableID",  variableValue: value,}
```

## "SET\_VARIABLE\_MODE" action[​](#set_variable_mode-action "Direct link to \"SET_VARIABLE_MODE\" action")

Variable modes represent the different contexts of our designs. If a variable collection has multiple modes, then we can switch modes on layers and elements to quickly change designs for different contexts.

This action can switch the selected mode for a given collection at a page level.

*   `variableCollectionId`: string: The variable collection ID of an existing variable collection.
*   `variableModeId`: string: The variable mode ID of a mode that exists in the corresponding variable collection, which the action will switch to.

Example of creating a set variable mode reaction on a frame

```
const collection = figma.variables.createVariableCollection("collection")const newModeId = collection.addMode("mode 2")const setModeAction = {    type: 'SET_VARIABLE_MODE',    variableCollectionId: collection.id,    variableModeId: newModeId,}const reactions = [];reactions.push({    "actions": [setModeAction],    "trigger": {          "type": "ON_CLICK"    }});// Add an "on click" interaction, with a "set variable mode" action// with the just-created collection and second mode.const hotspot = figma.createFrame()await hotspot.setReactionsAsync(reactions);console.log(hotspot.reactions)/* Output:[  {    "action": {      "type": "SET_VARIABLE_MODE",      "variableCollectionId": "VariableCollectionId:0:1",      "variableModeId": "1:1"    },    "actions": [      {        "type": "SET_VARIABLE_MODE",        "variableCollectionId": "VariableCollectionId:0:1",        "variableModeId": "1:1"      }    ],    "trigger": {      "type": "ON_CLICK"    }  }]*/
```

## "CONDITIONAL" action[​](#conditional-action "Direct link to \"CONDITIONAL\" action")

This action checks if a condition is met before performing certain actions by using an if/else conditional statement.

*   `conditionalBlocks`: `ConditionalBlock[]`: Either the if or else conditional blocks. The if block contains a condition to check. If that condition is met then it will run those list of actions, else it will run the actions in the else block.

Important data type:

```
type ConditionalBlock = {  condition?: VariableData  actions: Action[]}
```

Example of creating a condition with multiple expressions

```
// $NumberVariable > 10const numberEvaluationExpression = {  expressionArguments: [    {      resolvedType: "FLOAT",      type: "VARIABLE_ALIAS",      value: {        type: 'VARIABLE_ALIAS',        id: "$NumberVariableID",      },    },    {      resolvedType: "FLOAT",      type: "FLOAT",      value: 10    }  ],  expressionFunction: "GREATER_THAN"}// $NumberVariable > 10 && $BooleanVariableconst conditionData = {  resolvedType: "BOOLEAN",  type: "EXPRESSION",  value: {    expressionArguments: [      {        resolvedType: "BOOLEAN",        type: "EXPRESSION",        value: numberEvaluationExpression      },      {        resolvedType: "BOOLEAN",        type: "VARIABLE_ALIAS",        value: {          type: 'VARIABLE_ALIAS',          id: "$BooleanVariableID",        },      }    ],    expressionFunction: "AND",  },}
```

Example of creating ConditionalBlocks with the condition from above

```
const navigateAction1 = {  type: 'NODE',  navigation: 'NAVIGATE',  transition: null,  destinationId: "$Frame1ID",}const navigateAction2 = {  type: 'NODE',  navigation: 'NAVIGATE',  transition: null,  destinationId: "$Frame2ID",}const conditionalIfBlock = {  condition: conditionData,  actions: [navigateAction1],}const conditionalElseBlock = {  actions: [navigateAction2],}
```

Example of creating a Conditional action with the ConditionalBlocks from above

```
const conditionalAction = {  type: 'CONDITIONAL',  conditionalBlocks: [conditionalIfBlock, conditionalElseBlock],}
```

## "NODE" action[​](#node-action "Direct link to \"NODE\" action")

This action navigates to a new node.

`destinationId: string | null`: The ID of the destination node being navigated to. This may be null when invalid (e.g. points to a deleted node).

`navigation: Navigation`: The method of navigation. The possible values are:

*   `"NAVIGATE"`: Replaces the current screen with the destination, also closing all overlays.
*   `"OVERLAY"`: Opens the destination as an overlay on the current screen.
*   `"SWAP"`: On an overlay, replaces the current (topmost) overlay with the destination. On a top-level frame, behaves the same as `"NAVIGATE"` except that no entry is added to the navigation history.
*   `"SCROLL_TO"`: Scrolls to the destination on the current screen.
*   `"CHANGE_TO"`: Changes the closest ancestor instance of source node to the specified variant.

`transition: Transition | null`: An animated transition when navigating, if any. See the [`Transition`](/docs/plugins/api/Transition/) object type.

`preserveScrollPosition?: boolean`: Whether the scroll offsets of any scrollable elements in the current screen or overlay are preserved when navigating to the destination. This is applicable only if the layout of both the current frame and its destination are the same.

`overlayRelativePosition?: Vector`: Applicable only when `navigation` is `"OVERLAY"` and the destination is a frame with `overlayPosition` equal to `"MANUAL"`. This value represents the offset by which the overlay is opened relative to this node.

`resetVideoPosition?: boolean`: When true, all videos within the destination frame will reset their memorized playback position to 00:00 before starting to play.

`resetScrollPosition?: boolean`: Whether the scroll offsets of any scrollable elements in the current screen or overlay are reset when navigating to the destination. This is applicable only if the layout of both the current frame and its destination are the same.

`resetInteractiveComponents?: boolean`: Whether the state of any interactive components in the current screen or overlay are reset when navigating to the destination. This is applicable if there are interactive components in the destination frame.

*   ["BACK" action](#back-action)
*   ["CLOSE" action](#close-action)
*   ["URL" action](#url-action)
*   ["UPDATE\_MEDIA\_RUNTIME" action](#update_media_runtime-action)
*   ["SET\_VARIABLE" action](#set_variable-action)
*   ["SET\_VARIABLE\_MODE" action](#set_variable_mode-action)
*   ["CONDITIONAL" action](#conditional-action)
*   ["NODE" action](#node-action)
