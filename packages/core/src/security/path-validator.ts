import { realpathSync } from 'node:fs';
import path from 'node:path';

export class PathValidationError extends Error {
  constructor(
    public readonly targetPath: string,
    public readonly reason: string,
  ) {
    super(`Path validation failed for "${targetPath}": ${reason}`);
    this.name = 'PathValidationError';
  }
}

export function validateTargetPath(targetPath: string, allowedDirs: string[]): string {
  if (allowedDirs.length === 0) {
    throw new PathValidationError(targetPath, 'No allowed directories provided');
  }

  let resolvedTarget: string;
  try {
    resolvedTarget = realpathSync(targetPath);
  } catch {
    throw new PathValidationError(targetPath, 'Path does not exist or is not accessible');
  }

  for (const allowedDir of allowedDirs) {
    let resolvedAllowed: string;
    try {
      resolvedAllowed = realpathSync(allowedDir);
    } catch {
      continue;
    }

    const prefix = resolvedAllowed.endsWith(path.sep)
      ? resolvedAllowed
      : resolvedAllowed + path.sep;

    if (resolvedTarget === resolvedAllowed || resolvedTarget.startsWith(prefix)) {
      return resolvedTarget;
    }
  }

  throw new PathValidationError(
    targetPath,
    `Path is not within any allowed directory`,
  );
}
