import { Command } from 'commander';
import os from 'node:os';
import {
  initWorkspace,
  initBuiltinAgents,
  verifyWorkspaceIntegrity,
} from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, success } from '../lib/output.js';

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize workspace and built-in agents')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const wsResult = initWorkspace(ctx.dataDir);
        initBuiltinAgents(ctx.db, os.homedir());
        const integrity = verifyWorkspaceIntegrity(ctx.dataDir);

        if (ctx.json) {
          outputJson({
            success: integrity.valid,
            path: wsResult.dataDir,
            agents: wsResult.created.length + wsResult.existing.length,
            created: wsResult.created,
            existing: wsResult.existing,
            integrity,
          });
        } else {
          success(`Workspace initialized at ${wsResult.dataDir}`);
          if (wsResult.created.length > 0) {
            success(`Created: ${wsResult.created.join(', ')}`);
          }
          success(`Integrity: ${integrity.valid ? 'PASS' : 'FAIL'}`);
          if (!integrity.valid) {
            for (const err of integrity.errors) {
              success(`  - ${err}`);
            }
          }
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
