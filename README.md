# Workspace Switch

统一管理 AI 编程助手的配置中枢 —— 在一个地方管理 **Skill**、**MCP Server**、**Provider** 和 **Project**，然后将它们分发到本机安装的所有 AI 编程工具中。

## 为什么需要 Workspace Switch？

当你同时使用多个 AI 编程助手（Claude Code、Cursor、Copilot、Codex、Gemini CLI、Qoder 等），你会面临这些问题：

- 同一个 Skill 要在每个 Agent 的配置目录里各存一份，更新时容易遗漏
- MCP Server 的配置格式各不相同（JSON / TOML、字段名不同），手动维护容易出错
- API Key 散落在各个工具的配置文件里，无法集中管理
- 换一台机器后，所有配置要重新来一遍

Workspace Switch 用 **可信源 + symlink 分发** 的模式解决这些问题：

1. 所有 Skill / MCP 配置只保存在一个可信源目录（`~/.workspace_switch/`）
2. "Apply" 操作通过 symlink 将 Skill 链接到目标 Agent 的配置目录
3. MCP 配置会根据目标 Agent 的格式自动渲染并合并到对应配置文件
4. 一次管理，多处生效；反向扫描还能把已有的配置导入回来

## 核心概念

| 概念 | 说明 |
|------|------|
| **Agent** | AI 编程工具，如 Claude Code、Cursor、Copilot 等。每个 Agent 有独立的配置目录格式 |
| **Skill** | 可复用的 AI 指令集（通常是一个包含 SKILL.md 的目录），通过 symlink 分发到各 Agent |
| **MCP Server** | Model Context Protocol 服务端配置，提供工具调用能力。支持 stdio / sse / http 三种传输方式 |
| **Provider** | LLM API 提供者（OpenAI、Anthropic 等），管理 Base URL、API Key 和模型列表 |
| **Project** | 本地代码项目，支持按项目维度启用/禁用特定 Agent 并应用不同的 Skill 集合 |
| **可信源** | `~/.workspace_switch/` 目录，是所有 Skill 和 MCP 配置的唯一真实来源 |
| **反向扫描** | 从 Agent 的实际配置目录扫描已有的 Skill / MCP，导入到可信源后再同步到其他 Agent |

## 项目结构

```
workspace-switch/
├── packages/
│   ├── core/        # 核心业务逻辑（SQLite 数据库、CRUD、symlink 分发、反向扫描、MCP 渲染器）
│   ├── cli/         # CLI 工具 ws_cli（基于 Commander.js 的薄封装层）
│   ├── desktop/     # Electron 桌面 GUI（React + Zustand + Tailwind CSS）
│   └── templates/   # Agent 模板定义
├── pnpm-workspace.yaml
└── package.json
```

## 环境要求

- **Node.js** >= 18
- **pnpm** >= 9
- **macOS** 10.15+（推荐，完整 Keychain 支持；Windows / Linux 可运行但无 API Key 安全存储）

---

## GUI 桌面应用（推荐）

桌面应用基于 Electron + React + Tailwind CSS，提供完整的可视化管理界面。

### 内置功能

- **Dashboard** — 工作区健康概览、Agent 同步状态、快捷操作入口
- **Agent 管理** — CRUD、自动检测本机已安装的 Agent
- **Skill 管理** — CRUD、标签管理、反向扫描向导、Apply / Unapply 到指定 Agent、批量操作
- **MCP 管理** — CRUD、反向扫描、Apply 到指定 Agent（自动格式转换）
- **Provider 管理** — CRUD、API Key 安全存储（macOS Keychain）
- **Project 管理** — 按项目启用/禁用 Agent、按项目应用 Skill
- **全局搜索** — `Cmd+K` / `Ctrl+K` 打开，按类型分组，键盘导航
- **设置页** — 工作区路径、主题、语言、API Key 管理
- **14 个内置 Agent 模板** — Claude Code、Codex、Cursor、Copilot、Qoder CN、OpenCode、OpenClaude、Hermes、Qwen Code、Gemini CLI、Qoder、Factory、Droid、Aider

### 方式一：源码直接运行（开发模式）

适合开发者或需要频繁修改源码的场景。

#### 1. 克隆仓库并安装依赖

```bash
git clone <repo-url>
cd workspace-switch
pnpm install
```

#### 2. 构建 core 包

GUI 和 CLI 都依赖 core，必须先构建：

```bash
pnpm --filter @ws/core build
```

这一步会编译 TypeScript 并将模板文件复制到 `dist/` 目录。

#### 3. 初始化工作区（首次使用）

首次运行前需要初始化可信源目录：

```bash
node packages/cli/dist/index.js init
```

这会在 `~/.workspace_switch/` 下创建目录结构和内置 Agent 模板：

```
~/.workspace_switch/
├── skills/       # Skill 可信源
├── mcp/          # MCP 配置可信源
├── providers/    # Provider 配置
└── ws.db         # SQLite 数据库
```

#### 4. 启动开发模式

```bash
pnpm --filter @ws/desktop electron:dev
```

这个命令会同时启动：
- **Vite 开发服务器**（端口 5173，提供 React 热更新）
- **Electron 窗口**（加载开发服务器页面，支持 DevTools）

