'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var vscode = require('vscode');
var vscode__default = _interopDefault(vscode);
var fs = _interopDefault(require('fs'));

const readFile = (_path, func) => {
    fs.readFile(_path, 'utf8', func);
};
const readFileSync = (_path) => {
    return fs.readFileSync(_path, 'utf8');
};
const writeFile = (file, data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, function (err) {
            if (err) {
                return reject("File allrady exists");
            }
            return resolve();
        });
    });
};
const createFile = (_path) => {
    return new Promise((resolve, reject) => {
        fs.open(_path, "wx", function (err, fd) {
            if (err) {
                return reject("File allrady exists");
            }
            return resolve(fd);
        });
    });
};
const fsStat = (_path, func) => {
    fs.stat(_path, func);
};
const fsStatsync = (_path) => {
    return fs.statSync(_path);
};
const currentPath = (context, func) => {
    let stats = fsStatsync(context.fsPath);
    if (stats.isFile()) {
        context.isDir = false;
        context.fsDir = path.dirname(context.fsPath);
        func && func(null, context);
    }
    else if (stats.isDirectory()) {
        context.isDir = true;
        context.fsDir = context.fsPath;
        func && func(null, context);
    }
    else {
        context.isDir = false;
        context.fsDir = context.fsPath;
        func && func('typeError', context);
    }
    return context;
};

// var path = require('path')
// var files = require('./files')
const queryModuleVersion = (deps, _dir) => {
    var info;
    var file;
    var modules = {};
    for (var key in deps) {
        if (deps.hasOwnProperty(key)) {
            try {
                file = readFileSync(path.join(_dir, 'node_modules', key, 'package.json'));
                info = JSON.parse(file);
                modules[key] = info.version || '--';
            }
            catch (e) {
                modules[key] = '--';
            }
        }
    }
    return modules;
};
const extractModule = (window) => {
    var editor = window.activeTextEditor;
    var selection = editor.selection;
    try {
        // selection.start.line == selection.end.line
        if (editor) {
            var result = (editor._documentData._lines[selection.start.line] || '').match(/"(.*?)"|'(.*?)'/) || [];
            return result[1] || result[2];
        }
    }
    catch (e) {
        console.log(e);
    }
};
const outPackage = (fsDir, window, out) => {
    fsStat(path.join(fsDir, 'package_out.json'), function (error, stat) {
        if (error) {
            createFile(path.join(fsDir, 'package_out.json')).then(function (file) {
                writeFile(file, JSON.stringify(out, null, 2));
            });
            window.showInformationMessage("查询依赖版本完毕!");
        }
        else {
            window.showQuickPick(["是", "否"], {
                placeHolder: "覆盖原有的 package_out.json 文件?"
            }).then(function (needCss) {
                if (needCss === '是') {
                    writeFile(path.join(fsDir, 'package_out.json'), JSON.stringify(out, null, 2)).catch(error => {
                        if (error) {
                            window.showErrorMessage("写入失败!");
                        }
                        else {
                            window.showInformationMessage("查询依赖版本完毕!");
                        }
                    });
                }
            });
        }
    });
};
const isEmpty = (obj) => {
    if (!(obj instanceof Object))
        return false;
    for (var k in obj) {
        return false;
    }
    return true;
};

const app = {
    commands: {
        yarn: {
            i: '',
            install: 'add',
            rebuild: 'add',
            update: 'upgrade',
            uninstall: 'remove'
        },
        npm: {
            install: 'i'
        },
        cnpm: {
            install: 'i'
        }
    },
    configuration: {},
    types: {
        install2: 'install'
    },
    defaults: {
        manager: 'npm',
        ext: '^js|jsx|ts|vue$',
        terminalTitle: 'npm module helper'
    }
};

