# Session 04：Phase 1C — MCP Manager

## 目标

实现 MCP CRUD、WS Schema 校验、主目录存储、模板渲染（多 Agent 格式）、合并写盘（含原子事务）、diff 预览、失败回滚。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 1 §1C（§1.14 - §1.20）
- `../PRD.md` → §7.3（MCP 管理）、§9.3（WS Schema）

## 关键设计决策

1. **模板渲染**：Agent 模板须声明 `targetFormat: 'json-map' | 'toml-table'`，渲染器据此分发
2. **env 变量转换**：`"env:GITHUB_TOKEN"` → Claude Code: `${env:GITHUB_TOKEN}` / Codex TOML: `"${GITHUB_TOKEN}"`
3. **合并模式**：默认保留非 MCP 内容，按 server name 合并；严格模式完全替换
4. **DB + 文件原子一致性**：
   - SQLite transaction 包 DB 改动
   - 文件侧保留 before 内容（内存）
   - DB commit 失败 → 将 before 写回（temp → rename）
   - 原子边界：**单个 (resource, agent) 要么全成功，要么全回滚**
5. **原子写盘**：写临时文件 → rename，失败删临时文件
6. **diff 预览**：unified diff 格式，渲染不写盘

## 任务清单

### 1.14 MCP 表 CRUD + 标签
- McpServer 接口 + manager.ts：CRUD
- 测试

### 1.15 WS Schema 定义 + 校验
- `mcp/schema.ts`：WsMcpSchema 类型
- validateWsSchema：name 必填 / transport 合法 / stdio 需 command / sse|http 需 url
- 测试

### 1.16 MCP 主目录存储
- saveMcpToWorkspace / loadMcpFromWorkspace / listMcpFromWorkspace
- 写入 `{workspaceDir}/mcp/{name}.json`
- 测试：写→读→一致

### 1.17 MCP 应用到 Agent（模板渲染）
- `mcp/renderer.ts`：renderMcpForAgent(mcp, agentTemplate)
- Claude Code (json-map) / Codex (toml-table) / Cursor (json-map)
- 其他 Agent 基于 targetFormat + mcpField fallback json-map
- env 变量转换
- 测试：每个模板至少一个快照测试

### 1.18 MCP 合并写盘策略
- applyMcpToAgent：合并模式 / 严格模式
- 预演（渲染不写盘，返回 diff）
- **DB + 文件原子一致性**（见上方设计决策）
- 测试

### 1.19 MCP diff 预览
- previewMcpApply：{ before, after, diff }
- unified diff 格式
- 测试

### 1.20 MCP 写盘失败回滚
- 读原文件 → 渲染 → 写临时文件 → rename → 失败删临时保留原文件
- 测试：模拟写入失败

## 完成标准

- [x] MCP CRUD 正常
- [x] WS Schema 校验覆盖所有规则
- [x] 主目录存储读写一致
- [x] 4 个 Agent 模板渲染正确（快照测试）
- [x] 合并/严格两种模式正确
- [x] DB + 文件原子性：DB 失败时文件回滚
- [x] diff 预览正确
- [x] 所有测试通过
- [x] ../task.md §1.14-§1.20 标记 [x]

## 给下一个会话的备注

- 渲染器是后续反向扫描"反向渲染"（Agent 格式 → WS Schema）的基础
- 合并写盘的原子性模式会被 Provider apply 复用
- Agent 模板的 `targetFormat` 字段在 Phase 4 补齐模板时需要每个都声明
