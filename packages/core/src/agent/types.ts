export interface Agent {
  id: string;
  name: string;
  builtin: boolean;
  configDirName: string;
  userRoot: string | null;
  projectRoot: string | null;
  projectEnabled: boolean;
  mcpFile: string | null;
  mcpField: string | null;
  skillDir: string | null;
  enabled: boolean;
  detectedAt: string | null;
  templateId: string | null;
  mcpConfigPath: string | null;
  targetFormat: string | null;
  envTransform: string | null;
  fieldMapping: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  id?: string;
  name: string;
  builtin?: boolean;
  configDirName: string;
  userRoot?: string | null;
  projectRoot?: string | null;
  projectEnabled?: boolean;
  mcpFile?: string | null;
  mcpField?: string | null;
  skillDir?: string | null;
  enabled?: boolean;
  detectedAt?: string | null;
  templateId?: string | null;
  mcpConfigPath?: string | null;
  targetFormat?: string | null;
  envTransform?: string | null;
  fieldMapping?: Record<string, string> | null;
}

export interface UpdateAgentInput {
  name?: string;
  configDirName?: string;
  userRoot?: string | null;
  projectRoot?: string | null;
  projectEnabled?: boolean;
  mcpFile?: string | null;
  mcpField?: string | null;
  skillDir?: string | null;
  enabled?: boolean;
  detectedAt?: string | null;
  templateId?: string | null;
  mcpConfigPath?: string | null;
  targetFormat?: string | null;
  envTransform?: string | null;
  fieldMapping?: Record<string, string> | null;
}
