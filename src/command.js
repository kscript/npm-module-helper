var path = require('path');
var app = require('./app');
var Util = require('./utils');
var vscode = require('vscode');

var command = {
  window: vscode.window,
  cnpmInstall: function (context) {
    var that = this;
    var terminal = app.terminal();
    try {
      Util.readFile(path.join(context.fsDir, 'package.json'), function (err, data) {
        if (err) {
          that.window.showErrorMessage("未找到 package.json 文件");
        } else {
          Util.cdProjectPath(context, terminal);
          terminal.show();
          terminal.sendText("cnpm i");
        }
      });
    } catch (e) {
      console.log(e);
    }
  },
  queryPackageVersion: function (context) {
    var fsDir = context.fsDir;
    var that = this;
    Util.readFile(path.join(fsDir, 'package.json'), function (err, data) {
      if (err) {
        that.window.showErrorMessage("未找到 package.json 文件");
      } else {
        var out = app.package = JSON.parse(data);
        Util.fsStat(path.join(fsDir, 'node_modules'), function (error, stat) {
          if (error) {
            that.window.showErrorMessage("未找到 node_modules 目录");
          } else {
            out.dependencies = Util.queryModuleVersion(app.package.dependencies, fsDir);
            out.devDependencies = Util.queryModuleVersion(app.package.devDependencies, fsDir);
            if (Util.isEmpty(out.dependencies) && Util.isEmpty(out.devDependencies)) {
              that.window.showInformationMessage("查询依赖版本完毕! 依赖为空!");
            } else {
              Util.outPackage(fsDir, that.window, out);
            }
          }
        })
      };
    });
  },
  moduleHandlerByType: function (context, type, func) {
    this.moduleHandler(context, function (hasModule, selected, terminal) {
      // 如果回调不存在, 或返回true
      if (!func || func(hasModule, selected, terminal)) {
        hasModule[0] && terminal.sendText("cnpm " + type + " " + selected + ' -S');
        hasModule[1] && terminal.sendText("cnpm " + type + " " + selected + ' -D');
      }
    })
  },
  moduleHandler: function (context, func) {
    var that = this;
    var selected = Util.extractText(that.window);
    var terminal = app.terminal();
    selected && Util.readFile(context.fsPath, function (err, data) {
      if (err) {
        return;
      }
      var packageJSON = {};
      try {
        packageJSON = JSON.parse(data);
      } catch (e) {
      }
      var hasModule = [packageJSON.dependencies[selected], packageJSON.devDependencies[selected]]
      if (hasModule[0] || hasModule[1]) {
        try {
          Util.cdProjectPath(context, terminal);
          terminal.show();
          func && func(hasModule, selected, terminal);
        } catch (e) {
          console.log(e)
        }
      } else {
        that.window.showErrorMessage("选择模块无效!");
      }
    })
  },
  moduleUninstall: function (context, type) {
    var that = this;
    var selected = Util.extractText(that.window);
    var terminal = app.terminal();
    selected && Util.fsStat(path.join(context.fsDir, 'node_modules', selected), function (error, stat) {
      if (error) {
        that.window.showInformationMessage("未找到 " + selected + " 模块, 卸载结束!");
      } else {
        Util.readFile(context.fsPath, function (err, data) {
          if (err) {
            return;
          }
          var packageJSON;
          try {
            packageJSON = JSON.parse(data);
          } catch (e) {
          }
          var hasModule = [packageJSON.dependencies[selected], packageJSON.devDependencies[selected]]
          if (hasModule[0] || hasModule[1]) {
            try {
              Util.cdProjectPath(context, terminal);
              terminal.show();
              hasModule[0] && terminal.sendText("npm " + type + " " + selected + ' -S');
              hasModule[1] && terminal.sendText("npm " + type + " " + selected + ' -D');
            } catch (e) {
              console.log(e)
            }
          }
        })
      }
    });
  }
}
module.exports = command;