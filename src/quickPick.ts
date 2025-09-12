import {
  DocumentSymbol, window, TextDocument, Uri, commands, ThemeIcon,
  QuickPickItemButtonEvent, Position, Range, Selection, TextEditorRevealType
} from 'vscode';

// const Fuse = require('fuse.js');

import * as arrowFunctions from './arrowFunctions';
import {makeDepthMapWithFunctionVariables, makeDepthMapWithAllVariables} from './sort';
import {traverseSymbols} from './qpTraverse';
import {SymMap, QuickPickItemRange, SymbolMap, NodePickItem, NodePickItems} from './types';
import {mapKindToNameAndIconPath} from './symbolKindMap';
import {collectSymbolItemsFromSource} from './nodeList';

import {refreshSymbols, currentUri, updateGlobalRefresh, updateGlobalUri} from './extension';
import {isMap} from 'util/types';

// interface QuickPickItemRange extends QuickPickItem {
//   range: Range,
//   selectionRange: Range;
// }

let docSymbols: DocumentSymbol[] = [];

// let symbolDepthMap: Map<DocumentSymbol, number> = new Map();
let symbolDepthMap: SymbolMap = new Map();
// let filteredDepthMap: Map<DocumentSymbol, number> = new Map();
let filteredDepthMap: SymbolMap = new Map();
// let allDepthMap: Map<DocumentSymbol, number> = new Map();
let allDepthMap: SymbolMap = new Map();

export let arrowFunctionSymbols: DocumentSymbol[] = [];


// let docSymbols: DocumentSymbol[] = [];
// let symbolDepthMap: Map<DocumentSymbol, number> = new Map();
// let currentUri: Uri;
// let refreshSymbols: boolean = true;
// let useTSC: boolean = true;


// let usesArrowFunctions: boolean = false;
// let arrowFunctionSymbols: DocumentSymbol[] = [];
// export {usesArrowFunctions, arrowFunctionSymbols};

let kbSymbolsSaved: (keyof SymMap)[];
let filterState: string = "not filtered";


export async function getNodes(document: TextDocument): Promise<NodePickItems | undefined> {
  return collectSymbolItemsFromSource(document);
}

/**
 * 
 */
// export async function getSymbols(kbSymbols: (keyof SymMap)[], document: TextDocument, usesArrowFunctions: boolean): Promise<Map<DocumentSymbol, number> | undefined> {
export async function getSymbols(kbSymbols: (keyof SymMap)[], document: TextDocument, usesArrowFunctions: boolean): Promise<SymbolMap | undefined> {

  kbSymbolsSaved = kbSymbols;

  // current document was  or  current document is not the one for which the symbols were retrieved
  if (refreshSymbols || currentUri !== document.uri) {
    docSymbols = await commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);

    updateGlobalRefresh(false);
    updateGlobalUri(document.uri);

    if (usesArrowFunctions) {
      arrowFunctionSymbols = await arrowFunctions.makeSymbolsFromFunctionExpressions(document) || [];
    }
    else arrowFunctionSymbols = [];

    if (docSymbols) {
      symbolDepthMap.clear();
      symbolDepthMap = traverseSymbols(docSymbols, symbolDepthMap);
    }
  }

  // this is the filtering step and merging the arrowFunctions
  if (symbolDepthMap.size) {
    // return await makeDepthMapWithFunctionVariables(arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);
    filteredDepthMap = await makeDepthMapWithFunctionVariables(arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);
    return filteredDepthMap;
  }

  return undefined;
};


/**
 * Show a QuickPick of the document symbols in options 'symbols'
 */
