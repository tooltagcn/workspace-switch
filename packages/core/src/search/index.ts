import FlexSearch from 'flexsearch';

type DocValue = string | number | boolean | null;

export interface SearchableItem {
  id: string;
  type: 'skill' | 'mcp' | 'provider';
  name: string;
  description: string | null;
  [key: string]: DocValue | DocValue[];
}

export interface SearchResult {
  id: string;
  type: 'skill' | 'mcp' | 'provider';
  field: string;
}

let index: InstanceType<typeof FlexSearch.Document> | null = null;

function getIndex(): InstanceType<typeof FlexSearch.Document> {
  if (!index) {
    index = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['name', 'description'],
      },
      tokenize: 'forward',
    });
  }
  return index;
}

export function addToIndex(item: SearchableItem): void {
  getIndex().add(item);
}

export function removeFromIndex(id: string): void {
  getIndex().remove(id);
}

export function updateInIndex(item: SearchableItem): void {
  removeFromIndex(item.id);
  addToIndex(item);
}

export function searchAll(query: string): SearchResult[] {
  const doc = getIndex();
  const results: SearchResult[] = [];

  const nameResults = doc.search(query, { limit: 50, field: 'name' }) as Array<{
    field: string;
    result: string[];
  }>;
  for (const result of nameResults) {
    for (const id of result.result) {
      results.push({ id, type: getItemType(id), field: 'name' });
    }
  }

  const descResults = doc.search(query, { limit: 50, field: 'description' }) as Array<{
    field: string;
    result: string[];
  }>;
  for (const result of descResults) {
    for (const id of result.result) {
      if (!results.some((r) => r.id === id)) {
        results.push({ id, type: getItemType(id), field: 'description' });
      }
    }
  }

  return results;
}

const itemTypes = new Map<string, 'skill' | 'mcp' | 'provider'>();

export function registerItemType(id: string, type: 'skill' | 'mcp' | 'provider'): void {
  itemTypes.set(id, type);
}

export function unregisterItemType(id: string): void {
  itemTypes.delete(id);
}

function getItemType(id: string): 'skill' | 'mcp' | 'provider' {
  return itemTypes.get(id) ?? 'skill';
}

export function resetIndex(): void {
  index = null;
  itemTypes.clear();
}

export function buildIndex(items: SearchableItem[]): void {
  resetIndex();
  const doc = getIndex();
  for (const item of items) {
    doc.add(item);
    itemTypes.set(item.id, item.type);
  }
}
