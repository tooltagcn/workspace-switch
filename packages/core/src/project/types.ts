export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name?: string;
  path: string;
}

export interface UpdateProjectInput {
  name?: string;
}

export interface ProjectAgentEnablement {
  agentId: string;
  agentName: string;
  configDirName: string;
  enabled: boolean;
}

export interface ProjectWithAgents extends Project {
  agents: ProjectAgentEnablement[];
}

export interface ProjectSkill {
  skillId: string;
  name: string;
  description: string | null;
  tags: string[];
  appliedAgents: string[];
  brokenAgents: string[];
}
