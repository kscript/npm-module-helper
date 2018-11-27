const vscode = require('vscode');
const Window = vscode.window;
const outputChannel = Window.createOutputChannel('cmd');
const terminal = Window.createTerminal('cmd');

module.exports = {
  outputChannel,
  terminal
}