# Session 12：Phase 6 — 跨平台扩展（P1）

## 目标

将 macOS-only 的实现扩展到 Windows 和 Linux，完成中文 i18n、拼音搜索、A11y 验收。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 6（§6.1 - §6.7）
- `../PRD.md` → §8.2（兼容性）、§8.5（i18n）、§8.6（A11y）、§7.5.1（拼音搜索）

## 前置依赖

- Phase 5（P0 macOS 发布）完成
- Phase 1E 的平台抽象接口已定义（symlink-win32.ts / symlink-linux.ts stub）

## 任务清单

### 6.1 平台抽象层扩展
- 实现 symlink-win32.ts：EPERM → fallback fs.cp（copy mode）
- 实现 symlink-linux.ts：同 macOS 逻辑
- keytar Windows / Linux 验证
- 测试

### 6.2 Windows CI + 测试
- CI 添加 windows-latest 矩阵
- symlink fallback 功能测试
- better-sqlite3 / keytar 编译验证

### 6.3 Linux CI + 测试
- CI 添加 ubuntu-latest 矩阵
- symlink 功能测试
- better-sqlite3 / keytar 编译验证

### 6.4 Windows / Linux 打包
- electron-builder：Windows nsis + Linux AppImage + deb
- CLI：Windows exe + Linux binary
- scripts：build:desktop:win / build:desktop:linux

### 6.5 中文 i18n
- 完成 zh.json 全量翻译（core + UI）
- 语言切换功能验证
- 测试

### 6.6 拼音搜索
- 安装 pinyin-pro
- FlexSearch 索引增加拼音字段
- 搜索时同时匹配原文 + 拼音
- 测试：输入拼音命中中文结果

### 6.7 A11y 验收
- 集成 axe-core 到 Desktop 测试
- 键盘可达性：Tab / Enter / Escape
- 颜色对比度 ≥ 4.5:1
- 屏幕阅读器基础兼容

## 完成标准

- [ ] Windows / Linux CI 绿灯
- [ ] 三平台打包可用
- [ ] 中文界面完整可用
- [ ] 拼音搜索命中中文
- [ ] A11y 基础验收通过
- [ ] ../task.md Phase 6 所有项标记 [x]

## 至此 PRD 全部需求覆盖完成
