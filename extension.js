// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');

var fs = require('fs');
var path = require('path');
var output = require('./output');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

var app = {
    package: {},
    context: {}
};
function activate(context) {
    var disposable = vscode.commands.registerCommand('extension.queryModulesVersion', function (context) {
        formatDir(context, function(err, context){
            queryPackageVersion(context);
        });
    });
    var disposable = vscode.commands.registerCommand('extension.cnpmInstall', function (context) {
        formatDir(context, function(err, context){
            cnpmInstall(context);
        });
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

function cnpmInstall(context){
    try{
        // output.Window.createTerminal("cmd", context.fsDir);
        if(context.fsPath !== context.fsDir){
            output.terminal.sendText("cd " + context.fsDir);
        }
        readPackage(context.fsDir, function(err, data){
            if (err) {
                vscode.window.showErrorMessage("未找到 package.json 文件");
            } else {
                // console.log(output.terminal, output.Window);
                output.terminal.show();
                output.terminal.sendText("cnpm i");
            }
        });
    } catch(e){
        output.outputChannel.appendLine(e);
    }
}
function queryPackageVersion(context){
    app.context = context;
    var fsDir = context.fsDir;
    readPackage(fsDir, function(err, data){
        if (err) {
            vscode.window.showErrorMessage("未找到 package.json 文件");
        } else {
            var out = app.package = JSON.parse(data);
            fsStat(path.join(fsDir,'node_modules'), function(error, stat){
                if(error){
                    vscode.window.showErrorMessage("未找到 node_modules 目录");
                } else {
                    out.dependencies = queryModuleVersion(app.package.dependencies, fsDir);
                    out.devDependencies = queryModuleVersion(app.package.devDependencies, fsDir);
                    if(isEmpty(out.dependencies) && isEmpty(out.devDependencies)){
                        vscode.window.showInformationMessage("查询依赖版本完毕! 依赖为空!");
                    } else {
                        outPackage(fsDir, out);
                    }
                }
            })
        };
    });
}


/**
 * 读取package.json信息
 * @param {string} fsDir 执行命令目录
 * @param {function=} func 读取回调
 */
function readPackage(fsDir, func){
    readFile(path.join(fsDir, 'package.json'), func);
}
/**
 * 获取当前命令的目录 (确定下命令到底是由用户选择了 *文件 还是 *目录 触发的)
 * @param {object} context vscode 执行命令时携带的信息
 * @param {*} func 
 */
function formatDir(context, func){
    fsStat(context.fsPath, function(error, stat){
        if(error){
            func(error, context);
        } else {
            context.isDir = stat.isDirectory();
            context.fsDir = context.isDir ? context.fsPath : path.dirname(context.fsPath);
            func(null, context);
        }
    });
}

function outPackage(fsDir, out){

    fsStat(path.join(fsDir, 'package_out.json'), function(error, stat){
        if(error){
            createFile(path.join(fsDir, 'package_out.json')).then(function(file){
                writeFile(file, JSON.stringify(out, null, 2));
            });
            vscode.window.showInformationMessage("查询依赖版本完毕!");
        } else {
            vscode.window.showQuickPick(["是", "否"], {
                placeHolder: "覆盖原有的 package_out.json 文件?"
            }).then(function(needCss){
                if(needCss === '是'){
                    writeFile(
                        path.join(fsDir, 'package_out.json'),
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
    })
}

function fsStat(_path, func, success, error){
    fs.stat(_path, func);
}
/**
 * 查询依赖在node_modules中的版本
 * @param {object} deps 依赖
 * @param {string} _dir 执行命令的目录
 */
function queryModuleVersion(deps, _dir){

    var modules = {};
    let info;
    let file;

    for(var key in deps){
        if(deps.hasOwnProperty(key)){
            try{
                file = readFileSync(path.join(_dir, 'node_modules', key, 'package.json'));
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
function isEmpty(obj){
    for(var k in obj){
        return false;
    }
    return true;
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
