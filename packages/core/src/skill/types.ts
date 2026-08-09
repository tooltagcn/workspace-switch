export interface Skill {
  id: string;
  name: string;
  description: string | null;
  sourcePath: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillInput {
  id?: string;
  name: string;
  description?: string | null;
  sourcePath?: string | null;
  tags?: string[];
}

export interface UpdateSkillInput {
  name?: string;
  description?: string | null;
  sourcePath?: string | null;
}

export interface SkillListFilter {
  tags?: string[];
}
