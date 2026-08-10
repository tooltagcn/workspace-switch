import type { SkillProvider } from './types.js';

const providers = new Map<string, SkillProvider>();

export function registerSkillProvider(provider: SkillProvider): void {
  providers.set(provider.id, provider);
}

export function getSkillProvider(id: string): SkillProvider | undefined {
  return providers.get(id);
}

export function listSkillProviders(): SkillProvider[] {
  return [...providers.values()];
}
