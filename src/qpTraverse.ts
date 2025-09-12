import {DocumentSymbol} from 'vscode';
import {compareRanges} from './sort';
import {SymbolMap} from './types';




/**
 * Called from quickpick.ts
 * Visit all symbols and children, Map symbol to its depth.
 */
// export function traverseSymbols(symbols: DocumentSymbol[], symbolDepthMap: Map<DocumentSymbol, number>) {
export function traverseSymbols(symbols: DocumentSymbol[], symbolDepthMap: SymbolMap) {
  const visit = (symbol: DocumentSymbol, depth: number) => {
    symbolDepthMap.set(symbol, depth);
    // becuase else children are returned alphabetically *?!!
    symbol.children.sort(compareRanges).forEach(child => visit(child, depth + 1));
  };

  symbols.forEach(symbol => visit(symbol, 0));
  return symbolDepthMap;
}