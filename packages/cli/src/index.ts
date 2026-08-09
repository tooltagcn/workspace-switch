#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';
import { registerInit } from './commands/init.js';
import { registerAgent } from './commands/agent.js';
import { registerSkill } from './commands/skill.js';
import { registerMcp } from './commands/mcp.js';
import { registerProvider } from './commands/provider.js';
import { registerSearch } from './commands/search.js';
import { registerDoctor } from './commands/doctor.js';
import { registerProject } from './commands/project.js';

const program = new Command();

program
  .name('ws_cli')
  .description('Workspace Switch CLI — manage agents, skills, MCPs, and providers')
  .version('0.1.0')
  .option('--json', 'Output in JSON format', false)
  .option('--verbose', 'Enable verbose output', false)
  .option('--data-dir <path>', 'Data directory', path.join(process.env.HOME ?? '~', '.workspace_switch'));

registerInit(program);
registerAgent(program);
registerSkill(program);
registerMcp(program);
registerProvider(program);
registerProject(program);
registerSearch(program);
registerDoctor(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
