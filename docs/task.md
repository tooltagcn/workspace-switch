# Agent 资源管理器（Workspace Switch）— 执行任务清单

> 本文件既是任务清单，也是验收 Check 清单。每完成一项请标记 `[x]`。
> 每个 Phase 之间有依赖关系，必须按顺序执行。Phase 内标注"可并行"的模块可同时推进。
>
> **跨平台策略**：P0 优先交付 macOS（arm64 + x64），框架层做好平台抽象以便后续扩展 Windows / Linux。
> **国际化策略**：P0 完成英文界面，i18n 框架就绪后中文 P1 跟进。

---

## Phase 0：项目脚手架

> 目标：建立 monorepo 工程结构，所有工具链就绪，CI 绿灯。
> **P0 仅针对 macOS 验证**，CI 矩阵仅 macOS；框架结构预留跨平台扩展能力。

### 0.1 初始化 monorepo

- [x] 在项目根目录创建 `package.json`（`"private": true`，`"scripts": { "test": "vitest run", "lint": "eslint .", "typecheck": "tsc -b" }`）
- [x] 创建 `pnpm-workspace.yaml`，内容声明 `packages: ["packages/*"]`
- [x] 创建目录结构：
  ```
  packages/
  ├── core/          # 核心逻辑包 @ws/core
  │   ├── package.json   (name: "@ws/core", main: "dist/index.js", types: "dist/index.d.ts")
  │   ├── tsconfig.json  (extends root tsconfig, 自定义 rootDir/outDir)
  │   └── src/
  │       └── index.ts   (export {} 占位)
  ├── cli/           # CLI 工具
  │   ├── package.json   (name: "@ws/cli", bin: { "ws_cli": "dist/index.js" })
  │   ├── tsconfig.json
  │   └── src/
  │       └── index.ts   (#!/usr/bin/env node 占位)
  ├── desktop/       # Electron 桌面应用
  │   ├── package.json   (name: "@ws/desktop")
  │   ├── tsconfig.json
  │   ├── electron/
  │   │   └── main.ts    (Electron 主进程占位)
  │   ├── src/
  │   │   └── App.tsx    (React 根组件占位)
  │   ├── index.html
  │   └── vite.config.ts
  └── templates/     # Agent 模板包
      ├── package.json   (name: "@ws/templates")
      └── src/
          └── index.ts   (export {} 占位)
  ```
- [x] 在根 `package.json` 中添加 devDependencies：`typescript`, `vitest`, `eslint`, `prettier`, `@types/node`
- [x] 运行 `pnpm install`，确认无报错

### 0.2 TypeScript 基础配置

- [x] 创建根 `tsconfig.json`：
  - `compilerOptions.target`: `"ES2022"`
  - `compilerOptions.module`: `"Node16"` / `"NodeNext"`
  - `compilerOptions.moduleResolution`: `"Node16"` / `"NodeNext"`
  - `compilerOptions.strict`: `true`
  - `compilerOptions.esModuleInterop`: `true`
  - `compilerOptions.declaration`: `true`
  - `compilerOptions.skipLibCheck`: `true`
  - **不设置** `rootDir` / `outDir`（由各子包自行定义）
  - `references`: 指向各子包 tsconfig
- [x] 每个子包的 `tsconfig.json` extends 根配置，**各自定义** `rootDir: "src"` 和 `outDir: "dist"`
- [x] 确认 `pnpm -r run typecheck` 或 `tsc -b` 全部通过

### 0.3 ESLint + Prettier

- [x] 安装 `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`, `eslint-config-prettier`
- [x] 创建根 `.eslintrc.cjs` 或 `eslint.config.js`（flat config），rules 包含：
  - `@typescript-eslint/no-unused-vars`: `"error"`
  - `@typescript-eslint/no-explicit-any`: `"warn"`
- [x] 创建根 `.prettierrc`：`{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`
- [x] 确认 `pnpm lint` 零 error

### 0.4 Vitest 测试框架

