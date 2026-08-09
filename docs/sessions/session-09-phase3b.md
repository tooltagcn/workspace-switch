# Session 09：Phase 3B — GUI 业务页面（Dashboard + Agent + Skill + MCP + Apply）

## 目标

实现 5 个核心业务页面：仪表盘、Agent 管理、Skill 库（含反向扫描向导）、MCP 库（含反向扫描向导）、应用到 Agent 交互。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 3 §3.4 - §3.8
- `../PRD.md` → §11（UI/UX 原则）、§7.1-§7.3

## 前置依赖

- Session 08 完成（GUI 脚手架 + IPC + UI 基础设施 + i18n）
- Phase 1 全部完成（core API 可用）

## 关键设计决策

1. **Dashboard**：WorkspaceHealthCard + AgentSyncStatus + QuickActions（含反向扫描入口）+ ReverseScanSummary
2. **Agent 管理**：列表 + 详情面板 + 添加/编辑对话框，粘贴路径自动反推
3. **Skill 库**：列表 + 筛选 + 详情预览 + 4 Tab 添加向导 + 标签管理 + **反向扫描向导**
4. **MCP 库**：列表 + 详情 + 添加/编辑 + **反向扫描向导**
5. **Apply 交互**：Skill/MCP 复用，Agent 多选 → diff 预览 → 确认 → 进度条 → 结果汇总
6. **所有文案用 t()**

## 任务清单

### 3.4 仪表盘页
- WorkspaceHealthCard：主目录路径 + 总数 + 完整性状态
- AgentSyncStatus：每个 Agent 同步状态
- QuickActions：快捷入口（含反向扫描 Skill/MCP）
- ReverseScanSummary：最近一次扫描结果摘要

### 3.5 Agent 管理页
- AgentList：表格（名称、图标、配置目录、路径、状态徽章）
- AgentDetail：右侧面板（字段 + 已应用 Skill/MCP）
- AgentAddDialog：表单 + 粘贴路径自动反推
- AgentEditDialog

### 3.6 Skill 库页
- SkillList：表格 + 筛选 + 排序
- SkillDetail：SKILL.md 预览 + 标签 + 已应用列表 + 取消应用
- SkillAddWizard（4 Tabs）：本地导入 / 压缩包上传 / 在线搜索 / 手工新建
- TagManager：标签列表 + 批量打标签
- **ReverseScanWizard**：
  - Step 1：选扫描模式（agents / home / full）
  - Step 1.5（home 模式）：列出隐藏文件夹，搜索过滤 + 选择
  - Step 2：结果列表（新发现✅/冲突❌/已同步隐藏）
  - Step 3：确认导入到可信源
  - Step 4：逐 Agent 同步（可选）

### 3.7 MCP 库页
- McpList：表格（名称、transport、command/url、env 脱敏、健康状态）
- McpDetail：配置展示 + env 展开 + 已应用列表
- McpAddDialog / McpEditDialog
- **McpReverseScanWizard**：
  - 同 Skill ReverseScanWizard 结构
  - Step 2 冲突项展示字段级 diff

### 3.8 应用到 Agent 交互
- ApplyToAgentDialog（Skill/MCP 复用）
- 流程：选中资源 → Agent 多选 → diff 预览（MCP）→ 确认 → 进度条 → 结果汇总
- 单个 Agent 失败不影响其他

## 完成标准

- [x] 5 个页面可正常渲染
- [x] IPC 调用 core API 正常
- [x] 反向扫描向导完整流程（4 步）
- [x] Apply 交互 diff 预览 + 进度条
- [x] 所有文案用 t()
- [x] ../task.md §3.4-§3.8 标记 [x]

## 给下一个会话的备注

- Provider 页面（3.9）和设置页（3.10）留给下一个会话
- 全局搜索（3.11）和批量操作（3.12）也留给下一个会话
