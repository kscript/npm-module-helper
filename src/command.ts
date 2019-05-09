import * as path from 'path'
import * as vscode from 'vscode'
import { extractModule, queryModuleVersion, isEmpty, outPackage } from './utils'
import { currentPath, readFile, fsStat } from './files'
import app from './app'
import { Commands } from './types/command';

const window = vscode.window
let disposables: vscode.Disposable[] = []
let terminalInstance: vscode.Terminal = null

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
  let configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('moduleHelper')
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
 * 合成指令语句
 * @func
 * @param {string} command 要执行的指令
 * @param {string} modules 要安装的模块
 * @param {string} mode 依赖类型
 * @returns {string} 一条最终合成的指令语句
 */
export const Command = (command: string, modules?: string, mode?: string): string => {
  let manager: string = app.configuration.manager
  let commands: stringObject = app.commands[manager]

  if (commands.hasOwnProperty(command)) {
    command = commands[command]
  }
  return [
    manager,
    command,
    modules || '',
    mode || ''
  ].slice(0, modules ? 4 : 2).join(' ')
}

/**
 * 执行一条命令
 * @param {object} context vscode传递给插件的环境
 * @param {string} command 要执行的命令
 * @returns {object} 终端实例
 */
export const execCommand = (context: Commands.Context, command: string): vscode.Terminal => {
  let myTerminal: vscode.Terminal = terminal()
  cdProjectPath(myTerminal, context)
  myTerminal.sendText(command)
  myTerminal.show()
  return myTerminal
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
 * 注册vs命令
 * @returns {array} 已注册的命令列表 
 */
export const registerCommand = (command: string, func?: Function): vscode.Disposable => {
  return disposables[
    disposables.push(
      vscode.commands.registerCommand(command, (context: Commands.Context) => {
        try {
          currentPath(context, (err: Error, context: Commands.Context) =>  {
            func && func(context)
          })
        } catch (e) {
          console.log(e)
        }
      })
    )
  ]
}

/**
 * 批量注册vs命令
 * @param {object|array} 命令集
 * @returns {array} 已注册的命令列表 
 */
export const registerCommands = (commands: functionObject | [[string, Function]]): vscode.Disposable[] => {
  if (commands instanceof Object) {
    if (commands instanceof Array) {
      for (let i = 0; i < commands.length; i++) {
        registerCommand.apply(null, commands[i])
      }
    } else {
      for (let com in commands) {
        if (commands.hasOwnProperty(com)) {
          registerCommand(com, commands[com])
        }
      }
    }
  }
  return disposables
}

/**
 * 安装项目依赖
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
export const npmInstall = (context: Commands.Context) => {
  currentPath(context, (err: Error, context: Commands.Context) => {
    if (err) {
      window.showErrorMessage("选择无效")
    } else {
      readFile(path.join(context.fsDir, 'package.json'))
        .then((data: string) => {
          execCommand(context, Command('i'))
        }).catch((err: Error) => {
          window.showErrorMessage("未找到 package.json 文件")
        })
    }
  })
}

/**
 * 查询当前项目依赖的版本
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
export const queryPackageVersion = (context: Commands.Context) => {
  currentPath(context, (err: Error, context: Commands.Context) => {
    let fsDir: string = context.fsDir
    readFile(path.join(fsDir, 'package.json'))
      .then((data: string) => {
        try {
          let out = JSON.parse(data)
          if (out instanceof Object) {
            fsStat(path.join(fsDir, 'node_modules')).then((data) => {
              if (out.dependencies) {
                out.dependencies = queryModuleVersion(out.dependencies, fsDir)
              }
              if (out.devDependencies) {
                out.devDependencies = queryModuleVersion(out.devDependencies, fsDir)
              }
              if (isEmpty(out.dependencies) && isEmpty(out.devDependencies)) {
                window.showInformationMessage("查询依赖版本完毕! 依赖为空!")
              } else {
                outPackage(fsDir, window, out)
              }
            }).catch((err: Error) => {
              window.showErrorMessage("未找到 node_modules 目录")
            })
          }
        } catch (e) {
          window.showErrorMessage("package.json 文件损坏")
        }
      }).catch((err: Error) => {
        window.showErrorMessage("未找到 package.json 文件")
      })
  })
}

/**
 * 根据用户触发的命令来执行相应的指令 (弃用 0.2.4 已放开限制)
 * @param {object} context vscode传递给插件的环境
 * @param {string} type 用户触发的命令
 * @param {function=} func 获取到用户选择的模块时的回调
 * @returns {void}
 */
export const moduleHandlerByType = (context: Commands.Context, type: string, func?: Function) => {
  type = app.types[type] || type

  let manager: string = app.configuration.manager
  let len: number = 3

  if (manager === 'yarn' && type === 'update') {
    len = 2
  }
  selectedModule(context, (hasModule: string[], selected: string) => {
    // 如果回调不存在, 或返回true
    if (!func || func(hasModule, selected, terminal)) {
      if (hasModule[0]) {
        execCommand(context, Command.apply(null, [type, selected, '-S'].slice(0, len)))
      }
      if (hasModule[1]) {
        execCommand(context, Command.apply(null, [type, selected, '-D'].slice(0, len)))
      }
    }
  })
}

/**
 * 获取用户选择的模块 (弃用 0.2.4 已放开限制)
 * @param context vscode传递给插件的环境
 * @param func 获取成功时的回调
 */
export const selectedModule = (context: Commands.Context, func?: Function) => {
  let selected: string = extractModule(window)

  if (selected) {
    readFile(context.fsPath)
      .then((data: string) => {
        let packageJson: Commands.packageJson = formatPackage(data)
        let hasModule: string[] = [packageJson.dependencies[selected], packageJson.devDependencies[selected]]
        if (hasModule[0] || hasModule[1]) {
          try {
            if (func) {
              func(hasModule, selected)
            }
          } catch (e) {
            console.log(e)
          }
        } else {
          window.showErrorMessage("选择模块无效")
        }
      }).catch((err: Error) => {
        window.showErrorMessage("验证选择失败")
      })
  }
}

/**
 * 根据用户触发的命令来执行相应的指令 (不验证package.json)
 * @param {object} context vscode传递给插件的环境
 * @param {object} info 执行命令时用到的一些信息
 * @returns {void}
 */
export const moduleHandlerByType2 = (context: Commands.Context, info: Commands.info) => {
  info = Object.assign({
    match: '文件类型不匹配, 当前命令已忽略, 如需在当前文件执行' + app.texts[info.type] + '命令, 请先在设置中配置[匹配文件类型]',
    select: '当前行找不到有效的模块'
  }, info)
  let stats = (path.parse(context.path) || { ext: '', base: '' })
  let ext: string = stats.ext.slice(1)
  if (stats.base === 'package.json' || (ext && new RegExp(app.configuration.ext).test(ext))) {
    let selected: string = extractModule(window)
    if (selected) {
      execCommand(context, Command(info.type, selected, '-D'))
    } else {
      window.showInformationMessage(info.select)
    }
  } else {
    window.showInformationMessage(info.match)
  }
}

export const myCommands = {
  proxy,
  npmInstall,
  updateConfiguration,
  moduleHandlerByType2,
  queryPackageVersion,
  moduleHandlerByType,
  execCommand,
  selectedModule,
  registerCommand,
  registerCommands,
  terminal
}
export default myCommands
