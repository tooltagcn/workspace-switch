# Session 02：Phase 1A — 数据层 + Agent 管理

## 目标

实现 SQLite 数据层、Agent CRUD、内置模板（含路径展开）、自动检测、路径安全校验。所有代码在 `packages/core/src/` 下。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 1 §1A（§1.1 - §1.5）
- `../PRD.md` → §7.1（Agent 管理）、§9.2（表结构）

## 关键设计决策

1. **SQLite**：better-sqlite3，WAL 模式，外键约束，IF NOT EXISTS 幂等建表
2. **路径展开**：纯函数 `expandAgentPaths(template, userHome, projectRoot?)` — 用户级 `{userHome}/{configDirName}`，项目级 `{projectRoot}/{configDirName}`
3. **Codex 双候选**：`candidateDirNames: [".agents", ".codex"]`，detect 时按候选逐一探测
4. **路径校验**：`realpath(target)` 必须落在 `realpath(allowedDir)` 前缀下，**不禁止**中间 symlink（避免误伤 Homebrew/Nix）
5. **builtin Agent 不可删除**

## 任务清单

### 1.1 SQLite 初始化
- `db/index.ts`：getDatabase(dataDir) 工厂，WAL + 外键
- `db/schema.ts`：7 张表（agent, skill, mcp, provider, resource_agent, tag, resource_tag）
- `db/migrate.ts`：幂等建表
- 测试：7 张表存在且可读写

### 1.2 Agent 表 CRUD
- `agent/types.ts`：Agent 接口
- `agent/registry.ts`：listAgents / getAgent / createAgent / updateAgent / deleteAgent
- builtin 不可删除
- 测试：CRUD 完整 + builtin 保护

### 1.3 内置 Agent 模板 + 路径展开
- 4 个模板 JSON：claude-code / codex（双候选）/ cursor / copilot
- `AgentTemplate` 接口含 `candidateDirNames?`
- `expandAgentPaths` 纯函数
- `initBuiltinAgents(db, userHome)`
- 测试：模板加载 + 路径展开 + 多候选

### 1.4 Agent 自动检测
- `detectAgents(db)`：遍历所有候选目录名检查存在
- 测试：存在/不存在 + Codex 双候选

### 1.5 路径校验 + 安全检查
- `security/path-validator.ts`：validateTargetPath
- realpath 前缀匹配，不禁止中间 symlink
- 测试：正常通过 / ../ 拒绝 / 白名单外拒绝 / 中间 symlink 不误伤

## 完成标准

- [x] 7 张表创建且可读写
- [x] Agent CRUD 完整 + builtin 保护
- [x] 4 个内置模板正确加载，路径展开正确
- [x] detect 支持多候选目录名
- [x] 路径校验不误伤中间 symlink
- [x] 所有测试通过
- [x] ../task.md §1.1-§1.5 标记 [x]

## 给下一个会话的备注

- 1B（Skill Manager）可与本会话并行，不依赖本会话产出
- 1C（MCP Manager）依赖本会话的 DB schema（已建好 7 张表）
- Agent 接口和模板类型会被后续所有模块引用