let disposables = [];
let terminalInstance = null;
let formatPackage = function (data) {
    let packageJSON = {
        dependencies: {},
        devDependencies: {}
    };
    try {
        packageJSON = JSON.parse(data);
        packageJSON.dependencies = packageJSON.dependencies || {};
        packageJSON.devDependencies = packageJSON.devDependencies || {};
    }
    catch (e) {
        packageJSON = {
            dependencies: {},
            devDependencies: {}
        };
    }
    return packageJSON;
};
let windowTerminal = function (window, name) {
    return window.createTerminal(name || 'cmd');
};
let cdProjectPath = function (terminal, context) {
    {
        terminal.sendText("cd " + context.fsDir);
    }
};
let handler = {
    /**
     *
     * @param {string} command 要执行的指令
     * @param {string} modules 要安装的模块
     * @param {string} mode 开发模式/生产模式
     */
    exec: function (command, modules, mode) {
        let manager = app.configuration.manager;
        let commands = app.commands[manager];
        command = commands.hasOwnProperty(command) ? commands[command] : command;
        return [
            manager,
            command,
            modules || '',
            modules ? mode || '' : ''
        ].slice(0, arguments.length + 1).join(' ');
    },
};
const terminal = () => {
    if (terminalInstance) {
        return terminalInstance;
    }
    return terminalInstance = windowTerminal(vscode.window, app.configuration.terminalTitle);
};
const updateConfiguration = () => {
    let configuration = vscode__default.workspace.getConfiguration('moduleHelper');
    return Object.assign(app.configuration, app.defaults, configuration);
};
const proxy = () => {
    updateConfiguration();
    return myCommands;
};
const npmInstall = (context) => {
    let myTerminal = terminal();
    currentPath(context, function (err, context) {
        if (err) {
            vscode.window.showErrorMessage("选择无效");
            return;
        }
        try {
            readFile(path.join(context.fsDir, 'package.json'), function (err, data) {
                if (err) {
                    vscode.window.showErrorMessage("未找到 package.json 文件");
                }
                else {
                    cdProjectPath(myTerminal, context);
                    myTerminal.show();
                    myTerminal.sendText(handler.exec('i'));
                }
            });
        }
        catch (e) {
            console.log(e);
        }
    });
};
const moduleHandlerByType2 = (context, info) => {
    info = info || {};
    let myTerminal = terminal();
    let ext = (path.parse(context.path) || { ext: '' }).ext.slice(1);
    let selected;
    if (ext && new RegExp(app.configuration.ext).test(ext)) {
        selected = extractModule(vscode.window);
        if (selected) {
            myTerminal.show();
            myTerminal.sendText(handler.exec.apply(handler, [info.type, selected, '-D']));
        }
        else {
            info.select && vscode.window.showInformationMessage(info.select);
        }
    }
    else {
        info.match && vscode.window.showInformationMessage(info.match);
    }
};
const moduleInstall2 = (context) => {
    moduleHandlerByType2(context, {
        type: 'install',
        match: '"当前文件类型不匹配, 如需安装, 请先在设置中配置"',
        select: "当前行找不到有效的模块"
    });
};
const moduleUninstall2 = (context) => {
    moduleHandlerByType2(context, {
        type: 'uninstall',
        match: '"当前文件类型不匹配, 如需删除, 请先在设置中配置"',
        select: "当前行找不到有效的模块"
    });
};
const queryPackageVersion = (context) => {
    currentPath(context, function (err, context) {
        let fsDir = context.fsDir;
        readFile(path.join(fsDir, 'package.json'), function (err, data) {
            if (err) {
                vscode.window.showErrorMessage("未找到 package.json 文件");
            }
            else {
                let packageJSON = JSON.parse(data);
                let out = packageJSON;
                fsStat(path.join(fsDir, 'node_modules'), function (error, stat) {
                    if (error) {
                        vscode.window.showErrorMessage("未找到 node_modules 目录");
                    }
                    else {
                        packageJSON.dependencies && (out.dependencies = queryModuleVersion(packageJSON.dependencies, fsDir));
                        packageJSON.devDependencies && (out.devDependencies = queryModuleVersion(packageJSON.devDependencies, fsDir));
                        if (isEmpty(out.dependencies) && isEmpty(out.devDependencies)) {
                            vscode.window.showInformationMessage("查询依赖版本完毕! 依赖为空!");
                        }
                        else {
                            outPackage(fsDir, vscode.window, out);
                        }
                    }
                });
            }
        });
    });
};
const moduleHandlerByType = (context, type, func) => {
    type = app.types[type] || type;
    let manager = app.configuration.manager;
    let len = manager === 'yarn' && type === 'update' ? 2 : 3;
    moduleHandler(context, function (hasModule, selected, terminal) {
        // 如果回调不存在, 或返回true
        if (!func || func(hasModule, selected, terminal)) {
            hasModule[0] && terminal.sendText(handler.exec.apply(handler, [type, selected, '-S'].slice(0, len)));
            hasModule[1] && terminal.sendText(handler.exec.apply(handler, [type, selected, '-D'].slice(0, len)));
        }
    });
};
const moduleHandler = (context, func) => {
    let selected = extractModule(vscode.window);
    let myTerminal = terminal();
    selected && readFile(context.fsPath, function (err, data) {
        if (err) {
            return;
        }
        let packageJSON = formatPackage(data);
        let hasModule = [packageJSON.dependencies[selected], packageJSON.devDependencies[selected]];
        if (hasModule[0] || hasModule[1]) {
            try {
                cdProjectPath(myTerminal, context);
                myTerminal.show();
                func && func(hasModule, selected, myTerminal);
            }
            catch (e) {
                console.log(e);
            }
        }
        else {
            vscode.window.showErrorMessage("选择模块无效!");
        }
    });
};
const moduleUninstall = (context, type) => {
    let selected = extractModule(vscode.window);
    let myTerminal = terminal();
    selected && fsStat(path.join(context.fsDir, 'node_modules', selected), function (error, stat) {
        if (error) {
            vscode.window.showInformationMessage("未找到 " + selected + " 模块, 卸载结束!");
        }
        else {
            readFile(context.fsPath, function (err, data) {
                if (err) {
                    return;
                }
                let packageJSON = formatPackage(data);
                let hasModule = [packageJSON.dependencies[selected], packageJSON.devDependencies[selected]];
                if (hasModule[0] || hasModule[1]) {
                    try {
                        cdProjectPath(myTerminal, context);
                        myTerminal.show();
                        hasModule[0] && myTerminal.sendText(handler.exec(type, selected, '-S'));
                        hasModule[1] && myTerminal.sendText(handler.exec(type, selected, '-D'));
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
            });
        }
    });
};
const registerCommand = (command, func) => {
    return disposables = disposables.concat(vscode__default.commands.registerCommand(command, function (context) {
        try {
            currentPath(context, function (err, context) {
                func && func(context);
            });
        }
        catch (e) {
            console.log(e);
        }
    }));
};
const registerCommands = (commands) => {
    let result = [];
    if (commands instanceof Object) {
        if (commands instanceof Array) {
            for (let i = 0; i < commands.length; i++) {
                result.push(registerCommand.apply(null, commands));
            }
        }
        else {
            for (let com in commands) {
                if (commands.hasOwnProperty(com)) {
                    result.push(registerCommand(com, commands[com]));
                }
            }
        }
    }
    return disposables = disposables.concat(result);
};
const myCommands = {
    proxy,
    npmInstall,
    updateConfiguration,
    moduleHandlerByType2,
    moduleInstall2,
    moduleUninstall2,
    queryPackageVersion,
    moduleHandlerByType,
    moduleHandler,
    moduleUninstall,
    registerCommand,
    registerCommands,
    terminal
};

// 使用代理函数, 动态读取用户配置
function proxy$1() {
    if (myCommands && myCommands.proxy) {
        return myCommands.proxy();
    }
    return myCommands;
}
// 插件入口, 用于注册命令
function activate(context) {
    var disposables = myCommands.registerCommands({
        'moduleHelper.queryModulesVersion': function (context) {
            proxy$1().queryPackageVersion(context);
        },
        'moduleHelper.moduleUninstall': function (context) {
            proxy$1().moduleUninstall(context, 'uninstall');
        },
        'moduleHelper.moduleInstall': function (context) {
            proxy$1().moduleHandlerByType(context, 'install');
        },
        'moduleHelper.moduleInstall2': function (context) {
            proxy$1().moduleInstall2(context);
        },
        'moduleHelper.moduleUninstall2': function (context) {
            proxy$1().moduleUninstall2(context);
        },
        'moduleHelper.moduleRebuild': function (context) {
            proxy$1().moduleHandlerByType(context, 'rebuild');
        },
        'moduleHelper.moduleUpdate': function (context) {
            proxy$1().moduleHandlerByType(context, 'update');
        },
        'moduleHelper.npmInstall': function (context) {
            proxy$1().npmInstall(context);
        }
    });
    // context.subscriptions = context.subscriptions.concat(disposables)
}
// this method is called when your extension is deactivated
function deactivate() {
}
exports.activate = activate;
exports.deactivate = deactivate;
