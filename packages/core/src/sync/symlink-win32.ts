import fs from 'node:fs';
import type { SymlinkPlatform } from './platform.js';

// On Windows, a true directory symlink requires Developer Mode or admin
// privileges. A *junction* (reparse point) achieves the same "one source of
// truth" effect for directories without elevated privileges, and is detected
// by fs.lstatSync().isSymbolicLink() just like a symlink. File targets use the
// 'file' type which also works without elevation.
export const win32Symlink: SymlinkPlatform = {
  platform: 'win32',

  createSymlink(target: string, linkPath: string): void {
    if (fs.existsSync(linkPath)) {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else {
        throw new Error(`Path exists and is not a symlink: ${linkPath}`);
      }
    }

    const targetStat = fs.statSync(target, { throwIfNoEntry: false });
    const type: 'junction' | 'file' = targetStat && targetStat.isDirectory() ? 'junction' : 'file';
    fs.symlinkSync(target, linkPath, type);
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
