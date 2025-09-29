import {SymMap, NodePickItems} from './types';
import {buildSymMap} from './symbolKindMap';


// docNodes are all of the document's nodes, unfiltered
// docNodes are obtained using tsc
export async function filterDocNodes(kbSymbols: (keyof SymMap)[], docNodes: NodePickItems): Promise<NodePickItems> {

  const filteredDocNodes: NodePickItems = [];

  const symMap = buildSymMap(kbSymbols);
  if (!symMap) return docNodes;

  for await (const symbol of docNodes) {

    let match = false;

    if (Object.keys(symMap).includes(symbol.kind)) {
      filteredDocNodes.push(symbol);
      match = true;
    }

    // else if (has children and at least one of those is the right kind)
    // if (!match && symbol.children.length) {
    //   const found = hasMatchingSymbol([symbol], symMap, symMapHasFunction, isRightKind);  // predicate is isRightKind
    //   if (found) mergedMap.set(symbol, depth);
    // }
  }
  return filteredDocNodes || docNodes;
}
