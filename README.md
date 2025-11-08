# Symbol Jump and Select (or Symbols Tree)

Show a QuickPick with all or just filtered symbols.  Items can be filtered by keybinding or searching within the QuickPick.

Click on an item to go to that symbol or to go AND select that entire symbol and its children.

You can also show a TreeView in the SideBar or Secondary SideBar that allows jumping and selecting and filtering.

## Symbols Tree View

Initally the Symbols Tree  icon ( <img src="./icons/list-tree.png" width="16" height="16" alt="Symbols Tree icon"/> ) will appear in the Activity Bar and clicking on it will open the view in the SideBar, but it can be dragged or moved to the Secondary SideBar.

Here is what the Symbols Tree view looks like:

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/symbolsTreeView.png?raw=true" width="300" height="200" alt="The top portion of a Symbols Tree view in the Side Bar"/>

Notice the icons across the top:  

<img src="./icons/lock.png" width="16" height="16" alt="Symbols Tree view lock icon"/> <img src="./icons/filter.png" width="16" height="16" alt="Symbols Tree filter icon"/> <img src="./icons/refresh.png" width="16" height="16" alt="Symbols Tree refresh icon"/> <img src="./icons/collapse-all.png" width="16" height="16" alt="Symbols Tree collapseAll icon"/>

##### <img src="./icons/lock.png" width="16" height="16" alt="Symbols Tree view lock icon"/> : `lock` - prevent the tree view from updating to the new file when you switch editors.  Press again to unlock <img src="./icons/unlock.png" width="16" height="16" alt="Symbols Tree view unlock icon"/>.

##### <img src="./icons/filter.png" width="16" height="16" alt="Symbols Tree filter icon"/> : `filter` -  open a QuickInput for you to enter search/filter terms to narrow the tree view.

##### <img src="./icons/refresh.png" width="16" height="16" alt="Symbols Tree refresh icon"/> : `refresh` - return the tree view to the full unfiltered view.

##### <img src="./icons/collapse-all.png" width="16" height="16" alt="Symbols Tree collapseAll icon"/> : `collapse all` nodes in the tree view.

* Note: refresh <img src="./icons/refresh.png" width="16" height="16" alt="Symbols Tree refresh icon"/> will return to the unfiltered state ***AND*** expand all nodes (if the setting `Symbols Tree: Collapse Tree View Items` is set to `expandOnOpen`) ***or*** collapse all nodes (if the setting `Symbols Tree: Collapse Tree View Items` is set to `collapseOnOpen`).

----------

Here is an example of a keybinding:

```jsonc
{
  "key": "alt+o",       // whatever keybinding you want
  "command": "symbolsTree.showQuickPick",
  "args": {
    "symbols": [
      "class",
      "method",
      "function",
    ]
  }
} 
```

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/nodes1.gif?raw=true" width="950" height="500" alt="Show selections in QuickPick"/>

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/nodes1Filter.gif?raw=true" width="950" height="500" alt="Show filter toggle in QuickPick"/>

* Important: You will have to <kbd>Esc</kbd> to hide the QuickPick, clicking outside it will not hide it.

You can filter by any combination of the following symbols:

## `symbols` Options: string or array, optional, default = all symbols

Here are the symbols that can be used in the `symbols` option:

|              | symbols       |               |               |
|--------------|---------------|---------------|---------------|
| class        | method        | function      | property      |
| file         | module        | event         | operator      |
| namespace    | package       | struct        | typeParameter |
| variable     | field         | constant      | null          |
| enum         | interface     | constructor   | enumMember    |
| string       | number        | boolean       |               |
| array        | object        | key           |               |

If you omit the `symbols` option in your keybinding (or it is just an empty array), or if you invoke the command `symbol-jump-and-select.showQuickPick` from the Command Palette, the default is **all** of the symbols listed above.  For any particular language or file type, many of the symbols may not be used.  

## Extension Commands

This extension contributes the following command:

* `symbolsTree.showQuickPick`

```plaintext
// in the Command Palette:
Symbol Jump/Select: Open a quickpick of filtered symbols.
```

In the title bar of the QuickPick there is a **filter**  icon ( <img src="./icons/filter.png" width="16" height="16" alt="filter icon"/> ) on the top right.  Toggling that icon will negate any filtering of the symbols (from your keybinding) and ALL symbols in the file will be shown.  Toggling again will re-filter by your `symbols` in the keybinding, if any.

Each symbol that is shown will have a **selection** icon ( <img src="./icons/selection.png" width="16" height="16" alt="selection icon"/> ) on the right when that line is highlighted or hovered.  Clicking that selection icon will make the cursor jump to that symbol and select it.  The entire symbol (and its children, if any) will be selected.  

