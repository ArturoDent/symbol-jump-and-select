import {
	ExtensionContext, commands, window,
	Range, Position, Selection, TextEditorRevealType, TreeView
} from 'vscode';
import {SymbolsProvider} from './tree';
import {SymbolPicker} from './quickPick';
import {showCommandMessage} from './messages';
import _Globals from './myGlobals';

import type {SymMap, SymbolMap, NodePickItems, SymbolNode} from './types';

let symbolView: TreeView<SymbolNode>;


export async function activate(context: ExtensionContext) {

	_Globals.init(context);
	let symbolProvider: SymbolsProvider;

	if (_Globals.makeTreeView) {
		symbolProvider = new SymbolsProvider(context);
		symbolView = window.createTreeView('symbolsTree', {treeDataProvider: symbolProvider, canSelectMany: true, showCollapseAll: false});
		symbolProvider.setView(symbolView);

		// initialize context keys
		await commands.executeCommand('setContext', 'symbolsTree.locked', false);
		await commands.executeCommand('setContext', 'symbolsTree.filtered', false);

		await commands.executeCommand('setContext', 'symbolsTree.hasSelection', false);
		await commands.executeCommand('setContext', 'symbolsTree.collapsed', false);

		// initial population of TeeView, if it is visible
		if (window.activeTextEditor && symbolView.visible) await symbolProvider.refresh('');

		context.subscriptions.push(symbolView);
		context.subscriptions.push(symbolProvider);
	}

	const symbolPicker = new SymbolPicker(context);  // the QuickPick class

	const showQuickPick = commands.registerCommand('symbolsTree.showQuickPick', async (args) => {

		const document = window.activeTextEditor?.document;
		if (!document) return;  // message?

		let symbols: NodePickItems | SymbolMap | undefined;

		let kbSymbols: (keyof SymMap)[];
		// if triggered from Command Palette, args is undefined

		if (!!args?.symbols && !Array.isArray(args?.symbols)) args.symbols = [args.symbols];
		else if (Array.isArray(args?.symbols) && args?.symbols?.length === 0) args.symbols = undefined;
		// default is all symbols

		kbSymbols = args?.symbols || undefined;

		// if "javascript" and useTSC setting = true
		if (_Globals.isJSTS && _Globals.useTypescriptCompiler)
			symbols = await symbolPicker.getNodes(kbSymbols, document); // NodePickItem[] | undefined = NodePickItems
		else
			symbols = await symbolPicker.getSymbols(kbSymbols, document); // Map<DocumentSymbol, number> | undefined = SymbolMap

		if (symbols) await symbolPicker.render(symbols);
	});
	context.subscriptions.push(showQuickPick);

	const filterTree = commands.registerCommand('symbolsTree.applyFilters', async (args) => {

		// {
		// 	"key": "alt+f",
		// 		"command": "symbolsTree.applyFilters",
		// 			"args": [
		// 				"class"
		// 			],
		// 				"when": "SymbolsTree.visible";
		// }
		if (window.activeTextEditor) await symbolProvider.refresh(args || undefined);
	});
	context.subscriptions.push(filterTree);

	context.subscriptions.push(

		commands.registerCommand('symbolsTree.refresh', async () => {

			await symbolProvider.refresh('', true);  // true = ignoreCache

			if (_Globals.collapseTreeViewItems === "expandOnOpen") {
				await symbolProvider.expandAll();
				await commands.executeCommand('setContext', 'symbolsTree.collapsed', false);

				// TODO: reveal where cursor is ?
				// await symbolProvider.expandMiddleSymbol();
			}
			else {
				await commands.executeCommand('workbench.actions.treeView.symbolsTree.collapseAll');
				await commands.executeCommand('setContext', 'symbolsTree.collapsed', true);

				// await symbolProvider.expandMiddleSymbol();
			}
		}),

		commands.registerCommand('symbolsTree.lock', async () => {
			await symbolProvider.setLock(true);
		}),

		commands.registerCommand('symbolsTree.unlock', async () => {
			await symbolProvider.setLock(false);
		}),

		commands.registerCommand('symbolsTree.getFilter', async () => {

			// to make a keybinding that focuses and opens a find input
			// undefined is not allowed but works
			// await symbolView.reveal(undefined, {select: false, focus: true});
			// await commands.executeCommand('list.find');  // must be awaited to get focus in the find input

			let finalQuery: string | string[] = '';

			// open the QuickInput and create a filtered TreeItem[]
			let query = await window.showInputBox();

			// TODO: handle "case && call" => do successive searches
			// handle "class || rex"  => ["class", "rex"] // if query contains "||" split on " || "
			// handle "class,rex" treat as an ||
			const orRE = new RegExp("\\s*\\|\\|\\s*");
			const commaRE = new RegExp("\\s*,\\s*");

			if (query) {
				if (query?.includes('||')) finalQuery = query.split(orRE);
				else if (query?.includes(',')) finalQuery = query.split(commaRE);
				else finalQuery = query;
			}

			if (finalQuery) {
				await symbolProvider.refresh(finalQuery);  // set a global query - unlock which needs to refresh()
			}
		}),

		commands.registerCommand('symbolsTree.collapseAll', async (node: SymbolNode) => {
			await commands.executeCommand('workbench.actions.treeView.symbolsTree.collapseAll');
			await commands.executeCommand('setContext', 'symbolsTree.collapsed', true);
		}),

		commands.registerCommand('symbolsTree.expandAll', async (node: SymbolNode) => {
			await symbolProvider.expandAll();
			await commands.executeCommand('setContext', 'symbolsTree.collapsed', false);
		}),

		commands.registerCommand('symbolsTree.revealSymbol', async (node: SymbolNode) => {

			if (!node && !symbolView.selection.length) {
				showCommandMessage("There are no symbols selected in the Tree View to reveal.");
				return;
			}

			const editor = window.activeTextEditor;
			if (!editor) return;

			// if a node, reveal that
			// if !node, get symbolView.selection, reveal first
			if (node) {
				editor.revealRange(node.range, TextEditorRevealType.InCenter);
				editor.selection = new Selection(node.selectionRange.start, node.selectionRange.start);
				await window.showTextDocument(editor.document);
			}
			else if (symbolView.selection.length) {   // !node, triggered by keybinding
				let selections = [];

				for (const node of symbolView.selection) {
					selections.push(new Selection(node.selectionRange.start, node.selectionRange.start));
				}

				editor.selections = selections;
				let node = symbolView.selection[0];
				editor.revealRange(node.range, TextEditorRevealType.InCenter);
				await window.showTextDocument(editor.document);
			}
			// if need the activeItem(s), see proposed: https://github.com/EhabY/vscode/blob/d23158246aaa474996f2237f735461ad47e41403/src/vscode-dts/vscode.proposed.treeViewActiveItem.d.ts#L10-L29
			// treeView.onDidChangeActiveItem()
			// waiting on https://github.com/microsoft/vscode/issues/185563
		}),

		commands.registerCommand('symbolsTree.selectSymbol', async (node: SymbolNode) => {

			if (!node && !symbolView.selection.length) {
				showCommandMessage("There are no symbols selected in the Tree View to select.");
				return;
			}

			const editor = window.activeTextEditor;
			if (!editor) return;

			let nodeToReveal: SymbolNode | undefined = undefined;
			if (node) nodeToReveal = node;
			else nodeToReveal = symbolView.selection[0];

			let extendedRange;
			let selections = [];
			let nodes: SymbolNode[] = [];

			if (node) {
				if (symbolView.selection.includes(node)) nodes.push(...symbolView.selection);
				else nodes.push(node);
			}
			else nodes.push(...symbolView.selection);

			for (const node of nodes) {
				const lastLineLength = editor.document.lineAt(node.range.end).text.length;
				if (node.name.startsWith('return')) extendedRange = node.selectionRange;
				else
					extendedRange = node.range.with({
						start: new Position(node.range.start.line, 0),
						end: new Position(node.range.end.line, lastLineLength)
					});

				selections.push(new Selection(extendedRange.start, extendedRange.end));
			}

			editor.selections = selections;
			const revealRange = new Range(nodeToReveal.range.start, nodeToReveal.range.end);
			editor.revealRange(revealRange, TextEditorRevealType.InCenter);

			// 'expand: undefined' respects the pre-existing state of the item
			// 'expand: Number.MAX_SAFE_INTEGER'
			await symbolView.reveal(node, {expand: undefined, focus: false, select: true});
			await window.showTextDocument(editor.document);  // focus the document to show selections
		}),
	);

	context.subscriptions.push(window.onDidChangeActiveTextEditor(async (textEditor) => {
		if (textEditor) {

			_Globals.updateIsJSTS(textEditor);

			if (symbolView.visible && !SymbolsProvider.locked) {
				// await symbolProvider.refresh('');
				await symbolProvider.debouncedRefresh('');  // doesn't help if rapidly switch editors?
			}
		}
	}));
}

export function deactivate() {}
