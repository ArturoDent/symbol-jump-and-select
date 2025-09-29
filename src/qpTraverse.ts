import {DocumentSymbol, SymbolKind, TextDocument} from 'vscode';
import {compareRanges} from './depthMap';
import {SymbolMap} from './types';


/**
 * Called from quickpick.ts
 * Visit all symbols and children, Map symbol to its depth.
 * If no symbol.detail add the symbol text if the symbol is a string.
 * Useful when parent is an array and the 'name' is just 0/1/2/etc. array indices.
 */
// export function traverseSymbols(symbols: DocumentSymbol[], symbolDepthMap: Map<DocumentSymbol, number>) {
export function traverseSymbols(symbols: DocumentSymbol[], symbolDepthMap: SymbolMap, document: TextDocument) {
  const visit = (symbol: DocumentSymbol, depth: number) => {
    if (!symbol.detail.length && symbol.kind === SymbolKind.String) {
      const text = document.getText(symbol.range);
      symbol.detail = text;
    }
    symbolDepthMap.set(symbol, depth);
    // becuase else children are returned alphabetically *?!!
    symbol.children.sort(compareRanges).forEach(child => visit(child, depth + 1));
  };

  symbols.forEach(symbol => visit(symbol, 0));
  return symbolDepthMap;
}