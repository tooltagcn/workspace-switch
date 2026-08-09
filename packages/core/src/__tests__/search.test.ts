import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildIndex,
  searchAll,
  addToIndex,
  removeFromIndex,
  updateInIndex,
  resetIndex,
  registerItemType,
} from '../search/index.js';
import type { SearchableItem } from '../search/index.js';

describe('Search', () => {
  beforeEach(() => {
    resetIndex();
  });

  it('searches by name', () => {
    const items: SearchableItem[] = [
      { id: '1', type: 'skill', name: 'React Hooks', description: 'A guide to hooks' },
      { id: '2', type: 'mcp', name: 'Node Server', description: 'MCP server for Node' },
    ];
    buildIndex(items);

    const results = searchAll('React');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
    expect(results[0].field).toBe('name');
  });

  it('searches by description', () => {
    const items: SearchableItem[] = [
      { id: '1', type: 'skill', name: 'Alpha', description: 'TypeScript testing tools' },
      { id: '2', type: 'mcp', name: 'Beta', description: 'Python utilities' },
    ];
    buildIndex(items);

    const results = searchAll('TypeScript');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
    expect(results[0].field).toBe('description');
  });

  it('returns empty for no match', () => {
    buildIndex([{ id: '1', type: 'skill', name: 'Test', description: null }]);
    expect(searchAll('nonexistent')).toEqual([]);
  });

  it('handles incremental add/remove', () => {
    const item: SearchableItem = { id: '1', type: 'skill', name: 'Vue', description: null };
    registerItemType('1', 'skill');
    addToIndex(item);
    expect(searchAll('Vue')).toHaveLength(1);

    removeFromIndex('1');
    expect(searchAll('Vue')).toEqual([]);
  });

  it('handles update in index', () => {
    const item: SearchableItem = { id: '1', type: 'skill', name: 'Old', description: null };
    buildIndex([item]);
    expect(searchAll('Old')).toHaveLength(1);

    updateInIndex({ ...item, name: 'New' });
    expect(searchAll('Old')).toEqual([]);
    expect(searchAll('New')).toHaveLength(1);
  });

  it('searches 1000 items under 200ms', () => {
    const items: SearchableItem[] = [];
    for (let i = 0; i < 1000; i++) {
      items.push({
        id: `item-${i}`,
        type: i % 3 === 0 ? 'skill' : i % 3 === 1 ? 'mcp' : 'provider',
        name: `Item ${i}`,
        description: `Description for item ${i} with some text`,
      });
    }

    const start = performance.now();
    buildIndex(items);
    const results = searchAll('Item 500');
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });

  it('does not duplicate results from name and description', () => {
    buildIndex([
      { id: '1', type: 'skill', name: 'TypeScript', description: 'TypeScript guide' },
    ]);
    const results = searchAll('TypeScript');
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
