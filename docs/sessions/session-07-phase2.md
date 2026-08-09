# Session 07：Phase 2 — CLI 工具

## 目标

实现所有 CLI 命令，支持 `--json` 输出。CLI 是 core 的薄封装层，不包含业务逻辑。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 2（§2.1 - §2.8）
- `../PRD.md` → §7.6（CLI 命令设计）

## 关键设计决策

1. **CLI 是薄层**：所有业务逻辑在 @ws/core，CLI 只做参数解析 + 调用 core + 格式化输出
2. **全局选项**：`--json`（JSON 输出）、`--verbose`（详细日志）、`--data-dir`（默认 `~/.workspace_switch`）
3. **交互 vs 非交互**：`--json` 模式下不弹交互提示，用参数指定策略（如 `--on-duplicate error`）
4. **反向扫描**：两步操作 — Step 1 扫描+导入（复制到可信源），Step 2 逐 Agent 同步（建 symlink）
5. **doctor**：调用 verifyWorkspaceIntegrity + 各项环境检查

## 任务清单

### 2.1 Commander.js 框架搭建
- 根 index.ts：#!/usr/bin/env node
- 注册子命令组：agent / skill / mcp / provider
- 全局选项 --json / --verbose / --data-dir
- --help + --version

### 2.2 ws_cli init
- 调用 initWorkspace + initBuiltinAgents + verifyWorkspaceIntegrity
- 输出 { success, path, agents }

### 2.3 ws_cli agent
- agent list：表格 + --json
- agent add：--name --config-dir [--mcp-file] [--mcp-field] [--skill-dir]
- agent edit：部分更新
- agent remove：builtin 拒绝 + --clean-symlinks
- agent detect：扫描检测

### 2.4 ws_cli skill（含反向扫描）
- skill list [--tag] [--agent]
- skill add：自动判断来源 + --on-duplicate
- skill edit / remove
- skill apply / unapply
- **skill sync [--mode agents|home|full]**：
  - Step 1：扫描 → 展示结果（新发现/冲突/已同步）→ 用户选择 → 复制到可信源
  - Step 2：列出受影响 Agent → 用户选择 → 逐 Agent 同步（删本地+建 symlink）
- skill tag / search / install

### 2.5 ws_cli mcp（含反向扫描）
- mcp list / add / edit / remove
- mcp apply [--strict]：展示 diff → 确认 → 写盘
- mcp unapply
- **mcp sync [--mode agents|home|full]**：
  - Step 1：扫描 → 展示结果 → 用户选择 → 写入可信源
  - Step 2：逐 Agent 同步（从可信源渲染覆盖 Agent 配置）
- mcp check（P1）

### 2.6 ws_cli provider（P1）
- provider list / add / edit / use

### 2.7 ws_cli search
- 跨 Skill/MCP/Provider 搜索 + --json

### 2.8 ws_cli doctor
- 检查：Node 版本、symlink 权限、主目录完整性（verifyWorkspaceIntegrity）、Agent 路径可达、SQLite 读写、keytar 可用
- 彩色 PASS/FAIL/WARN + --json

## 完成标准

- [x] 所有命令可运行
- [x] --json 输出格式正确
- [x] skill sync / mcp sync 两步流程完整
- [x] doctor 覆盖所有检查项
- [x] E2E 流程：init → agent add → skill add → skill apply → 验证 symlink → skill unapply → 验证删除
- [x] ../task.md Phase 2 所有项标记 [x]

## 给下一个会话的备注

- CLI 完成后可以开始 Phase 3 GUI
- GUI 的 IPC 层本质上是把 CLI 的命令翻译成 IPC channel
- Phase 4（模板）可与 Phase 2/3 并行
