# Session 01：Phase 0 — 项目脚手架

## 目标

建立 monorepo 工程结构，所有工具链就绪，CI 绿灯。P0 仅针对 macOS 验证。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 0（§0.1 - §0.5）

## 关键设计决策

1. **tsconfig**：根 tsconfig **不设** `rootDir` / `outDir`，由各子包自行定义
2. **CI 矩阵**：仅 macOS（`macos-14` arm64 + `macos-13` x64），node 20/22
3. **包结构**：`packages/core`、`packages/cli`、`packages/desktop`、`packages/templates`
4. **测试框架**：vitest，globals: true，environment: node

## 任务清单

### 0.1 初始化 monorepo
- 根 `package.json`（private, scripts: test/lint/typecheck）
- `pnpm-workspace.yaml`
- 四个子包目录 + 占位文件
- devDependencies：typescript, vitest, eslint, prettier, @types/node
- `pnpm install` 无报错

### 0.2 TypeScript 基础配置
- 根 tsconfig：ES2022 / NodeNext / strict / declaration / skipLibCheck
- **不设 rootDir / outDir**，各子包自定义
- `tsc -b` 全部通过

### 0.3 ESLint + Prettier
- flat config 或 .eslintrc.cjs
- no-unused-vars: error, no-explicit-any: warn
- .prettierrc：semi, singleQuote, trailingComma all, printWidth 100

### 0.4 Vitest
- vitest.config.ts：globals true, environment node
- smoke test 通过

### 0.5 GitHub Actions CI
- macOS only（macos-14 + macos-13）
- node 20, 22
- lint → typecheck → test 全绿

## 完成标准

- [x] `pnpm install` 无报错
- [x] `pnpm lint` 零 error
- [x] `pnpm typecheck` 全通过
- [x] `pnpm test` 通过
- [x] CI 推送后绿灯
- [x] ../task.md Phase 0 所有项标记 [x]

## 产出物

完整的 monorepo 骨架，可以在本地和 CI 上跑通 lint + typecheck + test。
