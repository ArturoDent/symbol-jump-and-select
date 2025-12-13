# Symbols Tree (also called Symbol Jump and Select )

Show a **QuickPick** with all or just filtered symbols.  Items can be filtered by keybinding or by searching within the QuickPick.

You can also show a **TreeView** in the SideBar or Secondary SideBar that allows jumping and selecting and filtering.

Click on an item to go to that symbol **OR** to go to and select that entire symbol and its children - in the TreeView or the QuickPick

## Symbols TreeView

Initally the Symbols Tree  icon (
<img src="./icons/list-tree.jpg" width="16" height="16" alt="Symbols Tree icon"/>) will appear in the Activity Bar and clicking on it will open the view in the Primary SideBar, but it can be dragged or moved to the Secondary SideBar or the Panel (where the Terminal usually lives).

Here is what the top of the Symbols TreeView looks like:

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/TreeViewIcons.png?raw=true" width="400" height="100" alt="The top portion of a Symbols TreeView in the Side Bar"/>

Notice the icons across the top:  

<img src="./icons/lock.jpg" width="16" height="16" alt="Symbols TreeView lock icon"/> <img src="./icons/filter.jpg" width="16" height="16" alt="Symbols Tree filter icon"/> <img src="./icons/refresh.jpg" width="16" height="16" alt="Symbols Tree refresh icon"/> <img src="./icons/square-minus.jpg" width="16" height="16" alt="Symbols Tree collapseAll icon"/>

##### <img src="./icons/lock.jpg" width="16" height="16" alt="Symbols TreeView lock icon"/> : `lock` - prevent the TreeView from updating to the new file when you switch editors.  Press <img src="./icons/unlock.jpg" width="16" height="16" alt="Symbols TreeView unlock icon"/> to unlock.

##### <img src="./icons/filter.jpg" width="16" height="16" alt="Symbols Tree filter icon"/> : `filter` -  open an input box for you to enter search/filter terms to narrow the TreeView.

##### <img src="./icons/refresh.jpg" width="16" height="16" alt="Symbols Tree refresh icon"/> : `refresh` - return the TreeView to the full unfiltered view.

##### <img src="./icons/square-minus.jpg" width="16" height="16" alt="Symbols Tree collapseAll icon"/> : `collapse all` nodes in the TreeView. Press <img src="./icons/square-plus.jpg" width="16" height="16" alt="Symbols TreeView expandAll icon"/> to expand all.

* Note: refresh <img src="./icons/refresh.jpg" width="16" height="16" alt="Symbols Tree refresh icon"/> will return to the unfiltered state ***AND*** expand all nodes (if the setting `Symbols Tree: Collapse Tree View Items` is set to `expandOnOpen`) ***or*** collapse all nodes (if the same setting is set to `collapseOnOpen`).

----------

Here are two examples of keybindings:

```jsonc
// open a QuickPick showing only these Document Symbols
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
},

// show or filter only class symbols in the TreeView
{
  "key": "alt+f",       // whatever keybinding you want
  "command": "symbolsTree.applyFilters",
  "args": [
    "class"
  ],
  "when": "view.symbolsTree.visible"
},
```

#### Open an unfiltered QuickPick and filter by text input:

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/qpFilterRefresh1.gif?raw=true" width="950" height="500" alt="Show selections in QuickPick"/>

#### Open a  QuickPick already filtered by 'class':

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/qpfilterKeybinding1.gif?raw=true" width="950" height="500" alt="Show filter toggle in QuickPick"/>

* Important: You will have to <kbd>Esc</kbd> to hide the QuickPick, clicking outside it will not hide it.

You can filter by any combination of the following symbols:

## `symbols` Options

* string or array, optional, default = all symbols below

Here are the values that can be used in the `symbols` option in a keybinding:

<!-- |              | symbols       |               |               |
|--------------|---------------|---------------|---------------|
| class        | method        | function      | property      |
| file         | module        | event         | operator      |
| namespace    | package       | struct        | typeParameter |
| variable     | field         | constant      | null          |
| enum         | interface     | constructor   | enumMember    |
| string       | number        | boolean       |               |
| array        | object        | key           |               | -->

