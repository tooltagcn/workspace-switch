# Session 05：Phase 1D + 1E — Provider + 跨切面能力

## 目标

实现 Provider 管理（P1，可并行）、以及所有跨切面能力：symlink 平台抽象、标签字典、全文搜索、互斥锁、i18n 框架、主目录完整性校验、Plugin 系统。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 1 §1D（§1.21-§1.23）+ §1E（§1.24-§1.30）
- `../PRD.md` → §7.4（Provider）、§8.1-§8.7（非功能需求）

## 关键设计决策

1. **Provider / keytar**：P0 仅 macOS 验证，其他平台 graceful degradation
2. **平台抽象**：`SymlinkPlatform` 接口 + darwin 实现 + win32/linux stub（P1 实现）
3. **搜索**：FlexSearch，P0 支持中英文，拼音 P1
4. **锁层级**：workspace 全局锁（迁移）> 单文件锁（apply）> 批量操作串行队列
5. **i18n**：i18next，默认 en，所有用户可见文案用 `t()`
6. **完整性校验**：启动时校验主目录目录结构 + DB 可读
7. **Plugin**：包名约定 `ws-plugin-*`，apiVersion 版本兼容，只提供模板数据不执行代码

## 任务清单

### 1D：Provider Manager（P1）

#### 1.21 Provider 表 CRUD
- Provider 接口 + manager.ts：CRUD
- 测试

#### 1.22 API Key 安全存储
- keytar 集成：setApiKey / getApiKey / deleteApiKey
- 服务名：`workspace-switch:{providerName}`
- SQLite 只存引用名
- macOS 验证，其他平台 graceful degradation
- 测试

#### 1.23 Provider 应用到 Agent
- applyProviderToAgent：展示当前 provider 信息
- 测试

### 1E：跨切面能力

#### 1.24 Sync Engine（平台抽象）
- `sync/platform.ts`：SymlinkPlatform 接口
- `sync/symlink.ts`：平台分发 getSymlinkImpl()
- `sync/symlink-darwin.ts`：P0 实现（symlink 'dir'）
- `sync/symlink-win32.ts`：P1 stub
- `sync/symlink-linux.ts`：P1 stub
- checkBrokenSymlinks
- 测试

#### 1.25 标签字典
- `tag/manager.ts`：listTags / createTag / renameTag / mergeTags / deleteTag
- 测试

#### 1.26 全文搜索
- FlexSearch 索引 name + description
- searchAll < 200ms（1000 条）
- P0 中英文，P1 拼音
- 测试

#### 1.27 写操作互斥锁
- proper-lockfile + withLock
- 锁层级定义
- 测试

#### 1.28 i18n 国际化框架
- i18next 初始化，默认 en
- en.json + zh.json（P1 占位）
- 所有 core 层文案用 t()
- 测试

#### 1.29 主目录完整性校验
- verifyWorkspaceIntegrity
- 检查目录存在 + DB 可读 + checksum
- 测试

#### 1.30 Plugin System
- AgentTemplatePlugin 接口（name, version, apiVersion, templates）
- 包名约定 + 版本兼容 + 安全边界
- loadPlugins
- 测试

## 完成标准

- [x] Provider CRUD + keytar macOS 可用
- [x] symlink 平台抽象就绪，darwin 实现可用
- [x] 标签 CRUD + 合并正常
- [x] 搜索中英文命中 < 200ms
- [x] 锁机制并发安全
- [x] i18n 框架就绪，core 层无硬编码文案
- [x] 完整性校验覆盖目录/DB
- [x] Plugin loader 可加载合法插件
- [x] 所有测试通过
- [x] ../task.md §1.21-§1.30 标记 [x]

## 给下一个会话的备注

- Phase 1F（反向扫描）依赖本会话的 symlink 平台抽象 + 搜索 + 锁
- Phase 2 CLI 依赖所有 Phase 1 模块
- Provider 是 P1 但接口已就位，CLI/GUI 可先留空
