import ts from "typescript";
import {TextDocument, Range} from "vscode";
import {NodePickItems} from './types';


export async function collectSymbolItemsFromSource(doc: TextDocument): Promise<NodePickItems> {

  const sourceFile = ts.createSourceFile(
    doc.fileName,
    doc.getText(),
    ts.ScriptTarget.Latest,
    // the below is used, although it is in a comment
    /* setParentNodes */ true
  );

  const out: NodePickItems = [];

  function extractPropertyChain(expr: ts.Expression): string[] {
    const chain: string[] = [];
    let current: ts.Expression = expr;

    while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
      if (ts.isPropertyAccessExpression(current)) {
        chain.unshift(current.name.text);
        current = current.expression;
      } else if (ts.isElementAccessExpression(current)) {
        const arg = current.argumentExpression;
        const key = ts.isStringLiteral(arg) || ts.isNumericLiteral(arg)
          ? arg.text
          : arg.getText(sourceFile); // fallback for computed keys  // **** souceFile here
        chain.unshift(key);
        current = current.expression;
      }
    }

    if (ts.isIdentifier(current)) {
      chain.unshift(current.text);
    }

    return chain;
  }

  const container: string[] = [];
  const visited = new WeakSet<ts.Node>();

  // add interface, enum, constant, string, number, boolean, array, key

  function visitWithDepth(node: ts.Node, depth: number, container: string[]) {
    if (visited.has(node)) return;
    visited.add(node);

    // ts.forEachChild(node, (childNode) => console.log(node, '\n', childNode));

    const nameFrom = (id: ts.Identifier | ts.StringLiteral | ts.NumericLiteral) => id.text;
    const fullName = (name: string) => [...container, name].join(".");

    // InterfaceDeclaration: export interface SymbolNode {  ... }
    // ExportKeyword: node.modifiers[0], kind = 95

    // ImportDeclaration: import {dirname} from 'path';
    // ImportClause: {dirname}

    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const newContainer = [...container, name];
      const {asString} = getParameterDetails(sourceFile, node.parameters, doc);

      out.push({
        name: newContainer.join("."),
        kind: "function",
        depth,
        pos: node.name.getStart(sourceFile),
        // end: node.name.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.name.getStart(sourceFile)), doc.positionAt(node.name.getEnd())),
        label: `${name} ( ${asString} )`,
        detail: "function declaration",
      });

      node.body?.statements.forEach(stmt =>
        visitWithDepth(stmt, depth + 1, newContainer)
      );
    }

    // Arrow functions and function expressions
    else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      // else if (ts.isFunctionLike(node)) {  // this doesn't work here
      const name = "(anonymous)";
      const {asString} = getParameterDetails(sourceFile, node.parameters, doc);

      out.push({
        name: fullName(name),
        kind: "function",
        depth,
        pos: node.getStart(sourceFile),
        // end: node.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getStart(sourceFile))),
        label: `( ${asString} ) =>  `,
        detail: "anonymous function",
      });

      if (ts.isBlock(node.body)) {
        node.body.statements.forEach(stmt =>
          visitWithDepth(stmt, depth + 1, [...container, name])
        );
      }
      return;
    }

    else if (ts.isSwitchStatement(node)) {
      const text = node.expression.getText(sourceFile);

      out.push({
        name: "switch",
        kind: "function",
        depth,
        pos: node.getStart(sourceFile),
        // end: node.name.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.expression.getStart(sourceFile)), doc.positionAt(node.expression.getStart(sourceFile))),
        label: `switch (${text})`,
        detail: "switch",
      });
      if (node.caseBlock.clauses) {
        node.caseBlock.clauses.forEach(clause =>
          visitWithDepth(clause, depth + 1, [...container, "switch"])
        );
      }
    }

    // else if (ts.isCaseBlock(node)) {
    //   if (node.clauses) {
    //     node.clauses.forEach(clause =>
    //       visitWithDepth(clause, depth + 1, [...container, "switch"])
    //     );
    //   }
    // }

    else if (ts.isCaseClause(node)) {
      const text = node.expression.getText(sourceFile);

      out.push({
        name: "switch case",
        kind: "function",
        depth,
        pos: node.getStart(sourceFile),
        // end: node.name.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.expression.getStart(sourceFile)), doc.positionAt(node.expression.getStart(sourceFile))),
        label: `case: ${text}`,
        detail: "switch case",
      });
      node.statements.forEach(stmt =>
        visitWithDepth(stmt, depth + 1, [...container, text])
      );
    }

    else if (ts.isDefaultClause(node)) {
      // const text = node.expression.getText(sourceFile);

      out.push({
        name: "switch case default",
        kind: "function",
        depth,
        pos: node.getStart(sourceFile),
        // end: node.name.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getStart(sourceFile))),
        label: `default: `,
        detail: "switch case",
      });
      node.statements.forEach(stmt =>
        visitWithDepth(stmt, depth + 1, [...container, 'default'])
      );
    }

    // Class declarations
    else if (ts.isClassDeclaration(node) && node.name) {
      const name = nameFrom(node.name);

      let superString = "";  // A extends B, A implements B, A extends B implements C

      if (node.heritageClauses) {
        for (const hc of node.heritageClauses) {
          if (hc.token === ts.SyntaxKind.ExtendsKeyword) superString += ' extends ';
          else if (hc.token === ts.SyntaxKind.ImplementsKeyword) superString += ' implements ';

          for (const t of hc.types) {
            if (ts.isIdentifier(t.expression)) {
              superString += t.expression.text;
            }
          }
        }
      }

      out.push({
        // name,  // fullName(name) probably not required here
        name: fullName(name),
        kind: "class",
        depth,
        pos: node.name.getStart(sourceFile),
        // end: node.name.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.name.getStart(sourceFile)), doc.positionAt(node.name.getEnd())),
        label: superString ? `${name}${superString}` : name,
        detail: "class declaration",
      });

      const classContainer = [...container, name];

      node.members.forEach(member => {

        // class constructor
        if (ts.isConstructorDeclaration(member)) {
          const {asString} = getParameterDetails(sourceFile, member.parameters, doc);

          out.push({
            name: [...classContainer, "constructor"].join("."),
            kind: "constructor",
            depth: depth + 1,
            pos: member.getStart(sourceFile),
            // end: member.getEnd(),
            range: new Range(doc.positionAt(member.getStart(sourceFile)), doc.positionAt(member.getEnd())),
            selectionRange: new Range(doc.positionAt(member.getStart(sourceFile)), doc.positionAt(member.getStart(sourceFile))),
            label: `constructor ( ${asString} )`,
            detail: `${name} class constructor`,
          });
          member.body?.statements.forEach(stmt =>
            visitWithDepth(stmt, depth + 2, [...classContainer, "constructor"])
          );
        }

        // class methods
        if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
          const methodName = member.name.text;
          const {asString} = getParameterDetails(sourceFile, member.parameters, doc);

          out.push({
            name: [...classContainer, methodName].join("."),
            kind: "method",
            depth: depth + 1,
            pos: member.name.getStart(sourceFile),
            // end: member.name.getEnd(),
            range: new Range(doc.positionAt(member.getStart(sourceFile)), doc.positionAt(member.getEnd())),
            selectionRange: new Range(doc.positionAt(member.name.getStart(sourceFile)), doc.positionAt(member.name.getStart(sourceFile))),
            label: `${methodName} ( ${asString} )`,
            detail: `${name} class method`,
          });
          member.body?.statements.forEach(stmt =>
            visitWithDepth(stmt, depth + 2, [...classContainer, methodName])
          );
        }

        // class properties
        else if (ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name)) {
          const propName = member.name.text;
          const initText = member.initializer?.getText(sourceFile);

          out.push({
            name: [...classContainer, propName].join("."),
            kind: "property",
            depth: depth + 1,
            pos: member.name.getStart(sourceFile),
            // end: member.name.getEnd(),
            range: new Range(doc.positionAt(member.getStart(sourceFile)), doc.positionAt(member.getEnd())),
            selectionRange: new Range(doc.positionAt(member.name.getStart(sourceFile)), doc.positionAt(member.name.getEnd())),
            label: `${propName} = ${initText}`,
            detail: `${name} class property`
          });
        }
      });
    }

    // is this used anymore?
    else if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const left = node.expression.left;
      const right = node.expression.right;

      if (
        (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) &&
        (ts.isArrowFunction(right) || ts.isFunctionExpression(right))
      ) {
        const chain = extractPropertyChain(left); // e.g. ['my'Object, 'prop1', 'prop1Func']
        const innerName = ts.isFunctionExpression(right) && right.name?.getText(sourceFile);
        const body = right.body;
        let fullName = "";

        chain.forEach((segment, i) => {
          fullName = fullName ? `${fullName}.${segment}` : segment;

          // noop ! if there is a preceding duplicate
          if (out.length > 0 && out.find((item) => item.name === fullName && item.depth === depth)) {}

          // myObj.prop1 = (arg1) => { }
          else {
            const leftStart = doc.positionAt(left.getStart(sourceFile));
            const leftEnd = doc.positionAt(left.getEnd());

            out.push({
              name: fullName,
              kind: i === chain.length - 1 ? "method" : "object",
              depth: depth + i,
              pos: left.getStart(sourceFile),
              range: new Range(leftStart, leftEnd),

              // should this be left
              selectionRange: (left as ts.PropertyAccessExpression).name ?
                new Range(doc.positionAt((left as ts.PropertyAccessExpression).name.getStart(sourceFile)), doc.positionAt((left as ts.PropertyAccessExpression).name.getStart(sourceFile)))
                : new Range(doc.positionAt((left as ts.PropertyAccessExpression).getStart(sourceFile)), doc.positionAt((left as ts.PropertyAccessExpression).getStart(sourceFile))),

              label: segment,
              detail: i === chain.length - 1
                ? innerName
                  ? `assigned function '${innerName}'`
                  : "assigned function"
                : "container object",
            });
          }
        });

        // Append (anonymous) if function is unnamed
        if (!innerName) {
          const {asString} = getParameterDetails(sourceFile, right.parameters, doc);

          out.push({
            name: `${fullName} (anonymous)`,
            kind: "function",
            depth: depth + chain.length,
            pos: right.getStart(sourceFile),
            // end: right.getEnd(),

            range: new Range(doc.positionAt(left.getStart(sourceFile)), doc.positionAt(left.getEnd())),
            selectionRange: (left as ts.PropertyAccessExpression).name ?
              new Range(doc.positionAt((left as ts.PropertyAccessExpression).name.getStart(sourceFile)), doc.positionAt((left as ts.PropertyAccessExpression).name.getStart(sourceFile)))
              : new Range(doc.positionAt((left as ts.PropertyAccessExpression).getStart(sourceFile)), doc.positionAt((left as ts.PropertyAccessExpression).getStart(sourceFile))),

            label: `( ${asString} ) =>  `,
            detail: "anonymous function",
          });
        } else {
          out.push({
            name: innerName,
            kind: "function",
            depth: depth + chain.length,
            pos: right.name!.getStart(sourceFile),  // coerce to non-null: Non‑null Assertion Operator
            // end: right.name!.getEnd(),

            range: new Range(doc.positionAt(right.getStart(sourceFile)), doc.positionAt(right.getEnd())),
            selectionRange: right.name ?
              new Range(doc.positionAt(right.name.getStart(sourceFile)), doc.positionAt(right.name.getStart(sourceFile)))
              : new Range(doc.positionAt(right.getStart(sourceFile)), doc.positionAt(right.getStart(sourceFile))),

            label: `${innerName}()`,
            detail: "inner named function",
          });
        }

        if (ts.isBlock(body)) {
          body.statements.forEach(stmt =>
            visitWithDepth(stmt, depth + chain.length, [...container, fullName])
          );
        }

        return;
      }

      // myObj.a = 13;
      else if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.name)) {

        // noop: so that

        /* constructor(name, year) {
             this.name = "Arturo";   // in js/ts these aren't properties !
             this.year = 2050;       // but for tsc they are !
        } */

        // doesn't emit for name and year on separate lines
      }

      if (isThisPropertyInConstructor(left)) return;

      const chain = extractPropertyChain(left); // e.g. ['my'Object, 'prop1', 'prop1Func']
      const value = right.getText(sourceFile);
      let fullName = chain.join('.');

      // use these elsewhere
      const leftStart = doc.positionAt(left.getStart(sourceFile));
      const leftEnd = doc.positionAt(left.getEnd());

      out.push({
        name: fullName,
        kind: "property",
        depth: depth + 1,
        pos: left.getStart(sourceFile),

        // check range/selectionRange
        range: new Range(leftStart, leftEnd),
        selectionRange: (left as ts.PropertyAccessExpression).name ?
          new Range(doc.positionAt((left as ts.PropertyAccessExpression).name.getStart(sourceFile)), doc.positionAt((left as ts.PropertyAccessExpression).name.getStart(sourceFile)))
          : new Range(doc.positionAt((left as ts.PropertyAccessExpression).getStart(sourceFile)), doc.positionAt((left as ts.PropertyAccessExpression).getStart(sourceFile))),

        label: `${chain.at(-1)}: ${value}`,
        detail: "object property"
      });
    }

    // Variable statements
    else if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(decl =>
        visitWithDepth(decl, depth, container)
      );
    }

    // FunctionDeclaration: function foo() {}  (hit first above)
    // FunctionExpression: const foo = function() {}
    // ArrowFunction: const foo = ( ) => {}

    // Variable declarations: const myObj = {}; let bc = 13; export const square1 = x => x * x;
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      let isObj = false;
      let kind = "";
      let label = "";
      let detail = "";

      const name = node.name.text;
      const init = node.initializer;

      if (ts.isArrowFunction(init as ts.Node)) {
        kind = "function";
        label = `${name} ( ${getParameterDetails(sourceFile, (init as ts.FunctionExpression).parameters, doc).asString} )`;
        // label = `${name} ( ${init?.getText(sourceFile)} )`; // works but not as nice as getParameterDetails()
        detail = "variable ➜ arrow function";
      }
      else if (ts.isFunctionExpression(init as ts.Node)) {
        kind = "function";
        label = `${name} ( ${getParameterDetails(sourceFile, (init as ts.FunctionExpression).parameters, doc).asString} )`;
        detail = "variable ➜ function";
      }
      else if (ts.isPropertyAccessExpression(init as ts.Node)) {
        kind = "property";
        label = `${name} = ${init?.getText(sourceFile)}`;
        detail = "variable ➜ object property";
      }
      else if (ts.isCallExpression(init as ts.Node) && ts.isPropertyAccessExpression((init as ts.CallExpression).expression)) {
        kind = "method";
        // const params = getParameterDetails(sourceFile, (init as ts.CallExpression).arguments, doc).asString;
        label = `${name} = ${init?.getText(sourceFile)}`;
        detail = "variable ➜ method call";
      }
      else if (ts.isObjectLiteralExpression(init as ts.Node)) {
        isObj = true;
        kind = "object";
        label = name;
        detail = "variable ➜ object";
      }
      else {
        kind = "variable";
        label = `${name} = ${init?.getText(sourceFile)}`;
        detail = (init?.kind === 215) ? "variable ➜ new()" : "variable";
      }

      out.push({
        // name: fullName(name),
        name,
        kind,
        depth,
        pos: node.getStart(sourceFile),
        // end: node.name.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getStart(sourceFile))),
        label,
        detail
      });

      // if ((isArrowFunc || isFuncExpr) && ts.isBlock(init?.body)) {
      //   init.body.statements.forEach(stmt =>
      //     visitWithDepth(stmt, depth + 2, [...container, name])
      //   );
      // }

      if (
        init &&
        (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && ts.isBlock(init.body)
      ) {
        init.body.statements.forEach(stmt =>
          visitWithDepth(stmt, depth + 1, [...container, name])
        );
      }

      if (isObj) { // check if the object is empty
        visitWithDepth(init as ts.Node, depth + 1, [...container, name]);
      }
      return;
    }

    // Object literals: const myObj2 = { func: ( ) =>... }
    else if (ts.isObjectLiteralExpression(node)) {
      node.properties.forEach(prop => {

        if ((ts.isPropertyAssignment(prop) || ts.isMethodDeclaration(prop)) && ts.isIdentifier(prop.name)) {
          let init;
          const name = prop.name.text;
          if (ts.isPropertyAssignment(prop)) init = prop.initializer;

          const isMethod = ts.isMethodDeclaration(prop);
          const isFunc = ts.isArrowFunction(init as ts.Node) || ts.isFunctionExpression(init as ts.Node);
          // const isFunc = ts.isFunctionLike(init);  // this doesn't work everywhere
          const isObj = ts.isObjectLiteralExpression(init as ts.Node);  // nested objects
          const isVar = !isFunc && !isObj && !isMethod;

          let initText, paramsText, objText;
          if (isVar) initText = init?.getText(sourceFile);
          else if (isFunc) paramsText = getParameterDetails(sourceFile, (init as ts.FunctionExpression).parameters, doc).asString;
          else if (isMethod) paramsText = getParameterDetails(sourceFile, prop.parameters, doc).asString;

          else if (isObj) objText = "";

          out.push({
            name: fullName(name),
            kind: (isFunc || isMethod) ? "method" : isObj ? "object" : "property",
            depth,
            pos: prop.name.getStart(sourceFile),
            // end: prop.name.getEnd(),
            range: new Range(doc.positionAt(prop.getStart(sourceFile)), doc.positionAt(prop.getEnd())),
            selectionRange: new Range(doc.positionAt(prop.name.getStart(sourceFile)), doc.positionAt(prop.name.getStart(sourceFile))),
            label: isFunc ? `${prop.name.text}: ( ${paramsText} )` : isVar ? `${prop.name.text}: ${initText}` : prop.name.text,
            detail: (isFunc || isMethod) ? "object method" : isObj ? "nested object" : "object property",
          });

          // this handles let myVariable = { method1: function (inMethod1) { ...variables and properties in here...} }
          if (ts.isFunctionLike(init) && init.body && ts.isBlock(init.body)) {
            init.body.statements.forEach((stmt: ts.Statement) =>
              visitWithDepth(stmt, depth + 1, [...container, name])
            );
          }
          else if (isMethod && prop.body && ts.isBlock(prop.body as ts.Node)) {
            console.log();
            prop.body.statements.forEach(stmt =>
              visitWithDepth(stmt, depth + 1, [...container, name])
            );
          }

          if (init && isObj) {  // if object is empty skip this ?
            visitWithDepth(init, depth + 1, [...container, name]);
          }
        }
      });
      return;
    }

    // Expression statements
    else if (ts.isExpressionStatement(node)) {
      visitWithDepth(node.expression, depth, container);
      return;
    }

    // Call expressions:  simple("howdy") or myObject/myClass.method(arg1)
    else if (ts.isCallExpression(node)) {
      const expr = node.expression;
      const {asString} = getParameterDetails(sourceFile, node.arguments, doc);
      let name = '', propName = '', label = '', detail = '';

      if (ts.isPropertyAccessExpression(expr)) {   // for myObject/myClass.method(arg1)
        propName = expr.getText(sourceFile);
        name = fullName(propName);
        label = `${propName} ( ${asString} )`;
        detail = `${expr.expression.getText(sourceFile)} method function call`;

      }
      else if (ts.isIdentifier(expr)) {   // simple("howdy")
        name = fullName(expr.text);
        label = `${expr.text} ( ${asString} )`;
        detail = 'function call';
      }

      if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) {  // rex.speak() not caught
        out.push({
          name,
          kind: "function",
          depth,
          pos: expr.getStart(sourceFile),
          // end: expr.getEnd(),
          range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
          selectionRange: new Range(doc.positionAt(expr.getStart(sourceFile)), doc.positionAt(expr.getStart(sourceFile))),
          label,
          detail
        });
      }
      node.arguments.forEach(arg => visitWithDepth(arg, depth + 1, container));
      return;
    }

    // Return statements
    else if (ts.isReturnStatement(node)) {
      const path = getAllEnclosingFunctionNames(node);

      out.push({
        name: "return",
        kind: "function",
        depth,
        pos: node.getStart(sourceFile),
        // end: expr.getEnd(),
        range: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getEnd())),
        selectionRange: new Range(doc.positionAt(node.getStart(sourceFile)), doc.positionAt(node.getStart(sourceFile))),
        label: `${node.getText()}`,
        detail: path ? `${path.join(' > ')} > return` : "return"   // TODO: identify method/function/case/etc. returns
      });

      if (node.expression) visitWithDepth(node.expression, depth + 1, container);
      return;
    }

    // Fallback: only recurse if not already handled
    ts.forEachChild(node, child => visitWithDepth(child, depth, container));
  }

  visitWithDepth(sourceFile, 0, container);
  return out.sort((a, b) => a.pos - b.pos);
}


