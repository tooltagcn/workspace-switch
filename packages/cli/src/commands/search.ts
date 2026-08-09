import { Command } from 'commander';
import {
  listSkills,
  listMcps,
  listProviders,
  buildIndex,
  searchAll,
} from '@ws/core';
import type { SearchableItem } from '@ws/core';
import { createContext, cleanupContext } from '../lib/context.js';
import { outputJson, outputTable, success } from '../lib/output.js';

export function registerSearch(program: Command): void {
  program
    .command('search')
    .description('Search across skills, MCPs, and providers')
    .argument('<keyword>', 'Search keyword')
    .action(async (keyword, _options, cmd) => {
      const ctx = createContext(cmd);
      try {
        const items: SearchableItem[] = [];

        const skills = listSkills(ctx.db);
        for (const s of skills) {
          items.push({
            id: s.id,
            type: 'skill',
            name: s.name,
            description: s.description,
          });
        }

        const mcps = listMcps(ctx.db);
        for (const m of mcps) {
          items.push({
            id: m.id,
            type: 'mcp',
            name: m.name,
            description: m.description,
          });
        }

        const providers = listProviders(ctx.db);
        for (const p of providers) {
          items.push({
            id: p.id,
            type: 'provider',
            name: p.name,
            description: p.baseUrl,
          });
        }

        buildIndex(items);
        const results = searchAll(keyword);

        const enriched = results.map((r) => {
          const item = items.find((i) => i.id === r.id);
          return {
            ...r,
            name: item?.name ?? '',
            description: item?.description ?? null,
          };
        });

        if (ctx.json) {
          outputJson(enriched);
        } else {
          if (enriched.length === 0) {
            success('No results found.');
          } else {
            outputTable(
              ['Type', 'Name', 'Field', 'Description'],
              enriched.map((r) => [r.type, r.name, r.field, r.description ?? '-']),
            );
          }
        }
      } finally {
        cleanupContext(ctx);
      }
    });
}
