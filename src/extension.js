// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var command = require('./command');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function proxy(){
  if (command && command.proxy) {
    return command.proxy();
  }
  return command;
}
// 插件入口, 用于注册命令

function activate(context) {
  var disposables = command.registerCommands({
    'moduleHelper.queryModulesVersion': function (context) {
      proxy().queryPackageVersion(context);
    },
    'moduleHelper.moduleUninstall': function (context) {
      proxy().moduleUninstall(context, 'uninstall');
    },
    'moduleHelper.moduleInstall': function (context) {
      proxy().moduleHandlerByType(context, 'install');
    },
    'moduleHelper.moduleRebuild': function (context) {
      proxy().moduleHandlerByType(context, 'rebuild');
    },
    'moduleHelper.moduleUpdate': function (context) {
      proxy().moduleHandlerByType(context, 'update');
    },
    'moduleHelper.npmInstall': function (context) {
      proxy().npmInstall(context);
    }
  });
  context.subscriptions = context.subscriptions.concat(disposables);
}

// this method is called when your extension is deactivated
function deactivate() {
}

exports.activate = activate;
exports.deactivate = deactivate;
