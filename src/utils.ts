import * as path from 'path'
import { readFileSync, fsStat, createFile, writeFile } from './files'

/**
 * 查询模块版本
 * @param {object} deps 依赖信息
 * @param {string} dir 项目路径
 */
export const queryModuleVersion = (deps: stringObject, dir: string): stringObject => {
  let modules: stringObject = {}
  for (let key in deps) {
    try {
      let file = readFileSync(path.join(dir, 'node_modules', key, 'package.json'))
      let info = JSON.parse(file)
      modules[key] = info.version || '--'
    } catch (e) {
      modules[key] = '--'
    }
  }
  return modules
}
/**
 * 抽出模块名
 * @param {object} deps 依赖信息
 * @param {string} dir 项目路径
 */
export const extractModule = (window): string => {
  const editor = window.activeTextEditor
  const selection = editor.selection
  try {
    // selection.start.line == selection.end.line
    if (editor) {
      const result = (editor._documentData._lines[selection.start.line] || '').match(/"(.*?)"|'(.*?)'/) || []
      return result[1] || result[2]
    }
  } catch (e) {
    console.log(e)
  }
  return ''
}
const writeInfo = (path, data, window) => {
  return writeFile(path, typeof data === 'string' ? data : JSON.stringify(data, null, 2))
    .then(() => {
      window.showInformationMessage('查询依赖版本完毕')
    }).catch((err: Error) => {
      window.showErrorMessage('写入失败')
    })
}
/**
 * 输出 package.json 中依赖模块的实际版本信息
 * @param {object} fsDir 输出目录
 * @param {object} window vscode窗口api
 * @param {object} out 要输出的信息
 */
export const outPackage = (fsDir: string, window, out: stringObject): void => {
  fsStat(path.join(fsDir, 'package_out.json'))
    .then((data: string) => {
      window.showQuickPick(['是', '否'], {
        placeHolder: '是否覆盖原有的 package_out.json 文件?'
      }).then((res) => {
        if (res === '是') {
          writeInfo(path.join(fsDir, 'package_out.json'), out, window)
        }
      })
    }).catch((err: Error) => {
      writeInfo(path.join(fsDir, 'package_out.json'), out, window)
    })
}

export const isEmpty = (obj: object): Boolean => {
  if (obj instanceof Object) {
    for (let k in obj) {
      return false
    }
  }
  return true
}

export default {
  queryModuleVersion,
  extractModule,
  outPackage,
  isEmpty
}
