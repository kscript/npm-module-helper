# npm-module-helper

### 功能说明
1. 安装项目依赖
2. 在package.json中安装/卸载模块
3. 在打开的文件中安装/卸载模块
4. 查看项目依赖的安装版本

### 效果预览

1. 文件资源管理器  
![查看项目依赖的安装版本](./preview.png)  

2. package.json文件  
![安装卸载模块](./preview2.png)

### 使用说明
1. 选择 文件夹/package.json文件/其它文件
2. 鼠标右键打开右键菜单
3. 选择菜单项


### 用户配置
在用户设置中搜索 插件名 npm-module-helper 快速定位到插件配置~  

- 匹配文件类型 [RegExp]  
激活插件的白名单 默认值: ^(js|jsx|ts|tsx|vue)$  
<font color="green">按下快捷键</font> 或 <font color="green">右键选择安装</font> 时, 如果允许当前类型的文件激活插件, 插件会将 <font color="green">光标所在行第一个被单/双引号包裹的文本</font> 作为模块名, 并将其安装在<font color="green">项目根目录(编辑器工作目录)</font>  

- 包管理器 [string]  
支持选择 npm/cnpm/yarn, 默认值: 'npm'  

## 快捷键  
- 卸载: Ctrl + F8  
- 安装: Ctrl + F9  

### LICENSE
MIT
