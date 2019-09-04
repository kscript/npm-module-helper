import command from './command'
import * as vscode from 'vscode'

const getContext = (context) => {
  return context || (vscode.window.activeTextEditor ? Object.assign({},vscode.window.activeTextEditor['_documentData']._uri) : context)
}

// 使用代理函数, 动态读取用户配置
const proxy = () => {
  if (command && command.proxy) {
    return command.proxy()
  }
  return command
}

// 插件入口, 用于注册命令
exports.activate = (context) => {
  let commands = {
    'moduleHelper.queryModulesVersion': (command, context) => {
      command.queryPackageVersion(context)
    },
    'moduleHelper.moduleInstall': (command, context) => {
      command.moduleHandlerByType2(context, { type: 'install' })
    },
    'moduleHelper.moduleInstall2': (command, context) => {
      command.moduleHandlerByType2(context, { type: 'install' })
    },
    'moduleHelper.moduleUninstall': (command, context) => {
      command.moduleHandlerByType2(context, { type: 'uninstall' })
    },
    'moduleHelper.moduleUninstall2': (command, context) => {
      command.moduleHandlerByType2(context, { type: 'uninstall' })
    },
    'moduleHelper.moduleRebuild': (command, context) => {
      command.moduleHandlerByType2(context, { type: 'rebuild' })
    },
    'moduleHelper.moduleUpdate': (command, context) => {
      command.moduleHandlerByType2(context, { type: 'update' })
    },
    'moduleHelper.npmInstall': (command, context) => {
      command.npmInstall(context)
    }
  }
  for(let key in commands) {
    vscode.commands.registerCommand(key, (context) => {
      commands[key](proxy(), getContext(context))
    });
  }
}
// this method is called when your extension is deactivated
exports.deactivate = () => {}
