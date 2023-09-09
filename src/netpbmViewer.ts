import * as vscode from "vscode";

export class NetpbmViewerProvider
    implements vscode.CustomReadonlyEditorProvider
{
    private static readonly viewType = "codepbm.netpbmPreview";
    public static register(context: vscode.ExtensionContext) {
        return vscode.window.registerCustomEditorProvider(
            NetpbmViewerProvider.viewType,
            new NetpbmViewerProvider(context)
        );
    }

    constructor(private readonly _context: vscode.ExtensionContext) {}

    public async openCustomDocument(uri: vscode.Uri) {
        return { uri, dispose: () => {} };
    }

    async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel
    ) {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        const scriptUri = webviewPanel.webview.asWebviewUri(
            vscode.Uri.joinPath(
                this._context.extensionUri,
                "webview",
                "netpbm-parser.js"
            )
        );
        const netpbmUri = webviewPanel.webview.asWebviewUri(document.uri);
        webviewPanel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
                <script src="${scriptUri}"></script>
                <script>
                    const uri = "${netpbmUri}";
                    const xhr = new XMLHttpRequest();
                    xhr.open("GET", uri, true);
                    xhr.responseType = "blob";
                    xhr.onload = function () {
                        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                            const reader = new FileReader();
                            reader.onload = function () {
                                const text = reader.result;
                                document.body.appendChild(NetPBM.load(text).getCanvas());
                            };
                            reader.readAsBinaryString(xhr.response);
                        } else {
                            console.error(xhr);
                            document.body.appendChild(document.createTextNode("Failed to load image."));
                        }
                    };
                    xhr.send(null);
                </script>
            </body>
            </html>
        `;
    }
}
