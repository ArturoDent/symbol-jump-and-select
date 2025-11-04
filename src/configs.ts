import {workspace} from 'vscode';

const EXTENSION_NAME = "symbolsTree";

export async function getUseTscSetting() {
  const config = workspace.getConfiguration(EXTENSION_NAME);
  return await config.get('useTypescriptCompiler');
}

export async function getTreeViewSetting() {
  const config = workspace.getConfiguration(EXTENSION_NAME);
  return await config.get('makeTreeView');
  // const makeTreeView = await config.get('makeTreeView');
  // return (typeof makeTreeView === 'boolean') ? makeTreeView : true;
}