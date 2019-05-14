'use strict';

var path = require('path');
var vscode = require('vscode');
var fs = require('fs');

/**
 * 回调函数转promise
 * @param {function} cb
 */
const cb2promise = (cb) => {
    return new Promise((resolve, reject) => {
        cb((err, data) => {
            err ? reject(err) : resolve(data);
        });
    });
};
/**
 * 读文件
 * @param {string} path 文件路径
 * @returns {string} 文件内容
 */
const readFileSync = (path) => {
    return fs.readFileSync(path, 'utf8');
};
/**
 * 读文件
 * @param {string} path 文件路径
 * @returns {object} promise
 */
const readFile = (path) => {
    return cb2promise((cb) => {
        fs.readFile(path, 'utf8', cb);
    });
};
/**
 * 写文件
 * @param {string} path 文件路径
 * @param {string} data 文件内容
 * @returns {object} promise
 */
const writeFile = (path, data) => {
    return cb2promise((cb) => {
        fs.writeFile(path, data, cb);
    });
};
/**
 * 获取文件状态
 * @param {string} path 文件路径
 * @returns {object} promise
 */
const fsStat = (path) => {
    return cb2promise((cb) => {
        fs.stat(path, cb);
    });
};
/**
 * 同步获取文件状态
 * @param {string} path 文件路径
 * @returns {object} 文件状态信息
 */
