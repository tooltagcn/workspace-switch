import fs from 'node:fs';
import path from 'node:path';
import type { AgentTemplatePlugin, LoadPluginsResult, PluginLoadError } from './types.js';
import { SUPPORTED_API_VERSION } from './types.js';

const PLUGIN_PREFIX = 'ws-plugin-';

export function loadPlugins(pluginsDir: string): LoadPluginsResult {
  const loaded: AgentTemplatePlugin[] = [];
  const errors: PluginLoadError[] = [];

  if (!fs.existsSync(pluginsDir)) {
    return { loaded, errors };
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith(PLUGIN_PREFIX)) continue;

    const pluginDir = path.join(pluginsDir, entry.name);
    const manifestPath = path.join(pluginDir, 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      errors.push({ pluginName: entry.name, reason: 'Missing plugin.json manifest' });
      continue;
    }

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw) as AgentTemplatePlugin;

      if (!manifest.name || !manifest.version || manifest.apiVersion === undefined) {
        errors.push({ pluginName: entry.name, reason: 'Invalid manifest: missing required fields' });
        continue;
      }

      if (manifest.apiVersion !== SUPPORTED_API_VERSION) {
        errors.push({
          pluginName: entry.name,
          reason: `Incompatible apiVersion: ${manifest.apiVersion} (expected ${SUPPORTED_API_VERSION})`,
        });
        continue;
      }

      if (!Array.isArray(manifest.templates)) {
        errors.push({ pluginName: entry.name, reason: 'Invalid manifest: templates must be an array' });
        continue;
      }

      loaded.push(manifest);
    } catch (err) {
      errors.push({
        pluginName: entry.name,
        reason: `Failed to load: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { loaded, errors };
}

export function validatePlugin(plugin: unknown): plugin is AgentTemplatePlugin {
  if (typeof plugin !== 'object' || plugin === null) return false;
  const p = plugin as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.version === 'string' &&
    typeof p.apiVersion === 'number' &&
    Array.isArray(p.templates)
  );
}
