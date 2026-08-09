import fs from 'node:fs';
import path from 'node:path';

export interface BrokenSymlink {
  linkPath: string;
  target: string;
}

export function checkBrokenSymlinks(dir: string): BrokenSymlink[] {
  const broken: BrokenSymlink[] = [];

  if (!fs.existsSync(dir)) return broken;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath);
      const resolved = path.resolve(path.dirname(fullPath), target);

      if (!fs.existsSync(resolved)) {
        broken.push({ linkPath: fullPath, target });
      }
    }
  }

  return broken;
}
