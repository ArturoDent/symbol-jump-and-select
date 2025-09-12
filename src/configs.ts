import {workspace} from 'vscode';

const EXTENSION_NAME = "symbol-jump-and-select";

export async function getSettings() {

  const config = workspace.getConfiguration(EXTENSION_NAME);
  return await config.get('useTypescriptCompiler');
}