var Util = require('./utils');
var vscode = require('vscode');
var app = {
  terminalInstance: null,
  terminal: function(){
      if(this.terminalInstance){
          try{
              var isRuning = false;
              var terminals = vscode.window.terminals || [];
              var id = this.terminalInstance._id;
              for(var i = 0; i < terminals.length; i++){
                  if (!isRuning && id == terminals[i]._id) {
                      isRuning = true;
                  }
              }
              if(this.terminalInstance && isRuning){
                  return this.terminalInstance;
              }
          }catch(e){
              console.log(e);
          }
      }
      return this.terminalInstance = Util.Terminal('npm module helper', vscode.window);
  },
  registerCommands: function(commands){
      return this.disposable = this.disposable.concat(Util.registerCommands(commands));
  },
  registerCommand: function(command, func){
      return this.disposable = this.disposable.concat(Util.registerCommand(vscode, command, func));
  },
  package: {},
  context: {},
  disposable: []
}
module.exports = app;