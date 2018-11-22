// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var exec = require('child_process').exec;

var fs = require('fs');
var path = require('path');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

var app = {
    package: {},
    context: {}
};
function activate(context) {
    var disposable = vscode.commands.registerCommand('extension.queryModulesVersion', function (context) {
        fsStat(context.fsPath, function(error, stat){
            if(error){
            } else {
                queryVersion(context, stat.isDirectory());
            }
        });
    });
    // var disposable = vscode.commands.registerCommand('extension.cnpminstall', function (context) {
    //     cnpminstall(context);
    // });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

function cnpminstall(context){
    var fsPath = app.fsPath = path.dirname(context.fsPath);
    readFile(path.join(fsPath, 'package.json'), (err, data) => {
        if (err) {
            vscode.window.showErrorMessage("未找到package.json");
        } else {
            console.log(exec)
            exec('cnpm install', function(error, stdout, stderr){
                if(error) {
                    console.error('error: ' + error);
                    return;
                }
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
            });
            // var package = JSON.parse(data);
        }
    })
}
function queryVersion(context, dir){
    app.context = context;
    var fsPath = app.fsPath = dir ? context.fsPath : path.dirname(context.fsPath);
    readFile(path.join(fsPath, 'package.json'), (err, data) => {
        if (err) {
            vscode.window.showErrorMessage("未找到package.json");
        } else {
            var out = app.package = JSON.parse(data);
            fsStat(path.join(fsPath,'node_modules'), function(error, stat){
                if(error){
                    vscode.window.showErrorMessage("未找到 node_modules 目录");
                } else if(stat.isDirectory()){
                    out.dependencies = queryModuleVersion(app.package.dependencies, fsPath);
                    out.devDependencies = queryModuleVersion(app.package.devDependencies, fsPath);
                    outPackage(fsPath, out);
                }
            })
        };
    });
}
function outPackage(fsPath, out){
    fsStat(path.join(fsPath, 'package_out.json'), function(error, stat){
        // 文件不存在时
        if(error){
            createFile(path.join(fsPath, 'package_out.json')).then(function(file){
                writeFile(file, JSON.stringify(out, null, 2));
            });
            vscode.window.showInformationMessage("查询依赖版本完毕! -1");
        } else {
            vscode.window.showQuickPick(["是", "否"], {
                placeHolder: "覆盖原有的 package_out.json 文件?"
            }).then(function(needCss){
                if(needCss === '是'){
                    writeFile(
                        path.join(fsPath, 'package_out.json'),
                        JSON.stringify(out, null, 2),
                        function(error){
                            if(error){
                                vscode.window.showErrorMessage("写入失败!");
                            } else {
                                vscode.window.showInformationMessage("查询依赖版本完毕!");
                            }
                    });
                }
            });
        }
    });
}
function fsStat(_path, func, success, error){
    fs.stat(_path, func);
}

function queryModuleVersion(deps, _dir, func){
    var modules = {};
    let info;
    let file;
    for(var key in deps){
        if(deps.hasOwnProperty(key)){
            file = readFileSync(path.join(_dir, 'node_modules', key, 'package.json'));
            try{
                info = JSON.parse(file);
                modules[key] = info.version || '--';
            }catch(e){
                modules[key] = '--';
            }
        }
    }

    return modules;
}

function readFile(_path, func){
    fs.readFile(_path, 'utf8', func);
}
function readFileSync(_path, func){
    return fs.readFileSync(_path, 'utf8', func);
}

function createFile(_path) {
    return new Promise((resolve, reject) => {
        fs.open(_path, "wx", function (err, fd) {
            // handle error
            if (err) {
                return reject("File allrady exists");
            }
            return resolve(fd);
        });
    });
}

function writeFile(file, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, function (err) {
            // handle error
            if (err) {
                return reject("File allrady exists");
            }
            return resolve();
        });
    });
}
