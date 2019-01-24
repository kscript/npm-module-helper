var path = require('path');
var files = require('./files');
module.exports = {
  queryModuleVersion: function (deps, _dir) {
    var info;
    var file;
    var modules = {};

    for (var key in deps) {
      if (deps.hasOwnProperty(key)) {
        try {
          file = files.readFileSync(path.join(_dir, 'node_modules', key, 'package.json'));
          info = JSON.parse(file);
          modules[key] = info.version || '--';
        } catch (e) {
          modules[key] = '--';
        }
      }
    }
    return modules;
  },
  extractModule: function (window) {
    var editor = window.activeTextEditor;
    var selection = editor.selection;
    try {
      if (!editor) return;
      // 如果用户选择了多行, 则直接提示 
      if (selection.start.line != selection.end.line) {
        window.showErrorMessage("模块无效, 不能执行命令");
        return;
      }
      var line = editor._documentData._lines[selection.start.line];
      var text = editor.document.getText(selection);
      var modules = line.match(/"(.*?)"/g);
      var selected = '';
      var right = '';
      if (!modules) {
        window.showErrorMessage("模块无效, 不能执行命令");
      } else if (modules && modules.length < 3) {
        selected = modules[0].slice(1, -1);
      } else {
        var right = line.slice(selection.start.character);
        if (right.indexOf('"') < 0) {
          window.showErrorMessage("模块无效, 不能执行命令");
        } else {
          selected = right.slice(0, right.indexOf('"'));
        }
      }
    } catch (e) {
      console.log(e)
    }
    return selected;
  },
  outPackage: function (fsDir, window, out) {
    files.fsStat(path.join(fsDir, 'package_out.json'), function (error, stat) {
      if (error) {
        files.createFile(path.join(fsDir, 'package_out.json')).then(function (file) {
          files.writeFile(file, JSON.stringify(out, null, 2));
        });
        window.showInformationMessage("查询依赖版本完毕!");
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
                  window.showErrorMessage("写入失败!");
                } else {
                  window.showInformationMessage("查询依赖版本完毕!");
                }
              });
          }
        });
      }
    })
  },
  isEmpty: function (obj) {
    if (!(obj instanceof Object)) return false;
    for (var k in obj) {
      return false;
    }
    return true;
  },
  extends: function(source, target){
    target = target || {};
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target = source[key];
      }
    }
    return target;
  }
}
