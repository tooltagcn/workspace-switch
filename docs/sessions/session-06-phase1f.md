# Session 06：Phase 1F — 反向扫描

## 目标

实现反向扫描核心能力：3 种扫描模式、结果分类（新发现/冲突/已同步）、导入到可信源（复制但不创建 symlink）、逐 Agent 同步（整合到 symlink 模式）。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 1 §1F（§1.31 - §1.35）
- `../PRD.md` → §6.2.3（反向扫描 Skill）、§6.2.6（反向扫描 MCP）、§7.2.5、§7.3.7

## 关键设计决策

1. **反向扫描 ≠ 立即 symlink**：
   - Step 1：扫描 → 复制到可信源 → 写 DB（Agent 原始文件不动）
   - Step 2：用户主动触发逐 Agent 同步 → 删 Agent 本地 → 建 symlink
2. **3 种扫描模式**：
   - `agents`：遍历已配置 Agent 的 skill 目录 / MCP 文件
   - `home`：扫描 `~/` 下所有隐藏目录，列出供用户选择（支持搜索），再扫描选中目录
   - `full`：agents + home 组合
3. **结果分类**：
   - `new`：主目录不存在 → 默认选中
   - `conflict`：同名但内容不同 → **重点标记，默认不选**，展示 diff
   - `synced`：已同步 → 跳过不显示
4. **MCP 反向解析**：从 Agent 格式（JSON/TOML）反向解析为 WS Schema
5. **依赖**：1.24 symlink 平台抽象、1.26 搜索、1.27 锁、1.17 MCP 渲染器

## 任务清单

### 1.31 反向扫描核心类型与工具
- `scan/types.ts`：ScanMode / ScannedSkill / ScannedMcp / DiscoveredFolder / ReverseScanResult
- 测试：类型定义正确

### 1.32 按已配置 Agent 目录扫描
- `scan/agent-scanner.ts`
- scanSkillsFromAgents：遍历 enabled Agent 的 skillDir，跳过 symlink
- scanMcpsFromAgents：读取 Agent MCP 配置文件，反向解析为 WS Schema
- 与主目录对比分类（new / conflict / synced）
- 测试：1 新 + 1 冲突 + 1 已同步 / 空目录

### 1.33 按用户根目录隐藏文件夹扫描
- `scan/home-scanner.ts`
- scanHomeHiddenFolders：扫描 ~/ 下 .xxx 目录，匹配 Agent 模板
- scanSkillsFromFolders / scanMcpsFromFolders：对选中文件夹扫描
- 测试：匹配模板 / 无隐藏目录 / 无 skill/mcp

### 1.34 反向扫描导入（复制到可信源，不创建 symlink）
- `scan/importer.ts`
- importScannedSkills：复制到 workspace + 写 DB，symlinked=0，不动 Agent 原始文件
- importScannedMcps：写入 workspace mcp/{name}.json + 写 DB，不动 Agent 配置
- 测试：可信源有副本 + Agent 原始文件未变

### 1.35 逐 Agent 同步（反向扫描后的整合操作）
- `sync/agent-sync.ts`
- syncSkillToWorkspace：可信源无→复制，有→比较；删 Agent 本地→建 symlink
- syncMcpToWorkspace：可信源无→从 Agent 解析写入，有→比较；渲染覆盖 Agent 配置
- syncAgentAll：批量同步单个 Agent 的所有资源，单项失败不影响其他
- 测试：可信源无/有两种情况 / 批量部分失败

## 完成标准

- [x] 3 种扫描模式均可用（agents / home / full）
- [x] 结果正确分为 new / conflict / synced
- [x] 导入后可信源有副本，Agent 原始文件不变
- [x] 逐 Agent 同步：可信源无→复制+symlink，有→删本地+symlink
- [x] MCP 同步：从可信源渲染覆盖 Agent 配置
- [x] 批量操作单项失败不影响其他
- [x] 所有测试通过
- [x] ../task.md §1.31-§1.35 标记 [x]

## 给下一个会话的备注

- Phase 1 全部完成，Phase 2（CLI）和 Phase 3（GUI）可以开始
- CLI 的 `skill sync` / `mcp sync` 命令需要调用本模块的扫描 + 导入 + 同步三步
- GUI 的 ReverseScanWizard 也需要这三步
