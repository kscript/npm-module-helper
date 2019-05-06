import path from 'path'
import vscode, { window } from 'vscode'
import { extractModule, queryModuleVersion, isEmpty, outPackage } from './utils'
import { currentPath, readFile, fsStat } from './files'
import app from './app'

let disposables = []
let terminalInstance = null
let formatPackage = function (data) {
  let packageJSON = {
    dependencies: {},
    devDependencies: {}
  }
  try {
    packageJSON = JSON.parse(data)
    packageJSON.dependencies = packageJSON.dependencies || {}
    packageJSON.devDependencies = packageJSON.devDependencies || {}
  } catch (e) {
    packageJSON = {
      dependencies: {},
      devDependencies: {}
    }
  }
  return packageJSON
}

let windowTerminal = function (window, name) {
  return window.createTerminal(name || 'cmd')
}

let cdProjectPath = function (terminal, context) {
  // TODO 后期需对项目目录进行判断
  let isProjectPath = false

  if (isProjectPath) {
    // 如果是项目目录, 什么都不做
    // ...
  } else {
    terminal.sendText("cd " + context.fsDir)
  }
}

let handler = {
  /**
   * 
   * @param {string} command 要执行的指令
   * @param {string} modules 要安装的模块
   * @param {string} mode 开发模式/生产模式
   */
  exec: function(command, modules?, mode?:string){
    let manager = app.configuration.manager
    let commands = app.commands[manager]
    command = commands.hasOwnProperty(command) ? commands[command] : command
    return [
      manager,
      command,
      modules || '',
      modules ? mode || '' : ''
    ].slice(0, arguments.length + 1).join(' ')
  },
}

export const terminal = () =>  {
  if (terminalInstance) {
    return terminalInstance
  }
  return terminalInstance = windowTerminal(window, app.configuration.terminalTitle)
}

export const updateConfiguration = () => {
  let configuration = vscode.workspace.getConfiguration('moduleHelper')
  return Object.assign(app.configuration, app.defaults, configuration)
}
export const proxy = () => {
  updateConfiguration()
  return myCommands
}
export const npmInstall = (context) => {
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
          myTerminal.sendText(handler.exec('i'))
        }
      })
    } catch (e) {
      console.log(e)
    }
  })
}

export const moduleHandlerByType2 = (context, info) =>  {
  info = info || {}
  let myTerminal = terminal()
  let ext = (path.parse(context.path) || {ext: ''}).ext.slice(1)
  let selected
  if (ext && new RegExp(app.configuration.ext).test(ext)){
    selected = extractModule(window)
    if (selected) {
      myTerminal.show()
      myTerminal.sendText(handler.exec.apply(handler, [info.type, selected, '-D']))
    } else {
      info.select && window.showInformationMessage(info.select)
    }
  } else {
    info.match && window.showInformationMessage(info.match)
  }
}
export const moduleInstall2 = (context) => {
  moduleHandlerByType2(context, {
    type: 'install',
    match: '"当前文件类型不匹配, 如需安装, 请先在设置中配置"',
    select: "当前行找不到有效的模块"
  })
}

export const moduleUninstall2 = (context) =>  {
  moduleHandlerByType2(context, {
    type: 'uninstall',
    match: '"当前文件类型不匹配, 如需删除, 请先在设置中配置"',
    select: "当前行找不到有效的模块"
  })
}

export const queryPackageVersion = (context) =>  {
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
export const moduleHandlerByType = (context, type, func?) =>  {
  type = app.types[type] || type
  let manager = app.configuration.manager
  let len = manager === 'yarn' && type === 'update' ? 2 : 3
  moduleHandler(context, function (hasModule, selected, terminal) {
    // 如果回调不存在, 或返回true
    if (!func || func(hasModule, selected, terminal)) {
      hasModule[0] && terminal.sendText(handler.exec.apply(handler, [type, selected, '-S'].slice(0, len)))
      hasModule[1] && terminal.sendText(handler.exec.apply(handler, [type, selected, '-D'].slice(0, len)))
    }
  })
}
export const moduleHandler = (context, func) =>  {
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
export const moduleUninstall = (context, type) =>  {
  let selected = extractModule(window)
  let myTerminal = terminal()
  selected && fsStat(path.join(context.fsDir, 'node_modules', selected), function (error, stat) {
    if (error) {
      window.showInformationMessage("未找到 " + selected + " 模块, 卸载结束!")
    } else {
      readFile(context.fsPath, function (err, data) {
        if (err) {
          return
        }
        let packageJSON = formatPackage(data)
        let hasModule = [packageJSON.dependencies[selected], packageJSON.devDependencies[selected]]
        if (hasModule[0] || hasModule[1]) {
          try {
            cdProjectPath(myTerminal, context)
            myTerminal.show()
            hasModule[0] && myTerminal.sendText(handler.exec(type, selected, '-S'))
            hasModule[1] && myTerminal.sendText(handler.exec(type, selected, '-D'))
          } catch (e) {
            console.log(e)
          }
        }
      })
    }
  })
}
export const registerCommand = (command, func) =>  {
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
export const registerCommands = (commands) =>  {
  let result = []
  if (commands instanceof Object) {
    if (commands instanceof Array) {
      for (let i = 0; i < commands.length; i++) {
        result.push(registerCommand.apply(null, commands))
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
export const myCommands = {
  proxy,
  npmInstall,
  updateConfiguration,
  moduleHandlerByType2,
  moduleInstall2,
  moduleUninstall2,
  queryPackageVersion,
  moduleHandlerByType,
  moduleHandler,
  moduleUninstall,
  registerCommand,
  registerCommands,
  terminal
}
export default myCommands