// use this returnType in getArrowFunctionParametersRange()
function getParameterDetails(sourceFile: ts.SourceFile, params: ts.NodeArray<ts.ParameterDeclaration | ts.Expression>, doc: TextDocument): {selectionRange: Range | undefined; asString: string;} {
  // const returnType = expr.type ? expr.type.getText() : 'unknown';
  // return `( ${params} ) => ${returnType}`;

  let start, end;
  const asString = params.map(p => p.getText(sourceFile)).join(', ');

  if (params.length >= 1) {
    start = params[0].getStart(sourceFile);
    end = params.at(-1)!.getEnd();  // coerce to non-null: Non‑null Assertion Operator
    return {
      asString,
      selectionRange: new Range(doc.positionAt(start), doc.positionAt(end))
    };
  }

  return {
    asString,
    selectionRange: new Range(doc.positionAt(params.pos), doc.positionAt(params.pos))
  };
}


function isThisPropertyInConstructor(node: ts.Node): boolean {
  if (!ts.isPropertyAccessExpression(node)) return false;
  if (node.expression.kind !== ts.SyntaxKind.ThisKeyword) return false;

  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isConstructorDeclaration(current)) {
      // Ensure this constructor belongs to a class
      return ts.isClassLike(current.parent);
    }
    // Stop climbing at the class boundary — avoids matching nested fns
    if (ts.isClassLike(current)) break;
    current = current.parent;
  }
  return false;
}


