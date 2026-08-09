# AGENTS.md — Workspace Switch (WS)

AI coding agent guide. Read before any work.

> **必读**: [`framework.md`](./framework.md) (编码规范) · [`feature-rules.md`](./feature-rules.md) (跨模块业务规则) · [`nouns.md`](./nouns.md) (领域术语)

## 项目简介

用户通常同时使用多个 AI 编码工具（Claude Code、Codex、Cursor、Copilot 等），每个工具有独立的配置目录，Skill 和 MCP 配置分散且难以统一管理。

**Workspace Switch** 解决这一问题：通过一个"Master Workspace（主工作区）"作为唯一可信源，集中管理所有 AI Agent 的 **Skill / MCP / Provider** 三类配置，并自动同步下发到各 Agent 的配置目录中。

**核心机制：**
- **Skill** → symlink 方式部署（源文件只存一份，各 Agent 目录中创建符号链接）
- **MCP** → 模板渲染 + JSON 合并方式部署（写入各 Agent 的配置文件）
- **Provider** → API Key 存系统 Keychain，配置下发到 Agent
- **Project** → 用户指定一个工作目录，选择启用哪些 Agent，在该目录下独立管理各 Agent 的 Skill 配置（与用户级 Master Workspace 平行，根目录为项目路径）

**产品形态：** Electron 桌面 GUI + CLI (`ws_cli`)，本地 SQLite 元数据，本地优先、无云依赖。P0 支持 macOS。

**技术架构：** pnpm monorepo — `packages/core`（领域逻辑 + SQLite）· `packages/cli` · `packages/desktop`（Electron + React）· `packages/templates`（Agent 模板）

## Key docs

| File | Purpose |
|------|---------|
| `docs/PRD.md` | 产品需求（事实源） |

## Rules

- 文档引用用相对路径，移动文件后修复残留引用
- 验证顺序: `pnpm lint` → `pnpm typecheck` → `pnpm test`
- 编码规范 → `framework.md`，业务规则 → `feature-rules.md`，术语 → `nouns.md`
