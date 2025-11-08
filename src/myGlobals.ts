import {ExtensionContext, window, workspace, Uri, ConfigurationTarget} from 'vscode';

interface MySettings {
  useTypescriptCompiler: boolean;
  makeTreeView: boolean;
  collapseTreeViewItems: string;
}


// export default class _Globals {
export default class _Globals {
  private static readonly section = 'symbolsTree';
  // private constructor() {}  // private so can't be called from outside
  public constructor() {}  // private so can't be called from outside

  // settings
  public static useTypescriptCompiler: boolean = false;
  public static makeTreeView: boolean = true;
  public static collapseTreeViewItems: string = "collapseOnOpen";

  // globals
  public static lastUri: Uri | undefined = window.activeTextEditor?.document.uri;
  public static refreshSymbols: boolean = true;
  public static isJSTS: boolean = false;


  // call this once from activate() ---- await _Globals.init(context);
  public static async init(context?: ExtensionContext): Promise<void> {

    const config = await workspace.getConfiguration(this.section);
    this.useTypescriptCompiler = config.get<boolean>('useTypescriptCompiler', false);
    this.makeTreeView = config.get<boolean>('makeTreeView', true);
    this.collapseTreeViewItems = config.get<string>('collapseTreeViewItems', "collapseOnOpen");

    if (window.activeTextEditor?.document.languageId.match(/javascript|typescript|javascriptreact|typescriptreact/))
      this.isJSTS = true;
    else this.isJSTS = false;

    const disposable = workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(this.section)) {
        const updated = workspace.getConfiguration(this.section);
        this.useTypescriptCompiler = updated.get<boolean>('useTypescriptCompiler', this.useTypescriptCompiler);
        this.makeTreeView = updated.get<boolean>('makeTreeView', this.makeTreeView);
        this.collapseTreeViewItems = updated.get<string>('collapseTreeViewItems', this.collapseTreeViewItems);
      }
    });
    if (context) context.subscriptions.push(disposable);
  }

  // ---- private generic accessors used only inside this class ----
  private static get<T>(key: string, defaultValue?: T): T | undefined {
    const config = workspace.getConfiguration(this.section);
    return config.get<T>(key, defaultValue as T);
  }

  private static set<T>(key: string, value: T, isGlobal = true): Thenable<void> {
    const config = workspace.getConfiguration(this.section);
    const target = isGlobal ? ConfigurationTarget.Global : ConfigurationTarget.Workspace;
    return config.update(key, value, target);
  }

  // ---- public typed helpers that keep cache in sync ----
  public static getSetting<K extends keyof MySettings>(key: K): MySettings[K] | undefined {
    // Prefer reading the cached public member when available
    switch (key) {
      case 'useTypescriptCompiler':
        return this.useTypescriptCompiler as MySettings[K];
      case 'makeTreeView':
        return this.makeTreeView as MySettings[K];

      default:
        return this.get<MySettings[K]>(String(key));
    }
  }

  public static setSetting<K extends keyof MySettings>(key: K, value: MySettings[K], isGlobal = true): void {
    this.set<MySettings[K]>(String(key), value, isGlobal);
    switch (key) {
      case 'useTypescriptCompiler':
        this.useTypescriptCompiler = value as unknown as boolean;
        break;
      case 'makeTreeView':
        this.makeTreeView = value as unknown as boolean;
        break;

      default:
        break;
    }
  }

  // optional: inspect config source
  // public static inspect<K extends keyof MySettings>(key: K) {
  //   const cfg = vscode.workspace.getConfiguration(this.section);
  //   return cfg.inspect<MySettings[K]>(String(key));
  // }
}


// export {_Globals as _Globals};

/**
 * Preferences
 * - Static-only utility for getting/setting extension settings
 * - Uses workspace.getConfiguration(section)
 * - Minimal, no events, no persistence other than VS Code settings
 */
// export class Settings {
//   // change this to your extension configuration section
//   private static readonly section = 'symbolsTree';

//   private constructor() {} // prevent instantiation

//   /** Read a preference with an optional default */
//   public static get<T>(key: string, defaultValue?: T): T | undefined {
//     const config = vscode.workspace.getConfiguration(this.section);
//     return config.get<T>(key, defaultValue as T);
//   }

//   /** Write a preference; returns the Promise from update */
//   public static set<T>(key: string, value: T, isGlobal = true): Thenable<void> {
//     const config = vscode.workspace.getConfiguration(this.section);
//     const target = isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
//     return config.update(key, value, target);
//   }

//   /** Inspect whether a value is coming from user/workspace/folder/default */
//   // public static inspect<T>(key: string) {
//   //   const config = vscode.workspace.getConfiguration(this.section);
//   //   return config.inspect<T>(key);
//   // }

//   /** Convenience typed getters for common keys (optional) */
//   // Example: add typed wrappers for frequently used keys
//   public static get useTypescriptCompiler(): boolean {
//     return this.get<boolean>('useTypescriptCompiler', false) ?? false;
//   }

//   public static set useTypescriptCompiler(v: boolean) {
//     // default to global when using convenience setter
//     void this.set<boolean>('useTypescriptCompiler', v, true);
//   }

//   // Example: add typed wrappers for frequently used keys
//   public static get makeTreeView(): boolean {
//     return this.get<boolean>('makeTreeView', false) ?? false;
//   }

//   public static set makeTreeView(v: boolean) {
//     // default to global when using convenience setter
//     void this.set<boolean>('makeTreeView', v, true);
//   }
// }