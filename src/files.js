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
  currentPath: function (context, func) {
    if (context.scheme == 'file') {
      context.isDir = false;
      context.fsDir = path.dirname(context.fsPath);
      func(null, context);
    } else {
      context.isDir = true;
      context.fsDir = context.fsPath;
      func(null, context);
    }
  }
}
module.exports = files
