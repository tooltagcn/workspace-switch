import type { McpTransport } from './types.js';

export interface WsMcpSchema {
  name: string;
  transport: McpTransport;
  command?: string;
  url?: string;
  args?: string[];
  env?: Record<string, string>;
  description?: string;
}

export interface WsSchemaValidationError {
  field: string;
  message: string;
}

export interface WsSchemaValidationResult {
  valid: boolean;
  errors: WsSchemaValidationError[];
}

const VALID_TRANSPORTS: McpTransport[] = ['stdio', 'sse', 'http'];

export function validateWsSchema(schema: WsMcpSchema): WsSchemaValidationResult {
  const errors: WsSchemaValidationError[] = [];

  if (!schema.name || schema.name.trim() === '') {
    errors.push({ field: 'name', message: 'name is required' });
  }

  if (!schema.transport) {
    errors.push({ field: 'transport', message: 'transport is required' });
  } else if (!VALID_TRANSPORTS.includes(schema.transport)) {
    errors.push({
      field: 'transport',
      message: `transport must be one of: ${VALID_TRANSPORTS.join(', ')}`,
    });
  }

  if (schema.transport === 'stdio' && !schema.command) {
    errors.push({ field: 'command', message: 'command is required for stdio transport' });
  }

  if ((schema.transport === 'sse' || schema.transport === 'http') && !schema.url) {
    errors.push({ field: 'url', message: 'url is required for sse/http transport' });
  }

  return { valid: errors.length === 0, errors };
}
