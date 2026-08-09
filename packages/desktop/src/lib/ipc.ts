import type { WsApi } from '../../electron/preload-types.js';

declare global {
  interface Window {
    wsApi: WsApi;
  }
}

if (!window.wsApi) {
  console.error(
    'window.wsApi is not available. Make sure you are running inside Electron (pnpm electron:dev), not a browser.'
  );
}

export const api: WsApi = window.wsApi ?? new Proxy({} as WsApi, {
  get: (_target, prop) => () => {
    throw new Error(`IPC call "${String(prop)}" failed: not running in Electron`);
  },
});
