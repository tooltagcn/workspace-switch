import type { SymlinkPlatform } from './platform.js';

export const linuxSymlink: SymlinkPlatform = {
  platform: 'linux',

  createSymlink(_target: string, _linkPath: string): void {
    throw new Error('Linux symlink support is not yet implemented (P1)');
  },

  removeSymlink(_linkPath: string): boolean {
    throw new Error('Linux symlink support is not yet implemented (P1)');
  },

  isSymlink(_filePath: string): boolean {
    return false;
  },

  readSymlink(_linkPath: string): string | null {
    return null;
  },
};
