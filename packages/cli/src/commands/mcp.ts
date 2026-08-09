import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import {
  listMcps,
  getMcp,
  createMcp,
  updateMcp,
  deleteMcp,
  saveMcpToWorkspace,
  listAgents,
  getAgent,
  getTemplate,
  applyMcpToAgent,
  previewMcpApply,
  syncMcpToWorkspace,
  scanMcpsFromAgents,
  scanHomeHiddenFolders,
  scanMcpsFromFolders,
  importScannedMcps,
  loadTemplates,
  validateWsSchema,
  checkMcpConsistency,
  fixMcpConsistency,
} from '@ws/core';
import type { McpTransport, ScannedMcp, ScanMode, WsMcpSchema } from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, outputTable, success, fail } from '../lib/output.js';

export function registerMcp(program: Command): void {
  const mcp = program
    .command('mcp')
    .description('Manage MCP servers');

  mcp
    .command('list')
    .description('List MCP servers')
    .option('--tag <tag>', 'Filter by tag')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const filter = options.tag ? { tags: [options.tag] } : undefined;
        const mcps = listMcps(ctx.db, filter);
        if (ctx.json) {
          outputJson(mcps);
        } else {
          outputTable(
            ['ID', 'Name', 'Transport', 'Command/URL', 'Tags'],
            mcps.map((m) => [
              m.id,
              m.name,
              m.transport ?? '-',
              m.command ?? m.url ?? '-',
              m.tags.join(', ') || '-',
            ]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('add')
    .description('Add an MCP server')
    .requiredOption('--name <name>', 'Server name')
    .option('--transport <type>', 'Transport: stdio|sse|http', 'stdio')
    .option('--command <cmd>', 'Command (for stdio)')
    .option('--url <url>', 'URL (for sse/http)')
    .option('--args <args...>', 'Command arguments')
    .option('--env <pairs...>', 'Environment variables (KEY=VALUE)')
    .option('--description <desc>', 'Description')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const env: Record<string, string> = {};
        if (options.env) {
          for (const pair of options.env) {
            const eqIdx = pair.indexOf('=');
            if (eqIdx > 0) {
              env[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
            }
          }
        }

        const server = createMcp(ctx.db, {
          name: options.name,
          transport: options.transport as McpTransport,
          command: options.command ?? null,
          url: options.url ?? null,
          args: options.args ?? [],
          env,
          description: options.description ?? null,
        });

        // Also save to workspace trusted source
        const schema: WsMcpSchema = {
          name: server.name,
          transport: server.transport ?? 'stdio',
        };
        if (server.command) schema.command = server.command;
        if (server.url) schema.url = server.url;
        if (server.args.length > 0) schema.args = server.args;
        if (Object.keys(server.env).length > 0) schema.env = server.env;
        if (server.description) schema.description = server.description;
        saveMcpToWorkspace(ctx.dataDir, schema);

        if (ctx.json) {
          outputJson(server);
        } else {
          success(`MCP server "${server.name}" added (${server.id})`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('edit')
    .description('Edit an MCP server')
    .requiredOption('--id <id>', 'MCP server ID')
    .option('--name <name>', 'New name')
    .option('--transport <type>', 'Transport type')
    .option('--command <cmd>', 'Command')
    .option('--url <url>', 'URL')
    .option('--description <desc>', 'Description')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const patch: Record<string, unknown> = {};
        if (options.name) patch.name = options.name;
        if (options.transport) patch.transport = options.transport;
        if (options.command !== undefined) patch.command = options.command;
        if (options.url !== undefined) patch.url = options.url;
        if (options.description !== undefined) patch.description = options.description;

        const updated = updateMcp(ctx.db, options.id, patch);
        if (!updated) fail(`MCP server not found: ${options.id}`);

        if (ctx.json) {
          outputJson(updated);
        } else {
          success(`MCP server "${updated!.name}" updated`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('remove')
    .description('Remove an MCP server')
    .requiredOption('--id <id>', 'MCP server ID')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const existing = getMcp(ctx.db, options.id);
        if (!existing) fail(`MCP server not found: ${options.id}`);

        deleteMcp(ctx.db, options.id);

        if (ctx.json) {
          outputJson({ success: true, id: options.id });
        } else {
          success(`MCP server "${existing!.name}" removed`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('apply')
    .description('Apply MCP servers to an agent config')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .option('--strict', 'Strict mode (replace all MCP entries)', false)
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agent = getAgent(ctx.db, options.agent);
        if (!agent) fail(`Agent not found: ${options.agent}`);

        const template = getTemplate(agent!.id);
        if (!template) fail(`No template found for agent: ${agent!.id}`);
        if (!template.mcpFile || !template.mcpField) fail('Agent template does not support MCP');

        const mcps = listMcps(ctx.db);
        if (mcps.length === 0) {
          if (ctx.json) outputJson({ message: 'No MCP servers to apply' });
          else success('No MCP servers configured.');
          return;
        }

        const userRoot = agent!.userRoot ?? path.join(process.env.HOME ?? '~', template.configDirName);

        // Preview
        const preview = previewMcpApply({
          agentConfigDir: userRoot,
          template,
          mcps,
          mode: options.strict ? 'strict' : 'merge',
        });

        if (ctx.json) {
          outputJson(preview);
        } else {
          console.log(preview.diff);
          // Apply
          const result = applyMcpToAgent(ctx.db, {
            agentConfigDir: userRoot,
            template,
            mcps,
            mode: options.strict ? 'strict' : 'merge',
          });
          success(`MCP applied to ${result.filePath}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('unapply')
    .description('Remove MCP entries from an agent config')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agent = getAgent(ctx.db, options.agent);
        if (!agent) fail(`Agent not found: ${options.agent}`);

        const template = getTemplate(agent!.id);
        if (!template) fail(`No template found for agent: ${agent!.id}`);
        if (!template.mcpFile || !template.mcpField) fail('Agent template does not support MCP');

        const userRoot = agent!.userRoot ?? path.join(process.env.HOME ?? '~', template.configDirName);
        const filePath = path.join(userRoot, template.mcpFile);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(content);
          } catch {
            parsed = {};
          }
          const field = template.mcpField;
          if (field && parsed[field]) {
            delete parsed[field];
            fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
          }
        }

        if (ctx.json) {
          outputJson({ success: true, agent: options.agent });
        } else {
          success(`MCP entries removed from agent "${agent!.name}"`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('sync')
    .description('Reverse scan: import MCP servers from agents or home directories')
    .option('--mode <mode>', 'Scan mode: agents|home|full', 'full')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const mode = options.mode as ScanMode;
        let scanned: ScannedMcp[];

        if (mode === 'home' || mode === 'full') {
          const userHome = process.env.HOME ?? '~';
          const templates = loadTemplates();
          const folders = scanHomeHiddenFolders(userHome, templates);
          scanned = scanMcpsFromFolders(ctx.db, folders, templates);
        } else {
          const agents = listAgents(ctx.db).filter((a) => a.enabled);
          scanned = scanMcpsFromAgents(ctx.db, agents);
        }

        if (ctx.json) {
          outputJson({ scanned, count: scanned.length });
        } else {
          if (scanned.length === 0) {
            success('No MCP servers found to sync.');
            return;
          }

          outputTable(
            ['Name', 'Agent', 'Classification', 'Transport'],
            scanned.map((s) => [s.name, s.agentName, s.classification, s.schema.transport]),
          );

          const toImport = scanned.filter((s) => s.classification !== 'synced');
          if (toImport.length === 0) {
            success('All MCP servers are already synced.');
            return;
          }

          success(`\n${toImport.length} MCP server(s) to import. Importing...`);
          const results = importScannedMcps(ctx.db, toImport, ctx.dataDir);

          outputTable(
            ['Name', 'Destination', 'Status'],
            results.map((r) => [r.name, r.destinationPath, r.alreadyExisted ? 'existed' : r.classification]),
          );

          // Step 2: sync to agents
          const agents = listAgents(ctx.db).filter((a) => a.enabled);
          for (const agent of agents) {
            const tmpl = getTemplate(agent.id);
            if (!tmpl) continue;
            for (const r of results) {
              syncMcpToWorkspace(ctx.db, agent, tmpl, r.name, ctx.dataDir);
            }
          }
          success('Sync complete.');
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('doctor')
    .description('Check consistency between MCP directory and database, list discrepancies')
    .option('--apply', 'Automatically fix all discrepancies')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const result = checkMcpConsistency(ctx.db, ctx.dataDir);

        if (ctx.json) {
          outputJson(result);
          return;
        }

        if (result.consistent) {
          success('MCP directory and database are consistent.');
          return;
        }

        const toSync = result.items.filter((i) => i.action === 'sync');
        const toDelete = result.items.filter((i) => i.action === 'delete');

        outputTable(
          ['Name', 'Location', 'Action'],
          result.items.map((i) => [i.name, i.location, i.action]),
        );

        if (options.apply) {
          const fixResult = fixMcpConsistency(ctx.db, ctx.dataDir);
          if (fixResult.synced.length > 0) {
            success(`Synced to database: ${fixResult.synced.join(', ')}`);
          }
          if (fixResult.deleted.length > 0) {
            success(`Removed from database: ${fixResult.deleted.join(', ')}`);
          }
          success('All discrepancies fixed.');
        } else {
          if (toSync.length > 0) {
            console.log(`\n${toSync.length} MCP server(s) in directory but not in database.`);
          }
          if (toDelete.length > 0) {
            console.log(`${toDelete.length} MCP server(s) in database but not in directory.`);
          }
          console.log('\nUse --apply to fix all discrepancies.');
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('check')
    .description('Validate MCP server configurations')
    .action(async (_options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const mcps = listMcps(ctx.db);
        const results = mcps.map((m) => {
          const schema: WsMcpSchema = {
            name: m.name,
            transport: m.transport ?? 'stdio',
          };
          if (m.command) schema.command = m.command;
          if (m.url) schema.url = m.url;
          if (m.args.length > 0) schema.args = m.args;
          if (Object.keys(m.env).length > 0) schema.env = m.env;
          const validation = validateWsSchema(schema);
          return { name: m.name, valid: validation.valid, errors: validation.errors };
        });

        if (ctx.json) {
          outputJson(results);
        } else {
          outputTable(
            ['Name', 'Valid', 'Errors'],
            results.map((r) => [r.name, r.valid ? 'PASS' : 'FAIL', r.errors.join('; ') || '-']),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
