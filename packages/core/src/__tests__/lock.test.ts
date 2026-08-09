import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withLock, LockQueue } from '../lock/index.js';

describe('Lock', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-lock-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('withLock executes the function', async () => {
    const lockFile = path.join(tmpDir, 'test.lock');
    const result = await withLock(lockFile, async () => 42);
    expect(result).toBe(42);
  });

  it('withLock creates the file if it does not exist', async () => {
    const lockFile = path.join(tmpDir, 'new.lock');
    await withLock(lockFile, async () => {
      expect(fs.existsSync(lockFile)).toBe(true);
    });
  });

  it('withLock serializes concurrent access', async () => {
    const lockFile = path.join(tmpDir, 'serial.lock');
    const order: number[] = [];

    await Promise.all([
      withLock(lockFile, async () => {
        await new Promise((r) => setTimeout(r, 50));
        order.push(1);
      }),
      withLock(lockFile, async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(2);
      }),
    ]);

    expect(order).toEqual([1, 2]);
  });

  it('withLock releases on error', async () => {
    const lockFile = path.join(tmpDir, 'error.lock');

    await expect(
      withLock(lockFile, async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');

    const result = await withLock(lockFile, async () => 'ok');
    expect(result).toBe('ok');
  });
});

describe('LockQueue', () => {
  it('executes tasks serially', async () => {
    const queue = new LockQueue();
    const order: number[] = [];

    await Promise.all([
      queue.enqueue(async () => {
        await new Promise((r) => setTimeout(r, 30));
        order.push(1);
      }),
      queue.enqueue(async () => {
        order.push(2);
      }),
    ]);

    expect(order).toEqual([1, 2]);
  });

  it('returns the result of the task', async () => {
    const queue = new LockQueue();
    const result = await queue.enqueue(async () => 'hello');
    expect(result).toBe('hello');
  });

  it('propagates errors', async () => {
    const queue = new LockQueue();
    await expect(
      queue.enqueue(async () => {
        throw new Error('queue fail');
      }),
    ).rejects.toThrow('queue fail');
  });
});