- [x] 安装 `vitest` 作为 devDependency
- [x] 创建根 `vitest.config.ts`：
  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({ test: { globals: true, environment: 'node' } });
  ```
- [x] 在 `packages/core/src/` 下创建 `__tests__/smoke.test.ts`：
  ```ts
  import { describe, it, expect } from 'vitest';
  describe('smoke', () => { it('works', () => expect(1 + 1).toBe(2)); });
  ```
- [x] 确认 `pnpm test` 通过

### 0.5 GitHub Actions CI

- [x] 创建 `.github/workflows/ci.yml`：
  - 触发：push to main, pull_request
  - 矩阵策略：**`os: [macos-14, macos-13]`**（arm64 + x64），node 20, 22
  - Steps：checkout → setup-node → pnpm install → pnpm lint → pnpm typecheck → pnpm test
- [x] 确认 push 后 CI 绿灯

---

## Phase 1：Core 核心包（@ws/core）

> 目标：实现所有核心业务逻辑，不含 UI。CLI 和 Desktop 都依赖此包。
> **P0 仅实现 macOS 平台逻辑**，涉及平台差异的模块须做**平台抽象**（接口 + macOS 实现），预留 Windows / Linux 扩展接口。

### 1A：数据层 + Agent 管理（可与 1B 并行）

#### 1.1 SQLite 初始化

- [x] 在 `packages/core/` 安装依赖：`better-sqlite3`, `@types/better-sqlite3`
- [x] 创建 `packages/core/src/db/index.ts`：
  - 导出 `getDatabase(dataDir: string): Database` 工厂函数
  - 数据库文件路径：`path.join(dataDir, 'ws.db')`
  - 启用 WAL 模式：`db.pragma('journal_mode = WAL')`
  - 启用外键约束：`db.pragma('foreign_keys = ON')`
- [x] 创建 `packages/core/src/db/schema.ts`，包含 7 张表的 CREATE TABLE 语句（参照 PRD §9.2）：
  - `agent`：id(PK), name, builtin, config_dir_name, user_root, project_root, project_enabled, mcp_file, mcp_field, skill_dir, enabled, detected_at, created_at, updated_at
  - `skill`：id(PK), name(UNIQUE), description, source_path, created_at, updated_at
  - `mcp`：id(PK), name(UNIQUE), transport, command, url, args_json, env_json, description, created_at, updated_at
  - `provider`：id(PK), name(UNIQUE), base_url, api_key_ref, default_model, models_json, created_at, updated_at
  - `resource_agent`：resource_type + resource_id + agent_id(PK 复合), target_path, symlinked, applied_at
  - `tag`：id(PK), name(UNIQUE), color
  - `resource_tag`：resource_type + resource_id + tag_id(PK 复合)
- [x] 创建 `packages/core/src/db/migrate.ts`，在 `getDatabase()` 中自动执行 schema 创建（幂等：IF NOT EXISTS）
- [x] 编写测试：创建临时数据库，验证 7 张表全部存在且可写入/查询

#### 1.2 Agent 表 CRUD

- [x] 创建 `packages/core/src/agent/types.ts`，定义 `Agent` 接口：
  ```ts
  interface Agent {
    id: string;
    name: string;
    builtin: boolean;
    configDirName: string;      // 如 ".claude"
    userRoot: string;           // 用户级绝对路径
    projectRoot?: string;       // 项目级路径模板
    projectEnabled: boolean;
    mcpFile?: string;           // 如 "mcp.json"
    mcpField?: string;          // 如 "mcpServers"
    skillDir?: string;          // 如 "skills"
    enabled: boolean;
    detectedAt?: string;
    createdAt: string;
    updatedAt: string;
  }
  ```
- [x] 创建 `packages/core/src/agent/registry.ts`，导出函数：
  - `listAgents(db): Agent[]` — 查询所有 enabled=1 的 agent
  - `getAgent(db, id): Agent | null`
  - `createAgent(db, input): Agent` — 写入，builtin 默认 0
  - `updateAgent(db, id, patch): Agent` — 部分更新
  - `deleteAgent(db, id): void` — 仅 builtin=0 可删除；builtin 删除时抛出错误
- [x] 编写测试：CRUD 完整流程 + builtin 不可删除

#### 1.3 内置 Agent 模板 + 路径展开

- [x] 创建 `packages/templates/src/agents/` 目录
- [x] 创建 4 个模板 JSON 文件（MVP 核心）：
  - `claude-code.json`：configDirName=`.claude`, mcpFile=`mcp.json`, mcpField=`mcpServers`, skillDir=`skills`, projectEnabled=`true`
  - `codex.json`：**candidateDirNames=[`.agents`, `.codex`]**, mcpFile=`config.toml`, mcpField=`mcp_servers`, skillDir=`skills`, projectEnabled=`true`
  - `cursor.json`：configDirName=`.cursor`, mcpFile=`mcp.json`, mcpField=`mcpServers`, skillDir=`commands`, projectEnabled=`true`
  - `copilot.json`：configDirName=`.copilot`, mcpFile=`mcp.json`, mcpField=`mcpServers`, skillDir=`prompts`, projectEnabled=`false`
- [x] 创建 `packages/templates/src/index.ts`，导出 `builtinAgents: AgentTemplate[]`
- [x] 创建类型 `AgentTemplate` 接口，包含 `candidateDirNames?: string[]` 字段（支持多候选目录名）
- [x] 创建纯函数 `expandAgentPaths(template: AgentTemplate, userHome: string, projectRoot?: string): { userRoot: string, projectRootTemplate?: string }`
  - 用户级：`path.join(userHome, template.configDirName)`
  - 项目级：`{projectRoot}/{configDirName}` 模板字符串
- [x] 在 `@ws/core` 的 `agent/registry.ts` 中添加 `initBuiltinAgents(db, userHome)` 函数：
  - 调用 `expandAgentPaths` 派生 `userRoot` / `projectRoot`
  - 将 builtinAgents 写入数据库（builtin=1，重复时跳过）
- [x] 编写测试：模板加载正确、路径展开正确、多候选目录名处理

#### 1.4 Agent 自动检测

- [x] 在 `packages/core/src/agent/registry.ts` 添加函数 `detectAgents(db): DetectResult[]`
- [x] 逻辑：遍历数据库中所有 agent 模板，对每个 agent 的**所有候选目录名**（`candidateDirNames` 或 `configDirName`）检查路径是否存在（`fs.existsSync`）
- [x] 返回 `{ agentId, detected: boolean, path: string }[]`
- [x] 编写测试：创建临时目录模拟 `~/.claude` 存在/不存在两种情况；Codex 双候选路径检测

#### 1.5 Agent 路径校验 + 安全检查

- [x] 创建 `packages/core/src/security/path-validator.ts`
- [x] 函数 `validateTargetPath(targetPath, allowedDirs): ValidationResult`
- [x] 校验规则：
  - 拒绝包含 `../` 的路径
  - 拒绝不在 `allowedDirs` 白名单中的路径
  - **核心逻辑**：`realpath(targetPath)` 必须落在某个 `realpath(allowedDir)` 的前缀下
  - **不禁止**路径中间的符号链接（避免误伤 Homebrew / Nix 等环境）
- [x] 编写测试：正常路径通过、`../` 路径拒绝、白名单外拒绝、中间 symlink 不误伤

---

### 1B：Skill Manager（可与 1A 并行）

#### 1.6 Skill 表 CRUD + 标签

- [x] 创建 `packages/core/src/skill/types.ts`，定义 `Skill` 接口：
  ```ts
  interface Skill {
    id: string;
    name: string;
    description?: string;
    sourcePath: string;
    tags: string[];
    appliedAgents: string[];
    createdAt: string;
    updatedAt: string;
  }
  ```
- [x] 创建 `packages/core/src/skill/manager.ts`，导出函数：
  - `listSkills(db, filters?): Skill[]` — 支持按 name、tag、appliedAgent 筛选
  - `getSkill(db, id): Skill | null`
  - `createSkill(db, input): Skill`
  - `updateSkill(db, id, patch): Skill`
  - `deleteSkill(db, id): void`
  - `addTag(db, skillId, tagId): void`
  - `removeTag(db, skillId, tagId): void`
  - `setTags(db, skillId, tagIds): void` — 替换所有标签
- [x] 编写测试：CRUD + 标签关联查询 + 筛选

#### 1.7 主目录初始化

- [x] 创建 `packages/core/src/workspace/init.ts`
- [x] 函数 `initWorkspace(dataDir): WorkspaceInfo`
- [x] 创建目录结构：`{dataDir}/skills/`、`{dataDir}/mcp/`、`{dataDir}/providers/`
- [x] 幂等：已存在时跳过创建，不报错
- [x] 返回 `{ skillsDir, mcpDir, providersDir, dbPath }`
- [x] 编写测试：首次 init 创建目录；二次 init 幂等

#### 1.8 Skill 本地/远程导入

- [x] 在 `packages/core/src/skill/manager.ts` 添加函数：
  - `importSkillFromLocal(db, sourceDir, workspaceDir, options?: { onDuplicate?: 'error' | 'overwrite' | 'rename' }): Skill`
  - `importSkillFromGit(db, gitUrl, workspaceDir, options?: { onDuplicate?: 'error' | 'overwrite' | 'rename' }): Skill`
  - Git clone 支持 `--depth 1` + GitHub `owner/repo` 简写 + 移动到主目录 + 清理 tempDir
- [x] 重复处理策略（`onDuplicate` 参数，默认 `'error'`）：
  - `'error'`：抛出 `DuplicateSkillError`
  - `'overwrite'`：覆盖已有 Skill
  - `'rename'`：自动重命名（追加 `-1` 后缀）
- [x] 编写测试：本地目录导入成功、Git clone 导入成功（mock）、重复时三种策略分别验证

#### 1.9 Skill 压缩包导入

- [x] 安装依赖：`tar`（或使用 Node 内置 zlib + tar 流式解压）
- [x] 在 `packages/core/src/skill/manager.ts` 添加函数 `importSkillFromArchive(db, archivePath, workspaceDir, options?: { onDuplicate?: DuplicateStrategy }): Skill`
- [x] 安全校验：
  - 限制文件大小 ≤ 50MB（stat 检查）
  - Zip Slip 检查：拒绝 `../` 路径条目
  - 拒绝含 symlink 条目的压缩包
  - 解压到临时目录 → 复制到主目录 → 清理
- [x] 支持格式：`.zip`、`.tar.gz`、`.tar`
- [x] 编写测试：正常导入、Zip Slip 拒绝、symlink 条目拒绝、超大文件拒绝

#### 1.10 Skill 在线搜索（npx skills 集成）

- [x] 创建 `packages/core/src/skill/registry.ts`
- [x] 函数 `searchSkillsOnline(query): Promise<SearchResult[]>`
  - **禁止使用 `execSync`**，统一使用 `execFile`（`child_process` promise API）+ timeout（30s）+ maxBuffer
  - 调用 `npx skills find <query>`
  - 解析 stdout 为结构化结果
  - 捕获 npx 不存在的错误，返回友好错误消息
- [x] `SearchResult` 接口：`{ name, author, description, downloads, rating, stars, lastUpdated }`
- [x] 编写测试：mock execFile 模拟返回结果；npx 不可用时返回 error

#### 1.11 Skill 在线安装

- [x] 在 `packages/core/src/skill/manager.ts` 添加函数 `installSkillFromRegistry(db, source, workspaceDir): Skill`
  - 调用 `npx skills add {source}`（不传 `--agent`）
  - 移动到 `{workspaceDir}/skills/{name}/`
  - 写入元数据
- [x] 编写测试：mock npx 调用，验证文件正确移动

#### 1.12 Skill 手工新建

- [x] 在 `packages/core/src/skill/manager.ts` 添加函数 `createSkillManually(db, name, description, workspaceDir): Skill`
  - 创建 `{workspaceDir}/skills/{name}/SKILL.md` 模板（含 frontmatter：name、description）
- [x] 编写测试：文件内容正确

#### 1.13 Skill 公共校验

- [x] 创建 `packages/core/src/skill/validator.ts`
- [x] 函数 `validateSkill(skillDir): ValidationResult`
- [x] 校验规则：必须含 `SKILL.md`；frontmatter 必须有 `name` + `description`；description 非空且 ≥ 10 字符；不与主目录现有 Skill 同名
- [x] 返回 `{ valid: boolean, errors: string[] }`
- [x] 编写测试：合法通过、缺文件失败、缺 description 失败、太短失败、重名失败

---

### 1C：MCP Manager

#### 1.14 MCP 表 CRUD + 标签

- [x] 创建 `packages/core/src/mcp/types.ts`，定义 `McpServer` 接口：
  ```ts
  interface McpServer {
    id: string;
    name: string;
    transport: 'stdio' | 'sse' | 'http';
    command?: string;
    url?: string;
    args?: string[];
    env?: Record<string, string>;
    description?: string;
    tags: string[];
    appliedAgents: string[];
    createdAt: string;
    updatedAt: string;
  }
  ```
- [x] 创建 `packages/core/src/mcp/manager.ts`，导出 CRUD 函数：`listMcpServers`、`getMcpServer`、`createMcpServer`、`updateMcpServer`、`deleteMcpServer`
- [x] 编写测试

#### 1.15 WS Schema 定义 + 校验

- [x] 创建 `packages/core/src/mcp/schema.ts`
- [x] 定义 `WsMcpSchema` 类型（PRD §9.3）
- [x] 函数 `validateWsSchema(data): ValidationResult`：name 必填；transport 必须 stdio/sse/http；stdio 必须有 command；sse/http 必须有 url
- [x] 编写测试

#### 1.16 MCP 主目录存储

- [x] 在 `packages/core/src/mcp/manager.ts` 添加函数：
  - `saveMcpToWorkspace(db, mcp, workspaceDir): void` — 写入 `{workspaceDir}/mcp/{name}.json`
  - `loadMcpFromWorkspace(workspaceDir, name): WsMcpSchema`
  - `listMcpFromWorkspace(workspaceDir): WsMcpSchema[]`
- [x] 编写测试：写入 → 读取 → 内容一致

#### 1.17 MCP 应用到 Agent（模板渲染）

- [x] 安装依赖：`handlebars`
- [x] 创建 `packages/core/src/mcp/renderer.ts`
- [x] 函数 `renderMcpForAgent(mcp: WsMcpSchema, agentTemplate: AgentTemplate): RenderedMcp`
- [x] Agent 模板须声明 `targetFormat`：`'json-map' | 'toml-table'`（用于渲染策略分发）
- [x] 各 Agent 格式渲染：
  - **Claude Code**（json-map）：`{ "mcpServers": { "{name}": { "command": "...", "args": [...], "env": { "KEY": "${env:KEY}" } } } }`
  - **Codex**（toml-table）：TOML `[mcp_servers.{name}]` + `[mcp_servers.{name}.env]`
  - **Cursor**（json-map）：同 Claude Code 格式
  - **其他 Agent**：基于 `targetFormat` + `mcpField` 渲染；未声明 format 时 fallback json-map
- [x] env 变量转换：`"env:GITHUB_TOKEN"` → 按 Agent 格式转换
- [x] 编写测试：每个 Agent 模板至少一个渲染快照测试

#### 1.18 MCP 合并写盘策略

- [x] 在 `packages/core/src/mcp/manager.ts` 添加函数 `applyMcpToAgent(db, mcpId, agentId, options?: { strict?: boolean }): ApplyResult`
- [x] 合并模式（默认）：保留非 MCP 内容，按 server name 合并 MCP 区块
- [x] 严格模式：MCP 区块完全替换
- [x] 写入前先"预演"（渲染不写盘，返回 diff）
- [x] 实际写盘：渲染 → 写入临时文件 → rename（原子写入）
- [x] **DB + 文件原子一致性**：
  - 使用 SQLite transaction 包住 DB 改动
  - 文件侧保留 before 内容（内存）
  - 若 DB commit 失败，将 before 内容写回（同样 temp → rename）
  - 原子边界：**单个 (resource, agent) 要么全成功，要么全回滚**
- [x] 编写测试

#### 1.19 MCP diff 预览

- [x] 在 `packages/core/src/mcp/manager.ts` 添加函数 `previewMcpApply(mcpId, agentId): { before, after, diff }`
- [x] 使用 unified diff 格式
- [x] 编写测试

#### 1.20 MCP 写盘失败回滚

- [x] 写盘流程：读原文件 → 渲染新内容 → 写临时文件 `{target}.ws.tmp` → rename → 失败时删除临时文件，保留原文件
- [x] 编写测试：模拟写入失败，验证原文件未被修改

---

### 1D：Provider Manager（P1，可与 1A-1C 并行）

#### 1.21 Provider 表 CRUD

- [x] 创建 `packages/core/src/provider/types.ts`，定义 `Provider` 接口（name, baseUrl, apiKeyRef, defaultModel, models, appliedAgents）
- [x] 创建 `packages/core/src/provider/manager.ts`，导出 CRUD 函数
- [x] 编写测试

#### 1.22 API Key 安全存储（keytar 集成）

- [x] 安装依赖：`keytar`
- [x] 创建 `packages/core/src/provider/keychain.ts`
- [x] 函数：`setApiKey(service, account, pw)`、`getApiKey(service, account)`、`deleteApiKey(service, account)`
- [x] 服务名约定：`workspace-switch:{providerName}`
- [x] SQLite `api_key_ref` 只存引用名，不存明文
- [x] **P0 仅在 macOS 验证**；其他平台 graceful degradation（返回 `PlatformNotSupportedError`）
- [x] 编写测试：macOS 验证读写删除；不支持时优雅降级

#### 1.23 Provider 应用到 Agent

- [x] 在 `packages/core/src/provider/manager.ts` 添加函数 `applyProviderToAgent(db, providerId, agentId): ApplyResult`
- [x] 应用前展示当前 provider 信息
- [x] 编写测试

---

### 1E：跨切面能力

#### 1.24 Sync Engine（平台抽象 + symlink 管理）

- [x] 创建 `packages/core/src/sync/platform.ts`，定义平台抽象接口：
  ```ts
  interface SymlinkPlatform {
    createSymlink(source: string, target: string): Promise<SymlinkResult>;
    removeSymlink(target: string): Promise<void>;
  }
  ```
- [x] 创建 `packages/core/src/sync/symlink.ts`，导出平台分发函数 `getSymlinkImpl(): SymlinkPlatform`
  - `process.platform === 'darwin'` → 返回 macOS 实现
  - `process.platform === 'win32'` → 返回 Windows stub（P0 抛 `PlatformNotSupportedError`）
  - `process.platform === 'linux'` → 返回 Linux stub（P0 抛 `PlatformNotSupportedError`）
- [x] 创建 `packages/core/src/sync/symlink-darwin.ts`（P0 实现）：
  - `createSymlink`：`fs.symlink(source, target, 'dir')`
  - `removeSymlink`：`fs.unlink`（symlink）/ `fs.rm({ recursive: true })`（copy）
  - `checkBrokenSymlinks(workspaceDir, agentsDir): BrokenLink[]` — 扫描断链
- [x] 创建 `packages/core/src/sync/symlink-win32.ts`（P1 stub）：
  - `createSymlink`：先尝试 `fs.symlink('junction')`，EPERM 时 fallback `fs.cp`
- [x] 创建 `packages/core/src/sync/symlink-linux.ts`（P1 stub）
- [x] 编写测试：macOS symlink 创建/删除、断链检测、平台分发逻辑

#### 1.25 标签字典

- [x] 创建 `packages/core/src/tag/manager.ts`
- [x] 函数：`listTags`、`createTag`、`renameTag`、`mergeTags`（迁移 resource_tag 关联后删除 source）、`deleteTag`
- [x] 编写测试：CRUD + 重命名 + 合并

#### 1.26 全文搜索（FlexSearch）

- [x] 安装依赖：`flexsearch`
- [x] 创建 `packages/core/src/search/index.ts`
- [x] 对 Skill、MCP、Provider 建立索引（name + description）
- [x] 函数 `searchAll(db, query): SearchHit[]` — 按 score 降序
- [x] 性能要求：< 200ms（1000 条数据）
- [x] 编写测试：中文命中、英文命中、空结果
- [x] **P1**：拼音索引（使用 `pinyin-pro` 对 name/description 生成拼音字段，纳入索引）

#### 1.27 写操作互斥锁

- [x] 安装依赖：`proper-lockfile`
- [x] 创建 `packages/core/src/lock/index.ts`
- [x] 函数 `withLock(resourcePath, fn): Promise<T>` — 30s 超时自动释放
- [x] 锁层级定义：
  - workspace 全局锁（用于迁移类操作）
  - 单文件锁（用于 apply 操作）
  - 批量操作使用串行队列（避免死锁）
- [x] 所有写盘操作调用此函数
- [x] 编写测试：并发写入串行执行

#### 1.28 i18n 国际化框架

- [x] 安装依赖：`i18next`
- [x] 创建 `packages/core/src/i18n/index.ts`：
  - 初始化 i18next，默认语言 `en`
  - 支持语言资源文件加载
- [x] 创建 `packages/core/src/i18n/locales/en.json`：包含所有 core 层用户可见文案（错误消息、校验提示等）
- [x] 创建 `packages/core/src/i18n/locales/zh.json`：P1 占位（空对象或基础翻译）
- [x] 所有 core 层抛出的用户可见文案使用 `t('key')` 调用
- [x] 编写测试：语言资源加载正确、默认英文、文案无硬编码

#### 1.29 主目录完整性校验

- [x] 创建 `packages/core/src/workspace/integrity.ts`
- [x] 函数 `verifyWorkspaceIntegrity(dataDir): IntegrityResult`
  - 检查必要目录是否存在（`skills/`、`mcp/`、`providers/`）
  - 检查 DB 文件是否可读
  - 对关键文件计算 checksum 并比对（检测意外篡改）
- [x] 在 `initWorkspace` 和 CLI/GUI 启动时调用
- [x] 返回 `{ valid: boolean, missing: string[], corrupted: string[] }`
- [x] 编写测试：正常环境通过、目录缺失报错、DB 损坏报错

#### 1.30 Plugin System 接口定义

- [x] 创建 `packages/core/src/plugin/types.ts`，定义 `AgentTemplatePlugin` 接口：
  ```ts
  interface AgentTemplatePlugin {
    name: string;
    version: string;
    apiVersion: string;       // 版本兼容声明，如 "1.x"
    templates: AgentTemplate[];
  }
  ```
- [x] 插件协议规范：
  - 包名约定：`ws-plugin-*` 前缀或含 `ws-plugin.json` manifest
  - 版本兼容：`apiVersion` 必须与 core 主版本匹配
  - 安全边界：插件只提供模板数据，不执行任意代码
- [x] 创建 `packages/core/src/plugin/loader.ts`，函数 `loadPlugins(pluginPaths): AgentTemplatePlugin[]`
  - 校验 `apiVersion` 兼容性
  - 校验模板格式
- [x] 编写测试：合法加载、版本不兼容拒绝、格式校验失败

---

### 1F：反向扫描（Reverse Scan）

> 初始化完成后，用户已有的 Skill / MCP 散落在各 Agent 目录中。反向扫描将它们发现并纳入主目录（唯一可信源）。

#### 1.31 反向扫描核心类型与工具

- [x] 创建 `packages/core/src/scan/types.ts`：
  ```ts
  type ScanMode = 'agents' | 'home' | 'full';

  interface ScannedSkill {
    name: string;
    sourcePath: string;         // Agent 目录中的实际路径
    agentId?: string;           // 来源 Agent（agents 模式已知）
    agentName?: string;
    status: 'new' | 'conflict' | 'synced';
    diff?: string;              // conflict 时的内容 diff
    selected: boolean;          // 默认选中状态
  }

  interface ScannedMcp {
    name: string;
    sourcePath: string;
    agentId?: string;
    agentName?: string;
    parsed: WsMcpSchema;        // 解析为 WS Schema 格式
    status: 'new' | 'conflict' | 'synced';
    fieldDiff?: Record<string, { before: unknown, after: unknown }>;  // 字段级 diff
    selected: boolean;
  }

  interface DiscoveredFolder {
    path: string;               // 如 ~/.claude
    name: string;               // 如 '.claude'
    matchedTemplate?: string;   // 匹配到的 Agent 模板名
    hasSkills: boolean;
    hasMcp: boolean;
  }

  interface ReverseScanResult {
    skills: ScannedSkill[];
    mcps: ScannedMcp[];
    scannedAt: string;
    summary: { newCount: number, conflictCount: number, syncedCount: number };
  }
  ```

#### 1.32 按已配置 Agent 目录扫描

- [x] 创建 `packages/core/src/scan/agent-scanner.ts`
- [x] 函数 `scanSkillsFromAgents(db, workspaceDir): ScannedSkill[]`：
  - 遍历数据库中所有 enabled Agent
  - 对每个 Agent，扫描其 `skillDir` 子目录下的所有 Skill 目录
  - 跳过 symlink（已指向主目录的不重复扫描）
  - 与主目录 `skills/` 对比：
    - 主目录不存在同名 → `status: 'new'`, `selected: true`
    - 同名但内容不同（比较 SKILL.md 或目录 hash）→ `status: 'conflict'`, `selected: false`, 生成 diff
    - 同名且一致 → `status: 'synced'`（结果中过滤掉，不展示）
- [x] 函数 `scanMcpsFromAgents(db, workspaceDir): ScannedMcp[]`：
  - 遍历所有 enabled Agent
  - 读取每个 Agent 的 MCP 配置文件（根据 `mcpFile` + `mcpField` 定位）
  - 解析为 WS Schema 格式（反向渲染：从 Agent 格式 → WS Schema）
  - 与主目录 `mcp/` 对比：
    - 主目录不存在同名 → `status: 'new'`, `selected: true`
    - 同名但配置不同（command/args/env 逐项对比）→ `status: 'conflict'`, `selected: false`, 生成 fieldDiff
    - 同名且一致 → `status: 'synced'`
- [x] 编写测试：
  - 模拟 Agent 目录有 3 个 Skill（1 新、1 冲突、1 已同步）→ 结果正确
  - 模拟 Agent MCP 文件有 2 个 Server（1 新、1 冲突）→ 结果正确
  - 空 Agent 目录 → 空结果

#### 1.33 按用户根目录隐藏文件夹扫描

- [x] 创建 `packages/core/src/scan/home-scanner.ts`
- [x] 函数 `scanHomeHiddenFolders(userHome, templates: AgentTemplate[]): DiscoveredFolder[]`：
  - 读取 `userHome` 下所有 `.` 开头的目录（`fs.readdir` + 过滤 `.` 前缀）
  - 对每个目录，检查是否匹配已知 Agent 模板的 `configDirName` 或 `candidateDirNames`
  - 检查目录下是否含 skill 子目录 / MCP 配置文件
  - 返回发现列表（含匹配模板信息）
- [x] 函数 `scanSkillsFromFolders(folders: DiscoveredFolder[], workspaceDir): ScannedSkill[]`：
  - 对用户选中的 folders，扫描其 skill 子目录
  - 对比逻辑同 1.32
- [x] 函数 `scanMcpsFromFolders(folders: DiscoveredFolder[], templates: AgentTemplate[], workspaceDir): ScannedMcp[]`：
  - 对用户选中的 folders，根据匹配的 Agent 模板解析 MCP 文件
  - 对比逻辑同 1.32
- [x] 编写测试：
  - 模拟 `~/` 下有 `.claude`、`.cursor`、`.unknown` → 正确识别并匹配模板
  - 无隐藏目录 → 空结果
  - 隐藏目录无 skill/mcp → `hasSkills: false, hasMcp: false`

#### 1.34 反向扫描导入（复制到可信源，不创建 symlink）

- [x] 创建 `packages/core/src/scan/importer.ts`
- [x] 函数 `importScannedSkills(db, selected: ScannedSkill[], workspaceDir): ImportResult`：
  - 将选中的 Skill **复制到** `{workspaceDir}/skills/{name}/`（建立可信源副本）
  - 写入 SQLite（skill 表 + resource_agent 表），`sourcePath` 记录可信源路径，`symlinked = 0`
  - **不删除 Agent 原始文件、不创建 symlink**——Agent 继续使用自己的本地副本
  - 冲突项根据策略（overwrite / rename / skip）处理
  - 返回 `{ imported: number, skipped: number, errors: string[] }`
- [x] 函数 `importScannedMcps(db, selected: ScannedMcp[], workspaceDir): ImportResult`：
  - 将选中的 MCP **写入** `{workspaceDir}/mcp/{name}.json`（WS Schema 格式，建立可信源副本）
  - 写入 SQLite（mcp 表 + resource_agent 表）
  - **不修改 Agent 原始配置文件**
- [x] 编写测试：
  - 导入后可信源有副本 + Agent 原始文件未变
  - 冲突 overwrite 策略验证
  - 批量导入部分失败不影响其他

#### 1.35 逐 Agent 同步（反向扫描后的整合操作）

> 反向扫描只完成"发现 + 注册"。本任务实现**逐 Agent 的整合同步**，将已注册的资源纳入可信源模式。

- [x] 创建 `packages/core/src/sync/agent-sync.ts`
- [x] 函数 `syncSkillToWorkspace(db, skillId, agentId, workspaceDir): SyncResult`：
  - 检查可信源 `{workspaceDir}/skills/{name}/` 是否已有文件
  - 若**没有**：将 Agent 目录中的原始文件复制到可信源
  - 若**已有**：比较内容，冲突时按策略处理（overwrite / skip）
  - 删除 Agent 目录中的原始文件（或目录）
  - 在 Agent 目录创建 symlink 指向可信源
  - 更新 `resource_agent` 表的 `symlinked` 字段
- [x] 函数 `syncMcpToWorkspace(db, mcpId, agentId, workspaceDir): SyncResult`：
  - 检查可信源 `{workspaceDir}/mcp/{name}.json` 是否已有
  - 若**没有**：将当前 Agent 的 MCP 配置解析为 WS Schema 写入可信源
  - 若**已有**：比较配置，冲突时按策略处理
  - 从可信源渲染为目标 Agent 格式，覆盖 Agent 的 MCP 配置文件
- [x] 函数 `syncAgentAll(db, agentId, workspaceDir): SyncResult`：
  - 对指定 Agent 的所有已注册 Skill 和 MCP 逐一执行上述同步
  - 单项失败不影响其他
- [x] 编写测试：
  - Skill：可信源无 → 从 Agent 复制后建 symlink
  - Skill：可信源有 → 删 Agent 本地 + 建 symlink
  - MCP：可信源无 → 从 Agent 解析写入可信源后渲染覆盖
  - MCP：可信源有 → 从可信源渲染覆盖 Agent
  - 批量同步单项失败不影响其他

---

## Phase 2：CLI 工具（@ws/cli）

> 依赖 Phase 1。目标：所有 CLI 命令可运行，支持 `--json`。
> **P0 仅在 macOS 验证**。

### 2.1 Commander.js 框架搭建

- [x] 安装依赖：`commander`
- [x] `packages/cli/src/index.ts`：`#!/usr/bin/env node`，创建 program，注册子命令组（agent/skill/mcp/provider），全局选项 `--json`、`--verbose`、`--data-dir <path>`（默认 `~/.workspace_switch`）
- [x] `ws_cli --help` 输出完整帮助
- [x] `ws_cli --version` 输出版本号

