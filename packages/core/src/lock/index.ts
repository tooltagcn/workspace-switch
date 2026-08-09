import properLockfile from 'proper-lockfile';
import path from 'node:path';
import fs from 'node:fs';

export type LockLevel = 'workspace' | 'file' | 'queue';

export interface LockOptions {
  retries?: number;
  stale?: number;
}

const DEFAULT_OPTIONS: Required<LockOptions> = {
  retries: 3,
  stale: 10000,
};

export async function withLock<T>(
  resourcePath: string,
  fn: () => Promise<T>,
  options?: LockOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const resolvedPath = path.resolve(resourcePath);

  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, '');
  }

  const release = await properLockfile.lock(resolvedPath, {
    retries: opts.retries,
    stale: opts.stale,
  });

  try {
    return await fn();
  } finally {
    await release();
  }
}

export class LockQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }

    this.running = false;
  }
}
