export type TargetFormat = 'json-map' | 'toml-table' | 'yaml';

export interface EntryFormat {
  format: TargetFormat;
  envTransform: string;
  fieldMapping?: Record<string, string>;
  /** Merge `args` into the `command` value as a single array (opencode dialect). */
  mergeArgs?: boolean;
  /** Always emit `command` as an array `[command, ...args]`, even with no args (opencode requires array). */
  commandArray?: boolean;
  /** Static `type` field added per entry, keyed by transport (`stdio` | `sse` | `http`). */
  typeByTransport?: { stdio?: string; sse?: string; http?: string };
  /** Static literal fields added to every entry (e.g. `{ enabled: true }`). */
  staticEntryFields?: Record<string, unknown>;
}

export interface LegacyDefaults {
  configDirName?: string;
  skillDir?: string | null;
  mcpFile?: string | null;
  mcpField?: string | null;
  targetFormat?: TargetFormat | null;
  envTransform?: string;
  fieldMapping?: Record<string, string>;
}

export interface AgentTemplate {
  id: string;
  name: string;
  configDirName: string;
  candidateDirNames?: string[];
  skillDir?: string | null;
  mcpFile?: string | null;
  mcpField?: string | null;
  icon?: string | null;
  targetFormat?: TargetFormat | null;
  entryFormat?: EntryFormat;
  /** Legacy default values from a previous template version used to migrate stale agent rows. */
  legacyDefaults?: LegacyDefaults;
}
