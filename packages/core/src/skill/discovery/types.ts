export interface SkillSearchResult {
  name: string;
  description: string;
  source: string;
}

export interface SkillProvider {
  id: string;
  name: string;
  description: string;
  inputPlaceholder: string;
  search(query: string): Promise<SkillSearchResult[]>;
  install(name: string, source: string, skillsDir: string): Promise<{ name: string; dir: string }>;
}
