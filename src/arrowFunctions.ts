import * as vscode from 'vscode';
import * as ts from 'typescript';


/**
 * Make DocumentSymbols[] from arrow functions and other function "variables",
 * like const someFunc = function () {}; or const square1 = x => x * x;
 */
export async function makeSymbolsFromFunctionExpressions(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[] | undefined> {

  const arrowFunctionSymbols: vscode.DocumentSymbol[] = [];

  const program = ts.createProgram([document.fileName], {allowJs: true});
  const sourceFile = program.getSourceFile(document.fileName);
  const checker = program.getTypeChecker();
  if (!sourceFile) return;


  // this does work, but difficult to get parameters

  // const checker = program.getTypeChecker();

  // for (const sourceFile of program.getSourceFiles()) {
  //   if (!sourceFile.isDeclarationFile) {
  //     ts.forEachChild(sourceFile, function visit(node) {
  //       const symbol = checker.getSymbolAtLocation(node);
  //       if (symbol) {
  //         console.log("Symbol name:", symbol.getName());
  //         console.log("Symbol flags:", ts.SymbolFlags[symbol.getFlags()]);
  //         const params = symbol.valueDeclaration.initializer.parameters;
  //         const parameters = symbol.getDeclarations() ? [0].getChildren()?.at(-1).parameters;

  //         console.log();
  //       }
  //       ts.forEachChild(node, visit);
  //     });
  //   }
  // };


  function visit(node: ts.Node) {

    // e.g., const someFunc = function () {};
    // ts.isVariableStatement(node);  // true for the above
    // node.declarationList.declarations[0].initializer.kind === 201 a FunctionExpression

    // can have functions in CallExpressions or ReturnStatements
    // ts.isCallExpression(node);
    // ts.isReturnStatement(node);

    let parameters;

    const symbol = checker.getSymbolAtLocation(node);
    if (symbol) {
      const type = checker.getTypeOfSymbolAtLocation(symbol, node);
      const signatures = type.getCallSignatures();
      for (const sig of signatures) {
        parameters = sig.getParameters();
        for (const param of parameters) {
          const paramType = checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
          console.log(param.name, checker.typeToString(paramType));
        }
      }
    }

    if (ts.isVariableStatement(node) && node.declarationList.declarations[0].initializer) {
      if (ts.isFunctionExpression(node.declarationList.declarations[0].initializer)) {

        const triviaWidth = node.declarationList.declarations[0].initializer.getLeadingTriviaWidth(sourceFile);

        const startPos = document.positionAt(node.declarationList.declarations.pos).translate({characterDelta: triviaWidth});
        // use this to match the symbol locations provided by vscode documentSymbol
        const fullRange = new vscode.Range(startPos, document.positionAt(node.declarationList.declarations.end));

        const end = node.declarationList.declarations[0].name?.getEnd();

        // make a DocumentSymbol: name
        const newSymbol = {
          name: String(node.declarationList.declarations[0].name?.getText(sourceFile)),
          kind: vscode.SymbolKind.Function,
          range: fullRange,
          selectionRange: new vscode.Range(startPos, document.positionAt(end || node.declarationList.declarations.end)),
          children: [],
          detail: '',
          parameters: parameters
        };

        arrowFunctionSymbols.push(newSymbol);
      }
    }

    // e.g., const square1 = x => x * x;  initializer is x => x * x
    // any space/jsdoc, etc. before the name (square1) is trivia

    // or ts.isFunctionExpression()
    else if (ts.isVariableDeclaration(node) && !!node.initializer && ts.isArrowFunction(node.initializer)) {
      if (document) {

        // getLeadingTriviaWidth() needs to have the sourceFile parameter to work
        // see https://stackoverflow.com/a/67810822/836330 and 
        // https://github.com/microsoft/TypeScript/issues/14808#issuecomment-289020765

        const triviaWidth = node.name.end - node.name.pos - node.name.getText(sourceFile).length;

        // const triviaWidth = node.initializer.getLeadingTriviaWidth(sourceFile);
        // above DOES NOT handle "const /** @type { any } */ square2 = x => x * x;" correctly

        const startPos = document.positionAt(node.pos).translate({characterDelta: triviaWidth});
        const fullRange = new vscode.Range(startPos, document.positionAt(node.end));

        // make a DocumentSymbol: name
        const newSymbol = {
          name: String(node.name.getText(sourceFile)),
          kind: vscode.SymbolKind.Function,
          range: fullRange,
          selectionRange: new vscode.Range(startPos, document.positionAt(node.name.end)),
          detail: '',
          children: [],
          parameters: parameters
        };

        // const symbol = checker.getSymbolAtLocation(node);

        // ts.visitParameterList(nodes, visitor, context);
        // const pList = ts.visitParameterList([node], a => console.log(), context);

        // ts.getEffectiveTypeParameterDeclarations(node)
        // ts.getJSDocParameterTags(param)
        // ts.getLineAndCharacterOfPosition(sourceFile, position)
        // ts.getOriginalNode(node)
        // ts.getPositionOfLineAndCharacter(sourceFile, line, character)
        // ts.symbolName(symbol)
        // ts.visitNode(node, visitor, test, node)
        // ts.visitParameterList(nodes, visitor, context);


        arrowFunctionSymbols.push(newSymbol);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return arrowFunctionSymbols;
};