# Session 10：Phase 3C — GUI 剩余页面 + Phase 4 模板

## 目标

完成 GUI 剩余页面（Provider、Settings、全局搜索、批量操作）+ Phase 4 模板包。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 3 §3.9-§3.12 + Phase 4（§4.1-§4.3）
- `../PRD.md` → §7.4（Provider）、§7.7（GUI 页面）、§1.5（Agent 模板列表）

## 前置依赖

- Session 09 完成（核心业务页面）
- Phase 1D Provider Manager 完成

## 任务清单

### GUI 剩余页面

#### 3.9 Provider 库页（P1）
- ProviderList + ProviderDetail
- ProviderAddDialog：apiKey 输入 + Keychain 存储
- ProviderSwitchDialog

#### 3.10 设置页
- 主目录路径、主题（light/dark/system）、语言（中/英，P0 英文可用中文灰显）、API Key 管理
- 所有文案用 t()

#### 3.11 全局搜索（⌘+K）
- GlobalSearch.tsx：快捷键打开 Command 弹窗
- debounced 200ms 搜索
- 按类型分组展示，点击跳转

#### 3.12 批量操作 UI
- Skill/MCP 列表多选 Checkbox
- 底部浮动操作栏：批量打标签 / 应用 / 取消应用 / 删除 + 确认弹窗

### Phase 4：Agent 模板包

#### 4.1 模板格式规范
- AgentTemplate 接口 + JSON Schema 校验
- 包含 targetFormat: 'json-map' | 'toml-table'

#### 4.2 补齐模板
- 补齐 9 个模板：opencode / openclaude / hermes / qwen-code / gemini-cli / qoder / factory / droid / aider
- 加上 Phase 1.3 的 4 个，共 13+ 模板
- 更新 templates/src/index.ts 导出

#### 4.3 模板渲染快照测试
- 每个 Agent 模板一个 MCP 渲染快照测试
- 快照文件在 packages/core/src/mcp/__snapshots__/

## 完成标准

- [x] Provider 页面 CRUD + Keychain 可用
- [x] 设置页所有选项可用
- [x] ⌘K 全局搜索正常
- [x] 批量操作正常
- [x] 13+ Agent 模板全部就位
- [x] 每个模板有渲染快照测试
- [x] ../task.md §3.9-§3.12 + §4.1-§4.3 标记 [x]

## 给下一个会话的备注

- GUI 全部完成
- Phase 5（质量保障 + 发布）是最后一个 P0 阶段
- Phase 6（跨平台 P1）可以后续再做
