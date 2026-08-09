const { contextBridge, ipcRenderer } = require('electron');

const api = {
  // Agent operations
  listAgents: () => ipcRenderer.invoke('agent:list'),
  listAllAgents: () => ipcRenderer.invoke('agent:listAll'),
  getAgent: (id) => ipcRenderer.invoke('agent:get', id),
  createAgent: (data) => ipcRenderer.invoke('agent:create', data),
  updateAgent: (id, data) => ipcRenderer.invoke('agent:update', id, data),
  deleteAgent: (id) => ipcRenderer.invoke('agent:delete', id),

  // Skill operations
  listSkills: () => ipcRenderer.invoke('skill:list'),
  getSkill: (id) => ipcRenderer.invoke('skill:get', id),
  createSkill: (data) => ipcRenderer.invoke('skill:create', data),
  updateSkill: (id, data) => ipcRenderer.invoke('skill:update', id, data),
  deleteSkill: (id) => ipcRenderer.invoke('skill:delete', id),
  addSkillTag: (skillId, tag) => ipcRenderer.invoke('skill:addTag', skillId, tag),
  removeSkillTag: (skillId, tag) => ipcRenderer.invoke('skill:removeTag', skillId, tag),

  // Skill scan / apply
  scanSkills: (mode) => ipcRenderer.invoke('skill:scan', mode),
  applySkill: (skillId, agentId) => ipcRenderer.invoke('skill:apply', skillId, agentId),
  unapplySkill: (skillId, agentId) => ipcRenderer.invoke('skill:unapply', skillId, agentId),
  getAppliedAgentsForSkill: (skillId) => ipcRenderer.invoke('skill:appliedAgents', skillId),
  importScannedSkills: (skills) => ipcRenderer.invoke('skill:importScanned', skills),
  checkSkillConsistency: () => ipcRenderer.invoke('skill:doctor'),
  fixSkillConsistency: () => ipcRenderer.invoke('skill:fixDoctor'),

  // MCP operations
  listMcps: () => ipcRenderer.invoke('mcp:list'),
  getMcp: (id) => ipcRenderer.invoke('mcp:get', id),
  createMcp: (data) => ipcRenderer.invoke('mcp:create', data),
  updateMcp: (id, data) => ipcRenderer.invoke('mcp:update', id, data),
  deleteMcp: (id) => ipcRenderer.invoke('mcp:delete', id),

  // MCP scan / apply
  scanMcps: (mode) => ipcRenderer.invoke('mcp:scan', mode),
  applyMcp: (mcpId, agentId) => ipcRenderer.invoke('mcp:apply', mcpId, agentId),
  previewMcpApply: (mcpId, agentId) => ipcRenderer.invoke('mcp:previewApply', mcpId, agentId),
  getAppliedAgentsForMcp: (mcpId) => ipcRenderer.invoke('mcp:appliedAgents', mcpId),
  importScannedMcps: (mcps) => ipcRenderer.invoke('mcp:importScanned', mcps),
  checkMcpConsistency: () => ipcRenderer.invoke('mcp:doctor'),
  fixMcpConsistency: () => ipcRenderer.invoke('mcp:fixDoctor'),

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
};

contextBridge.exposeInMainWorld('wsApi', api);
console.log('[WS] Preload script loaded, wsApi exposed');
