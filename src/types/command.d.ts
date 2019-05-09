import * as vscode from 'vscode'

declare module Commands {
    export interface info {
        type: string;
        select?: string;
        match?: string;
    }
    export interface packageJson {
        dependencies?: stringObject,
        devDependencies?: stringObject
    }
    export interface customContext {
        path: string;
        fsDir: string;
        fsPath: string;
    }
    export type Context = vscode.ExtensionContext & customContext;
    export function formatPackage (data: string): packageJson
}
