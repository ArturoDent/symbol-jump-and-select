import {window, commands, Uri, TreeView} from 'vscode';
import type {SymbolNode} from './types';
import * as Globals from './myGlobals';


export function showQuickPickMessage(message: string): void {

  const _Globals = Globals.default;

  const buttons = ['Readme Symbols', 'Close'];  // two buttons

  window
    .showInformationMessage(message,
      {modal: false},
      ...buttons)
    .then(selected => {
      if (selected === 'Close') commands.executeCommand('leaveEditorMessage');
      else if (selected === 'Readme Symbols') {
        const readmeUri = Uri.joinPath(_Globals.context.extensionUri, 'README.md');
        const anchorId = 'symbols-options';
        const target = readmeUri.with({fragment: encodeURIComponent(anchorId)});
        commands.executeCommand('markdown.showPreviewToSide', target);
      }
    });
}

export function showTreeViewMessage(message: string, view: TreeView<SymbolNode>): void {
  view.message = message;
}

export function showSimpleMessage(message: string): void {
  const buttons = ['Close'];

  window
    .showInformationMessage(message,
      {modal: false},
      ...buttons)
    .then(selected => {
      if (selected === 'Close') commands.executeCommand('leaveEditorMessage');
    });
}