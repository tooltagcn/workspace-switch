
# 项目名
agent 资源管理器

# 目标与职责
管理 agent 的 skill, model provide 和 mcp 配置, 为不同agent 在同一个平台管理同一套 skill以及mcp提供便捷，减少切换agent 时，配置不一致问题

# 背景与痛点
市面上agent 工具非常繁多，且各自厂商的skill，mcp，provider 配置管理地址又各不相同，导致每次切换agent时，还要迁移skill，mcp等配置，实在是非常繁琐。

# 软件形式
软件是支持跨平台 mac, windows 并 已 桌面（electron） app 和 cli 两种形态提供

# 名词说明
## agent 模版
主要管理不同厂商的agent 配置模版 主要配置如下
1. 用户级根目录
2. 项目集根目录（默认使用用户根目录名）
3. mcp 配置模版 和 路径
** agent 默认包含市面通用agent模版 比如：claude-code, codex,opencode,openclaude,hermes,consor,qoder等
## 项目主模版（工作目录）：以下简称主目录
 项目主模版是整个项目的通用模版，也就是本项目自己的工作目录
### 目录层级
```
~  用户目录
└── .workspace_switch 工作主目录
    ├── mcp.json mcp配置
    └── skills  skills 目录
```
1. 此目录中的 mcp配置 和 skill 是所有配置的并集，因此所有配置都是从这里复制或者软链接过去的
## skill
1. 添加skill 就是在当前agent目录中 创建一份主目录skill 的软链接
2. 删除skill 就是删掉当前agent目录下的软连接
3. 同步skill 就是将agent目录中有的但是主目录没有的复制一份到主目录
## mcp
1. 添加mcp
1.1 从 主目录 mcp配置选择一个并按当前agent模版复制一份
1.2 主目录没有 先在主目录创建 在走 1.1
2. 删除mcp 只删除当前agent目录下的mcp配置
3. 修改mcp 先修改主模版配置，然后修改所有agent 中有此mcp的配置

# 功能

## agent 管理
### agent 列表
查询所有agent 列表，包含系统预设和自定义
### agent 添加
支持添加自定义agent 主要设置如下
1. 用户级跟目录、项目级跟目录
2. mcp 配置模版 以及 文件名
### agent skill 管理 选中某一个agent后触发
管理当前选中agent 的skill
1. skill 查询 支持 标签和文件名
2. skill 禁用
3. skill 添加 查询未添加且在项目主模版下的skill
### agent mcp 管理 选中某一个agent后触发
1. mcp 查询 
2. mcp 删除
2. mcp 添加 只能选主模版已有的

## skill 管理
这是管理主目录下的所有skill
1. skill 列表 支持标签、名字、已应用agent 查询
1.1 列表字段
1.1.1 skill名字，描述，当前应用了哪些agent
2. 同步skill： 扫描所有其他agent下的skill 将还未同步到主目录的同步过来
3. 应用agent 给skill 添加应用agent，也就是在选中的agent的skill目录中创建软链
4. 取消应用agent 删除选中agent skill目录下的软链
5. 批量添加、删除标签 给skill 添加或者删除标签 方便skill管理

## mcp 管理
这是管理主目录下的所有mcp配置
1. mcp 列表：支持标签、名字、已应用agent 查询
1.1 列表字段
1.1.1 mcp名字，当前应用了哪些agent
2. 同步mcp： 扫描所有其他agent下的mcp 将还未同步到主目录的同步过来
3. 应用agent 给mcp 添加应用agent，也就是在选中的agent的mcp配置下 添加此mcp配置
4. 取消应用agent 删除选中agent mcp配置
5. 批量添加、删除标签 给mcp 添加或者删除标签 方便mcp管理

# 技术
nodejs
ts
electorn
react
sqlite