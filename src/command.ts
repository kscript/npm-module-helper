/* /// <reference path="./command.d.ts" /> */

import * as path from 'path'
import * as vscode from 'vscode'
import { extractModule, queryModuleVersion, isEmpty, outPackage } from './utils'
import { currentPath, readFile, fsStat } from './files'
import app from './app'
import { Commands } from './types/command';
const window = vscode.window
let disposables: vscode.Disposable[] = []
let terminalInstance = null

/**
 * 对package文件进行处理
 * @func
 * @param {string} data package.json文件内容
 * @returns {object} 项目依赖信息 (不含peerDependencies)
 */
export const formatPackage = (data: string): Commands.packageJson => {
  let result: Commands.packageJson
  try {
    result = JSON.parse(data)
  } catch (e) {
    console.log(e)
  }
  let { dependencies = {}, devDependencies = {} } = result || {}
  return {
    dependencies,
    devDependencies
  }
}

/**
 * 打开项目目录 (预留的方法)
 * @func
 * @param {object} terminal 终端
 * @param {object} context vscode传递给插件的环境
 * @returns {object} 终端
 */
export const cdProjectPath = (terminal: vscode.Terminal, context: Commands.Context): vscode.Terminal => {
  // TODO 后期可能会对项目目录进行判断..
  let isProjectPath = false

  if (isProjectPath) {
    // 如果是项目目录, 什么都不做
    // ...
  } else {
    terminal.sendText("cd " + context.fsDir)
  }
  return terminal
}

/**
 * 合成指令语句
 * @func
 * @param {string} command 要执行的指令
 * @param {string} modules 要安装的模块
 * @param {string} mode 依赖类型
 * @returns {string} 一条最终合成的指令语句
 */
export const Command = (command: string, modules?: string, mode?: string): string => {
  let manager = app.configuration.manager
  let commands = app.commands[manager]
  command = commands.hasOwnProperty(command) ? commands[command] : command
  return [
    manager,
    command,
    modules || '',
    modules ? mode || '' : ''
  ].join(' ')
}

/**
 * 返回一个终端 (单例)
 * @returns {string} 一条最终合成的指令语句
 */
export const terminal = (): vscode.Terminal => {
  if (terminalInstance) {
    return terminalInstance
  }
  return terminalInstance = window.createTerminal(app.configuration.terminalTitle)
}

/**
 * 更新配置信息
 * @returns {string} 返回最新的配置信息
 */
export const updateConfiguration = (): App["configuration"] => {
  let configuration = vscode.workspace.getConfiguration('moduleHelper')
  return Object.assign(app.configuration, app.defaults, configuration)
}

/**
 * 用户触发命令时调用的一个代理方法
 * @returns {string} 返回所有可以执行的方法
 */
export const proxy = (): functionObject => {
  updateConfiguration()
  return myCommands
}
/**
 * 注册命令
 * @returns {array} 已注册的命令列表 
 */
export const registerCommand = (command: string, func?: Function): vscode.Disposable[] => {
  return disposables = disposables.concat(
    vscode.commands.registerCommand(command, function (context) {
      try {
        currentPath(context, function (err, context) {
          func && func(context)
        })
      } catch (e) {
        console.log(e)
      }
    })
  )
}
/**
 * 批量注册命令
 * @param {object|array} 命令集
 * @returns {array} 已注册的命令列表 
 */
export const registerCommands = (commands: functionObject | [[string, Function]]) => {
  let result = []
  if (commands instanceof Object) {
    if (commands instanceof Array) {
      for (let i = 0; i < commands.length; i++) {
        result.push(registerCommand.apply(null, commands[i]))
      }
    } else {
      for (let com in commands) {
        if (commands.hasOwnProperty(com)) {
          result.push(registerCommand(com, commands[com]))
        }
      }
    }
  }
  return disposables = disposables.concat(result)
}

