import {
  DocumentSymbol, window, TextDocument, commands, ThemeIcon,
  QuickPickItemButtonEvent, Position, Range, Selection, TextEditorRevealType
} from 'vscode';

// import {Settings} from './settings';

import * as arrowFunctions from './arrowFunctions';
import {filterDepthMap, unfilteredDepthMap} from './depthMap';
import {traverseSymbols} from './qpTraverse';
import type {SymMap, SymbolPickItem, SymbolMap, NodePickItems} from './types';
import {mapKindToNameAndIconPath} from './symbolKindMap';
import {collectSymbolItemsFromSource} from './nodeList';
import {filterDocNodes} from './nodeFilter';
import {isMap} from 'util/types';


// import {Fuse, fuseOptions} from './fuzzySearch';
// import fuzzysort from 'fuzzysort';

// local "globals"
let kbSymbolsSaved: (keyof SymMap)[];
let filterState: string = "filtered";

let docSymbols: DocumentSymbol[] = [];
let arrowFunctionSymbols: DocumentSymbol[] = [];

let symbolDepthMap: SymbolMap = new Map();
let filteredDepthMap: SymbolMap = new Map();
let allDepthMap: SymbolMap = new Map();

let allDocNodes: NodePickItems = [];
let filteredDocNodes: NodePickItems = [];


// Get the Nodes using tsc, and return filtered nodes
export async function getNodes(kbSymbols: (keyof SymMap)[], getNewNodes: boolean, document: TextDocument): Promise<NodePickItems | undefined> {

  kbSymbolsSaved = kbSymbols;

  if (getNewNodes) {
    allDocNodes = await collectSymbolItemsFromSource(document);

    symbolDepthMap.clear();
    filteredDepthMap.clear();
    allDepthMap.clear();

    filteredDocNodes = [];
    docSymbols = [];
  }

  if (allDocNodes) {
    // if no kbSymbols, don't bother to filter // can that ever happen - defaults to all?
    filteredDocNodes = await filterDocNodes(kbSymbols, allDocNodes);
  }

  return filteredDocNodes;
}

/**
 * 1. Get doc symbols from vscode.executeDocumentSymbolProvider
 * 2. Build an array of symbols for arrow functions (else identified as variables)
 * 3. Build a depth map of all symbols
 * 4. Filter the depth map for keybinding "symbols"
 */
export async function getSymbols(kbSymbols: (keyof SymMap)[], getNewSymbols: boolean, isJSTS: boolean, document: TextDocument,): Promise<SymbolMap | undefined> {

  kbSymbolsSaved = kbSymbols;

  // current document was  or  current document is not the one for which the symbols were retrieved
  if (getNewSymbols) {
    docSymbols = await commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);

    symbolDepthMap.clear();
    filteredDepthMap.clear();
    allDepthMap.clear();

    allDocNodes = [];
    filteredDocNodes = [];

    if (isJSTS) {
      arrowFunctionSymbols = await arrowFunctions.makeSymbolsFromFunctionExpressions(document) || [];
    }
    else arrowFunctionSymbols = [];

    if (docSymbols) {          // in if (getNewSymbols)
      symbolDepthMap.clear();
      symbolDepthMap = traverseSymbols(docSymbols, symbolDepthMap, document);
    }
  }

  // this is the filtering step and merges the arrowFunctions
  if (symbolDepthMap.size) {
    filteredDepthMap = await filterDepthMap(isJSTS, arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);
    return filteredDepthMap;
  }

  return undefined;
};


/**
 * Show a QuickPick of the document symbols in options 'symbols'
 */
