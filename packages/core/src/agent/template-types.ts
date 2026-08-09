export type TargetFormat = 'json-map' | 'toml-table' | 'yaml';

export interface EntryFormat {
  format: TargetFormat;
  envTransform: string;
  fieldMapping?: Record<string, string>;
}

export interface AgentTemplate {
  id: string;
  name: string;
  configDirName: string;
  candidateDirNames?: string[];
  mcpFile: string | null;
  mcpField: string | null;
  skillDir: string | null;
  icon: string | null;
  targetFormat?: TargetFormat;
  entryFormat?: EntryFormat;
}
