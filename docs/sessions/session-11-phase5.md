# Session 11：Phase 5 — 质量保障 + macOS 发布

## 目标

确保代码质量（覆盖率 ≥ 80%）、E2E 测试通过、性能基准达标、macOS 打包发布。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 5（§5.1 - §5.8）
- `../PRD.md` → §8.1（性能）、§14（风险评估）

## 前置依赖

- Phase 1-4 全部完成
- Phase 2 CLI 可运行
- Phase 3 GUI 可运行

## 关键设计决策

1. **覆盖率 ≥ 80%**：branches / functions / lines / statements
2. **性能基准**：searchAll 1000 条 < 200ms / symlink < 50ms / 10 Agent MCP apply < 1s
3. **macOS only**：P0 只构建 macOS dmg（universal binary: arm64 + x64）
4. **CLI 打包**：macOS binary

## 任务清单

### 5.1 Core 包单元测试覆盖率
- 运行覆盖率报告
- 补充低覆盖模块测试
- 目标 ≥ 80%

### 5.2 CLI E2E 测试
- packages/cli/e2e/
- 流程：init → agent add → skill add → skill apply → 验证 symlink → skill unapply → 验证删除
- 所有关键路径通过

### 5.3 Desktop E2E 测试（P1）
- playwright
- Dashboard 渲染、Agent 列表、Skill/MCP 库、设置页、⌘K 搜索

### 5.4 性能基准测试
- packages/core/src/__benchmarks__/
- searchAll 1000 条 < 200ms
- symlink 创建/删除 < 50ms
- 10 Agent MCP apply < 1s
- 集成到 CI（超阈值 warn 不 fail）

### 5.5 macOS 构建打包
- electron-builder：macOS dmg + 签名（universal binary）
- CLI：macOS binary
- scripts：build:desktop:mac / build:cli:mac / package:desktop:mac / package:cli:mac

### 5.6 ws_cli doctor 完整诊断
- 正常环境全 PASS
- 模拟异常（删主目录、断 symlink）检出 FAIL/WARN

### 5.7 文档
- README.md：简介、安装、快速开始、支持 Agent 列表、贡献指南
- CHANGELOG.md：Keep a Changelog 格式

### 5.8 版本发布
- 版本号 0.1.0-beta.1，所有子包一致
- Git tag + CI 自动构建 + GitHub Releases

## 完成标准

- [ ] Core 覆盖率 ≥ 80%
- [ ] CLI E2E 全通过
- [ ] 性能基准达标
- [ ] macOS dmg 可安装运行
- [ ] CLI binary 可运行
- [ ] doctor 正常诊断
- [ ] README + CHANGELOG 就位
- [ ] ../task.md Phase 5 所有项标记 [x]

## P0 完成！

至此 P0 交付完成：
- ✅ Core 核心包（含反向扫描）
- ✅ CLI 工具
- ✅ Electron 桌面 GUI
- ✅ 13+ Agent 模板
- ✅ macOS 打包发布

Phase 6（跨平台 P1）可后续独立进行。
