var path = require('path')
var files = require('./files')
module.exports = {
  queryModuleVersion: function (deps, _dir) {
    var info
    var file
    var modules = {}
    for (var key in deps) {
      if (deps.hasOwnProperty(key)) {
        try {
          file = files.readFileSync(path.join(_dir, 'node_modules', key, 'package.json'))
          info = JSON.parse(file)
          modules[key] = info.version || '--'
        } catch (e) {
          modules[key] = '--'
        }
      }
    }
    return modules
  },
  extractModule: function (window) {
    var editor = window.activeTextEditor
    var selection = editor.selection
    try {
      // selection.start.line == selection.end.line
      if (editor) {
        var result = (editor._documentData._lines[selection.start.line]||'').match(/"(.*?)"|'(.*?)'/) || [];
        return result[1] || result[2]
      }
    } catch (e) {
      console.log(e)
    }
  },
  outPackage: function (fsDir, window, out) {
    files.fsStat(path.join(fsDir, 'package_out.json'), function (error, stat) {
      if (error) {
        files.createFile(path.join(fsDir, 'package_out.json')).then(function (file) {
          files.writeFile(file, JSON.stringify(out, null, 2))
        })
        window.showInformationMessage("查询依赖版本完毕!")
      } else {
        window.showQuickPick(["是", "否"], {
          placeHolder: "覆盖原有的 package_out.json 文件?"
        }).then(function (needCss) {
          if (needCss === '是') {
            files.writeFile(
              path.join(fsDir, 'package_out.json'),
              JSON.stringify(out, null, 2),
              function (error) {
                if (error) {
                  window.showErrorMessage("写入失败!")
                } else {
                  window.showInformationMessage("查询依赖版本完毕!")
                }
              })
          }
        })
      }
    })
  },
  isEmpty: function (obj) {
    if (!(obj instanceof Object)) return false
    for (var k in obj) {
      return false
    }
    return true
  },
  extend: function (source, target, cover) {
    target = target || {}
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        if (cover || !target.hasOwnProperty(key)) {
          target[key] = source[key]
        }
      }
    }
    return target
  }
}
