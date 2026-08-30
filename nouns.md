# Domain Glossary

不确定术语含义时查阅。

## Core Concepts

| Term | Definition |
|------|-----------|
| **Master Workspace** | 用户信任目录，Skill/MCP 唯一可信源。DB: `~/.workspace_switch/ws.db`，结构: `<ws>/skills/`, `<ws>/mcp/` |
| **Agent** | AI 编码工具实例（Claude Code, Codex, Cursor…）。关键属性: `configDirName`, `skillDir`, `mcpFile`, `mcpField`, `enabled` |
| **Agent Template** | 静态 JSON，描述 Agent 配置结构。内置 16 个模板 |
| **Skill** | 可复用指令包，目录形式存于 `<ws>/skills/`。Apply 时创建 **symlink**（非拷贝）。支持 Tag、Git/本地/归档导入、Registry 搜索 |
| **MCP** | MCP Server 配置，JSON Schema 存于 `<ws>/mcp/`。Apply 时**模板渲染 + JSON 合并**（非 symlink）。传输: stdio/sse/http |
| **Provider** | LLM API 提供商配置。API Key 存 Keychain(keytar)，SQLite 只存引用名 |
| **Resource** | Skill + MCP 统称。DB 多态关联: `resource_type` + `resource_id` |
| **Tag** | 资源标签。多态表 `resource_tag` |
| **Project** | 用户定义的工作目录，管理该目录下各 Agent 的 Skill 配置。根目录是项目路径。删除只删 DB 记录不删目录 |

## Operations

| Term | Meaning |
|------|---------|
| **Apply** | 部署资源到 Agent。Skill → symlink; MCP → 渲染合并; Project Skill → 项目目录下 symlink |
| **Unapply** | 撤销 Apply，移除 symlink/配置条目 + 清理 DB |
| **Sync** | 从 Master Workspace 向 Agent 推送资源 |
| **Reverse Scan** | 扫描 Agent 目录发现未入库资源。结果: `new` / `conflict` / `synced` |
| **Toggle Agent** | 项目级启用/禁用 Agent。禁用时清理已应用 symlink |

## Paths

| Term | Meaning |
|------|---------|
| **Trusted Source** | Master Workspace 中的资源目录（symlink 指向目标） |
| **Target Path** | symlink 本身所在路径（Agent 配置目录内） |
| **Config Dir** | Agent 隐藏配置目录（如 `.claude`, `.qoder`） |

## DB Tables

| Table | Purpose |
|-------|---------|
| `resource_agent` | Skill/MCP → Agent 应用记录（`target_path`, `symlinked`） |
| `project_agent` | 项目 × Agent 启用状态 |
| `project_resource_agent` | 项目级资源应用（多了 `project_id` 维度） |

## System

| Term | Meaning |
|------|---------|
| **IPC** | Electron 主进程↔渲染进程通信。`ipcMain.handle` / `ipcRenderer.invoke`。通道: `<domain>:<action>` |
| **Store** | Zustand，每领域一个。组件调 store action，不直接调 `api.*` |
| **Preload** | `preload.cjs` 通过 `contextBridge` 暴露 API。类型: `preload-types.d.ts` → `WsApi` |
| **i18n** | react-i18next。`en.json` + `zh.json`，所有文案走 `t()` |
