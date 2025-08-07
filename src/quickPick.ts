import {
  DocumentSymbol, window, Uri, commands, ThemeIcon,
  QuickPickItemButtonEvent, Position, Range, Selection, TextEditorRevealType
} from 'vscode';

import * as arrowFunctions from './arrowFunctions';
import {makeDepthMapWithFunctionVariables, makeDepthMapWithAllVariables} from './sort';
import {traverseSymbols} from './qpTraverse';
import {SymMap, QuickPickItemRange} from './types';
import {mapKindToNameAndIconPath} from './symbolKindMap';

let docSymbols: DocumentSymbol[] = [];
let symbolDepthMap: Map<DocumentSymbol, number> = new Map();
let currentUri: Uri;
let refreshSymbols: boolean = true;

let usesArrowFunctions: boolean = false;
let arrowFunctionSymbols: DocumentSymbol[] = [];
export {usesArrowFunctions, arrowFunctionSymbols};

let kbSymbolsSaved: (keyof SymMap)[];
let filterState: string = "not filtered";


/** 
 * Setter for the "global" refreshSymbols
 * Needed if refreshSymbols was exported, to be used in onDidChangeTextDocument().
 */
export function updateGlobalRefresh(refresh: boolean) {
  refreshSymbols = refresh;
}

/**
 * 
 */
export async function getSymbols(kbSymbols: (keyof SymMap)[]): Promise<Map<DocumentSymbol, number> | undefined> {

  const editor = window.activeTextEditor;
  const document = editor?.document;
  if (!document) return undefined;

  kbSymbolsSaved = kbSymbols;

  // current document was  or  current document is not the one for which the symbols were retrieved
  if (refreshSymbols || currentUri !== document.uri) {
    docSymbols = await commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);

    refreshSymbols = false;
    currentUri = document.uri;

    // TODO: loosen this, might catch anonymous functions and/or lambda functions
    if (!!document?.languageId.match(/javascript|typescript/))
      usesArrowFunctions = true;

    // usesArrowFunctions = true;

    if (usesArrowFunctions) {
      arrowFunctionSymbols = await arrowFunctions.makeSymbolsFromFunctionExpressions(document) || [];
    }
    else arrowFunctionSymbols = [];

    if (docSymbols) {
      symbolDepthMap.clear();
      symbolDepthMap = traverseSymbols(docSymbols, symbolDepthMap);
    }
  }

  if (symbolDepthMap.size) {
    return await makeDepthMapWithFunctionVariables(arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);
  }
};


/**
 * Show a QuickPick of the document symbols in options 'symbols'
 */
export async function render(mergedDepthMap: Map<DocumentSymbol, number>) {

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

  mergedDepthMap.forEach((depth, symbol) => {
    let label = symbol.name;
    // if (depth) label = ('  ⮡  ' + symbol.name).padStart(symbol.name?.length + 5 + (depth * 45, ' ');
    if (depth) label = ('⮩  ' + symbol.name).padStart(symbol.name?.length + 3 + (depth * 3), ' ');
    // if (depth) label = (' $(chevron-right) ' + symbol.name).padStart(symbol.name?.length + 3 + (depth * 3), ' ');

    qpItems.push({
      // do a reverse mapping from symbol.kind -> "class", "function", etc.
      description: ` (${mapKindToNameAndIconPath.get(symbol.kind)?.name})`, // var => arrow fn
      // detail: 'detail here',  // shows as a second line under the label - description

      label: label,
      range: symbol.range,
      selectionRange: symbol.selectionRange,
      buttons: [selectButton],

      // iconPath: new vscode.ThemeIcon('symbol-function'),  // this works
      iconPath: mapKindToNameAndIconPath.get(symbol.kind)?.iconPath ?? new ThemeIcon('')
    });
  });

  const qp = window.createQuickPick<QuickPickItemRange>();
  qp.items = qpItems;
  // qp.canSelectMany = true;
  qp.title = 'Select Symbols';
  qp.matchOnDescription = true;  // so can filter by '(class)', '(function)', etc. !!

  qp.buttons = [filterButton];
  // qp.buttons = [filterButton, refreshButton];

  qp.onDidTriggerItemButton((event: QuickPickItemButtonEvent<QuickPickItemRange>) => {

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
    editor.revealRange(new Range(editor.selections[0].anchor, editor.selections[0].active), TextEditorRevealType.InCenter);  // Default = 0, as little scrolling as necessary

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


  qp.onDidTriggerButton(async button => {
    if (button === filterButton) {
      // keep track of filter state

      if (symbolDepthMap.size) {
        if (filterState === "not filtered") {
          const merged = await makeDepthMapWithAllVariables(arrowFunctionSymbols, symbolDepthMap);
          // const merged = await makeDepthMapWithFunctionVariables(arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);

          if (merged) {
            await module.exports.render(merged);
            filterState = "filtered";
          }
        }

        else {
          const merged = await makeDepthMapWithFunctionVariables(arrowFunctionSymbols, symbolDepthMap, kbSymbolsSaved);
          if (merged) {
            await module.exports.render(merged);
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
  console.log();
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
