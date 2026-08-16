const { contextBridge, ipcRenderer } = require('electron');

const api = {
  // Agent operations
  listAgents: () => ipcRenderer.invoke('agent:list'),
  listAllAgents: () => ipcRenderer.invoke('agent:listAll'),
  getAgent: (id) => ipcRenderer.invoke('agent:get', id),
  createAgent: (data) => ipcRenderer.invoke('agent:create', data),
  updateAgent: (id, data) => ipcRenderer.invoke('agent:update', id, data),
  deleteAgent: (id) => ipcRenderer.invoke('agent:delete', id),
  updateAgentTemplate: (id, templateId) => ipcRenderer.invoke('agent:update', id, { templateId }),
  updateAgentMcpConfigPath: (id, mcpConfigPath) => ipcRenderer.invoke('agent:update', id, { mcpConfigPath }),
  listTemplates: () => ipcRenderer.invoke('template:list'),

  // Skill operations
  listSkills: () => ipcRenderer.invoke('skill:list'),
  getSkill: (id) => ipcRenderer.invoke('skill:get', id),
  createSkill: (data) => ipcRenderer.invoke('skill:create', data),
  updateSkill: (id, data) => ipcRenderer.invoke('skill:update', id, data),
  deleteSkill: (id) => ipcRenderer.invoke('skill:delete', id),
  addSkillTag: (skillId, tag) => ipcRenderer.invoke('skill:addTag', skillId, tag),
  removeSkillTag: (skillId, tag) => ipcRenderer.invoke('skill:removeTag', skillId, tag),

  // Skill scan / apply
  scanSkills: () => ipcRenderer.invoke('skill:scan'),
  applySkill: (skillId, agentId) => ipcRenderer.invoke('skill:apply', skillId, agentId),
  unapplySkill: (skillId, agentId) => ipcRenderer.invoke('skill:unapply', skillId, agentId),
  getAppliedAgentsForSkill: (skillId) => ipcRenderer.invoke('skill:appliedAgents', skillId),
  importScannedSkills: (skills) => ipcRenderer.invoke('skill:importScanned', skills),
  checkSkillConsistency: () => ipcRenderer.invoke('skill:doctor'),
  fixSkillConsistency: () => ipcRenderer.invoke('skill:fixDoctor'),
  importSkillFromLocal: (sourcePath, name) => ipcRenderer.invoke('skill:importLocal', sourcePath, name),
  importSkillFromArchive: (archivePath, name) => ipcRenderer.invoke('skill:importArchive', archivePath, name),
  searchSkillDiscovery: (providerId, query) => ipcRenderer.invoke('skill:discovery:search', providerId, query),
  installSkillDiscovery: (providerId, name, source) => ipcRenderer.invoke('skill:discovery:install', providerId, name, source),
  listSkillProviders: () => ipcRenderer.invoke('skill:discovery:providers'),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  // MCP operations
  listMcps: () => ipcRenderer.invoke('mcp:list'),
  getMcp: (id) => ipcRenderer.invoke('mcp:get', id),
  createMcp: (data) => ipcRenderer.invoke('mcp:create', data),
  updateMcp: (id, data) => ipcRenderer.invoke('mcp:update', id, data),
  deleteMcp: (id) => ipcRenderer.invoke('mcp:delete', id),

  // MCP scan / apply
  scanMcps: () => ipcRenderer.invoke('mcp:scan'),
  applyMcp: (mcpId, agentId) => ipcRenderer.invoke('mcp:apply', mcpId, agentId),
  unapplyMcp: (mcpId, agentId) => ipcRenderer.invoke('mcp:unapply', mcpId, agentId),
  syncMcp: (mcpId) => ipcRenderer.invoke('mcp:sync', mcpId),
  previewMcpApply: (mcpId, agentId) => ipcRenderer.invoke('mcp:previewApply', mcpId, agentId),
  getAppliedAgentsForMcp: (mcpId) => ipcRenderer.invoke('mcp:appliedAgents', mcpId),
  importScannedMcps: (mcps) => ipcRenderer.invoke('mcp:importScanned', mcps),
  checkMcpConsistency: () => ipcRenderer.invoke('mcp:doctor'),
  fixMcpConsistency: () => ipcRenderer.invoke('mcp:fixDoctor'),
  testMcp: (mcpId) => ipcRenderer.invoke('mcp:test', mcpId),
  batchTestMcps: () => ipcRenderer.invoke('mcp:batchTest'),
  callMcpTool: (mcpId, toolName, args) => ipcRenderer.invoke('mcp:callTool', mcpId, toolName, args),
  getMcpTools: (mcpId) => ipcRenderer.invoke('mcp:getTools', mcpId),
  getMcpPrompts: (mcpId) => ipcRenderer.invoke('mcp:getPrompts', mcpId),
  getMcpTestResult: (mcpId) => ipcRenderer.invoke('mcp:getTestResult', mcpId),
  isKeychainAvailable: () => ipcRenderer.invoke('mcp:isKeychainAvailable'),
  storeSecret: (mcpName, varName, value) => ipcRenderer.invoke('mcp:storeSecret', mcpName, varName, value),
  deleteSecret: (mcpName, varName) => ipcRenderer.invoke('mcp:deleteSecret', mcpName, varName),
  onBatchTestProgress: (callback) => ipcRenderer.on('mcp:batch-test-progress', (_event, progress) => callback(progress)),
  onBatchTestResult: (callback) => ipcRenderer.on('mcp:batch-test-result', (_event, result) => callback(result)),
  removeBatchTestListeners: () => {
    ipcRenderer.removeAllListeners('mcp:batch-test-progress');
    ipcRenderer.removeAllListeners('mcp:batch-test-result');
  },

  // Provider operations
  listProviders: () => ipcRenderer.invoke('provider:list'),
  getProvider: (id) => ipcRenderer.invoke('provider:get', id),
  createProvider: (data) => ipcRenderer.invoke('provider:create', data),
  updateProvider: (id, data) => ipcRenderer.invoke('provider:update', id, data),
  deleteProvider: (id) => ipcRenderer.invoke('provider:delete', id),
  setProviderApiKey: (providerName, apiKey) => ipcRenderer.invoke('provider:setApiKey', providerName, apiKey),
  getProviderApiKey: (providerName) => ipcRenderer.invoke('provider:getApiKey', providerName),
  isKeytarSupported: () => ipcRenderer.invoke('provider:isKeytarSupported'),

  // Tag operations
  listTags: () => ipcRenderer.invoke('tag:list'),
  createTag: (data) => ipcRenderer.invoke('tag:create', data),
  renameTag: (id, name) => ipcRenderer.invoke('tag:rename', id, name),
  deleteTag: (id) => ipcRenderer.invoke('tag:delete', id),

  // Search
  search: (query) => ipcRenderer.invoke('search', query),

  // Project operations
  projectList: (search) => ipcRenderer.invoke('project:list', search),
  projectGet: (id) => ipcRenderer.invoke('project:get', id),
  projectCreate: (data) => ipcRenderer.invoke('project:create', data),
  projectUpdate: (id, data) => ipcRenderer.invoke('project:update', id, data),
  projectDelete: (id) => ipcRenderer.invoke('project:delete', id),
  projectToggleAgent: (projectId, agentId, enabled) => ipcRenderer.invoke('project:toggleAgent', projectId, agentId, enabled),
  projectSkillList: (projectId) => ipcRenderer.invoke('project:skillList', projectId),
  projectApplySkill: (projectId, skillId, agentId) => ipcRenderer.invoke('project:applySkill', projectId, skillId, agentId),
  projectUnapplySkill: (projectId, skillId, agentId) => ipcRenderer.invoke('project:unapplySkill', projectId, skillId, agentId),
  projectAvailableSkills: (projectId, agentId) => ipcRenderer.invoke('project:availableSkills', projectId, agentId),
  projectMcpList: (projectId) => ipcRenderer.invoke('project:mcpList', projectId),
  projectApplyMcp: (projectId, mcpName, agentId) => ipcRenderer.invoke('project:applyMcp', projectId, mcpName, agentId),
  projectUnapplyMcp: (projectId, mcpName, agentId) => ipcRenderer.invoke('project:unapplyMcp', projectId, mcpName, agentId),
  projectAvailableMcps: (projectId, agentId) => ipcRenderer.invoke('project:availableMcps', projectId, agentId),
  projectScanSkills: (projectId) => ipcRenderer.invoke('project:scanSkills', projectId),
  projectScanMcps: (projectId) => ipcRenderer.invoke('project:scanMcps', projectId),
  projectImportScannedSkills: (skills) => ipcRenderer.invoke('project:importScannedSkills', skills),
  projectImportScannedMcps: (mcps) => ipcRenderer.invoke('project:importScannedMcps', mcps),

  // Logger
  getLogPath: () => ipcRenderer.invoke('logger:getPath'),
  setDebugMode: (enabled) => ipcRenderer.invoke('logger:setDebug', enabled),
  isDebugMode: () => ipcRenderer.invoke('logger:isDebug'),

  // App settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
};

contextBridge.exposeInMainWorld('wsApi', api);
console.log('[WS] Preload script loaded, wsApi exposed');
