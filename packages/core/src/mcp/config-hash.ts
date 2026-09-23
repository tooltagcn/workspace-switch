import { createHash } from 'node:crypto';

export function computeConfigHash(fields: {
  transport: string | null;
  command: string | null;
  url: string | null;
  argsJson: string | null;
  envJson: string | null;
  headersJson?: string | null;
}): string {
  const raw = [
    fields.transport ?? '',
    fields.command ?? '',
    fields.url ?? '',
    fields.argsJson ?? '',
    fields.envJson ?? '',
  ];
  // Only fold headers in when present so configs created before header support
  // keep a stable hash (empty headers must not invalidate applied state).
  if (fields.headersJson) raw.push(fields.headersJson);
  return createHash('sha256').update(raw.join('|')).digest('hex');
}
