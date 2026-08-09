export interface AgentTemplatePlugin {
  name: string;
  version: string;
  apiVersion: number;
  templates: PluginTemplate[];
}

export interface PluginTemplate {
  agentType: string;
  format: string;
  content: string;
}

export const SUPPORTED_API_VERSION = 1;

export interface LoadPluginsResult {
  loaded: AgentTemplatePlugin[];
  errors: PluginLoadError[];
}

export interface PluginLoadError {
  pluginName: string;
  reason: string;
}
