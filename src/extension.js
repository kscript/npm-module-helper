var command = require('./command')
// 使用代理函数, 动态读取用户配置
function proxy(){
  if (command && command.proxy) {
    return command.proxy()
  }
  return command
}

// 插件入口, 用于注册命令
function activate(context) {

  var disposables = command.registerCommands({
    'moduleHelper.queryModulesVersion': function (context) {
      proxy().queryPackageVersion(context)
    },
    'moduleHelper.moduleUninstall': function (context) {
      proxy().moduleUninstall(context, 'uninstall')
    },
    'moduleHelper.moduleInstall': function (context) {
      proxy().moduleHandlerByType(context, 'install')
    },
    'moduleHelper.moduleInstall2': function (context) {
      proxy().moduleInstall2(context)
    },
    'moduleHelper.moduleRebuild': function (context) {
      proxy().moduleHandlerByType(context, 'rebuild')
    },
    'moduleHelper.moduleUpdate': function (context) {
      proxy().moduleHandlerByType(context, 'update')
    },
    'moduleHelper.npmInstall': function (context) {
      proxy().npmInstall(context)
    }
  })
  context.subscriptions = context.subscriptions.concat(disposables)
}

// this method is called when your extension is deactivated
function deactivate() {
}

exports.activate = activate
exports.deactivate = deactivate
