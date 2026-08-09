# Framework Conventions

> Coding agents: read before writing code.

- **TS strict, ESM, ES2022**. Code & commits in English. User strings via `t()` (i18n), always update both `en.json` + `zh.json`.
- **Imports**: relative paths must include `.js` extension; cross-package via `@ws/core` etc.
- **Naming**: types PascalCase, vars/functions camelCase, DB columns snake_case, files kebab-case, components PascalCase, i18n keys camelCase dot-nested.
- **DB**: functions take `db: Database.Database` as first param (no singleton). Row mapping via internal `rowToX()`. IDs = `randomUUID()`. WAL mode, FK on.
- **Errors**: sync → `throw new Error()`; async → result object with `success`/`error`. IPC handlers: try/catch + `console.error` + rethrow.
- **File layout**: one dir per domain (`agent/`, `skill/`, `project/`…). Each has `types.ts` + `manager.ts`|`registry.ts`. Platform code behind interfaces.
- **Security**: path whitelist before writes. Credentials in Keychain, SQLite stores references only. No `execSync`; use `execFile` + timeout.
- **Platform**: P0 macOS only (arm64 + x64). Platform-specific modules need interface + macOS impl + stub.
- **Testing**: vitest. Files: `<feature>.test.ts` in `__tests__/`. Validate: `lint` → `typecheck` → `test`.
- **State (Desktop)**: Zustand, one store per domain. Components call store actions, never `api.*` directly.
- **Components**: function components + hooks. Tailwind CSS. react-router-dom v6. All strings via `t()`.
