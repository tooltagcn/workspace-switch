# Agent 资源管理器 — 产品需求文档（PRD）

| 项目代号 | Workspace Switch |
| --- | --- |
| 版本 | v1.0 |
| 文档状态 | 评审稿（Pre-PM Review） |
| 编写日期 | 2026-07-24 |
| 编写人 | 产品（AI 协助） |
| 面向读者 | 研发 / 设计 / 测试 / 运营 / 投资方 |

---

## 目录

1. [项目概述](#1-项目概述)
2. [市场调研](#2-市场调研)
3. [竞品分析](#3-竞品分析)
4. [用户画像与场景](#4-用户画像与场景)
5. [产品定位与差异化](#5-产品定位与差异化)
6. [核心业务流程](#6-核心业务流程)
7. [功能需求详述](#7-功能需求详述)
8. [非功能需求](#8-非功能需求)
9. [数据模型与存储设计](#9-数据模型与存储设计)
10. [技术架构](#10-技术架构)
11. [UI/UX 原则与信息架构](#11-uiux-原则与信息架构)
12. [商业化与运营策略](#12-商业化与运营策略)
13. [项目里程碑与迭代计划](#13-项目里程碑与迭代计划)
14. [风险评估与依赖项](#14-风险评估与依赖项)
15. [成功指标（KPI）](#15-成功指标kpi)
16. [附录：术语表](#16-附录术语表)

---

## 1. 项目概述

### 1.1 项目名称
**Agent 资源管理器**（工作代号：Workspace Switch，下称 **WS**）

### 1.2 一句话定位
让"在 N 个 AI Agent 之间共享一套 Skill / MCP / Provider 配置"这件事像"管理一个 npm 包"一样简单。

### 1.3 项目目标
- 提供一个 **跨平台（macOS / Windows / Linux）** 的 **桌面端 + CLI** 工具，**P0 优先交付 macOS 版本**，框架层做好平台抽象以便后续扩展 Windows / Linux。统一管理市面上主流 AI Coding Agent 的 **Skill、MCP、Provider（模型）** 三类配置。
- 引入"**项目主目录（Master Workspace）**"作为唯一可信源（Single Source of Truth），其他 Agent 的配置目录通过 **软链接（symlink）+ 模板拷贝** 与之同步，杜绝"配置孤岛"。
- 让用户在 30 秒内完成"添加一个新 MCP 到所有 Agent"或"在 Claude Code 和 Codex 之间同步一套 Skill"等高频操作。

### 1.4 解决的核心问题
| 痛点 | 现状描述 | 期望改善 |
| --- | --- | --- |
| 配置碎片化 | Claude Code、Codex、Cursor、Copilot 等 Agent 各自维护 `~/.claude/`、`~/.codex/`、`~/.cursor/` 等目录，格式（JSON/TOML）、路径、字段名互不兼容 | 一份主目录配置，跨 Agent 自动适配 |
| 工具切换成本高 | 切换 Agent 意味着重写 rules、复制 skill、重新调通 MCP | 主目录已统一，按需"应用"即可 |
| 重复劳动 | 在 Claude 调好的 skill 拷到 Codex 经常少文件、改格式、漏 hook | 一次安装，所有 Agent 同步可用 |
| 多机不同步 | 家里的 Mac 和公司的电脑配置割裂 | 手动迁移主目录（如拷贝 / 软链到另一台机器） |

### 1.5 范围边界（In Scope）
- Skill / MCP / Provider 配置的统一管理、同步、应用
- 主流 Agent 模板（Claude Code、Codex、OpenCode、OpenClaude、Hermes、Cursor、Copilot、Qwen Code、Gemini CLI、Qoder、Factory、Droid 等 ≥ 10 个）
- 桌面 GUI（Electron）+ CLI 双形态
- 标签 / 描述 / 搜索 / 批量操作
- 本地 SQLite 元数据

---

## 2. 市场调研

### 2.1 行业背景：AI Coding Agent 进入"多 Agent 共存"阶段

**市场规模（多源数据交叉验证）：**

| 机构 / 来源 | 关键数据 |
| --- | --- |
| Markets and Markets | 全球 AI Agent 市场 2024 年 51 亿美元 → 2030 年 471 亿美元，CAGR 44.8% |
| Root Analysis | 2024 年 52.9 亿美元 → 2035 年 2168 亿美元，CAGR 40.15% |
| 中商产业研究院 | 2025 年全球 AI 智能体市场约 113 亿美元 |
| Bright Data《Data for AI 2026》 | 97% 的企业已在使用 AI Agent |
| 麦肯锡 2025 调研 | 78% 的组织已用上某种 AI 工具，85% 已将 Agent 集成到至少一项工作流 |
| 普华永道 2025 调研 | 79% 的组织在不同程度采用 AI Agent |
| GitHub | 2024 年 AI 生成代码已占全球代码产出 41%，共 2560 亿行 |

**用户行为变化：**
- 调研显示 **68% 的用户**把"跨端数据不同步"列为放弃某款 AI Agent 产品的 **Top 3 原因**；**72% 的企业用户**将"全终端数据一致"列入采购硬性要求。
- 单个开发者平均同时使用 **2.3 个 Agent**（Claude Code + Cursor / Codex / Copilot 等），**多 Agent 协作是常态而非个例**。

### 2.2 三大主流配置体系

| 配置体系 | 代表 | 存储路径示例 | 文件格式 | 行业地位 |
| --- | --- | --- | --- | --- |
| Anthropic Claude Code | Claude Code | `~/.claude/skills/`, `~/.claude/mcp.json`, `~/.claude/CLAUDE.md` | JSON + Markdown | 事实标准（被最多第三方兼容） |
| OpenAI Codex | Codex CLI | `~/.codex/AGENTS.md`, `~/.codex/config.toml`, `~/.codex/skills/` | TOML + Markdown | 增长最快 |
| IDE 嵌入式 | Cursor / Windsurf / Trae | `.cursor/`, `.windsurf/`, 项目根目录 `.mdc` | JSON / YAML | 体验最好但封闭 |

**关键洞察：**
- **MCP（Model Context Protocol）** 自 2024 年 11 月由 Anthropic 开源以来已成为 Agent ↔ 工具的事实标准，2025 年 MCP Server 数量爆发。
- **Skill** 概念由 Claude Code 首创（`SKILL.md` + 目录），已被 OpenCode、Codex、Hermes 等借鉴，但**加载语义不统一**（始终注入 vs 按需激活）。
- 各 Agent 配置文件**格式不统一**（JSON / TOML / YAML）、**路径不统一**、**字段名不统一**（mcpServers vs servers vs mcp_servers）。

### 2.3 用户调研：开发者最关心的 3 件事
基于 CSDN / 掘金 / 博客园 / 少数派等开发者社区的近 6 个月高频反馈：

1. **MCP Server 集中管理**（不希望每个 IDE 配一遍）
2. **跨设备同步**（家庭电脑 / 公司电脑 / 远程服务器）
3. **多 Agent 间一键同步**（最高频需求）

### 2.4 趋势预判（2026–2027）
- **"多 Agent 共存"成为长期形态**，单一 Agent 一统天下的概率极低。
- MCP 将进一步演化为 Agent 工具调用的事实协议，类似"AI 时代的 USB-C"。
- Skill / Prompt 资产会形成"个人知识库"和"团队 Marketplace"两层结构。
- **配置管理工具**会从"附属功能"演化为独立产品门类，类似早期 dotfiles 管理工具的崛起。

---

## 3. 竞品分析

> 选取与本项目最相关的 5 个直接竞品 / 半竞品 / 灵感来源。

### 3.1 竞品矩阵

| 产品 | 形态 | 核心能力 | 支持 Agent | 亮点 | 主要不足 |
| --- | --- | --- | --- | --- | --- |
| **Plexus**（npm: `plexus-agent-config`） | CLI + Web（localhost:7777） | Rules / MCP / Skills 同步面板 | Claude Code、Cursor、Codex、Gemini CLI、Qwen Code、Factory、Droid | 支持 Agent 最多、有 Dashboard | 仅"导出-导入"模式，不是 symlink 实时同步；不支持 Provider；无桌面 GUI |
| **SkillDeck**（crossoverJie） | macOS 原生 App | Skill 浏览/管理 + 分享 | Claude Code、Codex、Copilot CLI | UI 漂亮、有 skill 社区 | 只管 Skill 不管 MCP；无 Provider；仅 macOS |
| **neuDrive.ai** | 云服务 + MCP Connector | Skill / 记忆 / 文件云端同步 + 跨设备备份 | Claude、Codex、Cursor 等 | 解决"封号清零"和"跨设备" | 必须依赖云、闭源、隐私敏感者顾虑大 |
| **openskills**（numman-ali） | CLI 开源框架 | 跨 Agent 复用 Claude Skills | 任意支持 prompt 的 Agent | 协议层最彻底 | 只做 Skill 且需要目标 Agent 支持 prompt 注入；无 GUI |
| **agent-skills**（Google Addy Osmani） | GitHub 仓库 | 20 个工程化 Skill 包 | Claude Code / Cursor / Gemini CLI / Windsurf | 18k+ star，Skill 质量极高 | 是 Skill **内容**而非**管理工具**，与本项目是上下游关系 |
| **apm（Agent Package Manager）** | CLI | "一次编写，处处安装"的 Agent / Skill 包管理 | 多 Agent | 像 npm 一样用 | 偏包管理，不解决"已存在配置"的对齐 |
| **Agent Browser** | 本地服务 + Web UI | 集中托管 MCP Server，提供统一 SSE 端点 | Cursor / Windsurf / Claude Desktop | "MCP 反向代理"思路很优雅 | 只管 MCP，不管 Skill / Provider；需要客户端切换接入方式 |
| **Agent Config Manager**（Deno） | CLI | Agent 配置迁移 | 多 Agent | 跨平台 | 已停止活跃维护 |
| **chezmoi / GNU Stow / mackup** | dotfiles 经典工具 | 文件级 dotfiles 管理 | 通用 | 生态成熟 | 不知 MCP / Skill 概念，纯文件视角 |
| **CC Switch**（farion1231） | Tauri 桌面 App | 8 个 Agent 的 Provider/MCP/Skill 统一管理、代理、云同步、使用统计 | Claude Code、Claude Desktop、Codex、Gemini CLI、Grok Build、OpenCode、OpenClaw、Hermes | 功能最全、企业级、有代理层与故障转移 | **重度复杂**：双向同步状态机、云同步依赖、代理层增加延迟；不适合“电脑小白”与极简用户 |

### 3.2 竞品共性短板（→ 本项目机会窗口）

| 竞品普遍缺失 | 本项目做法 |
| --- | --- |
| 没有"主目录作为单一可信源"的强约束 | 显式定义 Master Workspace，所有变更默认归此 |
| symlink 与模板拷贝混用且语义不清 | **Skill 用 symlink（实时联动），MCP 用模板拷贝（不同 Agent 字段名差异由模板转换）** |
| 没有 Provider / 模型管理 | 一并纳入"Agent 模板"，支持快速切换 baseURL、API Key、模型名 |
| 没有桌面 GUI（多数） | Electron 桌面 + CLI 双形态，向小白用户兼容 |
| 跨平台覆盖不完整 | macOS / Windows / Linux 三端覆盖（用 Electron 抹平差异） |
| **重度复杂、依赖云同步与代理层**（如 CC Switch） | **极简本地优先**：不做备份/恢复、云同步、审计日志、实时监听、通知系统；专注核心同步，适合“电脑小白” |

### 3.3 本项目核心差异化（One-liner）
> **"主目录 + symlink/模板双轨 + 多 Agent 模板 + 跨平台桌面/CLI"**
> ——比 Plexus 更"实时联动"，比 SkillDeck 更"全能"，比 neuDrive 更"本地优先"，比 CC Switch 更"极简轻量"。

---

## 4. 用户画像与场景

### 4.1 三类核心用户

| 画像 | 占比（预估） | 典型特征 | 关键诉求 |
| --- | --- | --- | --- |
| **超级个体开发者**（Pro Dev） | 55% | 同时用 2–3 个 Agent；有自己的 dotfiles 仓库；用 Mac/Win 多机 | 一键同步、版本管理、可脚本化（CLI） |
| **AI 工程师 / 团队 Lead** | 30% | 负责在团队内推广 Agent 规范；要写"团队最佳实践 Skill" | 标签分类、模板化、变更预览与审批（Git PR 或 diff 确认） |
| **尝鲜用户 / 电脑小白** | 15% | 刚接触 Claude Code，路径都不熟 | 桌面 GUI 可视化、开箱即用、内置主流 Agent 模板 |

### 4.2 Top 4 关键用户故事（User Stories）

1. **作为一名 Pro Dev**，我希望在 Claude Code 里加了一个 MCP Server 之后，一键把它同步到 Cursor 和 Codex，而不需要手动改 3 个配置文件。
2. **作为 Pro Dev**，我希望所有 Agent 共用同一份 `SKILL.md`，在一个 Agent 里改了，其他 Agent 立即生效（symlink），不用每次手动同步。
3. **作为 Team Lead**，我希望给一批"代码审查"相关 Skill 打上 `code-review` 标签，并在新成员入职时一键把整组 Skill 应用到他机器的 Claude Code / Codex。
4. **作为电脑小白**，我希望第一次打开应用时，应用能自动扫描到我已经安装的 Claude Code 和 Cursor，并展示我目前的 Skill / MCP，让我点点鼠标就能完成管理。

---

## 5. 产品定位与差异化

### 5.1 产品愿景
> 成为 **AI Agent 时代的 dotfiles / Stow**，让每一位开发者的 Skill / MCP 资产可移植、可追溯（Git）、可分享。

### 5.2 北极星指标（North Star Metric）
**每周通过本工具完成的"跨 Agent 同步 / 应用"操作次数**（体现"工具被持续用于解决问题"）

### 5.3 三大价值主张
1. **一次编辑，处处生效**：Master Workspace 是唯一可信源，symlink + 模板让所有 Agent 同步。
2. **跨平台**：macOS / Windows / Linux 三端一致，多机迁移靠用户手动搬运主目录。
3. **小白友好 + 极客友好**：GUI 点点点 + CLI 脚本化，照顾两类用户。

### 5.4 与现有工具的边界
| 用户已用 | 与 WS 的关系 |
| --- | --- |
| Plexus | WS 提供更深的 symlink 联动 + 桌面 GUI + Provider 管理；Plexus 可作导入源 |
| chezmoi | chezmoi 适合"任意文件级 dotfiles 同步"；WS 专注于"Agent 资产"，理解 MCP / Skill 语义 |
| OpenSkills | OpenSkills 是协议层；WS 可在"添加 Skill"时调用 OpenSkills 协议 |
| neuDrive | WS 默认本地优先；不涉及云端备份 / 同步，与 neuDrive 不冲突 |

---

## 6. 核心业务流程

### 6.1 整体架构示意
```
┌────────────────────────────────────────────────────────────────┐
│                    Master Workspace（主目录）                  │
│   ~/.workspace_switch/                                         │
│   ├── mcp/                                                     │
│   │   ├── weather.json    （统一格式：WS Schema）              │
│   │   ├── github.json                                           │
│   │   └── playwright.json                                       │
│   ├── skills/                                                  │
│   │   ├── code-review/    （目录）                              │
│   │   │   ├── SKILL.md                                          │
│   │   │   └── scripts/                                          │
│   │   └── frontend-ui/                                          │
│   ├── providers/         （模型 provider 配置）                │
│   │   ├── anthropic.json                                       │
│   │   └── openai.json                                           │
│   └── ws.db             （SQLite 元数据，含标签字典）          │
└────────────────────────────────────────────────────────────────┘
        │ symlink                │ template + render
        ▼                        ▼
┌──────────────────┐      ┌──────────────────┐
│ Claude Code      │      │ Codex            │
│ ~/.claude/skills │      │ ~/.codex/skills  │
│ ↘ symlink       │      │ ↘ symlink        │
│ ~/.claude/mcp    │      │ ~/.codex/        │
│   (rendered)     │      │   config.toml    │
└──────────────────┘      │   (rendered)     │
                          └──────────────────┘
```

### 6.2 关键流程

#### 6.2.1 添加 Skill 到主目录
1. 用户在 GUI 点击「添加 Skill」或 CLI `ws_cli skill add ./code-review` / `ws_cli skill install <source>`
2. WS 复制 / clone / 解压到 `~/.workspace_switch/skills/<name>/`
3. 校验 SKILL.md，失败则回滚
4. 写入 SQLite 元数据
5. **到此为止，Skill 仅存在于主目录，尚未对任何 Agent 生效**

> 真正的"应用到 Agent"是 6.2.1.b，是独立的第二步。

#### 6.2.1.b 应用 Skill 到 Agent
1. 用户在 Skill 库选中若干 Skill + 若干 Agent，点击「应用」
2. 对每个 (Skill, Agent) 组合：
   - 在 Agent 配置目录下创建指向主目录的 symlink，如 `~/.claude/skills/code-review -> ~/.workspace_switch/skills/code-review`
   - 写入 SQLite：`resource_agent` 表

#### 6.2.2 添加 MCP 到主目录
> 同样遵循"先主目录、再应用"的两阶段原则。
1. 用户在 GUI 点击「添加 MCP」并选择主目录已有 MCP（或新建）
2. WS 把 MCP 描述写入 `~/.workspace_switch/mcp/<name>.json`（WS Schema）
3. 写入 SQLite
4. **MCP 仅存在于主目录，尚未对任何 Agent 生效**

#### 6.2.2.b 应用 MCP 到 Agent
1. 用户在 MCP 库选中若干 MCP + 若干 Agent，点击「应用」
2. 对每个 (MCP, Agent) 组合，WS 根据该 Agent 模板把 MCP 从 WS Schema 渲染为目标格式：
   - Claude Code → 写入 `~/.claude/mcp.json`（mcpServers map）
   - Codex → 写入 `~/.codex/config.toml`（[mcp_servers.xxx] table）
   - Cursor → 写入 `~/.cursor/mcp.json`
3. 写盘失败时回滚当前操作（不保留历史备份）
4. 写入 SQLite
5. （可选）触发 MCP 健康检查（ping Server）

#### 6.2.3 反向扫描 Skill（从 Agent 收回主目录）

> 初始化完成后，用户已有的 Skill 散落在各 Agent 目录中。反向扫描将它们发现并纳入主目录。

**三种扫描方式（用户可选）：**

1. **按已配置 Agent 目录扫描**：遍历数据库中所有已启用 Agent 的 skill 目录，收集所有 Skill
2. **按用户根目录 `.folder` 扫描**：扫描 `~/` 下所有隐藏目录（如 `~/.claude`、`~/.cursor`、`~/.xxx`），列出供用户选择（支持搜索），再扫描选中目录的 skill 子目录
3. **全量扫描**：组合 1 + 2，覆盖所有可能来源

**扫描结果处理：**
- 对比主目录现有 Skill，分为三类：
  - **新发现**（主目录不存在）：默认 ✅ 选中
  - **冲突**（同名但内容不同）：⚠️ 重点标记，默认 ❌ 不选中，展示 diff
  - **已同步**（同名且一致或为 symlink 源）：跳过不显示
- 用户确认后，将选中的 Skill **复制到主目录**（建立可信源副本），**但不删除 Agent 原始文件、不创建 symlink**——Agent 继续使用自己的本地副本

**逐 Agent 同步（反向扫描后的后续操作）：**
> 反向扫描只完成"发现 + 注册"。要让 Agent 真正使用可信源模式，需要逐 Agent 执行同步：
1. 检查可信源（主目录）是否已有该 Skill 的文件——若没有，先将 Agent 目录中的文件复制到可信源
2. 删除 Agent 目录中的原始文件
3. 在 Agent 目录创建 symlink 指向可信源
- MCP 同步类似：先将 Agent 的 MCP 配置写入可信源（若不存在），然后从可信源渲染并覆盖 Agent 的 MCP 配置

#### 6.2.4 修改 MCP 并下发到所有 Agent
1. 用户在 GUI 编辑 MCP 的字段
2. WS 仅修改主目录的源文件
3. 弹窗预览：「将影响 3 个 Agent，是否立即下发？」，显示 diff
4. 确认后重新渲染所有目标 Agent 配置

#### 6.2.5 失败处理（单步操作）
- 任意"应用 / 同步"操作执行前，先做"预演"——只渲染 / 不写盘
- 写盘过程中失败则回滚当前操作（不影响主目录源）
- 不做跨操作的"历史回滚"，不做文件级快照备份

#### 6.2.6 反向扫描 MCP（从 Agent 收回主目录）

> 与 Skill 反向扫描对称，将散落在各 Agent 配置文件中的 MCP Server 发现并纳入主目录。

**三种扫描方式（同 Skill 反向扫描）：**

1. **按已配置 Agent 目录扫描**：读取每个 Agent 的 MCP 配置文件（如 `~/.claude/mcp.json`、`~/.codex/config.toml`），解析出所有 MCP Server
2. **按用户根目录 `.folder` 扫描**：扫描 `~/` 下隐藏目录，识别已知 Agent 模板的 MCP 文件，列出供用户选择
3. **全量扫描**：组合 1 + 2

**扫描结果处理：**
- 将扫描到的 MCP Server 解析为 WS Schema 格式
- 对比主目录现有 MCP，分为三类：
  - **新发现**（主目录不存在同名 Server）：默认 ✅ 选中
  - **冲突**（同名但配置不同，如 command/args/env 差异）：⚠️ 重点标记，默认 ❌ 不选中，展示字段级 diff
  - **已同步**（同名且配置一致）：跳过不显示
- 用户确认后，将选中的 MCP Server **写入主目录** `mcp/{name}.json`（建立可信源副本），**但不修改 Agent 原始配置文件**

**逐 Agent 同步（反向扫描后的后续操作）：**
1. 检查可信源是否已有该 MCP 的 `mcp/{name}.json`——若没有，先将当前 Agent 的配置解析为 WS Schema 写入可信源
2. 从可信源渲染为目标 Agent 格式，覆盖 Agent 的 MCP 配置文件

---

## 7. 功能需求详述

> 每个功能标注 **优先级**：`P0` 必须 MVP / `P1` v1.0 / `P2` v1.5 / `P3` v2.0+。

### 7.1 Agent 管理（P0）

#### 7.1.0 核心概念：Agent 配置目录
> **重要：本项目把"用户级根目录"与"项目级根目录"统一抽象为同一个实体——Agent 配置目录——它们仅在作用域（用户主目录 vs 项目根目录）上不同。**

每个 AI Agent 都会在文件系统上占一个"配置目录"（通常是某个隐藏目录），用来存放它的 `mcp.json` / `SKILL.md` / `settings.json` 等资源。例如：

| Agent | 配置目录名 | 用户级路径 | 项目级路径 |
| --- | --- | --- | --- |
| Claude Code | `.claude` | `~/.claude/` | `{projectRoot}/.claude/` |
| Codex CLI | `.agents` 或 `.codex` | `~/.agents/` 或 `~/.codex/` | `{projectRoot}/.agents/` 或 `{projectRoot}/.codex/` |
| OpenCode | `.opencode` | `~/.opencode/` | `{projectRoot}/.opencode/` |
| Cursor | `.cursor` | `~/.cursor/` | `{projectRoot}/.cursor/` |
| Hermes | `.hermes` | `~/.hermes/` | `{projectRoot}/.hermes/` |

WS 把这种"Agent 配置目录"抽象为一个一等概念，称之为 **Agent 配置目录（Agent Config Dir）**。每个 Agent 模板在 WS 中只登记一次这个目录名（如 `.claude` / `.agents`），然后通过两条规则自动展开为实际路径：

- **用户级规则**：`{userHome}/{configDirName}` → 例：`~/.claude`
- **项目级规则**：`{projectRoot}/{configDirName}` → 例：`/Users/me/work/my-app/.claude`

WS 通过这套机制让"用户级 / 项目级"在底层共享同一份语义，只是作用域不同——这正是本项目"一次编辑，处处生效"得以成立的基础。

#### 7.1.1 Agent 列表
- **展示**：系统预设（不可删）+ 用户自定义
- **字段**：
  - 名称、图标
  - **配置目录名**（如 `.claude` / `.agents`）— 用户级与项目级共用
  - **用户级配置目录**（完整路径，如 `~/.claude`）— 遵循用户级规则展开
  - **项目级配置目录**（路径模板，如 `{projectRoot}/.claude`）— 遵循项目级规则展开
  - MCP 配置文件名、MCP 字段映射
  - 状态（已安装 / 未检测到 / 路径缺失）
- **筛选**：按名称、按状态

#### 7.1.2 Agent 添加 / 编辑
- **必填**：
  - 名称（如 `claude-code`）
  - **配置目录名**（如 `.claude`）— 同一个 Agent 模板下用户级与项目级复用同一目录名
- **由配置目录名自动派生**（允许覆盖）：
  - **用户级配置目录**：默认 `{userHome}/{configDirName}`，可手动改为绝对路径
  - **项目级配置目录**：默认 `{projectRoot}/{configDirName}`，可用占位符 `{projectRoot}` / `{projectName}` 等
- **高级**：
  - MCP 配置文件名（如 `mcp.json` / `config.toml` / `.mcp.json`）
  - MCP 顶层字段（如 `mcpServers` / `mcp_servers`）
  - Skill 子目录名（如 `skills/` / `commands/`，相对于配置目录）
  - 项目级是否启用（部分 Agent 没有项目级概念，可关闭）
- **自动识别**：粘贴一个 Agent 配置目录的完整路径，WS 自动反推目录名（如 `~/.claude` → `.claude`）并匹配系统预设模板

#### 7.1.3 Agent 删除
- 软删除：仅从 WS 移除记录，**不**触碰真实配置目录
- 提供"同时清理 symlink"选项

#### 7.1.4 内置 Agent 模板（v1.0 至少包含）
Claude Code、Codex、OpenCode、OpenClaude、Hermes、Cursor、GitHub Copilot、Qwen Code、Gemini CLI、Qoder、Factory、Droid、Aider（≥ 12 个）—— 每个模板预填其默认的 **配置目录名**（如 Claude Code = `.claude`、Codex = `.agents`）。

### 7.2 Skill 管理（Master Workspace 视角，P0）

#### 7.2.1 Skill 列表
- **字段**：名称、描述、标签、当前应用的 Agent、文件数、最后修改时间
- **筛选**：标签、名字、已应用 Agent
- **排序**：按名称、按最近使用

#### 7.2.2 添加 Skill

> **核心原则：所有添加 Skill 的操作都只会把 Skill 安装到 Master Workspace（`~/.workspace_switch/skills/`）下，作为单一可信源保存。是否要"应用到某个 Agent"是独立的第二步操作（见 7.2.3），本节不涉及。**

WS 支持 **4 类来源**，用户可按习惯选用；GUI 顶部以"标签页 / 步骤条"形式呈现，CLI 对应 4 个子命令。所有路径最终都收口到主目录。

##### A. 本地 / 远程源码导入（P0）
- 来源：本地目录、Git 仓库 URL、GitHub `owner/repo` 简写、GitLab URL
- 流程：选择来源 → clone / 复制到 `~/.workspace_switch/skills/<name>/` → 校验 SKILL.md → 写入元数据
- 校验规则：必须含 `SKILL.md`（或对应 Agent 的等价文件），描述不能为空
- 重复导入：检测主目录是否已存在同名 Skill，给出去重 / 覆盖 / 重命名选项

##### B. 上传压缩包（P0）
- 支持格式：`.zip` / `.tar.gz` / `.tar`
- 上传方式：
  - GUI：拖拽 / 文件选择器
  - CLI：`ws_cli skill add ./my-skill.zip`
- 流程：校验压缩包格式与内容完整性 → 解压到临时目录 → 复制到 `~/.workspace_switch/skills/<name>/` → 走 A 的"校验 SKILL.md"流程
- 安全校验：
  - 解压前限制大小（默认 ≤ 50MB，可配置）
  - 防 Zip Slip（拒绝含 `../` 路径的条目）
  - 防符号链接炸弹（拒绝含 symlink 的条目）
  - 病毒扫描钩子（可选，用户可指向本地 ClamAV）

##### C. 在线搜索与安装（P0，集成 `npx skills`）
> 业内已有成熟的"AI agent 技能包管理"工具（Vercel 出品的 `npx skills`），WS 直接集成其能力，避免重复造轮子。**所有安装结果统一收口到主目录，调用 `npx skills` 时不传 `--agent`，仅用作"下载 / 解析"通道。**

- **在线搜索**
  - 搜索源：默认调用 `npx skills find <query>`，底层走 https://skills.sh/ Marketplace
  - GUI 入口：Skill 库 → "添加 Skill" → "在线搜索"标签页
  - 搜索结果展示：技能名、作者、描述、下载量、评分、Star、最后更新
  - 支持筛选：按 Agent 兼容性、按标签、按作者
- **一键安装到主目录**
  - 选中目标 Skill → 预览元信息 → 确认
  - WS 后台流程：调用 `npx skills add <source>`（不传 `--agent`，让 skill 安装到 WS 控制的临时 / 默认目录）→ 立刻把产物迁移到 `~/.workspace_switch/skills/<name>/` → 写入元数据
  - **不**在此步骤触发任何 Agent 端的写入
- **批量安装**
  - 支持多选后一次性把多个 Skill 收口到主目录
  - 进度条 + 失败时回滚当前批次（任一失败则中止并提示）
- **CLI 形态**
  - `ws_cli skill search <keyword>`     在 Marketplace 搜索
  - `ws_cli skill install <source>`     安装到主目录（不写到任何 Agent）
  - `ws_cli skill install <source> -f`  强制覆盖主目录同名 Skill
- **离线 / 自托管源（v1.5）**
  - 支持配置自建 Skills Registry URL（兼容 `npx skills` 协议）
  - 企业内网场景：私有 Marketplace 镜像

##### D. 主目录内手工新建（P0）
- 手工新建：GUI 弹窗填写 name / description → 直接在 `~/.workspace_switch/skills/<name>/` 下创建 SKILL.md 模板

##### 公共校验
无论来源，所有 Skill 入主目录前必须通过：
1. 包含合法 `SKILL.md`（含 frontmatter：`name` / `description`）
2. description 非空且 ≥ 10 字符
3. 不与主目录现有 Skill 同名（冲突时弹窗让用户选）

##### 应用到 Agent 是独立步骤
本节完成后，Skill 已经在主目录中可查；但**尚未在任何 Agent 中生效**。要让它在某个 Agent 中可用，请进入 7.2.3「应用 Skill 到 Agent」单独操作。

#### 7.2.3 应用 Skill 到 Agent
- 选择 1 个或多个 Agent
- WS 在目标 Agent 的 skill 目录创建 symlink
- 若目标已存在同名（无论文件还是断链），弹窗让用户选择：覆盖 / 跳过 / 重命名

#### 7.2.4 取消应用
- 删除目标 Agent 下的 symlink
- 不影响主目录源

#### 7.2.5 反向扫描 Skill（从 Agent 收回主目录）

> 初始化后，用户已有的 Skill 散落在各 Agent 目录。反向扫描将它们发现并纳入主目录。

**三种扫描方式：**
1. **按已配置 Agent 扫描**：遍历数据库中所有已启用 Agent 的 skill 目录
2. **按用户根目录隐藏文件夹扫描**：扫描 `~/` 下所有 `.xxx` 目录，列出供用户选择（支持搜索过滤），再扫描选中目录
3. **全量扫描**：组合 1 + 2

**结果展示与交互：**
- 新发现（主目录不存在）：默认 ✅ 选中
- 冲突（同名不同内容）：⚠️ 重点标记（红色/橙色），默认 ❌ 不选中，展示 diff
- 已同步：跳过不显示
- 用户勾选后**复制到主目录**（建立可信源副本），**文件保持原位置不动、不创建 symlink**

**逐 Agent 同步（后续操作）：**
- 对每个 Agent 中的已注册 Skill：先确保可信源有文件（没有则从 Agent 复制），然后删本地、建 symlink

#### 7.2.6 编辑 Skill
- 直接编辑主目录源文件
- 实时保存，Agent 端通过 symlink 立即生效
- 危险操作（如删除整个 Skill）走确认弹窗

#### 7.2.7 标签管理
- 给 Skill 增删标签（多选）
- 批量打标签 / 去标签
- 标签是全局共享字典，支持重命名、合并

### 7.3 MCP 管理（Master Workspace 视角，P0）

#### 7.3.1 MCP 列表
- 字段：名称、command/url、env（脱敏显示）、已应用 Agent
- 筛选：标签、名字、已应用 Agent

#### 7.3.2 添加 MCP
- 主目录新建或从已有 Agent 导入
- 字段：name、transport（stdio / sse / http）、command / url、args、env、tags、description

#### 7.3.3 应用 MCP 到 Agent
- 选中主目录 MCP + 目标 Agent
- 渲染为目标格式后写入目标文件
- 写盘策略（极简但可控）：
  - 默认“合并模式”：保留目标文件中非 MCP 相关内容；对 MCP 区块按 Server name 合并（主目录同名覆盖、主目录未声明的不删除）
  - 可选“严格模式”：目标文件的 MCP 区块完全以主目录为准（适合希望强一致的用户/团队）
- 失败时回滚当前操作（不保留历史备份）

#### 7.3.4 编辑 MCP
- 改主目录 → 选择"仅本主目录" / "下发所有 Agent" / "选择 Agent 下发"
- 渲染后展示内容预览（diff 形式），确认后写盘

#### 7.3.5 删除 MCP
- 仅删目标 Agent 配置（默认）
- 可选"同时从主目录移除"（强提示）

#### 7.3.6 MCP 健康检查（P1）
- `ws_cli mcp check` 启动 stdio / ping http 端点
- GUI 显示状态徽章（绿 / 黄 / 红）

#### 7.3.7 反向扫描 MCP（从 Agent 收回主目录）

> 与 Skill 反向扫描对称。将散落在各 Agent 配置文件中的 MCP Server 纳入主目录。

**三种扫描方式（同 Skill 反向扫描）：**
1. **按已配置 Agent 扫描**：读取每个 Agent 的 MCP 配置文件，解析出所有 MCP Server
2. **按用户根目录隐藏文件夹扫描**：扫描 `~/` 下隐藏目录，识别已知 Agent 模板的 MCP 文件，列出供用户选择（支持搜索）
3. **全量扫描**：组合 1 + 2

**结果展示与交互：**
- 将扫描到的 MCP Server 解析为 WS Schema 格式
- 新发现：默认 ✅ 选中
- 冲突（同名不同配置）：⚠️ 重点标记，默认 ❌ 不选中，展示字段级 diff（command / args / env 逐项对比）
- 已同步：跳过不显示
- 用户勾选后**写入主目录** `mcp/{name}.json`（建立可信源副本），**不修改 Agent 原始配置**

**逐 Agent 同步（后续操作）：**
- 对每个 Agent 中的已注册 MCP：先确保可信源有 `mcp/{name}.json`（没有则从 Agent 配置解析写入），然后从可信源渲染覆盖 Agent 配置

### 7.4 Provider / 模型管理（P1）

#### 7.4.1 Provider 列表
- 字段：name、baseUrl、apiKeyEnv、defaultModel、模型列表、已应用 Agent

#### 7.4.2 添加 / 编辑 Provider
- 支持 Anthropic、OpenAI、DeepSeek、Ollama、本地 vLLM、Azure OpenAI 等
- **API Key 安全管理**：不落明文到 SQLite，存系统 Keychain（macOS）/ Credential Manager（Windows）/ Secret Service（Linux）

#### 7.4.3 切换 Provider
- 一键把指定 Agent 的 model provider 切到主目录的某个 provider
- 切换前展示目标 Agent 当前 provider 信息供确认

### 7.5 全局能力

#### 7.5.1 全文搜索（P0）
- 跨 Skill / MCP / Provider 的统一搜索框
- 支持中文 / 英文 / 拼音
- 搜索范围可限定（仅 Skill 名字、仅 MCP env 等）

#### 7.5.2 批量操作（P0）
- 多选 Skill / MCP → 批量打标签、批量应用、批量取消应用、批量删除

#### 7.5.3 团队空间（v2.0 / P3）
- 基于 Git 的团队共享主目录
- 角色权限：管理员 / 成员 / 只读
- 变更走 PR 流程

### 7.6 CLI 命令设计（v1.0）

```
ws_cli init                                # 初始化主目录
ws_cli agent list|add|edit|remove|detect   # Agent 管理
ws_cli skill list|add|edit|remove|apply|unapply|sync|tag|search|install
ws_cli mcp   list|add|edit|remove|apply|unapply|sync|check
ws_cli provider list|add|edit|use
ws_cli search <keyword>                    # 跨资源搜索
ws_cli tui                                 # 启动终端交互界面（可选）
ws_cli doctor                              # 健康检查（环境、依赖、权限）
```

每个命令支持 `--json` 输出，便于脚本化。

### 7.7 桌面 GUI 核心页面

| 页面 | 关键元素 |
| --- | --- |
| 仪表盘 | 主目录健康度、各 Agent 同步状态、快捷入口 |
| Agent 管理 | Agent 列表 / 详情 / 添加 / 编辑 |
| Skill 库 | 列表 / 筛选 / 标签云 / 详情 / 预览 SKILL.md |
| MCP 库 | 列表 / 详情 / 健康状态 |
| Provider 库 | 列表 / 详情 / Key 管理 |
| 设置 | 主目录路径、API Key、主题、语言 |

---

## 8. 非功能需求

### 8.1 性能
- 主目录 < 1000 个 Skill / MCP 时，列表加载 < 200ms
- symlink 创建 / 删除：单操作 < 50ms
- "应用 MCP 到所有 Agent"操作 < 1s（10 个 Agent 内）

### 8.2 兼容性
- **P0 目标平台**：**macOS 12+**（arm64 + x64）
- **P1 扩展平台**：Windows 10+、Ubuntu 20.04+
- **架构**：x64、arm64（Apple Silicon、Surface Pro X）
- **Node.js**：≥ 18
- **Electron**：≥ 27
- 桌面 GUI 与 CLI 共享同一份核心包（`@ws/core`）
- **框架层要求**：Core 包中涉及平台差异的模块（symlink、keytar、路径处理）须做平台抽象（接口 + 平台实现），P0 仅交付 macOS 实现，预留 Windows / Linux 接口

### 8.3 安全
- API Key 一律走系统 Keychain / DPAPI，SQLite 中只存引用名
- `.env` 类敏感文件自动检测并提示纳入 `.gitignore`
- 执行 symlink 操作前严格校验目标路径是否在 Agent 模板白名单内
- 启动时校验主目录完整性（checksum）

### 8.4 可靠性
- 所有写操作走"预演 → 改 → 校验"三步
- 异常时回滚当前操作（不保留历史快照）
- SQLite 写入用 WAL 模式
- 提供 `ws_cli doctor` 工具自检环境

### 8.5 国际化
- v1.0 完成 **英文** 界面（P0）
- 通过 i18n 资源文件（i18next），文案与代码分离，框架支持多语言切换
- **中文** 界面为 P1（v1.0 后续版本）

### 8.6 可访问性（A11y）
- GUI 遵守 WCAG 2.1 AA 标准
- 键盘可操作、屏幕阅读器友好
- 颜色对比度 ≥ 4.5:1

### 8.7 可扩展性
- 第三方可通过 `ws-plugin` 协议贡献新 Agent 模板
- 模板仓库（Git）可被用户自定义拉取

---

## 9. 数据模型与存储设计

### 9.1 目录结构
```
~/.workspace_switch/
├── mcp/                     # MCP 源（WS Schema，JSON）
├── skills/                  # Skill 源
├── providers/               # Provider 源
└── ws.db                    # SQLite 元数据（含标签字典，统一事实源）
```

> 注：标签字典统一存储在 SQLite `tag` / `resource_tag` 表中，不再使用独立 `tags.json` 文件，避免双源同步问题。

### 9.2 关键表结构

```sql
-- Agent
CREATE TABLE agent (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  builtin         INTEGER DEFAULT 0,
  config_dir_name TEXT NOT NULL,         -- Agent 配置目录名，如 ".claude" / ".agents"
                                        -- 用户级与项目级共享此目录名，只是展开路径不同
  user_root       TEXT NOT NULL,         -- 用户级配置目录（绝对路径），默认 {userHome}/{config_dir_name}
  project_root    TEXT,                  -- 项目级配置目录（路径模板，含 {projectRoot} 等占位符）
                                        -- 默认 {projectRoot}/{config_dir_name}
  project_enabled INTEGER DEFAULT 1,    -- 是否启用项目级（部分 Agent 无项目级概念）
  mcp_file        TEXT,                  -- 相对配置目录的文件名，如 "mcp.json" / "config.toml"
  mcp_field       TEXT,                  -- MCP 顶层字段名，如 "mcpServers" / "mcp_servers"
  skill_dir       TEXT,                  -- Skill 子目录名（相对配置目录），如 "skills" / "commands"
  enabled         INTEGER DEFAULT 1,
  detected_at     TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- Skill
CREATE TABLE skill (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  source_path     TEXT NOT NULL,        -- 主目录中的源路径
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- MCP
CREATE TABLE mcp (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  transport       TEXT NOT NULL,        -- stdio | sse | http
  command         TEXT,
  url             TEXT,
  args_json       TEXT,
  env_json       TEXT,                  -- 引用名 -> env var 名称
  description     TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- Provider
CREATE TABLE provider (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  base_url        TEXT,
  api_key_ref     TEXT,                 -- 引用 Keychain 名
  default_model   TEXT,
  models_json     TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- 资源 <-> Agent 多对多
CREATE TABLE resource_agent (
  resource_type   TEXT NOT NULL,         -- skill | mcp | provider
  resource_id     TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  target_path     TEXT,                  -- 实际写入的目标路径
  symlinked       INTEGER DEFAULT 0,    -- 仅 skill 适用
  applied_at      TEXT NOT NULL,
  PRIMARY KEY (resource_type, resource_id, agent_id)
);

-- 标签
CREATE TABLE tag (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  color           TEXT
);

CREATE TABLE resource_tag (
  resource_type   TEXT NOT NULL,
  resource_id     TEXT NOT NULL,
  tag_id          TEXT NOT NULL,
  PRIMARY KEY (resource_type, resource_id, tag_id)
);

### 9.3 WS Schema 示例（统一 MCP 格式）
```json
{
  "name": "github",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "env:GITHUB_TOKEN"
  },
  "description": "GitHub API MCP Server",
  "tags": ["dev", "git"]
}
```

模板渲染时根据 Agent 模板把 `env:GITHUB_TOKEN` 解析为 `${env:GITHUB_TOKEN}`（Claude Code）、`GITHUB_TOKEN = "${GITHUB_TOKEN}"`（Codex TOML）等。

---

## 10. 技术架构

### 10.1 整体架构
```
┌────────────────────────────────────────────────────────────┐
│                      表现层（Presentation）                │
│   ┌────────────────────┐    ┌────────────────────┐        │
│   │  Electron Desktop  │    │       CLI          │        │
│   │  React + TS        │    │  Commander.js       │        │
│   └─────────┬──────────┘    └─────────┬──────────┘        │
│             │ IPC / REST              │                     │
└─────────────┼─────────────────────────┼────────────────────┘
              │                         │
              ▼                         ▼
┌────────────────────────────────────────────────────────────┐
│                 Core 核心包（@ws/core）                     │
│   - Agent Registry        - Skill Manager                  │
│   - MCP Manager           - Provider Manager               │
│   - Template Renderer     - Sync Engine                    │
│   - Search Index          - Plugin System                  │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────┐
│                 平台适配层（Platform）                      │
│   - fs / symlink / fs-extra                                │
│   - keytar（Keychain / Credential Manager / Secret Service）│
│   - better-sqlite3                                         │
└────────────────────────────────────────────────────────────┘
```

### 10.2 关键技术选型
| 模块 | 选型 | 理由 |
| --- | --- | --- |
| 运行时 | Node.js 18+ + TypeScript | 跨平台、与 Electron 同源、CLI 友好 |
| 桌面框架 | Electron + React + Vite | 跨平台、UI 生态丰富 |
| UI 组件 | shadcn/ui + Tailwind | 现代、轻量、易定制 |
| 状态管理 | Zustand | 简单 |
| 本地数据库 | better-sqlite3 | 同步 API、性能好 |
| CLI | Commander.js | 事实标准 |
| 模板渲染 | Handlebars | 简单、Agent 模板可热加载 |
| 搜索 | FlexSearch / MiniSearch | 本地全文索引 |
| 凭据 | keytar | 跨平台系统凭据库 |
| 测试 | Vitest + Playwright | 单元 + E2E |
| 打包 | electron-builder + pkg（CLI） | 多端分发 |
| 国际化 | i18next + react-i18next | 成熟方案 |

### 10.3 包结构
```
workspace-switch/
├── packages/
│   ├── core/                # 核心逻辑
│   ├── desktop/             # Electron 应用
│   ├── cli/                 # CLI 工具
│   └── templates/           # Agent 模板包
├── apps/
│   └── docs/                # 文档站（可选）
├── package.json             # monorepo root
└── pnpm-workspace.yaml
```

### 10.4 关键设计决策
- **symlink vs 拷贝**：Skill 用 symlink（实时联动，节省空间），MCP 用模板渲染拷贝（各 Agent 字段名不同）。
- **跨平台 symlink**：Windows 默认需要"开发者模式"或管理员权限，需在文档中说明并提供"复制模式"降级。
- **断链修复**：启动时自动检测并提示。
- **并发安全**：所有写操作走互斥锁（proper-lockfile）。

---

## 11. UI/UX 原则与信息架构

### 11.1 设计原则
1. **"Master Workspace 是家"**：所有资源默认从家出发，Agent 是"租客"。
2. **一眼看到全貌**：仪表盘是默认首页，告知"主目录健康度 / 各 Agent 状态"。
3. **小白和极客都舒服**：GUI 提供点点点，CLI 提供脚本化，**同一份核心逻辑**。
4. **失败可恢复**：单步操作失败时回滚当前操作，但**不做跨操作的历史回滚**，避免复杂的状态机。

### 11.2 信息架构
```
首页（仪表盘）
├── Agent 管理
│   ├── Agent 列表
│   └── Agent 详情
├── Skill 库
│   ├── 列表 + 筛选
│   ├── 详情（含 SKILL.md 预览）
│   └── 添加 Skill
│       ├── 本地 / 远程导入（目录 / Git / URL）
│       ├── 上传压缩包（拖拽）
│       ├── 在线搜索（npx skills find）
│       └── 手工新建 SKILL.md
├── MCP 库
│   ├── 列表 + 健康状态
│   ├── 详情
│   └── 添加向导
├── Provider 库（v1.0+）
└── 设置
    ├── 主目录路径
    ├── API Key 管理
    ├── 主题 / 语言
```

### 11.3 关键交互细节
- "应用 Skill 到 3 个 Agent" → 进度条 + 实时输出面板
- "修改 MCP 并下发" → diff 弹窗预览 → 确认
- 任何删除操作 → 二次确认弹窗（无回收站）

---

## 12. 商业化与运营策略

### 12.1 商业模式
| 形态 | 定价 |
| --- | --- |
| 桌面 App + CLI（个人版） | **免费 + 开源**（MIT） |
| 团队版（v2.0） | $5 / 用户 / 月，含团队空间、权限、SSO（变更以 Git PR 或 diff 审批为主） |
| Marketplace 抽成（v1.5+） | 付费 Skill 销售分成 10% |

### 12.2 增长策略
- **社区驱动**：开源核心 + 接受 PR 贡献 Agent 模板
- **内容营销**：在 CSDN、掘金、博客园、少数派持续输出"AI Agent 配置管理"系列文章
- **KOL 合作**：与 AI 编程博主（B 站、知乎）合作 demo
- **SEO 长尾**：占领"Claude Code MCP 配置"、"Cursor MCP 同步"等长尾关键词
- **插件生态**：鼓励社区贡献 Agent 模板，按下载量 / 评分形成正循环

### 12.3 社区与文档
- 官网 + 文档站（Docusaurus / VitePress）
- Discord / 飞书群
- 月度线上"Agent 配置工作流"分享会

---

## 13. 项目里程碑与迭代计划

> 仅定义迭代目标与交付物，不以日期承诺为导向（避免文档快速过期）。

### 13.1 MVP（P0）交付物
- **目标平台**：macOS（arm64 + x64），框架层做好平台抽象
- **界面语言**：英文（i18n 框架就绪，中文 P1 跟进）
- `ws_cli init / agent / skill / mcp`：完整闭环（添加到主目录 → 应用到 Agent → 取消应用）
- Master Workspace 目录结构落地：`skills/`、`mcp/`、`ws.db`
- Agent 模板：至少覆盖 Claude Code / Codex / Cursor / Copilot（其余作为可扩展模板逐步补齐）
- Skill 来源：本地/远程源码导入、压缩包上传、在线搜索与安装（集成 `npx skills`）、主目录手工新建
- 差异预览与失败回滚：MCP 写盘前 diff 预览；单步失败回滚（不做历史备份）
- `ws_cli doctor`：基础环境/权限检测（路径可写、symlink 能力、依赖可用）
- 主目录完整性校验：启动时 checksum 验证

### 13.2 v1.0（P1）交付物
- **跨平台扩展**：Windows 10+ / Ubuntu 20.04+ 适配与测试
- **中文界面**：完成 i18n 中文资源文件
- **可访问性**：WCAG 2.1 AA 基础验收（键盘可达性 + 对比度）
- **拼音搜索**：搜索支持拼音索引
- MCP 健康检查：`ws_cli mcp check`
- Provider 管理：增删改用（凭据进系统 Keychain/凭据管理器）
- GUI 基础页：仪表盘 / Skill 库 / MCP 库 / Agent 管理 / 设置（不追求重度可视化，保证可用性与一致性）

### 13.3 v1.5（P2）方向
- 可配置的 Skills Registry（离线/自托管源）
- 更完整的 Agent 模板覆盖与社区模板仓库

### 13.4 v2.0+（P3）方向
- 团队空间（Git 工作流）：以 PR 审批为核心的共享主目录与发布机制
- 权限与组织能力：成员管理、只读/可写、SSO（团队版）

---

## 14. 风险评估与依赖项

### 14.1 关键外部依赖
- `npx skills` / Marketplace：在线搜索与安装依赖其可用性与协议稳定性
- 各 Agent 的配置格式与路径：上游变更可能导致模板失效，需要持续维护模板映射
- 原生依赖：`better-sqlite3`、`keytar` 在不同 OS/架构下的构建与签名分发风险

### 14.2 主要产品/技术风险
- Windows symlink 权限：未启用开发者模式/无权限时需降级为“复制模式”，否则新手会被卡死
- “不做历史备份”的心理预期：即使有 diff 预览，用户对误操作仍敏感，需要清晰告知与强确认
- 配置写盘冲突：用户同时手动改 Agent 配置可能引发覆盖，需要“应用前预演 + 目标文件占用/冲突提示”
- Agent 检测准确率：自动扫描路径在多安装形态（便携版/企业管控）下可能失败，必须允许手动指定路径

### 14.3 风险缓解策略（极简版）
- 所有写操作默认提供 diff 预览；高危操作强确认
- `ws_cli doctor` 在启动/首次运行时突出显示关键阻塞项（权限、路径、依赖）
- 模板版本化：模板随应用版本发布，避免“远端模板变更导致本地不可预测”

---

## 15. 成功指标（KPI）

### 15.1 北极星指标（延用 5.2）
- 每周通过本工具完成的“跨 Agent 同步/应用”操作次数

### 15.2 关键过程指标（建议 v1.0 起埋点）
- 激活：安装后 10 分钟内完成首次 `apply` 的用户占比
- 成功率：`apply`/`unapply`/`sync` 操作成功率（按资源类型拆分）
- 风险控制：因写盘失败/权限不足导致的阻塞比例（doctor 命中率）
- 留存：7 日/30 日活跃（以“发生过一次 apply/sync”定义活跃）

---

## 16. 附录：术语表

| 术语 | 定义 |
| --- | --- |
| **Agent** | AI 编程助手的统称，如 Claude Code、Codex、Cursor |
| **Agent 配置目录**（Agent Config Dir） | **WS 抽象的一等概念**。指某个 Agent 在文件系统上占用的"配置根目录"，本质就是 `~/.claude` / `~/.agents` / `~/.cursor` 这类隐藏目录。每个 Agent 模板只登记一次**配置目录名**（如 `.claude`），再通过"用户级 / 项目级"两条规则展开为实际路径。 |
| **配置目录名**（Config Dir Name） | Agent 配置目录的目录名部分（如 `.claude` / `.agents`）。同一个 Agent 模板下，用户级和项目级共享同一个目录名。 |
| **用户级配置目录**（User-Level Config Dir） | Agent 配置目录在用户主目录下的实例，如 `~/.claude`。展开规则：`{userHome}/{configDirName}`。 |
| **项目级配置目录**（Project-Level Config Dir） | Agent 配置目录在某个项目根目录下的实例，如 `/Users/me/work/app/.claude`。展开规则：`{projectRoot}/{configDirName}`，路径模板支持占位符。 |
| **Master Workspace** | 本项目的主目录（`~/.workspace_switch/`），配置的唯一可信源 |
| **Skill** | 一组结构化的 Prompt / 指令 / 脚本包，通常含 `SKILL.md` |
| **MCP** | Model Context Protocol，Agent 调用工具的开放协议 |
| **MCP Server** | 实现 MCP 协议的服务进程，给 Agent 提供工具 |
| **Provider** | 大模型提供方（Anthropic、OpenAI、DeepSeek 等）及其接入信息 |
| **Symlink** | 符号链接，本项目用其实现"一处改、处处生效" |
| **WS Schema** | 本项目自定义的统一 MCP / Skill 描述格式（JSON） |
| **Agent 模板** | 描述某个 Agent 配置目录名、MCP 文件名、字段映射、Skill 子目录名等元数据的"配方" |

---
