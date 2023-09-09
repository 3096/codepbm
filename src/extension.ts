import * as vscode from "vscode";
import { NetpbmViewerProvider } from "./netpbmViewer";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(NetpbmViewerProvider.register(context));
}

export function deactivate() {}
