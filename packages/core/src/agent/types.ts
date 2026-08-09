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
}
