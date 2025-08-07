import {ExtensionContext, commands, workspace} from 'vscode';
import {getSymbols, render} from './quickPick';
import {updateGlobalRefresh} from './quickPick';
import {SymMap} from './types';



export function activate(context: ExtensionContext) {

	const showQuickPick = commands.registerCommand('symbol-jump-and-select.showQuickPick', async (args) => {

		let kbSymbols: (keyof SymMap)[];
		// if triggered by Command Pallette, args is undefined

		if (!!args?.symbols && !Array.isArray(args?.symbols)) args.symbols = [args.symbols];
		else if (Array.isArray(args?.symbols) && args?.symbols?.length === 0) args.symbols = undefined;
		// default is all symbols

		kbSymbols = args?.symbols || undefined;

		const symbols = await getSymbols(kbSymbols);  // Map<DocumentSymbol, number>
		if (symbols) await render(symbols);
	});
	context.subscriptions.push(showQuickPick);

	// if active document has changed or current document was edited
	context.subscriptions.push(workspace.onDidChangeTextDocument(async (event) => {
		// check not keybindings/settings.json
		if (event.contentChanges.length) updateGlobalRefresh(true);
	}));
}

export function deactivate() {}