export async function render(isJSTS: boolean, items: NodePickItems | SymbolMap) {

  const doc = window.activeTextEditor?.document;
  if (!doc) return;

  filterState = "filtered";

  const filterButton = {
    iconPath: new ThemeIcon('filter'),
    tooltip: 'Toggle Filter'
  } as const;

  // const refreshButton = {
  //   iconPath: new ThemeIcon('refresh'),
  //   tooltip: 'Refresh list'
  // };

  const selectButton = {
    iconPath: new ThemeIcon('selection'),
    tooltip: 'Select Symbol'
  } as const;

  let qpItems: SymbolPickItem[] = [];

  if (isMap(items)) {  // for SymbolMap, non-tsc

    items.forEach((depth, symbol) => {
      let label = `${symbol.name}: ${symbol.detail}`;
      if (depth) label = ('└─  ' + label).padStart(label.length + (depth * 10), ' ');

      qpItems.push({
        // do a reverse mapping from symbol.kind -> "class", "function", etc.
        // description: ` (${mapKindToNameAndIconPath.get(symbol.kind)?.name})`, // var => arrow fn

        label: label + ` --- (${mapKindToNameAndIconPath.get(symbol.kind)?.name})`,
        range: symbol.range,
        selectionRange: symbol.selectionRange,
        buttons: [selectButton],
      });
    });
  }

  else if (Array.isArray(items)) {  // for NodePickItems, using tsc

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

  qp.buttons = [filterButton];
  // qp.buttons = [filterButton, refreshButton];


  // this is for "filtering/searching" in the QuickPick
  // fuzzysort performs fuzzy searching
  // qp.onDidChangeValue(newValue => {

  //   if (!newValue) {       // for when QuickPick input is empty
  //     qp.items = qpItems;
  //     return;
  //   }

  //   // const results = fuzzysort.go(newValue, qpItems, {key: "label"});
  //   const results = fuzzysort.go(newValue, qpItems, {key: "label"});
  //   qp.items = results.map((result: any) => result.obj)
  //     .sort(sortQPItems);
  // });


  qp.onDidTriggerItemButton((event: QuickPickItemButtonEvent<SymbolPickItem>) => {

    const editor = window.activeTextEditor;
    const document = editor?.document;
    if (!document) return;

    const target = event.item;

    let extendedRange;
    const lastLineLength = document.lineAt(target.range.end).text.length;

    extendedRange = target.range.with({
      start: new Position(target.range.start.line, 0),
      end: new Position(target.range.end.line, lastLineLength)
    });

    editor.selections = [new Selection(extendedRange.end, extendedRange.start)];
    editor.revealRange(new Range(editor.selections[0].anchor, editor.selections[0].active), TextEditorRevealType.Default);  // Default = 0, as little scrolling as necessary

    qp.hide();
  });


  // select an item
  qp.onDidChangeSelection((selectedItems: readonly SymbolPickItem[]) => {
    const editor = window.activeTextEditor;
    const document = editor?.document;
    if (!document) return;

    const target: Range = selectedItems[0].selectionRange;
    editor.selections = [new Selection(target.start, target.start)];
    editor.revealRange(new Range(editor.selections[0].active, editor.selections[0].active), TextEditorRevealType.InCenter);  // Default = 0, as little scrolling as necessary

    qp.hide();
  });


  // filterButton
  // make the filtered version first and save it, then, if called, make the All version and save it
  qp.onDidTriggerButton(async button => {

    const document = window.activeTextEditor?.document;
    if (!document) return;

    if (button === filterButton) {
      if (symbolDepthMap.size) {
        if (filterState === "filtered") {
          if (!allDepthMap.size)
            allDepthMap = await unfilteredDepthMap(isJSTS, arrowFunctionSymbols, symbolDepthMap);
          if (allDepthMap.size) {
            // await module.exports.render(isJSTS, allDepthMap);
            await render(isJSTS, allDepthMap);
            filterState = "not filtered";
          }
        }
        else {
          if (!filteredDepthMap.size)
            filteredDepthMap = await filterDepthMap(isJSTS, arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);
          if (filteredDepthMap.size) {
            await render(isJSTS, filteredDepthMap);
            filterState = "filtered";
          }
        }
      }
      // might allDocNodes still be set from previous document?
      else if (allDocNodes.length) {
        if (filterState === "filtered") {
          if (!allDocNodes.length)
            allDocNodes = await collectSymbolItemsFromSource(document);
          if (allDocNodes.length) {
            await render(isJSTS, allDocNodes);
            filterState = "not filtered";
          }
        }
        else {
          if (!filteredDocNodes.length)
            filteredDocNodes = await filterDocNodes(kbSymbolsSaved, allDocNodes);
          if (filteredDocNodes.length) {
            await render(isJSTS, filteredDocNodes);
            filterState = "filtered";
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
};


/**
 * Select in QP only
 *
 */
// function onSelect() {

//   // GOTO arguments[0].range, if arguments.length
//   // console.log();
// }


/**
 *
 * @param symbolKind
 */
// function map(symbolKind: number): ThemeIcon {

//   const mapping = [
//     new ThemeIcon('symbol-file'),
//     new ThemeIcon('symbol-module'),
//     new ThemeIcon('symbol-namespace'),
//     new ThemeIcon('symbol-package'),
//     new ThemeIcon('symbol-class'),
//     new ThemeIcon('symbol-method'),
//     new ThemeIcon('symbol-property'),
//     new ThemeIcon('symbol-field'),
//     new ThemeIcon('symbol-constructor'),
//     new ThemeIcon('symbol-enum'),
//     new ThemeIcon('symbol-interface'),
//     new ThemeIcon('symbol-function'),
//     new ThemeIcon('symbol-variable'),
//     new ThemeIcon('symbol-constant'),
//     new ThemeIcon('symbol-string'),
//     new ThemeIcon('symbol-number'),
//     new ThemeIcon('symbol-boolean'),
//     new ThemeIcon('symbol-array'),
//     new ThemeIcon('symbol-object'),
//     new ThemeIcon('symbol-key'),
//     new ThemeIcon('symbol-null'),
//     new ThemeIcon('symbol-enum-member'),
//     new ThemeIcon('symbol-struct'),
//     new ThemeIcon('symbol-event'),
//     new ThemeIcon('symbol-operator'),
//     new ThemeIcon('symbol-type-parameter')
//   ];

//   return mapping[symbolKind];
// }

/**
 *
 * @param symbolKind
 */
// function mapToKind(symbolKind: number): string {

//   const mapping = [
//     'file',
//     'module',
//     'namespace',
//     'package',
//     'class',
//     'method',
//     'property',
//     'field',
//     'constructor',
//     'enum',
//     'interface',
//     'function',
//     'variable',
//     'constant',
//     'string',
//     'number',
//     'boolean',
//     'array',
//     'object',
//     'key',
//     'null',
//     'enumMember',
//     'struct',
//     'event',
//     'operator',
//     'typeParameter'
//   ];

//   return mapping[symbolKind];
// }


// /**
//  *
//  */
// function map2(symbolKind: number): {name: string; iconPath: IconPath;} | undefined {

//   let mapping: Map<SymbolKind, {name: string, iconPath: IconPath;}> = new Map();

//   mapping.set(SymbolKind.File, {name: 'file', iconPath: new ThemeIcon('symbol-file')});
//   mapping.set(SymbolKind.Module, {name: 'module', iconPath: new ThemeIcon('symbol-module')});
//   mapping.set(SymbolKind.Namespace, {name: 'namespace', iconPath: new ThemeIcon('symbol-namespace')});
//   mapping.set(SymbolKind.Package, {name: 'package', iconPath: new ThemeIcon('symbol-package')});
//   mapping.set(SymbolKind.Class, {name: 'class', iconPath: new ThemeIcon('symbol-class')});
//   mapping.set(SymbolKind.Method, {name: 'method', iconPath: new ThemeIcon('symbol-method')});
//   mapping.set(SymbolKind.Property, {name: 'property', iconPath: new ThemeIcon('symbol-property')});
//   mapping.set(SymbolKind.Field, {name: 'field', iconPath: new ThemeIcon('symbol-field')});
//   mapping.set(SymbolKind.Constructor, {name: 'constructor', iconPath: new ThemeIcon('symbol-constructor')});
//   mapping.set(SymbolKind.Enum, {name: 'enum', iconPath: new ThemeIcon('symbol-enum')});
//   mapping.set(SymbolKind.Interface, {name: 'interface', iconPath: new ThemeIcon('symbol-interface')});
//   mapping.set(SymbolKind.Function, {name: 'function', iconPath: new ThemeIcon('symbol-function')});
//   mapping.set(SymbolKind.Variable, {name: 'variable', iconPath: new ThemeIcon('symbol-variable')});
//   mapping.set(SymbolKind.Constant, {name: 'constant', iconPath: new ThemeIcon('symbol-constant')});
//   mapping.set(SymbolKind.String, {name: 'string', iconPath: new ThemeIcon('symbol-string')});
//   mapping.set(SymbolKind.Number, {name: 'number', iconPath: new ThemeIcon('symbol-number')});
//   mapping.set(SymbolKind.Boolean, {name: 'boolean', iconPath: new ThemeIcon('symbol-boolean')});
//   mapping.set(SymbolKind.Array, {name: 'array', iconPath: new ThemeIcon('symbol-array')});
//   mapping.set(SymbolKind.Object, {name: 'object', iconPath: new ThemeIcon('symbol-object')});
//   mapping.set(SymbolKind.Key, {name: 'key', iconPath: new ThemeIcon('symbol-key')});
//   mapping.set(SymbolKind.Null, {name: 'null', iconPath: new ThemeIcon('symbol-null')});
//   mapping.set(SymbolKind.EnumMember, {name: 'enumMember', iconPath: new ThemeIcon('symbol-enum-member')});
//   mapping.set(SymbolKind.Struct, {name: 'struct', iconPath: new ThemeIcon('symbol-struct')});
//   mapping.set(SymbolKind.Event, {name: 'event', iconPath: new ThemeIcon('symbol-event')});
//   mapping.set(SymbolKind.Operator, {name: 'operator', iconPath: new ThemeIcon('symbol-operator')});
//   mapping.set(SymbolKind.TypeParameter, {name: 'typeParameter', iconPath: new ThemeIcon('symbol-type-parameter')});

//   if (mapping.has(symbolKind)) return mapping.get(symbolKind);
//   return undefined;
// }
