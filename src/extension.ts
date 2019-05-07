import command from './command'
// 使用代理函数, 动态读取用户配置
function proxy(){
  if (command && command.proxy) {
    return command.proxy()
  }
  return command
}

// 插件入口, 用于注册命令
function activate(context) {
  let disposables = command.registerCommands({
    'moduleHelper.queryModulesVersion': function (context) {
      proxy().queryPackageVersion(context)
    },

    'moduleHelper.moduleInstall': function (context) {
      proxy().moduleHandlerByType2(context, { type: 'install' })
    },
    'moduleHelper.moduleInstall2': function (context) {
      proxy().moduleHandlerByType2(context, { type: 'install' })
    },

    'moduleHelper.moduleUninstall': function (context) {
      proxy().moduleHandlerByType2(context, { type: 'uninstall' })
    },
    'moduleHelper.moduleUninstall2': function (context) {
      proxy().moduleHandlerByType2(context, { type: 'uninstall' })
    },

    'moduleHelper.moduleRebuild': function (context) {
      proxy().moduleHandlerByType2(context, { type: 'rebuild' })
    },
    'moduleHelper.moduleUpdate': function (context) {
      proxy().moduleHandlerByType2(context, { type: 'update' })
    },

    'moduleHelper.npmInstall': function (context) {
      proxy().npmInstall(context)
    }
  })
  // context.subscriptions = context.subscriptions.concat(disposables)
}

// this method is called when your extension is deactivated
function deactivate() {
}

exports.activate = activate
exports.deactivate = deactivate
