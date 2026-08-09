import type { McpOperation } from './types.js';

export function mutateConfig(
  config: Record<string, unknown>,
  mcpField: string,
  operation: McpOperation,
): Record<string, unknown> {
  const result = { ...config };

  const existingSection = result[mcpField];
  const mcpSection: Record<string, unknown> =
    existingSection && typeof existingSection === 'object' && !Array.isArray(existingSection)
      ? { ...(existingSection as Record<string, unknown>) }
      : {};

  if (operation.type === 'add') {
    mcpSection[operation.name] = operation.entry;
  } else if (operation.type === 'remove') {
    delete mcpSection[operation.name];
  }

  result[mcpField] = mcpSection;
  return result;
}