<table style="border-collapse:collapse;border:1px solid #000;width:auto;">
  <thead>
    <tr>
      <th colspan="7" style="text-align:center;background:#f7f7f7;border-bottom:1px solid #333;">
        symbols
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:6px 20px;">class</td>
      <td style="padding:6px 20px;">method</td>
      <td style="padding:6px 20px;">function</td>
      <td style="padding:6px 20px;">property</td>
      <td style="padding:6px 20px;">file</td>
      <td style="padding:6px 20px;">module</td>
      <td style="padding:6px 20px;">event</td>
    </tr>
    <tr>
      <td style="padding:6px 20px;">operator</td>
      <td style="padding:6px 20px;">namespace</td>
      <td style="padding:6px 20px;">package</td>
      <td style="padding:6px 20px;">struct</td>
      <td style="padding:6px 20px;">typeParameter</td>
      <td style="padding:6px 20px;">variable</td>
      <td style="padding:6px 20px;">field</td>
    </tr>
    <tr>
      <td style="padding:6px 20px;">constant</td>
      <td style="padding:6px 20px;">null</td>
      <td style="padding:6px 20px;">enum</td>
      <td style="padding:6px 20px;">enumMember</td>
      <td style="padding:6px 20px;">interface</td>
      <td style="padding:6px 20px;">constructor</td>
      <td style="padding:6px 20px;">string</td>
    </tr>
    <tr>
      <td style="padding:6px 20px;">number</td>
      <td style="padding:6px 20px;">boolean</td>
      <td style="padding:6px 20px;">array</td>
      <td style="padding:6px 20px;">object</td>
      <td style="padding:6px 20px;">key</td>
      <td style="padding:6px 20px;"></td>
      <td style="padding:6px 20px;"></td>
    </tr>
  </tbody>
</table>

<br/>

<table style="border-collapse:collapse;border:1px solid #000;overflow:hidden;width:auto;">
  <thead>
    <tr>
      <th colspan="7" style="text-align:center;background:#f7f7f7;border-bottom:1px solid #333;">
        additional symbols if using the typescript compiler option
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:6px 20px;">call</td>
      <td style="padding:6px 20px;">return</td>
      <td style="padding:6px 20px;">arrow</td>
      <td style="padding:6px 20px;">anonymous</td>
      <td style="padding:6px 20px;">declaration</td>
      <td style="padding:6px 20px;">switch</td>
      <td style="padding:6px 20px;">case</td>
    </tr>
  </tbody>
</table>

<br/>

`call/return/arrow/anonymous/declaration` refer to function or method calls, returns, etc.

`call/return/arrow/anonymous/declaration/switch/case` are only available if you are using the typescript compiler (`tsc`).

If you omit the `symbols` option in your keybinding (or it is just an empty array), or if you invoke the command `symbol-jump-and-select.showQuickPick` from the Command Palette, the default is **all** of the symbols listed above.  For any particular language or file type, many of the symbols may not be used.  

### QuickPick

* `symbolsTree.showQuickPick`

```plaintext
// in the Command Palette:
Symbol Jump/Select: Open a quickpick of filtered symbols.
```

In the title bar of the QuickPick there is a **filter**  icon ( <img src="./icons/filter.jpg" width="16" height="16" alt="filter icon"/> ) on the top right.  Toggling that icon will negate any filtering of the symbols (from your keybinding) and ALL symbols in the file will be shown.  Toggling again will re-filter by your `symbols` in the keybinding, if any.

Each symbol that is shown will have a **selection** icon ( <img src="./icons/selection.jpg" width="16" height="16" alt="selection icon"/> ) on the right when that line is highlighted or hovered.  Clicking that selection icon will make the cursor jump to that symbol and select it.  The entire symbol (and its children, if any) will be selected.  

Children are shown indented by └─'s to their proper depth.

