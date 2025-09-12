import {ExtensionContext, commands, workspace, window, Uri} from 'vscode';
import {getSettings} from './configs';
import {getSymbols, getNodes, render} from './quickPick';

import {SymMap, SymbolMap, NodePickItem, NodePickItems} from './types';


let currentUri: Uri;
let refreshSymbols: boolean = true;
let useTSC: boolean = false;

let usesArrowFunctions: boolean = false;
export {usesArrowFunctions, refreshSymbols, currentUri, useTSC};

export function activate(context: ExtensionContext) {

	const showQuickPick = commands.registerCommand('symbol-jump-and-select.showQuickPick', async (args) => {

		const document = window.activeTextEditor?.document;
		if (!document) return;

		// let symbols: NodePickItem[] | Map<DocumentSymbol, number> | undefined;
		let symbols: NodePickItems | SymbolMap | undefined;

		let kbSymbols: (keyof SymMap)[];
		// if triggered by Command Pallette, args is undefined

		if (!!args?.symbols && !Array.isArray(args?.symbols)) args.symbols = [args.symbols];
		else if (Array.isArray(args?.symbols) && args?.symbols?.length === 0) args.symbols = undefined;
		// default is all symbols

		kbSymbols = args?.symbols || undefined;

		const useTSC = await getSettings();

		if (!!document.languageId.match(/javascript|typescript|javascriptreact|typescriptreact/))
			usesArrowFunctions = true;

		// if "javascript" and useTSC setting = true
		if (usesArrowFunctions && useTSC) symbols = await getNodes(document);      // NodePickItem[] | undefined
		else symbols = await getSymbols(kbSymbols, document, usesArrowFunctions);   // Map<DocumentSymbol, number> | undefined

		// TODO: filter
		if (symbols) await render(symbols);
	});
	context.subscriptions.push(showQuickPick);

	// if active document has changed or current document was edited
	context.subscriptions.push(workspace.onDidChangeTextDocument(async (event) => {
		// check not keybindings/settings.json
		// if (event.contentChanges.length) updateGlobalRefresh(true);
		if (event.contentChanges.length) refreshSymbols = true;
	}));

	context.subscriptions.push(workspace.onDidChangeConfiguration(async (event) => {
		// if (event.affectsConfiguration("symbol-jump-and-select")) updateGlobalUseTSC(await getSettings() as boolean);
		if (event.affectsConfiguration("symbol-jump-and-select")) useTSC = await getSettings() as boolean;
	}));
}


/**
 * Setter for the "global" refreshSymbols
 * Needed if refreshSymbols was exported, to be used in onDidChangeTextDocument().
 */
export function updateGlobalUseTSC(useTSCsetting: boolean) {
	useTSC = useTSCsetting;
}

/**
 * Setter for the "global" refreshSymbols
 * Needed if refreshSymbols was exported, to be used in onDidChangeTextDocument().
 */
export function updateGlobalRefresh(refresh: boolean) {
	refreshSymbols = refresh;
}

/**
 * Setter for the "global" currentUri
 * Needed if refreshSymbols was exported, to be used in onDidChangeTextDocument().
 */
export function updateGlobalUri(uri: Uri) {
	currentUri = uri;
}

export function deactivate() {}
