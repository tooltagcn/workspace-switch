export { getDatabase, closeDatabase } from './db/index.js';
export { migrate, verifyMigration } from './db/migrate.js';
export { SCHEMA_SQL, EXPECTED_TABLES } from './db/schema.js';
export type { TableName } from './db/schema.js';

export type { Agent, CreateAgentInput, UpdateAgentInput } from './agent/types.js';
export {
  listAgents,
  listAllAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from './agent/registry.js';

export type { AgentTemplate } from './agent/template-types.js';
export { loadTemplates, getTemplate, resolveTemplateForAgent } from './agent/template-loader.js';
export { effectiveAsTemplate } from './agent/effective-config.js';
export { validateAgentTemplate, validateTemplateJsonSchema } from './agent/template-validator.js';
export type { TemplateValidationResult } from './agent/template-validator.js';
export { expandAgentPaths, resolveCandidateDirNames, expandCustomPath, resolveMcpConfigPath } from './agent/expand-paths.js';
export type { ExpandedPaths } from './agent/expand-paths.js';
export { initBuiltinAgents } from './agent/init-builtins.js';
export { detectAgents } from './agent/detect.js';
export type { DetectionResult } from './agent/detect.js';

export { validateTargetPath, PathValidationError } from './security/path-validator.js';

export type { Skill, CreateSkillInput, UpdateSkillInput, SkillListFilter } from './skill/types.js';
export {
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  addTag,
  removeTag,
  setTags,
  createSkillManually,
} from './skill/manager.js';
export type { CreateManualSkillOptions, ManualSkillResult } from './skill/manager.js';

export type { ImportOptions, ImportResult, OnDuplicate } from './skill/import.js';
export { importSkillFromLocal, importSkillFromGit, normalizeGitUrl } from './skill/import.js';

export { importSkillFromArchive } from './skill/archive.js';

export type { SkillSearchResult as RegistrySearchResult, InstallFromRegistryOptions, InstallResult } from './skill/registry.js';
export { searchSkillsOnline, installSkillFromRegistry } from './skill/registry.js';

export type { SkillSearchResult, SkillProvider } from './skill/discovery/types.js';
export { registerSkillProvider, getSkillProvider, listSkillProviders } from './skill/discovery/registry.js';
export { SkillsShProvider } from './skill/discovery/skills-sh.js';
export { GitHubUrlProvider } from './skill/discovery/github-url.js';

export type { ValidationResult } from './skill/validator.js';
export { validateSkill } from './skill/validator.js';

export { initWorkspace } from './workspace/init.js';
export type { InitWorkspaceResult, WorkspaceSubDir } from './workspace/init.js';

export type { McpServer, CreateMcpInput, UpdateMcpInput, McpListFilter, McpTransport, McpTestStatus, McpTestResult, McpTool, McpPrompt, TestMcpOptions, McpTestReport, BatchTestProgress } from './mcp/types.js';
export {
  listMcps,
  getMcp,
  createMcp,
  updateMcp,
  deleteMcp,
  addMcpTag,
  removeMcpTag,
  setMcpTags,
  saveTestResult,
  getTestResult,
  saveTools,
  getTools,
  savePrompts,
  getPrompts,
} from './mcp/manager.js';

export type { WsMcpSchema, WsSchemaValidationResult, WsSchemaValidationError } from './mcp/schema.js';
export { validateWsSchema } from './mcp/schema.js';

export { saveMcpToWorkspace, loadMcpFromWorkspace, listMcpFromWorkspace } from './mcp/storage.js';

export { computeConfigHash } from './mcp/config-hash.js';
export { testMcpConnection, runTestAndPersist, batchTestMcps, callMcpTool } from './mcp/tester.js';

export type { RenderedMcp } from './mcp/renderer.js';
export { renderMcpForAgent } from './mcp/renderer.js';

export type { McpRenderer, SecretStore } from './mcp/types.js';
export { registerRenderer, getRenderer, listRenderers } from './mcp/renderer-registry.js';
export { KeychainSecretStore, PlaintextSecretStore, isKeychainAvailable, createSecretStore, getWorkspaceConfig, setWorkspaceConfig } from './mcp/secret-store.js';

export type { ApplyMode, ApplyMcpOptions, ApplyMcpResult, PreviewMcpResult } from './mcp/apply.js';
export { applyMcpToAgent, previewMcpApply } from './mcp/apply.js';

export type { TargetFormat } from './agent/template-types.js';

export type { Provider, CreateProviderInput, UpdateProviderInput, ProviderListFilter } from './provider/types.js';
export {
  listProviders,
  getProvider,
  getProviderByName,
  createProvider,
  updateProvider,
  deleteProvider,
  setApiKeyRef,
} from './provider/manager.js';
export { isKeytarSupported, setApiKey, getApiKey, deleteApiKey, getServiceName } from './provider/keychain.js';
export type { ApplyProviderResult } from './provider/apply.js';
export { applyProviderToAgent, getProviderForAgent } from './provider/apply.js';

export type { SymlinkPlatform } from './sync/platform.js';
export { getSymlinkImpl } from './sync/symlink.js';
export { darwinSymlink } from './sync/symlink-darwin.js';
export { win32Symlink } from './sync/symlink-win32.js';
export { linuxSymlink } from './sync/symlink-linux.js';
export type { BrokenSymlink } from './sync/check-broken.js';
export { checkBrokenSymlinks } from './sync/check-broken.js';
export type { SyncResult, SyncAgentAllResult, AppliedAgent } from './sync/agent-sync.js';
export { syncSkillToWorkspace, unsyncSkillFromWorkspace, syncMcpToWorkspace, unsyncMcpFromWorkspace, unsyncAllMcpsFromAgent, syncAgentAll, getAppliedAgentsForResource, getAppliedAgentsForSkill, getAppliedAgentsForMcp } from './sync/agent-sync.js';

export type { ConsistencyResult, ConsistencyItem, FixResult } from './sync/consistency.js';
export { checkSkillConsistency, fixSkillConsistency, checkMcpConsistency, fixMcpConsistency } from './sync/consistency.js';

export type { ScanMode, ScanClassification, ScannedSkill, ScannedMcp, DiscoveredFolder, ReverseScanResult } from './scan/types.js';
export { scanSkillsFromAgents, scanMcpsFromAgents } from './scan/agent-scanner.js';
export { scanHomeHiddenFolders, scanSkillsFromFolders, scanMcpsFromFolders } from './scan/home-scanner.js';
export type { ImportSkillResult, ImportMcpResult } from './scan/importer.js';
export { importScannedSkills, importScannedMcps } from './scan/importer.js';

export type { Tag, CreateTagInput, RenameTagInput } from './tag/manager.js';
export { listTags, getTag, getTagByName, createTag, renameTag, mergeTags, deleteTag } from './tag/manager.js';

export type { SearchableItem, SearchResult } from './search/index.js';
export { buildIndex, searchAll, addToIndex, removeFromIndex, updateInIndex, resetIndex } from './search/index.js';

export type { LockLevel, LockOptions } from './lock/index.js';
export { withLock, LockQueue } from './lock/index.js';

export { initI18n, t, changeLanguage, resetI18n } from './i18n/index.js';

export type { IntegrityResult } from './workspace/integrity.js';
export { verifyWorkspaceIntegrity, computeChecksum, writeChecksum } from './workspace/integrity.js';

export type { AgentTemplatePlugin, PluginTemplate, LoadPluginsResult, PluginLoadError } from './plugin/types.js';
export { SUPPORTED_API_VERSION } from './plugin/types.js';
export { loadPlugins, validatePlugin } from './plugin/loader.js';

export type { Project, CreateProjectInput, UpdateProjectInput, ProjectWithAgents, ProjectAgentEnablement, ProjectSkill } from './project/types.js';
export { listProjects, getProject, getProjectWithAgents, createProject, updateProject, deleteProject } from './project/manager.js';
export { getEnabledAgentsForProject, toggleAgentForProject, initializeProjectAgents } from './project/agent-enablement.js';
export { syncProjectSkillToWorkspace, unsyncProjectSkillFromWorkspace, syncProjectMcpToWorkspace, unsyncProjectMcpFromWorkspace, getProjectSkillList, cleanupProjectResources } from './sync/project-sync.js';
