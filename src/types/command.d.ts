import { ExtensionContext } from 'vscode'

declare namespace Commands {
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
    export type Context = ExtensionContext & customContext;
    export type test = string;
    export function formatPackage (data: string): packageJson
}
