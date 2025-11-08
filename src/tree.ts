import * as vscode from 'vscode';
import {collectSymbolItemsFromSource, buildNodeTree, filterTree} from './nodeList';
import type {NodeTreeItem, SymMap, SymbolNode} from './types';
import * as Globals from './myGlobals';


export class SymbolsProvider implements vscode.TreeDataProvider<SymbolNode> {

  private _onDidChangeTreeData: vscode.EventEmitter<SymbolNode | undefined | null | void> = new vscode.EventEmitter<SymbolNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SymbolNode | undefined | null | void> = this._onDidChangeTreeData.event;

  private _Globals = Globals.default;

  private view?: vscode.TreeView<SymbolNode>;
  public setView(view: vscode.TreeView<SymbolNode>) {this.view = view;}

  public static locked = false;
  private tree: SymbolNode[] = [];
  private filterQuery: (keyof SymMap)[] | string = '';  // not used, could enable creating a filtered TreeView from a setting

  constructor() {
    // reset when switching editors unless locked
    // TODO: check/update cached symbols?  Like in quickpick.ts
    vscode.window.onDidChangeActiveTextEditor((ev) => {
      if (ev && this._Globals.lastUri !== ev.document.uri) this._Globals.lastUri = ev.document.uri;
      if (ev && !SymbolsProvider.locked) this.refresh('');
    });


    // reset when making changes to doc even if locked
    // is this triggered on a save?
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length)
        this.refresh(this.filterQuery);
    });
  }

  // refresh(): void {
  //   this._onDidChangeTreeData.fire();
  // }

  public async refresh(filterQuery: (keyof SymMap)[] | string): Promise<void> {
    this.filterQuery = filterQuery;

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.tree = [];
      this._onDidChangeTreeData.fire();
      return;
    }

    const uri = editor.document.uri;
    // let docSymbols: vscode.DocumentSymbol[] | NodeTreeItem[];
    let docSymbols: SymbolNode[] | NodeTreeItem[];
    let treeSymbols: SymbolNode[] = [];
    // let treeSymbolsWithParent: SymbolNodeWithParent[] = [];

    if (this._Globals.makeTreeView && this._Globals.useTypescriptCompiler && this._Globals.isJSTS) {
      const nodes = await collectSymbolItemsFromSource(editor.document);
      docSymbols = await buildNodeTree(nodes) as NodeTreeItem[];
      treeSymbols = toSymbolNodesFromNodeTreeItems(docSymbols, uri);
      // treeSymbolsWithParent = await addParentsToSymbolNodes(treeSymbols);
    }
    else if (this._Globals.makeTreeView) {
      // docSymbols = await getDocumentSymbolsWithRetry(uri, 6, 200) as vscode.DocumentSymbol[];
      docSymbols = await getDocumentSymbolsWithRetry(uri, 6, 200) as SymbolNode[];
      treeSymbols = toSymbolNodesNodefromDocumentSymbols(docSymbols, uri);
      // treeSymbolsWithParent = await addParentsToSymbolNodes(treeSymbols);
    }

    if (filterQuery.length > 0) treeSymbols = await filterTree(filterQuery, treeSymbols);

    if (!treeSymbols) {
      this.tree = [];
      this._onDidChangeTreeData.fire();
      return;
    }

    this.tree = treeSymbols;
    await this.attachParents(this.tree);
    this._onDidChangeTreeData.fire();
  }

  // use SymbolNode.children to assign SymbolNode.parent values
  private async attachParents(roots: SymbolNode[]): Promise<void> {
    function walk(node: SymbolNode, parent?: SymbolNode) {
      node.parent = parent;
      if (node.children && node.children.length) {
        for (const child of node.children) {
          walk(child, node);
        }
      }
    }

    for (const root of roots) {
      walk(root, undefined);
    }
  }

  // this needs getParent(element) to work
  public async expandAll(): Promise<void> {
    if (this.view && this.tree.length) {
      let middleSymbol = await this.getSymbolAtCenterOfViewport();
      let middleSymbolOuterParent = this.tree[0];

      if (middleSymbol) {
        for (const topNode of this.tree) {
          if (topNode.range.contains(middleSymbol.range)) middleSymbolOuterParent = topNode;
        }

        for (const node of this.tree) {
          if (node === middleSymbolOuterParent) continue;
          // Number.MAX_SAFE_INTEGER ensures full expansion
          try {
            await this.view.reveal(node, {expand: Number.MAX_SAFE_INTEGER, focus: false, select: false});
          } catch (e) {
            // ignore reveal failures when tree not visible
          }
        }
        if (middleSymbol) {
          await this.view.reveal(middleSymbolOuterParent, {expand: Number.MAX_SAFE_INTEGER, focus: false, select: false});
          await this.view.reveal(middleSymbol, {expand: Number.MAX_SAFE_INTEGER, focus: true, select: false});
        } else await this.view.reveal(this.tree[0], {expand: Number.MAX_SAFE_INTEGER, focus: true, select: false});
      }
    }
  }

  private async getSymbolAtCenterOfViewport(): Promise<SymbolNode | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return undefined;
    const visible = editor.visibleRanges[0];
    if (!this.view || !this.tree.length || !visible) return undefined;

    const middleLine = Math.floor((visible.start.line + visible.end.line) / 2);

    let middleSymbol: SymbolNode | undefined;
    let minimumDistance = Number.POSITIVE_INFINITY;

    function walk(symbols: SymbolNode[]) {
      for (const s of symbols) {
        // consider the symbol's heading/start line for "nearest" semantics
        const dist = Math.abs(s.selectionRange.start.line - middleLine);
        if (dist < minimumDistance) {
          minimumDistance = dist;
          middleSymbol = s;
        }
        if (s.children && s.children.length) {
          walk(s.children);
        }
      }
    }

    walk(this.tree);
    return middleSymbol;
  }

  getParent(element: SymbolNode): SymbolNode | null {
    return element.parent ?? null;
  }

  getTreeItem(element: SymbolNode): vscode.TreeItem {

    // this._Globals.collapseTreeViewItems === "collapseOnOpen"/"expandOnOpen"

    const item = new vscode.TreeItem(
      element.name,

      element.children && element.children.length > 0
        ? (this._Globals.collapseTreeViewItems === "collapseOnOpen" ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded)
        : vscode.TreeItemCollapsibleState.None

    );

    item.iconPath = new vscode.ThemeIcon(SymbolsProvider.kindToIcon(element.kind));
    item.command = {
      command: 'symbolsTree.revealSymbol',
      title: 'Reveal Symbol',
      arguments: [element]
    };
    item.contextValue = 'symbolNode';
    item.tooltip = `${element.name} — ${vscode.SymbolKind[element.kind]}`;
    return item;
  }

  getChildren(element?: SymbolNode): Thenable<SymbolNode[]> {
    if (!element) {
      return Promise.resolve(this.tree);
    }
    return Promise.resolve(element.children ?? []);
  };

  // getParent(element: SymbolNode): SymbolNode | null {
  //   return element.parent ?? null;
  // }


  public static kindToName(kind: vscode.SymbolKind): string {
    switch (kind) {
      case vscode.SymbolKind.File: return 'file';
      case vscode.SymbolKind.Module: return 'module';
      case vscode.SymbolKind.Namespace: return 'namespace';
      case vscode.SymbolKind.Package: return 'package';
      case vscode.SymbolKind.Class: return 'class';
      case vscode.SymbolKind.Method: return 'method';
      case vscode.SymbolKind.Property: return 'property';
      case vscode.SymbolKind.Field: return 'field';
      case vscode.SymbolKind.Constructor: return 'constructor';
      case vscode.SymbolKind.Enum: return 'enum';
      case vscode.SymbolKind.Interface: return 'interface';
      case vscode.SymbolKind.Function: return 'function';
      case vscode.SymbolKind.Variable: return 'variable';
      case vscode.SymbolKind.Constant: return 'constant';
      case vscode.SymbolKind.String: return 'string';
      case vscode.SymbolKind.Number: return 'number';
      case vscode.SymbolKind.Boolean: return 'boolean';
      case vscode.SymbolKind.Array: return 'array';
      case vscode.SymbolKind.Object: return 'object';
      case vscode.SymbolKind.Key: return 'key';
      case vscode.SymbolKind.Null: return 'null';
      case vscode.SymbolKind.EnumMember: return 'enumMember';
      case vscode.SymbolKind.Struct: return 'struct';
      case vscode.SymbolKind.Event: return 'event';
      case vscode.SymbolKind.Operator: return 'operator';
      case vscode.SymbolKind.TypeParameter: return 'typeParameter';
      default: return 'object';
    }
  }

  public static kindToIcon(kind: vscode.SymbolKind): string {
    switch (kind) {
      case vscode.SymbolKind.File: return 'symbol-file';
      case vscode.SymbolKind.Module: return 'symbol-module';
      case vscode.SymbolKind.Namespace: return 'symbol-namespace';
      case vscode.SymbolKind.Package: return 'symbol-package';
      case vscode.SymbolKind.Class: return 'symbol-class';
      case vscode.SymbolKind.Method: return 'symbol-method';
      case vscode.SymbolKind.Property: return 'symbol-property';
      case vscode.SymbolKind.Field: return 'symbol-field';
      case vscode.SymbolKind.Constructor: return 'symbol-constructor';
      case vscode.SymbolKind.Enum: return 'symbol-enum';
      case vscode.SymbolKind.Interface: return 'symbol-interface';
      case vscode.SymbolKind.Function: return 'symbol-function';
      case vscode.SymbolKind.Variable: return 'symbol-variable';
      case vscode.SymbolKind.Constant: return 'symbol-constant';
      case vscode.SymbolKind.String: return 'symbol-string';
      case vscode.SymbolKind.Number: return 'symbol-number';
      case vscode.SymbolKind.Boolean: return 'symbol-boolean';
      case vscode.SymbolKind.Array: return 'symbol-array';
      case vscode.SymbolKind.Object: return 'symbol-object';
      case vscode.SymbolKind.Key: return 'symbol-key';
      case vscode.SymbolKind.Null: return 'symbol-null';
      case vscode.SymbolKind.EnumMember: return 'symbol-enum-member';
      case vscode.SymbolKind.Struct: return 'symbol-struct';
      case vscode.SymbolKind.Event: return 'symbol-event';
      case vscode.SymbolKind.Operator: return 'symbol-operator';
      case vscode.SymbolKind.TypeParameter: return 'symbol-type-parameter';
      default: return 'symbol-object';
    }
  }

  public static nameToKind(name: string): vscode.SymbolKind {
    switch (name) {
      case 'file': return vscode.SymbolKind.File;
      case 'module': return vscode.SymbolKind.Module;
      case 'namespace': return vscode.SymbolKind.Namespace;
      case 'package': return vscode.SymbolKind.Package;
      case 'class': return vscode.SymbolKind.Class;
      case 'method': return vscode.SymbolKind.Method;
      case 'property': return vscode.SymbolKind.Property;
      case 'field': return vscode.SymbolKind.Field;
      case 'constructor': return vscode.SymbolKind.Constructor;
      case 'enum': return vscode.SymbolKind.Enum;
      case 'interface': return vscode.SymbolKind.Interface;
      case 'function': return vscode.SymbolKind.Function;
      case 'variable': return vscode.SymbolKind.Variable;
      case 'constant': return vscode.SymbolKind.Constant;
      case 'string': return vscode.SymbolKind.String;
      case 'number': return vscode.SymbolKind.Number;
      case 'boolean': return vscode.SymbolKind.Boolean;
      case 'array': return vscode.SymbolKind.Array;
      case 'object': return vscode.SymbolKind.Object;
      case 'key': return vscode.SymbolKind.Key;
      case 'null': return vscode.SymbolKind.Null;
      case 'enumMember': return vscode.SymbolKind.EnumMember;
      case 'struct': return vscode.SymbolKind.Struct;
      case 'event': return vscode.SymbolKind.Event;
      case 'operator': return vscode.SymbolKind.Operator;
      case 'typeParameter': return vscode.SymbolKind.TypeParameter;
      default: return vscode.SymbolKind.Object;
    }
  }
}

