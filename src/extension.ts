import command from './command'
// 使用代理函数, 动态读取用户配置
const proxy = () => {
  if (command && command.proxy) {
    return command.proxy()
  }
  return command
}

// 插件入口, 用于注册命令

exports.activate = (context) => {
  let disposables = command.registerCommands({
    'moduleHelper.queryModulesVersion': (context) => {
      proxy().queryPackageVersion(context)
    },

    'moduleHelper.moduleInstall': (context) => {
      proxy().moduleHandlerByType2(context, { type: 'install' })
    },
    'moduleHelper.moduleInstall2': (context) => {
      proxy().moduleHandlerByType2(context, { type: 'install' })
    },

    'moduleHelper.moduleUninstall': (context) => {
      proxy().moduleHandlerByType2(context, { type: 'uninstall' })
    },
    'moduleHelper.moduleUninstall2': (context) => {
      proxy().moduleHandlerByType2(context, { type: 'uninstall' })
    },

    'moduleHelper.moduleRebuild': (context) => {
      proxy().moduleHandlerByType2(context, { type: 'rebuild' })
    },
    'moduleHelper.moduleUpdate': (context) => {
      proxy().moduleHandlerByType2(context, { type: 'update' })
    },

    'moduleHelper.npmInstall': (context) => {
      proxy().npmInstall(context)
    }
  })
  // context.subscriptions = context.subscriptions.concat(disposables)
}
// this method is called when your extension is deactivated
exports.deactivate = () => {}
