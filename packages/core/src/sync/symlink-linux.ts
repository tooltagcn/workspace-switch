import fs from 'node:fs';
import type { SymlinkPlatform } from './platform.js';

export const linuxSymlink: SymlinkPlatform = {
  platform: 'linux',

  createSymlink(target: string, linkPath: string): void {
    if (fs.existsSync(linkPath)) {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else {
        throw new Error(`Path exists and is not a symlink: ${linkPath}`);
      }
    }
    fs.symlinkSync(target, linkPath, 'dir');
  },

  removeSymlink(linkPath: string): boolean {
    if (!fs.existsSync(linkPath)) return false;
    const stat = fs.lstatSync(linkPath);
    if (!stat.isSymbolicLink()) {
      throw new Error(`Path is not a symlink: ${linkPath}`);
    }
    fs.unlinkSync(linkPath);
    return true;
  },

  isSymlink(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    return fs.lstatSync(filePath).isSymbolicLink();
  },

  readSymlink(linkPath: string): string | null {
    if (!fs.existsSync(linkPath)) return null;
    if (!fs.lstatSync(linkPath).isSymbolicLink()) return null;
    return fs.readlinkSync(linkPath);
  },
};
