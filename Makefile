.PHONY: dev deploy

dev:
	pnpm --filter @ws/core build && pnpm --filter @ws/desktop electron:dev

deploy:
	pnpm --filter @ws/core build && pnpm --filter @ws/desktop electron:build