/**
 * For 'return' call.
 * Walks up from `node` and returns an array of all enclosing
 * function or method names, from outermost to innermost.
 */
export function getAllEnclosingFunctionNames(node: ts.Node): string[] {
  const names: string[] = [];
  let cur: ts.Node | undefined = node.parent;

  while (cur) {
    // 1. Named function declaration: function foo() { … }
    // 2. Class declaration
    if ((ts.isFunctionDeclaration(cur) || ts.isClassDeclaration(cur)) && cur.name) {
      names.push(cur.name.text);
    }
    // 3. Object: const myObj2 = {  }  // works for highest level myObj2
    else if (ts.isVariableDeclaration(cur) && ts.isIdentifier(cur.name)) {
      names.push(cur.name.text);
    }

    // methods and properties within objects: const myObj2 = { method1: return } 
    else if (ts.isPropertyAssignment(cur) && ts.isIdentifier(cur.name)) {
      names.push(cur.name.text);
    }

    // 2. Class method / getter / setter: class C { bar() { } }
    else if (
      (ts.isMethodDeclaration(cur) ||
        ts.isGetAccessor(cur) ||
        ts.isSetAccessor(cur)) &&
      ts.isIdentifier(cur.name)
    ) {
      names.push(cur.name.text);
    }
    // 3. FunctionExpression or ArrowFunction assigned to a variable:
    //    const baz = function() { … }  or  const qux = () => { … }
    else if (
      (ts.isFunctionExpression(cur) || ts.isArrowFunction(cur)) &&
      ts.isVariableDeclaration(cur.parent) &&
      ts.isIdentifier(cur.parent.name)
    ) {
      names.push(cur.parent.name.text);
    }

    cur = cur.parent;
  }

  // Reverse so that outermost function appears first
  return names.reverse();
}

