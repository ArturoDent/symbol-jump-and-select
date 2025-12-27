import {Uri, Range, DocumentSymbol, SymbolKind, QuickPickItem, TreeItem} from 'vscode';

export type SymMapKey =
  | "file" | "module" | "namespace" | "package" | "class" | "method" | "property" | "field" | "constructor"
  | "enum" | "interface" | "function" | "variable" | "constant" | "string" | "number" | "boolean" | "array"
  | "object" | "key" | "null" | "enumMember" | "struct" | "event" | "operator" | "typeParameter"
  | "return" | "call" | "arrow" | "anonymous" | "declaration" | "switch" | "case";

export type SymMap = {
  [key in SymMapKey]: SymbolKind;
};

export interface SymbolPickItem extends QuickPickItem {
  range: Range,
  selectionRange: Range;
}

export type SymbolMap = Map<DocumentSymbol, number>;

// extend QuickPickItem?
export interface NodePickItem {
  name: string;
  kind: string;   // to extend, this is the wrong type
  depth: number;
  pos: number;
  // end: number;
  range: Range,
  selectionRange: Range,
  label: string;
  detail: string;
  parent?: any | undefined;
}

export type NodePickItems = NodePickItem[];

export interface NodeTreeItem extends TreeItem {
  node: NodePickItem;
  children: NodeTreeItem[];
}

export interface SymbolNode extends DocumentSymbol {
  // name: string;
  // detail: string;
  // kind: SymbolKind;
  // range: Range;
  // selectionRange: Range;
  children: SymbolNode[];
  uri: Uri;
  parent?: SymbolNode;
};

export type ReturnSymbols = {
  allSymbols: NodePickItems | SymbolMap;
  filteredSymbols: NodePickItems | SymbolMap;
};

export const TreeCache = {
  UseFilter: 0,
  UseAllNodesIgnoreFilter: 1,
  IgnoreFilter: 2,
  IgnoreAllNodes: 3,
  UseFilterAndAllNodes: 4,
  IgnoreFilterAndAllNodes: 5
};

export type CacheUse = typeof TreeCache[keyof typeof TreeCache];

// vscode.Symbol.Kind's
// File: 0;
// Module: 1;
// Namespace: 2;
// Package: 3;
// Class: 4;
// Method: 5;
// Property: 6;
// Field: 7;
// Constructor: 8;
// Enum: 9;
// Interface: 10;
// Function: 11;
// Variable: 12;
// Constant: 13;
// String: 14;
// Number: 15;
// Boolean: 16;
// Array: 17;
// Object: 18;
// Key: 19;
// Null: 20;
// EnumMember: 21;
// Struct: 22;
// Event: 23;
// Operator: 24;
// TypeParameter: 25;
