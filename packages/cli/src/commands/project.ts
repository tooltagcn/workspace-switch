import { Command } from 'commander';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getEnabledAgentsForProject,
  toggleAgentForProject,
} from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, outputTable, success, fail } from '../lib/output.js';

export function registerProject(program: Command): void {
  const project = program
    .command('project')
    .description('Manage projects');

  project
    .command('list')
    .description('List projects')
    .option('--search <query>', 'Filter by name')
    .action(async (options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const projects = listProjects(ctx.db, options.search);
        if (ctx.json) {
          outputJson(projects);
        } else {
          outputTable(
            ['ID', 'Name', 'Path'],
            projects.map((p) => [p.id, p.name, p.path]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  project
    .command('add')
    .description('Add a new project')
    .argument('<path>', 'Project directory path')
    .option('--name <name>', 'Display name (defaults to last path segment)')
    .action(async (projectPath: string, options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const p = createProject(ctx.db, { path: projectPath, name: options.name });
        if (ctx.json) {
          outputJson(p);
        } else {
          success(`Project "${p.name}" added (${p.id})`);
        }
      } catch (err) {
        fail(String(err));
      } finally {
        cleanupContext(ctx);
      }
    });

  project
    .command('remove')
    .description('Remove a project (database only, directory is not deleted)')
    .argument('<id>', 'Project ID')
    .action(async (id: string, _options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const deleted = deleteProject(ctx.db, id);
        if (deleted) {
          success(`Project removed (${id})`);
        } else {
          fail(`Project not found: ${id}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  project
    .command('rename')
    .description('Rename a project')
    .argument('<id>', 'Project ID')
    .argument('<name>', 'New name')
    .action(async (id: string, name: string, _options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const p = updateProject(ctx.db, id, { name });
        if (p) {
          if (ctx.json) {
            outputJson(p);
          } else {
            success(`Project renamed to "${p.name}"`);
          }
        } else {
          fail(`Project not found: ${id}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  project
    .command('agents')
    .description('List agents for a project with enablement status')
    .argument('<projectId>', 'Project ID')
    .action(async (projectId: string, _options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const agents = getEnabledAgentsForProject(ctx.db, projectId);
        if (ctx.json) {
          outputJson(agents);
        } else {
          outputTable(
            ['Agent ID', 'Name', 'Config Dir', 'Enabled'],
            agents.map((a) => [a.agentId, a.agentName, a.configDirName, a.enabled ? 'yes' : 'no']),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  project
    .command('toggle-agent')
    .description('Enable or disable an agent for a project')
    .argument('<projectId>', 'Project ID')
    .argument('<agentId>', 'Agent ID')
    .option('--enable', 'Enable the agent')
    .option('--disable', 'Disable the agent')
    .action(async (projectId: string, agentId: string, options, cmd) => {
      const ctx = createContext(cmd);
      try {
        if (options.enable && options.disable) {
          fail('Specify either --enable or --disable, not both');
          return;
        }
        if (!options.enable && !options.disable) {
          fail('Specify either --enable or --disable');
          return;
        }
        toggleAgentForProject(ctx.db, projectId, agentId, !!options.enable);
        success(`Agent ${options.enable ? 'enabled' : 'disabled'} for project`);
      } finally {
        cleanupContext(ctx);
      }
    });

  const skill = project
    .command('skill')
    .description('Manage project-level skills');

  skill
    .command('list')
    .description('List skills applied to a project')
    .argument('<projectId>', 'Project ID')
    .action(async (projectId: string, _options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const { getProjectSkillList } = await import('@ws/core');
        const skills = getProjectSkillList(ctx.db, projectId);
        if (ctx.json) {
          outputJson(skills);
        } else {
          outputTable(
            ['Skill ID', 'Name', 'Description', 'Applied To'],
            skills.map((s) => [
              s.skillId,
              s.name,
              s.description ?? '-',
              s.appliedAgents.join(', ') || '-',
            ]),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('apply')
    .description('Apply a skill to a project agent')
    .argument('<projectId>', 'Project ID')
    .requiredOption('--skill <skillId>', 'Skill ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (projectId: string, options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const { syncProjectSkillToWorkspace, getProject, getAgent: getAgentFn, getSymlinkImpl } = await import('@ws/core');
        const proj = getProject(ctx.db, projectId);
        if (!proj) {
          fail(`Project not found: ${projectId}`);
          return;
        }
        const agent = getAgentFn(ctx.db, options.agent);
        if (!agent) {
          fail(`Agent not found: ${options.agent}`);
          return;
        }
        const skillRow = ctx.db.prepare('SELECT name FROM skill WHERE id = ?').get(options.skill) as { name: string } | undefined;
        if (!skillRow) {
          fail(`Skill not found: ${options.skill}`);
          return;
        }
        const symlink = getSymlinkImpl();
        const result = syncProjectSkillToWorkspace(ctx.db, proj, agent, skillRow.name, ctx.dataDir, symlink);
        if (result.success) {
          success(`Skill "${result.name}" applied to project`);
        } else {
          fail(`Failed to apply skill: ${result.error}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  skill
    .command('unapply')
    .description('Unapply a skill from a project agent')
    .argument('<projectId>', 'Project ID')
    .requiredOption('--skill <skillId>', 'Skill ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (projectId: string, options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const { unsyncProjectSkillFromWorkspace, getProject, getAgent: getAgentFn, getSymlinkImpl } = await import('@ws/core');
        const proj = getProject(ctx.db, projectId);
        if (!proj) {
          fail(`Project not found: ${projectId}`);
          return;
        }
        const agent = getAgentFn(ctx.db, options.agent);
        if (!agent) {
          fail(`Agent not found: ${options.agent}`);
          return;
        }
        const skillRow = ctx.db.prepare('SELECT name FROM skill WHERE id = ?').get(options.skill) as { name: string } | undefined;
        if (!skillRow) {
          fail(`Skill not found: ${options.skill}`);
          return;
        }
        const symlink = getSymlinkImpl();
        const result = unsyncProjectSkillFromWorkspace(ctx.db, proj, agent, skillRow.name, symlink);
        if (result.success) {
          success(`Skill "${result.name}" unapplied from project`);
        } else {
          fail(`Failed to unapply skill: ${result.error}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  const mcp = project
    .command('mcp')
    .description('Manage project-level MCP servers');

  mcp
    .command('list')
    .description('List MCP servers applied to a project')
    .argument('<projectId>', 'Project ID')
    .action(async (projectId: string, _options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const rows = ctx.db.prepare(
          `SELECT m.id, m.name, m.description,
                  GROUP_CONCAT(DISTINCT a.name) AS agent_names
           FROM project_resource_agent pra
           JOIN mcp m ON m.id = pra.resource_id
           JOIN agent a ON a.id = pra.agent_id
           WHERE pra.project_id = ? AND pra.resource_type = 'mcp'
           GROUP BY pra.resource_id
           ORDER BY m.name ASC`,
        ).all(projectId) as { id: string; name: string; description: string | null; agent_names: string | null }[];

        if (ctx.json) {
          outputJson(rows);
        } else {
          outputTable(
            ['MCP ID', 'Name', 'Description', 'Applied To'],
            rows.map((r) => [r.id, r.name, r.description ?? '-', r.agent_names ?? '-']),
          );
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('apply')
    .description('Apply an MCP server to a project agent')
    .argument('<projectId>', 'Project ID')
    .requiredOption('--mcp <mcpName>', 'MCP server name')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (projectId: string, options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const { syncProjectMcpToWorkspace, getProject, getAgent: getAgentFn, getTemplate, createSecretStore } = await import('@ws/core');
        const proj = getProject(ctx.db, projectId);
        if (!proj) {
          fail(`Project not found: ${projectId}`);
          return;
        }
        const agent = getAgentFn(ctx.db, options.agent);
        if (!agent) {
          fail(`Agent not found: ${options.agent}`);
          return;
        }
        const template = getTemplate(agent.id);
        if (!template) {
          fail(`No template found for agent: ${options.agent}`);
          return;
        }
        const secretStore = await createSecretStore(ctx.db);
        const result = await syncProjectMcpToWorkspace(ctx.db, proj, agent, template, options.mcp, ctx.dataDir, secretStore);
        if (result.success) {
          success(`MCP "${result.name}" applied to project`);
        } else {
          fail(`Failed to apply MCP: ${result.error}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });

  mcp
    .command('unapply')
    .description('Unapply an MCP server from a project agent')
    .argument('<projectId>', 'Project ID')
    .requiredOption('--mcp <mcpName>', 'MCP server name')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (projectId: string, options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const { unsyncProjectMcpFromWorkspace, getProject, getAgent: getAgentFn, getTemplate } = await import('@ws/core');
        const proj = getProject(ctx.db, projectId);
        if (!proj) {
          fail(`Project not found: ${projectId}`);
          return;
        }
        const agent = getAgentFn(ctx.db, options.agent);
        if (!agent) {
          fail(`Agent not found: ${options.agent}`);
          return;
        }
        const template = getTemplate(agent.id);
        if (!template) {
          fail(`No template found for agent: ${options.agent}`);
          return;
        }
        const result = unsyncProjectMcpFromWorkspace(ctx.db, proj, agent, template, options.mcp);
        if (result.success) {
          success(`MCP "${result.name}" unapplied from project`);
        } else {
          fail(`Failed to unapply MCP: ${result.error}`);
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
