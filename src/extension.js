// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var command = require('./command');
var app = require('./app');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function activate(context) {
    var disposables = app.registerCommands({
        'extension.queryModulesVersion': function (context) {
            command.queryPackageVersion(context);
        },
        'extension.moduleUninstall': function (context) {
            command.moduleUninstall(context, 'uninstall');
        },
        'extension.moduleInstall': function (context) {
            command.moduleHandlerByType(context, 'install');
        },
        'extension.moduleRebuild': function (context) {
            command.moduleHandlerByType(context, 'rebuild');
        },
        'extension.moduleUpdate': function (context) {
            command.moduleHandlerByType(context, 'update');
        },
        'extension.cnpmInstall': function (context) {
            command.cnpmInstall(context);
        }
    });
    context.subscriptions = context.subscriptions.concat(disposables);
}

// this method is called when your extension is deactivated
function deactivate() {
}


exports.activate = activate;
exports.deactivate = deactivate;