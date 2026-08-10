import type { SkillProvider, SkillSearchResult } from './types.js';
import { searchSkillsOnline, installSkillFromRegistry } from '../registry.js';

export class SkillsShProvider implements SkillProvider {
  readonly id = 'skills-sh';
  readonly name = 'skills.sh';
  readonly description = 'Search and install from the skills.sh registry';
  readonly inputPlaceholder = 'Search skills...';

  async search(query: string): Promise<SkillSearchResult[]> {
    return searchSkillsOnline(query);
  }

  async install(name: string, _source: string, skillsDir: string) {
    return installSkillFromRegistry({ skillsDir, skillName: name });
  }
}