### 2.2 `ws_cli init`

- [x] 创建 `packages/cli/src/commands/init.ts`
- [x] 调用 `initWorkspace()` + `initBuiltinAgents()` + `verifyWorkspaceIntegrity()`
- [x] 成功输出提示（非 --json）；`--json` 输出 `{ success, path, agents }`
- [x] 重复 init 幂等

### 2.3 `ws_cli agent` 子命令

- [x] 创建 `packages/cli/src/commands/agent.ts`
- [x] `agent list`：表格输出 name/configDir/userRoot/status；`--json` 支持
- [x] `agent add --name <name> --config-dir <dir> [--mcp-file] [--mcp-field] [--skill-dir]`：自动推断 + 匹配模板 + 写入
- [x] `agent edit <id> [--name] [--config-dir] ...`：部分更新
- [x] `agent remove <id>`：builtin 拒绝；非 builtin 软删除；可选 `--clean-symlinks`
- [x] `agent detect`：扫描检测结果

### 2.4 `ws_cli skill` 子命令

- [x] 创建 `packages/cli/src/commands/skill.ts`
- [x] `skill list [--tag] [--agent]`：表格 + `--json`
- [x] `skill add <source> [--name] [--on-duplicate error|overwrite|rename]`：自动判断本地/Git/压缩包 + 重复策略（默认交互选择）
- [x] `skill edit <id>`：打开 `$EDITOR` 或 `--content <text>`
- [x] `skill remove <id>`：确认删除
- [x] `skill apply <id> --agent <agentId>`：创建 symlink + 已存在时交互选择
- [x] `skill unapply <id> --agent <agentId>`：删除 symlink
- [x] `skill sync [--mode agents|home|full]`：反向扫描 Skill（两步操作）
  - **Step 1 扫描 + 注册**：
    - `--mode agents`（默认）：按已配置 Agent 目录扫描
    - `--mode home`：扫描 `~/` 下隐藏文件夹 → 列出供用户选择（支持搜索过滤）→ 扫描选中目录
    - `--mode full`：全量扫描（agents + home）
    - 结果分三列展示：🟢 新发现（默认选中）、🔴 冲突（默认不选中，展示 diff）、已同步（跳过）
    - 用户确认后**复制到可信源**（建立副本），不删 Agent 文件、不建 symlink
  - **Step 2 逐 Agent 同步**（注册后提示）：
    - 列出受影响的 Agent，用户选择要同步的 Agent
    - 对选中 Agent：检查可信源 → 没有则复制 → 删本地 → 建 symlink
