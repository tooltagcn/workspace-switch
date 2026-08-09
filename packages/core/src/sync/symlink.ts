import { platform } from 'node:os';
import type { SymlinkPlatform } from './platform.js';
import { darwinSymlink } from './symlink-darwin.js';
import { win32Symlink } from './symlink-win32.js';
import { linuxSymlink } from './symlink-linux.js';

const implementations: Record<string, SymlinkPlatform> = {
  darwin: darwinSymlink,
  win32: win32Symlink,
  linux: linuxSymlink,
};

export function getSymlinkImpl(): SymlinkPlatform {
  const current = platform();
  const impl = implementations[current];
  if (!impl) {
    throw new Error(`Unsupported platform: ${current}`);
  }
  return impl;
}
