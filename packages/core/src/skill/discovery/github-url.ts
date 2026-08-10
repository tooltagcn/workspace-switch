import type { SkillProvider, SkillSearchResult } from './types.js';
import { importSkillFromGit, normalizeGitUrl } from '../import.js';

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  const fullMatch = trimmed.match(
    /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/,
  );
  if (fullMatch) {
    return { owner: fullMatch[1], repo: fullMatch[2] };
  }

  const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

export class GitHubUrlProvider implements SkillProvider {
  readonly id = 'github-url';
  readonly name = 'GitHub URL';
  readonly description = 'Install a skill from a GitHub repository URL';
  readonly inputPlaceholder = 'Paste GitHub URL (e.g. owner/repo)';

  async search(query: string): Promise<SkillSearchResult[]> {
    const parsed = parseGitHubUrl(query);
    if (!parsed) return [];

    const gitUrl = normalizeGitUrl(query.trim());
    return [
      {
        name: parsed.repo,
        description: `${parsed.owner}/${parsed.repo}`,
        source: gitUrl,
      },
    ];
  }

  async install(name: string, source: string, skillsDir: string) {
    return importSkillFromGit(source, name, { skillsDir });
  }
}
