import { dialog, ipcMain } from 'electron';
import {
  listAgents,
  listAllAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  addTag as addSkillTag,
  removeTag as removeSkillTag,
  listMcps,
  getMcp,
  createMcp,
  updateMcp,
  deleteMcp,
  addMcpTag,
  removeMcpTag,
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  setApiKey,
  getApiKey,
  isKeytarSupported,
  listTags,
  createTag,
  renameTag,
  deleteTag,
  scanSkillsFromAgents,
  scanMcpsFromAgents,
  scanSkillsFromProject,
  scanMcpsFromProject,
  importScannedSkills,
  importScannedMcps,
  applyMcpToAgent,
  previewMcpApply,
  syncSkillToWorkspace,
  unsyncSkillFromWorkspace,
  syncMcpToWorkspace,
  unsyncMcpFromWorkspace,
  unsyncAllMcpsFromAgent,
  getAppliedAgentsForSkill,
  getAppliedAgentsForMcp,
  loadTemplates,
  resolveTemplateForAgent,
  effectiveAsTemplate,
  buildIndex,
  searchAll,
  getDatabase,
  closeDatabase,
  initBuiltinAgents,
  initWorkspace,
  verifyWorkspaceIntegrity,
  listProjects,
  getProject,
  getProjectWithAgents,
  createProject,
  updateProject,
  deleteProject,
  getEnabledAgentsForProject,
  toggleAgentForProject,
  getProjectSkillList,
  syncProjectSkillToWorkspace,
  unsyncProjectSkillFromWorkspace,
  syncProjectMcpToWorkspace,
  unsyncProjectMcpFromWorkspace,
  listSkills as listAllSkills,
  checkSkillConsistency,
  fixSkillConsistency,
  checkMcpConsistency,
  fixMcpConsistency,
  runTestAndPersist,
  batchTestMcps,
  callMcpTool,
  getTools as getMcpToolsFromDb,
  getPrompts as getMcpPromptsFromDb,
  getTestResult,
  createSecretStore,
  isKeychainAvailable,
  saveMcpToWorkspace,
  loadMcpFromWorkspace,
  importSkillFromLocal,
  importSkillFromArchive,
  validateSkill,
  registerSkillProvider,
  getSkillProvider,
  listSkillProviders,
  SkillsShProvider,
  GitHubUrlProvider,
  logger,
  setDebugMode,
  isDebugMode,
  getLogFilePath,
  getSetting,
  setSetting,
} from '@ws/core';
import { getSymlinkImpl } from '@ws/core';
import os from 'node:os';
import path from 'node:path';

let db: ReturnType<typeof getDatabase> | null = null;
let dataDir: string;

function getDb() {
  if (!db) {
    try {
      dataDir = path.join(os.homedir(), '.workspace_switch');
      logger.info('Initializing workspace at:', dataDir);
      initWorkspace(dataDir);
      db = getDatabase(dataDir);
      logger.info('Database opened');
      initBuiltinAgents(db, os.homedir());
      logger.info('Built-in agents initialized');
      verifyWorkspaceIntegrity(dataDir);
      logger.info('Workspace integrity verified');
    } catch (err) {
      logger.error('Database initialization failed:', err);
      throw err;
    }
  }
  return db;
}

function getDataDir() {
  getDb();
  return dataDir;
}

function ensureMcpInWorkspace(mcp: { name: string; transport: string | null; command: string | null; url: string | null; args: string[]; env: Record<string, string>; description: string | null }): void {
  const workspaceDir = getDataDir();
  if (!loadMcpFromWorkspace(workspaceDir, mcp.name)) {
    saveMcpToWorkspace(workspaceDir, {
      name: mcp.name,
      transport: (mcp.transport ?? 'stdio') as 'stdio' | 'sse' | 'http',
      command: mcp.command ?? undefined,
      url: mcp.url ?? undefined,
      args: mcp.args.length > 0 ? mcp.args : undefined,
      env: Object.keys(mcp.env).length > 0 ? mcp.env : undefined,
      description: mcp.description ?? undefined,
    });
  }
}

