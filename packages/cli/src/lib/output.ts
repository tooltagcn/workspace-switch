import type { Command } from 'commander';

export function getJsonMode(cmd: Command): boolean {
  const opts = cmd.optsWithGlobals();
  return !!opts.json;
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputTable(
  headers: string[],
  rows: string[][],
): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)),
  );

  const sep = widths.map((w) => '-'.repeat(w + 2)).join('+');
  const fmt = (cols: string[]) =>
    cols.map((c, i) => ` ${c.padEnd(widths[i])} `).join('|');

  console.log(fmt(headers));
  console.log(sep);
  for (const row of rows) {
    console.log(fmt(row));
  }
}

export function outputKeyValue(pairs: [string, string | null | undefined][]): void {
  const maxKey = Math.max(...pairs.map(([k]) => k.length));
  for (const [key, value] of pairs) {
    console.log(`${key.padEnd(maxKey)}  ${value ?? '-'}`);
  }
}

export function success(message: string): void {
  console.log(message);
}

export function warn(message: string): void {
  console.warn(`Warning: ${message}`);
}

export function verbose(ctx: { verbose: boolean }, message: string): void {
  if (ctx.verbose) {
    console.log(`[verbose] ${message}`);
  }
}

export function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}
