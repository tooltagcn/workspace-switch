# Feature Rules

> Cross-module business rules. Check before designing or coding any new feature.
> For technical conventions see [`framework.md`](./framework.md).

---

## FR-001: Inactive Agent 全局不可见

Agent 设为 inactive (`enabled = 0`) 后，**除 Agent 管理主列表外，所有场景不可见、不可选**。

- `listAgents()` → `enabled = 1` only（默认入口）
- `listAllAgents()` → all（仅 Agents 页面用）
- 项目相关 SQL JOIN agent 表时 → `AND a.enabled = 1`
- IPC `project:applySkill` → 校验主表 + `project_agent` 双层 enabled

**新增任何查询/展示 Agent 的功能时**：非 Agent 管理页面 → 必须过滤 inactive。
