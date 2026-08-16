import { Command } from 'commander';
import path from 'node:path';
import {
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  addTag,
  removeTag,
  setTags,
  importSkillFromLocal,
  importSkillFromGit,
  searchSkillsOnline,
  installSkillFromRegistry,
  syncSkillToWorkspace,
  listAgents,
  getAgent,
  getSymlinkImpl,
  scanSkillsFromAgents,
  importScannedSkills,
  checkSkillConsistency,
  fixSkillConsistency,
} from '@ws/core';
import type { ScannedSkill } from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, outputTable, success, fail, verbose } from '../lib/output.js';

export function registerSkill(program: Command): void {
  const skill = program
    .command('skill')
    .description('Manage skills');

  skill
    .command('list')
    .description('List skills')
    .option('--tag <tag>', 'Filter by tag')
    .option('--agent <agentId>', 'Filter by agent')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const filter = options.tag ? { tags: [options.tag] } : undefined;
        const skills = listSkills(ctx.db, filter);

        if (ctx.json) {
          outputJson(skills);
        } else {
          outputTable(
            ['ID', 'Name', 'Description', 'Tags', 'Source'],
            skills.map((s) => [
              s.id,
              s.name,
              s.description ?? '-',
              s.tags.join(', ') || '-',
              s.sourcePath ?? '-',
            ]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('add')
    .description('Add a skill from local path or git')
    .requiredOption('--name <name>', 'Skill name')
    .option('--source <path>', 'Local path to skill directory')
    .option('--git <url>', 'Git repository URL')
    .option('--on-duplicate <strategy>', 'Duplicate strategy: error|overwrite|rename', 'error')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const skillsDir = path.join(ctx.dataDir, 'skills');
        const onDuplicate = options.onDuplicate as 'error' | 'overwrite' | 'rename';

        let result;
        if (options.git) {
          result = await importSkillFromGit(options.git, options.name, { skillsDir, onDuplicate });
        } else if (options.source) {
          result = importSkillFromLocal(options.source, options.name, { skillsDir, onDuplicate });
        } else {
          fail('Provide --source or --git');
        }

        const skillRow = createSkill(ctx.db, {
          name: result.name,
          sourcePath: result.dir,
        });

        if (ctx.json) {
          outputJson({ ...result, skill: skillRow });
        } else {
          success(`Skill "${result.name}" added (${result.strategy})`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('edit')
    .description('Edit a skill')
    .requiredOption('--id <id>', 'Skill ID')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const patch: Record<string, unknown> = {};
        if (options.name) patch.name = options.name;
        if (options.description) patch.description = options.description;

        const updated = updateSkill(ctx.db, options.id, patch);
        if (!updated) fail(`Skill not found: ${options.id}`);

        if (ctx.json) {
          outputJson(updated);
        } else {
          success(`Skill "${updated!.name}" updated`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('remove')
    .description('Remove a skill')
    .requiredOption('--id <id>', 'Skill ID')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const existing = getSkill(ctx.db, options.id);
        if (!existing) fail(`Skill not found: ${options.id}`);

        deleteSkill(ctx.db, options.id);

        if (ctx.json) {
          outputJson({ success: true, id: options.id });
        } else {
          success(`Skill "${existing!.name}" removed`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('apply')
    .description('Apply a skill to an agent (create symlink)')
    .requiredOption('--skill <name>', 'Skill name')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agent = getAgent(ctx.db, options.agent);
        if (!agent) fail(`Agent not found: ${options.agent}`);

        const symlink = getSymlinkImpl();
        const result = syncSkillToWorkspace(ctx.db, agent!, options.skill, ctx.dataDir, symlink);

        if (ctx.json) {
          outputJson(result);
        } else if (result.success) {
          success(`Skill "${result.name}" applied to agent "${agent!.name}"`);
        } else {
          fail(`Failed to apply skill: ${result.error}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('unapply')
    .description('Remove a skill symlink from an agent')
    .requiredOption('--skill <name>', 'Skill name')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agent = getAgent(ctx.db, options.agent);
        if (!agent) fail(`Agent not found: ${options.agent}`);
        if (!agent!.userRoot || !agent!.skillDir) fail('Agent has no skill directory configured');

        const fs = await import('node:fs');
        const localPath = path.join(agent!.userRoot!, agent!.skillDir!, options.skill);

        if (fs.existsSync(localPath)) {
          const stat = fs.lstatSync(localPath);
          if (stat.isSymbolicLink()) {
            fs.unlinkSync(localPath);
          }
        }

        if (ctx.json) {
          outputJson({ success: true, skill: options.skill, agent: options.agent });
        } else {
          success(`Skill "${options.skill}" removed from agent "${agent!.name}"`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('sync')
    .description('Reverse scan: import skills from enabled agents to trusted source')
    .action(async (_options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agents = listAgents(ctx.db).filter((a) => a.enabled);
        verbose(ctx, `Scanning ${agents.length} enabled agents`);
        for (const agent of agents) {
          verbose(ctx, `  - ${agent.name} (${agent.id})`);
        }
        const scanned: ScannedSkill[] = scanSkillsFromAgents(ctx.db, agents);

        verbose(ctx, `Scan complete: found ${scanned.length} skills`);

        if (ctx.json) {
          outputJson({ scanned, count: scanned.length });
        } else {
          if (scanned.length === 0) {
            success('No new skills found.');
            return;
          }

          outputTable(
            ['Name', 'Agent', 'Classification', 'Path'],
            scanned.map((s) => [s.name, s.agentName, s.classification, s.sourcePath]),
          );

          const toImport = scanned.filter((s) => s.classification !== 'synced');
          verbose(ctx, `${toImport.length} skills need to be imported (excluding synced)`);

          if (toImport.length === 0) {
            success('All skills are already in trusted source.');
            return;
          }

          success(`\n${toImport.length} skill(s) to import. Importing...`);
          const results = importScannedSkills(ctx.db, toImport, ctx.dataDir);

          for (const r of results) {
            verbose(ctx, `Imported: ${r.name} -> ${r.destinationPath} (${r.alreadyExisted ? 'existed' : r.classification})`);
          }

          outputTable(
            ['Name', 'Destination', 'Status'],
            results.map((r) => [r.name, r.destinationPath, r.alreadyExisted ? 'existed' : r.classification]),
          );

          success('\nImport complete. Use `skill apply` to create symlinks to agents.');
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('doctor')
    .description('Check consistency between skills directory and database, list discrepancies')
    .option('--apply', 'Automatically fix all discrepancies')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const result = checkSkillConsistency(ctx.db, ctx.dataDir);

        if (ctx.json) {
          outputJson(result);
          return;
        }

        verbose(ctx, `Directory skills: ${result.directoryCount}`);
        verbose(ctx, `Database skills: ${result.databaseCount}`);

        if (result.consistent) {
          success('Skills directory and database are consistent.');
          return;
        }

        const toSync = result.items.filter((i) => i.action === 'sync');
        const toDelete = result.items.filter((i) => i.action === 'delete');

        outputTable(
          ['Name', 'Location', 'Action'],
          result.items.map((i) => [i.name, i.location, i.action]),
        );

        if (options.apply) {
          const fixResult = fixSkillConsistency(ctx.db, ctx.dataDir);
          if (fixResult.synced.length > 0) {
            success(`Synced to database: ${fixResult.synced.join(', ')}`);
          }
          if (fixResult.deleted.length > 0) {
            success(`Removed from database: ${fixResult.deleted.join(', ')}`);
          }
          success('All discrepancies fixed.');
        } else {
          if (toSync.length > 0) {
            console.log(`\n${toSync.length} skill(s) in directory but not in database.`);
          }
          if (toDelete.length > 0) {
            console.log(`${toDelete.length} skill(s) in database but not in directory.`);
          }
          console.log('\nUse --apply to fix all discrepancies.');
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('tag')
    .description('Manage skill tags')
    .requiredOption('--id <id>', 'Skill ID')
    .option('--add <tags...>', 'Tags to add')
    .option('--remove <tags...>', 'Tags to remove')
    .option('--set <tags...>', 'Set tags (replaces all)')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        let updated;
        if (options.set) {
          updated = setTags(ctx.db, options.id, options.set);
        } else {
          updated = getSkill(ctx.db, options.id);
          if (!updated) fail(`Skill not found: ${options.id}`);
          if (options.add) {
            for (const tag of options.add) {
              updated = addTag(ctx.db, options.id, tag);
            }
          }
          if (options.remove) {
            for (const tag of options.remove) {
              updated = removeTag(ctx.db, options.id, tag);
            }
          }
        }

        if (ctx.json) {
          outputJson(updated);
        } else {
          success(`Tags updated for "${updated!.name}": ${updated!.tags.join(', ') || '(none)'}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('search')
    .description('Search for skills online')
    .requiredOption('--query <query>', 'Search query')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const results = await searchSkillsOnline(options.query);
        if (ctx.json) {
          outputJson(results);
        } else {
          outputTable(
            ['Name', 'Description', 'Source'],
            results.map((r) => [r.name, r.description, r.source]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('install')
    .description('Install a skill from the registry')
    .requiredOption('--name <name>', 'Skill name to install')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const skillsDir = path.join(ctx.dataDir, 'skills');
        const result = await installSkillFromRegistry({ skillsDir, skillName: options.name });
        if (ctx.json) {
          outputJson(result);
        } else {
          success(`Skill "${result.name}" installed to ${result.dir}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
