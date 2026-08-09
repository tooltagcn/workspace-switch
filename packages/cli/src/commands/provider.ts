import { Command } from 'commander';
import {
  listProviders,
  createProvider,
  updateProvider,
  setApiKeyRef,
  applyProviderToAgent,
  isKeytarSupported,
  setApiKey,
} from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, outputTable, success, fail } from '../lib/output.js';

export function registerProvider(program: Command): void {
  const provider = program
    .command('provider')
    .description('Manage providers');

  provider
    .command('list')
    .description('List all providers')
    .action(async (_options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const providers = listProviders(ctx.db);
        if (ctx.json) {
          outputJson(providers);
        } else {
          outputTable(
            ['ID', 'Name', 'Base URL', 'Default Model', 'Models'],
            providers.map((p) => [
              p.id,
              p.name,
              p.baseUrl ?? '-',
              p.defaultModel ?? '-',
              p.models.join(', ') || '-',
            ]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  provider
    .command('add')
    .description('Add a provider')
    .requiredOption('--name <name>', 'Provider name')
    .option('--base-url <url>', 'Base URL')
    .option('--default-model <model>', 'Default model')
    .option('--models <models...>', 'Available models')
    .option('--api-key <key>', 'API key (stored in keychain)')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const prov = createProvider(ctx.db, {
          name: options.name,
          baseUrl: options.baseUrl ?? null,
          defaultModel: options.defaultModel ?? null,
          models: options.models ?? [],
        });

        if (options.apiKey) {
          if (isKeytarSupported()) {
            await setApiKey(prov.name, options.apiKey);
            setApiKeyRef(ctx.db, prov.id, 'keychain');
          } else {
            fail('Keychain is not available on this platform');
          }
        }

        if (ctx.json) {
          outputJson(prov);
        } else {
          success(`Provider "${prov.name}" added (${prov.id})`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  provider
    .command('edit')
    .description('Edit a provider')
    .requiredOption('--id <id>', 'Provider ID')
    .option('--name <name>', 'New name')
    .option('--base-url <url>', 'New base URL')
    .option('--default-model <model>', 'New default model')
    .option('--models <models...>', 'New models list')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const patch: Record<string, unknown> = {};
        if (options.name) patch.name = options.name;
        if (options.baseUrl) patch.baseUrl = options.baseUrl;
        if (options.defaultModel) patch.defaultModel = options.defaultModel;
        if (options.models) patch.models = options.models;

        const updated = updateProvider(ctx.db, options.id, patch);
        if (!updated) fail(`Provider not found: ${options.id}`);

        if (ctx.json) {
          outputJson(updated);
        } else {
          success(`Provider "${updated!.name}" updated`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  provider
    .command('use')
    .description('Apply a provider to an agent')
    .requiredOption('--provider <id>', 'Provider ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const result = applyProviderToAgent(ctx.db, options.provider, options.agent);
        if (ctx.json) {
          outputJson(result);
        } else {
          success(`Provider "${result.provider.name}" applied to agent ${result.agentId}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
