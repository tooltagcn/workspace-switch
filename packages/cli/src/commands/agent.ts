import { Command } from 'commander';
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  detectAgents,
} from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, outputTable, success, fail } from '../lib/output.js';

export function registerAgent(program: Command): void {
  const agent = program
    .command('agent')
    .description('Manage agents');

  agent
    .command('list')
    .description('List all agents')
    .action(async (_options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agents = listAgents(ctx.db);
        if (ctx.json) {
          outputJson(agents);
        } else {
          outputTable(
            ['ID', 'Name', 'Builtin', 'Enabled', 'Config Dir', 'Detected'],
            agents.map((a) => [
              a.id,
              a.name,
              String(a.builtin),
              String(a.enabled),
              a.configDirName,
              a.detectedAt ?? '-',
            ]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  agent
    .command('add')
    .description('Add a custom agent')
    .requiredOption('--name <name>', 'Agent name')
    .requiredOption('--config-dir <dir>', 'Config directory name')
    .option('--mcp-file <file>', 'MCP config file')
    .option('--mcp-field <field>', 'MCP config field')
    .option('--skill-dir <dir>', 'Skill directory name')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agent = createAgent(ctx.db, {
          name: options.name,
          configDirName: options.configDir,
          mcpFile: options.mcpFile ?? null,
          mcpField: options.mcpField ?? null,
          skillDir: options.skillDir ?? null,
        });
        if (ctx.json) {
          outputJson(agent);
        } else {
          success(`Agent "${agent.name}" created (${agent.id})`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  agent
    .command('edit')
    .description('Edit an agent')
    .requiredOption('--id <id>', 'Agent ID')
    .option('--name <name>', 'New name')
    .option('--config-dir <dir>', 'New config directory')
    .option('--mcp-file <file>', 'MCP config file')
    .option('--mcp-field <field>', 'MCP config field')
    .option('--skill-dir <dir>', 'Skill directory')
    .option('--enable', 'Enable agent')
    .option('--disable', 'Disable agent')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const patch: Record<string, unknown> = {};
        if (options.name) patch.name = options.name;
        if (options.configDir) patch.configDirName = options.configDir;
        if (options.mcpFile !== undefined) patch.mcpFile = options.mcpFile;
        if (options.mcpField !== undefined) patch.mcpField = options.mcpField;
        if (options.skillDir !== undefined) patch.skillDir = options.skillDir;
        if (options.enable) patch.enabled = true;
        if (options.disable) patch.enabled = false;

        const updated = updateAgent(ctx.db, options.id, patch);
        if (!updated) fail(`Agent not found: ${options.id}`);

        if (ctx.json) {
          outputJson(updated);
        } else {
          success(`Agent "${updated!.name}" updated`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  agent
    .command('remove')
    .description('Remove a custom agent')
    .requiredOption('--id <id>', 'Agent ID')
    .option('--clean-symlinks', 'Remove symlinks created by this agent')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const existing = getAgent(ctx.db, options.id);
        if (!existing) fail(`Agent not found: ${options.id}`);

        const deleted = deleteAgent(ctx.db, options.id);
        if (!deleted) fail(`Failed to delete agent: ${options.id}`);

        if (ctx.json) {
          outputJson({ success: true, id: options.id });
        } else {
          success(`Agent "${existing!.name}" removed`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  agent
    .command('detect')
    .description('Detect installed agents on the system')
    .action(async (_options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const results = detectAgents(ctx.db);
        if (ctx.json) {
          outputJson(results);
        } else {
          outputTable(
            ['Agent ID', 'Detected', 'Directory'],
            results.map((r) => [
              r.agentId,
              r.detected ? 'Yes' : 'No',
              r.detectedDir ?? '-',
            ]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
