import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPlugins, validatePlugin } from '../plugin/loader.js';
import type { AgentTemplatePlugin } from '../plugin/types.js';

describe('Plugin Loader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-plugin-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty for non-existent directory', () => {
    const result = loadPlugins(path.join(tmpDir, 'nope'));
    expect(result.loaded).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('loads a valid plugin', () => {
    const pluginDir = path.join(tmpDir, 'ws-plugin-test');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.json'),
      JSON.stringify({
        name: 'test-plugin',
        version: '1.0.0',
        apiVersion: 1,
        templates: [{ agentType: 'copilot', format: 'json-map', content: '{}' }],
      }),
    );

    const result = loadPlugins(tmpDir);
    expect(result.loaded).toHaveLength(1);
    expect(result.loaded[0].name).toBe('test-plugin');
    expect(result.errors).toEqual([]);
  });

  it('skips directories without ws-plugin- prefix', () => {
    fs.mkdirSync(path.join(tmpDir, 'other-dir'));
    const result = loadPlugins(tmpDir);
    expect(result.loaded).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('reports missing manifest', () => {
    fs.mkdirSync(path.join(tmpDir, 'ws-plugin-bad'));
    const result = loadPlugins(tmpDir);
    expect(result.loaded).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Missing plugin.json');
  });

  it('reports incompatible apiVersion', () => {
    const pluginDir = path.join(tmpDir, 'ws-plugin-old');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.json'),
      JSON.stringify({
        name: 'old-plugin',
        version: '1.0.0',
        apiVersion: 99,
        templates: [],
      }),
    );

    const result = loadPlugins(tmpDir);
    expect(result.loaded).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('apiVersion');
  });

  it('reports invalid manifest fields', () => {
    const pluginDir = path.join(tmpDir, 'ws-plugin-invalid');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({ name: 'x' }));

    const result = loadPlugins(tmpDir);
    expect(result.loaded).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it('reports malformed JSON', () => {
    const pluginDir = path.join(tmpDir, 'ws-plugin-broken');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), '{bad json');

    const result = loadPlugins(tmpDir);
    expect(result.loaded).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Failed to load');
  });
});

describe('validatePlugin', () => {
  it('validates a correct plugin', () => {
    const plugin: AgentTemplatePlugin = {
      name: 'test',
      version: '1.0.0',
      apiVersion: 1,
      templates: [],
    };
    expect(validatePlugin(plugin)).toBe(true);
  });

  it('rejects null', () => {
    expect(validatePlugin(null)).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(validatePlugin({ name: 'test' })).toBe(false);
  });

  it('rejects non-array templates', () => {
    expect(
      validatePlugin({ name: 'test', version: '1.0.0', apiVersion: 1, templates: 'nope' }),
    ).toBe(false);
  });
});