- [x] `skill tag <id> [--add <tag>] [--remove <tag>]`
- [x] `skill search <keyword>`：在线搜索
- [x] `skill install <source> [-f]`：在线安装，`-f` 强制覆盖

### 2.5 `ws_cli mcp` 子命令

- [x] 创建 `packages/cli/src/commands/mcp.ts`
- [x] `mcp list [--tag] [--agent]`：表格 + `--json`
- [x] `mcp add --name --transport --command [--env KEY=VALUE]`：写入主目录
- [x] `mcp edit <id> [--field <value>]`
- [x] `mcp remove <id>`：默认仅 Agent 端，`--also-workspace` 同时删主目录
- [x] `mcp apply <id> --agent <agentId> [--strict]`：展示 diff → 确认 → 写盘
- [x] `mcp unapply <id> --agent <agentId>`
- [x] `mcp sync [--mode agents|home|full]`：反向扫描 MCP（两步操作）
  - **Step 1 扫描 + 导入**：三种扫描模式同 `skill sync`，解析各 Agent MCP 配置文件为 WS Schema，用户确认后**写入可信源**（建立副本），不修改 Agent 配置
  - **Step 2 逐 Agent 同步**：对选中 Agent，检查可信源 → 没有则从 Agent 解析写入 → 从可信源渲染覆盖 Agent 配置
  - 结果展示：🟢 新发现（默认选中）、🔴 冲突（默认不选中，展示字段级 diff）、已同步（跳过）
