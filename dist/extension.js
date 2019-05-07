'use strict';

var path = require('path');
var vscode = require('vscode');
var fs = require('fs');

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
    texts: {
        install: '安装',
        uninstall: '卸载',
        update: '更新',
        rebuild: '重装'
    },
    defaults: {
        manager: 'npm',
        ext: '^(js|jsx|ts|vue)$',
        terminalTitle: 'npm module helper'
    }
};

/* /// <reference path="./command.d.ts" /> */
const window = vscode.window;
let disposables = [];
let terminalInstance = null;
/**
 * 对package文件进行处理
 * @func
 * @param {string} data package.json文件内容
 * @returns {object} 项目依赖信息 (不含peerDependencies)
 */
const formatPackage = (data) => {
    let result;
    try {
        result = JSON.parse(data);
    }
    catch (e) {
        console.log(e);
    }
    let { dependencies = {}, devDependencies = {} } = result || {};
    return {
        dependencies,
        devDependencies
    };
};
/**
 * 打开项目目录 (预留的方法)
 * @func
 * @param {object} terminal 终端
 * @param {object} context vscode传递给插件的环境
 * @returns {object} 终端
 */
const cdProjectPath = (terminal, context) => {
    {
        terminal.sendText("cd " + context.fsDir);
    }
    return terminal;
};
/**
 * 合成指令语句
 * @func
 * @param {string} command 要执行的指令
 * @param {string} modules 要安装的模块
 * @param {string} mode 依赖类型
 * @returns {string} 一条最终合成的指令语句
 */
const Command = (command, modules, mode) => {
    let manager = app.configuration.manager;
    let commands = app.commands[manager];
    command = commands.hasOwnProperty(command) ? commands[command] : command;
    return [
        manager,
        command,
        modules || '',
        modules ? mode || '' : ''
    ].join(' ');
};
/**
 * 返回一个终端 (单例)
 * @returns {string} 一条最终合成的指令语句
 */
const terminal = () => {
    if (terminalInstance) {
        return terminalInstance;
    }
    return terminalInstance = window.createTerminal(app.configuration.terminalTitle);
};
/**
 * 更新配置信息
 * @returns {string} 返回最新的配置信息
 */
const updateConfiguration = () => {
    let configuration = vscode.workspace.getConfiguration('moduleHelper');
    return Object.assign(app.configuration, app.defaults, configuration);
};
/**
 * 用户触发命令时调用的一个代理方法
 * @returns {string} 返回所有可以执行的方法
 */
const proxy = () => {
    updateConfiguration();
    return myCommands;
};
/**
 * 注册命令
 * @returns {array} 已注册的命令列表
 */
