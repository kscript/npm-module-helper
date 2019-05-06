import fs from 'fs'
import path from 'path'

export const readFile = (_path, func) => {
  fs.readFile(_path, 'utf8', func)
}
export const readFileSync = (_path) => {
  return fs.readFileSync(_path, 'utf8')
}
export const writeFile = (file, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, data, function (err) {
      if (err) {
        return reject("File allrady exists")
      }
      return resolve()
    })
  })
}
export const createFile = (_path) => {
  return new Promise((resolve, reject) => {
    fs.open(_path, "wx", function (err, fd) {
      if (err) {
        return reject("File allrady exists")
      }
      return resolve(fd)
    })
  })
}
export const fsStat = (_path, func) => {
  fs.stat(_path, func)
}
export const fsStatsync = (_path) => {
  return fs.statSync(_path)
}
export const currentPath = (context, func) => {
  let stats = fsStatsync(context.fsPath)
  if (stats.isFile()) {
    context.isDir = false
    context.fsDir = path.dirname(context.fsPath)
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