// export async function render(mergedDepthMap: Map<DocumentSymbol, number>) {
// export async function render(items: NodePickItem[]) {
// export async function render(items: NodePickItem[] | Map<DocumentSymbol, number>) {
export async function render(items: NodePickItems | SymbolMap) {

  const doc = window.activeTextEditor?.document;
  if (!doc) return;

  const filterButton = {
    iconPath: new ThemeIcon('filter'),
    tooltip: 'Toggle Filter'
  };

  // const refreshButton = {
  //   iconPath: new ThemeIcon('refresh'),
  //   tooltip: 'Refresh list'
  // };

  const selectButton = {
    iconPath: new ThemeIcon('selection'),
    tooltip: 'Select Symbol'
  };

  let qpItems: QuickPickItemRange[] = [];

  if (isMap(items)) {  // for SymbolMap, non-tsc

    items.forEach((depth, symbol) => {
      let label = symbol.name;
      // if (depth) label = ('  ⮡  ' + symbol.name).padStart(symbol.name?.length + 5 + (depth * 45, ' ');
      if (depth) label = ('⮩  ' + symbol.name).padStart(symbol.name?.length + 3 + (depth * 3), ' ');
      // TODO: get └─ from below

      qpItems.push({
        // do a reverse mapping from symbol.kind -> "class", "function", etc.
        description: ` (${mapKindToNameAndIconPath.get(symbol.kind)?.name})`, // var => arrow fn

        label: label,
        range: symbol.range,
        selectionRange: symbol.selectionRange,
        buttons: [selectButton],

        // iconPath: new vscode.ThemeIcon('symbol-function'),  // this works
        iconPath: mapKindToNameAndIconPath.get(symbol.kind)?.iconPath ?? new ThemeIcon('')
      });
    });
  }

  else if (Array.isArray(items)) {  // for NodePickItems, using tsc

    // const doc = window.activeTextEditor?.document;

    items.forEach(item => {
      let label = item.label;
      // if (depth) label = ('  ⮡  ' + symbol.name).padStart(symbol.name?.length + 5 + (depth * 45, ' ');
      // if (item.depth > 0) label = ('⮩  ' + label).padStart(item.label!.length + 3 + (item.depth * 3), ' ');
      if (item.depth > 0) label = ('└─  ' + label).padStart(item.label!.length + (item.depth * 10), ' ');
      // if (depth) label = (' $(chevron-right) ' + symbol.name).padStart(symbol.name?.length + 3 + (depth * 3), ' ');

      qpItems.push({
        // do a reverse mapping from symbol.kind -> "class", "function", etc.
        // description: ` (${mapKindToNameAndIconPath.get(item.kind)?.name})`, // var => arrow fn
        // TODO: do the line numbers add anything ??
        // description: `[ ${item.detail} ]  ::  ${doc.positionAt(item.pos).line + 1}`, // var => arrow fn

        // label: label ,     // coerce to non-null: Non‑null Assertion Operator
        label: `${label}   ---  [ ${item.detail} ]`,     // coerce to non-null: Non‑null Assertion Operator
        range: item.range,
        selectionRange: item.selectionRange,
        buttons: [selectButton],

        // iconPath: new vscode.ThemeIcon('symbol-function'),  // this works
        // iconPath: mapKindToNameAndIconPath.get(symbol.kind)?.iconPath ?? new ThemeIcon('')  // use this
      });
    });
  }

  const qp = window.createQuickPick<QuickPickItemRange>();
  qp.items = qpItems;
  qp.title = 'Select Symbols';
  // qp.matchOnDescription = true;  // so can filter by '(class)', '(function)', etc. !!

  // TODO: can this be used to control the order of QuickPickItems shown??
  qp.onDidChangeValue(event => {
    console.log();
    // just do a sort by start/range here??
  });

  qp.buttons = [filterButton];
  // qp.buttons = [filterButton, refreshButton];

  qp.onDidTriggerItemButton((event: QuickPickItemButtonEvent<QuickPickItemRange>) => {

    const editor = window.activeTextEditor;
    const document = editor?.document;
    if (!document) return;

    const target = event.item;

    // let extendedRange = event.item.selectionRange;
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
  qp.onDidChangeSelection((selectedItems: readonly QuickPickItemRange[]) => {
    const editor = window.activeTextEditor;
    const document = editor?.document;
    if (!document) return;

    const target: Range = selectedItems[0].selectionRange;
    editor.selections = [new Selection(target.start, target.start)];
    editor.revealRange(new Range(editor.selections[0].active, editor.selections[0].active), TextEditorRevealType.InCenter);  // Default = 0, as little scrolling as necessary

    qp.hide();
  });


  // make the filtered version first and save it, then, if called, make the All version and save it
  qp.onDidTriggerButton(async button => {
    if (button === filterButton) {
      // keep track of filter state

      if (symbolDepthMap.size) {

        if (filterState === "not filtered") {
          // or check for nodeTree
          if (!allDepthMap.size)
            allDepthMap = await makeDepthMapWithAllVariables(arrowFunctionSymbols, symbolDepthMap);
          if (allDepthMap.size) {
            await module.exports.render(allDepthMap);
            filterState = "filtered";
          }
        }

        else {
          if (!filteredDepthMap.size)
            filteredDepthMap = await makeDepthMapWithFunctionVariables(arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);
          if (filteredDepthMap.size) {
            await module.exports.render(filteredDepthMap);
            filterState = "not filtered";
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

  qp.onDidHide(() => {
    qp.dispose();
  });

  qp.show();
};


/**
 * Select in QP only
 * 
 */
function onSelect() {

  // GOTO arguments[0].range, if arguments.length
  // console.log();
}


/**
 * 
 * @param symbolKind 
 */
function map(symbolKind: number): ThemeIcon {

  const mapping = [
    new ThemeIcon('symbol-file'),
    new ThemeIcon('symbol-module'),
    new ThemeIcon('symbol-namespace'),
    new ThemeIcon('symbol-package'),
    new ThemeIcon('symbol-class'),
    new ThemeIcon('symbol-method'),
    new ThemeIcon('symbol-property'),
    new ThemeIcon('symbol-field'),
    new ThemeIcon('symbol-constructor'),
    new ThemeIcon('symbol-enum'),
    new ThemeIcon('symbol-interface'),
    new ThemeIcon('symbol-function'),
    new ThemeIcon('symbol-variable'),
    new ThemeIcon('symbol-constant'),
    new ThemeIcon('symbol-string'),
    new ThemeIcon('symbol-number'),
    new ThemeIcon('symbol-boolean'),
    new ThemeIcon('symbol-array'),
    new ThemeIcon('symbol-object'),
    new ThemeIcon('symbol-key'),
    new ThemeIcon('symbol-null'),
    new ThemeIcon('symbol-enum-member'),
    new ThemeIcon('symbol-struct'),
    new ThemeIcon('symbol-event'),
    new ThemeIcon('symbol-operator'),
    new ThemeIcon('symbol-type-parameter')
  ];

  return mapping[symbolKind];
}

/**
 * 
 * @param symbolKind 
 */
function mapToKind(symbolKind: number): string {

  const mapping = [
    'file',
    'module',
    'namespace',
    'package',
    'class',
    'method',
    'property',
    'field',
    'constructor',
    'enum',
    'interface',
    'function',
    'variable',
    'constant',
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'key',
    'null',
    'enumMember',
    'struct',
    'event',
    'operator',
    'typeParameter'
  ];

  return mapping[symbolKind];
}


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

// export {usesArrowFunctions, arrowFunctionSymbols, kbSymbolsHasFunction, kbSymbolsHasVariable};
