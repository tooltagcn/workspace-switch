import fs from 'node:fs';
import path from 'node:path';
import { format } from 'node:util';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: '\x1b[36m',
  INFO: '\x1b[32m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
};

const RESET = '\x1b[0m';

let logFilePath: string | null = null;
let fileStream: fs.WriteStream | null = null;
let debugMode = false;
let patched = false;

const origLog = console.log.bind(console);
const origError = console.error.bind(console);
const origWarn = console.warn.bind(console);
const origDebug = console.debug.bind(console);

function formatTimestamp(): string {
  return new Date().toISOString();
}

function writeToFileLine(level: string, message: string): void {
  if (!fileStream) return;
  fileStream.write(`[${formatTimestamp()}] [${level}] ${message}\n`);
}

function writeToConsole(level: LogLevel, message: string): void {
  const color = LEVEL_COLORS[level];
  const tag = `${color}[${level}]${RESET}`;
  const fn = level === 'ERROR' ? origError : level === 'WARN' ? origWarn : origLog;
  fn(`${tag} ${message}`);
}

function log(level: LogLevel, ...args: unknown[]): void {
  if (level === 'DEBUG' && !debugMode) return;
  const message = format(...args);
  writeToConsole(level, message);
  writeToFileLine(level, message);
}

function patchConsole(): void {
  if (patched) return;
  patched = true;

  console.log = (...args: unknown[]) => {
    origLog(...args);
    writeToFileLine('INFO', format(...args));
  };

  console.error = (...args: unknown[]) => {
    origError(...args);
    writeToFileLine('ERROR', format(...args));
  };

  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    writeToFileLine('WARN', format(...args));
  };

  console.debug = (...args: unknown[]) => {
    origDebug(...args);
    writeToFileLine('DEBUG', format(...args));
  };
}

export function initLogger(dataDir: string): void {
  const logsDir = path.join(dataDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  logFilePath = path.join(logsDir, 'out.log');
  fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  patchConsole();
  log('INFO', 'Logger initialized');
}

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
  log('INFO', `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
}

export function isDebugMode(): boolean {
  return debugMode;
}

export function getLogFilePath(): string | null {
  return logFilePath;
}

export const logger = {
  debug: (...args: unknown[]) => log('DEBUG', ...args),
  info: (...args: unknown[]) => log('INFO', ...args),
  warn: (...args: unknown[]) => log('WARN', ...args),
  error: (...args: unknown[]) => log('ERROR', ...args),
};
