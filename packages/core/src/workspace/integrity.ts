import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface IntegrityResult {
  valid: boolean;
  errors: string[];
  dataDir: string;
}

const REQUIRED_DIRS = ['skills', 'mcp', 'providers'] as const;

export function verifyWorkspaceIntegrity(dataDir: string): IntegrityResult {
  const resolved = path.resolve(dataDir);
  const errors: string[] = [];

  if (!fs.existsSync(resolved)) {
    errors.push(`Data directory does not exist: ${resolved}`);
    return { valid: false, errors, dataDir: resolved };
  }

  for (const sub of REQUIRED_DIRS) {
    const dir = path.join(resolved, sub);
    if (!fs.existsSync(dir)) {
      errors.push(`Missing required directory: ${dir}`);
    } else if (!fs.statSync(dir).isDirectory()) {
      errors.push(`Path is not a directory: ${dir}`);
    }
  }

  const dbPath = path.join(resolved, 'workspace.db');
  if (fs.existsSync(dbPath)) {
    try {
      const content = fs.readFileSync(dbPath);
      if (content.length === 0) {
        errors.push(`Database file is empty: ${dbPath}`);
      }
    } catch {
      errors.push(`Database is not readable: ${dbPath}`);
    }
  }

  const checksumPath = path.join(resolved, '.checksum');
  if (fs.existsSync(checksumPath)) {
    try {
      const stored = fs.readFileSync(checksumPath, 'utf-8').trim();
      const current = computeChecksum(resolved);
      if (stored !== current) {
        errors.push('Checksum mismatch: workspace data may have been modified externally');
      }
    } catch {
      errors.push('Failed to verify checksum');
    }
  }

  return { valid: errors.length === 0, errors, dataDir: resolved };
}

export function computeChecksum(dataDir: string): string {
  const hash = crypto.createHash('sha256');
  const resolved = path.resolve(dataDir);

  for (const sub of REQUIRED_DIRS) {
    const dir = path.join(resolved, sub);
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir).sort();
    for (const entry of entries) {
      const filePath = path.join(dir, entry);
      const stat = fs.lstatSync(filePath);
      if (stat.isFile()) {
        hash.update(filePath);
        hash.update(fs.readFileSync(filePath));
      }
    }
  }

  return hash.digest('hex');
}

export function writeChecksum(dataDir: string): void {
  const resolved = path.resolve(dataDir);
  const checksum = computeChecksum(resolved);
  fs.writeFileSync(path.join(resolved, '.checksum'), checksum, 'utf-8');
}
