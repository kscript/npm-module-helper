var fs = require('fs');
var path = require('path');

const files = {
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
  fsStatsync: function (_path, func, success, error) {
    return fs.statSync(_path, func);
  },
  currentPath: function (context, func) {
    let stats = this.fsStatsync(context.fsPath);
    if (stats.isFile()) {
      context.isDir = false;
      context.fsDir = path.dirname(context.fsPath);
      func && func(null, context);
    } else if (stats.isDirectory()) {
      context.isDir = true;
      context.fsDir = context.fsPath;
      func && func(null, context);
    } else {
      context.isDir = false;
      context.fsDir = context.fsPath;
      func && func('typeError', context);
    }
    return context
  }
}
module.exports = files