/**
 * 安装项目依赖
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
export const npmInstall = (context: Commands.Context) => {
  let myTerminal = terminal()
  currentPath(context, function (err, context) {
    if (err) {
      window.showErrorMessage("选择无效")
      return
    }
    try {
      readFile(path.join(context.fsDir, 'package.json'), function (err, data) {
        if (err) {
          window.showErrorMessage("未找到 package.json 文件")
        } else {
          cdProjectPath(myTerminal, context)
          myTerminal.show()
          myTerminal.sendText(Command('i'))
        }
      })
    } catch (e) {
      console.log(e)
    }
  })
}

/**
 * 查询当前项目依赖的版本
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
export const queryPackageVersion = (context: Commands.Context) => {
  currentPath(context, function (err, context) {
    let fsDir = context.fsDir
    readFile(path.join(fsDir, 'package.json'), function (err, data) {
      if (err) {
        window.showErrorMessage("未找到 package.json 文件")
      } else {
        let packageJSON = JSON.parse(data)
        let out = packageJSON
        fsStat(path.join(fsDir, 'node_modules'), function (error, stat) {
          if (error) {
            window.showErrorMessage("未找到 node_modules 目录")
          } else {
            packageJSON.dependencies && (out.dependencies = queryModuleVersion(packageJSON.dependencies, fsDir))
            packageJSON.devDependencies && (out.devDependencies = queryModuleVersion(packageJSON.devDependencies, fsDir))
            if (isEmpty(out.dependencies) && isEmpty(out.devDependencies)) {
              window.showInformationMessage("查询依赖版本完毕! 依赖为空!")
            } else {
              outPackage(fsDir, window, out)
            }
          }
        })
      }
    })
  })
}
/**
 * 获取用户选择的模块
 * @param context vscode传递给插件的环境
 * @param func 获取成功时的回调
 */
export const selectedModule = (context: Commands.Context, func?: Function) => {
  let selected = extractModule(window)
  let myTerminal = terminal()
  selected && readFile(context.fsPath, function (err, data) {
    if (err) {
      return
    }
    let packageJSON = formatPackage(data)
    let hasModule = [packageJSON.dependencies[selected], packageJSON.devDependencies[selected]]
    if (hasModule[0] || hasModule[1]) {
      try {
        cdProjectPath(myTerminal, context)
        myTerminal.show()
        func && func(hasModule, selected, myTerminal)
      } catch (e) {
        console.log(e)
      }
    } else {
      window.showErrorMessage("选择模块无效!")
    }
  })
}

/**
 * 根据用户触发的命令来执行相应的指令
 * @param {object} context vscode传递给插件的环境
 * @param {string} type 用户触发的命令
 * @param {function=} func 获取到用户选择的模块时的回调
 * @returns {void}
 */
export const moduleHandlerByType = (context: Commands.Context, type: string, func?: Function) => {
  type = app.types[type] || type
  let manager = app.configuration.manager
  let len = manager === 'yarn' && type === 'update' ? 2 : 3
  selectedModule(context, (hasModule, selected, terminal) => {
    // 如果回调不存在, 或返回true
    if (!func || func(hasModule, selected, terminal)) {
      hasModule[0] && terminal.sendText(Command.apply(null, [type, selected, '-S'].slice(0, len)))
      hasModule[1] && terminal.sendText(Command.apply(null, [type, selected, '-D'].slice(0, len)))
    }
  })
}

/**
 * 根据用户触发的命令来执行相应的指令 (不验证package.json)
 * @param {object} context vscode传递给插件的环境
 * @param {object} info 执行命令时用到的一些信息
 * @returns {void}
 */
export const moduleHandlerByType2 = (context: Commands.Context, info: Commands.info) => {
  info = Object.assign({
    match: '文件类型不匹配, 当前命令已忽略, 如需执行' + app.texts[info.type]+ '命令, 请在设置中配置[匹配文件类型]',
    select: '当前行找不到有效的模块'
  }, info)
  let myTerminal = terminal()
  let ext = (path.parse(context.path) || { ext: '' }).ext.slice(1)
  let selected
  if (ext && new RegExp(app.configuration.ext).test(ext)) {
    selected = extractModule(window)
    if (selected) {
      myTerminal.show()
      myTerminal.sendText(Command(info.type, selected, '-D'))
    } else {
      info.select && window.showInformationMessage(info.select)
    }
  } else {
    info.match && window.showInformationMessage(info.match)
  }
}

export const myCommands = {
  proxy,
  npmInstall,
  updateConfiguration,
  moduleHandlerByType2,
  queryPackageVersion,
  moduleHandlerByType,
  selectedModule,
  registerCommand,
  registerCommands,
  terminal
}
export default myCommands
