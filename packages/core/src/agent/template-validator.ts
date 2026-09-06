import type { TargetFormat } from './template-types.js';

const VALID_TARGET_FORMATS: TargetFormat[] = ['json-map', 'toml-table', 'yaml'];

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

  if ('legacyDefaults' in obj) {
    const ld = obj.legacyDefaults;
    if (typeof ld !== 'object' || ld === null || Array.isArray(ld)) {
      errors.push('Field "legacyDefaults" must be an object');
    } else {
      const ldObj = ld as Record<string, unknown>;
      for (const field of ['configDirName', 'skillDir', 'mcpFile', 'mcpField', 'envTransform'] as const) {
        if (field in ldObj && ldObj[field] !== null && typeof ldObj[field] !== 'string') {
          errors.push(`Field "legacyDefaults.${field}" must be a string or null`);
        }
      }
      if ('targetFormat' in ldObj && ldObj.targetFormat !== null && !VALID_TARGET_FORMATS.includes(ldObj.targetFormat as TargetFormat)) {
        errors.push(`Field "legacyDefaults.targetFormat" must be one of: ${VALID_TARGET_FORMATS.join(', ')}, or null`);
      }
      if ('fieldMapping' in ldObj) {
        const fm = ldObj.fieldMapping;
        if (typeof fm !== 'object' || fm === null || Array.isArray(fm)) {
          errors.push('Field "legacyDefaults.fieldMapping" must be an object');
        }
      }
    }
  }

  if ('entryFormat' in obj) {
    const ef = obj.entryFormat;
    if (typeof ef !== 'object' || ef === null || Array.isArray(ef)) {
      errors.push('Field "entryFormat" must be an object');
    } else {
      const efObj = ef as Record<string, unknown>;
      if (!('format' in efObj) || typeof efObj.format !== 'string') {
        errors.push('Field "entryFormat.format" must be a string');
      } else if (!VALID_TARGET_FORMATS.includes(efObj.format as TargetFormat)) {
        errors.push(`Field "entryFormat.format" must be one of: ${VALID_TARGET_FORMATS.join(', ')}`);
      }
      if (!('envTransform' in efObj) || typeof efObj.envTransform !== 'string' || (efObj.envTransform as string).length === 0) {
        errors.push('Field "entryFormat.envTransform" must be a non-empty string');
      }
      if ('fieldMapping' in efObj) {
        const fm = efObj.fieldMapping;
        if (typeof fm !== 'object' || fm === null || Array.isArray(fm)) {
          errors.push('Field "entryFormat.fieldMapping" must be an object');
        }
      }
      if ('mergeArgs' in efObj && typeof efObj.mergeArgs !== 'boolean') {
        errors.push('Field "entryFormat.mergeArgs" must be a boolean');
      }
      if ('commandArray' in efObj && typeof efObj.commandArray !== 'boolean') {
        errors.push('Field "entryFormat.commandArray" must be a boolean');
      }
      if ('staticEntryFields' in efObj) {
        const sef = efObj.staticEntryFields;
        if (typeof sef !== 'object' || sef === null || Array.isArray(sef)) {
          errors.push('Field "entryFormat.staticEntryFields" must be an object');
        }
      }
      if ('typeByTransport' in efObj) {
        const tbt = efObj.typeByTransport;
        if (typeof tbt !== 'object' || tbt === null || Array.isArray(tbt)) {
          errors.push('Field "entryFormat.typeByTransport" must be an object');
        } else {
          const tbtObj = tbt as Record<string, unknown>;
          for (const key of ['stdio', 'sse', 'http']) {
            if (key in tbtObj && typeof tbtObj[key] !== 'string') {
              errors.push(`Field "entryFormat.typeByTransport.${key}" must be a string`);
            }
          }
        }
      }
    }
  }

  const knownFields = new Set([
    ...TEMPLATE_SCHEMA.required,
    'candidateDirNames',
    'targetFormat',
    'entryFormat',
    'legacyDefaults',
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