- [x] `mcp check`（P1）：MCP Server ping

### 2.6 `ws_cli provider` 子命令（P1）

- [x] 创建 `packages/cli/src/commands/provider.ts`
- [x] `provider list / add / edit / use`：完整 CRUD + 切换

### 2.7 `ws_cli search <keyword>`

- [x] 创建 `packages/cli/src/commands/search.ts`
- [x] 跨 Skill/MCP/Provider 搜索 + `--json`

### 2.8 `ws_cli doctor`

- [x] 创建 `packages/cli/src/commands/doctor.ts`
- [x] 检查：Node 版本、symlink 权限、**主目录完整性（调用 verifyWorkspaceIntegrity）**、Agent 路径可达性、SQLite 读写、keytar 可用
- [x] 彩色诊断报告（PASS/FAIL/WARN）+ `--json`

---

## Phase 3：Electron 桌面 GUI（@ws/desktop）

> 可与 Phase 2 并行。依赖 Phase 1。
> **P0 仅构建 macOS 版本**。

### 3.1 Electron + React + Vite 脚手架

- [ ] 安装依赖：`electron`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `electron-builder`
- [ ] `vite.config.ts`：React 插件，build 输出 `dist/renderer`
- [ ] `electron/main.ts`：创建 BrowserWindow，开发加载 `localhost:5173`，生产加载 `file://`
- [ ] `src/App.tsx`：根组件
- [ ] `pnpm dev` 启动桌面窗口