// async function getDocumentSymbolsWithRetry(uri: vscode.Uri, attempts = 6, delayMs = 200): Promise<vscode.DocumentSymbol[] | undefined> {
async function getDocumentSymbolsWithRetry(uri: vscode.Uri, attempts = 6, delayMs = 200): Promise<SymbolNode[] | undefined> {
  for (let i = 0; i < attempts; i++) {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
      'vscode.executeDocumentSymbolProvider',
      uri
    );
    if (symbols && symbols.length > 0) {
      return symbols as SymbolNode[];
    }
    // If provider returned empty array it might still be valid; still retry in case of initialization
    await new Promise(res => setTimeout(res, delayMs * (1 + i * 0.5)));
  }
  return undefined;
}

// const toSymbolNodesNodefromDocumentSymbols = (ds: vscode.DocumentSymbol[], uri: vscode.Uri): SymbolNode[] =>
const toSymbolNodesNodefromDocumentSymbols = (ds: SymbolNode[], uri: vscode.Uri): SymbolNode[] =>
  ds.map(s => ({
    name: s.name,
    detail: SymbolsProvider.kindToName(s.kind),   // e.g., 'class", 'function'
    kind: s.kind,
    range: s.range,
    selectionRange: s.selectionRange,
    uri,
    // symbol children are returned in alphabetical order by vscode
    children: toSymbolNodesNodefromDocumentSymbols(s.children, uri).sort((a, b) => a.range.start.isBefore(b.range.start) ? -1 : 1),
    parent: s.parent
  }));

// make SymbolNodes out of NodeTreeItems
const toSymbolNodesFromNodeTreeItems = (ds: NodeTreeItem[], uri: vscode.Uri): SymbolNode[] =>
  ds.map(s => ({
    name: s.node.label,
    detail: s.node.detail,
    kind: SymbolsProvider.nameToKind(s.node.kind),
    range: s.node.range,
    selectionRange: s.node.selectionRange,
    uri,
    // parent: s.node.parent,
    // symbol children are returned in alphabetical order by vscode
    children: toSymbolNodesFromNodeTreeItems(s.children, uri),
    // children: toNode(s.children, uri).sort((a, b) => a.range.start.isBefore(b.range.start) ? -1 : 1)
    parent: s.node.parent
  }));


// window.onDidChangeTextEditorVisibleRanges(e): (textEditor, visibleRanges)

// TextEditorCursorStyle.visibleRanges: readonly Range[]