Children are shown indented by └─'s to their proper depth.

* If you filter for some symbol in your keybinding, like 'constructor', and that symbol occurs within another symbolKind, like 'class', the parent symbol(s) (the 'class', for example) will be shown for context.

The QuickPick can also be filtered by the symbolKind (class, method, function,etc.) in the Input Box at the top.  This will filter by the symbols' names and symbolKinds.  So if you opened a quickPick of all symbols, you could then type 'class' to see only classes in the file listed or type 'function' or 'constructor', etc. to see only those symbolKind of symbols in the file.  

If you have already filtered by symbols in the keybinding, you can only search in the QuickPick for those shown symbol names and Kinds. But you could toggle the <img src="./icons/filter.png" width="16" height="16" alt="filter icon"/> button at the top right and then search in the QuickInput input field through all symbols in the file.  

## Extension Settings

This extension contributes these settings:

* `symbolsTree.useTypescriptCompiler`

```plaintext
// in your Settings UI search for 'Typescript Compiler':
Symbols Tree: Use Typescript Compiler.

"Whether to use the more resource-intensive typescript compiler (`tsc`) to produce more detailed symbol entries."
```

In your settings.json, look for this:  
    "symbolsTree.useTypescriptCompiler": false

The default is **true**.  

The typescript compiler is only available for javascript, javascriptreact, typescript and typescriptreact files.  It will be more resource-intensive than the built-in symbol provider so you can turn it off.  But with it enabled, you get more detailed and informative entries.

* `symbolsTree.makeTreeView`

```plaintext
// in your Settings UI search for 'tree view' or 'symbols tree':
Symbols Tree: Make Tree View.

"Make a Tree View that can be shown in the SideBar, etc."
```

In your settings.json, look for this:  
    "symbolsTree.makeTreeView": false

The default is **true**.  

* `symbolsTree.collapseTreeViewItems`

```plaintext
// in your Settings UI search for 'tree view' or 'symbols tree':
Symbols Tree: Collapse Tree View Items.

"Expand/Collapse all items on when opening or refreshing the tree view."
```

In your settings.json, look for this:  
    "symbol-jump-and-select.makeTreeView": "expandOnOpen"  // or "collapseOnOpen"

The default is **collapseOnOpen**.  

Hitting the refresh button on the TreeView will expand or collapse all tree items according to this setting.  So you could hit the `CollapseAll` button and then `Refresh` to re-expand the tree (if `expandOnOpen`).

## Benefits of Using the Typescript Compiler (tsc)

1. `function calls` with arguments, including anonymous and arrow functions,
2. `returns` with what is actually returned,
3. `variables` with what they are initialized to,
4. `function declarations` have their parameters,
5. `class methods` have their arguments and returns,
6. `case/switch` statements are shown with their identifiers,
7. in `json` files, arrays have their string entries rather than just '0', '1', '2', etc.
8. etc.

There will be some "context" shown after the node/symbol that can be used for filtering by the input box at the top, like `function declaration`, `return`, `constructor`, `case` or `switch` and more.

## Arrow Functions and Function Names

Normally, in a javascript/typescript file these kinds of symbols would only be identified as `variables` and that is not very helpful:

```javascript
const someFunc = function (a) {...}   // this is a 'variable' symbol, NOT a 'function' symbol

const square = x => x * x;            // this is a 'variable' symbol, NOT a 'function' symbol
```

So this extension will determine if those 'variables' are in fact 'functions' and will identify them as such in the QuickPick.  Filtering for `function` in a keybinding will show these functions (despite the javascript language server identifying then solely as 'variables').  

## TODO

1. Add try/catch statements to the tsc version?
2. Add keybinding `symbols` that are specific to the tsc version, like `case`, `return`, etc. These can be filtered in the Quick Panel manually. But could enable by keybinding too.
3. Work on more parents nodes shown on filtering: e.g., show function declaration on switch/case or show the switch on filter by `case`, show class on `constructor`.
4. Update [keybindings schema](schemas/keybindings.schema.jsonc) for tsc nodes (part of 3 above).
5. Conside making `ignoreFocusOut` an optional setting.
6. `centerOnCursor` on opening? Search by symbol/node range.
7. Keep an eye on [TreeView.activeItem](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.proposed.treeViewActiveItem.d.ts).
8. Follow focus of editor cursor? Center enclosing symbol?
9. Keep an eye on tsgo, [ts native preview](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview&ssr=false#overview).
10. Keep an eye on [TreeItem markdown labels](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.proposed.treeItemMarkdownLabel.d.ts).
11. Use a colored unlock icon?


## Release Notes

* 0.11&emsp;First Release.

* 0.1.0&emsp;Added the tsc js/jsx/ts/tsx node version.
