import {ExtensionContext, commands, workspace, window, Position, Selection, TextEditorRevealType, TreeView} from 'vscode';
import {SymbolsProvider} from './tree';
import {getSymbols, getNodes, render} from './quickPick';
import * as Globals from './myGlobals';
import type {SymMap, SymbolMap, NodePickItems, SymbolNode} from './types';



export async function activate(context: ExtensionContext) {

	const _Globals = Globals.default;
	_Globals.init();

	let symbolView: TreeView<SymbolNode>;
	let symbolProvider: SymbolsProvider;

	if (_Globals.makeTreeView) {
		symbolProvider = new SymbolsProvider();
		// symbolView = window.createTreeView('symbolsTree', {treeDataProvider: symbolProvider, showCollapseAll: true});
		symbolView = window.createTreeView('symbolsTree', {treeDataProvider: symbolProvider, showCollapseAll: false});
		symbolProvider.setView(symbolView);

		await commands.executeCommand('setContext', 'symbolsTree.locked', SymbolsProvider.locked);

		symbolView.onDidChangeVisibility(e => {
			commands.executeCommand(
				'setContext',
				'SymbolsTree.visible',
				e.visible
			);
		});

		// initial population
		await symbolProvider.refresh('');
		context.subscriptions.push(symbolView);
	}

	// symbolView.onDidChangeVisibility(e => {
	// 	commands.executeCommand(
	// 		'setContext',
	// 		'SymbolsTree.visible',
	// 		e.visible
	// 	);
	// });

	const showQuickPick = commands.registerCommand('symbolsTree.showQuickPick', async (args) => {

		const document = window.activeTextEditor?.document;
		if (!document) return;  // message

		let symbols: NodePickItems | SymbolMap | undefined;

		let kbSymbols: (keyof SymMap)[];
		// if triggered from Command Palette, args is undefined

		if (!!args?.symbols && !Array.isArray(args?.symbols)) args.symbols = [args.symbols];
		else if (Array.isArray(args?.symbols) && args?.symbols?.length === 0) args.symbols = undefined;
		// default is all symbols

		kbSymbols = args?.symbols || undefined;

		let isJSTS: boolean;

		if (document.languageId.match(/javascript|typescript|javascriptreact|typescriptreact/))
			isJSTS = true;
		else isJSTS = false;

		// make a getNew/clearOld symbols/nodes variable and send it to getNodes/Symbols
		let getNewSymbols = false, getNewNodes = false;

		if (_Globals.refreshSymbols || _Globals.lastUri !== document.uri) {
			_Globals.lastUri = document.uri;
			// _Globals.refreshSymbols = true;
			getNewSymbols = true;
			getNewNodes = true;
		}

		// if "javascript" and useTSC setting = true
		if (isJSTS && _Globals.useTypescriptCompiler) symbols = await getNodes(kbSymbols, getNewNodes, document); // NodePickItem[] | undefined = NodePickItems
		else symbols = await getSymbols(kbSymbols, getNewSymbols, isJSTS, document); // Map<DocumentSymbol, number> | undefined = SymbolMap

		if (symbols) await render(isJSTS, symbols);
	});
	context.subscriptions.push(showQuickPick);

	const filterTree = commands.registerCommand('symbolsTree.filterSymbolTree', async (args) => {

		// {
		// 	"key": "alt+f",
		// 		"command": "symbolsTree.filterSymbolTree",
		// 			"args": [
		// 				"class"
		// 			],
		// 				"when": "SymbolsTree.visible";
		// }

		symbolProvider.refresh(args || undefined);
	});
	context.subscriptions.push(filterTree);

	// TODO: explain these in README
	context.subscriptions.push(

		commands.registerCommand('symbolsTree.refreshTree', () => {
			symbolProvider.expandAll();
			symbolProvider.refresh('');
		}),

		commands.registerCommand('symbolsTree.lockTree', async () => {
			SymbolsProvider.locked = !SymbolsProvider.locked;
			await commands.executeCommand('setContext', 'symbolsTree.locked', SymbolsProvider.locked);
		}),

		commands.registerCommand('symbolsTree.unlockTree', async () => {
			SymbolsProvider.locked = !SymbolsProvider.locked;
			await commands.executeCommand('setContext', 'symbolsTree.locked', SymbolsProvider.locked);
			symbolProvider.refresh('');
		}),

		commands.registerCommand('symbolsTree.filterTree', async () => {

			// to make a keybinding that focuses and opens a find input
			// undefined is not allowed but works
			// await symbolView.reveal(undefined, {select: false, focus: true});
			// await commands.executeCommand('list.find');  // must be awaited to get focus in the find input

			// open the QuickInput and create a filtered TreeItem[]
			const query = await window.showInputBox();
			if (query) {
				await symbolProvider.refresh(query);
			}

			// {
			// 	"key": "ctrl+alt+f",
			// 		"command": "list.find",
			// 			"when": "SymbolsTree.visible";
			// }
		}),

		commands.registerCommand('symbolsTree.collapseTree', async (node: SymbolNode) => {
			await commands.executeCommand('workbench.actions.treeView.symbolsTree.collapseAll');
		}),

		commands.registerCommand('symbolsTree.revealSymbol', async (node: SymbolNode) => {
			const doc = await workspace.openTextDocument(node.uri);
			const editor = await window.showTextDocument(doc);
			editor.revealRange(node.range, TextEditorRevealType.InCenter);
			editor.selection = new Selection(node.selectionRange.start, node.selectionRange.start);

			// if need the activeItem(s), see proposed: https://github.com/EhabY/vscode/blob/d23158246aaa474996f2237f735461ad47e41403/src/vscode-dts/vscode.proposed.treeViewActiveItem.d.ts#L10-L29
			// treeView.onDidChangeActiveItem()
			// waiting on https://github.com/microsoft/vscode/issues/185563
			// hidden in the Command Palette until these are resolved
		}),

		commands.registerCommand('symbolsTree.selectSymbol', async (node: SymbolNode) => {
			const doc = await workspace.openTextDocument(node.uri);
			const editor = await window.showTextDocument(doc);

			let extendedRange;
			const lastLineLength = doc.lineAt(node.range.end).text.length;

			if (node.name.startsWith('return')) extendedRange = node.selectionRange;
			// extendedRange = node.selectionRange.with({
			// 	end: new Position(node.range.end.line, lastLineLength)
			// });
			else
				extendedRange = node.range.with({
					start: new Position(node.range.start.line, 0),
					end: new Position(node.range.end.line, lastLineLength)
				});

			editor.selection = new Selection(extendedRange.start, extendedRange.end);
			editor.revealRange(extendedRange, TextEditorRevealType.InCenter);
		}),
	);

	// if active document has changed or current document was edited
	context.subscriptions.push(workspace.onDidChangeTextDocument(async (event) => {
		// check not keybindings/settings.json
		if (event.contentChanges.length) _Globals.refreshSymbols = true;

		if (window.activeTextEditor?.document.languageId.match(/javascript|typescript|javascriptreact|typescriptreact/))
			_Globals.isJSTS = true;
		else _Globals.isJSTS = false;
	}));
}

export function deactivate() {}