### 3.2 IPC 桥接层

- [ ] `electron/ipc.ts`：`ipcMain.handle()` 注册 agent/skill/mcp/provider/tag/search/workspace/doctor 全部 channel，每个调用对应 `@ws/core` 函数
- [ ] `electron/preload.ts`：`contextBridge.exposeInMainWorld('electron', { ipcRenderer })`
- [ ] `src/lib/ipc.ts`（渲染进程侧）：类型安全的 `api` 对象，每个方法 `invoke<T>(channel, ...args)`
- [ ] **长操作处理**：核心 IO 操作（搜索、批量 apply、npx 调用）走 worker thread，避免阻塞主进程 UI

### 3.3 UI 基础设施

- [ ] 安装：`shadcn/ui`（CLI 安装）、`tailwindcss`, `postcss`, `autoprefixer`
- [ ] 安装 shadcn 组件：Button, Input, Dialog, Tabs, Badge, Table, Card, Toast, Command, Select, Checkbox, DropdownMenu, Progress
- [ ] 安装：`zustand`、`react-router-dom`
- [ ] 创建 `src/stores/`：agentStore, skillStore, mcpStore, providerStore, uiStore
- [ ] 创建 `src/components/Layout.tsx`：侧边栏 + 顶部栏 + 主内容区
- [ ] 路由配置：`/` Dashboard、`/agents`、`/skills`、`/mcps`、`/providers`、`/settings`

