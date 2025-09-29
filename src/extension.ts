import {ExtensionContext, commands, workspace, window, Uri} from 'vscode';
import {getSettings} from './configs';
import {SymMap, SymbolMap, NodePickItems} from './types';

let lastUri: Uri | undefined = window.activeTextEditor?.document.uri;
let refreshSymbols: boolean = true;

// this must be after the export globals above
import {getSymbols, getNodes, render} from './quickPick';


export function activate(context: ExtensionContext) {

	const showQuickPick = commands.registerCommand('symbol-jump-and-select.showQuickPick', async (args) => {

		const document = window.activeTextEditor?.document;
		if (!document) return;

		let symbols: NodePickItems | SymbolMap | undefined;

		let kbSymbols: (keyof SymMap)[];
		// if triggered from Command Palette, args is undefined

		if (!!args?.symbols && !Array.isArray(args?.symbols)) args.symbols = [args.symbols];
		else if (Array.isArray(args?.symbols) && args?.symbols?.length === 0) args.symbols = undefined;
		// default is all symbols

		kbSymbols = args?.symbols || undefined;

		const useTSC = await getSettings();
		let usesArrowFunctions: boolean;

		if (document.languageId.match(/javascript|typescript|javascriptreact|typescriptreact/))
			usesArrowFunctions = true;
		else usesArrowFunctions = false;

		// make a getNew/clearOld symbols/nodes variable and send it to getNodes/Symbols
		let getNewSymbols = false, getNewNodes = false;

		if (refreshSymbols || lastUri !== document.uri) {
			lastUri = document.uri;
			refreshSymbols = true;
			getNewSymbols = true;
			getNewNodes = true;
		}

		// if "javascript" and useTSC setting = true
		if (usesArrowFunctions && useTSC) symbols = await getNodes(kbSymbols, getNewNodes, document); // NodePickItem[] | undefined = NodePickItems
		else symbols = await getSymbols(kbSymbols, getNewSymbols, usesArrowFunctions, document); // Map<DocumentSymbol, number> | undefined = SymbolMap

		if (symbols) await render(usesArrowFunctions, symbols);
	});
	context.subscriptions.push(showQuickPick);

	// if active document has changed or current document was edited
	context.subscriptions.push(workspace.onDidChangeTextDocument(async (event) => {
		// check not keybindings/settings.json
		if (event.contentChanges.length) refreshSymbols = true;
	}));

	// context.subscriptions.push(workspace.onDidChangeConfiguration(async (event) => {
	// 	if (event.affectsConfiguration("symbol-jump-and-select")) useTSC = await getSettings() as boolean;
	// }));
}


/**
 * Setter for the "global" refreshSymbols
 * Needed if refreshSymbols was exported, to be used in onDidChangeTextDocument().
 */
// export function updateGlobalUseTSC(useTSCsetting: boolean) {
// 	useTSC = useTSCsetting;
// }

/**
 * Setter for the "global" refreshSymbols
 * Needed if refreshSymbols was exported, to be used in onDidChangeTextDocument().
 */
// export function updateGlobalRefresh(refresh: boolean) {
// 	refreshSymbols = refresh;
// }

/**
 * Setter for the "global" currentUri
 * Needed if refreshSymbols was exported, to be used in onDidChangeTextDocument().
 */
// export function updateGlobalUri(uri: Uri) {
// 	lastUri = uri;
// }

export function deactivate() {}