* If you filter for some symbol in your keybinding, like 'constructor', and that symbol occurs within another symbolKind, like 'class', the parent symbol(s) (the 'class', for example) will be shown for context.

The QuickPick can also be filtered by the symbolKind (class, method, function,etc.) in the Input Box at the top.  This will filter by the symbols' names and symbolKinds.  So if you opened a quickPick of all symbols, you could then type 'class' to see only classes in the file listed or type 'function' or 'constructor', etc. to see only those symbolKind of symbols in the file.  

If you have already filtered by symbols in the keybinding, you can only search in the QuickPick for those shown symbol names and Kinds. But you could toggle the <img src="./icons/filter.jpg" width="16" height="16" alt="filter icon"/> button at the top right and then search in the QuickInput input field through all symbols in the file.  

### Symbols Tree: a TreeView

The following commands are triggered by clicking on the icons at the top of the TreeView. In addition, they can be triggered from a keybinding (if the `when` clauses apply).

* **symbolsTree.lock** : <img src="./icons/lock.jpg" width="16" height="16" alt="lock icon"/>  
 In the Command Palette: ``` Symbols Tree: Lock ```

This is a toggle between lock and unlock - there will only be a single icon at a time that appears at the top of the tree to toggle the lock status.

* **symbolsTree.unlock** : <img src="./icons/unlock.jpg" width="16" height="16" alt="unlock icon"/>  
 In the Command Palette: ``` Symbols Tree: Unlock ```

 -----------------

* **symbolsTree.getFilter** : <img src="./icons/filter.jpg" width="16" height="16" alt="filter icon"/>  
 In the Command Palette: ``` Symbols Tree: Get Filter ```

```plainText
// handle "class || rex"  => ["class", "rex"] // if query contains "||" split on " || "
// handle "class,rex" treat as an ||  TODO
```

 -----------------

 Spaces within your filter query (in the QuickInput box) are respected, they are NOT removed.

* **symbolsTree.refresh**  : <img src="./icons/refresh.jpg" width="16" height="16" alt="refresh icon"/>  
 In the Command Palette: ``` Symbols Tree: Refresh ```

 -----------------

* **symbolsTree.collapseAll** : <img src="./icons/square-minus.jpg" width="16" height="16" alt="collapseAll icon"/>  
 In the Command Palette: ``` Symbols Tree: Collapse All ```

This is a toggle between collapse all  and expand all - there will only be a single icon at a time that appears at the top of the tree to toggle the collapsed status.

* **symbolsTree.expandAll** : <img src="./icons/square-plus.jpg" width="16" height="16" alt="expandAll icon"/>  
 In the Command Palette: ``` Symbols Tree: Expand All ```

-----------------

The following command can **ONLY** be triggered by a keybinding:

* **symbolsTree.applyFilters**  
 In the Command Palette: ``` Symbols Tree: Apply a filter from a keybinding  ```

```jsonc
{
  "key": "alt+a",              // whatever you want
  "command": "symbolsTree.applyFilters",
  "args": [
    "class",
    // etc.
  ],
  "when": "symbolsTree.visible"
}
```

## Default Keybindings

These are the default keybindings that are set by the extension, but they can be changed by you:

```jsonc
{
  "key": "alt+f",
  "command": "symbolsTree.applyFilters",
  "when": "symbolsTree.visible"
},
{
  "key": "alt+l",
  "command": "symbolsTree.lock",
  "when": "symbolsTree.visible && !symbolsTree.locked"
},
{
  "key": "alt+l",
  "command": "symbolsTree.unlock",
  "when": "symbolsTree.visible && symbolsTree.locked"
},
{
  "key": "alt+r",
  "command": "symbolsTree.refresh",
  "when": "symbolsTree.visible"
},
{
  "key": "alt+g",
  "command": "symbolsTree.getFilter",
  "when": "symbolsTree.visible"
},
{
  "key": "alt+c",
  "command": "symbolsTree.collapseAll",
  "when": "symbolsTree.visible && !symbolsTree.collapsed"
},
{
  "key": "alt+c",
  "command": "symbolsTree.expandAll",
  "when": "symbolsTree.visible && symbolsTree.collapsed"
},
{
  "key": "alt+t",
  "command": "symbolsTree.revealSymbol",
  "when": "symbolsTree.visible && symbolsTree.hasSelection"
},
{
  "key": "alt+s",
  "command": "symbolsTree.selectSymbol",
  "when": "symbolsTree.visible && symbolsTree.hasSelection"
}
```

