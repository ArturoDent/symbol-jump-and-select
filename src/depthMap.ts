import {DocumentSymbol, SymbolKind} from 'vscode';
import {buildSymMap} from './symbolKindMap';
import {SymMap, SymbolMap, QuickPickItemRange} from './types';


/**   
 * For fuzzSearching on QuickPickItems: put them into their proper positional order
 * @returns 1 = isAfter, -1 = isBefore
 */
export function sortQPItems(qp1: QuickPickItemRange, qp2: QuickPickItemRange) {
  // this.name = 'compareRanges';  // becuase of the function compareRanges(symbol1, symbol2) above !!
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#function_expression
  if ((qp1.range.start.isBefore(qp2.range.start))) return -1;
  else if ((qp1.range.start.isAfter(qp2.range.start))) return 1;
  else return 0;
};

/**   
 * For .sort(compareRanges): put them into their proper positional order
 * Used in nextStart/End  and childStart/End to go to next FIRST matching symbol
 * @returns 1 = isAfter, -1 = isBefore
 */
export function compareRanges(symbol1: DocumentSymbol, symbol2: DocumentSymbol) {
  // this.name = 'compareRanges';  // becuase of the function compareRanges(symbol1, symbol2) above !!
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#function_expression
  if ((symbol1.range.start.isBefore(symbol2.range.start))) return -1;
  else if ((symbol1.range.start.isAfter(symbol2.range.start))) return 1;
  else return 0;
};


/**   
 * For .sort(compareRangesReverse): put them into their proper reversed positional order
 * Used in previousStart/End to go to previous LAST matching symbol
 *  @returns -1 = isAfter, 1 = isBefore
 */
export function compareRangesReverse(symbol1: DocumentSymbol, symbol2: DocumentSymbol) {
  // this.name = 'compareRangesReverse';// becuase of the function compareRangesReverse(symbol1, symbol2) above !!
  if ((symbol1.range.start.isBefore(symbol2.range.start))) return 1;
  else if ((symbol1.range.start.isAfter(symbol2.range.start))) return -1;
  else return 0;
};


/**
 * Not currently used.
 * Only used in dedupeSymbols. 
 * Compare 2 DocumentSymbols to see if they are the same name, range and selectionRange
 */
// function symbolsAreEqual(symA: DocumentSymbol, symB: DocumentSymbol): boolean {
//   return (
//     symA.name === symB.name &&
//     symA.range.isEqual(symB.range) &&
//     symA.selectionRange.isEqual(symB.selectionRange)
//   );
// };


/**
 * Not currently used.
 */
// export function dedupeSymbols(symbols: DocumentSymbol[]): DocumentSymbol[] {

//   const unique: DocumentSymbol[] = [];

//   for (const sym of symbols) {
//     if (!unique.some(existing => symbolsAreEqual(existing, sym))) {
//       unique.push(sym);
//     }
//   }
//   return unique;
// };


/**
 * Replace arrow function variables with SymbolKind.Function.
 * Filter for keybinding "symbols".
 * Don't include other variables UNLESS there is some child of the right kind.
 */
export async function filterDepthMap(usesArrowFunctions: boolean, arrowFunctionSymbols: DocumentSymbol[], symbolDepthMap: SymbolMap, kbSymbols: (keyof SymMap)[]): Promise<SymbolMap> {

  let mergedMap = new Map();

  const symMap = buildSymMap(kbSymbols);
  if (!symMap) return mergedMap;  // return an empty mergeMap

  let symMapHasVariable = Object.values(symMap).includes(SymbolKind.Variable);
  let symMapHasFunction = Object.values(symMap).includes(SymbolKind.Function);

  for await (const [symbol, depth] of symbolDepthMap) {

    let match = false;

    if (usesArrowFunctions && (symMapHasFunction || symMapHasVariable)) {
      if (symbol.kind === SymbolKind.Variable && arrowFunctionSymbols.length) {
        let isArrowFunction = !!arrowFunctionSymbols.find((arrowFunction: DocumentSymbol) => {
          return arrowFunction.range.isEqual(symbol.range);
        });
        if (isArrowFunction) {
          symbol.kind = SymbolKind.Function;
          mergedMap.set(symbol, depth);
          match = true;
        }
      }
    }

    if (!match && Object.values(symMap).includes(symbol.kind)) {
      mergedMap.set(symbol, depth);
      match = true;
    }

    // else if (has children and at least one of those is the right kind)
    if (!match && symbol.children.length) {
      const found = hasMatchingSymbol(usesArrowFunctions, arrowFunctionSymbols, [symbol], symMap, symMapHasFunction, isRightKind);  // predicate is isRightKind
      if (found) mergedMap.set(symbol, depth);
    }
  }
  return mergedMap;
};

/**
 * Recursively checks if any DocumentSymbol or its children satisfy the predicate.
 * Returns true on first match (early exit).
 * @param predicate - isRightKind() is used here.
 */
function hasMatchingSymbol(usesArrowFunctions: boolean, arrowFunctions: DocumentSymbol[], symbols: DocumentSymbol[], symMap: SymMap, symMapHasFunction: boolean, predicate: Function): boolean {
  for (const symbol of symbols) {
    if (predicate(usesArrowFunctions, symbol, symMap, symMapHasFunction)) {
      return true;
    }
    if (Array.isArray(symbol.children) && symbol.children.length > 0) {
      if (hasMatchingSymbol(usesArrowFunctions, arrowFunctions, symbol.children, symMap, symMapHasFunction, predicate)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Replace arrow function variables with SymbolKind.Function.
 * Include all other variables in the map returned.  Unfiltered.
 */
export async function unfilteredDepthMap(usesArrowFunctions: boolean, arrowFunctionSymbols: DocumentSymbol[], symbolDepthMap: SymbolMap): Promise<SymbolMap> {

  let mergedMap = new Map();

  for await (const [symbol, depth] of symbolDepthMap) {

    if (symbol.kind === SymbolKind.Variable && arrowFunctionSymbols && usesArrowFunctions) {
      let isArrowFunction = !!arrowFunctionSymbols.find(arrowFunction => {
        return arrowFunction.range.isEqual(symbol.range);
      });
      if (isArrowFunction) {
        symbol.kind = SymbolKind.Function;
        mergedMap.set(symbol, depth);
      }
      else mergedMap.set(symbol, depth);
    }
    else mergedMap.set(symbol, depth);
  }
  return mergedMap;
};

/**
 * Is the 'symbol' either in the symbols option or is it an arrowFunction (AND we want functions)
 */
function isRightKind(usesArrowFunctions: boolean, arrowFunctions: DocumentSymbol[], symbol: DocumentSymbol, symMap: SymMap, symMapHasFunction: boolean): boolean {

  if (Object.values(symMap).includes(symbol.kind)) return true;

  else if (symbol.kind === SymbolKind.Variable && symMapHasFunction && arrowFunctions?.length && usesArrowFunctions) {
    let isArrowFunction = !!arrowFunctions.find(arrowFunction => {
      return arrowFunction.range.isEqual(symbol.range);
    });
    if (isArrowFunction) return true;
  }

  return false;
};