### 3.3b i18n 接入（渲染层）

- [ ] 安装 `react-i18next`
- [ ] 创建 `src/i18n/index.ts`，初始化 i18next（与 core 层共享 `en.json` 资源 + 扩展 UI 层文案）
- [ ] 创建 `src/i18n/locales/en.json`：包含所有 UI 文案（英文）
- [ ] 创建 `src/i18n/locales/zh.json`：P1 占位
- [ ] 所有 UI 文案使用 `t()` 函数，**禁止硬编码字符串**

### 3.4 仪表盘页

- [x] 创建 `src/pages/Dashboard.tsx`
- [x] `WorkspaceHealthCard`：主目录路径 + Skill/MCP/Provider 总数 + 完整性状态
- [x] `AgentSyncStatus`：每个 Agent 同步状态（已应用数量 vs 主目录数量）
- [x] `QuickActions`：快捷入口按钮，包含「反向扫描 Skill」「反向扫描 MCP」入口
- [x] `ReverseScanSummary`：显示最近一次扫描结果摘要（新发现 N 个 / 冲突 M 个）

### 3.5 Agent 管理页

- [x] 创建 `src/pages/Agents.tsx`
- [x] `AgentList`：表格（名称、图标、配置目录、路径、状态徽章）
- [x] `AgentDetail`：右侧面板（所有字段 + 已应用 Skill/MCP 列表）
- [x] `AgentAddDialog`：表单（名称、配置目录名、MCP 文件名、MCP 字段名、Skill 子目录）+ 粘贴路径自动反推
- [x] `AgentEditDialog`

### 3.6 Skill 库页

- [x] 创建 `src/pages/Skills.tsx`
- [x] `SkillList`：表格（名称、描述、标签、已应用 Agent、文件数、修改时间）+ 筛选（标签/名字/已应用 Agent）+ 排序
- [x] `SkillDetail`：SKILL.md 预览 + 标签管理 + 已应用列表 + 取消应用
- [x] `SkillAddWizard`（Tabs）：
  - Tab 1 "本地导入"：目录选择器
  - Tab 2 "压缩包上传"：拖拽区域
  - Tab 3 "在线搜索"：搜索框 + 结果列表 + 安装
  - Tab 4 "手工新建"：名称 + 描述
- [x] `TagManager`：标签列表（重命名/合并/删除）+ 批量打标签
- [x] `ReverseScanWizard`（Skill 反向扫描向导）：
  - Step 1 选择扫描方式：「按已配置 Agent」/「按根目录隐藏文件夹」/「全量扫描」
  - Step 1.5（home 模式）：列出发现的隐藏文件夹，支持搜索过滤 + Checkbox 选择
  - Step 2 结果列表：
    - 🟢 新发现：默认 ✅ 选中，绿色标记
    - 🔴 冲突：默认 ❌ 不选中，红色/橙色重点标记，展开可看 diff
    - 已同步：不显示（可切换"显示全部"查看）
  - Step 3 导入确认：用户勾选后**复制到可信源**（建立副本），Agent 文件保持原位、不建 symlink
  - Step 4 逐 Agent 同步（可选）：列出受影响的 Agent → 用户选择 → 对选中 Agent 执行整合（复制到可信源 + 删本地 + 建 symlink）→ 进度条 + 结果汇总

### 3.7 MCP 库页

- [x] 创建 `src/pages/Mcps.tsx`
- [x] `McpList`：表格（名称、transport、command/url、env 脱敏、健康状态）
- [x] `McpDetail`：配置展示 + env 展开 + 已应用列表
- [x] `McpAddDialog`：表单（名称、transport、command、url、args 动态列表、env key-value、描述、标签）
- [x] `McpEditDialog`
- [x] `McpReverseScanWizard`（MCP 反向扫描向导）：
  - 结构与 `ReverseScanWizard`（Skill）相同
  - Step 2 冲突项展示字段级 diff（command / args / env 逐项对比）
  - Step 3 导入确认：**写入可信源**（建立副本），不动 Agent 配置
  - Step 4 逐 Agent 同步（可选）：从可信源渲染覆盖 Agent 的 MCP 配置 → 进度条 + 结果汇总

### 3.8 应用到 Agent 交互

- [x] 创建 `src/components/ApplyToAgentDialog.tsx`（Skill/MCP 复用）
- [x] 流程：选中资源 → Agent 多选 → diff 预览（MCP） → 确认 → 进度条 → 结果汇总
- [x] 单个 Agent 失败不影响其他

### 3.9 Provider 库页（P1）

- [x] 创建 `src/pages/Providers.tsx`
- [x] `ProviderList` + `ProviderDetail` + `ProviderAddDialog`（apiKey 输入 + Keychain 存储）+ `ProviderSwitchDialog`

### 3.10 设置页

- [x] 创建 `src/pages/Settings.tsx`
- [x] 主目录路径、主题（light/dark/system）、语言（中/英，P0 英文可用，中文灰显 P1）、API Key 管理
- [x] 所有文案使用 `t()` 函数

### 3.11 全局搜索（⌘+K）

- [x] `src/components/GlobalSearch.tsx`：快捷键打开 Command 弹窗，debounced 200ms 搜索，按类型分组展示，点击跳转