const registerCommand = (command, func) => {
    return disposables = disposables.concat(vscode.commands.registerCommand(command, function (context) {
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
/**
 * 批量注册命令
 * @param {object|array} 命令集
 * @returns {array} 已注册的命令列表
 */
const registerCommands = (commands) => {
    let result = [];
    if (commands instanceof Object) {
        if (commands instanceof Array) {
            for (let i = 0; i < commands.length; i++) {
                result.push(registerCommand.apply(null, commands[i]));
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
/**
 * 安装项目依赖
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
const npmInstall = (context) => {
    let myTerminal = terminal();
    currentPath(context, function (err, context) {
        if (err) {
            window.showErrorMessage("选择无效");
            return;
        }
        try {
            readFile(path.join(context.fsDir, 'package.json'), function (err, data) {
                if (err) {
                    window.showErrorMessage("未找到 package.json 文件");
                }
                else {
                    cdProjectPath(myTerminal, context);
                    myTerminal.show();
                    myTerminal.sendText(Command('i'));
                }
            });
        }
        catch (e) {
            console.log(e);
        }
    });
};
/**
 * 查询当前项目依赖的版本
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
const queryPackageVersion = (context) => {
    currentPath(context, function (err, context) {
        let fsDir = context.fsDir;
        readFile(path.join(fsDir, 'package.json'), function (err, data) {
            if (err) {
                window.showErrorMessage("未找到 package.json 文件");
            }
            else {
                let packageJSON = JSON.parse(data);
                let out = packageJSON;
                fsStat(path.join(fsDir, 'node_modules'), function (error, stat) {
                    if (error) {
                        window.showErrorMessage("未找到 node_modules 目录");
                    }
                    else {
                        packageJSON.dependencies && (out.dependencies = queryModuleVersion(packageJSON.dependencies, fsDir));
                        packageJSON.devDependencies && (out.devDependencies = queryModuleVersion(packageJSON.devDependencies, fsDir));
                        if (isEmpty(out.dependencies) && isEmpty(out.devDependencies)) {
                            window.showInformationMessage("查询依赖版本完毕! 依赖为空!");
                        }
                        else {
                            outPackage(fsDir, window, out);
                        }
                    }
                });
            }
        });
    });
};
/**
 * 获取用户选择的模块
 * @param context vscode传递给插件的环境
 * @param func 获取成功时的回调
 */
const selectedModule = (context, func) => {
    let selected = extractModule(window);
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
            window.showErrorMessage("选择模块无效!");
        }
    });
};
/**
 * 根据用户触发的命令来执行相应的指令
 * @param {object} context vscode传递给插件的环境
 * @param {string} type 用户触发的命令
 * @param {function=} func 获取到用户选择的模块时的回调
 * @returns {void}
 */
const moduleHandlerByType = (context, type, func) => {
    type = app.types[type] || type;
    let manager = app.configuration.manager;
    let len = manager === 'yarn' && type === 'update' ? 2 : 3;
    selectedModule(context, (hasModule, selected, terminal) => {
        // 如果回调不存在, 或返回true
        if (!func || func(hasModule, selected, terminal)) {
            hasModule[0] && terminal.sendText(Command.apply(null, [type, selected, '-S'].slice(0, len)));
            hasModule[1] && terminal.sendText(Command.apply(null, [type, selected, '-D'].slice(0, len)));
        }
    });
};
/**
 * 根据用户触发的命令来执行相应的指令 (不验证package.json)
 * @param {object} context vscode传递给插件的环境
 * @param {object} info 执行命令时用到的一些信息
 * @returns {void}
 */
const moduleHandlerByType2 = (context, info) => {
    info = Object.assign({
        match: '文件类型不匹配, 当前命令已忽略, 如需执行' + app.texts[info.type] + '命令, 请在设置中配置[匹配文件类型]',
        select: '当前行找不到有效的模块'
    }, info);
    let myTerminal = terminal();
    let ext = (path.parse(context.path) || { ext: '' }).ext.slice(1);
    let selected;
    if (ext && new RegExp(app.configuration.ext).test(ext)) {
        selected = extractModule(window);
        if (selected) {
            myTerminal.show();
            myTerminal.sendText(Command(info.type, selected, '-D'));
        }
        else {
            info.select && window.showInformationMessage(info.select);
        }
    }
    else {
        info.match && window.showInformationMessage(info.match);
    }
};
const myCommands = {
    proxy,
    npmInstall,
    updateConfiguration,
    moduleHandlerByType2,
    queryPackageVersion,
    moduleHandlerByType,
    selectedModule,
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
    let disposables = myCommands.registerCommands({
        'moduleHelper.queryModulesVersion': function (context) {
            proxy$1().queryPackageVersion(context);
        },
        'moduleHelper.moduleInstall': function (context) {
            proxy$1().moduleHandlerByType2(context, { type: 'install' });
        },
        'moduleHelper.moduleInstall2': function (context) {
            proxy$1().moduleHandlerByType2(context, { type: 'install' });
        },
        'moduleHelper.moduleUninstall': function (context) {
            proxy$1().moduleHandlerByType2(context, { type: 'uninstall' });
        },
        'moduleHelper.moduleUninstall2': function (context) {
            proxy$1().moduleHandlerByType2(context, { type: 'uninstall' });
        },
        'moduleHelper.moduleRebuild': function (context) {
            proxy$1().moduleHandlerByType2(context, { type: 'rebuild' });
        },
        'moduleHelper.moduleUpdate': function (context) {
            proxy$1().moduleHandlerByType2(context, { type: 'update' });
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
