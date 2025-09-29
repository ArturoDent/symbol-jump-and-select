import {SymbolKind, ThemeIcon} from 'vscode';
import {SymMap, SymMapKey} from './types';

/**
 * A 'map' from a kbSymbol option to its SymbolKind (a number)
*/
const symbolKindMap = {
  "file": SymbolKind.File,
  "module": SymbolKind.Module,
  "namespace": SymbolKind.Namespace,
  "package": SymbolKind.Package,
  "class": SymbolKind.Class,
  "method": SymbolKind.Method,
  "property": SymbolKind.Property,
  "field": SymbolKind.Field,
  "constructor": SymbolKind.Constructor,
  "enum": SymbolKind.Enum,
  "interface": SymbolKind.Interface,
  "function": SymbolKind.Function,
  "variable": SymbolKind.Variable,
  "constant": SymbolKind.Constant,
  "string": SymbolKind.String,
  "number": SymbolKind.Number,
  "boolean": SymbolKind.Boolean,
  "array": SymbolKind.Array,
  "object": SymbolKind.Object,
  "key": SymbolKind.Key,
  "null": SymbolKind.Null,
  "enumMember": SymbolKind.EnumMember,
  "struct": SymbolKind.Struct,
  "event": SymbolKind.Event,
  "operator": SymbolKind.Operator,
  "typeParameter": SymbolKind.TypeParameter,
};


/**
 * 
 * 
 */
export function buildSymMap(kbSymbols: SymMapKey[] | undefined): SymMap {

  let symMap: SymMap = {} as SymMap;

  if (kbSymbols?.length) {
    // oddly, 'constructor' will not appear in the debug watch for symMap, but it IS there
    kbSymbols?.forEach(kbSymbol => {
      if (symbolKindMap[kbSymbol] >= 0) symMap[kbSymbol] = symbolKindMap[kbSymbol];
    });
  }
  else {  // else there were no symbols in the keybinding or empty array for 'symbol'
    for (const [key, value] of Object.entries(symbolKindMap)) {
      symMap[key as SymMapKey] = value;
    }
  }
  return symMap;
};

/**
 * Not currently used.
 * Used to make individual QuickPickItem's.
 * @example: 11 => {name: function, iconPath: new ThemeIcon('symbol-function')}
 */
export const mapKindToNameAndIconPath = new Map<SymbolKind, {name: string; iconPath: ThemeIcon;}>([

  [SymbolKind.File, {name: 'file', iconPath: new ThemeIcon('symbol-file')}],
  [SymbolKind.Module, {name: 'module', iconPath: new ThemeIcon('symbol-module')}],
  [SymbolKind.Namespace, {name: 'namespace', iconPath: new ThemeIcon('symbol-namespace')}],
  [SymbolKind.Package, {name: 'package', iconPath: new ThemeIcon('symbol-package')}],
  [SymbolKind.Class, {name: 'class', iconPath: new ThemeIcon('symbol-class')}],
  [SymbolKind.Method, {name: 'method', iconPath: new ThemeIcon('symbol-method')}],
  [SymbolKind.Property, {name: 'property', iconPath: new ThemeIcon('symbol-property')}],
  [SymbolKind.Field, {name: 'field', iconPath: new ThemeIcon('symbol-field')}],
  [SymbolKind.Constructor, {name: 'constructor', iconPath: new ThemeIcon('symbol-constructor')}],
  [SymbolKind.Enum, {name: 'enum', iconPath: new ThemeIcon('symbol-enum')}],
  [SymbolKind.Interface, {name: 'interface', iconPath: new ThemeIcon('symbol-interface')}],
  [SymbolKind.Function, {name: 'function', iconPath: new ThemeIcon('symbol-function')}],
  [SymbolKind.Variable, {name: 'variable', iconPath: new ThemeIcon('symbol-variable')}],
  [SymbolKind.Constant, {name: 'constant', iconPath: new ThemeIcon('symbol-constant')}],
  [SymbolKind.String, {name: 'string', iconPath: new ThemeIcon('symbol-string')}],
  [SymbolKind.Number, {name: 'number', iconPath: new ThemeIcon('symbol-number')}],
  [SymbolKind.Boolean, {name: 'boolean', iconPath: new ThemeIcon('symbol-boolean')}],
  [SymbolKind.Array, {name: 'array', iconPath: new ThemeIcon('symbol-array')}],
  [SymbolKind.Object, {name: 'object', iconPath: new ThemeIcon('symbol-object')}],
  [SymbolKind.Key, {name: 'key', iconPath: new ThemeIcon('symbol-key')}],
  [SymbolKind.Null, {name: 'null', iconPath: new ThemeIcon('symbol-null')}],
  [SymbolKind.EnumMember, {name: 'enumMember', iconPath: new ThemeIcon('symbol-enum-member')}],
  [SymbolKind.Struct, {name: 'struct', iconPath: new ThemeIcon('symbol-struct')}],
  [SymbolKind.Event, {name: 'event', iconPath: new ThemeIcon('symbol-event')}],
  [SymbolKind.Operator, {name: 'operator', iconPath: new ThemeIcon('symbol-operator')}],
  [SymbolKind.TypeParameter, {name: 'typeParameter', iconPath: new ThemeIcon('symbol-type-parameter')}]
]);

