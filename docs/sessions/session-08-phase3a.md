# Session 08：Phase 3A — GUI 脚手架 + IPC + UI 基础设施 + i18n

## 目标

搭建 Electron + React + Vite 脚手架，实现 IPC 桥接层、UI 基础设施（shadcn/ui + 路由 + 状态管理）、i18n 接入。

## 上下文

读取以下文件获取完整任务描述：
- `../task.md` → Phase 3 §3.1 - §3.3b
- `../PRD.md` → §10（技术架构）、§11（UI/UX 原则）

## 关键设计决策

1. **Electron 架构**：主进程负责 IPC + core 调用，渲染进程纯 UI
2. **IPC 桥接**：contextBridge 暴露类型安全的 api 对象，每个 channel 对应 core 函数
3. **长操作**：核心 IO（搜索、批量 apply、npx 调用）走 worker thread，避免阻塞主进程 UI
4. **i18n**：react-i18next，与 core 层共享 en.json 资源 + 扩展 UI 层文案，所有文案用 t()
5. **状态管理**：zustand，每个领域一个 store
6. **路由**：react-router-dom，6 个主页面

## 任务清单

### 3.1 Electron + React + Vite 脚手架
- 依赖：electron, react, react-dom, vite, @vitejs/plugin-react, electron-builder
- vite.config.ts：React 插件，build 输出 dist/renderer
- electron/main.ts：BrowserWindow，开发 localhost:5173，生产 file://
- pnpm dev 启动桌面窗口

### 3.2 IPC 桥接层
- electron/ipc.ts：ipcMain.handle() 注册所有 channel
- electron/preload.ts：contextBridge.exposeInMainWorld
- src/lib/ipc.ts：类型安全 api 对象
- **长操作走 worker thread**

### 3.3 UI 基础设施
- shadcn/ui + tailwindcss + postcss + autoprefixer
- 组件：Button, Input, Dialog, Tabs, Badge, Table, Card, Toast, Command, Select, Checkbox, DropdownMenu, Progress
- zustand stores：agentStore, skillStore, mcpStore, providerStore, uiStore
- Layout.tsx：侧边栏 + 顶部栏 + 主内容区
- 路由：/ /agents /skills /mcps /providers /settings

### 3.3b i18n 接入（渲染层）
- react-i18next
- src/i18n/index.ts 初始化
- en.json：所有 UI 文案（英文）
- zh.json：P1 占位
- 所有文案用 t()，禁止硬编码

## 完成标准

- [ ] pnpm dev 启动 Electron 窗口
- [ ] IPC 双向通信正常
- [ ] shadcn/ui 组件可正常渲染
- [ ] 路由切换正常
- [ ] i18n 框架就绪，所有文案用 t()
- [ ] zustand store 结构正确
- [ ] ../task.md §3.1-§3.3b 标记 [x]

## 给下一个会话的备注

- 本会话只搭基础设施，不实现业务页面
- 下一个会话实现 Dashboard + Agent + Skill + MCP + Apply 页面
- IPC channel 定义需要与 core API 一一对应
