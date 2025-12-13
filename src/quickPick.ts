import {
  DocumentSymbol, workspace, window, Uri, TextDocument, commands, ThemeIcon, QuickInputButton,
  QuickPickItemButtonEvent, Position, Range, Selection, TextEditorRevealType, ExtensionContext
} from 'vscode';

import _Globals from './myGlobals';

import * as arrowFunctions from './arrowFunctions';
import {filterDepthMap, unfilteredDepthMap} from './depthMap';
import {traverseSymbols} from './qpTraverse';
import {BoundedCache} from './mapCache';

import type {SymMap, SymbolPickItem, SymbolMap, NodePickItems} from './types';
import {mapKindToNameAndIconPath} from './symbolKindMap';
import {collectSymbolItemsFromSource} from './nodeList';
import {filterDocNodes} from './nodeFilter';
import {showQuickPickMessage} from './messages';
import {isMap} from 'util/types';

// Define a type for the BoundedCache value, key is a Uri
type QuickPickCache = {
  refreshSymbols: boolean;
  symbols: NodePickItems | SymbolMap;
};

export class SymbolPicker {

  // local "globals"
  private kbSymbolsSaved: (keyof SymMap)[] = [];
  private filterState: string = 'filtered';

  private docSymbols: DocumentSymbol[] = [];
  private arrowFunctionSymbols: DocumentSymbol[] = [];

  private symbolDepthMap: SymbolMap = new Map();
  private filteredDepthMap: SymbolMap = new Map();
  private allDepthMap: SymbolMap = new Map();

  private allDocNodes: NodePickItems = [];
  private filteredDocNodes: NodePickItems = [];

  // Create a bounded cache of Map <Uri → QuickPickCache> with max size 3 editors
  private readonly cache = new BoundedCache<Uri, QuickPickCache>(3);

  constructor(context: ExtensionContext) {
    // if current document was edited
    // TODO: debounce this?
    context.subscriptions.push(workspace.onDidChangeTextDocument(async (event) => {
      if (event.contentChanges.length) {
        this.cache.set(event.document.uri, {refreshSymbols: true, symbols: []});
      }
    }));
  }

  // Get the Nodes using tsc, and return filtered nodes
  async getNodes(kbSymbols: (keyof SymMap)[], document: TextDocument): Promise<NodePickItems | undefined> {

    this.kbSymbolsSaved = kbSymbols;
    let thisUriCache: QuickPickCache | undefined;

    if (this.cache.get(document.uri))
      thisUriCache = this.cache.get(document.uri);

    if (!thisUriCache || thisUriCache.refreshSymbols) {

      this.allDocNodes = await collectSymbolItemsFromSource(document);
      this.symbolDepthMap.clear();
      this.filteredDepthMap.clear();
      this.allDepthMap.clear();
      this.filteredDocNodes = [];
      this.docSymbols = [];
    }
    else {
      this.allDocNodes = thisUriCache.symbols as NodePickItems;
    }

    if (this.allDocNodes.length) {
      // if no kbSymbols, don't bother to filter // can that ever happen - defaults to all?
      this.filteredDocNodes = await filterDocNodes(kbSymbols, this.allDocNodes);
    } else {
      showQuickPickMessage("QuickPick: Found no document symbols in this editor.");
      return undefined;
    }

    if (!this.filteredDocNodes.length) {
      showQuickPickMessage("QuickPick: There are no document symbols remaining AFTER applying your 'symbols' from the keybinding.");
      return undefined;
    }

    this.cache.set(document.uri, {refreshSymbols: false, symbols: this.allDocNodes});
    return this.filteredDocNodes;
  }

  /**
 * 1. Get doc symbols from vscode.executeDocumentSymbolProvider.
 * 2. Build an array of symbols for arrow functions (else identified as variables).
 * 3. Build a depth map of all symbols.
 * 4. Filter the depth map by keybinding symbols.
  */
  async getSymbols(kbSymbols: (keyof SymMap)[], document: TextDocument): Promise<SymbolMap | undefined> {

    this.kbSymbolsSaved = kbSymbols;

    // Map.get() can return undefined if key not found
    const thisUriCache: QuickPickCache | undefined = this.cache.get(document.uri);

    if (thisUriCache) {
      if (isMap(thisUriCache.symbols) && thisUriCache.symbols.size && !thisUriCache.refreshSymbols)
        return thisUriCache.symbols as SymbolMap;
      else (!isMap(thisUriCache.symbols) && thisUriCache.symbols.length && !thisUriCache.refreshSymbols);
      return thisUriCache.symbols as SymbolMap;
    }

    else {
      this.docSymbols = await commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);
      this.symbolDepthMap.clear();
      this.filteredDepthMap.clear();
      this.allDepthMap.clear();
      this.allDocNodes = [];
      this.filteredDocNodes = [];

      this.arrowFunctionSymbols = _Globals.isJSTS
        ? await arrowFunctions.makeSymbolsFromFunctionExpressions(document) || []
        : [];

      if (this.docSymbols) {
        this.symbolDepthMap = traverseSymbols(this.docSymbols, document);
      }
    }

