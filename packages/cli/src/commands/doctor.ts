import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import {
  verifyWorkspaceIntegrity,
  listAgents,
  getDatabase,
  isKeytarSupported,
  getSymlinkImpl,
} from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, success } from '../lib/output.js';

interface CheckItem {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

export function registerDoctor(program: Command): void {
  program
    .command('doctor')
    .description('Run health checks on the workspace')
    .action(async (_options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const checks: CheckItem[] = [];

        // Node version
        const nodeVersion = process.version;
        const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
        checks.push({
          name: 'Node.js version',
          status: major >= 18 ? 'PASS' : 'FAIL',
          message: `${nodeVersion} (requires >= 18)`,
        });

        // Symlink support
        try {
          const symlink = getSymlinkImpl();
          checks.push({
            name: 'Symlink support',
            status: 'PASS',
            message: `Platform: ${symlink.platform}`,
          });
        } catch {
          checks.push({
            name: 'Symlink support',
            status: 'FAIL',
            message: 'Could not detect symlink support',
          });
        }

        // Workspace integrity
        const integrity = verifyWorkspaceIntegrity(ctx.dataDir);
        checks.push({
          name: 'Workspace integrity',
          status: integrity.valid ? 'PASS' : 'FAIL',
          message: integrity.valid
            ? `Data dir: ${integrity.dataDir}`
            : integrity.errors.join('; '),
        });

        // Agent paths reachable
        const agents = listAgents(ctx.db);
        let unreachableCount = 0;
        for (const agent of agents) {
          if (agent.userRoot && !fs.existsSync(agent.userRoot)) {
            unreachableCount++;
          }
        }
        checks.push({
          name: 'Agent paths reachable',
          status: unreachableCount === 0 ? 'PASS' : 'WARN',
          message:
            unreachableCount === 0
              ? `${agents.length} agent(s) checked`
              : `${unreachableCount}/${agents.length} agent(s) have unreachable paths`,
        });

        // SQLite read/write
        try {
          const testDb = getDatabase(ctx.dataDir);
          testDb.prepare('SELECT 1').get();
          checks.push({
            name: 'SQLite read/write',
            status: 'PASS',
            message: `Database at ${path.join(ctx.dataDir, 'ws.db')}`,
          });
        } catch (err) {
          checks.push({
            name: 'SQLite read/write',
            status: 'FAIL',
            message: err instanceof Error ? err.message : String(err),
          });
        }

        // Keytar
        checks.push({
          name: 'Keychain (keytar)',
          status: isKeytarSupported() ? 'PASS' : 'WARN',
          message: isKeytarSupported()
            ? 'Available (macOS)'
            : 'Not available on this platform',
        });

        if (ctx.json) {
          outputJson({ checks, allPassed: checks.every((c) => c.status !== 'FAIL') });
        } else {
          for (const check of checks) {
            const icon = check.status === 'PASS' ? '\x1b[32m✓\x1b[0m'
              : check.status === 'FAIL' ? '\x1b[31m✗\x1b[0m'
              : '\x1b[33m!\x1b[0m';
            console.log(`${icon} ${check.name}: ${check.message}`);
          }

          const failed = checks.filter((c) => c.status === 'FAIL');
          const warned = checks.filter((c) => c.status === 'WARN');
          console.log('');
          if (failed.length === 0 && warned.length === 0) {
            success('All checks passed.');
          } else {
            success(`${failed.length} failed, ${warned.length} warnings, ${checks.length - failed.length - warned.length} passed.`);
          }
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
