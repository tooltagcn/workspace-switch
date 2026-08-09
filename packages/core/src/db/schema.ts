export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agent (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  builtin INTEGER NOT NULL DEFAULT 0,
  config_dir_name TEXT NOT NULL,
  user_root TEXT,
  project_root TEXT,
  project_enabled INTEGER NOT NULL DEFAULT 0,
  mcp_file TEXT,
  mcp_field TEXT,
  skill_dir TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  detected_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  source_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcp (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  transport TEXT,
  command TEXT,
  url TEXT,
  args_json TEXT,
  env_json TEXT,
  description TEXT,
  test_status TEXT NOT NULL DEFAULT 'untested',
  test_error TEXT,
  tested_at TEXT,
  config_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provider (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT,
  api_key_ref TEXT,
  default_model TEXT,
  models_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resource_agent (
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  target_path TEXT,
  symlinked INTEGER NOT NULL DEFAULT 0,
  applied_config_hash TEXT,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (resource_type, resource_id, agent_id),
  FOREIGN KEY (agent_id) REFERENCES agent(id)
);

CREATE TABLE IF NOT EXISTS tag (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE IF NOT EXISTS resource_tag (
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (resource_type, resource_id, tag_id),
  FOREIGN KEY (tag_id) REFERENCES tag(id)
);

CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_agent (
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, agent_id),
  FOREIGN KEY (project_id) REFERENCES project(id),
  FOREIGN KEY (agent_id) REFERENCES agent(id)
);

CREATE TABLE IF NOT EXISTS project_resource_agent (
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  target_path TEXT,
  symlinked INTEGER NOT NULL DEFAULT 1,
  applied_config_hash TEXT,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (resource_type, resource_id, project_id, agent_id),
  FOREIGN KEY (project_id) REFERENCES project(id),
  FOREIGN KEY (agent_id) REFERENCES agent(id)
);

CREATE TABLE IF NOT EXISTS mcp_test_result (
  mcp_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  error_message TEXT,
  tools_count INTEGER NOT NULL DEFAULT 0,
  prompts_count INTEGER NOT NULL DEFAULT 0,
  tested_at TEXT NOT NULL,
  FOREIGN KEY (mcp_id) REFERENCES mcp(id)
);

CREATE TABLE IF NOT EXISTS mcp_tool (
  id TEXT PRIMARY KEY,
  mcp_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  input_schema TEXT,
  FOREIGN KEY (mcp_id) REFERENCES mcp(id),
  UNIQUE (mcp_id, name)
);

CREATE TABLE IF NOT EXISTS mcp_prompt (
  id TEXT PRIMARY KEY,
  mcp_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  FOREIGN KEY (mcp_id) REFERENCES mcp(id),
  UNIQUE (mcp_id, name)
);

CREATE TABLE IF NOT EXISTS secret (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspace_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const EXPECTED_TABLES = [
  'agent',
  'skill',
  'mcp',
  'provider',
  'resource_agent',
  'tag',
  'resource_tag',
  'project',
  'project_agent',
  'project_resource_agent',
  'mcp_test_result',
  'mcp_tool',
  'mcp_prompt',
  'secret',
  'workspace_config',
] as const;

export type TableName = (typeof EXPECTED_TABLES)[number];