### 3.12 批量操作 UI

- [x] Skill/MCP 列表多选 Checkbox + 底部浮动操作栏（批量打标签/应用/取消应用/删除 + 确认弹窗）

---

## Phase 4：Agent 模板包（@ws/templates）

> 可与 Phase 2/3 并行。

### 4.1 模板格式规范

- [x] `packages/templates/src/schema.ts`：`AgentTemplate` 接口 + JSON Schema 校验
- [x] 接口包含：`configDirName`、`candidateDirNames?`、`mcpFile`、`mcpField`、`skillDir`、`projectEnabled`、**`targetFormat`**（`'json-map' | 'toml-table'`）

### 4.2 补齐模板

- [x] 补齐以下 JSON 模板（configDirName）：
  - `opencode.json`（`.opencode`）、`openclaude.json`（`.openclaude`）、`hermes.json`（`.hermes`）
  - `qwen-code.json`（`.qwen`）、`gemini-cli.json`（`.gemini`）、`qoder.json`（`.qoder`）
  - `factory.json`（`.factory`）、`droid.json`（`.droid`）、`aider.json`（`.aider`）
- [x] 加上 Phase 1.3 的 4 个，共 13+ 模板
- [x] 更新 `packages/templates/src/index.ts` 导出完整列表

### 4.3 模板渲染快照测试

- [x] 每个 Agent 模板编写 MCP 渲染快照测试（`toMatchSnapshot()`）
- [x] 快照文件在 `packages/core/src/mcp/__snapshots__/`

---

## Phase 5：质量保障 + 发布（P0 macOS）

### 5.1 Core 包单元测试覆盖率

- [ ] 运行 `pnpm --filter @ws/core test -- --coverage`
- [ ] 覆盖率 ≥ 80%（branches, functions, lines, statements）
- [ ] 补充低覆盖模块测试

### 5.2 CLI E2E 测试

- [ ] 创建 `packages/cli/e2e/`
- [ ] 测试流程：init → agent add → skill add → skill apply → 验证 symlink → skill unapply → 验证删除
- [ ] 所有关键路径通过

### 5.3 Desktop E2E 测试（P1）

- [ ] 安装 `playwright`
- [ ] 测试：Dashboard 渲染、Agent 列表加载、Skill/MCP 库加载、设置页加载、⌘K 搜索

### 5.4 性能基准测试

- [ ] 创建 `packages/core/src/__benchmarks__/`
- [ ] 基准项：
  - `searchAll` 1000 条数据 < 200ms
  - symlink 创建/删除 < 50ms
  - 10 个 Agent MCP apply < 1s
- [ ] 集成到 CI（允许偶尔波动，超阈值 warn 不 fail）

### 5.5 macOS 构建打包

- [ ] `electron-builder`：macOS dmg + 签名（arm64 + x64 双架构 universal binary）
- [ ] CLI 构建：macOS binary（pkg 或类似方案）
- [ ] 根 scripts：`build:desktop:mac`、`build:cli:mac`、`package:desktop:mac`、`package:cli:mac`

### 5.6 `ws_cli doctor` 完整诊断

- [ ] 正常环境全 PASS
- [ ] 模拟异常（删主目录、断 symlink）检出 FAIL/WARN

### 5.7 文档

- [ ] `README.md`：简介、安装、快速开始、支持 Agent 列表、贡献指南
- [ ] `CHANGELOG.md`：Keep a Changelog 格式

### 5.8 版本发布

- [ ] 版本号 `0.1.0-beta.1`，所有子包一致
- [ ] Git tag + CI 自动构建 + GitHub Releases

---

## Phase 6：跨平台扩展（P1）

> 依赖 Phase 5 完成。将 Windows / Linux 支持补齐。

### 6.1 平台抽象层扩展

- [ ] 实现 `symlink-win32.ts`：EPERM → fallback `fs.cp`（copy mode）
- [ ] 实现 `symlink-linux.ts`：同 macOS 逻辑（Linux symlink 行为与 macOS 一致）
- [ ] keytar Windows / Linux 验证
- [ ] 编写测试：各平台 symlink 创建/删除/降级

### 6.2 Windows CI + 测试

- [ ] CI 添加 Windows 矩阵（`windows-latest`）
- [ ] 测试：EPERM → fallback 到 fs.cp → copy mode 功能正常
- [ ] 验证 `better-sqlite3`、`keytar` 在 Windows 下编译与签名

### 6.3 Linux CI + 测试

- [ ] CI 添加 Linux 矩阵（`ubuntu-latest`）
- [ ] 测试：symlink 功能正常
- [ ] 验证 `better-sqlite3`、`keytar` 在 Linux 下编译

### 6.4 Windows / Linux 打包

- [ ] `electron-builder`：Windows nsis、Linux AppImage + deb
- [ ] CLI 构建：Windows exe + Linux binary
- [ ] 根 scripts：`build:desktop:win`、`build:desktop:linux`

### 6.5 中文 i18n

- [ ] 完成 `zh.json` 资源文件（core + UI 全量翻译）
- [ ] 验证语言切换功能
- [ ] 编写测试：切换到中文后所有文案正确显示

### 6.6 拼音搜索

- [ ] 安装 `pinyin-pro`
- [ ] 在 FlexSearch 索引中为 name/description 生成拼音索引字段
- [ ] 搜索时同时匹配原文 + 拼音
- [ ] 编写测试：输入拼音能命中中文结果

### 6.7 A11y 验收

- [ ] 集成 `axe-core` 到 Desktop 测试
- [ ] 键盘可达性：所有交互可通过 Tab/Enter/Escape 完成
- [ ] 颜色对比度 ≥ 4.5:1
- [ ] 屏幕阅读器基础兼容

---

## 附录：PRD 设计问题待确认

| # | 问题 | 状态 |
|---|------|------|
| 1 | MVP 要求 12+ 模板 → 建议先做 4 核心，其余社区贡献 | [x] 已采纳（Phase 1.3 先做 4 核心，Phase 4.2 补齐） |
| 2 | "项目级配置目录"抽象 → 建议 MVP 只做用户级 | [x] 已采纳（P0 只做用户级，项目级 P1） |
| 3 | 依赖 `npx skills` → 需降级策略 | [x] 已设计（1.10 返回友好错误） |
| 4 | "不做历史备份" → 建议删前建 `_trash/` 快照 | [ ] P1 再议 |
| 5 | Electron + CLI 双形态 → CLI 优先，GUI 跟进 | [x] 已采纳（Phase 2 先于 3） |
| 6 | i18n → P0 先完成英文，中文 P1 跟进 | [x] 已采纳 |
| 7 | 跨平台 → P0 先完成 macOS，Windows/Linux P1 | [x] 已采纳 |
| 8 | tags.json → 统一以 SQLite 为唯一事实源 | [x] 已采纳（删除 tags.json） |
