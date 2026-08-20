import { describe, it, expect, vi } from 'vitest';
import { isKeytarSupported, getServiceName } from '../provider/keychain.js';

describe('Keychain', () => {
  it('getServiceName returns correct format', () => {
    expect(getServiceName('openai')).toBe('workspace-switch:openai');
    expect(getServiceName('anthropic')).toBe('workspace-switch:anthropic');
  });

  it('isKeytarSupported returns boolean', () => {
    const result = isKeytarSupported();
    expect(typeof result).toBe('boolean');
  });
});

describe('Keychain (mocked)', () => {
  it('setApiKey throws on unsupported platform', async () => {
    vi.mock('node:os', () => ({ platform: () => 'sunos' }));

    const { setApiKey } = await import('../provider/keychain.js');
    await expect(setApiKey('test', 'key')).rejects.toThrow('not available');

    vi.restoreAllMocks();
  });
});
