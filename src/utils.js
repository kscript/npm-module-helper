var fs = require('fs');
var path = require('path');
var vscode = require('vscode');
module.exports = {
  // 依赖 this / vscode
  registerCommand: function (command, func) {
    var Util = this;
    return vscode.commands.registerCommand(command, function (context) {
      try{
        Util.formatDir(context, function (err, context) {
          func && func(context);
        });
      }catch(e){
        console.log(e);
      }
    });
  },
  registerCommands: function (commands) {
    var Util = this;
    var result = [];
    if (commands instanceof Object) {
      if (commands instanceof Array) {
        for (var i = 0; i < commands.length; i++) {
          result.push(Util.registerCommand.apply(Util, commands));
        }
      } else {
        for (var k in commands) {
          if (commands.hasOwnProperty(k)) {
            result.push(Util.registerCommand.call(Util, k, commands[k]));
          }
        }
      }
    }
    return result;
  },
  queryModuleVersion: function (deps, _dir) {
    var Util = this;
    var modules = {};
    var info;
    var file;

    for (var key in deps) {
      if (deps.hasOwnProperty(key)) {
        try {
          file = Util.readFileSync(path.join(_dir, 'node_modules', key, 'package.json'));
          info = JSON.parse(file);
          modules[key] = info.version || '--';
        } catch (e) {
          modules[key] = '--';
        }
      }
    }
    return modules;
  },
  // TODO: 后期需对项目目录进行判断
  cdProjectPath: function (context, terminal) {
    terminal.sendText("cd " + context.fsDir);
  },
  // TODO: 后期需解决终端运行目录问题
  Terminal: function (name, window) {
    return window.createTerminal(name || 'cmd');
  },
  // 插件运行目录
  formatDir: function (context, func) {
    if (context.scheme == 'file') {
      context.isDir = false;
      context.fsDir = path.dirname(context.fsPath);
      func(null, context);
    } else {
      context.isDir = true;
      context.fsDir = context.fsPath;
      func(null, context);
    }
  },

  // 用户选择了什么
  extractText: function (window) {
    var editor = window.activeTextEditor;
    var selection = editor.selection;
    if (!editor) return;
    // 如果用户选择了多行, 则直接提示 
    if (selection.start.line != selection.end.line) {
      window.showErrorMessage("模块无效, 不能执行卸载命令");
      return;
    }
    var line = editor._documentData._lines[selection.start.line];
    var text = editor.document.getText(selection);
    var modules = line.match(/"(.*?)"/g);
    var selected = '';
    var right = '';

    if (!modules) {
      window.showErrorMessage("模块无效, 不能执行卸载命令");
    } else if (modules && modules.length < 3) {
      selected = modules[0].slice(1, -1);
    } else {
      var right = line.slice(selection.start.character);
      if (right.indexOf('"') < 0) {
        window.showErrorMessage("模块无效, 不能执行卸载命令");
      } else {
        selected = right.slice(0, right.indexOf('"'));
      }
    }
    return selected;
  },

  isEmpty: function (obj) {
    for (var k in obj) {
      return false;
    }
    return true;
  },

  readFile: function (_path, func) {
    fs.readFile(_path, 'utf8', func);
  },
  readFileSync: function (_path, func) {
    return fs.readFileSync(_path, 'utf8', func);
  },
  writeFile: function (file, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(file, data, function (err) {
        // handle error
        if (err) {
          return reject("File allrady exists");
        }
        return resolve();
      });
    });
  },
  createFile: function (_path) {
    return new Promise((resolve, reject) => {
      fs.open(_path, "wx", function (err, fd) {
        // handle error
        if (err) {
          return reject("File allrady exists");
        }
        return resolve(fd);
      });
    });
  },
  fsStat: function (_path, func, success, error) {
    fs.stat(_path, func);
  },
  outPackage: function (fsDir, window, out) {
    var Util = this;
    Util.fsStat(path.join(fsDir, 'package_out.json'), function (error, stat) {
      if (error) {
        Util.createFile(path.join(fsDir, 'package_out.json')).then(function (file) {
          Util.writeFile(file, JSON.stringify(out, null, 2));
        });
        window.showInformationMessage("查询依赖版本完毕!");
      } else {
        window.showQuickPick(["是", "否"], {
          placeHolder: "覆盖原有的 package_out.json 文件?"
        }).then(function (needCss) {
          if (needCss === '是') {
            Util.writeFile(
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
  }
}