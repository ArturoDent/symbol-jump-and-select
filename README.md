# Symbol Jump and Select

Show a QuickPick with all or just filtered symbols.  Click on an item to go to that symbol or to go AND select that entire symbol and its children.

Here is an example of a keybinding:

```jsonc
{
  "key": "alt+o",       // whatever keybinding you want
  "command": "symbol-jump-and-select.showQuickPick",
  "args": {
    "symbols": [
      "class",
      "method",
      "function",
    ]
  }
} 
```

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/nodes1.gif?raw=true" width="825" height="600" alt="Show selections in QuickPick"/>

<img src="https://github.com/ArturoDent/symbol-jump-and-select/blob/main/images/nodes1Filter.gif?raw=true" width="825" height="600" alt="Show filter toggle in QuickPick"/>

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

* `symbol-jump-and-select.showQuickPick`

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

This extension contributes one setting:

* `symbol-jump-and-select.useTypescriptCompiler`

```plaintext
// in your Settings UI search for 'Typescript Compiler':
Symbol Jump/Select: Use Typescript Compiler.

"Whether to use the more resource-intensive typescript compiler (`tsc`) to produce more detailed symbol entries."
```

In your settings.json, look for this:  
    "symbol-jump-and-select.useTypescriptCompiler": false

The default is **true**.  

The typescript compiler is only available for javascript, javascriptreact, typescript and typescriptreact files.  It will be more resource-intensive than the built-in symbol provider so you can turn it off.  But with it enabled, you get more detailed and informative entries.

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

1. Add try/catch statements to the tsc version.
2. Make this into an optional view for one of the side bars (debounce on typing).
3. Add keybinding `symbols` that are specific to the tsc version, like `case`, `return`, etc. These can be filtered in the Quick Panel manually. But could enable by keybinding too.
4. Work on more parents nodes shown on filtering: e.g., show function declaration on switch/case or show the switch on filter by `case`, show class on `constructor`.
5. Update [keybindings schema](schemas/keybindings.schema.jsonc) for tsc nodes (part of 3 above).
6. Conside making `ignoreFocusOut` an optional setting.
7. `centerOnCursor` on opening? Search by symbol/node range.
8. Load new symbols/nodes on editor change, if QuickPick panel open?  Setting.

## Release Notes

* 0.11&emsp;First Release.

* 0.1.0&emsp;Added the tsc js/jsx/ts/tsx node version.
