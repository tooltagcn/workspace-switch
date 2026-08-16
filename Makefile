.PHONY: dev dev-devtools deploy

dev:
	pnpm --filter @ws/core build && pnpm --filter @ws/desktop electron:dev

# 与 dev 相同，但启动时自动打开 DevTools
dev-devtools:
	WS_OPEN_DEVTOOLS=1 pnpm --filter @ws/core build && pnpm --filter @ws/desktop electron:dev

deploy:
	pnpm --filter @ws/core build && pnpm --filter @ws/desktop electron:build