> 首次启动时，Electron 会等待 Vite 开发服务器就绪后才加载页面（通过 `wait-on` 实现）。

#### 5. 仅启动前端开发服务器（不含 Electron）

如果你只需要调试前端 UI，可以单独启动 Vite：

```bash
pnpm --filter @ws/desktop dev
```

然后在浏览器打开 `http://localhost:5173`。

### 方式二：打包安装（生产模式）

适合日常使用，打包后是一个独立的 macOS 应用。

#### 1. 克隆仓库并安装依赖

```bash
git clone <repo-url>
cd workspace-switch
pnpm install
```

#### 2. 构建 core 包

```bash
pnpm --filter @ws/core build
```

#### 3. 打包 macOS 应用

```bash
pnpm --filter @ws/desktop electron:build
```

这个命令依次执行：
1. `tsc -b` — 编译 TypeScript（Electron 主进程代码）
2. `vite build` — 构建前端静态资源到 `dist/renderer/`
3. `cp electron/preload.cjs dist/electron/preload.cjs` — 复制 preload 脚本
4. `electron-builder` — 打包为 macOS .app 并生成 .dmg 安装包

打包完成后，产物在 `packages/desktop/dist/` 目录下：

```
packages/desktop/dist/
├── Workspace Switch-0.0.0.dmg    # 安装包（双击打开，拖拽安装）
├── mac/
│   └── Workspace Switch.app/     # 可直接运行的 .app 应用
└── builder-effective-config.yaml # 打包配置记录
```

#### 4. 安装

- **DMG 方式**：双击 `Workspace Switch-0.0.0.dmg`，将应用拖入 Applications 文件夹
- **直接运行**：打开 `packages/desktop/dist/mac/Workspace Switch.app`

#### 5. 首次启动

启动后应用会自动使用 `~/.workspace_switch/` 作为数据目录。如果该目录不存在，需要在首次使用时通过 GUI 的设置页或 CLI 执行初始化：

```bash
node packages/cli/dist/index.js init
```

> 注意：打包后的应用未经代码签名（除非配置了 Apple Developer 证书），首次打开时 macOS 可能提示"无法验证开发者"。前往 **系统设置 > 隐私与安全性**，点击"仍要打开"即可。

---

## CLI 命令行工具

所有命令支持 `--json` 输出，方便脚本集成。

```bash
# 设置别名（可选）
alias ws_cli="node packages/cli/dist/index.js"
```

### 初始化

```bash
ws_cli init
```

### Agent 管理

```bash
ws_cli agent list                        # 列出所有 Agent
ws_cli agent detect                      # 检测本机已安装的 Agent
ws_cli agent add --name my-agent --config-dir .my-agent
ws_cli agent edit --id <id> --name new-name
ws_cli agent remove --id <id>
```

### Skill 管理

```bash
ws_cli skill list                        # 列出所有 Skill
ws_cli skill list --tag coding           # 按标签过滤
ws_cli skill add --name my-skill --source /path/to/skill
ws_cli skill add --name my-skill --git https://github.com/user/repo
ws_cli skill apply --skill my-skill --agent claude-code
ws_cli skill unapply --skill my-skill --agent claude-code
ws_cli skill sync --mode full            # 反向扫描：从 Agent 目录导入 Skill
ws_cli skill tag --id <id> --add coding productivity
ws_cli skill search --query "code review"
ws_cli skill install --name some-skill
```

### MCP Server 管理

```bash
ws_cli mcp list                          # 列出所有 MCP Server
ws_cli mcp add --name my-server --transport stdio --command npx --args my-mcp-server
ws_cli mcp add --name web-server --transport sse --url http://localhost:3000
ws_cli mcp apply --agent claude-code     # 将 MCP 配置写入 Agent 配置文件
ws_cli mcp apply --agent claude-code --strict   # 严格模式（替换而非合并）
ws_cli mcp unapply --agent claude-code
ws_cli mcp sync --mode full              # 反向扫描：从 Agent 配置导入 MCP
ws_cli mcp check                         # 校验 MCP 配置合法性
```

### Provider 管理

```bash
ws_cli provider list
ws_cli provider add --name openai --base-url https://api.openai.com/v1 --api-key sk-xxx
ws_cli provider edit --id <id> --default-model gpt-4o
ws_cli provider use --provider <id> --agent claude-code
```

### 跨资源搜索

```bash
ws_cli search "code review"              # 搜索 Skill / MCP / Provider
ws_cli search "openai" --json
```

### 健康检查

```bash
ws_cli doctor                            # 检查环境：Node 版本、symlink、数据库、钥匙串等
ws_cli doctor --json
```

### 全局选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--json` | JSON 格式输出 | `false` |
| `--verbose` | 详细输出 | `false` |
| `--data-dir <path>` | 数据目录 | `~/.workspace_switch` |
| `--help` | 显示帮助 | |
| `--version` | 显示版本 | |

---

## 开发

```bash
# 构建 core（编译 + 复制模板文件）
pnpm --filter @ws/core build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 运行测试
pnpm test

# 修复 lint 问题
pnpm lint --fix
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+K` / `Ctrl+K` | 打开全局搜索 |

## 系统要求

- **macOS** 10.15+（推荐，完整 Keychain 支持）
- Windows / Linux 可运行但无 API Key 安全存储
- Node.js >= 18
