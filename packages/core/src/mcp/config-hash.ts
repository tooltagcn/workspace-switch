import { createHash } from 'node:crypto';

export function computeConfigHash(fields: {
  transport: string | null;
  command: string | null;
  url: string | null;
  argsJson: string | null;
  envJson: string | null;
}): string {
  const raw = [
    fields.transport ?? '',
    fields.command ?? '',
    fields.url ?? '',
    fields.argsJson ?? '',
    fields.envJson ?? '',
  ].join('|');
  return createHash('sha256').update(raw).digest('hex');
}
