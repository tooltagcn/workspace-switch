# Session 03：Phase 1B — Skill Manager

## 目标

实现 Skill CRUD、主目录初始化、4 种导入方式（本地/Git/压缩包/手工新建）、在线搜索与安装、公共校验。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 1 §1B（§1.6 - §1.13）
- `../PRD.md` → §7.2（Skill 管理）

## 关键设计决策

1. **重复处理策略**：core 层接受 `onDuplicate: 'error' | 'overwrite' | 'rename'` 参数（默认 `'error'`），CLI/GUI 负责交互选择
2. **禁止 execSync**：在线搜索（1.10）必须用 `execFile` + timeout(30s) + maxBuffer，不阻塞事件循环
3. **压缩包安全**：≤50MB / Zip Slip 拒绝 / symlink 条目拒绝
4. **Skill 校验**：必须含 SKILL.md + frontmatter(name + description ≥ 10 字符) + 不与现有同名
5. **主目录初始化**：幂等创建 skills/ mcp/ providers/ 子目录

## 任务清单

### 1.6 Skill 表 CRUD + 标签
- Skill 接口 + manager.ts：listSkills / getSkill / createSkill / updateSkill / deleteSkill
- 标签关联：addTag / removeTag / setTags
- 测试：CRUD + 标签关联 + 筛选

### 1.7 主目录初始化
- `workspace/init.ts`：initWorkspace(dataDir)
- 幂等创建 skills/ mcp/ providers/
- 测试：首次创建 + 二次幂等

### 1.8 Skill 本地/远程导入
- importSkillFromLocal / importSkillFromGit
- onDuplicate 策略参数
- Git clone --depth 1 + GitHub owner/repo 简写
- 测试：本地/Git/重复三种策略

### 1.9 Skill 压缩包导入
- importSkillFromArchive
- 安全校验：50MB / Zip Slip / symlink 条目
- 支持 .zip / .tar.gz / .tar
- 测试：正常/安全/超大

### 1.10 Skill 在线搜索
- `skill/registry.ts`：searchSkillsOnline(query)
- **禁止 execSync**，用 execFile + timeout
- 测试：mock 返回 / npx 不可用

### 1.11 Skill 在线安装
- installSkillFromRegistry
- 测试：mock npx 调用

### 1.12 Skill 手工新建
- createSkillManually：创建 SKILL.md 模板
- 测试：文件内容正确

### 1.13 Skill 公共校验
- `skill/validator.ts`：validateSkill(skillDir)
- SKILL.md + frontmatter + description ≥ 10 字符 + 不重名
- 测试：合法/缺文件/缺描述/太短/重名

## 完成标准

- [x] Skill CRUD + 标签关联查询正常
- [x] 主目录初始化幂等
- [x] 4 种导入方式均可用
- [x] 在线搜索不阻塞事件循环
- [x] 压缩包安全校验全覆盖
- [x] 所有测试通过
- [x] ../task.md §1.6-§1.13 标记 [x]

## 给下一个会话的备注

- Skill 接口会被 Phase 2 CLI 和 Phase 3 GUI 直接调用
- 在线搜索依赖 npx skills，实际测试需 mock
- 反向扫描（Phase 1F）会用到 Skill 的导入逻辑