// mapping.set(SymbolKind.File, {name: 'file', iconPath: new ThemeIcon('symbol-file')});
// mapping.set(SymbolKind.Module, {name: 'module', iconPath: new ThemeIcon('symbol-module')});
// mapping.set(SymbolKind.Namespace, {name: 'namespace', iconPath: new ThemeIcon('symbol-namespace')});
// mapping.set(SymbolKind.Package, {name: 'package', iconPath: new ThemeIcon('symbol-package')});
// mapping.set(SymbolKind.Class, {name: 'class', iconPath: new ThemeIcon('symbol-class')});
// mapping.set(SymbolKind.Method, {name: 'method', iconPath: new ThemeIcon('symbol-method')});
// mapping.set(SymbolKind.Property, {name: 'property', iconPath: new ThemeIcon('symbol-property')});
// mapping.set(SymbolKind.Field, {name: 'field', iconPath: new ThemeIcon('symbol-field')});
// mapping.set(SymbolKind.Constructor, {name: 'constructor', iconPath: new ThemeIcon('symbol-constructor')});
// mapping.set(SymbolKind.Enum, {name: 'enum', iconPath: new ThemeIcon('symbol-enum')});
// mapping.set(SymbolKind.Interface, {name: 'interface', iconPath: new ThemeIcon('symbol-interface')});
// mapping.set(SymbolKind.Function, {name: 'function', iconPath: new ThemeIcon('symbol-function')});
// mapping.set(SymbolKind.Variable, {name: 'variable', iconPath: new ThemeIcon('symbol-variable')});
// mapping.set(SymbolKind.Constant, {name: 'constant', iconPath: new ThemeIcon('symbol-constant')});
// mapping.set(SymbolKind.String, {name: 'string', iconPath: new ThemeIcon('symbol-string')});
// mapping.set(SymbolKind.Number, {name: 'number', iconPath: new ThemeIcon('symbol-number')});
// mapping.set(SymbolKind.Boolean, {name: 'boolean', iconPath: new ThemeIcon('symbol-boolean')});
// mapping.set(SymbolKind.Array, {name: 'array', iconPath: new ThemeIcon('symbol-array')});
// mapping.set(SymbolKind.Object, {name: 'object', iconPath: new ThemeIcon('symbol-object')});
// mapping.set(SymbolKind.Key, {name: 'key', iconPath: new ThemeIcon('symbol-key')});
// mapping.set(SymbolKind.Null, {name: 'null', iconPath: new ThemeIcon('symbol-null')});
// mapping.set(SymbolKind.EnumMember, {name: 'enumMember', iconPath: new ThemeIcon('symbol-enum-member')});
// mapping.set(SymbolKind.Struct, {name: 'struct', iconPath: new ThemeIcon('symbol-struct')});
// mapping.set(SymbolKind.Event, {name: 'event', iconPath: new ThemeIcon('symbol-event')});
// mapping.set(SymbolKind.Operator, {name: 'operator', iconPath: new ThemeIcon('symbol-operator')});
// mapping.set(SymbolKind.TypeParameter, {name: 'typeParameter', iconPath: new ThemeIcon('symbol-type-parameter')});
