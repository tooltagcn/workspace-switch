import { app, BrowserWindow } from 'electron';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers, cleanupIpc } from './ipc.js';
import { initLogger, logger } from '@ws/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // 默认不打开 DevTools，需要调试时用 WS_OPEN_DEVTOOLS=1 make dev（或 Cmd+Option+I）
    if (process.env.WS_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools();
    }
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  const dataDir = path.join(os.homedir(), '.workspace_switch');
  initLogger(dataDir);
  logger.info('Electron app ready, registering IPC handlers...');
  registerIpcHandlers();
  logger.info('IPC handlers registered, creating window...');
  createWindow();
  logger.info('Window created');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupIpc();
    app.quit();
  }
});