    // this is the filtering step and also merges the arrowFunctions
    if (this.symbolDepthMap.size) {

      this.filteredDepthMap = await filterDepthMap(this.arrowFunctionSymbols, this.symbolDepthMap, this.kbSymbolsSaved);

      if (!this.filteredDepthMap.size) {
        showQuickPickMessage("There are no document symbols remaining AFTER applying your 'symbols' from the keybinding.");
        return undefined;
      }

      this.cache.set(document.uri, {refreshSymbols: false, symbols: this.filteredDepthMap});
      return this.filteredDepthMap;

    } else {
      showQuickPickMessage("There are no document symbols remaining AFTER applying your 'symbols' from the keybinding.");
      return undefined;
    }
  }

  /**
   * Show a QuickPick of the document symbols in options 'symbols'
  */
  async render(items: NodePickItems | SymbolMap) {
    const doc = window.activeTextEditor?.document;
    if (!doc) return;

    this.filterState = 'filtered';

    // const filterButton: QuickInputButton = {
    //   iconPath: new ThemeIcon('filter'),
    //   // iconPath: {
    //   //   dark: Uri.joinPath(context.extensionUri, 'resources/dark/filter.svg'),
    //   //   light: Uri.joinPath(context.extensionUri, 'resources/light/filter.svg')
    //   // },
    //   tooltip: 'Toggle Filter'
    // };

    const selectButton: QuickInputButton = {
      iconPath: new ThemeIcon('selection'),
      tooltip: 'Select Symbol'
    };

    const refreshButton: QuickInputButton = {
      iconPath: new ThemeIcon('refresh'),
      tooltip: 'Refresh list'
    };

    const qpItems: SymbolPickItem[] = [];

    if (isMap(items)) {    // for SymbolMap, non-tsc

      items.forEach((depth, symbol) => {
        let label = (parseInt(symbol.name) >= 0) ? symbol.detail : `${symbol.name}: ${symbol.detail}`;
        if (depth) label = ('└─  ' + label).padStart(label.length + (depth * 10), ' ');

        // do a reverse mapping from symbol.kind -> "class", "function", etc.
        // description: ` (${mapKindToNameAndIconPath.get(symbol.kind)?.name})`, // var => arrow fn
        qpItems.push({
          label: label + ` --- (${mapKindToNameAndIconPath.get(symbol.kind)?.name})`,
          range: symbol.range,
          selectionRange: symbol.selectionRange,
          buttons: [selectButton],
        });
      });
    }

    else {  // for NodePickItems, using tsc

      items.forEach(item => {
        let label = item.label;
        if (item.depth > 0) label = ('└─  ' + label).padStart(item.label!.length + (item.depth * 10), ' ');

        qpItems.push({
          label: `${label}   ---  (${item.detail})`,
          range: item.range,
          selectionRange: item.selectionRange,
          buttons: [selectButton],
        });
      });
    }

    const qp = window.createQuickPick<SymbolPickItem>();
    qp.ignoreFocusOut = true;
    qp.items = qpItems;
    qp.title = 'Select Symbols';
    (qp as any).sortByLabel = false;  // stop alphabetical resorting, especially in onDidChangeValue() below
    qp.buttons = [refreshButton];
    // qp.buttons = [filterButton, refreshButton];

    qp.onDidTriggerItemButton((event: QuickPickItemButtonEvent<SymbolPickItem>) => {

      const editor = window.activeTextEditor;
      const document = editor?.document;
      if (!document) return;

      const target = event.item;
      const lastLineLength = document.lineAt(target.range.end).text.length;
      const extendedRange = target.range.with({
        start: new Position(target.range.start.line, 0),
        end: new Position(target.range.end.line, lastLineLength)
      });

      editor.selections = [new Selection(extendedRange.end, extendedRange.start)];
      editor.revealRange(new Range(editor.selections[0].anchor, editor.selections[0].active), TextEditorRevealType.Default);
      qp.hide();
    });

    // select an item
    qp.onDidChangeSelection(selectedItems => {
      const editor = window.activeTextEditor;
      const document = editor?.document;
      if (!document) return;

      const target = selectedItems[0].selectionRange;
      editor.selections = [new Selection(target.start, target.start)];
      editor.revealRange(new Range(editor.selections[0].active, editor.selections[0].active), TextEditorRevealType.InCenter);
      qp.hide();
    });

    // refreshButton
    // make the filtered version first and save it, then, if called, make the All version and save it
    qp.onDidTriggerButton(async button => {
      const document = window.activeTextEditor?.document;
      if (!document) return;

      if (button === refreshButton) {
        if (this.symbolDepthMap.size) {
          if (this.filterState === 'filtered') {
            if (!this.allDepthMap.size)
              this.allDepthMap = await unfilteredDepthMap(this.arrowFunctionSymbols, this.symbolDepthMap);
            if (this.allDepthMap.size) {
              await this.render(this.allDepthMap);
              this.filterState = 'not filtered';
            }
          } else {
            if (!this.filteredDepthMap.size)
              this.filteredDepthMap = await filterDepthMap(this.arrowFunctionSymbols, this.symbolDepthMap, this.kbSymbolsSaved);
            if (this.filteredDepthMap.size) {
              await this.render(this.filteredDepthMap);
              this.filterState = 'filtered';
            }
          }
        } else if (this.allDocNodes.length) {
          if (this.filterState === 'filtered') {
            if (!this.allDocNodes.length)
              this.allDocNodes = await collectSymbolItemsFromSource(document);
            if (this.allDocNodes.length) {
              await this.render(this.allDocNodes);
              this.filterState = 'not filtered';
            }
          } else {
            if (!this.filteredDocNodes.length)
              this.filteredDocNodes = await filterDocNodes(this.kbSymbolsSaved, this.allDocNodes);
            if (this.filteredDocNodes.length) {
              await this.render(this.filteredDocNodes);
              this.filterState = 'filtered';
            }
          }
        }
      }
    });

    // click the OK button WITH a selection
    // if !canSelectMany this fires with each selection
    // qp.onDidAccept(() => {
    // 	const selected = qp.selectedItems[0];
    // 	vscode.window.showInformationMessage(`You selected: ${selected.label}`);
    // 	qp.hide();
    // });

    qp.onDidHide(() => qp.dispose());
    qp.show();
  }
}