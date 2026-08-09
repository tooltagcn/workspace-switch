import type { WsMcpSchema } from '../mcp/schema.js';

export type ScanMode = 'agents' | 'home' | 'full';

export type ScanClassification = 'new' | 'conflict' | 'synced';

export interface ScannedSkill {
  name: string;
  agentId: string;
  agentName: string;
  sourcePath: string;
  classification: ScanClassification;
  description: string | null;
}

export interface ScannedMcp {
  name: string;
  agentId: string;
  agentName: string;
  sourcePath: string;
  classification: ScanClassification;
  schema: WsMcpSchema;
}

export interface DiscoveredFolder {
  path: string;
  dirName: string;
  matchedAgentId: string | null;
  matchedAgentName: string | null;
}

export interface ReverseScanResult {
  skills: ScannedSkill[];
  mcps: ScannedMcp[];
  discoveredFolders: DiscoveredFolder[];
  mode: ScanMode;
}