## Extension Settings

This extension contributes these settings:

* `symbolsTree.useTypescriptCompiler`  default = **true**

```plaintext
// in your Settings UI search for 'Typescript Compiler' or 'Symbols Tree':
Symbols Tree: Use Typescript Compiler.
"Whether to use the more resource-intensive typescript compiler (`tsc`) to produce more detailed symbol entries."
```

In your settings.json, look for this:  ``` "symbolsTree.useTypescriptCompiler": false```

The typescript compiler is only available for javascript, javascriptreact, typescript and typescriptreact files.  It will be more resource-intensive than the built-in symbol provider so you can turn it off.  But with it enabled, you get more detailed and informative entries.

* `symbolsTree.makeTreeView`  default = **true**

```plaintext
// in your Settings UI search for 'tree view' or 'symbols tree':
Symbols Tree: Make Tree View.
"Make a TreeView that can be shown in the SideBar, etc."
```

In your settings.json, look for this:  ```"symbolsTree.makeTreeView": false```

* `symbolsTree.collapseTreeViewItems`  default = **collapseOnOpen**

```plaintext
// in your Settings UI search for 'tree view' or 'symbols tree':
Symbols Tree: Collapse Tree View Items.
"Expand/Collapse all items on when opening or refreshing the TreeView."
```

In your settings.json, look for this:  ```"symbol-jump-and-select.makeTreeView": "expandOnOpen"  // or "collapseOnOpen"```

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

There will be some "context" shown after the node/symbol in the quickPick that can be used for filtering by the input box at the top, like `function declaration`, `return`, `constructor`, `case` or `switch` and more.  That same "context" is in the TreeView items but not visible but still can be used to filter the tree.  

## Arrow Functions and Function Names

Normally, in a javascript/typescript file these kinds of symbols would only be identified as `variables` and that is not very helpful:

```javascript
const someFunc = function (a) {...}   // this is a 'variable' symbol, NOT a 'function' symbol

const square = x => x * x;            // this is a 'variable' symbol, NOT a 'function' symbol
```

So this extension will determine if those 'variables' are in fact 'functions' and will identify them as such in the QuickPick.  Filtering for `function` in a keybinding will show these functions (despite the javascript language server identifying then solely as 'variables').  

## Known Issues

1. Switching rapidly between editors may result in the TreeView getting out of sync and not showing the correct TreeVew.  Cancelling the TreeView debounced refresh doesn't work. Refreshing the TreevIew with the <img src="./icons/refresh.jpg" width="16" height="16" alt="Symbols Tree refresh icon"/> should fix that.  
2. Starting vscode (or re-loading it) with a .json file as the current editor may result in only some of the json file's symbols being shown in the TreeView (it only seems to happen to me with launch.json and not other json files).  

## TODO

* Work on more parents nodes shown on filtering: e.g., show function declaration on switch/case or show the switch on filter by `case`, show class on `constructor`.
* Conside making `ignoreFocusOut` an optional setting.
* `centerOnCursor` on opening? Search by symbol/node range.
* Keep an eye on [TreeView.activeItem](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.proposed.treeViewActiveItem.d.ts).
* Follow focus of editor cursor? Center enclosing symbol?
* Keep an eye on tsgo, [ts native preview](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview&ssr=false#overview).
* Keep an eye on [TreeItem markdown labels](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.proposed.treeItemMarkdownLabel.d.ts).
* Implement successive searches (using previous results)?
* Clickable parameters?

## Release Notes

* 0.2.0&emsp;First Release.
