import * as fs from 'fs'
import * as Path from 'path'

/**
 * 回调函数转promise
 * @param {function} cb 
 */
const cb2promise = (
  cb: (
    done: (err: NodeJS.ErrnoException, data?: any) => any
  ) => any
) => {
  return new Promise((resolve, reject) => {
    cb((err, data) => {
      err ? reject(err) : resolve(data)
    })
  })
}

/**
 * 读文件
 * @param {string} path 文件路径
 * @returns {string} 文件内容
 */
export const readFileSync = (path: string) => {
  return fs.readFileSync(path, 'utf8')
}

/**
 * 读文件
 * @param {string} path 文件路径
 * @returns {object} promise
 */
export const readFile = (path: string) => {
  return cb2promise((cb) => {
    fs.readFile(path, 'utf8', cb)
  })
}

/**
 * 写文件
 * @param {string} path 文件路径
 * @param {string} data 文件内容
 * @returns {object} promise
 */
export const writeFile = (path: string, data) => {
  return cb2promise((cb) => {
    fs.writeFile(path, data, cb)
  })
}

/**
 * 创建文件
 * @param {string} path 文件路径
 * @returns {object} promise
 */
export const createFile = (path) => {
  return cb2promise((cb) => {
    fs.open(path, 'wx', cb)
  })
}

/**
 * 获取文件状态
 * @param {string} path 文件路径
 * @returns {object} promise
 */
export const fsStat = (path) => {
  return cb2promise((cb) => {
    fs.stat(path, cb)
  })
}

/**
 * 同步获取文件状态
 * @param {string} path 文件路径
 * @returns {object} 文件状态信息
 */
export const fsStatsync = (path) => {
  return fs.statSync(path)
}

export const currentPath = (context, func) => {
  let stats = fsStatsync(context.fsPath)
  if (stats.isFile()) {
    context.isDir = false
    context.fsDir = Path.dirname(context.fsPath)
    func && func(null, context)
  } else if (stats.isDirectory()) {
    context.isDir = true
    context.fsDir = context.fsPath
    func && func(null, context)
  } else {
    context.isDir = false
    context.fsDir = context.fsPath
    func && func('typeError', context)
  }
  return context
}

export default {
  readFile,
  readFileSync,
  writeFile,
  createFile,
  fsStat,
  fsStatsync,
  currentPath
}