export function registerIpcHandlers(): void {
  // Register built-in skill discovery providers
  registerSkillProvider(new SkillsShProvider());
  registerSkillProvider(new GitHubUrlProvider());

  // Agent handlers
  ipcMain.handle('agent:list', () => {
    try { return listAgents(getDb()); } catch (e) { logger.error('agent:list error:', e); throw e; }
  });
  ipcMain.handle('agent:listAll', () => {
    try { return listAllAgents(getDb()); } catch (e) { logger.error('agent:listAll error:', e); throw e; }
  });
  ipcMain.handle('agent:get', (_event, id: string) => {
    try { return getAgent(getDb(), id); } catch (e) { logger.error('agent:get error:', e); throw e; }
  });
  ipcMain.handle('agent:create', (_event, data) => {
    try { return createAgent(getDb(), data); } catch (e) { logger.error('agent:create error:', e); throw e; }
  });
  ipcMain.handle('agent:update', (_event, id: string, data) => {
    try { return updateAgent(getDb(), id, data); } catch (e) { logger.error('agent:update error:', e); throw e; }
  });
  ipcMain.handle('agent:delete', (_event, id: string) => {
    try { return deleteAgent(getDb(), id); } catch (e) { logger.error('agent:delete error:', e); throw e; }
  });

  // Template handlers
  ipcMain.handle('template:list', () => {
    try { return loadTemplates(); } catch (e) { logger.error('template:list error:', e); throw e; }
  });

  // Skill handlers
  ipcMain.handle('skill:list', () => {
    try { return listSkills(getDb()); } catch (e) { logger.error('skill:list error:', e); throw e; }
  });
  ipcMain.handle('skill:get', (_event, id: string) => getSkill(getDb(), id));
  ipcMain.handle('skill:create', (_event, data) => createSkill(getDb(), data));
  ipcMain.handle('skill:update', (_event, id: string, data) => updateSkill(getDb(), id, data));
  ipcMain.handle('skill:delete', (_event, id: string) => deleteSkill(getDb(), id));
  ipcMain.handle('skill:addTag', (_event, skillId: string, tag: string) => addSkillTag(getDb(), skillId, tag));
  ipcMain.handle('skill:removeTag', (_event, skillId: string, tag: string) => removeSkillTag(getDb(), skillId, tag));

  ipcMain.handle('mcp:addTag', (_event, mcpId: string, tag: string) => addMcpTag(getDb(), mcpId, tag));
  ipcMain.handle('mcp:removeTag', (_event, mcpId: string, tag: string) => removeMcpTag(getDb(), mcpId, tag));

  // Skill scan (user-level agent dirs + all project agent dirs)
  ipcMain.handle('skill:scan', () => {
    const d = getDb();
    const skills = scanSkillsFromAgents(d, listAgents(d));
    const seen = new Set(skills.map((s) => s.sourcePath));
    for (const project of listProjects(d)) {
      const enabled = getEnabledAgentsForProject(d, project.id);
      const enabledIds = new Set(enabled.map((e) => e.agentId));
      const agents = listAgents(d).filter((a) => enabledIds.has(a.id));
      for (const s of scanSkillsFromProject(d, project, agents)) {
        if (!seen.has(s.sourcePath)) {
          seen.add(s.sourcePath);
          skills.push(s);
        }
      }
    }
    return { skills };
  });

  // Skill apply (sync to agent via symlink)
  ipcMain.handle('skill:apply', (_event, skillId: string, agentId: string) => {
    const d = getDb();
    const agent = getAgent(d, agentId);
    const skill = getSkill(d, skillId);
    if (!agent || !skill) throw new Error('Agent or skill not found');
    const symlink = getSymlinkImpl();
    return syncSkillToWorkspace(d, agent, skill.name, getDataDir(), symlink);
  });

  // Skill applied agents
  ipcMain.handle('skill:appliedAgents', (_event, skillId: string) => {
    return getAppliedAgentsForSkill(getDb(), skillId);
  });

  // Skill unapply (remove symlink from agent)
  ipcMain.handle('skill:unapply', (_event, skillId: string, agentId: string) => {
    const d = getDb();
    const agent = getAgent(d, agentId);
    const skill = getSkill(d, skillId);
    if (!agent || !skill) throw new Error('Agent or skill not found');
    const symlink = getSymlinkImpl();
    return unsyncSkillFromWorkspace(d, agent, skill.name, symlink);
  });

  // Skill import scanned
  ipcMain.handle('skill:importScanned', (_event, skills: unknown[]) => {
    return importScannedSkills(getDb(), skills as any, getDataDir());
  });

  // Skill consistency check (doctor)
  ipcMain.handle('skill:doctor', () => {
    return checkSkillConsistency(getDb(), getDataDir());
  });
  ipcMain.handle('skill:fixDoctor', () => {
    return fixSkillConsistency(getDb(), getDataDir());
  });

  // Skill import from local directory
  ipcMain.handle('skill:importLocal', (_event, sourcePath: string, name: string) => {
    try {
      const skillsDir = path.join(getDataDir(), 'skills');
      const result = importSkillFromLocal(sourcePath, name, { skillsDir, onDuplicate: 'rename' });
      return createSkill(getDb(), { name: result.name, sourcePath: result.dir });
    } catch (e) { logger.error('skill:importLocal error:', e); throw e; }
  });

  // Skill import from archive
  ipcMain.handle('skill:importArchive', async (_event, archivePath: string, name: string) => {
    try {
      const skillsDir = path.join(getDataDir(), 'skills');
      const result = await importSkillFromArchive(archivePath, name, { skillsDir, onDuplicate: 'rename' });
      return createSkill(getDb(), { name: result.name, sourcePath: result.dir });
    } catch (e) { logger.error('skill:importArchive error:', e); throw e; }
  });

  // Skill discovery (pluggable providers)
  ipcMain.handle('skill:discovery:providers', () => {
    return listSkillProviders().map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      inputPlaceholder: p.inputPlaceholder,
    }));
  });

  ipcMain.handle('skill:discovery:search', async (_event, providerId: string, query: string) => {
    logger.info(`skill:discovery:search provider=${providerId} query=${JSON.stringify(query)}`);
    try {
      const provider = getSkillProvider(providerId);
      if (!provider) throw new Error(`Unknown skill provider: ${providerId}`);
      const results = await provider.search(query);
      logger.info(`skill:discovery:search done: ${results.length} results`);
      return results;
    } catch (e) {
      logger.error('skill:discovery:search error:', e);
      throw e;
    }
  });

  ipcMain.handle('skill:discovery:install', async (_event, providerId: string, name: string, source: string) => {
    logger.info(`skill:discovery:install provider=${providerId} name=${JSON.stringify(name)}`);
    try {
      const provider = getSkillProvider(providerId);
      if (!provider) throw new Error(`Unknown skill provider: ${providerId}`);
      const skillsDir = path.join(getDataDir(), 'skills');
      const result = await provider.install(name, source, skillsDir);
      const validation = validateSkill(result.dir);
      logger.info(`skill:discovery:install done: ${result.name}`);
      return createSkill(getDb(), {
        name: result.name,
        sourcePath: result.dir,
        description: validation.description ?? null,
      });
    } catch (e) {
      logger.error('skill:discovery:install error:', e);
      throw e;
    }
  });

  // Native dialogs
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return { canceled: result.canceled, path: result.canceled ? null : result.filePaths[0] };
  });

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Archives', extensions: ['zip', 'tar.gz', 'tgz', 'tar'] }],
    });
    return { canceled: result.canceled, path: result.canceled ? null : result.filePaths[0] };
  });

  // MCP handlers
  ipcMain.handle('mcp:list', () => listMcps(getDb()));
  ipcMain.handle('mcp:get', (_event, id: string) => getMcp(getDb(), id));
  ipcMain.handle('mcp:create', (_event, data) => {
    const result = createMcp(getDb(), data);
    saveMcpToWorkspace(dataDir, {
      name: result.name,
      transport: result.transport ?? 'stdio',
      command: result.command ?? undefined,
      url: result.url ?? undefined,
      args: result.args.length > 0 ? result.args : undefined,
      env: Object.keys(result.env).length > 0 ? result.env : undefined,
      description: result.description ?? undefined,
    });
    return result;
  });
  ipcMain.handle('mcp:update', (_event, id: string, data) => {
    const result = updateMcp(getDb(), id, data);
    if (result) {
      saveMcpToWorkspace(dataDir, {
        name: result.name,
        transport: result.transport ?? 'stdio',
        command: result.command ?? undefined,
        url: result.url ?? undefined,
        args: result.args.length > 0 ? result.args : undefined,
        env: Object.keys(result.env).length > 0 ? result.env : undefined,
        description: result.description ?? undefined,
      });
    }
    return result;
  });
  ipcMain.handle('mcp:delete', (_event, id: string) => deleteMcp(getDb(), id));

  // MCP scan (user-level agent dirs + all project agent dirs)
  ipcMain.handle('mcp:scan', () => {
    const d = getDb();
    const mcps = scanMcpsFromAgents(d, listAgents(d));
    const seen = new Set(mcps.map((m) => `${m.sourcePath}::${m.name}`));
    for (const project of listProjects(d)) {
      const enabled = getEnabledAgentsForProject(d, project.id);
      const enabledIds = new Set(enabled.map((e) => e.agentId));
      const agents = listAgents(d).filter((a) => enabledIds.has(a.id));
      for (const m of scanMcpsFromProject(d, project, agents)) {
        const key = `${m.sourcePath}::${m.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          mcps.push(m);
        }
      }
    }
    return { mcps };
  });

  // MCP apply
  ipcMain.handle('mcp:apply', async (_event, mcpId: string, agentId: string) => {
    const d = getDb();
    const agent = getAgent(d, agentId);
    const mcp = getMcp(d, mcpId);
    if (!agent || !mcp) throw new Error('Agent or MCP not found');
    const template = effectiveAsTemplate(agent, resolveTemplateForAgent(agent));
    if (!template) throw new Error('No matching agent template found');
    ensureMcpInWorkspace(mcp);
    const secretStore = await createSecretStore(d);
    return await syncMcpToWorkspace(d, agent, template, mcp.name, getDataDir(), secretStore);
  });

  // MCP preview apply
  ipcMain.handle('mcp:previewApply', (_event, mcpId: string, agentId: string) => {
    const d = getDb();
    const agent = getAgent(d, agentId);
    const mcp = getMcp(d, mcpId);
    if (!agent || !mcp) throw new Error('Agent or MCP not found');
    const template = effectiveAsTemplate(agent, resolveTemplateForAgent(agent));
    if (!template) throw new Error('No matching agent template found');
    const agentConfigDir = agent.userRoot ?? agent.configDirName;
    return previewMcpApply({
      agentConfigDir,
      template,
      mcps: [mcp],
    });
  });

  // MCP applied agents
  ipcMain.handle('mcp:appliedAgents', (_event, mcpId: string) => {
    return getAppliedAgentsForMcp(getDb(), mcpId);
  });

  // MCP unapply
  ipcMain.handle('mcp:unapply', (_event, mcpId: string, agentId: string) => {
    const d = getDb();
    const agent = getAgent(d, agentId);
    const mcp = getMcp(d, mcpId);
    if (!agent || !mcp) throw new Error('Agent or MCP not found');
    const template = effectiveAsTemplate(agent, resolveTemplateForAgent(agent));
    if (!template) throw new Error('No matching agent template found');
    return unsyncMcpFromWorkspace(d, agent, template, mcp.name);
  });

  // MCP sync (re-apply out-of-sync MCPs)
  ipcMain.handle('mcp:sync', async (_event, mcpId: string) => {
    const d = getDb();

    const outOfSyncMcps = d
      .prepare(
        `SELECT pra.resource_id, pra.agent_id,
                m.name as mcp_name
         FROM resource_agent pra
         JOIN mcp m ON m.id = pra.resource_id
         WHERE pra.resource_type = 'mcp'
           AND pra.resource_id = ?
           AND pra.applied_config_hash IS NOT NULL
           AND m.config_hash IS NOT NULL
           AND pra.applied_config_hash != m.config_hash`,
      )
      .all(mcpId) as { resource_id: string; agent_id: string; mcp_name: string }[];

    const secretStore = await createSecretStore(d);
    const results = [];
    for (const applied of outOfSyncMcps) {
      const agent = getAgent(d, applied.agent_id);
      if (!agent) continue;

      const template = effectiveAsTemplate(agent, resolveTemplateForAgent(agent));
      if (!template) continue;

      const mcp = getMcp(d, applied.resource_id);
      if (!mcp) continue;
      ensureMcpInWorkspace(mcp);

      const result = await syncMcpToWorkspace(d, agent, template, applied.mcp_name, getDataDir(), secretStore);
      results.push({ agentId: applied.agent_id, ...result });
    }

    return results;
  });

  // MCP import scanned
  ipcMain.handle('mcp:importScanned', (_event, mcps: unknown[]) => {
    return importScannedMcps(getDb(), mcps as any, getDataDir());
  });

  // MCP consistency check (doctor)
  ipcMain.handle('mcp:doctor', () => {
    return checkMcpConsistency(getDb(), getDataDir());
  });
  ipcMain.handle('mcp:fixDoctor', () => {
    return fixMcpConsistency(getDb(), getDataDir());
  });

  // MCP test handlers
  ipcMain.handle('mcp:test', async (_event, mcpId: string) => {
    try {
      const report = await runTestAndPersist(getDb(), mcpId);
      return report;
    } catch (e) {
      logger.error('mcp:test error:', e);
      throw e;
    }
  });

  ipcMain.handle('mcp:batchTest', async (event) => {
    try {
      const result = await batchTestMcps(getDb(), {
        onProgress: (progress) => {
          event.sender.send('mcp:batch-test-progress', progress);
        },
        onResult: (mcpId, mcpName, status, error) => {
          event.sender.send('mcp:batch-test-result', { mcpId, mcpName, status, error });
        },
      });
      return result;
    } catch (e) {
      logger.error('mcp:batchTest error:', e);
      throw e;
    }
  });

  ipcMain.handle('mcp:callTool', async (_event, mcpId: string, toolName: string, args: Record<string, unknown>) => {
    try {
      const mcp = getMcp(getDb(), mcpId);
      if (!mcp) throw new Error(`MCP server not found: ${mcpId}`);
      return await callMcpTool(mcp, toolName, args);
    } catch (e) {
      logger.error('mcp:callTool error:', e);
      throw e;
    }
  });

  ipcMain.handle('mcp:getTools', (_event, mcpId: string) => {
    return getMcpToolsFromDb(getDb(), mcpId);
  });

  ipcMain.handle('mcp:getPrompts', (_event, mcpId: string) => {
    return getMcpPromptsFromDb(getDb(), mcpId);
  });

  ipcMain.handle('mcp:getTestResult', (_event, mcpId: string) => {
    return getTestResult(getDb(), mcpId);
  });

  // Secret management handlers
  ipcMain.handle('mcp:isKeychainAvailable', async () => {
    return isKeychainAvailable();
  });

  ipcMain.handle('mcp:storeSecret', async (_event, mcpName: string, varName: string, value: string) => {
    try {
      const secretStore = await createSecretStore(getDb());
      await secretStore.storeSecret(mcpName, varName, value);
      return { success: true };
    } catch (e) {
      logger.error('mcp:storeSecret error:', e);
      throw e;
    }
  });

  ipcMain.handle('mcp:deleteSecret', async (_event, mcpName: string, varName: string) => {
    try {
      const secretStore = await createSecretStore(getDb());
      await secretStore.deleteSecret(mcpName, varName);
      return { success: true };
    } catch (e) {
      logger.error('mcp:deleteSecret error:', e);
      throw e;
    }
  });

  // Provider handlers
  ipcMain.handle('provider:list', () => listProviders(getDb()));
  ipcMain.handle('provider:get', (_event, id: string) => getProvider(getDb(), id));
  ipcMain.handle('provider:create', (_event, data) => createProvider(getDb(), data));
  ipcMain.handle('provider:update', (_event, id: string, data) => updateProvider(getDb(), id, data));
  ipcMain.handle('provider:delete', (_event, id: string) => deleteProvider(getDb(), id));
  ipcMain.handle('provider:setApiKey', (_event, providerName: string, apiKey: string) =>
    setApiKey(providerName, apiKey));
  ipcMain.handle('provider:getApiKey', (_event, providerName: string) =>
    getApiKey(providerName));
  ipcMain.handle('provider:isKeytarSupported', () => isKeytarSupported());

  // Tag handlers
  ipcMain.handle('tag:list', () => listTags(getDb()));
  ipcMain.handle('tag:create', (_event, data) => createTag(getDb(), data));
  ipcMain.handle('tag:rename', (_event, id: string, name: string) => renameTag(getDb(), id, { newName: name }));
  ipcMain.handle('tag:delete', (_event, id: string) => deleteTag(getDb(), id));

  // Search
  ipcMain.handle('search', (_event, query: string) => {
    const d = getDb();
    const skills = listSkills(d).map((s) => ({ id: s.id, type: 'skill' as const, name: s.name, description: s.description ?? '' }));
    const mcps = listMcps(d).map((m) => ({ id: m.id, type: 'mcp' as const, name: m.name, description: m.description ?? '' }));
    buildIndex([...skills, ...mcps]);
    return searchAll(query);
  });

  // Project handlers
  ipcMain.handle('project:list', (_event, search?: string) => {
    try { return listProjects(getDb(), search); } catch (e) { logger.error('project:list error:', e); throw e; }
  });
  ipcMain.handle('project:get', (_event, id: string) => {
    try { return getProjectWithAgents(getDb(), id); } catch (e) { logger.error('project:get error:', e); throw e; }
  });
  ipcMain.handle('project:create', (_event, data: { path: string; name?: string }) => {
    try { return createProject(getDb(), data); } catch (e) { logger.error('project:create error:', e); throw e; }
  });
  ipcMain.handle('project:update', (_event, id: string, data: { name?: string }) => {
    try { return updateProject(getDb(), id, data); } catch (e) { logger.error('project:update error:', e); throw e; }
  });
  ipcMain.handle('project:delete', (_event, id: string) => {
    try { return deleteProject(getDb(), id, getSymlinkImpl()); } catch (e) { logger.error('project:delete error:', e); throw e; }
  });
  ipcMain.handle('project:toggleAgent', (_event, projectId: string, agentId: string, enabled: boolean) => {
    try {
      const d = getDb();
      if (!enabled) {
        const proj = getProject(d, projectId);
        const agent = getAgent(d, agentId);
        if (proj && agent) {
          const appliedRows = d.prepare(
            `SELECT s.name FROM project_resource_agent pra
             JOIN skill s ON s.id = pra.resource_id
             WHERE pra.project_id = ? AND pra.agent_id = ? AND pra.resource_type = 'skill'`,
          ).all(projectId, agentId) as { name: string }[];
          for (const row of appliedRows) {
            unsyncProjectSkillFromWorkspace(d, proj, agent, row.name, getSymlinkImpl());
          }
        }
      }
      toggleAgentForProject(d, projectId, agentId, enabled);
    } catch (e) { logger.error('project:toggleAgent error:', e); throw e; }
  });

  // Project skill handlers
  ipcMain.handle('project:skillList', (_event, projectId: string) => {
    try { return getProjectSkillList(getDb(), projectId); } catch (e) { logger.error('project:skillList error:', e); throw e; }
  });
  ipcMain.handle('project:applySkill', (_event, projectId: string, skillId: string, agentId: string) => {
    try {
      const d = getDb();
      const proj = getProject(d, projectId);
      const agent = getAgent(d, agentId);
      const skill = getSkill(d, skillId);
      if (!proj || !agent || !skill) throw new Error('Project, agent, or skill not found');
      if (!agent.enabled) throw new Error('Agent is inactive');
      const pa = d.prepare(
        'SELECT enabled FROM project_agent WHERE project_id = ? AND agent_id = ?',
      ).get(projectId, agentId) as { enabled: number } | undefined;
      if (!pa || pa.enabled !== 1) throw new Error('Agent is disabled for this project');
      return syncProjectSkillToWorkspace(d, proj, agent, skill.name, getDataDir(), getSymlinkImpl());
    } catch (e) { logger.error('project:applySkill error:', e); throw e; }
  });
  ipcMain.handle('project:unapplySkill', (_event, projectId: string, skillId: string, agentId: string) => {
    try {
      const d = getDb();
      const proj = getProject(d, projectId);
      const agent = getAgent(d, agentId);
      const skill = getSkill(d, skillId);
      if (!proj || !agent || !skill) throw new Error('Project, agent, or skill not found');
      return unsyncProjectSkillFromWorkspace(d, proj, agent, skill.name, getSymlinkImpl());
    } catch (e) { logger.error('project:unapplySkill error:', e); throw e; }
  });
  ipcMain.handle('project:availableSkills', (_event, projectId: string, agentId?: string) => {
    try {
      const d = getDb();
      const allSkills = listAllSkills(d);
      if (agentId) {
        const appliedSkillIds = d.prepare(
          `SELECT DISTINCT resource_id FROM project_resource_agent WHERE project_id = ? AND agent_id = ? AND resource_type = 'skill'`,
        ).all(projectId, agentId) as { resource_id: string }[];
        const appliedSet = new Set(appliedSkillIds.map((r) => r.resource_id));
        return allSkills.filter((s) => !appliedSet.has(s.id));
      }
      return allSkills;
    } catch (e) { logger.error('project:availableSkills error:', e); throw e; }
  });

  // Project MCP handlers
  ipcMain.handle('project:mcpList', (_event, projectId: string) => {
    try {
      const d = getDb();
      return d.prepare(
        `SELECT m.id, m.name, m.description,
                GROUP_CONCAT(DISTINCT a.name) AS agent_names
         FROM project_resource_agent pra
         JOIN mcp m ON m.id = pra.resource_id
         JOIN agent a ON a.id = pra.agent_id
         WHERE pra.project_id = ? AND pra.resource_type = 'mcp'
         GROUP BY pra.resource_id
         ORDER BY m.name ASC`,
      ).all(projectId);
    } catch (e) { logger.error('project:mcpList error:', e); throw e; }
  });

  ipcMain.handle('project:applyMcp', async (_event, projectId: string, mcpName: string, agentId: string) => {
    try {
      const d = getDb();
      const proj = getProject(d, projectId);
      const agent = getAgent(d, agentId);
      if (!proj || !agent) throw new Error('Project or agent not found');
      const template = effectiveAsTemplate(agent, resolveTemplateForAgent(agent));
      if (!template) throw new Error('No matching agent template found');
      const mcp = listMcps(d).find(m => m.name === mcpName);
      if (mcp) ensureMcpInWorkspace(mcp);
      const secretStore = await createSecretStore(d);
      return await syncProjectMcpToWorkspace(d, proj, agent, template, mcpName, getDataDir(), secretStore);
    } catch (e) { logger.error('project:applyMcp error:', e); throw e; }
  });

  ipcMain.handle('project:unapplyMcp', (_event, projectId: string, mcpName: string, agentId: string) => {
    try {
      const d = getDb();
      const proj = getProject(d, projectId);
      const agent = getAgent(d, agentId);
      if (!proj || !agent) throw new Error('Project or agent not found');
      const template = effectiveAsTemplate(agent, resolveTemplateForAgent(agent));
      if (!template) throw new Error('No matching agent template found');
      return unsyncProjectMcpFromWorkspace(d, proj, agent, template, mcpName);
    } catch (e) { logger.error('project:unapplyMcp error:', e); throw e; }
  });

  ipcMain.handle('project:availableMcps', (_event, projectId: string, agentId?: string) => {
    try {
      const d = getDb();
      const allMcps = listMcps(d);
      if (agentId) {
        const appliedMcpIds = d.prepare(
          `SELECT DISTINCT resource_id FROM project_resource_agent WHERE project_id = ? AND agent_id = ? AND resource_type = 'mcp'`,
        ).all(projectId, agentId) as { resource_id: string }[];
        const appliedSet = new Set(appliedMcpIds.map((r) => r.resource_id));
        return allMcps.filter((m) => !appliedSet.has(m.id));
      }
      return allMcps;
    } catch (e) { logger.error('project:availableMcps error:', e); throw e; }
  });

  // Project reverse scan: discover skills/MCPs configured directly under a project's agent dirs
  function getProjectScanAgents(projectId: string) {
    const d = getDb();
    const enabled = getEnabledAgentsForProject(d, projectId);
    const enabledIds = new Set(enabled.map((e) => e.agentId));
    return listAgents(d).filter((a) => enabledIds.has(a.id));
  }

  ipcMain.handle('project:scanSkills', (_event, projectId: string) => {
    try {
      const d = getDb();
      const proj = getProject(d, projectId);
      if (!proj) throw new Error('Project not found');
      return { skills: scanSkillsFromProject(d, proj, getProjectScanAgents(projectId)) };
    } catch (e) { logger.error('project:scanSkills error:', e); throw e; }
  });

  ipcMain.handle('project:scanMcps', (_event, projectId: string) => {
    try {
      const d = getDb();
      const proj = getProject(d, projectId);
      if (!proj) throw new Error('Project not found');
      return { mcps: scanMcpsFromProject(d, proj, getProjectScanAgents(projectId)) };
    } catch (e) { logger.error('project:scanMcps error:', e); throw e; }
  });

  ipcMain.handle('project:importScannedSkills', (_event, skills: unknown[]) => {
    try {
      return importScannedSkills(getDb(), skills as any, getDataDir());
    } catch (e) { logger.error('project:importScannedSkills error:', e); throw e; }
  });

  ipcMain.handle('project:importScannedMcps', (_event, mcps: unknown[]) => {
    try {
      return importScannedMcps(getDb(), mcps as any, getDataDir());
    } catch (e) { logger.error('project:importScannedMcps error:', e); throw e; }
  });

  // Logger handlers
  ipcMain.handle('logger:getPath', () => getLogFilePath());
  ipcMain.handle('logger:setDebug', (_event, enabled: boolean) => setDebugMode(enabled));
  ipcMain.handle('logger:isDebug', () => isDebugMode());

  // App settings (theme, language, etc.) — key/value in workspace_config
  ipcMain.handle('settings:get', (_event, key: string) => getSetting(getDb(), key));
  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    setSetting(getDb(), key, value);
  });
}

export function cleanupIpc(): void {
  if (db) {
    closeDatabase(db);
    db = null;
  }
}
