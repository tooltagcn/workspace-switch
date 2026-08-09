import type { TargetFormat } from './template-types.js';

const VALID_TARGET_FORMATS: TargetFormat[] = ['json-map', 'toml-table'];

const TEMPLATE_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'configDirName', 'mcpFile', 'mcpField', 'skillDir', 'icon'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    configDirName: { type: 'string', minLength: 1 },
    candidateDirNames: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    mcpFile: { type: ['string', 'null'] },
    mcpField: { type: ['string', 'null'] },
    skillDir: { type: ['string', 'null'] },
    icon: { type: ['string', 'null'] },
    targetFormat: {
      type: ['string', 'null'],
      enum: [...VALID_TARGET_FORMATS, null],
    },
  },
  additionalProperties: false,
} as const;

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAgentTemplate(data: unknown): TemplateValidationResult {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Template must be a non-null object'] };
  }

  const obj = data as Record<string, unknown>;

  for (const field of TEMPLATE_SCHEMA.required) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const stringFields = ['id', 'name', 'configDirName'] as const;
  for (const field of stringFields) {
    if (field in obj && (typeof obj[field] !== 'string' || (obj[field] as string).length === 0)) {
      errors.push(`Field "${field}" must be a non-empty string`);
    }
  }

  const nullableStringFields = ['mcpFile', 'mcpField', 'skillDir', 'icon'] as const;
  for (const field of nullableStringFields) {
    if (field in obj && obj[field] !== null && typeof obj[field] !== 'string') {
      errors.push(`Field "${field}" must be a string or null`);
    }
  }

  if ('candidateDirNames' in obj) {
    if (!Array.isArray(obj.candidateDirNames)) {
      errors.push('Field "candidateDirNames" must be an array');
    } else {
      for (const item of obj.candidateDirNames) {
        if (typeof item !== 'string' || item.length === 0) {
          errors.push('Each item in "candidateDirNames" must be a non-empty string');
        }
      }
    }
  }

  if ('targetFormat' in obj && obj.targetFormat !== null) {
    if (!VALID_TARGET_FORMATS.includes(obj.targetFormat as TargetFormat)) {
      errors.push(
        `Field "targetFormat" must be one of: ${VALID_TARGET_FORMATS.join(', ')}, or null`,
      );
    }
  }

  const knownFields = new Set([
    ...TEMPLATE_SCHEMA.required,
    'candidateDirNames',
    'targetFormat',
  ]);
  for (const key of Object.keys(obj)) {
    if (!knownFields.has(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateTemplateJsonSchema(data: unknown): TemplateValidationResult {
  return validateAgentTemplate(data);
}