const fsStatsync = (path) => {
    return fs.statSync(path);
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

/**
 * 查询模块版本
 * @param {object} deps 依赖信息
 * @param {string} dir 项目路径
 */
const queryModuleVersion = (deps, dir) => {
    let modules = {};
    for (let key in deps) {
        try {
            let file = readFileSync(path.join(dir, 'node_modules', key, 'package.json'));
            let info = JSON.parse(file);
            modules[key] = info.version || '--';
        }
        catch (e) {
            modules[key] = '--';
        }
    }
    return modules;
};
/**
 * 抽出模块名
 * @param {object} deps 依赖信息
 * @param {string} dir 项目路径
 */
const extractModule = (window) => {
    const editor = window.activeTextEditor;
    const selection = editor.selection;
    try {
        // selection.start.line == selection.end.line
        if (editor) {
            const result = (editor._documentData._lines[selection.start.line] || '').match(/"(.*?)"|'(.*?)'/) || [];
            return result[1] || result[2];
        }
    }
    catch (e) {
        console.log(e);
    }
    return '';
};
const writeInfo = (path, data, window) => {
    return writeFile(path, typeof data === 'string' ? data : JSON.stringify(data, null, 2))
        .then(() => {
        window.showInformationMessage('查询依赖版本完毕');
    }).catch((err) => {
        window.showErrorMessage('写入失败');
    });
};
/**
 * 输出 package.json 中依赖模块的实际版本信息
 * @param {object} fsDir 输出目录
 * @param {object} window vscode窗口api
 * @param {object} out 要输出的信息
 */
const outPackage = (fsDir, window, out) => {
    fsStat(path.join(fsDir, 'package_out.json'))
        .then((data) => {
        window.showQuickPick(['是', '否'], {
            placeHolder: '是否覆盖原有的 package_out.json 文件?'
        }).then((res) => {
            if (res === '是') {
                writeInfo(path.join(fsDir, 'package_out.json'), out, window);
            }
        });
    }).catch((err) => {
        writeInfo(path.join(fsDir, 'package_out.json'), out, window);
    });
};
const isEmpty = (obj) => {
    if (obj instanceof Object) {
        for (let k in obj) {
            return false;
        }
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

const window = vscode.window;
let disposables = [];
let terminalInstance = null;
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
    if (commands.hasOwnProperty(command)) {
        command = commands[command];
    }
    return [
        manager,
        command,
        modules || '',
        mode || ''
    ].slice(0, modules ? 4 : 2).join(' ');
};
/**
 * 执行一条命令
 * @param {object} context vscode传递给插件的环境
 * @param {string} command 要执行的命令
 * @returns {object} 终端实例
 */
const execCommand = (context, command) => {
    let myTerminal = terminal();
    myTerminal.sendText(command);
    myTerminal.show();
    return myTerminal;
};
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
 * 注册vs命令
 * @returns {array} 已注册的命令列表
 */
const registerCommand = (command, func) => {
    return disposables[disposables.push(vscode.commands.registerCommand(command, (context) => {
        try {
            currentPath(context, (err, context) => {
                func && func(context);
            });
        }
        catch (e) {
            console.log(e);
        }
    }))];
};
/**
 * 批量注册vs命令
 * @param {object|array} 命令集
 * @returns {array} 已注册的命令列表
 */
const registerCommands = (commands) => {
    if (commands instanceof Object) {
        if (commands instanceof Array) {
            for (let i = 0; i < commands.length; i++) {
                registerCommand.apply(null, commands[i]);
            }
        }
        else {
            for (let com in commands) {
                if (commands.hasOwnProperty(com)) {
                    registerCommand(com, commands[com]);
                }
            }
        }
    }
    return disposables;
};
/**
 * 安装项目依赖
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
const npmInstall = (context) => {
    currentPath(context, (err, context) => {
        if (err) {
            window.showErrorMessage("选择无效");
        }
        else {
            readFile(path.join(context.fsDir, 'package.json'))
                .then((data) => {
                execCommand(context, Command('i'));
            }).catch((err) => {
                window.showErrorMessage("未找到 package.json 文件");
            });
        }
    });
};
/**
 * 查询当前项目依赖的版本
 * @param {object} context vscode传递给插件的环境
 * @returns {void}
 */
const queryPackageVersion = (context) => {
    currentPath(context, (err, context) => {
        let fsDir = context.fsDir;
        readFile(path.join(fsDir, 'package.json'))
            .then((data) => {
            try {
                let out = JSON.parse(data);
                if (out instanceof Object) {
                    fsStat(path.join(fsDir, 'node_modules')).then((data) => {
                        if (out.dependencies) {
                            out.dependencies = queryModuleVersion(out.dependencies, fsDir);
                        }
                        if (out.devDependencies) {
                            out.devDependencies = queryModuleVersion(out.devDependencies, fsDir);
                        }
                        if (isEmpty(out.dependencies) && isEmpty(out.devDependencies)) {
                            window.showInformationMessage("查询依赖版本完毕! 依赖为空!");
                        }
                        else {
                            outPackage(fsDir, window, out);
                        }
                    }).catch((err) => {
                        window.showErrorMessage("未找到 node_modules 目录");
                    });
                }
            }
            catch (e) {
                window.showErrorMessage("package.json 文件损坏");
            }
        }).catch((err) => {
            window.showErrorMessage("未找到 package.json 文件");
        });
    });
};
/**
 * 根据用户触发的命令来执行相应的指令 (弃用 0.2.4 已放开限制)
 * @param {object} context vscode传递给插件的环境
 * @param {string} type 用户触发的命令
 * @param {function=} func 获取到用户选择的模块时的回调
 * @returns {void}
 */
const moduleHandlerByType = (context, type, func) => {
    type = app.types[type] || type;
    let manager = app.configuration.manager;
    let len = 3;
    if (manager === 'yarn' && type === 'update') {
        len = 2;
    }
    selectedModule(context, (hasModule, selected) => {
        // 如果回调不存在, 或返回true
        if (!func || func(hasModule, selected, terminal)) {
            if (hasModule[0]) {
                execCommand(context, Command.apply(null, [type, selected, '-S'].slice(0, len)));
            }
            if (hasModule[1]) {
                execCommand(context, Command.apply(null, [type, selected, '-D'].slice(0, len)));
            }
        }
    });
};
/**
 * 获取用户选择的模块 (弃用 0.2.4 已放开限制)
 * @param context vscode传递给插件的环境
 * @param func 获取成功时的回调
 */
const selectedModule = (context, func) => {
    let selected = extractModule(window);
    if (selected) {
        readFile(context.fsPath)
            .then((data) => {
            let packageJson = formatPackage(data);
            let hasModule = [packageJson.dependencies[selected], packageJson.devDependencies[selected]];
            if (hasModule[0] || hasModule[1]) {
                try {
                    if (func) {
                        func(hasModule, selected);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }
            else {
                window.showErrorMessage("选择模块无效");
            }
        }).catch((err) => {
            window.showErrorMessage("验证选择失败");
        });
    }
};
/**
 * 根据用户触发的命令来执行相应的指令 (不验证package.json)
 * @param {object} context vscode传递给插件的环境
 * @param {object} info 执行命令时用到的一些信息
 * @returns {void}
 */
const moduleHandlerByType2 = (context, info) => {
    info = Object.assign({
        match: '文件类型不匹配, 当前命令已忽略, 如需在当前文件执行' + app.texts[info.type] + '命令, 请先在设置中配置[匹配文件类型]',
        select: '当前行找不到有效的模块'
    }, info);
    let stats = (path.parse(context.path) || { ext: '', base: '' });
    let ext = stats.ext.slice(1);
    if (stats.base === 'package.json' || (ext && new RegExp(app.configuration.ext).test(ext))) {
        let selected = extractModule(window);
        if (selected) {
            execCommand(context, Command(info.type, selected, '-D'));
        }
        else {
            window.showInformationMessage(info.select);
        }
    }
    else {
        window.showInformationMessage(info.match);
    }
};
const myCommands = {
    proxy,
    npmInstall,
    updateConfiguration,
    moduleHandlerByType2,
    queryPackageVersion,
    moduleHandlerByType,
    execCommand,
    selectedModule,
    registerCommand,
    registerCommands,
    terminal
};

// 使用代理函数, 动态读取用户配置
const proxy$1 = () => {
    if (myCommands && myCommands.proxy) {
        return myCommands.proxy();
    }
    return myCommands;
};
// 插件入口, 用于注册命令
exports.activate = (context) => {
    let disposables = myCommands.registerCommands({
        'moduleHelper.queryModulesVersion': (context) => {
            proxy$1().queryPackageVersion(context);
        },
        'moduleHelper.moduleInstall': (context) => {
            proxy$1().moduleHandlerByType2(context, { type: 'install' });
        },
        'moduleHelper.moduleInstall2': (context) => {
            proxy$1().moduleHandlerByType2(context, { type: 'install' });
        },
        'moduleHelper.moduleUninstall': (context) => {
            proxy$1().moduleHandlerByType2(context, { type: 'uninstall' });
        },
        'moduleHelper.moduleUninstall2': (context) => {
            proxy$1().moduleHandlerByType2(context, { type: 'uninstall' });
        },
        'moduleHelper.moduleRebuild': (context) => {
            proxy$1().moduleHandlerByType2(context, { type: 'rebuild' });
        },
        'moduleHelper.moduleUpdate': (context) => {
            proxy$1().moduleHandlerByType2(context, { type: 'update' });
        },
        'moduleHelper.npmInstall': (context) => {
            proxy$1().npmInstall(context);
        }
    });
    // context.subscriptions = context.subscriptions.concat(disposables)
};
// this method is called when your extension is deactivated
exports.deactivate = () => { };
